const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// =====================================================
// CIVICFLOW DEMO DATA
// =====================================================

const summary = {
  total_complaints: 960000,
  resolved_complaints: 556014,
  resolution_rate: 57.92,
  avg_resolution_days: 13.73,
  wards: 24,
  categories: 13,
};

// =====================================================
// CATEGORY DATA
// =====================================================

const categoryData = [
  { complaint_category: "Pothole / Road Damage", complaint_count: 172475 },
  { complaint_category: "Water Supply Disruption", complaint_count: 153875 },
  { complaint_category: "Solid Waste / Garbage", complaint_count: 134953 },
  { complaint_category: "Drainage Overflow / Flooding", complaint_count: 105867 },
  { complaint_category: "Street Light Failure", complaint_count: 86380 },
  { complaint_category: "Illegal Construction", complaint_count: 66867 },
  { complaint_category: "Encroachment", complaint_count: 57630 },
  { complaint_category: "Tree Fallen / Dangerous Tree", complaint_count: 48117 },
  { complaint_category: "Public Toilet Condition", complaint_count: 38225 },
  { complaint_category: "Water Leakage / Pipe Burst", complaint_count: 38121 },
  { complaint_category: "Noise / Air Pollution", complaint_count: 28752 },
  { complaint_category: "Stray Animal Menace", complaint_count: 18962 },
  { complaint_category: "Health / Epidemic", complaint_count: 9776 },
];

// =====================================================
// YEARLY DATA
// =====================================================

const yearlyData = [
  { year: 2018, complaint_count: 136729 },
  { year: 2019, complaint_count: 136908 },
  { year: 2020, complaint_count: 138600 },
  { year: 2021, complaint_count: 137707 },
  { year: 2022, complaint_count: 136817 },
  { year: 2023, complaint_count: 136858 },
  { year: 2024, complaint_count: 136381 },
];

// =====================================================
// MONTHLY DATA
// =====================================================

const monthlyData = [
  { month: 1, complaint_count: 80000 },
  { month: 2, complaint_count: 78000 },
  { month: 3, complaint_count: 79000 },
  { month: 4, complaint_count: 80000 },
  { month: 5, complaint_count: 81000 },
  { month: 6, complaint_count: 82000 },
  { month: 7, complaint_count: 85000 },
  { month: 8, complaint_count: 83000 },
  { month: 9, complaint_count: 80000 },
  { month: 10, complaint_count: 79000 },
  { month: 11, complaint_count: 77000 },
  { month: 12, complaint_count: 76000 },
];

// =====================================================
// WARD DATA
// =====================================================

const wardData = [
  {
    ward_code: "K/E",
    ward_area: "Andheri East",
    zone: "Western",
    complaint_count: 59673,
    avg_resolution_days: 13.36,
  },
  {
    ward_code: "L",
    ward_area: "Kurla–Vidyavihar",
    zone: "Eastern",
    complaint_count: 59459,
    avg_resolution_days: 16.04,
  },
  {
    ward_code: "M/E",
    ward_area: "Govandi–Mankhurd",
    zone: "Eastern",
    complaint_count: 49648,
    avg_resolution_days: 13.38,
  },
  {
    ward_code: "P/N",
    ward_area: "Malad",
    zone: "Western",
    complaint_count: 49548,
    avg_resolution_days: 13.46,
  },
  {
    ward_code: "F/N",
    ward_area: "Sion–Dharavi",
    zone: "City",
    complaint_count: 49375,
    avg_resolution_days: 16.10,
  },
];

// =====================================================
// MONSOON DATA
// =====================================================

const monsoonData = [
  {
    period: "Monsoon",
    complaint_count: 320638,
    avg_resolution_days: 16.74,
    resolved_complaints: 185666,
  },
  {
    period: "Non-Monsoon",
    complaint_count: 639362,
    avg_resolution_days: 12.23,
    resolved_complaints: 370348,
  },
];

// =====================================================
// SAMPLE COMPLAINTS
// =====================================================

const complaints = [
  {
    id: 1,
    title: "Road damage near main junction",
    description: "Large potholes affecting traffic.",
    category: "Pothole / Road Damage",
    location: "Andheri East",
    status: "Resolved",
    priority: "High",
    created_at: "2024-08-15",
  },
  {
    id: 2,
    title: "Water supply disruption",
    description: "Water supply unavailable in residential area.",
    category: "Water Supply Disruption",
    location: "Kurla",
    status: "In Progress",
    priority: "High",
    created_at: "2024-09-02",
  },
  {
    id: 3,
    title: "Garbage accumulation",
    description: "Garbage collection delayed.",
    category: "Solid Waste / Garbage",
    location: "Malad",
    status: "Resolved",
    priority: "Medium",
    created_at: "2024-07-21",
  },
];

// =====================================================
// BASIC ROUTES
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message: "CivicFlow Demo API",
    status: "online",
    version: "1.0",
  });
});

