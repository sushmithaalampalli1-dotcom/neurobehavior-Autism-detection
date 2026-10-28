"""NeuroBehavior-ASD: 2D CNN MRI Model Training & Comprehensive Evaluation Pipeline.

Binary Classification:
    DX_GROUP = 1 (Autism Spectrum Disorder) -> Target Label 1
    DX_GROUP = 2 (Typical Control / Non-Autism) -> Target Label 0

Strict Policy:
- Uses verified participant-level splits (mri_2d_splits.csv).
- Data leakage prevention: Test set is strictly isolated until final evaluation.
- Threshold selection performed exclusively on validation data.
- Generates reproducible metrics, plots, and confidence intervals.
"""

import os
import sys
import json
import random
import numpy as np
import pandas as pd
from pathlib import Path
from PIL import Image

# 1. Enforce Determinism & Seeds
SEED = 42
os.environ["PYTHONHASHSEED"] = str(SEED)
random.seed(SEED)
np.random.seed(SEED)

import tensorflow as tf
tf.random.set_seed(SEED)
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

from tensorflow.keras import layers, models, callbacks, optimizers
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, roc_curve
)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SPLITS_CSV_PATH = PROJECT_ROOT / "data_config" / "mri_2d_splits.csv"
SAVED_MODELS_DIR = PROJECT_ROOT / "training" / "saved_models"
SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_SAVE_PATH = SAVED_MODELS_DIR / "neurobehavior_2d_cnn.keras"
HISTORY_CSV_PATH = SAVED_MODELS_DIR / "training_history.csv"
HISTORY_PLOT_PATH = SAVED_MODELS_DIR / "training_history.png"
CONF_MATRIX_PLOT_PATH = SAVED_MODELS_DIR / "confusion_matrix.png"
ROC_PLOT_PATH = SAVED_MODELS_DIR / "roc_curve.png"
EVAL_RESULTS_PATH = SAVED_MODELS_DIR / "evaluation_results.json"
EXPERIMENT_METADATA_PATH = SAVED_MODELS_DIR / "experiment_metadata.json"


def load_dataset_arrays(df_split: pd.DataFrame, target_size=(224, 224)):
    """Load grayscale 2D PNG images and labels into numpy arrays."""
    images = []
    labels = []
    metadata = []

    for _, row in df_split.iterrows():
        img_path = Path(row["absolute_path"])
        if not img_path.exists():
            raise FileNotFoundError(f"Missing image file: {img_path}")

        with Image.open(img_path) as img:
            img = img.convert("L")  # Single-channel grayscale
            if img.size != target_size:
                img = img.resize(target_size, Image.Resampling.BILINEAR)
            arr = np.array(img, dtype=np.float32) / 255.0  # Normalize to [0, 1]
            arr = np.expand_dims(arr, axis=-1)  # Shape (224, 224, 1)

        images.append(arr)
        # Target mapping: DX_GROUP 1 -> 1 (ASD), DX_GROUP 2 -> 0 (Control)
        label = 1 if int(row["expected_dx"]) == 1 else 0
        labels.append(label)
        metadata.append({
            "participant_id": str(row["participant_id"]),
            "cohort": str(row["cohort"]),
            "site_id": str(row["site_id"]),
            "expected_dx": int(row["expected_dx"]),
            "filename": row["filename"],
        })

    return np.array(images, dtype=np.float32), np.array(labels, dtype=np.int32), metadata


