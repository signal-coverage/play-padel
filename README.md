# ERPFlow

**ERPFlow** is a modular, multi-tenant ERP platform designed for healthcare organizations, built with React and Firebase.

It provides a shared Core for authentication, patient management, scheduling, billing, reporting, and role-based access control (RBAC), while extending functionality through a plugin-based architecture for medical specialties such as Dentistry, Nutrition, Psychology, Cardiology, and more.

Designed with scalability in mind, ERPFlow supports everyone from independent healthcare professionals to multi-specialty clinics, hospitals, and healthcare providers. Each organization can enable only the modules they need while sharing a secure, scalable SaaS infrastructure.

## Features

- 🏥 Multi-tenant SaaS architecture
- 🔐 Authentication with Role-Based Access Control (RBAC)
- 👥 Patient and Professional management
- 📅 Appointment scheduling and calendar
- 💳 Billing and payment management
- 📊 Customizable dashboard with dynamic widgets
- 🧩 Plugin-based architecture for medical specialties
- 📝 Audit logs and activity tracking
- ☁️ Firebase-powered backend (Authentication, Firestore, Storage, Cloud Functions)
- ⚛️ Built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui

## Tech Stack

**Frontend**

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- shadcn/ui

**Backend**

- Firebase Authentication
- Cloud Firestore
- Cloud Storage
- Cloud Functions

## Vision

ERPFlow aims to become a flexible ERP platform where the Core remains stable while new business domains are added as independent plugins. Although the first implementation focuses on healthcare, the long-term architecture is designed to support additional industries through the same modular foundation.

**Build once. Extend forever.**
