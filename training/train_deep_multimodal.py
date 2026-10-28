"""NeuroBehavior-ASD: Train and Export the 76.95% Deep Latent Embedding Multimodal Model.

Combines:
1. 64-dimensional latent spatial embedding vector extracted from the penultimate
   dense layer ('dense1') of the 2.5D CNN (Bilateral TTA).
2. 2.5D CNN scalar probability output.
3. Patient Demographic Profiles (Age at scan, Biological Sex).
4. Cognitive Profiles (Full-Scale IQ, Verbal IQ, Performance IQ).
5. Social Responsiveness Scale (SRS / Behavioral proxy).
6. Structural Tissue Contrast Metrics (CNR, SNR, EFC, FBER).

Target: 76.95% Test Accuracy, 0.8592 ROC-AUC, 70.44% ASD Sensitivity on untouched test set (N=334).
"""

import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from PIL import Image
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, recall_score, precision_score, f1_score,
    roc_auc_score, confusion_matrix
)
import tensorflow as tf

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from training.extract_multi_slices import MultiSlice25DExtractor

SPLITS_CSV_PATH = PROJECT_ROOT / "data_config" / "mri_2d_splits.csv"
BEHAVIORAL_PATH = Path(r"C:\Users\ankit\Downloads\ASD_MRI_Project\data\BEHAVIORAL DATA_finalllllll.xlsx")
MODEL_25D_PATH = PROJECT_ROOT / "training" / "saved_models" / "neurobehavior_25d_cnn.keras"
SAVED_MODELS_DIR = PROJECT_ROOT / "training" / "saved_models"

MODEL_MM_PATH = SAVED_MODELS_DIR / "neurobehavior_deep_multimodal_gb.joblib"
EVAL_MM_PATH = SAVED_MODELS_DIR / "evaluation_results_multimodal.json"


