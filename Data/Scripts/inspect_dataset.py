import pandas as pd

file_path = r"C:\CivicFlow\Data\Raw\bmc_train.csv"

print("Loading sample of dataset...")

df = pd.read_csv(file_path, nrows=10000)

print("\n========== DATASET SHAPE (SAMPLE) ==========")
print(df.shape)

print("\n========== COLUMNS ==========")
for i, column in enumerate(df.columns, start=1):
    print(f"{i}. {column}")

print("\n========== DATA TYPES ==========")
print(df.dtypes)

print("\n========== MISSING VALUES ==========")
missing = df.isnull().sum()
print(missing[missing > 0].sort_values(ascending=False))

print("\n========== DUPLICATE ROWS ==========")
print(df.duplicated().sum())

print("\n========== FIRST 5 ROWS ==========")
print(df.head())

print("\n========== BASIC STATISTICS ==========")
print(df.describe(include="all").T)