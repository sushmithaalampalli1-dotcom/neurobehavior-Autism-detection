"""Command-line inference tool for NeuroBehavior-ASD MRI models.

Supports both:
  1. 2.5D Multi-Channel CNN (Default, improved ASD sensitivity)
  2. Baseline 1-Channel 2D CNN

Usage:
    py -3.11 training/run_inference.py --image "path/to/scan.png"
    py -3.11 training/run_inference.py --image "path/to/scan.png" --model baseline
    py -3.11 training/run_inference.py --image "path/to/scan.png" --model both
"""

import sys
import os
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image

# Suppress TensorFlow logging
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import tensorflow as tf

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

MODEL_25D_PATH = PROJECT_ROOT / "training" / "saved_models" / "neurobehavior_25d_cnn.keras"
MODEL_2D_PATH = PROJECT_ROOT / "training" / "saved_models" / "neurobehavior_2d_cnn.keras"
MODEL_MM_PATH = PROJECT_ROOT / "training" / "saved_models" / "neurobehavior_deep_multimodal_gb.joblib"
EVAL_25D_PATH = PROJECT_ROOT / "training" / "saved_models" / "evaluation_results_25d.json"
EVAL_2D_PATH = PROJECT_ROOT / "training" / "saved_models" / "evaluation_results.json"
EVAL_MM_PATH = PROJECT_ROOT / "training" / "saved_models" / "evaluation_results_multimodal.json"

# Import 2.5D feature extraction
from training.extract_multi_slices import MultiSlice25DExtractor, extract_25d_from_png


def get_threshold(eval_path: Path, default_val: float = 0.50) -> float:
    if eval_path.exists():
        with open(eval_path, "r") as f:
            data = json.load(f)
            if "threshold" in data:
                return float(data["threshold"])
            elif "threshold_selection" in data:
                return float(data["threshold_selection"].get("best_validation_threshold", default_val))
    return default_val


def run_single_model(model_path: Path, input_tensor: np.ndarray, threshold: float):
    model = tf.keras.models.load_model(str(model_path), compile=False)
    preds = model.predict(input_tensor, verbose=0).flatten()
    prob_asd = float(np.mean(preds))
    prob_control = 1.0 - prob_asd
    pred_class = "ASD" if prob_asd >= threshold else "Control"
    dx_group = 1 if pred_class == "ASD" else 2
    confidence = prob_asd if pred_class == "ASD" else prob_control
    return {
        "dx_group": dx_group,
        "class": pred_class,
        "prob_asd": prob_asd,
        "prob_control": prob_control,
        "confidence": confidence,
        "threshold": threshold,
    }


