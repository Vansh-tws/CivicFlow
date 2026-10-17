
import { useState } from "react";
import axios from "axios";
import "./ResolutionPredictor.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://civicflow-dejz.onrender.com/api";

const INITIAL_VALUES = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  is_monsoon_season: 1,
  ward_slum_percentage: 20,
  prior_complaints_count: 3,
  infrastructure_age_years: 10,
  months_since_last_maintained: 6,
  complaint_category: "Pothole/Road Damage",
  complaint_channel: "MyBMC App",
  ward_code: "A",
  zone: "Island City",
  ward_type: "Residential",
  population_density: "High",
  complaint_time_of_day: "Morning",
  has_photo_evidence: "Yes",
  has_gps_location: "Yes",
  complainant_type: "Individual",
  property_type: "Road",
  repeat_complainant: "No",
  department_assigned: "Roads",
  contractor_category: "Municipal",
};

const NUMERIC_FIELDS = [
  "year",
  "month",
  "is_monsoon_season",
  "ward_slum_percentage",
  "prior_complaints_count",
  "infrastructure_age_years",
  "months_since_last_maintained",
];

const FIELD_LABELS = {
  year: "Year",
  month: "Month",
  is_monsoon_season: "Monsoon season",
  ward_slum_percentage: "Ward slum percentage",
  prior_complaints_count: "Prior complaints",
  infrastructure_age_years: "Infrastructure age (years)",
  months_since_last_maintained: "Months since maintenance",
  complaint_category: "Complaint category",
  complaint_channel: "Complaint channel",
  ward_code: "Ward code",
  zone: "Zone",
  ward_type: "Ward type",
  population_density: "Population density",
  complaint_time_of_day: "Time of day",
  has_photo_evidence: "Photo evidence",
  has_gps_location: "GPS location",
  complainant_type: "Complainant type",
  property_type: "Property type",
  repeat_complainant: "Repeat complainant",
  department_assigned: "Assigned department",
  contractor_category: "Contractor category",
};

const OPTIONS = {
  month: [
    "1", "2", "3", "4", "5", "6",
    "7", "8", "9", "10", "11", "12",
  ],
  is_monsoon_season: ["1", "0"],
  complaint_category: [
    "Pothole/Road Damage",
    "Water Supply Disruption",
    "Solid Waste / Garbage",
    "Drainage Overflow / Flooding",
  ],
  complaint_channel: [
    "MyBMC App",
    "Website",
    "Phone",
    "Email",
  ],
  ward_type: [
    "Residential",
    "Commercial",
    "Mixed",
  ],
  population_density: [
    "Low",
    "Medium",
    "High",
  ],
  complaint_time_of_day: [
    "Morning",
    "Afternoon",
    "Evening",
    "Night",
  ],
  has_photo_evidence: ["Yes", "No"],
  has_gps_location: ["Yes", "No"],
  repeat_complainant: ["Yes", "No"],
  complainant_type: [
    "Individual",
    "Organization",
  ],
  property_type: [
    "Road",
    "Drainage",
    "Water",
    "Public Space",
  ],
  department_assigned: [
    "Roads",
    "Water",
    "Drainage",
    "Solid Waste",
  ],
  contractor_category: [
    "Municipal",
    "Private",
    "None",
  ],
  zone: [
    "Island City",
    "Eastern",
    "Western",
  ],
};

const MAIN_FIELDS = [
  "complaint_category",
  "ward_code",
  "month",
  "complaint_channel",
  "has_photo_evidence",
  "has_gps_location",
];

const ADVANCED_FIELDS = [
  "year",
  "is_monsoon_season",
  "ward_slum_percentage",
  "prior_complaints_count",
  "infrastructure_age_years",
  "months_since_last_maintained",
  "zone",
  "ward_type",
  "population_density",
  "complaint_time_of_day",
  "complainant_type",
  "property_type",
  "repeat_complainant",
  "department_assigned",
  "contractor_category",
];

