from pathlib import Path
import json
import sys

import joblib
import pandas as pd


# =====================================================
# PROJECT PATHS
# =====================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    PROJECT_ROOT
    / "Mining"
    / "models"
    / "resolution_time_model.joblib"
)


# =====================================================
# FEATURES USED BY THE TRAINED MODEL
# Keep these names aligned with train_resolution_model.py
# =====================================================

FEATURE_COLUMNS = [
    "year",
    "month",
    "is_monsoon_season",
    "ward_slum_percentage",
    "prior_complaints_count",
    "infrastructure_age_years",
    "months_since_last_maintained",
    "complaint_category",
    "complaint_channel",
    "ward_code",
    "zone",
    "ward_type",
    "population_density",
    "complaint_time_of_day",
    "has_photo_evidence",
    "has_gps_location",
    "complainant_type",
    "property_type",
    "repeat_complainant",
    "department_assigned",
    "contractor_category",
]


# =====================================================
# PREDICT RESOLUTION TIME
# =====================================================

def predict_resolution_days(complaint):

    if not isinstance(complaint, dict):
        raise ValueError(
            "Complaint details must be a JSON object."
        )

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained model not found: {MODEL_PATH}"
        )

    missing_features = [
        column
        for column in FEATURE_COLUMNS
        if column not in complaint
        or complaint[column] is None
        or complaint[column] == ""
    ]

    if missing_features:
        raise ValueError(
            "Missing required features: "
            + ", ".join(missing_features)
        )

    # Load the previously trained model.
    model = joblib.load(MODEL_PATH)

    # Prepare the input using the training feature names.
    row = {
        column: complaint[column]
        for column in FEATURE_COLUMNS
    }

    input_data = pd.DataFrame([row])

    # Generate the prediction.
    prediction = float(
        model.predict(input_data)[0]
    )

    if not pd.notna(prediction):
        raise ValueError(
            "The model returned an invalid prediction."
        )

    # Resolution time cannot be negative.
    prediction = max(0.0, prediction)

    return round(prediction, 1)


# =====================================================
# COMMAND-LINE INTERFACE FOR NODE.JS
# =====================================================

if __name__ == "__main__":

    try:

        # Node.js passes the complaint JSON as an argument.
        if len(sys.argv) > 1:

            complaint = json.loads(sys.argv[1])

            estimated_days = predict_resolution_days(
                complaint
            )

            # Output JSON only so Node.js can parse it.
            print(
                json.dumps({
                    "estimated_resolution_days":
                        estimated_days
                })
            )

        else:

            # Sample input for a direct Python test.
            sample_complaint = {
                "year": 2025,
                "month": 7,
                "is_monsoon_season": 1,
                "ward_slum_percentage": 20,
                "prior_complaints_count": 3,
                "infrastructure_age_years": 10,
                "months_since_last_maintained": 6,
                "complaint_category":
                    "Pothole/Road Damage",
                "complaint_channel": "MyBMC App",
                "ward_code": "A",
                "zone": "Island City",
                "ward_type": "Residential",
                "population_density": "High",
                "complaint_time_of_day": "Morning",
                "has_photo_evidence": "Yes",
                "has_gps_location": "Yes",
                "complainant_type": "Individual",
                "property_type": "Road",
                "repeat_complainant": "No",
                "department_assigned": "Roads",
                "contractor_category": "Municipal",
            }

            estimated_days = predict_resolution_days(
                sample_complaint
            )

            print(
                f"Estimated resolution time: "
                f"{estimated_days} days"
            )

    except Exception as error:

        # Errors go to stderr, not stdout.
        print(
            json.dumps({
                "error": str(error)
            }),
            file=sys.stderr
        )

        sys.exit(1)