app.get("/api/test-db", (req, res) => {
  res.json({
    connected: true,
    mode: "demo",
    message: "CivicFlow deployment API is working.",
  });
});

// =====================================================
// DASHBOARD
// =====================================================

app.get("/api/dashboard/summary", (req, res) => {
  res.json(summary);
});

app.get("/api/dashboard/category", (req, res) => {
  res.json(categoryData);
});

app.get("/api/dashboard/yearly", (req, res) => {
  res.json(yearlyData);
});

app.get("/api/dashboard/monthly", (req, res) => {
  res.json(monthlyData);
});

app.get("/api/dashboard/wards", (req, res) => {
  res.json(wardData);
});

app.get("/api/dashboard/monsoon", (req, res) => {
  res.json(monsoonData);
});

// =====================================================
// COMPLAINTS
// =====================================================

app.get("/api/complaints", (req, res) => {
  res.json(complaints);
});

app.post("/api/complaints", (req, res) => {
  const {
    title,
    description,
    category,
    location,
    priority = "Medium",
  } = req.body;

  if (!title || !description || !category || !location) {
    return res.status(400).json({
      error: "Missing required complaint fields.",
    });
  }

  const newComplaint = {
    id: complaints.length + 1,
    title,
    description,
    category,
    location,
    status: "Pending",
    priority,
    created_at: new Date().toISOString(),
  };

  complaints.push(newComplaint);

  res.status(201).json(newComplaint);
});

app.put("/api/complaints/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const complaint = complaints.find((item) => item.id === id);

  if (!complaint) {
    return res.status(404).json({
      error: "Complaint not found.",
    });
  }

  complaint.status = status || complaint.status;

  res.json(complaint);
});

// =====================================================
// OLAP ANALYTICS
// =====================================================

app.get("/api/analytics/olap", (req, res) => {
  const {
    groupBy = "year",
    year,
    ward,
    category,
  } = req.query;

  let data = [];

  if (groupBy === "year") {
    data = yearlyData.map((row) => ({
      dimension: String(row.year),
      total_complaints: row.complaint_count,
      avg_resolution_days: 13.73,
      resolved_complaints: Math.round(
        row.complaint_count * 0.5792
      ),
      resolution_rate: 57.92,
    }));
  }

  else if (groupBy === "month") {
    data = monthlyData.map((row) => ({
      dimension: String(row.month),
      total_complaints: row.complaint_count,
      avg_resolution_days: 13.73,
      resolved_complaints: Math.round(
        row.complaint_count * 0.5792
      ),
      resolution_rate: 57.92,
    }));
  }

  else if (groupBy === "ward") {
    data = wardData.map((row) => ({
      dimension: row.ward_code,
      total_complaints: row.complaint_count,
      avg_resolution_days: row.avg_resolution_days,
      resolved_complaints: Math.round(
        row.complaint_count * 0.5792
      ),
      resolution_rate: 57.92,
    }));
  }

  else if (groupBy === "category") {
    data = categoryData.map((row) => ({
      dimension: row.complaint_category,
      total_complaints: row.complaint_count,
      avg_resolution_days: 13.73,
      resolved_complaints: Math.round(
        row.complaint_count * 0.5792
      ),
      resolution_rate: 57.92,
    }));
  }

  else {
    return res.status(400).json({
      error:
        "Invalid groupBy. Use year, month, ward or category.",
    });
  }

  res.json(data);
});

// =====================================================
// DATA MINING
// =====================================================

app.get("/api/mining/anomalies", (req, res) => {
  res.json([
    {
      ward_code: "L",
      complaint_month: 7,
      complaint_count: 7200,
      avg_monthly_complaints: 4800,
      stddev_monthly_complaints: 1100,
      z_score: 2.18,
    },
    {
      ward_code: "F/N",
      complaint_month: 8,
      complaint_count: 6800,
      avg_monthly_complaints: 4300,
      stddev_monthly_complaints: 1050,
      z_score: 2.38,
    },
  ]);
});

app.get("/api/mining/patterns", (req, res) => {
  res.json([
    {
      month: 7,
      complaint_category: "Pothole / Road Damage",
      complaint_count: 57801,
      average_monthly_complaints: 48000,
      seasonal_index: 1.204,
      pattern_strength: "Strong Pattern",
    },
    {
      month: 8,
      complaint_category: "Drainage Overflow / Flooding",
      complaint_count: 35466,
      average_monthly_complaints: 29000,
      seasonal_index: 1.223,
      pattern_strength: "Strong Pattern",
    },
    {
      month: 7,
      complaint_category: "Water Supply Disruption",
      complaint_count: 51247,
      average_monthly_complaints: 45000,
      seasonal_index: 1.139,
      pattern_strength: "Strong Pattern",
    },
  ]);
});

// =====================================================
// SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CivicFlow Demo API running on port ${PORT}`);
});