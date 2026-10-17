const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { execFile } = require("child_process");
const path = require("path");
const { promisify } = require("util");
require("dotenv").config();

const execFileAsync = promisify(execFile);

const app = express();
const PORT = 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// POSTGRESQL CONNECTION
// =====================================================


const { Pool } = require("pg");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "CivicFlow",
      password: process.env.DB_PASSWORD || "postgres",
      port: Number(process.env.DB_PORT) || 5432,
    });


// =====================================================
// BASIC ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message: "CivicFlow Backend is running!",
  });
});

// =====================================================
// DATABASE TEST
// =====================================================

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS current_time"
    );

    res.json({
      message: "Database connected successfully",
      time: result.rows[0].current_time,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Database connection failed",
    });
  }
});

// =====================================================
// LIVE COMPLAINTS
// =====================================================

// GET complaints
app.get("/api/complaints", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM complaints
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch complaints",
    });
  }
});

// POST complaint
app.post("/api/complaints", async (req, res) => {
  try {
    const {
      user_id,
      title,
      description,
      category,
      location,
      priority,
    } = req.body;

    if (!title || !description || !category || !location) {
      return res.status(400).json({
        error:
          "Title, description, category and location are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO complaints
      (
        user_id,
        title,
        description,
        category,
        location,
        priority
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        user_id || null,
        title,
        description,
        category,
        location,
        priority || "Medium",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to create complaint",
    });
  }
});

// UPDATE complaint status
app.put("/api/complaints/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: "Status is required",
      });
    }

    const result = await pool.query(
      `
      UPDATE complaints
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Complaint not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to update complaint",
    });
  }
});

// =====================================================
// DASHBOARD SUMMARY
// =====================================================

app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_complaints,

        COUNT(*) FILTER (
          WHERE complaint_status = 'Resolved'
        ) AS resolved_complaints,

        ROUND(
          (
            COUNT(*) FILTER (
              WHERE complaint_status = 'Resolved'
            ) * 100.0
            / NULLIF(COUNT(*), 0)
          )::numeric,
          2
        ) AS resolution_rate,

        ROUND(
          AVG(resolution_days)::numeric,
          2
        ) AS avg_resolution_days,

        COUNT(DISTINCT ward_code) AS total_wards,

        COUNT(DISTINCT complaint_category)
          AS total_categories

      FROM civic_complaints
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load dashboard summary",
    });
  }
});

// =====================================================
// CATEGORY ANALYSIS
// =====================================================

app.get("/api/dashboard/category", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        complaint_category,

        COUNT(*) AS total_complaints,

        ROUND(
          COUNT(*) * 100.0 /
          SUM(COUNT(*)) OVER (),
          2
        ) AS percentage

      FROM civic_complaints

      GROUP BY complaint_category

      ORDER BY total_complaints DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load category analysis",
    });
  }
});

// =====================================================
// WARD ANALYSIS
// =====================================================

app.get("/api/dashboard/wards", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ward_code,

        COUNT(*) AS total_complaints,

        ROUND(
          AVG(resolution_days)::numeric,
          2
        ) AS avg_resolution_days,

        ROUND(
          AVG(
            CASE
              WHEN severity = 'Low' THEN 1
              WHEN severity = 'Medium' THEN 2
              WHEN severity = 'High' THEN 3
              WHEN severity = 'Critical' THEN 4
              ELSE 0
            END
          )::numeric,
          2
        ) AS avg_severity,

        ROUND(
          AVG(citizen_satisfied) * 100,
          2
        ) AS satisfaction_rate,

        ROUND(
          AVG(infrastructure_age_years)::numeric,
          2
        ) AS avg_infrastructure_age

      FROM civic_complaints

      GROUP BY ward_code

      ORDER BY total_complaints DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load ward analysis",
    });
  }
});

// =====================================================
// YEARLY ANALYSIS
// =====================================================

app.get("/api/dashboard/yearly", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        year,
        COUNT(*) AS total_complaints

      FROM civic_complaints

      GROUP BY year

      ORDER BY year
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load yearly analysis",
    });
  }
});

// =====================================================
// MONTHLY ANALYSIS
// =====================================================

app.get("/api/dashboard/monthly", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        month,
        COUNT(*) AS total_complaints

      FROM civic_complaints

      GROUP BY month

      ORDER BY month
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load monthly analysis",
    });
  }
});

// =====================================================
// MONSOON ANALYSIS
// =====================================================

app.get("/api/dashboard/monsoon", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        CASE
          WHEN is_monsoon_season = 1
          THEN 'Monsoon'
          ELSE 'Non-Monsoon'
        END AS season,

        COUNT(*) AS total_complaints

      FROM civic_complaints

      GROUP BY is_monsoon_season

      ORDER BY is_monsoon_season DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load monsoon analysis",
    });
  }
});

// =====================================================
// ANOMALY DETECTION
// Statistical Data Mining
// =====================================================

app.get("/api/mining/anomalies", async (req, res) => {
  try {
    const result = await pool.query(`
      WITH monthly_counts AS (
        SELECT
          ward_code,

          DATE_TRUNC(
            'month',
            complaint_date
          ) AS complaint_month,

          COUNT(*) AS complaint_count

        FROM civic_complaints

        GROUP BY
          ward_code,
          DATE_TRUNC(
            'month',
            complaint_date
          )
      ),

      statistics AS (
        SELECT
          ward_code,

          AVG(complaint_count)
            AS avg_monthly_complaints,

          STDDEV(complaint_count)
            AS stddev_monthly_complaints

        FROM monthly_counts

        GROUP BY ward_code
      ),

      anomalies AS (
        SELECT
          m.ward_code,
          m.complaint_month,
          m.complaint_count,
          s.avg_monthly_complaints,
          s.stddev_monthly_complaints,

          (
            m.complaint_count
            - s.avg_monthly_complaints
          )
          /
          NULLIF(
            s.stddev_monthly_complaints,
            0
          ) AS z_score

        FROM monthly_counts m

        JOIN statistics s
          ON m.ward_code = s.ward_code
      )

      SELECT
        ward_code,
        complaint_month,
        complaint_count,

        ROUND(
          avg_monthly_complaints::numeric,
          2
        ) AS avg_monthly_complaints,

        ROUND(
          stddev_monthly_complaints::numeric,
          2
        ) AS stddev_monthly_complaints,

        ROUND(
          z_score::numeric,
          2
        ) AS z_score

      FROM anomalies

      WHERE z_score >= 2

      ORDER BY z_score DESC

      LIMIT 20
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to detect anomalies",
    });
  }
});

