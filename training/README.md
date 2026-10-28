# ABIDE I & ABIDE II Deep Learning Training Guide

## 1. Project Objective

**NeuroBehavior-ASD: Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers and Behavioral Features**

The primary deep learning task is **binary classification**:
- **DX_GROUP = 1**: Autism Spectrum Disorder (ASD)
- **DX_GROUP = 2**: Typical Control (TC) / Non-autism

> **Note on Severity:**
> Multiclass severity estimation (e.g. Mild / Moderate / Severe) is **not simulated**. It will only be incorporated if clinically validated, site-harmonized severity metrics (such as calibrated ADOS CSS scores) are compiled and rigorously validated. Otherwise, the model strictly predicts binary ASD vs Control.

---

## 2. Dataset Overview

### ABIDE I
- **1,112 Subjects** across 17 international collection sites.
- 539 individuals with ASD and 573 age-matched typical controls.
- Structural T1-weighted MPRAGE volumes and resting-state fMRI.

### ABIDE II
- **1,114 Subjects** across 19 international collection sites.
- 521 individuals with ASD and 593 typical controls.

---

## 3. Recommended Preprocessing Pipeline

1. **Skull Stripping & Brain Extraction:** BET (FSL) or HD-BET.
2. **Spatial Normalization / Registration:** Non-linear registration to standard MNI152 space (1mm or 2mm isotropic).
3. **Intensity Normalization:** Z-score normalization of voxel intensities across non-zero brain tissue.
4. **Resampling:** Uniform matrix dimension (e.g., $128 \times 128 \times 128$ voxels).

---

## 4. Model Architectures

### 4.1 2D Convolutional Neural Network (Active Trained Baseline)
The verified 2D dataset comprises **2,221 standardized structural MRI slices** ($224 \times 224 \times 1$, grayscale):
- **Cohort Distribution:** 1,111 images from ABIDE I, 1,110 images from ABIDE II.
- **Class Balance:** 1,058 Autism Spectrum Disorder (`DX_GROUP = 1`) and 1,163 Typical Control (`DX_GROUP = 2`).
- **Participant-Level Leakage-Free Partitioning:**
  - **Train Split:** 1,554 participants (740 ASD, 814 Control)
  - **Validation Split:** 333 participants (159 ASD, 174 Control)
  - **Test Split:** 334 participants (159 ASD, 175 Control)
- **Duplicate Protection:** Exact pixel duplicate pairs (`50279.png`/`50286.png` and `29241.png`/`29245.png`) are strictly restricted to the training partition to prevent test contamination.
- **Regularization & Training:** Batch normalization, dropout ($p=0.4$), balanced class weighting, early stopping, and validation-optimized decision thresholding.

To run inference on any 2D MRI slice:
```powershell
py -3.11 training/run_inference.py --image "path/to/slice.png"
```

### 4.2 3D Convolutional Neural Network (Future Volumetric Extension)
For full 3D volumetric structural volumes ($128 \times 128 \times 128$ voxels), see `training/model_architecture.py`.

---

## 5. Ethical & Scientific Caveats

1. **Do not create fake predictions.** Model weights must only be deployed after verified cross-site validation and threshold calibration.
2. **Never claim clinical diagnostic accuracy.** Deep learning biomarkers serve as decision support exploratory tools, not standalone diagnostic instruments.