export default function ResolutionPredictor() {
  const [form, setForm] = useState(INITIAL_VALUES);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPrediction(null);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setPrediction(null);
    setError("");

    try {
      const complaint = { ...form };

      NUMERIC_FIELDS.forEach((field) => {
        complaint[field] = Number(complaint[field]);
      });

      if (
        !Number.isInteger(complaint.year) ||
        complaint.year < 1900 ||
        complaint.year > 2200
      ) {
        throw new Error("Enter a valid year in Advanced Details.");
      }

      if (
        !Number.isInteger(complaint.month) ||
        complaint.month < 1 ||
        complaint.month > 12
      ) {
        throw new Error("Month must be between 1 and 12.");
      }

      for (const field of NUMERIC_FIELDS.slice(2)) {
        if (!Number.isFinite(complaint[field]) ||
            complaint[field] < 0) {
          throw new Error(
            `Enter a valid non-negative number for ${FIELD_LABELS[field]}.`
          );
        }
      }

      if (
        complaint.is_monsoon_season !== 0 &&
        complaint.is_monsoon_season !== 1
      ) {
        throw new Error("Monsoon season must be 1 or 0.");
      }

      const response = await axios.post(
        `${API}/mining/predict-resolution`,
        complaint
      );

      const days =
        response.data?.estimated_resolution_days;

      if (
        typeof days !== "number" ||
        !Number.isFinite(days)
      ) {
        throw new Error(
          "The server returned an invalid prediction."
        );
      }

      setPrediction(days);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Unable to predict resolution time."
      );
    } finally {
      setLoading(false);
    }
  }

  function renderField(name) {
    const options = OPTIONS[name];

    return (
      <label className="rp-field" key={name}>
        <span>{FIELD_LABELS[name]}</span>

        {options ? (
          <select
            name={name}
            value={form[name]}
            onChange={handleChange}
            required
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {name === "month"
                  ? new Date(2000, Number(option) - 1).toLocaleString(
                      "en",
                      { month: "long" }
                    )
                  : name === "is_monsoon_season"
                  ? option === "1" ? "Yes" : "No"
                  : option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={name === "ward_code" ? "text" : "number"}
            name={name}
            value={form[name]}
            onChange={handleChange}
            required
            min={
              name === "year" ? 1900 :
              name === "ward_slum_percentage" ? 0 :
              name === "prior_complaints_count" ? 0 :
              name === "infrastructure_age_years" ? 0 :
              name === "months_since_last_maintained" ? 0 :
              undefined
            }
            max={name === "year" ? 2200 : undefined}
          />
        )}
      </label>
    );
  }

  return (
    <section
      className="card rp-card"
      id="resolution-predictor"
    >
      <div className="card-header">
        <div>
          <h3>🤖 ML Resolution-Time Predictor</h3>
          <p>
            Estimate how long a civic complaint may take to resolve.
          </p>
        </div>

        <span className="section-badge">
          Machine Learning
        </span>
      </div>

      <div className="rp-notice">
        Enter the six main details below. Expand Advanced Details
        to review or change the remaining model features.
        All 21 required features are sent to the trained model.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rp-grid">
          {MAIN_FIELDS.map(renderField)}
        </div>

        <details
          className="rp-advanced"
          open={advancedOpen}
          onToggle={(event) =>
            setAdvancedOpen(event.currentTarget.open)
          }
        >
          <summary>More complaint details (15 fields)</summary>

          <div className="rp-grid">
            {ADVANCED_FIELDS.map(renderField)}
          </div>
        </details>

        <button
          className="rp-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Calculating prediction..."
            : "Predict Resolution Time"}
        </button>
      </form>

      {prediction !== null && (
        <div className="rp-result" role="status">
          <span>Estimated resolution time</span>
          <strong>{prediction.toFixed(1)} days</strong>
          <p>
            This is a model estimate, not a guaranteed
            resolution date. The model's test MAE was
            approximately 7.51 days.
          </p>
        </div>
      )}

      {error && (
        <div className="rp-error" role="alert">
          <strong>Prediction failed</strong>
          <p>{error}</p>
        </div>
      )}

      <p className="rp-note">
        Hidden fields retain their current default values until
        you expand Advanced Details. These defaults may not match
        a real complaint, which can affect prediction accuracy.
        Assigned department and contractor information may also
        be unavailable at initial submission.
      </p>
    </section>
  );
}
