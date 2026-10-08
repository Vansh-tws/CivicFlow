import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const COLORS = [
  "#2563eb",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#e11d48",
  "#0ea5e9",
];

function App() {
  // =====================================================
  // DASHBOARD STATE
  // =====================================================

  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [wards, setWards] = useState([]);
  const [yearly, setYearly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [monsoon, setMonsoon] = useState([]);

  const [anomalies, setAnomalies] = useState([]);
  const [patterns, setPatterns] = useState([]);

  // =====================================================
  // OLAP STATE
  // =====================================================

  const [olapGroupBy, setOlapGroupBy] = useState("year");
  const [olapYear, setOlapYear] = useState("");
  const [olapWard, setOlapWard] = useState("");
  const [olapCategory, setOlapCategory] = useState("");

  const [olapData, setOlapData] = useState([]);
  const [olapLoading, setOlapLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  // =====================================================
  // SIDEBAR NAVIGATION
  // =====================================================

  const [activeNav, setActiveNav] = useState("dashboard");

  const goTo = (id) => {
    setActiveNav(id);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // =====================================================
  // LOAD MAIN DASHBOARD
  // =====================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [
          summaryRes,
          categoryRes,
          wardsRes,
          yearlyRes,
          monthlyRes,
          monsoonRes,
          anomalyRes,
          patternRes,
        ] = await Promise.all([
          axios.get(`${API}/dashboard/summary`),
          axios.get(`${API}/dashboard/category`),
          axios.get(`${API}/dashboard/wards`),
          axios.get(`${API}/dashboard/yearly`),
          axios.get(`${API}/dashboard/monthly`),
          axios.get(`${API}/dashboard/monsoon`),
          axios.get(`${API}/mining/anomalies`),
          axios.get(`${API}/mining/patterns`),
        ]);

        // Summary
        setSummary(summaryRes.data);

        // Categories
        setCategories(
          categoryRes.data.map((item) => ({
            ...item,
            total_complaints: Number(item.total_complaints),
          }))
        );

        // Wards
        setWards(
          wardsRes.data.map((item) => ({
            ...item,
            total_complaints: Number(item.total_complaints),
            avg_resolution_days: Number(item.avg_resolution_days),
            satisfaction_rate: Number(item.satisfaction_rate),
          }))
        );

        // Yearly
        setYearly(
          yearlyRes.data.map((item) => ({
            ...item,
            year: Number(item.year),
            total_complaints: Number(item.total_complaints),
          }))
        );

        // Monthly
        setMonthly(
          monthlyRes.data.map((item) => ({
            ...item,
            month: Number(item.month),
            total_complaints: Number(item.total_complaints),
          }))
        );

        // Monsoon
        setMonsoon(
          monsoonRes.data.map((item) => ({
            ...item,
            total_complaints: Number(item.total_complaints),
          }))
        );

        // Anomalies
        setAnomalies(
          anomalyRes.data.map((item) => ({
            ...item,
            complaint_count: Number(item.complaint_count),
            avg_monthly_complaints: Number(
              item.avg_monthly_complaints
            ),
            z_score: Number(item.z_score),
          }))
        );

        // Recurring patterns
        setPatterns(
          patternRes.data.map((item) => ({
            ...item,
            month: Number(item.month),
            complaint_count: Number(item.complaint_count),
            average_monthly_complaints: Number(
              item.average_monthly_complaints
            ),
            seasonal_index: Number(item.seasonal_index),
          }))
        );
      } catch (error) {
        console.error(
          "CivicFlow dashboard error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // =====================================================
  // OLAP DATA
  // =====================================================

  useEffect(() => {
    const loadOlap = async () => {
      setOlapLoading(true);

      try {
        const params = {
          groupBy: olapGroupBy,
        };

        if (olapYear) {
          params.year = olapYear;
        }

        if (olapWard) {
          params.ward = olapWard;
        }

        if (olapCategory) {
          params.category = olapCategory;
        }

        const response = await axios.get(
          `${API}/analytics/olap`,
          { params }
        );

        const data = response.data?.data || [];

        setOlapData(
          data.map((item) => ({
            ...item,
            dimension: item.dimension,
            total_complaints: Number(
              item.total_complaints || 0
            ),
            avg_resolution_days: Number(
              item.avg_resolution_days || 0
            ),
            resolved_complaints: Number(
              item.resolved_complaints || 0
            ),
            resolution_rate: Number(
              item.resolution_rate || 0
            ),
          }))
        );
      } catch (error) {
        console.error(
          "CivicFlow OLAP error:",
          error
        );

        setOlapData([]);
      } finally {
        setOlapLoading(false);
      }
    };

    loadOlap();
  }, [
    olapGroupBy,
    olapYear,
    olapWard,
    olapCategory,
  ]);

  // =====================================================
  // HELPERS
  // =====================================================

  const monthName = (month) => {
    const names = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return names[month - 1] || month;
  };

  const getSeverity = (zScore) => {
    if (zScore >= 3) return "High";
    if (zScore >= 2.5) return "Medium";
    return "Watch";
  };

  const getPatternClass = (strength) => {
    if (strength === "Strong Pattern") return "strong";
    if (strength === "Moderate Pattern") return "moderate";
    return "normal";
  };

  const formatOlapDimension = (value) => {
    if (
      olapGroupBy === "month" &&
      !Number.isNaN(Number(value))
    ) {
      return monthName(Number(value));
    }

    return value;
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>

        <h2>CivicFlow</h2>

        <p>
          Loading municipal intelligence...
        </p>
      </div>
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div className="dashboard">
      {/* ================================================= */}
      {/* SIDEBAR */}
      {/* ================================================= */}

      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">
            C
          </div>

          <div>
            <h2>CivicFlow</h2>

            <span>
              Public Service Intelligence
            </span>
          </div>
        </div>

        <nav>
          <a
            className={activeNav === "dashboard" ? "active" : ""}
            onClick={() => goTo("dashboard")}
          >
            Dashboard
          </a>

          <a
            className={activeNav === "complaints" ? "active" : ""}
            onClick={() => goTo("complaints")}
          >
            Complaints
          </a>

          <a
            className={activeNav === "analytics" ? "active" : ""}
            onClick={() => goTo("analytics")}
          >
            Analytics
          </a>

          <a
            className={activeNav === "datamining" ? "active" : ""}
            onClick={() => goTo("datamining")}
          >
            Data Mining
          </a>
        </nav>

        <div className="sidebar-bottom">
          <strong>
            Municipal Analytics
          </strong>

          <span>
            Powered by CivicFlow
          </span>
        </div>
      </aside>

      {/* ================================================= */}
      {/* MAIN CONTENT */}
      {/* ================================================= */}

      <main className="main">
        {/* HEADER */}

        <header className="header" id="dashboard">
          <div>
            <p className="eyebrow">
              MUNICIPAL INTELLIGENCE
            </p>

            <h1>
              Civic Service Dashboard
            </h1>

            <p className="subtitle">
              Monitor complaints, resolution
              performance and civic service patterns.
            </p>
          </div>

          <div className="status">
            <span></span>
            Historical Data
          </div>
        </header>

        {/* ================================================= */}
        {/* KPI CARDS */}
        {/* ================================================= */}

        <section className="kpi-grid">
          <div className="kpi-card">
            <p>Total Complaints</p>

            <h2>
              {Number(
                summary?.total_complaints || 0
              ).toLocaleString()}
            </h2>

            <span>
              Historical complaints
            </span>
          </div>

          <div className="kpi-card">
            <p>Resolved Complaints</p>

            <h2>
              {Number(
                summary?.resolved_complaints || 0
              ).toLocaleString()}
            </h2>

            <span>
              Successfully resolved
            </span>
          </div>

          <div className="kpi-card">
            <p>Resolution Rate</p>

            <h2>
              {summary?.resolution_rate || 0}%
            </h2>

            <span>
              Overall performance
            </span>
          </div>

          <div className="kpi-card">
            <p>Avg. Resolution Time</p>

            <h2>
              {summary?.avg_resolution_days || 0}
              <small> days</small>
            </h2>

            <span>
              Average resolution
            </span>
          </div>

          <div className="kpi-card">
            <p>Wards Covered</p>

            <h2>
              {summary?.total_wards || 0}
            </h2>

            <span>
              Municipal wards
            </span>
          </div>

          <div className="kpi-card">
            <p>Complaint Categories</p>

            <h2>
              {summary?.total_categories || 0}
            </h2>

            <span>
              Service categories
            </span>
          </div>
        </section>

        {/* ================================================= */}
        {/* CATEGORY + YEARLY */}
        {/* ================================================= */}

        <section className="chart-grid">
          {/* CATEGORY */}

          <div className="card">
            <div className="card-header">
              <div>
                <h3>
                  Complaint Categories
                </h3>

                <p>
                  Distribution of civic complaints
                </p>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height={360}
              >
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="total_complaints"
                    nameKey="complaint_category"
                    cx="50%"
                    cy="45%"
                    outerRadius={110}
                    innerRadius={65}
                    paddingAngle={2}
                  >
                    {categories.map(
                      (_, index) => (
                        <Cell
                          key={index}
                          fill={
                            COLORS[
                              index % COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />

                  <Legend
                    verticalAlign="bottom"
                    height={65}
                    wrapperStyle={{
                      fontSize: "10px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* YEARLY */}

          <div className="card">
            <div className="card-header">
              <div>
                <h3>
                  Yearly Complaint Trend
                </h3>

                <p>
                  Complaints received by year
                </p>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height={360}
              >
                <LineChart
                  data={yearly}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 5,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                  />

                  <XAxis
                    dataKey="year"
                  />

                  <YAxis />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="total_complaints"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                    }}
                    activeDot={{
                      r: 7,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* MONTHLY + MONSOON */}
        {/* ================================================= */}

        <section className="chart-grid" id="complaints">
          {/* MONTHLY */}

          <div className="card">
            <div className="card-header">
              <div>
                <h3>
                  Monthly Complaint Trend
                </h3>

                <p>
                  Seasonal complaint activity
                </p>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <BarChart data={monthly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                  />

                  <XAxis
                    dataKey="month"
                    tickFormatter={monthName}
                  />

                  <YAxis />

                  <Tooltip
                    labelFormatter={(value) =>
                      `Month: ${monthName(
                        Number(value)
                      )}`
                    }
                  />

                  <Bar
                    dataKey="total_complaints"
                    fill="#2563eb"
                    radius={[
                      5,
                      5,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MONSOON */}

          <div className="card">
            <div className="card-header">
              <div>
                <h3>
                  Monsoon Impact
                </h3>

                <p>
                  Complaint volume by season
                </p>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <BarChart data={monsoon}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                  />

                  <XAxis
                    dataKey="season"
                  />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="total_complaints"
                    fill="#06b6d4"
                    radius={[
                      5,
                      5,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* OLAP ANALYTICS */}
        {/* ================================================= */}

        <section className="card" id="analytics">
          <div className="card-header">
            <div>
              <h3>
                📊 OLAP Analytics
              </h3>

              <p>
                Explore complaint data using
                roll-up, drill-down, slice and dice.
              </p>
            </div>

            <span className="section-badge">
              Data Warehouse
            </span>
          </div>

          {/* OLAP CONTROLS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
              padding: "18px",
              background: "#f8fafc",
              borderRadius: "12px",
            }}
          >
            {/* GROUP BY */}

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "7px",
                  fontSize: "13px",
                }}
              >
                Analyze By
              </label>

              <select
                value={olapGroupBy}
                onChange={(e) =>
                  setOlapGroupBy(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                }}
              >
                <option value="year">
                  Year
                </option>

                <option value="month">
                  Month
                </option>

                <option value="ward">
                  Ward
                </option>

                <option value="category">
                  Category
                </option>
              </select>
            </div>

            {/* YEAR */}

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "7px",
                  fontSize: "13px",
                }}
              >
                Year Filter
              </label>

              <select
                value={olapYear}
                onChange={(e) =>
                  setOlapYear(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                }}
              >
                <option value="">
                  All Years
                </option>

                {yearly.map((item) => (
                  <option
                    key={item.year}
                    value={item.year}
                  >
                    {item.year}
                  </option>
                ))}
              </select>
            </div>

            {/* WARD */}

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "7px",
                  fontSize: "13px",
                }}
              >
                Ward Filter
              </label>

              <select
                value={olapWard}
                onChange={(e) =>
                  setOlapWard(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                }}
              >
                <option value="">
                  All Wards
                </option>

                {wards.map((item) => (
                  <option
                    key={item.ward_code}
                    value={item.ward_code}
                  >
                    {item.ward_code}
                  </option>
                ))}
              </select>
            </div>

            {/* CATEGORY */}

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "7px",
                  fontSize: "13px",
                }}
              >
                Category Filter
              </label>

              <select
                value={olapCategory}
                onChange={(e) =>
                  setOlapCategory(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                }}
              >
                <option value="">
                  All Categories
                </option>

                {categories.map((item) => (
                  <option
                    key={item.complaint_category}
                    value={item.complaint_category}
                  >
                    {item.complaint_category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* OLAP OPERATION INFO */}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <span className="section-badge">
              Roll-Up
            </span>

            <span className="section-badge">
              Drill-Down
            </span>

            <span className="section-badge">
              Slice
            </span>

            <span className="section-badge">
              Dice
            </span>
          </div>

          {/* OLAP RESULT */}

          {olapLoading ? (
            <div className="empty-state">
              <h3>
                Loading OLAP analysis...
              </h3>

              <p>
                Querying the CivicFlow data warehouse.
              </p>
            </div>
          ) : olapData.length === 0 ? (
            <div className="empty-state">
              <h3>
                No OLAP data available
              </h3>

              <p>
                Try changing the selected filters.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      {olapGroupBy === "year"
                        ? "Year"
                        : olapGroupBy === "month"
                        ? "Month"
                        : olapGroupBy === "ward"
                        ? "Ward"
                        : "Category"}
                    </th>

                    <th>
                      Complaints
                    </th>

                    <th>
                      Avg. Resolution
                    </th>

                    <th>
                      Resolved
                    </th>

                    <th>
                      Resolution Rate
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {olapData.map(
                    (item, index) => (
                      <tr key={index}>
                        <td>
                          <strong>
                            {formatOlapDimension(
                              item.dimension
                            )}
                          </strong>
                        </td>

                        <td>
                          {item.total_complaints.toLocaleString()}
                        </td>

                        <td>
                          {item.avg_resolution_days}
                          {" "}days
                        </td>

                        <td>
                          {item.resolved_complaints.toLocaleString()}
                        </td>

                        <td>
                          {item.resolution_rate}%
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* WARD HOTSPOTS */}
        {/* ================================================= */}

        <section className="card">
          <div className="card-header">
            <div>
              <h3>
                Ward Complaint Hotspots
              </h3>

              <p>
                Areas with the highest complaint volume
              </p>
            </div>

            <span className="section-badge">
              Top 10
            </span>
          </div>

          <div className="ward-chart">
            <ResponsiveContainer
              width="100%"
              height={450}
            >
              <BarChart
                data={wards.slice(0, 10)}
                layout="vertical"
                margin={{
                  left: 30,
                  right: 30,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                />

                <XAxis
                  type="number"
                />

                <YAxis
                  type="category"
                  dataKey="ward_code"
                  width={70}
                />

                <Tooltip />

                <Bar
                  dataKey="total_complaints"
                  fill="#2563eb"
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ================================================= */}
        {/* ANOMALY DETECTION */}
        {/* ================================================= */}

        <section className="card" id="datamining">
          <div className="card-header">
            <div>
              <h3>
                🚨 Anomaly Detection
              </h3>

              <p>
                Unusually high complaint volumes
                detected using statistical analysis.
              </p>
            </div>

            <div className="anomaly-badge">
              {anomalies.length} detected
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ward</th>
                  <th>Month</th>
                  <th>Complaints</th>
                  <th>Normal Average</th>
                  <th>Z-Score</th>
                  <th>Severity</th>
                </tr>
              </thead>

              <tbody>
                {anomalies.map(
                  (item, index) => {
                    const severity =
                      getSeverity(
                        item.z_score
                      );

                    const date =
                      new Date(
                        item.complaint_month
                      );

                    return (
                      <tr key={index}>
                        <td>
                          <strong>
                            {item.ward_code}
                          </strong>
                        </td>

                        <td>
                          {monthName(
                            date.getUTCMonth() + 1
                          )}
                          {" "}
                          {date.getUTCFullYear()}
                        </td>

                        <td>
                          {item.complaint_count.toLocaleString()}
                        </td>

                        <td>
                          {item.avg_monthly_complaints.toLocaleString()}
                        </td>

                        <td>
                          <strong>
                            {item.z_score.toFixed(2)}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={
                              `severity ${severity.toLowerCase()}`
                            }
                          >
                            {severity}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================================================= */}
        {/* RECURRING PATTERNS */}
        {/* ================================================= */}

        <section className="card">
          <div className="card-header">
            <div>
              <h3>
                🔁 Frequent & Seasonal Complaint Patterns
              </h3>

              <p>
                Seasonal patterns identified by comparing
                monthly complaint volume with the normal
                category baseline.
              </p>
            </div>

            <div className="pattern-badge">
              {patterns.length} patterns
            </div>
          </div>

          {patterns.length === 0 ? (
            <div className="empty-state">
              <div>
                🔍
              </div>

              <h3>
                No strong recurring patterns detected
              </h3>

              <p>
                The dataset does not show significant
                recurring category-month increases above
                the current detection threshold.
              </p>
            </div>
          ) : (
            <div className="pattern-grid">
              {patterns.map(
                (pattern, index) => (
                  <div
                    className="pattern-card"
                    key={index}
                  >
                    <div className="pattern-top">
                      <span className="pattern-month">
                        {monthName(
                          pattern.month
                        )}
                      </span>

                      <span
                        className={
                          `pattern-strength ${
                            getPatternClass(
                              pattern.pattern_strength
                            )
                          }`
                        }
                      >
                        {pattern.pattern_strength}
                      </span>
                    </div>

                    <h3>
                      {pattern.complaint_category}
                    </h3>

                    <div className="pattern-stats">
                      <div>
                        <small>
                          Complaints
                        </small>

                        <strong>
                          {pattern.complaint_count.toLocaleString()}
                        </strong>
                      </div>

                      <div>
                        <small>
                          Normal Average
                        </small>

                        <strong>
                          {pattern.average_monthly_complaints.toLocaleString()}
                        </strong>
                      </div>

                      <div>
                        <small>
                          Seasonal Index
                        </small>

                        <strong>
                          {pattern.seasonal_index.toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    <div className="pattern-bar">
                      <div
                        style={{
                          width:
                            `${Math.min(
                              pattern.seasonal_index * 70,
                              100
                            )}%`,
                        }}
                      ></div>
                    </div>

                    <p className="pattern-description">
                      Complaint volume was{" "}
                      <strong>
                        {(
                          (pattern.seasonal_index - 1) *
                          100
                        ).toFixed(1)}
                        %
                      </strong>
                      {" "}
                      above the category's normal
                      monthly level.
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* CIVIC INSIGHTS */}
        {/* ================================================= */}

        <section className="insight-grid">
          <div className="insight-card">
            <div className="insight-icon">
              📊
            </div>

            <div>
              <h3>
                Data Coverage
              </h3>

              <p>
                CivicFlow analyzes{" "}
                <strong>
                  {Number(
                    summary?.total_complaints || 0
                  ).toLocaleString()}
                </strong>
                {" "}
                historical complaints across{" "}
                <strong>
                  {summary?.total_wards || 0}
                </strong>
                {" "}
                municipal wards.
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">
              ⚡
            </div>

            <div>
              <h3>
                Resolution Performance
              </h3>

              <p>
                Overall resolution rate is{" "}
                <strong>
                  {summary?.resolution_rate || 0}%
                </strong>
                {" "}
                with an average resolution time of{" "}
                <strong>
                  {summary?.avg_resolution_days || 0}
                  {" "}days
                </strong>.
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">
              🧠
            </div>

            <div>
              <h3>
                Data Mining
              </h3>

              <p>
                CivicFlow uses statistical anomaly
                detection and recurring-pattern analysis
                to identify useful civic trends.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <footer>
          CivicFlow • Public Service Intelligence Platform
        </footer>
      </main>
    </div>
  );
}

export default App;