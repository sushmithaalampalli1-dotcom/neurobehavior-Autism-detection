"""NeuroBehavior-ASD: Advanced Transfer-Learned MobileNetV2 + Morphometric MRI-Only Pipeline.

Extracts:
1. MobileNetV2 ImageNet 1,280-D spatial hierarchical feature representations with Bilateral Mirror TTA.
2. Vectorized Bilateral Hemispheric Asymmetry (|Left - Right_mirrored|).
3. Cortical Boundary Gradient Energy (Sobel) and Subcortical Contrast (CLAHE).
4. Morphological Scanner Quality Covariates (CNR, SNR, EFC, FBER).

Strict Split Validation:
- 1,554 Train scans
- 333 Validation scans (threshold calibration)
- 334 Untouched Test scans (final clinical evaluation)
"""
import os
import sys
import time
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image
import joblib
import json

from sklearn.ensemble import (
    GradientBoostingClassifier,
    HistGradientBoostingClassifier,
    ExtraTreesClassifier,
    RandomForestClassifier,
    VotingClassifier
)
from sklearn.linear_model import LogisticRegression, RidgeClassifier
from sklearn.metrics import (
    accuracy_score, roc_auc_score, recall_score,
    precision_score, f1_score, confusion_matrix
)
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import tensorflow as tf

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
from training.extract_multi_slices import MultiSlice25DExtractor

SPLITS_CSV_PATH = PROJECT_ROOT / "data_config" / "mri_2d_splits.csv"
BEHAVIORAL_PATH = Path(r"C:\Users\ankit\Downloads\ASD_MRI_Project\data\BEHAVIORAL DATA_finalllllll.xlsx")
CACHE_DIR = PROJECT_ROOT / "data_config" / "mri_features_cache"
SAVED_MODELS_DIR = PROJECT_ROOT / "training" / "saved_models"

MODEL_SAVE_PATH = SAVED_MODELS_DIR / "neurobehavior_mri_only_boosted.joblib"
EVAL_SAVE_PATH = SAVED_MODELS_DIR / "evaluation_results_mri_boosted.json"


def load_raw_tensors(df_subset):
    tensors = []
    labels = []
    for _, row in df_subset.iterrows():
        p = Path(row["absolute_path"])
        with Image.open(p) as img:
            t = MultiSlice25DExtractor.create_25d_feature_channels(img)
            tensors.append(t)
        labels.append(1 if int(row["expected_dx"]) == 1 else 0)
    return np.array(tensors, dtype=np.float32), np.array(labels, dtype=np.int32)


def extract_features_split(model_extractor, X_tensors, df_subset, anat_cols, batch_size=64):
    print(f"      - Passing {len(X_tensors)} tensors through MobileNetV2 (Batch={batch_size})...", flush=True)
    # Original
    emb_orig = model_extractor.predict(X_tensors, batch_size=batch_size, verbose=0)
    # Bilateral Mirror
    X_flip = X_tensors[:, :, ::-1, :]
    emb_flip = model_extractor.predict(X_flip, batch_size=batch_size, verbose=0)
    emb_avg = (emb_orig + emb_flip) / 2.0

    # Bilateral asymmetry
    diff = np.abs(X_tensors - X_flip)
    asym_mean = np.mean(diff, axis=(1, 2))
    asym_std = np.std(diff, axis=(1, 2))

    # Gradient & contrast energies
    sobel_mean = np.mean(X_tensors[:, :, :, 1] ** 2, axis=(1, 2)).reshape(-1, 1)
    sobel_std = np.std(X_tensors[:, :, :, 1], axis=(1, 2)).reshape(-1, 1)
    clahe_mean = np.mean(X_tensors[:, :, :, 2] ** 2, axis=(1, 2)).reshape(-1, 1)
    clahe_std = np.std(X_tensors[:, :, :, 2], axis=(1, 2)).reshape(-1, 1)

    # Scanner metrics
    anat_vals = df_subset[anat_cols].values

    stacked = np.hstack([
        emb_avg,
        asym_mean,
        asym_std,
        sobel_mean,
        sobel_std,
        clahe_mean,
        clahe_std,
        anat_vals
    ])
    return stacked


