# CivicFlow

> Municipal Complaint Analytics Platform using Data Warehousing, OLAP and Data Mining

CivicFlow is a data-driven municipal complaint analytics platform designed to transform large-scale civic complaint data into meaningful insights for better understanding of complaint volume, resolution performance, seasonal trends, ward-level issues, anomalies and recurring complaint patterns.

The project demonstrates a practical **Data Warehousing and Data Mining (DWM)** workflow using data cleaning, ETL, dimensional modeling, Star Schema, OLAP analytics, statistical anomaly detection and pattern analysis through an interactive web dashboard.

---

## 🚀 Live Demo

### 🌐 Frontend
https://civic-flow-phi.vercel.app/

### ⚙️ Backend API
https://civicflow-1nmu.onrender.com/

### 💻 GitHub Repository
https://github.com/Vansh-tws/CivicFlow

---

## 📌 Project Overview

Municipal organizations receive a large number of complaints related to roads, water supply, drainage, waste management, street lights, illegal construction and other civic services.

Raw complaint data alone is difficult to analyze efficiently.

CivicFlow provides an analytical platform that converts large-scale complaint data into structured information using:

- Data Cleaning
- ETL Processing
- Data Warehousing
- Star Schema
- OLAP Operations
- Statistical Data Mining
- Anomaly Detection
- Seasonal Pattern Analysis
- Interactive Visualization

The goal is to help identify:

- Which complaint categories occur most frequently?
- Which wards receive the highest number of complaints?
- How does resolution performance vary?
- How does monsoon season affect complaints?
- Which complaint patterns are recurring?
- Which wards/months show unusual complaint spikes?

---

# 🎯 Objectives

The main objectives of CivicFlow are:

1. Clean and preprocess large-scale municipal complaint data.
2. Build a structured analytical data warehouse.
3. Implement a formal Star Schema.
4. Perform OLAP analysis on complaint data.
5. Analyze complaint trends across years, months, wards and categories.
6. Identify unusual complaint spikes using statistical anomaly detection.
7. Detect recurring and seasonal complaint patterns.
8. Present analytical results through an interactive dashboard.
9. Provide a deployable full-stack application suitable for academic and placement demonstrations.

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │   Raw Civic Dataset  │
                    │    BMC Complaints    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Data Cleaning      │
                    │       & ETL          │
                    │      Python/Pandas   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Staging Dataset    │
                    │ civic_complaints     │
                    └──────────┬───────────┘
                               │
                               ▼
              ┌────────────────────────────────────┐
              │          DATA WAREHOUSE             │
              │                                    │
              │           Star Schema              │
              │                                    │
              │         fact_complaints            │
              │                │                   │
              │     ┌──────────┼──────────┐        │
              │     ▼          ▼          ▼        │
              │ dim_date   dim_ward   dim_category │
              │                         │          │
              │                  dim_department    │
              └────────────────┬───────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    OLAP Analytics    │
                    │                      │
                    │ Roll-Up              │
                    │ Drill-Down           │
                    │ Slice                │
                    │ Dice                 │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Data Mining      │
                    │                      │
                    │ Anomaly Detection    │
                    │ Pattern Analysis     │
                    │ Seasonal Analysis    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Interactive Web      │
                    │ Dashboard            │
                    │ React + Recharts     │
                    └──────────────────────┘