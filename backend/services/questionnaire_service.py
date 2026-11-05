"""Questionnaire Assessment Service: Indian Autism Screening Questionnaire (IASQ).

Implements the official 10-item Indian Autism Screening Questionnaire (IASQ),
derived from the Indian Scale for Assessment of Autism (ISAA) by NIEPID / ICMR.

Standards:
- Fully independent of MRI deep learning model pipeline.
- Age eligibility: 3 to 18 years.
- 10 caregiver-report items (Yes / No).
- Strict missing-answer validation (all 10 items required).
- Documented cutoffs:
  * Cutoff >= 2: Primary clinical screening positive (Sens ~97%, Spec ~92%).
  * Cutoff >= 1: Community screening threshold (Sens ~97-99%, Spec ~62-81%).
  * Score 0: Screen negative.
- Authoritative reference: Mukherjee et al., Indian Autism Screening Questionnaire.
"""
import json
from typing import Dict, Any, Optional, List
from backend.models.assessment import Assessment
from backend.extensions import db


class QuestionnaireService:
    """Service managing IASQ behavioral assessment administration and scoring."""

    # 10 Standardized IASQ Questions with Kannada Translations
    IASQ_ITEMS = [
        {
            "id": "iasq_1",
            "number": 1,
            "domain": "Social Interaction (ಸಾಮಾಜಿಕ ಸಂವಹನ)",
            "title": "Eye Contact (ಕಣ್ಣಿನ ಸಂಪರ್ಕ)",
            "question": "Does the person have poor eye contact (does not look into the eyes when speaking or being spoken to)? (ವ್ಯಕ್ತಿಯು ಕಣ್ಣಿನ ಸಂಪರ್ಕವನ್ನು ಸರಿಯಾಗಿ ಮಾಡುವುದಿಲ್ಲವೇ - ಮಾತನಾಡುವಾಗ ಅಥವಾ ಇತರರು ಮಾತನಾಡುವಾಗ ಕಣ್ಣಲ್ಲಿ ಕಣ್ಣಿಟ್ಟು ನೋಡುವುದಿಲ್ಲವೇ?)",
        },
        {
            "id": "iasq_2",
            "number": 2,
            "domain": "Social Interaction (ಸಾಮಾಜಿಕ ಸಂವಹನ)",
            "title": "Social Smile (ಸಾಮಾಜಿಕ ನಗು)",
            "question": "Does the person lack a social smile (does not smile back or socially in response to others)? (ವ್ಯಕ್ತಿಯಲ್ಲಿ ಸಾಮಾಜಿಕ ನಗುವಿನ ಕೊರತೆಯಿದೆಯೇ - ಇತರರು ನಕ್ಕಾಗ ಪ್ರತಿಯಾಗಿ ನಗುವುದಿಲ್ಲವೇ ಅಥವಾ ಸಾಮಾಜಿಕವಾಗಿ ಸ್ಪಂದಿಸುವುದಿಲ್ಲವೇ?)",
        },
        {
            "id": "iasq_3",
            "number": 3,
            "domain": "Social Interaction (ಸಾಮಾಜಿಕ ಸಂವಹನ)",
            "title": "Aloofness (ಏಕಾಂಗಿತನ / ಪ್ರತ್ಯೇಕವಾಗಿರುವುದು)",
            "question": "Does the person remain aloof, detached, or prefer to stay alone rather than mingle with others? (ವ್ಯಕ್ತಿಯು ಇತರರೊಂದಿಗೆ ಬೆರೆಯದೆ ದೂರವಿರುತ್ತಾರೆಯೇ, ಪ್ರತ್ಯೇಕವಾಗಿರಲು ಅಥವಾ ಒಂಟಿಯಾಗಿರಲು ಇಷ್ಟಪಡುತ್ತಾರೆಯೇ?)",
        },
        {
            "id": "iasq_4",
            "number": 4,
            "domain": "Social Interaction (ಸಾಮಾಜಿಕ ಸಂವಹನ)",
            "title": "Shared Enjoyment (ಸಂತೋಷವನ್ನು ಹಂಚಿಕೊಳ್ಳುವುದು)",
            "question": "Does the person fail to reach out to others or show a lack of shared enjoyment? (ವ್ಯಕ್ತಿಯು ಇತರರೊಂದಿಗೆ ಸಂಪರ್ಕ ಸಾಧಿಸಲು ವಿಫಲರಾಗುತ್ತಾರೆಯೇ ಅಥವಾ ಸಂತೋಷವನ್ನು ಇತರರೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳುವ ಕೊರತೆಯನ್ನು ತೋರಿಸುತ್ತಾರೆಯೇ?)",
        },
        {
            "id": "iasq_5",
            "number": 5,
            "domain": "Social Relationships (ಸಾಮಾಜಿಕ ಸಂಬಂಧಗಳು)",
            "title": "Relating to People (ಜನರೊಂದಿಗೆ ಸಂಬಂಧ ಬೆಳೆಸುವುದು)",
            "question": "Is the person unable to relate to people or form friendships appropriate to their age? (ವ್ಯಕ್ತಿಯು ಜನರೊಂದಿಗೆ ಸಂಬಂಧ ಬೆಳೆಸಲು ಅಥವಾ ತಮ್ಮ ವಯಸ್ಸಿಗೆ ತಕ್ಕಂತೆ ಸ್ನೇಹ ಬೆಳೆಸಲು ಅಸಮರ್ಥರಾಗಿದ್ದಾರೆಯೇ?)",
        },
        {
            "id": "iasq_6",
            "number": 6,
            "domain": "Behavioral Patterns (ನಡವಳಿಕೆಯ ಮಾದರಿಗಳು)",
            "title": "Repetitive Play (ಪುನರಾವರ್ತಿತ ಆಟ)",
            "question": "Does the person engage in repetitive play or prefer isolated, rigid play patterns? (ವ್ಯಕ್ತಿಯು ಪುನರಾವರ್ತಿತ ಆಟಗಳಲ್ಲಿ ತೊಡಗುತ್ತಾರೆಯೇ ಅಥವಾ ಪ್ರತ್ಯೇಕವಾದ, ಕಟ್ಟುನಿಟ್ಟಾದ ಆಟದ ವಿಧಾನಗಳನ್ನು ಇಷ್ಟಪಡುತ್ತಾರೆಯೇ?)",
        },
        {
            "id": "iasq_7",
            "number": 7,
            "domain": "Communication (ಮಾತು ಮತ್ತು ಸಂವಹನ)",
            "title": "Speech & Communication (ಮಾತು ಮತ್ತು ಸಂವಹನ)",
            "question": "Does the person have significant delays or abnormalities in speech/communication (such as repeating words out of context / echolalia or difficulty using functional words)? (ವ್ಯಕ್ತಿಗೆ ಮಾತು/ಸಂವಹನದಲ್ಲಿ ಗಮನಾರ್ಹ ವಿಳಂಬ ಅಥವಾ ಅಸಹಜತೆಗಳಿವೆಯೇ - ಉದಾಹರಣೆಗೆ ಪದಗಳನ್ನು ಅಸಂದರ್ಭಿಕವಾಗಿ ಪುನರಾವರ್ತಿಸುವುದು ಅಥವಾ ಅಗತ್ಯ ಪದಗಳನ್ನು ಬಳಸಲು ಕಷ್ಟಪಡುವುದು?)",
        },
        {
            "id": "iasq_8",
            "number": 8,
            "domain": "Behavioral Patterns (ನಡವಳಿಕೆಯ ಮಾದರಿಗಳು)",
            "title": "Motor Mannerisms (ದೈಹಿಕ ಚಲನೆಗಳ ಪುನರಾವರ್ತನೆ)",
            "question": "Does the person engage in repetitive motor movements or self-stimulatory behaviors (such as hand-flapping, body rocking, or spinning objects)? (ವ್ಯಕ್ತಿಯು ಪುನರಾವರ್ತಿತ ದೈಹಿಕ ಚಲನೆಗಳು ಅಥವಾ ಸ್ವಯಂ-ಉತ್ತೇಜಕ ನಡವಳಿಕೆಗಳಲ್ಲಿ ತೊಡಗುತ್ತಾರೆಯೇ - ಉದಾಹರಣೆಗೆ ಕೈಗಳನ್ನು ಬೀಸುವುದು, ದೇಹವನ್ನು ತೂಗಾಡುವುದು ಅಥವಾ ವಸ್ತುಗಳನ್ನು ತಿರುಗಿಸುವುದು?)",
        },
        {
            "id": "iasq_9",
            "number": 9,
            "domain": "Behavioral Patterns (ನಡವಳಿಕೆಯ ಮಾದರಿಗಳು)",
            "title": "Object Attachment (ವಸ್ತುಗಳ ಮೇಲಿನ ಅತಿಯಾದ ಆಸಕ್ತಿ)",
            "question": "Does the person show an unusual, intense attachment to inanimate objects? (ವ್ಯಕ್ತಿಯು ನಿರ್ಜೀವ ವಸ್ತುಗಳ ಮೇಲೆ ಅಸಾಮಾನ್ಯ, ತೀವ್ರವಾದ ಬಾಂಧವ್ಯ ಅಥವಾ ಆಸಕ್ತಿಯನ್ನು ತೋರಿಸುತ್ತಾರೆಯೇ?)",
        },
        {
            "id": "iasq_10",
            "number": 10,
            "domain": "Sensory Processing (ಇಂದ್ರಿಯ ಸಂಸ್ಕರಣೆ)",
            "title": "Sensory Sensitivities (ಇಂದ್ರಿಯ ಸೂಕ್ಷ್ಮತೆಗಳು)",
            "question": "Does the person respond to objects or sensory inputs unusually (such as excessively smelling, touching, tasting, or showing extreme sensitivity to everyday sounds or touch)? (ವ್ಯಕ್ತಿಯು ವಸ್ತುಗಳು ಅಥವಾ ಇಂದ್ರಿಯ ಸಂವೇದನೆಗಳಿಗೆ ಅಸಾಮಾನ್ಯವಾಗಿ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತಾರೆಯೇ - ಉದಾಹರಣೆಗೆ ಅತಿಯಾಗಿ ಮೂಸಿನೋಡುವುದು, ಮುಟ್ಟುವುದು, ರುಚಿ ನೋಡುವುದು ಅಥವಾ ದೈನಂದಿನ ಶಬ್ದಗಳು/ಸ್ಪರ್ಶಕ್ಕೆ ತೀವ್ರ ಸೂಕ್ಷ್ಮತೆ ತೋರಿಸುವುದು?)",
        },
    ]

    @classmethod
    def get_questionnaire_schema(cls) -> Dict[str, Any]:
        """Return the verified IASQ specification and items."""
        return {
            "instrument_name": "Indian Autism Screening Questionnaire (IASQ)",
            "instrument_version": "IASQ-1.0 (Standard 10-Item Caregiver Report)",
            "derived_from": "Indian Scale for Assessment of Autism (ISAA) / NIEPID & ICMR",
            "target_population": "Children and adolescents aged 3 to 18 years",
            "status": "Verified Standardized Instrument",
            "independent_from_mri": True,
            "item_count": len(cls.IASQ_ITEMS),
            "scoring_rules": {
                "response_type": "Binary (Yes = 1 point, No = 0 points)",
                "total_score_range": [0, 10],
                "primary_clinical_cutoff": 2,
                "community_screening_cutoff": 1,
                "missing_answer_policy": "All 10 items must be answered. Incomplete submissions are rejected.",
            },
            "interpretation_guidelines": {
                "cutoff_ge_2": "Screen Positive (Primary Clinical Cutoff): High likelihood of ASD characteristics. Recommend multidisciplinary evaluation (ISAA / ADOS-2). Sensitivity ~97%, Specificity ~92%.",
                "cutoff_eq_1": "Borderline / Mild Concern: High-sensitivity community screening trigger. Suggest developmental observation and clinical consult.",
                "cutoff_eq_0": "Screen Negative: Low probability of autism features on initial screening. Routine developmental monitoring.",
            },
            "items": cls.IASQ_ITEMS,
        }

    @classmethod
    def score_iasq(cls, responses: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and score the 10 IASQ items.
        
        Raises ValueError if any required item is missing or invalid.
        """
        item_ids = [item["id"] for item in cls.IASQ_ITEMS]
        missing = [iid for iid in item_ids if iid not in responses or responses[iid] is None]
        if missing:
            raise ValueError(f"Incomplete assessment: {len(missing)} item(s) unanswered ({', '.join(missing)}). All 10 items must be completed.")

        total_score = 0
        detailed_scores = {}

        for item in cls.IASQ_ITEMS:
            val = responses[item["id"]]
            # Allow boolean, int, or string 'yes'/'no'
            is_yes = False
            if isinstance(val, bool):
                is_yes = val
            elif isinstance(val, (int, float)):
                is_yes = (val == 1)
            elif isinstance(val, str):
                is_yes = val.strip().lower() in ["yes", "true", "1"]

            points = 1 if is_yes else 0
            total_score += points
            detailed_scores[item["id"]] = {
                "number": item["number"],
                "title": item["title"],
                "domain": item["domain"],
                "response": "Yes" if is_yes else "No",
                "points": points,
            }

        # Apply standardized clinical cutoffs
        if total_score >= 2:
            status = "Screen Positive (Clinical Threshold Met)"
            clinical_recommendation = (
                "Score meets or exceeds the primary clinical screening cutoff (Score >= 2). "
                "There is an elevated likelihood of autism spectrum features. "
                "A formal multidisciplinary evaluation by a developmental pediatrician or clinical psychologist "
                "using the full ISAA or ADOS-2 is strongly recommended."
            )
            risk_tier = "High Risk / Screen Positive"
            dx_indication = 1  # Corresponds to clinical referral indication
        elif total_score == 1:
            status = "Borderline / Mild Behavioral Concern"
            clinical_recommendation = (
                "Score triggers the high-sensitivity community threshold (Score = 1). "
                "Mild behavioral concerns were flagged. Continued developmental monitoring and a routine pediatric consultation "
                "are suggested if parental concerns persist."
            )
            risk_tier = "Borderline / Low-to-Moderate Concern"
            dx_indication = 0
        else:
            status = "Screen Negative"
            clinical_recommendation = (
                "No autism behavioral risk factors flagged on this screening (Score = 0). "
                "Routine developmental follow-up is recommended."
            )
            risk_tier = "Low Risk / Screen Negative"
            dx_indication = 2

        return {
            "total_score": total_score,
            "max_score": 10,
            "screen_status": status,
            "risk_tier": risk_tier,
            "dx_indication": dx_indication,
            "clinical_recommendation": clinical_recommendation,
            "detailed_scores": detailed_scores,
            "instrument": "IASQ-1.0",
        }

    @classmethod
    def submit_iasq_assessment(cls, data: Dict[str, Any], user_id: Optional[int] = None) -> Dict[str, Any]:
        """Validate, score, and persist an IASQ assessment without fabricating diagnostics."""
        raw_responses = data.get("responses", {})
        informant = data.get("informant_relationship", "Parent / Guardian")
        age_str = str(data.get("subject_age", "")).strip()
        notes = data.get("clinical_concerns", "")

        # Age eligibility verification (3 to 18 years)
        age_warning = None
        try:
            age_val = float(age_str)
            if age_val < 3 or age_val > 18:
                age_warning = f"Note: IASQ is standardized for children aged 3 to 18 years. Subject age is {age_val}."
        except (ValueError, TypeError):
            if not age_str:
                raise ValueError("Subject age is required for IASQ administration.")

        # Score the IASQ
        score_result = cls.score_iasq(raw_responses)

        stored_notes = (
            f"IASQ Score: {score_result['total_score']}/10 ({score_result['screen_status']}) | "
            f"Informant: {informant} | Age: {age_str}."
        )
        if age_warning:
            stored_notes += f" {age_warning}"
        if notes:
            stored_notes += f" Concerns: {notes}"

        assessment = Assessment(
            user_id=user_id,
            assessment_type="questionnaire",
            status="evaluated_iasq",
            questionnaire_version="IASQ-1.0 (NIEPID / ISAA Standard)",
            questionnaire_responses=json.dumps({
                "responses": raw_responses,
                "score_result": score_result,
                "informant": informant,
                "subject_age": age_str,
                "age_warning": age_warning,
            }),
            model_version="IASQ-1.0 (Independent Behavioral Scoring)",
            model_inference_status=score_result["screen_status"],
            predicted_dx_group=1 if score_result["total_score"] >= 2 else 2,
            prediction_confidence=round(score_result["total_score"] / 10.0, 4),
            clinical_disclaimer_accepted=True,
            notes=stored_notes,
        )
        db.session.add(assessment)
        db.session.commit()

        return {
            "success": True,
            "assessment_id": assessment.id,
            "assessment_type": "questionnaire",
            "instrument": "IASQ-1.0",
            "score": score_result["total_score"],
            "max_score": 10,
            "screen_status": score_result["screen_status"],
            "risk_tier": score_result["risk_tier"],
            "clinical_recommendation": score_result["clinical_recommendation"],
            "age_warning": age_warning,
            "detailed_scores": score_result["detailed_scores"],
            "independent_from_mri": True,
            "clinical_disclaimer": (
                "The Indian Autism Screening Questionnaire (IASQ) is a screening tool, not a diagnostic confirmation. "
                "A positive screen indicates a need for comprehensive evaluation by a qualified specialist."
            ),
        }