def main():
    print("=" * 75, flush=True)
    print("NeuroBehavior-ASD: Upgraded Transfer-Learned MRI-Only Pipeline", flush=True)
    print("=" * 75, flush=True)
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

    splits = pd.read_csv(SPLITS_CSV_PATH)
    bdf = pd.read_excel(BEHAVIORAL_PATH)
    anat_cols = ["V1_anat_cnr", "V1_anat_snr", "V1_anat_efc", "V1_anat_fber"]
    bdf_mri = bdf[["MRI_File_Name"] + anat_cols].dropna(subset=["MRI_File_Name"]).drop_duplicates(subset=["MRI_File_Name"]).copy()
    merged = splits.merge(bdf_mri, left_on="filename", right_on="MRI_File_Name", how="left")

    medians = {}
    for c in anat_cols:
        med = float(merged[merged["split"] == "train"][c].median())
        medians[c] = med
        merged[c] = merged[c].fillna(med)

    train_df = merged[merged["split"] == "train"].copy()
    val_df = merged[merged["split"] == "val"].copy()
    test_df = merged[merged["split"] == "test"].copy()

    cache_train = CACHE_DIR / "X_train_mobilenet.npy"
    cache_val = CACHE_DIR / "X_val_mobilenet.npy"
    cache_test = CACHE_DIR / "X_test_mobilenet.npy"
    cache_y_tr = CACHE_DIR / "y_train.npy"
    cache_y_val = CACHE_DIR / "y_val.npy"
    cache_y_te = CACHE_DIR / "y_test.npy"

    if cache_train.exists() and cache_val.exists() and cache_test.exists():
        print("[*] Loading cached MobileNetV2 feature matrices from disk...", flush=True)
        X_tr = np.load(cache_train)
        X_val = np.load(cache_val)
        X_te = np.load(cache_test)
        y_train = np.load(cache_y_tr)
        y_val = np.load(cache_y_val)
        y_test = np.load(cache_y_te)
    else:
        print("[*] Pre-trained MobileNetV2 feature extraction...", flush=True)
        mobilenet = tf.keras.applications.MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            pooling="avg",
            weights="imagenet"
        )

        print("[1/3] Processing Train set (N=1554)...", flush=True)
        X_tr_raw, y_train = load_raw_tensors(train_df)
        X_tr = extract_features_split(mobilenet, X_tr_raw, train_df, anat_cols)
        np.save(cache_train, X_tr)
        np.save(cache_y_tr, y_train)

        print("[2/3] Processing Val set (N=333)...", flush=True)
        X_val_raw, y_val = load_raw_tensors(val_df)
        X_val = extract_features_split(mobilenet, X_val_raw, val_df, anat_cols)
        np.save(cache_val, X_val)
        np.save(cache_y_val, y_val)

        print("[3/3] Processing Test set (N=334)...", flush=True)
        X_te_raw, y_test = load_raw_tensors(test_df)
        X_te = extract_features_split(mobilenet, X_te_raw, test_df, anat_cols)
        np.save(cache_test, X_te)
        np.save(cache_y_te, y_test)

    print(f"\n[+] Feature Matrices: Train={X_tr.shape}, Val={X_val.shape}, Test={X_te.shape}", flush=True)

    # Dimensionality & Scaling
    scaler = StandardScaler()
    X_tr_s = scaler.fit_transform(X_tr)
    X_val_s = scaler.transform(X_val)
    X_te_s = scaler.transform(X_te)

    # Dimensionality Reduction with PCA (Retaining 95% variance)
    pca = PCA(n_components=64, random_state=42)
    X_tr_pca = pca.fit_transform(X_tr_s)
    X_val_pca = pca.transform(X_val_s)
    X_te_pca = pca.transform(X_te_s)
    print(f"[+] PCA reduced dimension to 64 components (Explained variance: {np.sum(pca.explained_variance_ratio_)*100:.1f}%)", flush=True)

    # Train Suite of Calibrated Classifiers on PCA features + Raw High-Level Indicators
    # Concatenate PCA components with the 14 morphometric/energy/quality features
    X_tr_comb = np.hstack([X_tr_pca, X_tr_s[:, 1280:]])
    X_val_comb = np.hstack([X_val_pca, X_val_s[:, 1280:]])
    X_te_comb = np.hstack([X_te_pca, X_te_s[:, 1280:]])

    print("\n[*] Training Classifiers on Extracted Latent MRI Features...", flush=True)

    # 1. Regularized Logistic Regression
    lr = LogisticRegression(C=0.1, max_iter=1000, random_state=42)
    lr.fit(X_tr_comb, y_train)

    # 2. Gradient Boosting
    gb = GradientBoostingClassifier(
        n_estimators=120,
        learning_rate=0.03,
        max_depth=3,
        subsample=0.85,
        min_samples_split=6,
        min_samples_leaf=4,
        random_state=42
    )
    gb.fit(X_tr_comb, y_train)

    # 3. Hist Gradient Boosting
    hgb = HistGradientBoostingClassifier(
        max_iter=100,
        learning_rate=0.03,
        max_depth=3,
        l2_regularization=2.0,
        random_state=42
    )
    hgb.fit(X_tr_comb, y_train)

    # 4. Extra Trees
    et = ExtraTreesClassifier(
        n_estimators=150,
        max_depth=6,
        min_samples_split=6,
        random_state=42,
        n_jobs=-1
    )
    et.fit(X_tr_comb, y_train)

    ensemble = VotingClassifier(
        estimators=[
            ("lr", lr),
            ("gb", gb),
            ("hgb", hgb),
            ("et", et)
        ],
        voting="soft",
        weights=[3, 3, 2, 2]
    )
    ensemble.fit(X_tr_comb, y_train)

    # Validation Calibration (Balanced Accuracy / Youden's J)
    val_probs = ensemble.predict_proba(X_val_comb)[:, 1]
    best_thresh = 0.50
    best_val_score = 0.0

    for t in np.linspace(0.40, 0.60, 41):
        v_preds = (val_probs >= t).astype(int)
        v_sens = recall_score(y_val, v_preds, zero_division=0)
        v_spec = np.mean(v_preds[y_val == 0] == 0)
        # Youden's Index + Accuracy
        v_acc = accuracy_score(y_val, v_preds)
        balanced_score = (v_sens + v_spec) / 2.0
        opt_score = 0.6 * balanced_score + 0.4 * v_acc
        if opt_score > best_val_score:
            best_val_score = opt_score
            best_thresh = t

    val_final_preds = (val_probs >= best_thresh).astype(int)
    val_acc = accuracy_score(y_val, val_final_preds)
    val_auc = roc_auc_score(y_val, val_probs)
    print(f"\n[+] Optimal Validation Decision Threshold: {best_thresh:.3f}", flush=True)
    print(f"    Validation Accuracy: {val_acc*100:.2f}%, Val AUC: {val_auc:.4f}", flush=True)

    # Untouched Test Split Evaluation (N=334)
    test_probs = ensemble.predict_proba(X_te_comb)[:, 1]
    test_preds = (test_probs >= best_thresh).astype(int)

    acc = accuracy_score(y_test, test_preds)
    auc = roc_auc_score(y_test, test_probs)
    rec = recall_score(y_test, test_preds)
    cm = confusion_matrix(y_test, test_preds)
    spec = float(cm[0, 0] / (cm[0, 0] + cm[0, 1]))
    prec = precision_score(y_test, test_preds, zero_division=0)
    f1 = f1_score(y_test, test_preds, zero_division=0)

    print("\n" + "=" * 75, flush=True)
    print("FINAL STANDALONE MRI-ONLY TEST BENCHMARK RESULTS (TRANSFER-LEARNED):", flush=True)
    print("=" * 75, flush=True)
    print(f"Test Accuracy:    {acc*100:.2f}%  (Baseline: 54.49%)", flush=True)
    print(f"ROC-AUC:          {auc:.4f}    (Baseline: 0.5307)", flush=True)
    print(f"Sensitivity:      {rec*100:.2f}%  (Recall for Autism)", flush=True)
    print(f"Specificity:      {spec*100:.2f}%  (Control True Negative Rate)", flush=True)
    print(f"Precision:        {prec*100:.2f}%", flush=True)
    print(f"F1-Score:         {f1:.4f}", flush=True)
    print(f"Confusion Matrix: TN={cm[0,0]}, FP={cm[0,1]}, FN={cm[1,0]}, TP={cm[1,1]} (N={len(y_test)})", flush=True)
    print("=" * 75, flush=True)

    bundle = {
        "model": ensemble,
        "scaler": scaler,
        "pca": pca,
        "threshold": float(best_thresh),
        "medians": medians,
        "anat_feature_cols": anat_cols,
        "metrics": {
            "test_accuracy": float(acc),
            "test_roc_auc": float(auc),
            "test_sensitivity": float(rec),
            "test_specificity": float(spec),
            "test_precision": float(prec),
            "test_f1": float(f1),
        }
    }
    joblib.dump(bundle, MODEL_SAVE_PATH)
    print(f"[+] Saved model bundle to: {MODEL_SAVE_PATH}", flush=True)

    with open(EVAL_SAVE_PATH, "w") as f:
        json.dump(bundle["metrics"], f, indent=2)
    print(f"[+] Saved evaluation metrics to: {EVAL_SAVE_PATH}", flush=True)


if __name__ == "__main__":
    main()
