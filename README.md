# CivicFlow — Municipal Complaint Intelligence

CivicFlow is a municipal complaint analytics and data mining project designed to explore civic complaints, resolution performance, ward-level patterns, and municipal service delivery.

## Live Project Links

- **Frontend Application:** Verify the active production domain in Vercel and add it here.
- **Frontend Link(Vercel):** [https://civic-flow-zeta.vercel.app/](https://civic-flow-zeta.vercel.app/)
- **Backend API:** [https://civicflow-dejz.onrender.com](https://civicflow-dejz.onrender.com)
- **Dashboard Summary API:** [https://civicflow-dejz.onrender.com/api/dashboard/summary](https://civicflow-dejz.onrender.com/api/dashboard/summary)
- **GitHub Repository:** [https://github.com/Vansh-tws/CivicFlow](https://github.com/Vansh-tws/CivicFlow)

## Project Overview

CivicFlow provides a dashboard for viewing municipal complaint statistics and exploring complaint trends. It connects a React frontend to a Node.js backend and a PostgreSQL database hosted on Neon.

The project includes dashboard analytics, complaint information, data exploration, and a resolution prediction interface.

## Verified Dashboard Statistics

The deployed dashboard summary API returned the following figures during testing:

| Metric                  |      Value |
| ----------------------- | ---------: |
| Total complaints        |     50,000 |
| Resolved complaints     |     28,871 |
| Resolution rate         |     57.74% |
| Average resolution time | 13.84 days |
| Wards covered           |         24 |
| Complaint categories    |         13 |

These figures reflect the API response observed during deployment testing.

## Key Features

- Municipal complaint dashboard
- Complaint resolution statistics
- Ward and category analytics
- Complaint trend visualization
- Data mining and resolution prediction interface
- PostgreSQL-backed data storage and analytics

## Technology Stack

| Component          | Technology             |
| ------------------ | ---------------------- |
| Frontend           | React, Vite            |
| Backend            | Node.js, Express       |
| Database           | PostgreSQL, Neon       |
| Data visualization | Recharts               |
| Frontend hosting   | Vercel                 |
| Backend hosting    | Render                 |
| Version control    | Git, GitHub            |
| Data processing    | Python and SQL scripts |

## Repository Structure

```text
CivicFlow/
├── Backend/       # Backend API and server configuration
├── Database/      # Database schemas and warehouse SQL
├── Frontend/      # React application and components
├── Mining/        # Data processing and mining scripts
├── Data/          # Local datasets, subject to Git ignore rules
└── README.md      # Project documentation
```

## Local Setup

### Prerequisites

- Node.js and npm
- Git
- PostgreSQL database access

### 1. Clone the repository

```bash
git clone https://github.com/Vansh-tws/CivicFlow.git
cd CivicFlow
```

### 2. Install backend dependencies

```bash
cd Backend
npm install
```

Configure the backend database connection using environment variables. Keep database credentials private and never commit them to GitHub.

Start the backend:

```bash
node server.js
```

### 3. Install frontend dependencies

Open a separate terminal:

```bash
cd Frontend
npm install
```

For local development, create a `Frontend/.env` file containing:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Use this local API URL only when your backend is running locally on the configured port.

## Production Configuration

The frontend uses the `VITE_API_URL` environment variable to identify the backend API.

For the Vercel production environment, configure:

```env
VITE_API_URL=https://civicflow-dejz.onrender.com/api
```

Redeploy the frontend after changing environment variables.

Configure the database connection securely in Render's environment settings. Do not place passwords or connection strings in this README.

## Deployment Architecture

1. **GitHub** stores the source code.
2. **Vercel** hosts the frontend.
3. **Render** runs the backend API.
4. **Neon** hosts the PostgreSQL database.

Deployment behavior depends on the configuration of each hosting service.


## Author & Ownership

**CivicFlow — Civic Service Dashboard**

Created and developed by **Vansh Raut**.

This project demonstrates Data Warehousing, OLAP analysis,
SQL analytics, and data mining techniques for municipal
complaint data.

- GitHub: https://github.com/Vansh-tws/CivicFlow
- Backend: https://civicflow-1nmu.onrender.com/

Copyright (c) 2026 Vansh Raut.
All rights reserved unless otherwise stated in the project's license.

