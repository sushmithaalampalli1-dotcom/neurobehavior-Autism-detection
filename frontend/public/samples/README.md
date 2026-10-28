# NeuroBehavior-ASD: Demonstration MRI Sample Slices

This folder contains verified brain MRI slices from the **untouched test split** of the ABIDE dataset. These files are provided specifically for final-year project demonstrations, viva examinations, and live UI evaluations.

---

## 📁 Sample Scan Catalog

### 🌟 Verified High-Confidence Demonstration Scans (76.95% Deep Multimodal Stacking Model)
These scans provide crystal-clear, high-margin classification demonstrations on the test set:

| File Name | Ground Truth Cohort | Model Prediction | Model Probability | Recommended Usage |
| :--- | :--- | :--- | :--- | :--- |
| `sample_asd_28802.png` | **ABIDE Autistic Participant** | **Autism Spectrum Disorder (ASD)** | $P(\text{ASD}) = 0.9599$ ($\ge 0.470$) | **Primary ASD Demo** — Demonstrates strong positive biomarker detection (95.99% confidence) |
| `sample_control_28749.png` | **ABIDE Non-Autistic Control** | **Typical Control (TC) / Non-Autism** | $P(\text{ASD}) = 0.0413$ ($< 0.470$) | **Primary Control Demo** — Demonstrates strong typical control detection (95.87% control confidence) |

---

### 🔬 Baseline 2.5D CNN Boundary Scans
| File Name | Ground Truth Cohort | Model Prediction | Model Probability | Recommended Usage |
| :--- | :--- | :--- | :--- | :--- |
| `sample_asd_28684.png` | ABIDE Autistic Participant | **Autism Spectrum Disorder (ASD)** | $P(\text{ASD}) = 0.5616 \ge 0.560$ | Boundary ASD screening detection |
| `sample_control_28950.png` | ABIDE Non-Autistic Control | **Typical Control (TC) / Non-Autism** | $P(\text{ASD}) = 0.5568 < 0.560$ | Boundary Typical Control screening detection |

---

## 🚀 How to Use in Live Demonstration

1. **Start the Application:**
   - Double-click `start_backend.bat` (Flask API on port 5000).
   - Double-click `start_frontend.bat` (Vite UI on port 5173).
   - Open browser at `http://localhost:5173`.

2. **Login or Register:**
   - Use pre-seeded demo account:
     - **Email:** `patient@demo.neurobehavior.org`
     - **Password:** `password123`
   - Or register a new test patient account.

3. **Navigate to MRI Assessment:**
   - Click **"MRI Assessment"** in the top navigation bar.
   - Click **"Browse Files"** and select either:
     - `demo_samples/sample_asd_28802.png` for an ASD screening prediction (High Confidence: 95.99%).
     - `demo_samples/sample_control_28749.png` for a Typical Control prediction (High Confidence: 95.87%).
     - (Or legacy boundary scans: `sample_asd_28684.png` / `sample_control_28950.png`).
   - Click **"Upload & Analyze MRI"**.

4. **Observe Real Deep Learning Output:**
   - The UI immediately renders the slice preview alongside the 2.5D Multi-Channel CNN classification, calibrated threshold ($\tau^* = 0.560$), confidence score, and research disclaimer.
   - Predictions are saved to the patient's persistent database history.

5. **Generate & Download PDF:**
   - Proceed to **Questionnaire**, complete the 10-item IASQ, view **Results**, and click **"Download Clinical Summary PDF"**.
   - The generated PDF aggregates both the MRI classification and the IASQ behavioral results with complete patient isolation.

---

## 🔒 Ethical & Academic Research Notice
- These scans originate from anonymized, open-access neuroimaging repositories (ABIDE I & II).
- NeuroBehavior-ASD is a decision-support research system. In accordance with clinical neuroimaging guidelines, structural MRI biomarker models provide statistical screening probabilities and do not constitute a standalone medical diagnosis.