def build_baseline_2d_cnn(input_shape=(224, 224, 1)):
    """Build a reproducible, computationally efficient 2D CNN baseline."""
    model = models.Sequential([
        # Data Augmentation layer (Active ONLY during training)
        layers.RandomFlip("horizontal", seed=SEED, input_shape=input_shape, name="aug_hflip"),

        # Block 1
        layers.Conv2D(16, (3, 3), padding="same", name="conv1"),
        layers.BatchNormalization(name="bn1"),
        layers.ReLU(name="relu1"),
        layers.MaxPooling2D((2, 2), name="pool1"),

        # Block 2
        layers.Conv2D(32, (3, 3), padding="same", name="conv2"),
        layers.BatchNormalization(name="bn2"),
        layers.ReLU(name="relu2"),
        layers.MaxPooling2D((2, 2), name="pool2"),

        # Block 3
        layers.Conv2D(64, (3, 3), padding="same", name="conv3"),
        layers.BatchNormalization(name="bn3"),
        layers.ReLU(name="relu3"),
        layers.MaxPooling2D((2, 2), name="pool3"),

        # Block 4
        layers.Conv2D(64, (3, 3), padding="same", name="conv4"),
        layers.BatchNormalization(name="bn4"),
        layers.ReLU(name="relu4"),
        layers.MaxPooling2D((2, 2), name="pool4"),

        # Projection & Classification Head
        layers.GlobalAveragePooling2D(name="gap"),
        layers.Dense(64, activation="relu", name="dense1"),
        layers.Dropout(0.4, seed=SEED, name="dropout1"),
        layers.Dense(1, activation="sigmoid", name="output_sigmoid"),
    ], name="NeuroBehavior_2D_CNN")

    optimizer = optimizers.Adam(learning_rate=2e-4)
    model.compile(
        optimizer=optimizer,
        loss="binary_crossentropy",
        metrics=[
            "accuracy",
            tf.keras.metrics.AUC(name="auc"),
        ]
    )
    return model


def calculate_wilson_ci(k, n, confidence=0.95):
    """Calculate Wilson score confidence interval for proportions."""
    if n == 0:
        return 0.0, 0.0
    from scipy.stats import norm
    z = norm.ppf(1 - (1 - confidence) / 2)
    p = k / n
    denominator = 1 + z**2 / n
    centre_adjusted_probability = (p + z**2 / (2 * n)) / denominator
    adjusted_std_error = (z * np.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)) / denominator
    lower = max(0.0, centre_adjusted_probability - adjusted_std_error)
    upper = min(1.0, centre_adjusted_probability + adjusted_std_error)
    return round(float(lower), 4), round(float(upper), 4)


