-- ============================================================
-- CivicFlow - Star Schema Data Warehouse
-- ============================================================
-- Source table:
--     civic_complaints
--
-- Fact table:
--     fact_complaints
--
-- Dimension tables:
--     dim_date
--     dim_ward
--     dim_category
--     dim_department
-- ============================================================


-- ============================================================
-- 1. DATE DIMENSION
-- ============================================================

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


-- ============================================================
-- 2. WARD DIMENSION
-- ============================================================

CREATE TABLE IF NOT EXISTS dim_ward (
    ward_key SERIAL PRIMARY KEY,
    ward_code VARCHAR(10) UNIQUE NOT NULL,
    ward_area VARCHAR(100),
    zone VARCHAR(30),
    ward_type VARCHAR(30),
    population_density VARCHAR(30),
    ward_slum_percentage NUMERIC
);


-- ============================================================
-- 3. CATEGORY DIMENSION
-- ============================================================

CREATE TABLE IF NOT EXISTS dim_category (
    category_key SERIAL PRIMARY KEY,
    complaint_category VARCHAR(100) UNIQUE NOT NULL
);


-- ============================================================
-- 4. DEPARTMENT DIMENSION
-- ============================================================

CREATE TABLE IF NOT EXISTS dim_department (
    department_key SERIAL PRIMARY KEY,
    department_assigned VARCHAR(100) UNIQUE NOT NULL
);


-- ============================================================
-- 5. FACT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS fact_complaints (
    fact_id BIGSERIAL PRIMARY KEY,

    complaint_id VARCHAR(50) UNIQUE NOT NULL,

    date_key INTEGER NOT NULL,
    ward_key INTEGER NOT NULL,
    category_key INTEGER NOT NULL,
    department_key INTEGER NOT NULL,

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

    complaint_count INTEGER DEFAULT 1,

    CONSTRAINT fk_fact_date
        FOREIGN KEY (date_key)
        REFERENCES dim_date(date_key),

    CONSTRAINT fk_fact_ward
        FOREIGN KEY (ward_key)
        REFERENCES dim_ward(ward_key),

    CONSTRAINT fk_fact_category
        FOREIGN KEY (category_key)
        REFERENCES dim_category(category_key),

    CONSTRAINT fk_fact_department
        FOREIGN KEY (department_key)
        REFERENCES dim_department(department_key)
);


-- ============================================================
-- 6. POPULATE DATE DIMENSION
-- ============================================================

INSERT INTO dim_date (
    date_key,
    full_date,
    day,
    month,
    month_name,
    quarter,
    year,
    is_monsoon_season
)
SELECT
    TO_CHAR(d, 'YYYYMMDD')::INTEGER AS date_key,
    d::DATE AS full_date,
    EXTRACT(DAY FROM d)::INTEGER AS day,
    EXTRACT(MONTH FROM d)::INTEGER AS month,
    TO_CHAR(d, 'Month') AS month_name,
    EXTRACT(QUARTER FROM d)::INTEGER AS quarter,
    EXTRACT(YEAR FROM d)::INTEGER AS year,
    CASE
        WHEN EXTRACT(MONTH FROM d) IN (6, 7, 8, 9)
        THEN 1
        ELSE 0
    END AS is_monsoon_season
FROM generate_series(
    (SELECT MIN(complaint_date) FROM civic_complaints),
    (SELECT MAX(complaint_date) FROM civic_complaints),
    INTERVAL '1 day'
) AS d
ON CONFLICT (date_key) DO NOTHING;


-- ============================================================
-- 7. POPULATE WARD DIMENSION
-- ============================================================

INSERT INTO dim_ward (
    ward_code,
    ward_area,
    zone,
    ward_type,
    population_density,
    ward_slum_percentage
)
SELECT DISTINCT
    ward_code,
    ward_area,
    zone,
    ward_type,
    population_density,
    ward_slum_percentage
FROM civic_complaints
WHERE ward_code IS NOT NULL
ON CONFLICT (ward_code) DO NOTHING;


-- ============================================================
-- 8. POPULATE CATEGORY DIMENSION
-- ============================================================

INSERT INTO dim_category (
    complaint_category
)
SELECT DISTINCT
    complaint_category
FROM civic_complaints
WHERE complaint_category IS NOT NULL
ON CONFLICT (complaint_category) DO NOTHING;


-- ============================================================
-- 9. POPULATE DEPARTMENT DIMENSION
-- ============================================================

INSERT INTO dim_department (
    department_assigned
)
SELECT DISTINCT
    department_assigned
FROM civic_complaints
WHERE department_assigned IS NOT NULL
ON CONFLICT (department_assigned) DO NOTHING;


-- ============================================================
-- 10. POPULATE FACT TABLE
-- ============================================================

INSERT INTO fact_complaints (
    complaint_id,
    date_key,
    ward_key,
    category_key,
    department_key,
    severity,
    complaint_channel,
    complaint_status,
    complaint_time_of_day,
    property_type,
    complainant_type,
    has_photo_evidence,
    has_gps_location,
    media_attention,
    politically_sensitive,
    repeat_complainant,
    site_inspected,
    defect_liability_claim,
    prior_complaints_count,
    resolution_days,
    num_reassignments,
    estimated_cost_inr,
    infrastructure_age_years,
    months_since_last_maintained,
    citizen_satisfied,
    complaint_count
)
SELECT
    c.complaint_id,

    d.date_key,
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

    1 AS complaint_count

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


-- ============================================================
-- 11. INDEXES FOR OLAP PERFORMANCE
-- ============================================================

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


-- ============================================================
-- 12. VERIFICATION
-- ============================================================

SELECT
    'Source complaints' AS table_name,
    COUNT(*) AS record_count
FROM civic_complaints

UNION ALL

SELECT
    'Fact complaints',
    COUNT(*)
FROM fact_complaints

UNION ALL

SELECT
    'Date dimension',
    COUNT(*)
FROM dim_date

UNION ALL

SELECT
    'Ward dimension',
    COUNT(*)
FROM dim_ward

UNION ALL

SELECT
    'Category dimension',
    COUNT(*)
FROM dim_category

UNION ALL

SELECT
    'Department dimension',
    COUNT(*)
FROM dim_department;


-- ============================================================
-- EXPECTED MAIN RESULTS
-- ============================================================
-- Source complaints : 960000
-- Fact complaints   : 960000
-- Wards             : 24
-- Categories        : 13
-- ============================================================