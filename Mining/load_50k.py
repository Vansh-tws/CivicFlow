import io
import os
from pathlib import Path

import pandas as pd
import psycopg2

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "Data" / "Processed" / "bmc_deployment_50k.csv"

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise SystemExit(
        "DATABASE_URL is missing. Set your Neon connection string first."
    )

conn = psycopg2.connect(
    database_url,
    sslmode="require",
    connect_timeout=15,
)
cur = conn.cursor()

# 1. Compare the CSV with the existing table
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'civic_complaints'
    ORDER BY ordinal_position
""")
table_cols = cur.fetchall()
types = dict(table_cols)

df = pd.read_csv(CSV_PATH, low_memory=False)
print(f"CSV rows: {len(df):,}")

common = [c for c, _ in table_cols if c in df.columns]
missing_in_csv = [c for c, _ in table_cols if c not in df.columns]
extra_in_csv = [c for c in df.columns if c not in types]

print("Columns in table but NOT in CSV:", missing_in_csv or "none")
print("Columns in CSV but NOT in table:", extra_in_csv or "none")

required = ["complaint_id", "complaint_date", "ward_code",
            "complaint_category", "department_assigned"]
if [c for c in required if c not in df.columns]:
    raise SystemExit("Stopping: CSV is missing required columns. Send me its header row.")

# 2. Convert values to the types the table expects
YES_NO = {"yes": 1, "no": 0, "true": 1, "false": 0, "y": 1, "n": 0}

for c in common:
    t = types[c]
    if t in ("integer", "smallint", "bigint"):
        numeric = pd.to_numeric(df[c], errors="coerce")
        mapped = df[c].astype("string").str.strip().str.lower().map(YES_NO)
        df[c] = pd.to_numeric(numeric.fillna(mapped), errors="coerce").round().astype("Int64")
    elif t in ("numeric", "double precision", "real"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    elif t == "date" or t.startswith("timestamp"):
        df[c] = pd.to_datetime(df[c], errors="coerce").dt.date




# 3. Validate the dataset before changing the database
if len(df) != 50_000:
    raise SystemExit(f"Expected 50,000 CSV rows, found {len(df):,}. Stopping.")

if df["complaint_id"].isna().any():
    raise SystemExit("CSV contains missing complaint_id values. Stopping.")

if df["complaint_id"].duplicated().any():
    raise SystemExit("CSV contains duplicate complaint_id values. Stopping.")

if not common:
    raise SystemExit("No matching columns found between CSV and Neon table.")

# Ensure the source table is empty or already contains this exact dataset.
cur.execute("SELECT COUNT(*) FROM civic_complaints")
existing_count = cur.fetchone()[0]

if existing_count != 0:
    raise SystemExit(
        f"Neon already contains {existing_count:,} source rows. "
        "Nothing was changed. Inspect the existing data before importing."
    )

# 4. Load all matching CSV columns atomically.
# If COPY fails, the transaction is rolled back.
try:
    buf = io.StringIO()
    df[common].to_csv(buf, index=False, header=False, na_rep="\\N")
    buf.seek(0)

    cols_sql = ", ".join(f'"{c}"' for c in common)
    cur.copy_expert(
        f"COPY civic_complaints ({cols_sql}) FROM STDIN "
        "WITH (FORMAT csv, NULL '\\N')",
        buf,
    )

    cur.execute("SELECT COUNT(*) FROM civic_complaints")
    loaded_count = cur.fetchone()[0]

    if loaded_count != 50_000:
        raise RuntimeError(
            f"Expected 50,000 rows after import; found {loaded_count:,}."
        )

    conn.commit()
    print(f"SUCCESS: civic_complaints contains {loaded_count:,} rows.")

except Exception:
    conn.rollback()
    raise

finally:
    cur.close()
    conn.close()