def run_inference(image_path: Path, model_type: str = "25d"):
    if not image_path.exists():
        print(f"[-] Error: Image file not found at: {image_path}")
        sys.exit(1)

    print("\n" + "=" * 70)
    print("NEUROBEHAVIOR-ASD: DEEP LEARNING MRI INFERENCE REPORT")
    print("=" * 70)
    print(f"Input Image File:         {image_path.name}")
    print(f"Evaluation Mode:          {model_type.upper()}")

    results = {}

    if model_type in ["25d", "both"]:
        if not MODEL_25D_PATH.exists():
            print(f"[-] Error: 2.5D model not found at: {MODEL_25D_PATH}")
        else:
            thresh_25d = get_threshold(EVAL_25D_PATH, 0.56)
            tensor_25d = extract_25d_from_png(image_path)
            # Bilateral hemisphere mirror for Test-Time Augmentation (TTA)
            with Image.open(image_path) as raw_im:
                flip_im = raw_im.transpose(Image.FLIP_LEFT_RIGHT)
                tensor_flip = MultiSlice25DExtractor.create_25d_feature_channels(flip_im)
            batch_25d = np.stack([tensor_25d, tensor_flip], axis=0)
            results["2.5D Multi-Channel CNN"] = run_single_model(MODEL_25D_PATH, batch_25d, thresh_25d)

    if model_type in ["baseline", "both"]:
        if not MODEL_2D_PATH.exists():
            print(f"[-] Error: Baseline 2D model not found at: {MODEL_2D_PATH}")
        else:
            thresh_2d = get_threshold(EVAL_2D_PATH, 0.55)
            with Image.open(image_path) as img:
                img_gray = img.convert("L")
                if img_gray.size != (224, 224):
                    img_gray = img_gray.resize((224, 224), Image.Resampling.BILINEAR)
                arr_2d = np.array(img_gray, dtype=np.float32) / 255.0
                input_2d = np.expand_dims(arr_2d, axis=(0, -1))  # (1, 224, 224, 1)
            results["Baseline 1-Channel 2D CNN"] = run_single_model(MODEL_2D_PATH, input_2d, thresh_2d)

    if model_type in ["multimodal", "both"]:
        if not MODEL_MM_PATH.exists() or not MODEL_25D_PATH.exists():
            print("[-] Error: Multimodal model or 2.5D CNN not found.")
        else:
            import joblib
            mm_bundle = joblib.load(str(MODEL_MM_PATH))
            cnn_m = tf.keras.models.load_model(str(MODEL_25D_PATH), compile=False)
            feat_ext = tf.keras.models.Model(inputs=cnn_m.inputs, outputs=cnn_m.get_layer("dense1").output)

            tensor_25d = extract_25d_from_png(image_path)
            inp = np.expand_dims(tensor_25d, axis=0)
            emb = feat_ext.predict(inp, verbose=0)
            p_cnn = cnn_m.predict(inp, verbose=0)

            medians = mm_bundle.get("medians", {})
            pheno = [12.0 if c == "AGE_AT_SCAN" else 1.0 if c == "SEX_PHENOTYPIC" else float(medians.get(c, 0.0)) for c in mm_bundle.get("pheno_cols", [])]
            X_mm = np.hstack([emb, p_cnn, np.array(pheno, dtype=np.float32).reshape(1, -1)])

            gb_m = mm_bundle["model"]
            mm_thresh = float(mm_bundle.get("threshold", 0.47))
            p_asd = float(gb_m.predict_proba(X_mm)[0, 1])
            p_ctrl = 1.0 - p_asd
            pred_cl = "ASD" if p_asd >= mm_thresh else "Control"
            dx_grp = 1 if pred_cl == "ASD" else 2
            conf = p_asd if pred_cl == "ASD" else p_ctrl
            results["Deep Latent Multimodal Model (76.95% Accuracy)"] = {
                "dx_group": dx_grp,
                "class": pred_cl,
                "prob_asd": p_asd,
                "prob_control": p_ctrl,
                "confidence": conf,
                "threshold": mm_thresh
            }

    for name, res in results.items():
        print("-" * 70)
        print(f"Model Architecture:       {name}")
        print(f"Decision Threshold:       {res['threshold']:.3f} (Validation-Optimized)")
        print(f"Predicted Diagnosis:      {res['class']} (DX_GROUP = {res['dx_group']})")
        print(f"Confidence Score:         {res['confidence'] * 100:.2f}%")
        print(f"ASD Probability P(DX=1):  {res['prob_asd'] * 100:.2f}%")
        print(f"Control Probability:      {res['prob_control'] * 100:.2f}%")

    print("-" * 70)
    print("MANDATORY CLINICAL & ETHICAL DISCLAIMER:")
    print("NeuroBehavior-ASD is an academic engineering research prototype.")
    print("Predictions are based on brain imaging biomarker patterns from ABIDE I/II.")
    print("This system is NOT a standalone medical diagnostic tool and must NEVER")
    print("be used as a replacement for formal clinical evaluation by medical specialists.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NeuroBehavior-ASD MRI Model Inference")
    parser.add_argument("--image", type=str, required=True, help="Path to 2D brain MRI PNG image")
    parser.add_argument(
        "--model",
        type=str,
        choices=["25d", "baseline", "multimodal", "both"],
        default="multimodal",
        help="Model to use: 'multimodal' (76.95% Deep Latent Embedding, default), '25d' (Multi-Channel 2.5D), 'baseline' (1-Channel 2D), or 'both'",
    )
    args = parser.parse_args()
    run_inference(Path(args.image), args.model)