// =====================================================
// RECURRING / SEASONAL PATTERN DETECTION
// Data Mining
// =====================================================

app.get("/api/mining/patterns", async (req, res) => {
  try {
    const result = await pool.query(`
      WITH monthly_category AS (
        SELECT
          EXTRACT(
            MONTH FROM complaint_date
          )::INTEGER AS month,

          complaint_category,

          COUNT(*) AS complaint_count

        FROM civic_complaints

        GROUP BY
          EXTRACT(
            MONTH FROM complaint_date
          ),
          complaint_category
      ),

      category_average AS (
        SELECT
          complaint_category,

          AVG(
            complaint_count
          ) AS average_monthly_complaints

        FROM monthly_category

        GROUP BY complaint_category
      ),

      pattern_scores AS (
        SELECT
          m.month,
          m.complaint_category,
          m.complaint_count,
          a.average_monthly_complaints,

          ROUND(
            (
              m.complaint_count::numeric
              /
              NULLIF(
                a.average_monthly_complaints,
                0
              )
            ),
            3
          ) AS seasonal_index

        FROM monthly_category m

        JOIN category_average a
          ON m.complaint_category =
             a.complaint_category
      )

      SELECT
        month,
        complaint_category,
        complaint_count,

        ROUND(
          average_monthly_complaints::numeric,
          2
        ) AS average_monthly_complaints,

        seasonal_index,

        CASE
          WHEN seasonal_index >= 1.08
            THEN 'Strong Pattern'

          WHEN seasonal_index >= 1.04
            THEN 'Moderate Pattern'

          ELSE 'Normal Pattern'
        END AS pattern_strength

      FROM pattern_scores

      WHERE seasonal_index >= 1.04

      ORDER BY
        seasonal_index DESC,
        complaint_count DESC

      LIMIT 20
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(
      "Recurring pattern error:",
      error
    );

    res.status(500).json({
      error: "Failed to detect recurring patterns",
    });
  }
});

// =====================================================
// OLAP ANALYTICS
// DATA WAREHOUSE / STAR SCHEMA
// =====================================================

app.get("/api/analytics/olap", async (req, res) => {
  try {
    const {
      groupBy = "year",
      year,
      ward,
      category,
    } = req.query;

    // Allowed OLAP dimensions
    const allowedDimensions = {
      year: "d.year",
      month: "d.month",
      ward: "w.ward_code",
      category: "cat.complaint_category",
    };

    if (!allowedDimensions[groupBy]) {
      return res.status(400).json({
        error:
          "Invalid groupBy. Use year, month, ward or category.",
      });
    }

    const groupColumn = allowedDimensions[groupBy];

    // Build filters
    const conditions = [];
    const values = [];

    // Slice by year
    if (year) {
      const numericYear = Number(year);

      if (!Number.isInteger(numericYear)) {
        return res.status(400).json({
          error: "Year must be a valid integer.",
        });
      }

      values.push(numericYear);
      conditions.push(`d.year = $${values.length}`);
    }

    // Dice by ward
    if (ward) {
      values.push(ward);
      conditions.push(`w.ward_code = $${values.length}`);
    }

    // Dice by category
    if (category) {
      values.push(category);
      conditions.push(
        `cat.complaint_category = $${values.length}`
      );
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    // Star schema OLAP query:
    // fact_complaints joins dim_date, dim_ward and dim_category.

    const query = `
      SELECT
        ${groupColumn} AS dimension,

        COUNT(*) AS total_complaints,

        ROUND(
          AVG(f.resolution_days)::numeric,
          2
        ) AS avg_resolution_days,

        COUNT(*) FILTER (
          WHERE f.complaint_status = 'Resolved'
        ) AS resolved_complaints,

        ROUND(
          (
            COUNT(*) FILTER (
              WHERE f.complaint_status = 'Resolved'
            ) * 100.0
            / NULLIF(COUNT(*), 0)
          )::numeric,
          2
        ) AS resolution_rate

      FROM fact_complaints f

      JOIN dim_date d
        ON f.date_key = d.date_key

      JOIN dim_ward w
        ON f.ward_key = w.ward_key

      JOIN dim_category cat
        ON f.category_key = cat.category_key

      ${whereClause}

      GROUP BY ${groupColumn}

      ORDER BY ${groupColumn}
    `;

    const result = await pool.query(query, values);

    res.json({
      groupBy,
      filters: {
        year: year || null,
        ward: ward || null,
        category: category || null,
      },
      data: result.rows,
    });
  } catch (error) {
    console.error("OLAP analytics error:", error);

    res.status(500).json({
      error: "Failed to load OLAP analytics",
    });
  }
});

// =====================================================
// RESOLUTION-TIME PREDICTION (MACHINE LEARNING)
// =====================================================

app.post("/api/mining/predict-resolution", async (req, res) => {
  try {
    // Accept either:
    // { "complaint": { ...features } }
    // or the feature object directly.
    const complaint =
      req.body &&
      req.body.complaint &&
      typeof req.body.complaint === "object"
        ? req.body.complaint
        : req.body;

    if (
      !complaint ||
      typeof complaint !== "object" ||
      Array.isArray(complaint)
    ) {
      return res.status(400).json({
        error: "Send complaint details as a JSON object.",
      });
    }

    if (!complaint.complaint_category) {
      return res.status(400).json({
        error: "complaint_category is required.",
      });
    }

    const pythonScript = path.resolve(
      __dirname,
      "..",
      "Mining",
      "predict_resolution.py"
    );

    const pythonExecutable =
      process.env.PYTHON_EXECUTABLE || "python";

    const { stdout } = await execFileAsync(
      pythonExecutable,
      [pythonScript, JSON.stringify(complaint)],
      {
        cwd: path.resolve(__dirname, ".."),
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      }
    );

    const prediction = JSON.parse(stdout.trim());

    if (
      typeof prediction.estimated_resolution_days !== "number" ||
      !Number.isFinite(prediction.estimated_resolution_days)
    ) {
      throw new Error(
        "Prediction script returned an invalid result."
      );
    }

    return res.json({
      success: true,
      estimated_resolution_days:
        prediction.estimated_resolution_days,
      unit: "days",
      model: "resolution_time_model",
      note:
        "This is an estimate, not a guarantee. Model test MAE was 7.51 days.",
    });
  } catch (error) {
    console.error(
      "Resolution-time prediction error:",
      error.message
    );

    if (error.code === "ENOENT") {
      return res.status(500).json({
        error:
          "Python was not found. Set PYTHON_EXECUTABLE in Backend/.env to your Python executable if needed.",
      });
    }

    return res.status(500).json({
      error:
        "Failed to predict resolution time. Check the Python model and script paths.",
    });
  }
});

// =====================================================
// SERVER START
// =====================================================

app.listen(PORT, () => {
  console.log(
    `CivicFlow Backend running on http://localhost:${PORT}`
  );
});