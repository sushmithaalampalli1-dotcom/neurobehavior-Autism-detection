"""NeuroBehavior-ASD: Train and Evaluate Improved Standalone MRI-Only Model.

Strict Scientific Standards:
- Purely MRI-derived biomarkers only (NO questionnaire, NO IQ, NO phenotypic data).
- Uses 2.5D Multi-Channel CNN deep embeddings + Bilateral Hemisphere Asymmetry + Tissue Contrast Metrics.
- Fast vectorized numpy batching.
- Calibrates decision threshold on validation set (N=333).
- Evaluates on untouched test set (N=334).
"""
import os
import sys
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
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, roc_auc_score, recall_score,
    precision_score, f1_score, confusion_matrix
)
from sklearn.preprocessing import StandardScaler
import tensorflow as tf

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
from training.extract_multi_slices import MultiSlice25DExtractor

SPLITS_CSV_PATH = PROJECT_ROOT / "data_config" / "mri_2d_splits.csv"
BEHAVIORAL_PATH = Path(r"C:\Users\ankit\Downloads\ASD_MRI_Project\data\BEHAVIORAL DATA_finalllllll.xlsx")
MODEL_25D_PATH = PROJECT_ROOT / "training" / "saved_models" / "neurobehavior_25d_cnn.keras"
SAVED_MODELS_DIR = PROJECT_ROOT / "training" / "saved_models"

MODEL_MRI_SAVE_PATH = SAVED_MODELS_DIR / "neurobehavior_mri_only_boosted.joblib"
EVAL_MRI_SAVE_PATH = SAVED_MODELS_DIR / "evaluation_results_mri_boosted.json"


def load_tensors_and_metadata(df_subset):
    """Vectorized load of 2.5D multi-channel structural tensors."""
    tensors = []
    labels = []
    for _, row in df_subset.iterrows():
        p = Path(row["absolute_path"])
        with Image.open(p) as img:
            t = MultiSlice25DExtractor.create_25d_feature_channels(img)
            tensors.append(t)
        labels.append(1 if int(row["expected_dx"]) == 1 else 0)
    return np.array(tensors, dtype=np.float32), np.array(labels, dtype=np.int32)


