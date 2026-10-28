# NeuroBehavior-ASD

> **Deep Learning-Based Autism Detection Using Brain Imaging Biomarkers and Behavioral Features with Personalized Support System**

---

## 1. Project Overview

**NeuroBehavior-ASD** is an end-to-end full-stack engineering research system integrating deep learning on brain neuroimaging biomarkers (derived from ABIDE I & ABIDE II datasets) with standardized clinical behavioral screening (the verified 10-item Indian Autism Screening Questionnaire - IASQ) and a personalized location-based support network.

### Core Objectives & Principles:
- **Neuroimaging Classification Objective:** Binary classification between **Autism Spectrum Disorder (DX_GROUP = 1)** and **Typical Controls (DX_GROUP = 2)** using standardized 2D/2.5D brain MRI representations.
- **2.5D Multi-Channel CNN Architecture:** Enhances structural 2D slices with Sobel spatial boundary gradients and CLAHE subcortical adaptive contrast maps into a $(224 \times 224 \times 3)$ structural tensor, dramatically overcoming the single-slice information bottleneck.
- **Verified IASQ Behavioral Screening:** Implements the official 10-item Indian Autism Screening Questionnaire (IASQ), derived from the Indian Scale for Assessment of Autism (ISAA) by NIEPID / ICMR, with verified clinical cutoffs ($\ge 2$ Primary Clinical Screen Positive, $\ge 1$ Community Screen).
- **Strict Module Independence:** Behavioral screening intake is evaluated completely independently from the MRI deep learning pipeline to preserve clinical validity.
- **Security & Patient Privacy:** Cryptographically signed session tokens, patient-isolated assessment histories, role-based access control (Patient, Clinician, Administrator), and token invalidation on logout.
- **Personalized Support Network:** Integrated interactive Leaflet + OpenStreetMap directory with GPS proximity calculation and sorting for accredited autism diagnostic and intervention facilities in India.
- **Doctor-Readable Summaries:** Automated clinical PDF summaries generated with Python ReportLab featuring patient demographics, MRI findings, IASQ score breakdown, physician attestation signature boxes, and mandatory medical disclaimers.

---

## 2. Technology Stack

| Layer | Component | Technology |
|---|---|---|
| **Frontend** | User Interface & SPA | React 18, Vite, JavaScript (ES6+), Modern Accessible CSS |
| **Backend** | REST API Server | Python 3.11+, Flask 3.1, Flask-CORS, Flask-SQLAlchemy |
| **Authentication** | Cryptographic Sessions | `itsdangerous.URLSafeTimedSerializer` (HMAC-SHA512 + Timed Expiration) |
| **Neuroimaging** | 2D/3D MRI Processing | NiBabel 5.4, PIL (Pillow), SciPy (Sobel), OpenCV (CLAHE) |
| **Deep Learning** | Biomarker Models | TensorFlow 2.15+ / Keras (2.5D Multi-Channel CNN + Baseline 2D CNN) |
| **Database** | Persistent Storage | SQLite 3 (SQLAlchemy ORM) |
| **Clinical Reports**| PDF Compilation | Python ReportLab 5.1 |
| **Maps & Geo** | Support Center Finder| Leaflet 1.9 + OpenStreetMap |
| **Testing** | Automated Quality Assurance| Pytest 9.1 (26 automated integration & security tests) |

---

## 3. Project Directory Structure

