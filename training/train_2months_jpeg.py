"""Train and evaluate high-precision model on the 2months JPEG Autism MRI Dataset.

Strict Scientific Standards:
- Stratified 70% Train, 15% Validation, 15% Test split.
- Zero data leakage: scalers and model fitted strictly on Train split.
- 2.5D Multi-Channel representation (structural + Sobel gradient + CLAHE contrast).
- MobileNetV2 spatial embeddings + Bilateral Hemispheric Asymmetry.
- Exports model bundle, evaluation results, and organizes test set on Desktop.
"""
import os
import sys
import shutil
import json
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image
import joblib

from sklearn.ensemble import GradientBoostingClassifier, HistGradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score, recall_score, precision_score, f1_score, confusion_matrix
import tensorflow as tf

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
from training.extract_multi_slices import MultiSlice25DExtractor

# Dataset paths
DESKTOP_DIR = Path(r"C:\Users\ankit\OneDrive\Desktop\MRI_TEST_DATASET")
JPEG_ASD_DIR = DESKTOP_DIR / "2months_JPEG_Dataset"
PNG_CNT_DIR = Path(r"C:\Users\ankit\Downloads\ASD_MRI_Project\data\MRI ASD IMAGES\Non Autistic")
SAVED_MODELS_DIR = PROJECT_ROOT / "training" / "saved_models"

MODEL_SAVE_PATH = SAVED_MODELS_DIR / "neurobehavior_2months_jpeg.joblib"
EVAL_SAVE_PATH = SAVED_MODELS_DIR / "evaluation_results_2months_jpeg.json"
TEST_EXPORT_DIR = DESKTOP_DIR / "2months_JPEG_Test_Scans"


def load_dataset():
    """Gather 125 Autism JPEGs and pair with 125 balanced Control JPEGs."""
    asd_files = sorted(list(JPEG_ASD_DIR.glob("*.jpeg")) + list(JPEG_ASD_DIR.glob("*.jpg")))
    print(f"[+] Found {len(asd_files)} Autism JPEG scans in 2months dataset.")
    
    # Take 125 controls from the verified non-autistic cohort
    cnt_pngs = sorted(list(PNG_CNT_DIR.glob("*.png")))[:len(asd_files)]
    print(f"[+] Paired with {len(cnt_pngs)} verified Control scans.")

    # Convert control PNGs to standard JPEGs in a temporary cache if needed
    cache_cnt_dir = PROJECT_ROOT / "data_config" / "2months_control_jpegs"
    cache_cnt_dir.mkdir(parents=True, exist_ok=True)
    cnt_files = []
    for p in cnt_pngs:
        target = cache_cnt_dir / (p.stem + "_control.jpeg")
        if not target.exists():
            with Image.open(p) as img:
                img.convert("RGB").save(target, format="JPEG", quality=95)
        cnt_files.append(target)

    # Build DataFrame
    records = []
    for p in asd_files:
        records.append({"filename": p.name, "path": str(p), "label": 1, "class_name": "Autism"})
    for p in cnt_files:
        records.append({"filename": p.name, "path": str(p), "label": 0, "class_name": "Non Autism"})

    df = pd.DataFrame(records).sample(frac=1.0, random_state=42).reset_index(drop=True)
    return df


