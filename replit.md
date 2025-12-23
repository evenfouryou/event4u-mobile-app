# Event4U Management System

## Overview
Event4U is an event management and inventory tracking system designed for event organizers. It facilitates multi-role management of events, inventory, and stations, complete with real-time consumption tracking. The system is built around a company-centric hierarchy and features role-based access control, email verification, AI-powered analytics, intelligent purchase order management, and multi-bartender station assignments. Its primary goal is to streamline event logistics, optimize inventory, and provide actionable business intelligence. The project aims to improve efficiency and decision-making for event organizers.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is developed using React 18, TypeScript, and Vite. It utilizes Wouter for routing and Shadcn UI (built on Radix UI and Tailwind CSS) for UI components, adhering to Material Design 3 principles. State management is handled by TanStack Query v5, and form management employs React Hook Form with Zod for validation. The design aesthetic is a dark, nightclub-themed UI featuring glass-morphism effects, Framer Motion animations, card-based layouts, responsive grids, and fixed sidebar navigation. The system also supports Progressive Web App (PWA) functionality with a `manifest.json` and a Service Worker (`sw.js`) for caching and offline support.

### Backend
The backend is built with Node.js and Express.js, written in TypeScript with ESM. It provides RESTful APIs, incorporates centralized error handling, and uses session-based authentication. Drizzle ORM is utilized for type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first approach and a repository pattern. The project maintains a monorepo structure with distinct development and production environments.

### Authentication & Authorization
The system supports Replit OAuth and email/password registration, with BCrypt hashing for passwords and email verification. Session management is handled by `express-session` with a PostgreSQL store. Authorization is role-based (RBAC), encompassing `super_admin`, `gestore`, `organizer`, `warehouse`, and `bartender` roles. Security measures include HTTP-only secure cookies, encrypted sessions, API middleware for role checks, and company-scoped data access to ensure multi-tenancy.

### Data Model & Business Logic
The core data model connects Companies to Users, Locations, Events, Products, and Price Lists. Events include Stations with inventory tracking through Stocks and Stock Movements, covering loading, transfer, allocation, consumption, and returns. Events transition through `draft`, `scheduled`, `ongoing`, and `closed` states. Key features include email verification, AI analytics for inventory and consumption, a step-by-step event creation wizard, and purchase order management.

### SIAE Ticketing Module
This module provides a SIAE-compliant ticketing and fiscal management system tailored for Italian clubs, adhering to Italian fiscal regulations. It includes a comprehensive database schema for reference data, fiscal compliance, customer management, ticketing, transactions, and operations. API endpoints manage CRUD operations for reference data, activation cards, customer registration, ticket emission with fiscal seals, transaction processing, and XML transmission tracking. The frontend offers extensive management for all module functionalities. Fiscal seal generation is server-side and mandatory for ticket emission, utilizing a Desktop Bridge Relay System for interaction with physical smart cards. This module is disabled by default and can be enabled per `gestore` user by a Super Admin. It also includes CAPTCHA integration for ticket purchases to comply with SIAE regulations.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) for event operations, providing tabbed navigation for Overview (KPIs, activity log, entrance charts, venue map), Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance. It features `KPICard` for real-time metrics, `EntranceChart`, `VenueMap`, `ActivityLogEntry`, `AlertBanner`, and `QuickActionButton` for rapid actions, with real-time updates powered by WebSockets.

### Desktop Bridge Relay System
A WebSocket relay system designed to enable remote smart card reader access from a desktop Electron app to the web application. It comprises a server relay (`/ws/bridge`), an Electron desktop application, and a frontend `SmartCardService`. Authentication is token-based for desktop apps and session-based for web clients, with company-scoped message routing.

### Scanner Management Module
A dedicated system for managing event scanner operators, accessible to `gestore`/`super_admin` users. It supports scanner account creation with minimal fields, offers a mobile-optimized UI, and allows granular event assignment with permissions for list, table, and ticket scanning (including specific sectors/types). Security includes company-scoped data access and sanitized API responses.

### School Badge Manager Module
A digital badge creation system for schools and organizations, accessible to `gestore`/`admin` users. It allows creation of custom branded landing pages for badge applications, email verification, QR code generation for unique badges, and a public view page for generated badges. Organizers can manage and activate/deactivate landing pages, and the module supports custom domains.

## External Dependencies

### Third-Party Services
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **Google Fonts CDN**: For typography.
-   **SMTP Email**: For email verification and password reset functionalities.
-   **Replit OAuth**: Optional authentication integration.
-   **OpenAI API**: For AI analytics (`gpt-4o-mini`).
-   **MSG91 OTP**: For SMS OTP verification for customer phone validation.

### Key NPM Packages
-   **UI Components**: `@radix-ui/*`, `shadcn/ui`.
-   **Forms & Validation**: `react-hook-form`, `zod`, `@hookform/resolvers`.
-   **Data Fetching**: `@tanstack/react-query`.
-   **Database**: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`.
-   **Authentication**: `passport`, `openid-client`, `express-session`, `bcryptjs`.
-   **Charts**: `recharts`.
-   **File Processing**: `papaparse` (CSV), `jspdf` (PDF), `exceljs` (Excel).
-   **QR Code**: `qrcode` for generating QR code data URLs.
-   **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.
-   **Mobile App**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` for iOS native app packaging.