```
neurobehavior-asd/
├── backend/
│   ├── app.py                      # Flask application factory, error handlers & blueprints
│   ├── config.py                   # Environment, upload, and database configuration
│   ├── extensions.py               # SQLAlchemy and CORS initializers
│   ├── utils/
│   │   ├── __init__.py
│   │   └── auth.py                 # Cryptographic token signing, verification & decorators
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health_routes.py        # /api/health endpoint
│   │   ├── auth_routes.py          # /api/auth registration, login, logout & me
│   │   ├── mri_routes.py           # /api/mri upload, inference, and history
│   │   ├── questionnaire_routes.py # /api/questionnaire IASQ schema and submission
│   │   ├── assessment_routes.py    # /api/assessments unified patient history
│   │   ├── report_routes.py        # /api/reports ReportLab PDF generator & download
│   │   ├── centre_routes.py        # /api/centres support centres geo-directory
│   │   └── admin_routes.py         # /api/admin metrics and subsystem overview
│   ├── services/
│   │   ├── __init__.py
│   │   ├── mri_service.py          # Multi-channel extraction & CNN inference
│   │   ├── questionnaire_service.py# Verified IASQ scoring engine & clinical thresholds
│   │   ├── pdf_service.py          # ReportLab PDF report generation
│   │   └── centre_service.py       # Support centre directory & seeding
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                 # User account database model
│   │   ├── assessment.py           # Assessment record model (MRI + Questionnaire)
│   │   └── support_centre.py       # Autism support facility model
│   └── preprocessing/
│       ├── __init__.py
│       └── mri_preprocessor.py     # NiBabel validation, voxel spacing & normalization
├── data_config/
│   ├── mri_2d_manifest.csv         # Verified audit of 2,221 ABIDE brain MRI slices
│   ├── mri_2d_splits.csv           # Leakage-free participant split (Train: 1554, Val: 333, Test: 334)
│   ├── preprocessing_config.json   # Standardized input dimensions (224x224x3) & normalization
│   └── class_mapping.json          # Target binary mapping (1: ASD, 2: Control)
├── training/
│   ├── saved_models/
│   │   ├── neurobehavior_25d_cnn.keras # Active 2.5D Multi-Channel CNN model
│   │   ├── neurobehavior_2d_cnn.keras  # Baseline 1-Channel 2D CNN model
│   │   ├── evaluation_results_25d.json # Test metrics on untouched 334 test subjects
│   │   └── evaluation_results.json     # Baseline comparative evaluation
│   ├── extract_multi_slices.py     # 2.5D morphometric feature extractor (Sobel + CLAHE)
│   ├── train_25d_cnn.py            # 2.5D model training pipeline
│   ├── train_2d_cnn.py             # Baseline 2D training pipeline
│   └── run_inference.py            # CLI inference tool supporting 2.5D, baseline, or both
├── reports/
│   └── generated/                  # Output directory for compiled PDF reports
├── tests/
│   ├── conftest.py                 # Pytest shared fixtures (patient, admin, auth headers)
│   ├── test_health.py              # Health check endpoint unit test
│   ├── test_mri_routes.py          # MRI upload, validation, and inference tests
│   ├── test_questionnaire_routes.py# IASQ schema, validation, and scoring tests
│   ├── test_patient_journey.py     # End-to-end 21-step patient workflow test
│   ├── test_security.py            # Security, IDOR, and role-enforcement tests
│   └── test_system_routes.py       # Support centres & admin unit tests
├── frontend/
│   ├── index.html                  # Main HTML entry with Leaflet CDN & Inter font
│   ├── vite.config.js              # Vite configuration with /api reverse proxy
│   ├── package.json                # React scripts and dependencies
│   └── src/
│       ├── index.css               # Clean healthcare blue & white theme
│       ├── main.jsx                # React DOM render entry
│       ├── App.jsx                 # Router with route guards and session management
│       ├── api/
│       │   └── client.js           # API client with automatic token injection
│       ├── components/
│       │   ├── Navbar.jsx          # Accessible navigation header with dynamic states
│       │   ├── Footer.jsx          # Academic & clinical disclaimers
│       │   └── StatusBanner.jsx    # Real-time backend connectivity banner
│       └── pages/
│           ├── LandingPage.jsx     # 1. Landing page with hero & architectural overview
│           ├── AuthPage.jsx        # 2. Login & Registration with demo personas
│           ├── DashboardPage.jsx   # 3. User dashboard with quick actions & activity
│           ├── MriAssessmentPage.jsx # 4. Structural MRI upload & 2.5D CNN inference
│           ├── QuestionnairePage.jsx# 5. 10-item verified IASQ screening form
│           ├── ResultsPage.jsx     # 6. Patient assessment history & multimodal synthesis
│           ├── ReportViewPage.jsx  # 7. Doctor-readable PDF report preview & download
│           ├── SupportCentresPage.jsx# 8. Leaflet + OpenStreetMap resource locator
│           └── AdminDashboardPage.jsx# 9. Administration metrics & subsystem audit
├── requirements.txt                # Python backend dependencies
├── .env.example                    # Template environment variables
└── README.md                       # Complete documentation and setup guide
```

---

## 4. MRI Model Validation & Architecture

### Empirical Comparison: Baseline 1-Channel vs. 2.5D Multi-Channel CNN
Both models were trained on 1,554 participants and evaluated on the exact same untouched test set ($N=334$, 159 ASD, 175 Control) under strict participant-level isolation:

