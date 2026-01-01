# Event4U Management System

## Overview
Event4U is an event management and inventory tracking system designed to streamline event logistics, optimize inventory, and provide actionable business intelligence for event organizers. It supports multi-role management of events, inventory, and stations with real-time consumption tracking. Key capabilities include a company-centric hierarchy, role-based access control, AI-powered analytics, intelligent purchase order management, multi-bartender station assignments, and an advanced SIAE-compliant ticketing module for Italian fiscal regulations. The system aims to enhance efficiency and decision-making in event operations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18, TypeScript, and Vite, with Wouter for routing and Shadcn UI (Radix UI, Tailwind CSS) for components, adhering to Material Design 3. State management is via TanStack Query v5, and forms use React Hook Form with Zod validation. The UI features a dark, nightclub-themed aesthetic with glass-morphism, Framer Motion animations, card-based layouts, responsive grids, and fixed sidebar navigation. It supports PWA functionality for caching and offline support.

### Backend
Built with Node.js and Express.js in TypeScript (ESM), the backend provides RESTful APIs with centralized error handling and session-based authentication. Drizzle ORM is used for type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first and repository pattern within a monorepo structure.

### Authentication & Authorization
The system supports Replit OAuth and email/password registration with BCrypt hashing and email verification. Session management uses `express-session` with a PostgreSQL store. Role-Based Access Control (RBAC) includes `super_admin`, `gestore`, `organizer`, `warehouse`, and `bartender` roles. Security measures include HTTP-only secure cookies, encrypted sessions, API middleware for role checks, and company-scoped data access for multi-tenancy.

### Data Model & Business Logic
The core data model links Companies to Users, Locations, Events, Products, and Price Lists. Events include Stations with inventory tracking (Stocks, Stock Movements) covering loading, transfer, allocation, consumption, and returns. Events transition through `draft`, `scheduled`, `ongoing`, and `closed` states. Core features include email verification, AI analytics for inventory/consumption, an event creation wizard, and purchase order management.

### SIAE Ticketing Module
A SIAE-compliant ticketing and fiscal management system for Italian clubs, adhering to Italian fiscal regulations. It manages reference data, fiscal compliance, customer management, ticketing, transactions, and operations. API endpoints handle CRUD for reference data, activation cards, customer registration, ticket emission with fiscal seals, transaction processing, and XML transmission tracking. Fiscal seal generation is server-side via a Desktop Bridge Relay System. This module is disabled by default and can be enabled per `gestore` user by a Super Admin. It also includes CAPTCHA integration and handles C1 (Registro Titoli di Accesso) and RCA (Riepilogo Controllo Accessi) XML reports with specific generation logic and DTD validation. An event approval workflow is in place for SIAE ticketed events.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) with tabbed navigation for Overview (KPIs, activity log, entrance charts, venue map), Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance, featuring real-time updates via WebSockets.

### Interactive Floor Plan Viewer
The public event detail page (`/public/event/:id`) features an interactive floor plan viewer for seat/sector selection with pointer-centered zoom, pinch-to-zoom, drag-to-pan, zoom controls, hover tooltips, and auto-zoom to zones on click.

### Advanced Ticketing System
A real-time ticketing system featuring a distributed seat hold management with real-time seat locking and WebSocket updates. It includes a visual floor plan editor with SVG canvas and polygon drawing for zones, supporting draft/publish versioning. Smart Assist and a heatmap overlay provide occupancy recommendations and an operational mode for staff.

### Event Page 3.0 Editor
An admin tool for customizing public event pages with modular blocks, managing event configuration, lineup artists, timeline items, and FAQs through dedicated database tables.

### Desktop Bridge Relay System
A WebSocket relay system (`/ws/bridge`) enables remote smart card reader access from a desktop Electron app to the web application. It supports token-based authentication and company-scoped message routing. This system facilitates digital signatures for SIAE C1 reports using PKI functionality, manages signature error handling, and handles SIAE report transmission via email with an audit trail.

### Italian Fiscal Validation
Server-side validation for Italian fiscal identifiers including Codice Fiscale (16-character) and Partita IVA (11-digit) with checksum algorithms, adhering to Agenzia delle Entrate requirements.

### Name Change Management (Cambio Nominativo)
SIAE-compliant ticket holder name change workflow with configurable temporal limits, maximum changes per ticket, optional auto-approval, and payment integration for fees.

### Scanner Management Module
Manages event scanner operators for `gestore`/`super_admin` users, supporting scanner account creation, mobile-optimized UI, and granular event assignment with permissions for list, table, and ticket scanning (including specific sectors/types).

### School Badge Manager Module
A digital badge creation system for schools and organizations, accessible to `gestore`/`admin` users. It allows custom branded landing pages, email verification, QR code generation, and a public view page for badges, supporting custom domains.

### Paid Reservation Booking System (PR Wallet)
A reservation system for event lists and tables with PR (promoter) commission tracking using a wallet model. It handles PR registration, authentication, commission accumulation, payout requests, and integrates with scanners for payment verification and check-in.

## External Dependencies

### Third-Party Services
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **Google Fonts CDN**: For typography.
-   **SMTP Email**: For email verification and password reset.
-   **Replit OAuth**: Optional authentication.
-   **OpenAI API**: For AI analytics (`gpt-4o-mini`).
-   **MSG91 OTP**: For SMS OTP verification.

### Key NPM Packages
-   **UI Components**: `@radix-ui/*`, `shadcn/ui`.
-   **Forms & Validation**: `react-hook-form`, `zod`, `@hookform/resolvers`.
-   **Data Fetching**: `@tanstack/react-query`.
-   **Database**: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`.
-   **Authentication**: `passport`, `openid-client`, `express-session`, `bcryptjs`.
-   **Charts**: `recharts`.
-   **File Processing**: `papaparse`, `jspdf`, `exceljs`.
-   **QR Code**: `qrcode`.
-   **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.
-   **Mobile App**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`.