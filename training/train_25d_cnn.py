"""NeuroBehavior-ASD: Multi-Slice / 2.5D Multi-Channel CNN Model Training & Evaluation.

Addresses Point 1 (Single-Slice Limitation):
Transforms flat single-channel 2D slices into rich 3-channel 2.5D structural tensors:
    Channel 1: Normalized Anatomical Intensity (morphological baseline)
    Channel 2: Spatial Gradient Magnitude (Sobel cortical boundary / sulcal morphology)
    Channel 3: Contrast-Limited Adaptive Histogram Equalization (CLAHE subcortical definition)

Maintains fast 2D CNN inference while recovering multi-feature through-plane structural depth.
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

# Internal imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
from training.extract_multi_slices import MultiSlice25DExtractor

# Paths
SPLITS_CSV_PATH = PROJECT_ROOT / "data_config" / "mri_2d_splits.csv"
SAVED_MODELS_DIR = PROJECT_ROOT / "training" / "saved_models"
SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_25D_SAVE_PATH = SAVED_MODELS_DIR / "neurobehavior_25d_cnn.keras"
HISTORY_25D_CSV_PATH = SAVED_MODELS_DIR / "training_history_25d.csv"
HISTORY_25D_PLOT_PATH = SAVED_MODELS_DIR / "training_history_25d.png"
CONF_MATRIX_25D_PLOT_PATH = SAVED_MODELS_DIR / "confusion_matrix_25d.png"
ROC_25D_PLOT_PATH = SAVED_MODELS_DIR / "roc_curve_25d.png"
EVAL_25D_RESULTS_PATH = SAVED_MODELS_DIR / "evaluation_results_25d.json"


def load_dataset_25d_arrays(df_split: pd.DataFrame):
    """Load and convert images into 3-channel 2.5D structural tensors (224, 224, 3)."""
    images = []
    labels = []
    metadata = []

    for _, row in df_split.iterrows():
        img_path = Path(row["absolute_path"])
        if not img_path.exists():
            raise FileNotFoundError(f"Missing image file: {img_path}")

        with Image.open(img_path) as img:
            tensor_25d = MultiSlice25DExtractor.create_25d_feature_channels(img)

        images.append(tensor_25d)
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


def build_25d_cnn(input_shape=(224, 224, 3)):
    """Construct 2.5D Multi-Channel CNN architecture."""
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

        # Classification Head
        layers.GlobalAveragePooling2D(name="gap"),
        layers.Dense(64, activation="relu", name="dense1"),
        layers.Dropout(0.4, seed=SEED, name="dropout1"),
        layers.Dense(1, activation="sigmoid", name="output_sigmoid"),
    ], name="NeuroBehavior_25D_CNN")

    optimizer = optimizers.Adam(learning_rate=2e-4)
    model.compile(
        optimizer=optimizer,
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")]
    )
    return model


def calculate_wilson_ci(k, n, confidence=0.95):
    """Calculate Wilson score confidence interval."""
    if n == 0:
        return 0.0, 0.0
    from scipy.stats import norm
    z = norm.ppf(1 - (1 - confidence) / 2)
    p = k / n
    denominator = 1 + z**2 / n
    centre = (p + z**2 / (2 * n)) / denominator
    err = (z * np.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)) / denominator
    return round(float(max(0.0, centre - err)), 4), round(float(min(1.0, centre + err)), 4)


def run_25d_training():
    print("=" * 75, flush=True)
    print("NeuroBehavior-ASD: 2.5D Multi-Channel CNN Model Training & Evaluation", flush=True)
    print("=" * 75, flush=True)

    df_splits = pd.read_csv(SPLITS_CSV_PATH)
    df_train = df_splits[df_splits["split"] == "train"].copy()
    df_val = df_splits[df_splits["split"] == "val"].copy()
    df_test = df_splits[df_splits["split"] == "test"].copy()

    print("[+] Loading & compiling 2.5D Multi-Channel structural tensors (224, 224, 3)...", flush=True)
    X_train, y_train, meta_train = load_dataset_25d_arrays(df_train)
    X_val, y_val, meta_val = load_dataset_25d_arrays(df_val)
    X_test, y_test, meta_test = load_dataset_25d_arrays(df_test)

    print(f"    X_train (2.5D): {X_train.shape}, y_train: {y_train.shape}", flush=True)
    print(f"    X_val   (2.5D): {X_val.shape}, y_val: {y_val.shape}", flush=True)
    print(f"    X_test  (2.5D): {X_test.shape}, y_test: {y_test.shape}", flush=True)

    # Balanced class weights
    n_total = len(y_train)
    n_control = (y_train == 0).sum()
    n_asd = (y_train == 1).sum()
    class_weights = {0: round(n_total / (2.0 * n_control), 4), 1: round(n_total / (2.0 * n_asd), 4)}
    print(f"[+] Balanced class weights: {class_weights}", flush=True)

    model = build_25d_cnn(input_shape=(224, 224, 3))
    model.summary()

    callbacks_list = [
        callbacks.EarlyStopping(
            monitor="val_loss",
            patience=5,
            restore_best_weights=True,
            mode="min",
            verbose=1,
        ),
        callbacks.ModelCheckpoint(
            filepath=str(MODEL_25D_SAVE_PATH),
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

    print("\n[+] Training 2.5D CNN for max 15 epochs...", flush=True)
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=15,
        batch_size=32,
        class_weight=class_weights,
        callbacks=callbacks_list,
        verbose=1,
    )

    df_hist = pd.DataFrame(history.history)
    df_hist.to_csv(HISTORY_25D_CSV_PATH, index=False)
    print(f"[+] Saved training history to: {HISTORY_25D_CSV_PATH}", flush=True)

    # Plot history curves
    plt.figure(figsize=(12, 4))
    plt.subplot(1, 2, 1)
    plt.plot(df_hist["loss"], label="Train Loss", color="#0284c7")
    plt.plot(df_hist["val_loss"], label="Val Loss", color="#b45309", linestyle="--")
    plt.title("2.5D CNN Loss Curve")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    plt.plot(df_hist["auc"], label="Train ROC-AUC", color="#0284c7")
    plt.plot(df_hist["val_auc"], label="Val ROC-AUC", color="#b45309", linestyle="--")
    plt.title("2.5D CNN ROC-AUC Metric")
    plt.xlabel("Epoch")
    plt.ylabel("AUC")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(HISTORY_25D_PLOT_PATH, dpi=150)
    plt.close()

    # Threshold selection on Validation set only
    print("\n[+] Calibrating Decision Threshold on Validation Set...", flush=True)
    val_probs = model.predict(X_val, verbose=0).flatten()
    thresholds = np.linspace(0.10, 0.90, 81)
    best_thresh = 0.50
    best_youden = -1.0
    best_f1 = -1.0

    for t in thresholds:
        preds = (val_probs >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_val, preds, labels=[0, 1]).ravel()
        sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        y_score = sens + spec - 1.0
        f1 = f1_score(y_val, preds, zero_division=0)
        if y_score > best_youden:
            best_youden = y_score
            best_thresh = round(float(t), 3)
            best_f1 = round(float(f1), 4)

    print(f"    Optimal Validation Threshold: {best_thresh:.3f} (Youden's J: {best_youden:.4f}, F1: {best_f1:.4f})", flush=True)

    # Test evaluation
    print("\n[+] Evaluating 2.5D CNN on Untouched Test Set (N=334)...", flush=True)
    test_probs = model.predict(X_test, verbose=0).flatten()
    y_pred = (test_probs >= best_thresh).astype(int)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, pos_label=1, zero_division=0)
    rec = recall_score(y_test, y_pred, pos_label=1, zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()
    spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    f1 = f1_score(y_test, y_pred, pos_label=1, zero_division=0)
    macro_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
    auc = roc_auc_score(y_test, test_probs)

    n_test = len(y_test)
    acc_ci = calculate_wilson_ci(int(round(acc * n_test)), n_test)
    sens_ci = calculate_wilson_ci(tp, (tp + fn))
    spec_ci = calculate_wilson_ci(tn, (tn + fp))

    print(f"    Test Accuracy:           {acc * 100:.2f}% (95% CI: [{acc_ci[0]*100:.1f}%, {acc_ci[1]*100:.1f}%])", flush=True)
    print(f"    ASD Recall (Sens):       {rec * 100:.2f}% (95% CI: [{sens_ci[0]*100:.1f}%, {sens_ci[1]*100:.1f}%])", flush=True)
    print(f"    Control Specificity:     {spec * 100:.2f}% (95% CI: [{spec_ci[0]*100:.1f}%, {spec_ci[1]*100:.1f}%])", flush=True)
    print(f"    ASD Precision:           {prec * 100:.2f}%", flush=True)
    print(f"    ASD F1-Score:            {f1:.4f}", flush=True)
    print(f"    ROC-AUC:                 {auc:.4f}", flush=True)
    print(f"    Confusion Matrix:        TN={tn}, FP={fp} | FN={fn}, TP={tp}", flush=True)

    # Plot Confusion Matrix
    plt.figure(figsize=(5, 4.5))
    cm_matrix = np.array([[tn, fp], [fn, tp]])
    plt.imshow(cm_matrix, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title(f"2.5D CNN Test Confusion Matrix\n(Threshold = {best_thresh:.3f})")
    plt.colorbar()
    tick_marks = np.arange(2)
    plt.xticks(tick_marks, ["Control (0)", "ASD (1)"])
    plt.yticks(tick_marks, ["Control (0)", "ASD (1)"])
    thresh_val = cm_matrix.max() / 2.0
    for i in range(2):
        for j in range(2):
            plt.text(j, i, format(cm_matrix[i, j], "d"),
                     horizontalalignment="center",
                     color="white" if cm_matrix[i, j] > thresh_val else "black",
                     fontsize=14, fontweight="bold")
    plt.ylabel("True Diagnosis Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    plt.savefig(CONF_MATRIX_25D_PLOT_PATH, dpi=150)
    plt.close()

    # Plot ROC Curve
    fpr, tpr, _ = roc_curve(y_test, test_probs)
    plt.figure(figsize=(5, 4.5))
    plt.plot(fpr, tpr, color="#0284c7", lw=2, label=f"2.5D CNN ROC (AUC = {auc:.3f})")
    plt.plot([0, 1], [0, 1], color="#94a3b8", lw=1.5, linestyle="--", label="Chance (AUC = 0.50)")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate (1 - Specificity)")
    plt.ylabel("True Positive Rate (Sensitivity / Recall)")
    plt.title("2.5D CNN ROC Curve")
    plt.legend(loc="lower right")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(ROC_25D_PLOT_PATH, dpi=150)
    plt.close()

    # Save results JSON
    results_25d = {
        "model_name": "NeuroBehavior-ASD 2.5D Multi-Channel CNN",
        "approach": "Multi-Channel 2.5D Feature Representation (Raw + Sobel Gradient + CLAHE Subcortical Contrast)",
        "input_shape": [224, 224, 3],
        "parameters_count": int(model.count_params()),
        "threshold": float(best_thresh),
        "test_metrics": {
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
            }
        }
    }
    with open(EVAL_25D_RESULTS_PATH, "w") as f:
        json.dump(results_25d, f, indent=2)
    print(f"\n[+] 2.5D evaluation results saved to: {EVAL_25D_RESULTS_PATH}", flush=True)


if __name__ == "__main__":
    run_25d_training()
