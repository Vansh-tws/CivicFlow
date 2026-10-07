import pandas as pd

FILE = r"C:\CivicFlow\Data\Cleaned\bmc_cleaned.csv"

print("Loading cleaned dataset...")

df = pd.read_csv(FILE)

print("\n========== BASIC INFO ==========")
print("Rows:", len(df))
print("Columns:", len(df.columns))

print("\n========== SEVERITY ==========")
print(df["severity"].value_counts())

print("\n========== COMPLAINT CATEGORIES ==========")
print(df["complaint_category"].value_counts())

print("\n========== COMPLAINT STATUS ==========")
print(df["complaint_status"].value_counts())

print("\n========== WARDS ==========")
print(df["ward_code"].nunique(), "unique wards")

print("\n========== RESOLUTION DAYS ==========")
print(df["resolution_days"].describe())

print("\n========== ESTIMATED COST ==========")
print(df["estimated_cost_inr"].describe())

print("\n========== NEGATIVE VALUES ==========")

numeric_columns = [
    "resolution_days",
    "num_reassignments",
    "prior_complaints_count",
    "estimated_cost_inr",
    "infrastructure_age_years",
    "months_since_last_maintained"
]

for column in numeric_columns:
    negative_count = (df[column] < 0).sum()
    print(f"{column}: {negative_count}")

print("\n========== CITIZEN SATISFACTION ==========")
print(df["citizen_satisfied"].value_counts())

print("\n========== VALIDATION COMPLETE ==========")