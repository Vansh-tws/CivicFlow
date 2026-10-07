import pandas as pd
import os

INPUT_FILE = r"C:\CivicFlow\Data\Raw\bmc_train.csv"
OUTPUT_FILE = r"C:\CivicFlow\Data\Cleaned\bmc_cleaned.csv"

print("Starting CivicFlow data cleaning...")

# Read dataset
df = pd.read_csv(INPUT_FILE)

print(f"Original rows: {len(df):,}")
print(f"Original columns: {len(df.columns)}")

# --------------------------------------------------
# 1. Remove exact duplicate rows
# --------------------------------------------------

before = len(df)

df = df.drop_duplicates()

print(f"Duplicate rows removed: {before - len(df):,}")

# --------------------------------------------------
# 2. Remove duplicate complaint IDs
# --------------------------------------------------

before = len(df)

df = df.drop_duplicates(subset=["complaint_id"])

print(f"Duplicate complaint IDs removed: {before - len(df):,}")

# --------------------------------------------------
# 3. Convert complaint date
# --------------------------------------------------

df["complaint_date"] = pd.to_datetime(
    df["complaint_date"],
    errors="coerce"
)

# --------------------------------------------------
# 4. Clean text columns
# --------------------------------------------------

text_columns = df.select_dtypes(include=["object"]).columns

for column in text_columns:
    df[column] = df[column].astype(str).str.strip()

# --------------------------------------------------
# 5. Validate numeric columns
# --------------------------------------------------

numeric_columns = [
    "year",
    "month",
    "ward_slum_percentage",
    "prior_complaints_count",
    "resolution_days",
    "num_reassignments",
    "estimated_cost_inr",
    "infrastructure_age_years",
    "months_since_last_maintained"
]

for column in numeric_columns:
    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )

# --------------------------------------------------
# 6. Create useful derived fields
# --------------------------------------------------

df["resolution_category"] = pd.cut(
    df["resolution_days"],
    bins=[-1, 3, 7, 15, 30, float("inf")],
    labels=[
        "Very Fast",
        "Fast",
        "Moderate",
        "Slow",
        "Very Slow"
    ]
)

df["complaint_year_month"] = (
    df["complaint_date"].dt.to_period("M").astype(str)
)

df["high_priority"] = df["severity"].isin(
    ["High", "Critical"]
).astype(int)

# --------------------------------------------------
# 7. Handle missing values created by conversion
# --------------------------------------------------

print("\nMissing values after cleaning:")
print(df.isna().sum()[df.isna().sum() > 0])

# Remove rows where essential fields became invalid
df = df.dropna(
    subset=[
        "complaint_id",
        "complaint_date",
        "complaint_category",
        "ward_code",
        "severity"
    ]
)

# --------------------------------------------------
# 8. Save cleaned dataset
# --------------------------------------------------

os.makedirs(
    os.path.dirname(OUTPUT_FILE),
    exist_ok=True
)

df.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\n========== CLEANING COMPLETE ==========")
print(f"Final rows: {len(df):,}")
print(f"Final columns: {len(df.columns)}")
print(f"Saved to: {OUTPUT_FILE}")