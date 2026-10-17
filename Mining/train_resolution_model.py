
from pathlib import Path
import json

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# --------------------------------------------------
# 1. Project paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_PATH = (
    PROJECT_ROOT
    / "Data"
    / "Processed"
    / "bmc_deployment_50k.csv"
)

MODEL_DIR = PROJECT_ROOT / "Mining" / "models"
MODEL_PATH = MODEL_DIR / "resolution_time_model.joblib"
EVALUATION_PATH = MODEL_DIR / "resolution_evaluation.json"


# --------------------------------------------------
# 2. Features available at complaint submission
# --------------------------------------------------

NUMERIC_FEATURES = [
    "year",
    "month",
    "is_monsoon_season",
    "ward_slum_percentage",
    "prior_complaints_count",
    "infrastructure_age_years",
    "months_since_last_maintained",
]

CATEGORICAL_FEATURES = [
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

TARGET = "resolution_days"


# --------------------------------------------------
# 3. Load and validate dataset
# --------------------------------------------------

def main():
    print("Loading CivicFlow 50k dataset...")

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}"
        )

    df = pd.read_csv(DATA_PATH, low_memory=False)

    required = (
        NUMERIC_FEATURES
        + CATEGORICAL_FEATURES
        + [TARGET]
    )

    missing = [col for col in required if col not in df.columns]

    if missing:
        raise ValueError(f"Missing columns: {missing}")

    # Convert numeric-looking text columns to numeric.
    for col in NUMERIC_FEATURES + [TARGET]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=[TARGET]).copy()
    df = df[df[TARGET] > 0].copy()

    # Ensure numeric features are correctly typed.
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES].copy()
    y = df[TARGET].copy()

    for col in NUMERIC_FEATURES:
        X[col] = pd.to_numeric(X[col], errors="coerce")

    # Treat categorical values as text.
    for col in CATEGORICAL_FEATURES:
        X[col] = X[col].astype("string")

    print(f"Rows used: {len(df):,}")
    print(f"Average resolution time: {y.mean():.2f} days")
    print(f"Median resolution time: {y.median():.2f} days")

    # --------------------------------------------------
    # 4. Split into training and testing sets
    # --------------------------------------------------

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
    )

    print(f"Training rows: {len(X_train):,}")
    print(f"Testing rows: {len(X_test):,}")

    # --------------------------------------------------
    # 5. Preprocessing
    # --------------------------------------------------

    numeric_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median"),
            )
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="most_frequent"),
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=True,
                ),
            ),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numeric",
                numeric_pipeline,
                NUMERIC_FEATURES,
            ),
            (
                "categorical",
                categorical_pipeline,
                CATEGORICAL_FEATURES,
            ),
        ]
    )

    # --------------------------------------------------
    # 6. Build the regression model
    # --------------------------------------------------

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=50,
                    max_depth=20,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=2,
                ),
            ),
        ]
    )

    # --------------------------------------------------
    # 7. Train
    # --------------------------------------------------

    print("\nTraining resolution-time regression model...")
    model.fit(X_train, y_train)
    print("Training completed!")

    # --------------------------------------------------
    # 8. Evaluate
    # --------------------------------------------------

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    rmse = mean_squared_error(y_test, predictions) ** 0.5
    r2 = r2_score(y_test, predictions)

    evaluation = {
        "dataset": DATA_PATH.name,
        "rows_used": int(len(df)),
        "training_rows": int(len(X_train)),
        "testing_rows": int(len(X_test)),
        "target": TARGET,
        "features": NUMERIC_FEATURES + CATEGORICAL_FEATURES,
        "baseline_median_days": float(y_train.median()),
        "mae_days": float(mae),
        "rmse_days": float(rmse),
        "r2_score": float(r2),
        "important_note": (
            "Only features intended to be available at submission "
            "are included. Verify department and contractor fields "
            "are available at the actual prediction time."
        ),
    }

    print("\n--- Evaluation Results ---")
    print(f"MAE : {mae:.2f} days")
    print(f"RMSE: {rmse:.2f} days")
    print(f"R²  : {r2:.4f}")
    print(
        f"Median-baseline MAE reference: "
        f"{mean_absolute_error(y_test, [y_train.median()] * len(y_test)):.2f} days"
    )

    # --------------------------------------------------
    # 9. Save model and metrics
    # --------------------------------------------------

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, MODEL_PATH)

    with open(
        EVALUATION_PATH,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(evaluation, file, indent=4)

    print("\n--- Saved Successfully ---")
    print(f"Model: {MODEL_PATH}")
    print(f"Evaluation: {EVALUATION_PATH}")


if __name__ == "__main__":
    main()
