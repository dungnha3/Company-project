# Company-project

A multi-tenant SaaS platform I built for my graduation project. It handles HR management and project tracking for small-to-medium businesses.

## What it does

**HR side:**
- Employee records, contracts, and org chart
- Leave requests with 2-step approval (PM → Accounting)
- Attendance tracking with GPS validation
- Salary calculation based on attendance data

**Project side:**  
- Kanban boards and sprint planning
- Issue tracking similar to Jira
- Time logging per task
- Basic Gantt chart view

**Platform features:**
- Multi-company support (each company is isolated)
- 4 pricing tiers with feature gating
- Real-time chat between team members
- File storage with folder organization

## Tech I used

| Part | Stack |
|------|-------|
| Backend | Spring Boot 3.5, JPA/Hibernate, Spring Security |
| Database | SQL Server with tenant filtering |
| Frontend | React 18 + Vite, TailwindCSS, Zustand |
| Auth | JWT + refresh tokens, Google OAuth |
| Real-time | WebSocket for chat and notifications |

## How to run

**Backend:**
```bash
cd BE
# Set up .env with your DB credentials
./mvnw spring-boot:run
```

**Frontend:**
```bash
cd frontend-web-v2
npm install
npm run dev
```

## Project layout

```
BE/
├── src/main/java/DoAn/BE/
│   ├── auth/       # JWT, login, OAuth
│   ├── company/    # Multi-tenant logic, plans
│   ├── hrm/        # Employees, leaves, salary
│   ├── project/    # Issues, sprints, boards
│   ├── chat/       # WebSocket messaging
│   └── common/     # Shared stuff (exceptions, utils)

frontend-web-v2/
├── src/
│   ├── pages/      # Route-based pages
│   ├── features/   # Feature modules
│   ├── shared/     # Reusable components, stores
│   └── layouts/    # Dashboard, auth layouts
```

## Some implementation details

**Multi-tenancy:** Each request carries a company ID in JWT. A Hibernate filter automatically scopes all queries to that company.

**Role system:** Users can belong to multiple companies with different roles. Roles are: Owner, Admin, HR Manager, Project Manager, Member.

**Feature flags:** 3-layer check - sidebar hides disabled features, route guards block direct access, backend throws 403 if someone bypasses frontend.

**Caching:** Used Caffeine for frequently accessed data (departments, positions). Redis available for distributed setup.

## What I learned

- Designing multi-tenant architecture from scratch
- Handling complex authorization (company roles + fine-grained permissions)
- Optimizing JPA queries (N+1 problems, batch fetching)
- Building real-time features with WebSocket

## Notes

This is a graduation project, not production-ready. Some corners were cut for time constraints, but the core architecture is solid.