def main():
    print("=" * 75, flush=True)
    print("NeuroBehavior-ASD: Training Upgraded Standalone MRI-Only Model", flush=True)
    print("=" * 75, flush=True)

    splits = pd.read_csv(SPLITS_CSV_PATH)
    bdf = pd.read_excel(BEHAVIORAL_PATH)

    # 1. Purely MRI-derived anatomical columns (No phenotypic, No behavioral)
    anat_cols = ["MRI_File_Name", "V1_anat_cnr", "V1_anat_snr", "V1_anat_efc", "V1_anat_fber"]
    bdf_mri = bdf[anat_cols].dropna(subset=["MRI_File_Name"]).drop_duplicates(subset=["MRI_File_Name"]).copy()
    merged = splits.merge(bdf_mri, left_on="filename", right_on="MRI_File_Name", how="left")

    anat_feature_cols = ["V1_anat_cnr", "V1_anat_snr", "V1_anat_efc", "V1_anat_fber"]
    for c in anat_feature_cols:
        med = float(merged[merged["split"] == "train"][c].median())
        merged[c] = merged[c].fillna(med)

    train_df = merged[merged["split"] == "train"].copy()
    val_df = merged[merged["split"] == "val"].copy()
    test_df = merged[merged["split"] == "test"].copy()

    print(f"[+] Splits: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}", flush=True)

    # 2. Load 2.5D Tensors
    print("[*] Loading 2.5D Multi-Channel structural tensors for all splits...", flush=True)
    X_train_raw, y_train = load_tensors_and_metadata(train_df)
    X_val_raw, y_val = load_tensors_and_metadata(val_df)
    X_test_raw, y_test = load_tensors_and_metadata(test_df)
    print(f"    Loaded shapes: Train={X_train_raw.shape}, Val={X_val_raw.shape}, Test={X_test_raw.shape}", flush=True)

    # 3. Load 2.5D CNN Feature Extractor
    print("[*] Loading 2.5D CNN model and extracting 64-D latent feature representations...", flush=True)
    cnn = tf.keras.models.load_model(str(MODEL_25D_PATH), compile=False)
    feat_extractor = tf.keras.models.Model(inputs=cnn.inputs, outputs=cnn.get_layer("dense1").output)

    def extract_mri_feature_matrix(X_tensors, df_subset):
        # A. CNN 64-D Latent features with Bilateral TTA (Batch mode)
        print("    Computing 64-D latent embeddings with Bilateral TTA...", flush=True)
        emb_orig = feat_extractor.predict(X_tensors, batch_size=64, verbose=0)
        emb_flip = feat_extractor.predict(X_tensors[:, :, ::-1, :], batch_size=64, verbose=0)
        emb_avg = (emb_orig + emb_flip) / 2.0

        # B. CNN Base Probabilities (Batch mode)
        prob_orig = cnn.predict(X_tensors, batch_size=64, verbose=0)
        prob_flip = cnn.predict(X_tensors[:, :, ::-1, :], batch_size=64, verbose=0)
        prob_avg = (prob_orig + prob_flip) / 2.0

        # C. Vectorized Bilateral Hemispheric Asymmetry Indices
        # Difference between left and right hemispheres across all 3 channels
        print("    Computing vectorized hemispheric asymmetry and gradient metrics...", flush=True)
        diff = np.abs(X_tensors - X_tensors[:, :, ::-1, :])
        asym_mean = np.mean(diff, axis=(1, 2))  # (N, 3)
        asym_std = np.std(diff, axis=(1, 2))    # (N, 3)

        # D. Direct Cortical Boundary Gradient Energy (Sobel Channel 2)
        sobel_energy = np.mean(X_tensors[:, :, :, 1] ** 2, axis=(1, 2)).reshape(-1, 1)
        sobel_std = np.std(X_tensors[:, :, :, 1], axis=(1, 2)).reshape(-1, 1)

        # E. Direct Subcortical Tissue Contrast Energy (CLAHE Channel 3)
        clahe_energy = np.mean(X_tensors[:, :, :, 2] ** 2, axis=(1, 2)).reshape(-1, 1)
        clahe_std = np.std(X_tensors[:, :, :, 2], axis=(1, 2)).reshape(-1, 1)

        # F. MRI-derived anatomical scanner quality covariates
        anat_mat = df_subset[anat_feature_cols].values

        # Concatenate pure MRI features
        X_feats = np.hstack([
            emb_avg,         # 64 features
            prob_avg,        # 1 feature
            asym_mean,       # 3 features
            asym_std,        # 3 features
            sobel_energy,    # 1 feature
            sobel_std,       # 1 feature
            clahe_energy,    # 1 feature
            clahe_std,       # 1 feature
            anat_mat         # 4 features
        ])                   # Total: 79 purely MRI-derived features!
        return X_feats

    print("[*] Extracting feature matrix for Train...", flush=True)
    X_train_mri = extract_mri_feature_matrix(X_train_raw, train_df)

    print("[*] Extracting feature matrix for Val...", flush=True)
    X_val_mri = extract_mri_feature_matrix(X_val_raw, val_df)

    print("[*] Extracting feature matrix for Test...", flush=True)
    X_test_mri = extract_mri_feature_matrix(X_test_raw, test_df)

    print(f"\n[+] Extracted feature matrix shape: {X_train_mri.shape} (79 MRI-only features per scan)", flush=True)

    # 4. Feature Scaling
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train_mri)
    X_val_s = scaler.transform(X_val_mri)
    X_test_s = scaler.transform(X_test_mri)

    # 5. Train Stacking Ensemble of Diverse High-Capacity Models
    print("\n[*] Training High-Capacity MRI-Only Ensembles...", flush=True)
    
    # Model 1: Gradient Boosting Classifier
    gb = GradientBoostingClassifier(
        n_estimators=180,
        learning_rate=0.035,
        max_depth=3,
        subsample=0.8,
        min_samples_split=8,
        min_samples_leaf=4,
        random_state=42
    )
    gb.fit(X_train_s, y_train)

    # Model 2: HistGradientBoosting Classifier
    hgb = HistGradientBoostingClassifier(
        max_iter=150,
        learning_rate=0.04,
        max_depth=4,
        l2_regularization=1.5,
        random_state=42
    )
    hgb.fit(X_train_s, y_train)

    # Model 3: ExtraTrees Regularized Classifier
    et = ExtraTreesClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_split=6,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1
    )
    et.fit(X_train_s, y_train)

    # Model 4: Regularized Logistic Regression (L2)
    lr = LogisticRegression(C=0.05, max_iter=500, random_state=42)
    lr.fit(X_train_s, y_train)

    # Soft Voting Ensemble
    ensemble = VotingClassifier(
        estimators=[
            ("gb", gb),
            ("hgb", hgb),
            ("et", et),
            ("lr", lr)
        ],
        voting="soft",
        weights=[3, 3, 2, 2]
    )
    ensemble.fit(X_train_s, y_train)

    # 6. Calibrate Decision Threshold on Validation Set (Strictly Validation Split)
    val_probs = ensemble.predict_proba(X_val_s)[:, 1]
    best_thresh = 0.50
    best_val_score = 0.0

    for t in np.linspace(0.35, 0.65, 31):
        v_preds = (val_probs >= t).astype(int)
        v_acc = accuracy_score(y_val, v_preds)
        v_f1 = f1_score(y_val, v_preds)
        score = 0.6 * v_acc + 0.4 * v_f1
        if score > best_val_score:
            best_val_score = score
            best_thresh = t

    val_final_preds = (val_probs >= best_thresh).astype(int)
    val_acc = accuracy_score(y_val, val_final_preds)
    val_auc = roc_auc_score(y_val, val_probs)
    print(f"\n[+] Optimal Validation Threshold: {best_thresh:.3f}", flush=True)
    print(f"    Validation Accuracy: {val_acc*100:.2f}%, Val AUC: {val_auc:.4f}", flush=True)

    # 7. Final Benchmark Evaluation on Completely Untouched Test Split (N=334)
    test_probs = ensemble.predict_proba(X_test_s)[:, 1]
    test_preds = (test_probs >= best_thresh).astype(int)

    acc = accuracy_score(y_test, test_preds)
    auc = roc_auc_score(y_test, test_probs)
    rec = recall_score(y_test, test_preds)
    prec = precision_score(y_test, test_preds)
    f1 = f1_score(y_test, test_preds)
    cm = confusion_matrix(y_test, test_preds)

    print("\n" + "=" * 75, flush=True)
    print("FINAL STANDALONE MRI-ONLY TEST BENCHMARK RESULTS:", flush=True)
    print("=" * 75, flush=True)
    print(f"Test Accuracy:    {acc*100:.2f}%  (Baseline was 54.49%!)", flush=True)
    print(f"ROC-AUC:          {auc:.4f}    (Baseline was 0.5307!)", flush=True)
    print(f"Sensitivity:      {rec*100:.2f}%  (Recall for Autism)", flush=True)
    print(f"Specificity:      {cm[0,0]/(cm[0,0]+cm[0,1])*100:.2f}%  (Control True Negative Rate)", flush=True)
    print(f"Precision:        {prec*100:.2f}%", flush=True)
    print(f"F1-Score:         {f1:.4f}", flush=True)
    print(f"Confusion Matrix: TN={cm[0,0]}, FP={cm[0,1]}, FN={cm[1,0]}, TP={cm[1,1]} (N={len(y_test)})", flush=True)
    print("=" * 75, flush=True)

    # 8. Export the Enhanced MRI-Only Model Artifacts
    bundle = {
        "model": ensemble,
        "scaler": scaler,
        "threshold": float(best_thresh),
        "anat_feature_cols": anat_feature_cols,
        "feature_count": X_train_mri.shape[1],
        "metrics": {
            "test_accuracy": float(acc),
            "test_roc_auc": float(auc),
            "test_sensitivity": float(rec),
            "test_specificity": float(cm[0,0]/(cm[0,0]+cm[0,1])),
            "test_precision": float(prec),
            "test_f1": float(f1),
        }
    }
    joblib.dump(bundle, MODEL_MRI_SAVE_PATH)
    print(f"\n[+] Saved upgraded MRI-only model to: {MODEL_MRI_SAVE_PATH}", flush=True)

    with open(EVAL_MRI_SAVE_PATH, "w") as f:
        json.dump(bundle["metrics"], f, indent=2)
    print(f"[+] Saved evaluation metrics to: {EVAL_MRI_SAVE_PATH}", flush=True)


if __name__ == "__main__":
    main()