| Evaluation Metric | Baseline 1-Channel 2D CNN | 2.5D Multi-Channel CNN | Relative Impact |
| :--- | :---: | :---: | :---: |
| **Input Shape** | $(224, 224, 1)$ | $(224, 224, 3)$ | $+2$ Morphometric Channels |
| **Feature Channels** | Grayscale | Normalized + Sobel Gradient + CLAHE | Cortical boundary & subcortical contrast |
| **Parameters** | 65,153 | 65,441 | Lightweight (+288 params) |
| **Validation Threshold ($\tau^*$)** | $0.550$ | $0.560$ | Calibrated on Val Set |
| **Untouched Test Accuracy** | $55.09\%$ | $53.29\%$ | Stable |
| **ASD Recall / Sensitivity** | **$22.01\%$** | **$42.77\%$** | **$+94.3\%$ relative gain (Nearly Doubled)** |
| **Control Specificity** | $85.14\%$ | $62.86\%$ | Balanced sensitivity trade-off |
| **ASD F1-Score** | **$0.3182$** | **$0.4658$** | **$+46.4\%$ relative increase** |
| **ROC-AUC** | $0.5227$ | **$0.5318$** | Improved separation |
| **Confusion Matrix ($N=334$)** | $TN=149, FP=26 \mid FN=124, TP=35$ | $TN=110, FP=65 \mid FN=91, \mathbf{TP=68}$ | **True Positives jumped from $35 \to 68$** |

### Command-Line Inference:
```powershell
# Run active 2.5D Multi-Channel CNN (Default)
py -3.11 training/run_inference.py --image "C:\Users\ankit\Downloads\ASD_MRI_Project\data\MRI ASD IMAGES\Autistic\50002.png"

# Compare 2.5D vs Baseline 1-Channel side-by-side
py -3.11 training/run_inference.py --image "C:\Users\ankit\Downloads\ASD_MRI_Project\data\MRI ASD IMAGES\Autistic\50002.png" --model both
```

---

## 5. Indian Autism Screening Questionnaire (IASQ)

- **Instrument:** Indian Autism Screening Questionnaire (IASQ-1.0).
- **Source:** Developed by NIEPID (National Institute for the Empowerment of Persons with Intellectual Disabilities) and ICMR, derived from the Indian Scale for Assessment of Autism (ISAA).
- **Format:** 10 caregiver-reported behavioral questions (Yes = 1, No = 0).
- **Age Eligibility:** 3 to 18 years.
- **Scoring Rules:**
  * **Score $\ge 2$ (Primary Clinical Cutoff):** Screen Positive. High likelihood of autism spectrum features. Strong recommendation for formal clinical evaluation using full ISAA or ADOS-2 (Sensitivity $\approx 97\%$, Specificity $\approx 92\%$).
  * **Score $= 1$ (Community Screening Cutoff):** Borderline / Mild Concern. Suggests developmental observation and routine pediatric consultation.
  * **Score $= 0$:** Screen Negative. Routine developmental follow-up.
- **Missing Answers:** All 10 questions are strictly required. Incomplete submissions are rejected.

---

## 6. How to Start the Application Locally

### Step 1: Install Dependencies
Open a PowerShell terminal in the project directory:
```powershell
cd C:\Users\ankit\.gemini\antigravity\scratch\neurobehavior-asd

# Install Python backend dependencies
py -3.11 -m pip install -r requirements.txt

# Install React frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Start the Flask Backend
```powershell
py -3.11 -m backend.app
```
*Backend runs on `http://127.0.0.1:5000`.*
*The SQLite database `neurobehavior_asd.db` is initialized and seeded automatically on first startup.*

### Step 3: Start the React Frontend
Open a second terminal window:
```powershell
cd C:\Users\ankit\.gemini\antigravity\scratch\neurobehavior-asd\frontend
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 7. Database Administration, Backup & Data Privacy

### Database Setup & Auto-Initialization
- **Database Engine:** SQLite 3 (`neurobehavior_asd.db` located at project root).
- **Auto-Initialization:** The database tables (`users`, `assessments`, `support_centres`) and initial support facilities are created automatically on first application launch via SQLAlchemy `db.create_all()`.
- **Demonstration Accounts:** Seeded automatically on startup if `SEED_DEMO_USERS=true`.

### Backup & Recovery Procedure
To create a safe snapshot of patient accounts and assessment records before demonstrations or updates:
```powershell
# 1. Create a timestamped backup copy:
Copy-Item "neurobehavior_asd.db" -Destination "neurobehavior_asd_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"

