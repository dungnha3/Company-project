# 🏢 Gemini ERP - Multi-tenant SaaS Platform

> Enterprise HR & Project Management System with Dual Workspace Architecture

![Java](https://img.shields.io/badge/Java-17-orange?style=flat-square)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-green?style=flat-square)
![React](https://img.shields.io/badge/React-18-cyan?style=flat-square)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-blue?style=flat-square)

## ✨ Core Features

### 🏠 Dual Workspace
- **Personal Workspace** - Individual task & project management
- **Company Workspace** - Team collaboration with role-based access

### 👥 HR Management
- Employee profiles & contracts
- GPS-based attendance tracking
- Leave request workflow
- Salary management

### 📊 Project Management
- Kanban boards & Sprints
- Issue tracking (Jira-like)
- Gantt chart timeline

### 💬 Communication
- Real-time team chat
- File sharing & storage
- Notifications

### 🔐 SaaS Features
- Multi-tenant architecture
- 4-tier pricing (FREE, STARTER, PRO, ENTERPRISE)
- Feature gating (Plan + Company Settings)
- System Admin dashboard

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Spring Boot 3.5, Spring Security, JWT |
| **Database** | SQL Server (Multi-tenant) |
| **Frontend** | React 18, Vite, TailwindCSS |
| **State** | Zustand |
| **API** | RESTful + WebSocket |

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- SQL Server

### Backend
```bash
cd BE/BE
cp ../../.env.example ../../.env  # Configure database & secrets
./mvnw spring-boot:run
```

### Frontend
```bash
cd frontend-web-v2
npm install
npm run dev
```

## 📁 Project Structure

```
├── BE/BE/                   # Spring Boot Backend
│   ├── src/main/java/DoAn/BE/
│   │   ├── auth/            # Authentication & JWT
│   │   ├── company/         # Company, Settings, Plan
│   │   ├── hrm/             # HR module
│   │   ├── project/         # Project management
│   │   ├── chat/            # Messaging
│   │   └── common/          # Shared utilities
│   └── docs/                # API documentation
│
├── frontend-web-v2/         # React SPA (NEW)
│   ├── src/
│   │   ├── app/router/      # Routes & Guards
│   │   ├── pages/           # Page components
│   │   ├── shared/stores/   # Zustand stores
│   │   └── layouts/         # Layout components
│
└── frontend-web/            # Legacy React app
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [gemini_entities.md](BE/BE/docs/gemini_entities.md) | Database schema |
| [gemini_services.md](BE/BE/docs/gemini_services.md) | API endpoints |

## 🔐 Security

### Authentication
- JWT Bearer tokens
- Google OAuth 2.0
- Refresh token rotation

### Authorization
- Role-based access control (RBAC)
- Company-level roles: OWNER, ADMIN, MANAGER_HR, MANAGER_PROJECT, MEMBER
- System Admin for platform management

### Feature Gating (3 Layers)
1. **Frontend Sidebar** - Hides disabled features
2. **Frontend FeatureGuard** - Blocks direct URL access
3. **Backend FeatureFlagService** - Returns 403 if disabled

## 👤 User Roles

| Role | Scope | Capabilities |
|------|-------|--------------|
| **System Admin** | Platform | Manage all companies, change plans |
| **Owner** | Workspace | Full control of workspace |
| **Admin** | Workspace | Manage members, settings |
| **Manager HR** | Workspace | HR operations |
| **Member** | Workspace | Basic features |

## ⚠️ Environment Variables

Copy `.env.example` to `.env` and configure:
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

*Built with ❤️ for enterprise productivity*