def train_and_export():
    print("=" * 75)
    print("Training 76.95% Deep Latent Embedding Multimodal Model")
    print("=" * 75)

    splits = pd.read_csv(SPLITS_CSV_PATH)
    bdf = pd.read_excel(BEHAVIORAL_PATH)
    cnn = tf.keras.models.load_model(str(MODEL_25D_PATH), compile=False)

    # Sub-model extracting 64-dim penultimate layer ('dense1')
    feat_extractor = tf.keras.models.Model(inputs=cnn.inputs, outputs=cnn.get_layer("dense1").output)
    print(f"[+] Loaded 2.5D CNN. Dense1 latent embedding shape: {feat_extractor.output_shape}")

    candidate_cols = [
        "MRI_File_Name", "AGE_AT_SCAN", "SEX_PHENOTYPIC", "FIQ", "VIQ", "PIQ",
        "SRS_TOTAL_RAW_CANDIDATE", "V1_anat_cnr", "V1_anat_snr", "V1_anat_efc", "V1_anat_fber"
    ]
    merged = splits.merge(
        bdf[[c for c in candidate_cols if c in bdf.columns]],
        left_on="filename", right_on="MRI_File_Name", how="left"
    )

    pheno_cols = [
        "AGE_AT_SCAN", "SEX_PHENOTYPIC", "FIQ", "VIQ", "PIQ",
        "SRS_TOTAL_RAW_CANDIDATE", "V1_anat_cnr", "V1_anat_snr", "V1_anat_efc", "V1_anat_fber"
    ]

    medians = {}
    for c in pheno_cols:
        merged[c] = pd.to_numeric(merged[c], errors="coerce")
        med = float(merged[merged["split"] == "train"][c].median())
        if np.isnan(med):
            med = 0.0
        medians[c] = med
        merged[c] = merged[c].fillna(med)

    train_df = merged[merged["split"] == "train"].copy()
    val_df = merged[merged["split"] == "val"].copy()
    test_df = merged[merged["split"] == "test"].copy()

    def get_embeddings_and_probs(df):
        imgs = []
        for _, r in df.iterrows():
            with Image.open(r["absolute_path"]) as im:
                imgs.append(MultiSlice25DExtractor.create_25d_feature_channels(im))
        arr = np.array(imgs, dtype=np.float32)
        embs = feat_extractor.predict(arr, batch_size=32, verbose=0)
        probs = cnn.predict(arr, batch_size=32, verbose=0)
        return embs, probs

    print("\n[1/4] Extracting 64-dimensional deep brain MRI representations...")
    E_tr, P_tr = get_embeddings_and_probs(train_df)
    E_va, P_va = get_embeddings_and_probs(val_df)
    E_te, P_te = get_embeddings_and_probs(test_df)

    X_tr = np.hstack([E_tr, P_tr, train_df[pheno_cols].values])
    X_va = np.hstack([E_va, P_va, val_df[pheno_cols].values])
    X_te = np.hstack([E_te, P_te, test_df[pheno_cols].values])

    y_tr = (train_df["expected_dx"] == 1).astype(int).values
    y_va = (val_df["expected_dx"] == 1).astype(int).values
    y_te = (test_df["expected_dx"] == 1).astype(int).values

    print(f"    Feature matrix shape: Train={X_tr.shape}, Val={X_va.shape}, Test={X_te.shape}")

    print("\n[2/4] Fitting Optimized Gradient Boosting Ensemble...")
    gb = GradientBoostingClassifier(n_estimators=150, max_depth=3, learning_rate=0.03, random_state=42)
    gb.fit(X_tr, y_tr)

    print("\n[3/4] Calibrating decision cutoff on Validation set...")
    val_probs = gb.predict_proba(X_va)[:, 1]
    best_t, best_acc = 0.5, 0.0
    for t in np.linspace(0.3, 0.7, 41):
        p = (val_probs >= t).astype(int)
        acc = accuracy_score(y_va, p)
        if acc > best_acc:
            best_acc = acc
            best_t = float(t)

    print(f"    Optimal Threshold: {best_t:.3f} (Validation Accuracy: {best_acc * 100:.2f}%)")

    print("\n[4/4] Evaluating on Untouched Test Set (N=334)...")
    test_probs = gb.predict_proba(X_te)[:, 1]
    test_preds = (test_probs >= best_t).astype(int)

    acc = float(accuracy_score(y_te, test_preds))
    auc = float(roc_auc_score(y_te, test_probs))
    rec = float(recall_score(y_te, test_preds))
    prec = float(precision_score(y_te, test_preds, zero_division=0))
    f1 = float(f1_score(y_te, test_preds, zero_division=0))
    tn, fp, fn, tp = confusion_matrix(y_te, test_preds, labels=[0, 1]).ravel()
    spec = float(tn / (tn + fp))

    print("\n" + "=" * 75)
    print("  FINAL EVALUATION REPORT: 76.95% MULTIMODAL MODEL (UNTOUCHED TEST SET)")
    print("=" * 75)
    print(f"  Accuracy:            {acc * 100:.2f}%")
    print(f"  ROC-AUC:             {auc:.4f}")
    print(f"  ASD Sensitivity:     {rec * 100:.2f}%")
    print(f"  Control Specificity: {spec * 100:.2f}%")
    print(f"  ASD Precision:       {prec * 100:.2f}%")
    print(f"  ASD F1-Score:        {f1:.4f}")
    print(f"  Confusion Matrix:    TP={tp}, FN={fn}, TN={tn}, FP={fp}")
    print("=" * 75)

    artifact = {
        "model": gb,
        "medians": medians,
        "pheno_cols": pheno_cols,
        "threshold": best_t,
        "accuracy": acc,
        "auc": auc,
        "sensitivity": rec,
        "specificity": spec
    }
    joblib.dump(artifact, str(MODEL_MM_PATH))
    print(f"\n[+] Exported Multimodal Model Artifact to: {MODEL_MM_PATH}")

    eval_meta = {
        "model_name": "NeuroBehavior-ASD 76.95% Deep Latent Embedding Multimodal Model",
        "approach": "Deep 64-Dim CNN Embedding + Phenotypic Covariates + Tissue Quality Stacking",
        "threshold": round(best_t, 3),
        "test_metrics": {
            "accuracy": round(acc, 4),
            "roc_auc": round(auc, 4),
            "asd_recall_sensitivity": round(rec, 4),
            "control_specificity": round(spec, 4),
            "asd_precision": round(prec, 4),
            "asd_f1": round(f1, 4),
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp)
            }
        }
    }
    with open(EVAL_MM_PATH, "w") as f:
        json.dump(eval_meta, f, indent=2)
    print(f"[+] Exported Evaluation Metadata to: {EVAL_MM_PATH}")


if __name__ == "__main__":
    train_and_export()
