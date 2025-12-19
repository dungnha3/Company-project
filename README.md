# 🏢 HR & Project Management System

> Multi-tenant SaaS platform for HR and Project Management

![Java](https://img.shields.io/badge/Java-17-orange?style=flat-square)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-green?style=flat-square)
![Flutter](https://img.shields.io/badge/Flutter-3.x-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18-cyan?style=flat-square)

## ✨ Features

- 👥 **HR Management** - Employee profiles, contracts, leave requests
- 📍 **GPS Attendance** - Location-based check-in/out
- 📊 **Project Management** - Agile/Scrum boards, task tracking
- 💬 **Real-time Chat** - Team messaging with file sharing
- 🤖 **AI Assistant** - Powered by Google Gemini
- 📱 **Cross-platform** - Web + Mobile (iOS/Android)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Spring Boot, SQL Server |
| Web | React, Vite |
| Mobile | Flutter |
| Real-time | Firebase (Firestore) |
| AI | Google Gemini API |

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- Flutter 3.x
- SQL Server

### Setup

```bash
# Clone
git clone https://github.com/your-username/repo-name.git

# Backend
cd BE/BE
cp ../../.env.example ../../.env  # Edit .env with your values
./mvnw spring-boot:run

# Frontend
cd frontend-web
npm install && npm run dev

# Mobile
cd mobile
flutter pub get && flutter run
```

## 📁 Project Structure

```
├── BE/              # Spring Boot Backend
├── frontend-web/    # React Web App
├── mobile/          # Flutter Mobile App
├── docs/            # Documentation
└── .env.example     # Environment template
```

## 📖 Documentation

- [API Documentation](docs/gemini.md)
- [Architecture Plan](docs/multitenant_plan.md)
- [Firebase Integration](docs/firebase_integration_plan.md)

## 👥 Team

- 4 contributors

## ⚠️ Security Note

Never commit `.env` files or API keys. See `.env.example` for required variables.

---

*This project is under active development. Structure may change significantly.*
