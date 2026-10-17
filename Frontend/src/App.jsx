import { useEffect, useMemo, useState } from "react";
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
} from "recharts";

import "./App.css";
import ResolutionPredictor from "./ResolutionPredictor";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const COLORS = [
  "#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
  "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#e11d48", "#0ea5e9",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "complaints", label: "Complaints" },
  { id: "analytics", label: "Analytics" },
  { id: "datamining", label: "Data Mining" },
];

const GRID_STROKE = "#e8edf4";
const AXIS_TICK = { fontSize: 11, fill: "#758198" };
const AXIS_LINE = { stroke: "#e1e7f0" };
const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "1px solid #e6ebf2",
  boxShadow: "0 8px 24px rgba(25,42,70,.10)",
  fontSize: 12,
};

const monthName = (m) => MONTHS[Number(m) - 1] ?? m;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const compact = (v) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v);

// Accepts [..] or { data: [..] } and always returns an array
const toRows = (response) => {
  const d = response?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const getSeverity = (z) => (z >= 3 ? "High" : z >= 2.5 ? "Medium" : "Watch");

const getPatternClass = (strength) => {
  if (strength === "Strong Pattern") return "strong";
  if (strength === "Moderate Pattern") return "moderate";
  return "normal";
};

/* Small reusable pieces */

const ChartCard = ({ title, subtitle, badge, children }) => (
  <div className="card">
    <div className="card-header">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {badge}
    </div>
    {children}
  </div>
);

const SelectField = ({ label, value, onChange, children }) => (
  <div className="field">
    <label>{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  </div>
);

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

function App() {
  // Dashboard data
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [wards, setWards] = useState([]);
  const [yearly, setYearly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [monsoon, setMonsoon] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [patterns, setPatterns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [failedCount, setFailedCount] = useState(0);

  // OLAP
  const [olapGroupBy, setOlapGroupBy] = useState("year");
  const [olapYear, setOlapYear] = useState("");
  const [olapWard, setOlapWard] = useState("");
  const [olapCategory, setOlapCategory] = useState("");
  const [olapData, setOlapData] = useState([]);
  const [olapLoading, setOlapLoading] = useState(false);

  // Sidebar
  const [activeNav, setActiveNav] = useState("dashboard");

  const goTo = (id) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------------- Load dashboard ---------------- */

  useEffect(() => {
    const loadDashboard = async () => {
      const endpoints = [
        "dashboard/summary",
        "dashboard/category",
        "dashboard/wards",
        "dashboard/yearly",
        "dashboard/monthly",
        "dashboard/monsoon",
        "mining/anomalies",
        "mining/patterns",
      ];

      // allSettled: one failing endpoint no longer blanks the whole dashboard
      const results = await Promise.allSettled(endpoints.map((e) => axios.get(`${API}/${e}`)));

      const failed = results.filter((r) => r.status === "rejected");
      failed.forEach((r) => console.error("CivicFlow dashboard error:", r.reason));
      setFailedCount(failed.length);

      const rows = (i) => (results[i].status === "fulfilled" ? toRows(results[i].value) : []);

      if (results[0].status === "fulfilled") {
        setSummary(results[0].value.data?.data ?? results[0].value.data);
      }

      setCategories(
        rows(1)
          .map((item) => ({
            ...item,
            complaint_category:
              item.complaint_category ?? item.category ?? item.name ?? "Uncategorized",
            total_complaints: num(
              item.total_complaints ?? item.complaint_count ?? item.complaints ?? item.count
            ),
          }))
          .filter((item) => item.total_complaints > 0)
      );

      setWards(
        rows(2).map((item) => ({
          ...item,
          total_complaints: num(item.total_complaints),
          avg_resolution_days: num(item.avg_resolution_days),
          satisfaction_rate: num(item.satisfaction_rate),
        }))
      );

      setYearly(
        rows(3)
          .map((item) => ({
            ...item,
            year: Number(item.year ?? item.complaint_year ?? item.year_number),
            total_complaints: num(
              item.total_complaints ?? item.complaint_count ?? item.complaints ?? item.count
            ),
          }))
          .filter((item) => Number.isFinite(item.year))
          .sort((a, b) => a.year - b.year)
      );

      setMonthly(
        rows(4)
          .map((item) => ({
            ...item,
            month: num(item.month),
            total_complaints: num(item.total_complaints),
          }))
          .sort((a, b) => a.month - b.month)
      );

      setMonsoon(
        rows(5).map((item) => ({ ...item, total_complaints: num(item.total_complaints) }))
      );

      setAnomalies(
        rows(6).map((item) => ({
          ...item,
          complaint_month: num(item.complaint_month ?? item.month),
          complaint_count: num(item.complaint_count),
          avg_monthly_complaints: num(item.avg_monthly_complaints),
          z_score: num(item.z_score),
        }))
      );

      setPatterns(
        rows(7).map((item) => ({
          ...item,
          month: num(item.month),
          complaint_count: num(item.complaint_count),
          average_monthly_complaints: num(item.average_monthly_complaints),
          seasonal_index: num(item.seasonal_index),
        }))
      );

      setLoading(false);
    };

    loadDashboard();
  }, []);

  /* ---------------- Load OLAP ---------------- */

  useEffect(() => {
    let cancelled = false;

    const loadOlap = async () => {
      setOlapLoading(true);
      try {
        const params = { groupBy: olapGroupBy };
        if (olapYear) params.year = olapYear;
        if (olapWard) params.ward = olapWard;
        if (olapCategory) params.category = olapCategory;

        const response = await axios.get(`${API}/analytics/olap`, { params });
        if (cancelled) return;

        setOlapData(
          toRows(response).map((item) => ({
            ...item,
            total_complaints: num(item.total_complaints),
            avg_resolution_days: num(item.avg_resolution_days),
            resolved_complaints: num(item.resolved_complaints),
            resolution_rate: num(item.resolution_rate),
          }))
        );
      } catch (error) {
        console.error("CivicFlow OLAP error:", error);
        if (!cancelled) setOlapData([]);
      } finally {
        if (!cancelled) setOlapLoading(false);
      }
    };

    loadOlap();
    // ignore stale responses when filters change quickly
    return () => {
      cancelled = true;
    };
  }, [olapGroupBy, olapYear, olapWard, olapCategory]);

  /* ---------------- Highlight sidebar link while scrolling ---------------- */

  useEffect(() => {
    if (loading) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveNav(entry.target.id);
        });
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );

    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading]);

  /* ---------------- Derived data ---------------- */

  const topWards = useMemo(
    () => [...wards].sort((a, b) => b.total_complaints - a.total_complaints).slice(0, 10),
    [wards]
  );

  const formatOlapDimension = (value) =>
    olapGroupBy === "month" && !Number.isNaN(Number(value)) ? monthName(value) : value;

  const olapDimensionLabel =
    { year: "Year", month: "Month", ward: "Ward", category: "Category" }[olapGroupBy] || "Category";

  /* ---------------- Loading ---------------- */

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <h2>CivicFlow</h2>
        <p>Loading municipal intelligence...</p>
      </div>
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">C</div>
          <div>
            <h2>CivicFlow</h2>
            <span>Public Service Intelligence</span>
          </div>
        </div>

        <nav aria-label="Sections">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`nav-link ${activeNav === id ? "active" : ""}`}
              onClick={() => goTo(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <strong>Municipal Analytics</strong>
          <span>Powered by CivicFlow</span>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <header className="header" id="dashboard">
          <div>
            <p className="eyebrow">MUNICIPAL INTELLIGENCE</p>
            <h1>Civic Service Dashboard</h1>
            <p className="subtitle">
              Monitor complaints, resolution performance and civic service patterns.
            </p>
          </div>
          <div className="status">
            <span />
            Historical Data
          </div>
        </header>

        {failedCount > 0 && (
          <div className="alert" role="alert">
            {failedCount} data source{failedCount > 1 ? "s" : ""} could not be loaded. Some
            sections below may be empty. Check that the API is running.
          </div>
        )}

        {/* KPI CARDS */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <p>Total Complaints</p>
            <h2>{num(summary?.total_complaints).toLocaleString()}</h2>
            <span>Historical complaints</span>
          </div>

          <div className="kpi-card">
            <p>Resolved Complaints</p>
            <h2>{num(summary?.resolved_complaints).toLocaleString()}</h2>
            <span>Successfully resolved</span>
          </div>

          <div className="kpi-card">
            <p>Resolution Rate</p>
            <h2>{summary?.resolution_rate ?? 0}%</h2>
            <span>Overall performance</span>
          </div>

          <div className="kpi-card">
            <p>Avg. Resolution Time</p>
            <h2>
              {summary?.avg_resolution_days ?? 0}
              <small> days</small>
            </h2>
            <span>Average resolution</span>
          </div>

          <div className="kpi-card">
            <p>Wards Covered</p>
            <h2>{summary?.total_wards ?? 0}</h2>
            <span>Municipal wards</span>
          </div>

          <div className="kpi-card">
            <p>Complaint Categories</p>
            <h2>{summary?.total_categories ?? 0}</h2>
            <span>Service categories</span>
          </div>
        </section>

        {/* CATEGORY + YEARLY */}
        <section className="chart-grid">
          <ChartCard title="Complaint Categories" subtitle="Distribution of civic complaints">
            <div className="category-chart-area">
              {categories.length > 0 ? (
                <>
                  <div className="category-pie-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categories}
                          dataKey="total_complaints"
                          nameKey="complaint_category"
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          innerRadius="52%"
                          paddingAngle={2}
                          stroke="none"
                        >
                          {categories.map((item, index) => (
                            <Cell
                              key={`${item.complaint_category}-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value, name) => [Number(value).toLocaleString(), name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="category-legend" aria-label="Complaint category legend">
                    {categories.map((item, index) => (
                      <div
                        className="category-legend-item"
                        key={`${item.complaint_category}-legend-${index}`}
                      >
                        <span
                          className="category-legend-dot"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="category-legend-label" title={item.complaint_category}>
                          {item.complaint_category}
                        </span>
                        <strong>{item.total_complaints.toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <p>No category complaint data returned by the API.</p>
                </div>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Yearly Complaint Trend" subtitle="Complaints received by year">
            <div className="chart-box">
              {yearly.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearly} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="year" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
                    <YAxis
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={compact}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v) => [Number(v).toLocaleString(), "Complaints"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_complaints"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty-state">No yearly complaint data returned by the API.</div>
              )}
            </div>
          </ChartCard>
        </section>

        {/* MONTHLY + MONSOON */}
        <section className="chart-grid" id="complaints">
          <ChartCard title="Monthly Complaint Trend" subtitle="Seasonal complaint activity">
            <div className="chart-box">
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={monthName}
                      tick={AXIS_TICK}
                      axisLine={AXIS_LINE}
                      tickLine={false}
                    />
                    <YAxis
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={compact}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: "rgba(49,87,213,.06)" }}
                      labelFormatter={(v) => `Month: ${monthName(v)}`}
                      formatter={(v) => [Number(v).toLocaleString(), "Complaints"]}
                    />
                    <Bar dataKey="total_complaints" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty-state">No monthly data returned by the API.</div>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Monsoon Impact" subtitle="Complaint volume by season">
            <div className="chart-box">
              {monsoon.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monsoon} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="season" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
                    <YAxis
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={compact}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: "rgba(6,182,212,.07)" }}
                      formatter={(v) => [Number(v).toLocaleString(), "Complaints"]}
                    />
                    <Bar dataKey="total_complaints" fill="#06b6d4" radius={[5, 5, 0, 0]} maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty-state">No seasonal data returned by the API.</div>
              )}
            </div>
          </ChartCard>
        </section>

        {/* RESOLUTION TIME PREDICTOR */}
        <section id="resolution-predictor">
          <ResolutionPredictor />
        </section>

        {/* OLAP ANALYTICS */}
        <section className="card" id="analytics">
          <div className="card-header">
            <div>
              <h3>OLAP Analytics</h3>
              <p>Explore complaint data using roll-up, drill-down, slice and dice.</p>
            </div>
            <span className="section-badge">Data Warehouse</span>
          </div>

          <div className="olap-controls">
            <SelectField label="Analyze By" value={olapGroupBy} onChange={setOlapGroupBy}>
              <option value="year">Year</option>
              <option value="month">Month</option>
              <option value="ward">Ward</option>
              <option value="category">Category</option>
            </SelectField>

            <SelectField label="Year Filter" value={olapYear} onChange={setOlapYear}>
              <option value="">All Years</option>
              {yearly.map((item) => (
                <option key={item.year} value={item.year}>
                  {item.year}
                </option>
              ))}
            </SelectField>

            <SelectField label="Ward Filter" value={olapWard} onChange={setOlapWard}>
              <option value="">All Wards</option>
              {wards.map((item) => (
                <option key={item.ward_code} value={item.ward_code}>
                  {item.ward_code}
                </option>
              ))}
            </SelectField>

            <SelectField label="Category Filter" value={olapCategory} onChange={setOlapCategory}>
              <option value="">All Categories</option>
              {categories.map((item) => (
                <option key={item.complaint_category} value={item.complaint_category}>
                  {item.complaint_category}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="badge-row">
            <span className="section-badge">Roll-Up</span>
            <span className="section-badge">Drill-Down</span>
            <span className="section-badge">Slice</span>
            <span className="section-badge">Dice</span>
          </div>

          {olapLoading ? (
            <div className="empty-state">
              <h3>Loading OLAP analysis...</h3>
              <p>Querying the CivicFlow data warehouse.</p>
            </div>
          ) : olapData.length === 0 ? (
            <div className="empty-state">
              <h3>No OLAP data available</h3>
              <p>Try changing the selected filters.</p>
            </div>
          ) : (
            <div className="table-wrapper table-wrapper--scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{olapDimensionLabel}</th>
                    <th className="num">Complaints</th>
                    <th className="num">Avg. Resolution</th>
                    <th className="num">Resolved</th>
                    <th className="num">Resolution Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {olapData.map((item, index) => (
                    <tr key={`${item.dimension}-${index}`}>
                      <td>
                        <strong>{formatOlapDimension(item.dimension)}</strong>
                      </td>
                      <td className="num">{item.total_complaints.toLocaleString()}</td>
                      <td className="num">{item.avg_resolution_days} days</td>
                      <td className="num">{item.resolved_complaints.toLocaleString()}</td>
                      <td className="num">{item.resolution_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* WARD HOTSPOTS */}
        <section className="card">
          <div className="card-header">
            <div>
              <h3>Ward Complaint Hotspots</h3>
              <p>Areas with the highest complaint volume</p>
            </div>
            <span className="section-badge">Top 10</span>
          </div>

          <div className="chart-box chart-box--tall">
            {topWards.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topWards}
                  layout="vertical"
                  margin={{ top: 4, left: 8, right: 28, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={AXIS_TICK}
                    axisLine={AXIS_LINE}
                    tickLine={false}
                    tickFormatter={compact}
                  />
                  <YAxis
                    type="category"
                    dataKey="ward_code"
                    width={72}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "rgba(49,87,213,.06)" }}
                    formatter={(v) => [Number(v).toLocaleString(), "Complaints"]}
                  />
                  <Bar dataKey="total_complaints" fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">No ward data returned by the API.</div>
            )}
          </div>
        </section>

        {/* ANOMALY DETECTION */}
        <section className="card" id="datamining">
          <div className="card-header">
            <div>
              <h3>Anomaly Detection</h3>
              <p>Unusually high complaint volumes detected using statistical analysis.</p>
            </div>
            <div className="anomaly-badge">{anomalies.length} detected</div>
          </div>

          {anomalies.length === 0 ? (
            <div className="empty-state">
              <h3>No anomalies detected</h3>
              <p>Complaint volumes are within the expected range for every ward.</p>
            </div>
          ) : (
            <div className="table-wrapper table-wrapper--scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ward</th>
                    <th>Month</th>
                    <th className="num">Complaints</th>
                    <th className="num">Normal Average</th>
                    <th className="num">Z-Score</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((item, index) => {
                    const severity = getSeverity(item.z_score);
                    return (
                      <tr key={`${item.ward_code}-${item.complaint_month}-${index}`}>
                        <td>
                          <strong>{item.ward_code}</strong>
                        </td>
                        <td>{monthName(item.complaint_month)}</td>
                        <td className="num">{item.complaint_count.toLocaleString()}</td>
                        <td className="num">{item.avg_monthly_complaints.toLocaleString()}</td>
                        <td className="num">
                          <strong>{item.z_score.toFixed(2)}</strong>
                        </td>
                        <td>
                          <span className={`severity ${severity.toLowerCase()}`}>{severity}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RECURRING PATTERNS */}
        <section className="card">
          <div className="card-header">
            <div>
              <h3>Frequent &amp; Seasonal Complaint Patterns</h3>
              <p>
                Seasonal patterns identified by comparing monthly complaint volume with the normal
                category baseline.
              </p>
            </div>
            <div className="pattern-badge">{patterns.length} patterns</div>
          </div>

          {patterns.length === 0 ? (
            <div className="empty-state">
              <h3>No strong recurring patterns detected</h3>
              <p>
                The dataset does not show significant recurring category-month increases above the
                current detection threshold.
              </p>
            </div>
          ) : (
            <div className="pattern-grid">
              {patterns.map((pattern, index) => (
                <div className="pattern-card" key={`${pattern.complaint_category}-${pattern.month}-${index}`}>
                  <div className="pattern-top">
                    <span className="pattern-month">{monthName(pattern.month)}</span>
                    <span className={`pattern-strength ${getPatternClass(pattern.pattern_strength)}`}>
                      {pattern.pattern_strength}
                    </span>
                  </div>

                  <h3>{pattern.complaint_category}</h3>

                  <div className="pattern-stats">
                    <div>
                      <small>Complaints</small>
                      <strong>{pattern.complaint_count.toLocaleString()}</strong>
                    </div>
                    <div>
                      <small>Normal Average</small>
                      <strong>{pattern.average_monthly_complaints.toLocaleString()}</strong>
                    </div>
                    <div>
                      <small>Seasonal Index</small>
                      <strong>{pattern.seasonal_index.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="pattern-bar">
                    <div style={{ width: `${Math.min(Math.max(pattern.seasonal_index * 70, 0), 100)}%` }} />
                  </div>

                  <p className="pattern-description">
                    Complaint volume was{" "}
                    <strong>{((pattern.seasonal_index - 1) * 100).toFixed(1)}%</strong> above the
                    category's normal monthly level.
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer>CivicFlow • Public Service Intelligence Platform</footer>
      </main>
    </div>
  );
}

export default App;