# Gemini Backend - Enterprise Management System

## Overview
A multi-tenant SaaS backend for enterprise management, built with Spring Boot 3.x.

### Features
- **Multi-Tenant Architecture**: Isolated data per company
- **HRM Module**: Employee, Attendance, Leave, Salary, Contracts
- **Project Management**: Projects, Sprints, Issues (Kanban/Scrum)
- **Real-time Chat**: Rooms, Messages, Reactions, Meetings
- **File Storage**: Local or MinIO storage with versioning
- **AI Assistant**: Gemini-powered project assistant
- **Granular Permissions**: Multi-role support with custom user overrides

---

## Tech Stack
| Component | Technology |
|-----------|------------|
| Framework | Spring Boot 3.5.6 |
| Language | Java 21 |
| Database | SQL Server |
| Auth | JWT (30min access, 7d refresh) |
| Cache | In-memory (Redis-ready) |
| Storage | Local / MinIO |

---

## Quick Start

### Prerequisites
- Java 21+
- SQL Server
- Maven 3.8+

### Setup
1. Copy configuration:
   ```bash
   cp src/main/resources/application.properties.example src/main/resources/application.properties
   ```

2. Update `application.properties`:
   ```properties
   spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=YOUR_DB
   spring.datasource.username=YOUR_USER
   spring.datasource.password=YOUR_PASSWORD
   jwt.secret=YOUR_SECRET_KEY
   ```

3. Run:
   ```bash
   ./mvnw spring-boot:run
   ```

4. Access API: `http://localhost:8080/api`

---

## Documentation

| File | Description |
|------|-------------|
| [CLAUDE.md](docs/CLAUDE.md) | AI assistant quick reference |
| [gemini_entities.md](docs/gemini_entities.md) | Entity & data structure docs |
| [gemini_services.md](docs/gemini_services.md) | API & service docs |

---

## Project Structure
```
src/main/java/DoAn/BE/
├── ai/              # AI Assistant (Gemini)
├── audit/           # Audit logging
├── auth/            # Authentication & JWT
├── chat/            # Real-time messaging
├── common/          # Shared utilities & config
├── company/         # Multi-tenant company management
├── hrm/             # Human Resource Management
├── notification/    # Notifications
├── project/         # Project & Issue tracking
├── storage/         # File storage
└── user/            # User management
```

---

## Security Features
- ✅ JWT Authentication (30min expiry)
- ✅ Rate Limiting (50 req/min per IP)
- ✅ XSS Protection (Input sanitization)
- ✅ HTTPS Ready (Forward headers configured)
- ✅ Multi-tenant Isolation (Automatic tenant filtering)
- ✅ Multi-Role Access Control (User can have multiple roles)

---

## API Authentication
```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Use token
curl http://localhost:8080/api/users \
  -H "Authorization: Bearer <token>" \
  -H "X-Company-Id: 1"
```

---

## Default Credentials
After first run, default users are created:

| Username | Role | Notes |
|----------|------|-------|
| `sysadmin` | System Admin | Full system access |
| `admin` | Company Admin | Per-company admin |
| `hr_manager` | HR Manager | HRM module access |
| `employee` | Employee | Basic access |

> ⚠️ **Change passwords in production!**

---

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USERNAME` | Database user | nhombay |
| `DB_PASSWORD` | Database password | (required) |
| `JWT_SECRET` | JWT signing key | (required) |
| `GEMINI_API_KEY` | Google Gemini API key | (optional) |

---

## License
Proprietary - All rights reserved
