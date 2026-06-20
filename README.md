# 🏥 SHIIS — Smart Healthcare & Inventory Intelligence System

A production-ready full-stack healthcare management platform with modular architecture.

## Tech Stack

| Layer    | Technology                         |
| -------- | ---------------------------------- |
| Frontend | React 18 (Vite) + Tailwind CSS v4  |
| Backend  | NestJS 11 (TypeScript)             |
| Database | Microsoft SQL Server (SQL Express) |
| ORM      | TypeORM                            |
| HTTP     | Axios                              |
| Icons    | Lucide React                       |

## Project Structure

```
shiis/
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── config/          # Database & app configuration
│   │   ├── common/          # Filters, interceptors, pipes
│   │   └── modules/         # Feature modules
│   │       ├── patient/     # ✅ Complete
│   │       ├── doctor/      # ✅ Pending
│   │       ├── appointment/ # ✅ Pending
│   │       └── ...
│   └── .env
├── frontend/                # React Vite client
│   ├── src/
│   │   ├── api/             # Axios instance + service layer
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level pages by module
│   │   └── App.jsx          # Router setup
│   └── .env
└── database/                # SQL scripts (schema + SPs)
```

## Quick Start

### Prerequisites

- Node.js 18+
- SQL Server Express (instance: `PLUS\SQLEXPRESS`)
- Database `HealthcareInventoryDB` already created

### Backend

```bash
cd backend
npm install
npm run start:dev       # http://localhost:3000/api
```

### Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## API Endpoints — Patient Module

| Method   | Endpoint            | Description      |
| -------- | ------------------- | ---------------- |
| `GET`    | `/api/patients`     | List (paginated) |
| `GET`    | `/api/patients/:id` | Get by ID        |
| `POST`   | `/api/patients`     | Create           |
| `PATCH`  | `/api/patients/:id` | Update           |
| `DELETE` | `/api/patients/:id` | Delete           |

## System Modules

- ✅ User Management
- ✅ Patient Management
- ✅ Doctor Management
- ✅ Appointment System
- ✅ Prescription System
- ✅ Inventory & Medicine
- ✅ Supplier & Purchase Orders
- ✅ Billing System
- ✅ Lab Management
- ✅ BI Dashboard

## Environment Variables

See `.env.example` in both `backend/` and `frontend/` directories.