def extract_features(df, mobilenet_model):
    """Extract 2.5D multi-channel + MobileNetV2 + Hemispheric Asymmetry features."""
    X_list = []
    y_list = []
    
    print("[*] Extracting 2.5D multi-channel tensors & transfer features...")
    for idx, row in df.iterrows():
        p = Path(row["path"])
        with Image.open(p) as raw_img:
            # 1. 2.5D multi-channel tensor
            arr_3ch = MultiSlice25DExtractor.create_25d_feature_channels(raw_img)
            # Bilateral flip
            flip_img = raw_img.transpose(Image.FLIP_LEFT_RIGHT)
            arr_flip = MultiSlice25DExtractor.create_25d_feature_channels(flip_img)

        # 2. Asymmetry indices (|Left - Right|)
        diff = np.abs(arr_3ch - arr_flip)
        asym_mean = np.mean(diff, axis=(0, 1))  # (3,)
        asym_std = np.std(diff, axis=(0, 1))    # (3,)

        # 3. Direct gradient and contrast energies
        sobel_mean = np.array([np.mean(arr_3ch[:, :, 1] ** 2)])
        clahe_mean = np.array([np.mean(arr_3ch[:, :, 2] ** 2)])

        # 4. MobileNetV2 deep embeddings (average of direct and flipped view)
        in_orig = np.expand_dims(arr_3ch, axis=0)
        in_flip = np.expand_dims(arr_flip, axis=0)
        emb_orig = mobilenet_model.predict(in_orig, verbose=0).flatten()
        emb_flip = mobilenet_model.predict(in_flip, verbose=0).flatten()
        emb_avg = (emb_orig + emb_flip) / 2.0

        feat_vector = np.concatenate([emb_avg, asym_mean, asym_std, sobel_mean, clahe_mean])
        X_list.append(feat_vector)
        y_list.append(int(row["label"]))
        
        if (idx + 1) % 50 == 0 or (idx + 1) == len(df):
            print(f"    Processed {idx + 1}/{len(df)} images...")

    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.int32)


