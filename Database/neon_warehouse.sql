
BEGIN;

CREATE TABLE IF NOT EXISTS dim_date (
    date_key INTEGER PRIMARY KEY,
    full_date DATE UNIQUE NOT NULL,
    day INTEGER,
    month INTEGER,
    month_name VARCHAR(20),
    quarter INTEGER,
    year INTEGER,
    is_monsoon_season INTEGER
);

CREATE TABLE IF NOT EXISTS dim_ward (
    ward_key SERIAL PRIMARY KEY,
    ward_code VARCHAR(10) UNIQUE NOT NULL,
    ward_area VARCHAR(100),
    zone VARCHAR(30),
    ward_type VARCHAR(30),
    population_density VARCHAR(30),
    ward_slum_percentage NUMERIC
);

CREATE TABLE IF NOT EXISTS dim_category (
    category_key SERIAL PRIMARY KEY,
    complaint_category VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_department (
    department_key SERIAL PRIMARY KEY,
    department_assigned VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS fact_complaints (
    fact_id BIGSERIAL PRIMARY KEY,
    complaint_id VARCHAR(50) UNIQUE NOT NULL,
    date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
    ward_key INTEGER NOT NULL REFERENCES dim_ward(ward_key),
    category_key INTEGER NOT NULL REFERENCES dim_category(category_key),
    department_key INTEGER NOT NULL REFERENCES dim_department(department_key),
    severity VARCHAR(20),
    complaint_channel VARCHAR(50),
    complaint_status VARCHAR(50),
    complaint_time_of_day VARCHAR(30),
    property_type VARCHAR(50),
    complainant_type VARCHAR(50),
    has_photo_evidence INTEGER,
    has_gps_location INTEGER,
    media_attention INTEGER,
    politically_sensitive INTEGER,
    repeat_complainant INTEGER,
    site_inspected INTEGER,
    defect_liability_claim INTEGER,
    prior_complaints_count INTEGER,
    resolution_days INTEGER,
    num_reassignments INTEGER,
    estimated_cost_inr NUMERIC,
    infrastructure_age_years INTEGER,
    months_since_last_maintained INTEGER,
    citizen_satisfied INTEGER,
    complaint_count INTEGER DEFAULT 1
);

INSERT INTO dim_date (
    date_key, full_date, day, month, month_name,
    quarter, year, is_monsoon_season
)
SELECT DISTINCT
    TO_CHAR(complaint_date, 'YYYYMMDD')::INTEGER,
    complaint_date,
    EXTRACT(DAY FROM complaint_date)::INTEGER,
    EXTRACT(MONTH FROM complaint_date)::INTEGER,
    TRIM(TO_CHAR(complaint_date, 'Month')),
    EXTRACT(QUARTER FROM complaint_date)::INTEGER,
    EXTRACT(YEAR FROM complaint_date)::INTEGER,
    CASE WHEN EXTRACT(MONTH FROM complaint_date) IN (6,7,8,9)
         THEN 1 ELSE 0 END
FROM civic_complaints
WHERE complaint_date IS NOT NULL
ON CONFLICT (date_key) DO NOTHING;

INSERT INTO dim_ward (
    ward_code, ward_area, zone, ward_type,
    population_density, ward_slum_percentage
)
SELECT DISTINCT ON (ward_code)
    ward_code, ward_area, zone, ward_type,
    population_density, ward_slum_percentage
FROM civic_complaints
WHERE ward_code IS NOT NULL
ORDER BY ward_code
ON CONFLICT (ward_code) DO NOTHING;

INSERT INTO dim_category (complaint_category)
SELECT DISTINCT complaint_category
FROM civic_complaints
WHERE complaint_category IS NOT NULL
ON CONFLICT (complaint_category) DO NOTHING;

INSERT INTO dim_department (department_assigned)
SELECT DISTINCT department_assigned
FROM civic_complaints
WHERE department_assigned IS NOT NULL
ON CONFLICT (department_assigned) DO NOTHING;

INSERT INTO fact_complaints (
    complaint_id, date_key, ward_key, category_key, department_key,
    severity, complaint_channel, complaint_status, complaint_time_of_day,
    property_type, complainant_type, has_photo_evidence, has_gps_location,
    media_attention, politically_sensitive, repeat_complainant,
    site_inspected, defect_liability_claim, prior_complaints_count,
    resolution_days, num_reassignments, estimated_cost_inr,
    infrastructure_age_years, months_since_last_maintained,
    citizen_satisfied, complaint_count
)
SELECT
    c.complaint_id,
    TO_CHAR(c.complaint_date, 'YYYYMMDD')::INTEGER,
    w.ward_key,
    cat.category_key,
    dep.department_key,
    c.severity,
    c.complaint_channel,
    c.complaint_status,
    c.complaint_time_of_day,
    c.property_type,
    c.complainant_type,
    c.has_photo_evidence,
    c.has_gps_location,
    c.media_attention,
    c.politically_sensitive,
    c.repeat_complainant,
    c.site_inspected,
    c.defect_liability_claim,
    c.prior_complaints_count,
    c.resolution_days,
    c.num_reassignments,
    c.estimated_cost_inr,
    c.infrastructure_age_years,
    c.months_since_last_maintained,
    c.citizen_satisfied,
    1
FROM civic_complaints c
JOIN dim_date d
  ON d.full_date = c.complaint_date
JOIN dim_ward w
  ON w.ward_code = c.ward_code
JOIN dim_category cat
  ON cat.complaint_category = c.complaint_category
JOIN dim_department dep
  ON dep.department_assigned = c.department_assigned
ON CONFLICT (complaint_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_fact_date
    ON fact_complaints(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_ward
    ON fact_complaints(ward_key);
CREATE INDEX IF NOT EXISTS idx_fact_category
    ON fact_complaints(category_key);
CREATE INDEX IF NOT EXISTS idx_fact_department
    ON fact_complaints(department_key);
CREATE INDEX IF NOT EXISTS idx_fact_status
    ON fact_complaints(complaint_status);
CREATE INDEX IF NOT EXISTS idx_fact_severity
    ON fact_complaints(severity);

COMMIT;
