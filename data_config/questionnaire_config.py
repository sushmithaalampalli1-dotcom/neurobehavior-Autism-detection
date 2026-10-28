"""Questionnaire and Behavioral Intake Configuration.

Project: NeuroBehavior-ASD
Policy:
- Behavioral module is strictly independent from MRI model.
- No invented questions, thresholds, scores, or results.
- Specifications outline verified standardized candidate instruments pending official confirmation.
"""

QUESTIONNAIRE_CONFIG = {
    "module_name": "NeuroBehavior Behavioral Feature Intake",
    "status": "Awaiting Verified Clinical Instrument",
    "independent_from_mri": True,

    # Clinical instruments under consideration for final integration:
    "candidate_instruments": {
        "AQ_10": {
            "title": "Autism Spectrum Quotient - 10 Items",
            "developer": "Allison, Auyeung, & Baron-Cohen (2012)",
            "target_population": "Adults / Adolescents (Age 16+)",
            "num_items": 10,
            "verification_status": "Pending confirmation of scoring license and clinical rubric",
        },
        "M_CHAT_R": {
            "title": "Modified Checklist for Autism in Toddlers, Revised with Follow-Up (M-CHAT-R/F)",
            "developer": "Robins, Fein, & Barton (2009)",
            "target_population": "Toddlers (16-30 months)",
            "num_items": 20,
            "verification_status": "Pending confirmation of screening protocol",
        },
        "SRS_2": {
            "title": "Social Responsiveness Scale, Second Edition (SRS-2)",
            "developer": "Constantino & Gruber (2012)",
            "target_population": "Ages 2.5 through adulthood",
            "verification_status": "Requires commercial psychological assessment licensing",
        },
    },

    # Demographic and Informant Context Intake
    "intake_fields": [
        {
            "id": "subject_age",
            "label": "Subject Age (Years or Months)",
            "type": "text",
            "placeholder": "e.g., 8 years, or 32 months",
            "required": True,
        },
        {
            "id": "informant_relationship",
            "label": "Informant Relationship to Subject",
            "type": "select",
            "options": ["Self", "Parent / Legal Guardian", "Caregiver", "Clinical Psychologist / Counselor"],
            "required": True,
        },
        {
            "id": "primary_concerns",
            "label": "Primary Behavioral Concerns (Communication, Social Interaction, Repetitive Behaviors)",
            "type": "textarea",
            "placeholder": "Describe any observed challenges in eye contact, verbal communication, sensory sensitivities, or peer engagement.",
            "required": False,
        },
    ],

    # Scoring and Threshold Policy
    "scoring_rules": {
        "active": False,
        "policy_statement": (
            "Automated scoring calculations and clinical risk cutoffs are withheld "
            "until the exact standardized assessment instrument and published normative scoring rules "
            "are approved and licensed for this project. No simulated scores will be presented."
        ),
    },
}