def run_pipeline():
    print("=" * 75, flush=True)
    print("NeuroBehavior-ASD: 2D CNN Model Training & Validation", flush=True)
    print("=" * 75, flush=True)

    if not SPLITS_CSV_PATH.exists():
        raise FileNotFoundError(f"Splits file not found: {SPLITS_CSV_PATH}")

    df_splits = pd.read_csv(SPLITS_CSV_PATH)
    print(f"[+] Loaded verified participant splits from: {SPLITS_CSV_PATH}", flush=True)

    df_train = df_splits[df_splits["split"] == "train"].copy()
    df_val = df_splits[df_splits["split"] == "val"].copy()
    df_test = df_splits[df_splits["split"] == "test"].copy()

    print(f"    Train records:      {len(df_train)} (ASD: {(df_train['expected_dx'] == 1).sum()}, Control: {(df_train['expected_dx'] == 2).sum()})", flush=True)
    print(f"    Validation records: {len(df_val)} (ASD: {(df_val['expected_dx'] == 1).sum()}, Control: {(df_val['expected_dx'] == 2).sum()})", flush=True)
    print(f"    Test records:       {len(df_test)} (ASD: {(df_test['expected_dx'] == 1).sum()}, Control: {(df_test['expected_dx'] == 2).sum()})", flush=True)

    # Load arrays
    print("\n[+] Loading & preparing normalized 2D image matrices...", flush=True)
    X_train, y_train, meta_train = load_dataset_arrays(df_train)
    X_val, y_val, meta_val = load_dataset_arrays(df_val)
    X_test, y_test, meta_test = load_dataset_arrays(df_test)

    print(f"    X_train shape: {X_train.shape}, y_train: {y_train.shape}", flush=True)
    print(f"    X_val shape:   {X_val.shape}, y_val: {y_val.shape}", flush=True)
    print(f"    X_test shape:  {X_test.shape}, y_test: {y_test.shape}", flush=True)

    # Compute balanced class weights for training data
    n_total = len(y_train)
    n_control = (y_train == 0).sum()
    n_asd = (y_train == 1).sum()
    weight_0 = round(n_total / (2.0 * n_control), 4)
    weight_1 = round(n_total / (2.0 * n_asd), 4)
    class_weights = {0: weight_0, 1: weight_1}
    print(f"\n[+] Balanced Class Weights computed from training split: {class_weights}", flush=True)

    # Build model
    print("\n[+] Constructing 2D CNN Architecture...", flush=True)
    model = build_baseline_2d_cnn(input_shape=(224, 224, 1))
    model.summary()

    # Callbacks
    training_callbacks = [
        callbacks.EarlyStopping(
            monitor="val_loss",
            patience=5,
            restore_best_weights=True,
            mode="min",
            verbose=1,
        ),
        callbacks.ModelCheckpoint(
            filepath=str(MODEL_SAVE_PATH),
            monitor="val_loss",
            save_best_only=True,
            mode="min",
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-5,
            verbose=1,
        ),
    ]

    # Train
    EPOCHS = 15
    BATCH_SIZE = 32
    print(f"\n[+] Initiating training for max {EPOCHS} epochs (batch size: {BATCH_SIZE})...", flush=True)
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        class_weight=class_weights,
        callbacks=training_callbacks,
        verbose=1,
    )

    # Save training history CSV
    df_history = pd.DataFrame(history.history)
    df_history.to_csv(HISTORY_CSV_PATH, index=False)
    print(f"\n[+] Saved training history to: {HISTORY_CSV_PATH}", flush=True)

    # Plot training curves
    plt.figure(figsize=(12, 4))
    plt.subplot(1, 2, 1)
    plt.plot(df_history["loss"], label="Train Loss", color="#0284c7")
    plt.plot(df_history["val_loss"], label="Val Loss", color="#b45309", linestyle="--")
    plt.title("Binary Cross-Entropy Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    plt.plot(df_history["auc"], label="Train ROC-AUC", color="#0284c7")
    plt.plot(df_history["val_auc"], label="Val ROC-AUC", color="#b45309", linestyle="--")
    plt.title("ROC-AUC Metric")
    plt.xlabel("Epoch")
    plt.ylabel("AUC")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(HISTORY_PLOT_PATH, dpi=150)
    plt.close()
    print(f"[+] Saved training history plot to: {HISTORY_PLOT_PATH}", flush=True)

    # -------------------------------------------------------------------------
    # STEP 4: THRESHOLD SELECTION (Validation Set ONLY)
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75, flush=True)
    print("STEP 4: THRESHOLD SELECTION (VALIDATION SET ONLY)", flush=True)
    print("=" * 75, flush=True)
    val_probs = model.predict(X_val, verbose=0).flatten()

    thresholds = np.linspace(0.10, 0.90, 81)
    best_threshold = 0.50
    best_youden_j = -1.0
    best_f1 = -1.0
    threshold_records = []

    for t in thresholds:
        preds = (val_probs >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_val, preds, labels=[0, 1]).ravel()
        sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        youden = sens + spec - 1.0
        f1 = f1_score(y_val, preds, zero_division=0)

        threshold_records.append({
            "threshold": round(float(t), 3),
            "sensitivity": round(float(sens), 4),
            "specificity": round(float(spec), 4),
            "youden_j": round(float(youden), 4),
            "f1": round(float(f1), 4),
        })

        if youden > best_youden_j:
            best_youden_j = youden
            best_threshold = round(float(t), 3)
            best_f1 = round(float(f1), 4)

    print(f"[+] Optimal Validation Threshold (maximizing Youden's J): {best_threshold:.3f}", flush=True)
    print(f"    Validation Youden's J: {best_youden_j:.4f} | Validation F1: {best_f1:.4f}", flush=True)

    # -------------------------------------------------------------------------
    # STEP 5: FINAL EVALUATION ON UNTOUCHED TEST SET
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75, flush=True)
    print("STEP 5: EVALUATION ON UNTOUCHED TEST SET", flush=True)
    print("=" * 75, flush=True)

    test_probs = model.predict(X_test, verbose=0).flatten()

    def evaluate_with_threshold(probs, y_true, threshold, desc=""):
        y_pred = (probs >= threshold).astype(int)
        acc = accuracy_score(y_true, y_pred)
        prec = precision_score(y_true, y_pred, pos_label=1, zero_division=0)
        rec = recall_score(y_true, y_pred, pos_label=1, zero_division=0)  # Sensitivity
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0  # Specificity
        f1 = f1_score(y_true, y_pred, pos_label=1, zero_division=0)
        macro_f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
        auc = roc_auc_score(y_true, probs)

        n_test = len(y_true)
        acc_ci = calculate_wilson_ci(int(round(acc * n_test)), n_test)
        sens_ci = calculate_wilson_ci(tp, (tp + fn))
        spec_ci = calculate_wilson_ci(tn, (tn + fp))

        return {
            "description": desc,
            "threshold": threshold,
            "accuracy": round(float(acc), 4),
            "accuracy_95ci": acc_ci,
            "asd_precision": round(float(prec), 4),
            "asd_recall_sensitivity": round(float(rec), 4),
            "sensitivity_95ci": sens_ci,
            "control_specificity": round(float(spec), 4),
            "specificity_95ci": spec_ci,
            "asd_f1": round(float(f1), 4),
            "macro_f1": round(float(macro_f1), 4),
            "roc_auc": round(float(auc), 4),
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp),
            },
            "sample_counts": {
                "total_test_samples": n_test,
                "asd_samples": int(tp + fn),
                "control_samples": int(tn + fp),
            }
        }

    results_default = evaluate_with_threshold(test_probs, y_test, 0.50, "Default 0.5 Threshold")
    results_selected = evaluate_with_threshold(test_probs, y_test, best_threshold, f"Validation-Selected Threshold ({best_threshold:.3f})")

    print(f"\n--- Untouched Test Performance at Validation-Selected Threshold ({best_threshold:.3f}) ---", flush=True)
    print(f"Test Accuracy:           {results_selected['accuracy'] * 100:.2f}% (95% CI: [{results_selected['accuracy_95ci'][0]*100:.1f}%, {results_selected['accuracy_95ci'][1]*100:.1f}%])", flush=True)
    print(f"ASD Recall (Sensitivity): {results_selected['asd_recall_sensitivity'] * 100:.2f}% (95% CI: [{results_selected['sensitivity_95ci'][0]*100:.1f}%, {results_selected['sensitivity_95ci'][1]*100:.1f}%])", flush=True)
    print(f"Control Specificity:     {results_selected['control_specificity'] * 100:.2f}% (95% CI: [{results_selected['specificity_95ci'][0]*100:.1f}%, {results_selected['specificity_95ci'][1]*100:.1f}%])", flush=True)
    print(f"ASD Precision:           {results_selected['asd_precision'] * 100:.2f}%", flush=True)
    print(f"ASD F1-Score:            {results_selected['asd_f1']:.4f}", flush=True)
    print(f"ROC-AUC:                 {results_selected['roc_auc']:.4f}", flush=True)
    cm = results_selected['confusion_matrix']
    print(f"Confusion Matrix:        TN={cm['true_negative']}, FP={cm['false_positive']} | FN={cm['false_negative']}, TP={cm['true_positive']}", flush=True)

    # Plot Confusion Matrix
    plt.figure(figsize=(5, 4.5))
    cm_matrix = np.array([
        [cm["true_negative"], cm["false_positive"]],
        [cm["false_negative"], cm["true_positive"]]
    ])
    plt.imshow(cm_matrix, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title(f"Test Confusion Matrix\n(Threshold = {best_threshold:.3f})")
    plt.colorbar()
    tick_marks = np.arange(2)
    plt.xticks(tick_marks, ["Control (0)", "ASD (1)"])
    plt.yticks(tick_marks, ["Control (0)", "ASD (1)"])

    thresh = cm_matrix.max() / 2.0
    for i in range(2):
        for j in range(2):
            plt.text(j, i, format(cm_matrix[i, j], "d"),
                     horizontalalignment="center",
                     color="white" if cm_matrix[i, j] > thresh else "black",
                     fontsize=14, fontweight="bold")

    plt.ylabel("True Diagnosis Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    plt.savefig(CONF_MATRIX_PLOT_PATH, dpi=150)
    plt.close()
    print(f"[+] Saved confusion matrix plot to: {CONF_MATRIX_PLOT_PATH}", flush=True)

    # Plot ROC Curve
    fpr, tpr, _ = roc_curve(y_test, test_probs)
    plt.figure(figsize=(5, 4.5))
    plt.plot(fpr, tpr, color="#0284c7", lw=2, label=f"2D CNN ROC (AUC = {results_selected['roc_auc']:.3f})")
    plt.plot([0, 1], [0, 1], color="#94a3b8", lw=1.5, linestyle="--", label="Chance Level (AUC = 0.50)")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate (1 - Specificity)")
    plt.ylabel("True Positive Rate (Sensitivity / Recall)")
    plt.title("Receiver Operating Characteristic (ROC) Curve")
    plt.legend(loc="lower right")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(ROC_PLOT_PATH, dpi=150)
    plt.close()
    print(f"[+] Saved ROC curve plot to: {ROC_PLOT_PATH}", flush=True)

    # -------------------------------------------------------------------------
    # STEP 6: SITE & SCANNER CONFOUNDING AUDIT ON TEST SET
    # -------------------------------------------------------------------------
    print("\n" + "=" * 75, flush=True)
    print("STEP 6: SITE & SCANNER HETEROGENEITY AUDIT (TEST SET)", flush=True)
    print("=" * 75, flush=True)
    df_test_eval = pd.DataFrame(meta_test)
    df_test_eval["true_label"] = y_test
    df_test_eval["pred_prob"] = test_probs
    df_test_eval["pred_label"] = (test_probs >= best_threshold).astype(int)
    df_test_eval["is_correct"] = (df_test_eval["true_label"] == df_test_eval["pred_label"])

    site_summary = []
    for site, group in df_test_eval.groupby("site_id"):
        n_samples = len(group)
        if n_samples >= 3:
            site_acc = group["is_correct"].mean()
            site_summary.append({
                "site_id": site,
                "n_samples": int(n_samples),
                "accuracy": round(float(site_acc), 4),
                "asd_count": int((group["true_label"] == 1).sum()),
                "control_count": int((group["true_label"] == 0).sum()),
            })

    df_site_summary = pd.DataFrame(site_summary).sort_values("n_samples", ascending=False)
    print(df_site_summary.to_string(index=False), flush=True)

    # Save comprehensive evaluation results JSON
    final_output = {
        "model_name": "NeuroBehavior-ASD 2D CNN Baseline",
        "version": "1.0.0",
        "architecture": {
            "type": "2D Convolutional Neural Network (4 Conv Blocks + GAP + Dense)",
            "input_shape": [224, 224, 1],
            "parameters_count": int(model.count_params()),
            "loss": "binary_crossentropy",
            "optimizer": "Adam(lr=2e-4)",
        },
        "dataset": {
            "sources": ["ABIDE I", "ABIDE II"],
            "total_participants": int(len(df_splits)),
            "splits": {
                "train_participants": int(len(df_train)),
                "val_participants": int(len(df_val)),
                "test_participants": int(len(df_test)),
            },
            "class_distribution": {
                "ASD_DX1": int((df_splits['expected_dx'] == 1).sum()),
                "Control_DX2": int((df_splits['expected_dx'] == 2).sum()),
            }
        },
        "threshold_selection": {
            "procedure": "Youden's J statistic optimization evaluated exclusively on Validation split",
            "evaluated_range": [0.10, 0.90],
            "best_validation_threshold": float(best_threshold),
            "best_validation_youden_j": float(best_youden_j),
            "best_validation_f1": float(best_f1),
        },
        "test_results_selected_threshold": results_selected,
        "test_results_default_threshold": results_default,
        "site_confounding_audit": site_summary,
        "scientific_limitations": [
            "2D slices capture single neuroanatomical planes, discarding 3D morphometric context.",
            "Cross-site scanner variations (field strength, coil geometry, pulse sequence) induce inter-site domain shifts.",
            "Structural MRI biomarkers alone do not provide definitive diagnostic conclusions; clinical evaluations remain mandatory."
        ]
    }

    with open(EVAL_RESULTS_PATH, "w") as f:
        json.dump(final_output, f, indent=2)
    print(f"\n[+] Full evaluation results JSON saved to: {EVAL_RESULTS_PATH}", flush=True)

    # Save Experiment Metadata
    exp_metadata = {
        "experiment_name": "neurobehavior_asd_2d_cnn_baseline",
        "random_seed": SEED,
        "trained_model_path": str(MODEL_SAVE_PATH),
        "input_dimensions": "224x224x1",
        "epochs_trained": len(df_history),
        "best_epoch": int(df_history["val_loss"].idxmin()) + 1,
        "best_val_loss": round(float(df_history["val_loss"].min()), 4),
        "best_val_auc": round(float(df_history["val_auc"].max()), 4),
    }
    with open(EXPERIMENT_METADATA_PATH, "w") as f:
        json.dump(exp_metadata, f, indent=2)
    print(f"[+] Experiment metadata saved to: {EXPERIMENT_METADATA_PATH}", flush=True)

    print("\n" + "=" * 75, flush=True)
    print("TRAINING AND EVALUATION COMPLETE!", flush=True)
    print("=" * 75, flush=True)


if __name__ == "__main__":
    run_pipeline()