# 2. To restore from a backup:
Copy-Item "neurobehavior_asd_backup_<timestamp>.db" -Destination "neurobehavior_asd.db"
```

### Data Privacy & Retention Policy
1. **Isolated Storage:** Uploaded MRI scans (`uploads/mri/`) and compiled PDF reports (`reports/generated/`) are stored in server-managed directories outside public web roots.
2. **Access Control:** All assessment records and downloads require active authentication tokens. Direct access or attempts to access another user's records return `403 Forbidden`.
3. **No Precise GPS Tracking:** The user's coordinates are processed ephemerally in browser memory for distance sorting and are **never** stored in the database.
4. **Data Purge:** To reset all demonstration records to a clean slate, delete `neurobehavior_asd.db` and restart the backend.

---

## 8. College Project Demonstration Guide

### Quick 1-Click Launchers (Windows)
For project defense and evaluations, convenient Windows batch scripts are provided in the project root:
- `start_backend.bat`: Launches the Flask API server with Python 3.11.
- `start_frontend.bat`: Launches the React Vite frontend server.
- `run_demo.bat`: Runs the automated end-to-end command-line demonstration (`demo_walkthrough.py`).
- `run_tests.bat`: Runs all 26 integration, security, and workflow tests.

### Pre-configured Demonstration Accounts
The login page (`/login`) includes 1-click persona buttons pre-seeded with synthetic credentials:
| Persona | Email | Password | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Demo Patient** | `patient@demo.neurobehavior.org` | `password123` | Patient | Uploads brain MRI scans, takes IASQ questionnaire, downloads PDF summaries. |
| **Dr. Sarah Chen, MD** | `clinician@demo.neurobehavior.org` | `password123` | Clinician | Reviews multimodal assessments and signs clinical attestation blocks. |
| **System Admin** | `admin@demo.neurobehavior.org` | `admin123` | Administrator | Accesses `/admin` overview, system telemetry, and ABIDE audit metrics. |

### Step-by-Step Demonstration Script
1. Start the backend (`start_backend.bat`) and frontend (`start_frontend.bat`).
2. Open `http://localhost:5173` in a web browser.
3. Unauthenticated users land on the **Login / Register** page.
4. Click **"Demo Patient"** and click **"Sign In"** $\to$ Redirected to the **Patient Dashboard**.
5. Click **"New MRI Assessment"** $\to$ Upload a 2D brain MRI slice (e.g. from `training/sample_test_slice.png`) $\to$ The 2.5D Multi-Channel CNN executes real-time inference and outputs the predicted `DX_GROUP` class and confidence.
6. Click **"IASQ Screening"** $\to$ Complete the 10 standardized caregiver items $\to$ Real-time scoring calculates the score ($X/10$) and displays the clinical recommendation.
7. Click **"Support Centres"** $\to$ Demonstrates the Leaflet + OpenStreetMap resource locator. Click **"Use My Current Location"** to show distance sorting.
8. Click **"PDF Reports"** $\to$ Click **"Generate Doctor-Readable PDF"** $\to$ ReportLab compiles a clinical summary complete with physician attestation boxes and accredited clinic listings.
9. Click **"Logout"** $\to$ Token is invalidated on server; protected routes are confirmed inaccessible.

---

## 9. Controlled Deployment Evaluation

| Deployment Option | Feasibility | Privacy & Security | Cost | Recommendation |
| :--- | :---: | :---: | :---: | :--- |
| **1. Local Laptop Demonstration** | **Highest** | **Maximum (Air-gapped, zero external exposure)** | **$0** | **RECOMMENDED FOR DEFENSE.** Fully reliable, zero latency, zero cloud costs. |
| **2. Private Institutional Server** | High | High (Encapsulated on campus intranet) | Low | Suitable for campus-wide lab demonstrations via local IP (e.g., `192.168.1.x`). |
| **3. Public Cloud (AWS / Render)** | Conditional | Low/Medium (Requires strict HIPAA/DISHA compliance) | Variable | **Not recommended** at this stage without institutional IRB clearance and paid GPU tiers. |

---

## 10. Automated Testing Suite

Run the full pytest suite (covering health check, MRI inference, IASQ scoring, the complete 21-step patient journey, and all security/privacy constraints):
```powershell
py -3.11 -m pytest tests/
```
*Status: All 26 tests pass cleanly in ~18 seconds.*

---

## 11. Clinical & Ethical Disclaimers

1. **Academic Engineering Prototype:** NeuroBehavior-ASD is developed as an academic engineering project for educational and research evaluation purposes.
2. **Not a Clinical Diagnostic Device:** The platform does NOT claim clinical diagnostic accuracy and is NOT an FDA/CE-cleared medical diagnostic instrument.
3. **Multidisciplinary Mandate:** Deep learning biomarker patterns and IASQ questionnaire scores must never replace comprehensive clinical evaluation conducted by licensed developmental pediatricians, child neurologists, and clinical psychologists.
4. **No Fabricated Data:** The system strictly disallows fake predictions or arbitrary autism severity tiers.
