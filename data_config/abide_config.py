"""ABIDE I and ABIDE II Dataset Configuration and Target Specifications.

Project: NeuroBehavior-ASD
Classification Objective: Binary Classification (ASD vs. Typical Control)
"""

ABIDE_CONFIG = {
    "datasets": {
        "ABIDE_I": {
            "name": "Autism Brain Imaging Data Exchange I",
            "release_year": 2012,
            "sites_count": 17,
            "total_subjects": 1112,
            "modalities": ["T1w Structural MRI", "Resting-state fMRI"],
            "url": "https://fcon_1000.projects.nitrc.org/indi/abide/abide_I.html",
        },
        "ABIDE_II": {
            "name": "Autism Brain Imaging Data Exchange II",
            "release_year": 2016,
            "sites_count": 19,
            "total_subjects": 1114,
            "modalities": ["T1w Structural MRI", "Resting-state fMRI", "DTI"],
            "url": "https://fcon_1000.projects.nitrc.org/indi/abide/abide_II.html",
        },
    },

    # Target Diagnostic Variable
    "target_label": "DX_GROUP",
    "classes": {
        1: {
            "name": "Autism Spectrum Disorder (ASD)",
            "short_code": "ASD",
            "binary_index": 1,
            "clinical_notes": "Participants diagnosed with Autism, Asperger's Syndrome, or PDD-NOS per DSM-IV-TR criteria."
        },
        2: {
            "name": "Non-Autism / Typical Control (TC)",
            "short_code": "Control",
            "binary_index": 0,
            "clinical_notes": "Neurotypical control subjects with no history of major neurological or psychiatric conditions."
        }
    },

    # Severity Policy:
    # "Severity prediction (Mild/Moderate/Severe) should only be added if suitable,
    # clinically meaningful severity labels are available and the model can be properly evaluated.
    # Otherwise, support ASD vs Control only."
    "severity_policy": {
        "support_severity_multiclass": False,
        "reason": (
            "Clinical severity instruments (e.g. ADOS CSS) are available only for a subset of ASD subjects "
            "and vary across ABIDE collection sites. In accordance with clinical validation requirements, "
            "the system restricts automated classification to ASD vs Control until a validated severity model is verified."
        ),
        "allowed_severity_levels": None,
    },

    # Key Phenotypic Variables in ABIDE CSV files
    "phenotypic_columns": [
        "SITE_ID",
        "SUB_ID",
        "DX_GROUP",
        "AGE_AT_SCAN",
        "SEX",  # 1 = Male, 2 = Female
        "HANDEDNESS_CATEGORY",
        "FIQ",  # Full Scale IQ
        "VIQ",  # Verbal IQ
        "PIQ",  # Performance IQ
        "ADOS_TOTAL",
        "ADI_R_SOCIAL_TOTAL_A",
    ],

    # Standard Preprocessing Target Shape
    "mri_target_dimensions": (128, 128, 128),
    "mri_target_voxel_spacing_mm": (1.5, 1.5, 1.5),
}