def main():
    print("=" * 75)
    print("NeuroBehavior-ASD: Training Calibrated Model on 2months JPEG Dataset")
    print("=" * 75)

    df = load_dataset()
    print(f"Total dataset: {len(df)} scans (Autism: {sum(df['label'] == 1)}, Control: {sum(df['label'] == 0)})")

    # Load pre-trained MobileNetV2 feature extractor
    print("[*] Loading MobileNetV2 backbone...")
    mobilenet = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3), include_top=False, pooling="avg", weights="imagenet"
    )

    X_all, y_all = extract_features(df, mobilenet)
    print(f"[+] Feature matrix shape: {X_all.shape} ({X_all.shape[1]} features per scan)")

    # Stratified Splits: 70% Train, 15% Val, 15% Test
    from sklearn.model_selection import train_test_split
    X_train_val, X_test, y_train_val, y_test, df_train_val, df_test = train_test_split(
        X_all, y_all, df, test_size=0.15, random_state=42, stratify=y_all
    )
    val_rel_ratio = 0.15 / 0.85
    X_train, X_val, y_train, y_val, df_train, df_val = train_test_split(
        X_train_val, y_train_val, df_train_val, test_size=val_rel_ratio, random_state=42, stratify=y_train_val
    )

    print(f"[+] Segregated Splits: Train={len(y_train)}, Val={len(y_val)}, Test={len(y_test)}")

    # Feature Scaling (Fit STRICTLY on Train)
    scaler = StandardScaler()
    X_tr_s = scaler.fit_transform(X_train)
    X_val_s = scaler.transform(X_val)
    X_te_s = scaler.transform(X_test)

    # Train High-Capacity Ensemble
    print("\n[*] Training Ensemble Classifiers on JPEG Features...")
    gb = GradientBoostingClassifier(
        n_estimators=120, learning_rate=0.035, max_depth=3, subsample=0.85, random_state=42
    )
    hgb = HistGradientBoostingClassifier(
        max_iter=100, learning_rate=0.035, max_depth=3, l2_regularization=2.0, random_state=42
    )
    lr = LogisticRegression(C=0.1, max_iter=1000, random_state=42)

    ensemble = VotingClassifier(
        estimators=[("gb", gb), ("hgb", hgb), ("lr", lr)],
        voting="soft",
        weights=[3, 3, 2]
    )
    ensemble.fit(X_tr_s, y_train)

    # Calibrate Decision Threshold on Validation Set
    val_probs = ensemble.predict_proba(X_val_s)[:, 1]
    best_thresh = 0.50
    best_val_score = 0.0

    for t in np.linspace(0.40, 0.60, 41):
        v_preds = (val_probs >= t).astype(int)
        v_acc = accuracy_score(y_val, v_preds)
        v_f1 = f1_score(y_val, v_preds, zero_division=0)
        score = 0.6 * v_acc + 0.4 * v_f1
        if score > best_val_score:
            best_val_score = score
            best_thresh = t

    print(f"[+] Optimal Validation Threshold: {best_thresh:.3f}")

    # Evaluate on Untouched Test Split (N=38)
    test_probs = ensemble.predict_proba(X_te_s)[:, 1]
    test_preds = (test_probs >= best_thresh).astype(int)

    acc = accuracy_score(y_test, test_preds)
    auc = roc_auc_score(y_test, test_probs)
    rec = recall_score(y_test, test_preds)
    prec = precision_score(y_test, test_preds, zero_division=0)
    f1 = f1_score(y_test, test_preds, zero_division=0)
    cm = confusion_matrix(y_test, test_preds)
    spec = float(cm[0, 0] / (cm[0, 0] + cm[0, 1]))

    print("\n" + "=" * 75)
    print("FINAL 2MONTHS JPEG BENCHMARK EVALUATION RESULTS:")
    print("=" * 75)
    print(f"Test Accuracy:    {acc * 100:.2f}%")
    print(f"ROC-AUC:          {auc:.4f}")
    print(f"Sensitivity:      {rec * 100:.2f}%  (Recall for Autism)")
    print(f"Specificity:      {spec * 100:.2f}%  (Control True Negative Rate)")
    print(f"Precision:        {prec * 100:.2f}%")
    print(f"F1-Score:         {f1:.4f}")
    print(f"Confusion Matrix: TN={cm[0, 0]}, FP={cm[0, 1]}, FN={cm[1, 0]}, TP={cm[1, 1]} (Total: {len(y_test)})")
    print("=" * 75)

    # Export Model Bundle
    bundle = {
        "model": ensemble,
        "scaler": scaler,
        "threshold": float(best_thresh),
        "metrics": {
            "test_accuracy": float(acc),
            "test_roc_auc": float(auc),
            "test_sensitivity": float(rec),
            "test_specificity": float(spec),
            "test_precision": float(prec),
            "test_f1": float(f1),
            "confusion_matrix": {
                "TN": int(cm[0, 0]),
                "FP": int(cm[0, 1]),
                "FN": int(cm[1, 0]),
                "TP": int(cm[1, 1]),
                "total": int(len(y_test))
            }
        }
    }
    joblib.dump(bundle, MODEL_SAVE_PATH)
    with open(EVAL_SAVE_PATH, "w") as f:
        json.dump(bundle["metrics"], f, indent=2)
    print(f"\n[+] Saved model bundle to: {MODEL_SAVE_PATH}")

    # Export Test Scans to Desktop Folder for User Evaluation
    test_asd_dir = TEST_EXPORT_DIR / "Autism_JPEG_Test"
    test_cnt_dir = TEST_EXPORT_DIR / "Control_JPEG_Test"
    test_asd_dir.mkdir(parents=True, exist_ok=True)
    test_cnt_dir.mkdir(parents=True, exist_ok=True)

    test_index_rows = []
    for _, row in df_test.iterrows():
        src_p = Path(row["path"])
        is_asd = int(row["label"]) == 1
        dest_p = (test_asd_dir if is_asd else test_cnt_dir) / src_p.name
        shutil.copy2(src_p, dest_p)
        test_index_rows.append({
            "filename": src_p.name,
            "expected_dx": 1 if is_asd else 2,
            "Ground_Truth_Diagnosis": "Autism" if is_asd else "Non Autism",
            "folder": "Autism_JPEG_Test" if is_asd else "Control_JPEG_Test"
        })

    index_df = pd.DataFrame(test_index_rows)
    index_df.to_csv(TEST_EXPORT_DIR / "test_dataset_index.csv", index=False)
    print(f"[+] Exported {len(index_df)} untouched test scans to Desktop: {TEST_EXPORT_DIR}")


if __name__ == "__main__":
    main()
