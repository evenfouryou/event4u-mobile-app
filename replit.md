# Event4U Management System

## Overview
Event4U is a comprehensive event management and inventory tracking system designed to optimize event logistics, manage inventory, and provide actionable business intelligence. It supports multi-role management of events, inventory, and stations with real-time consumption tracking. Key capabilities include a company-centric hierarchy, role-based access control, AI-powered analytics, intelligent purchase order management, multi-bartender station assignments, and an advanced SIAE-compliant ticketing module for Italian fiscal regulations. The system aims to enhance efficiency and decision-making for event organizers, positioning the project for market leadership in event technology.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18, TypeScript, and Vite, with Wouter for routing and Shadcn UI (Radix UI, Tailwind CSS) for components, adhering to Material Design 3. State management is handled by TanStack Query v5, and forms use React Hook Form with Zod validation. The UI features a dark, nightclub-themed aesthetic with glass-morphism, Framer Motion animations, card-based layouts, responsive grids, and fixed sidebar navigation. It also supports PWA functionality.

### Backend
The backend is developed with Node.js and Express.js in TypeScript (ESM), providing RESTful APIs with centralized error handling and session-based authentication. Drizzle ORM facilitates type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first and repository pattern within a monorepo structure.

### Authentication & Authorization
The system supports Replit OAuth and email/password registration. Session management uses `express-session` with a PostgreSQL store. Role-Based Access Control (RBAC) includes `super_admin`, `gestore`, `organizer`, `warehouse`, and `bartender` roles. Security measures include HTTP-only secure cookies, encrypted sessions, API middleware for role checks, and company-scoped data access for multi-tenancy.

### Data Model & Business Logic
The core data model links Companies to Users, Locations, Events, Products, and Price Lists. Events include Stations with detailed inventory tracking (Stocks, Stock Movements) covering all stages from loading to returns. Core features include email verification, AI analytics for inventory/consumption, an event creation wizard, and purchase order management.

### SIAE Ticketing Module
A comprehensive SIAE-compliant ticketing and fiscal management system for Italian clubs, adhering to Italian fiscal regulations. It manages reference data, fiscal compliance, customer management, ticketing, transactions, and operations, including API endpoints for CRUD, activation cards, customer registration, ticket emission with fiscal seals, and XML transmission. Fiscal seal generation occurs server-side via a Desktop Bridge Relay System. The module is disabled by default and can be enabled per `gestore` user by a Super Admin. It integrates CAPTCHA and supports RCA, RMG, and RPM SIAE report types. The system includes robust auto-correction and pre-transmission validation for SIAE XML, preventing common errors and ensuring consistent system codes across all transmission paths.

**DTD Validator Integration (2026-01-16)**: The pre-transmission validation pipeline now includes a comprehensive DTD validator (`siae-xml-validator.ts`) that validates XML against official SIAE DTD specifications v0039. This validator checks:
- Report type detection (RMG/RPM/RCA)
- Required and optional attributes according to DTD
- Attribute value validation (e.g., Sostituzione: N|S)
- Required child elements
- Element order compliance

The `validatePreTransmission` function is now async and integrates both simplified validation and full DTD validation before any transmission.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) providing a centralized view of event operations with tabbed navigation for Overview, Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance, featuring real-time updates via WebSockets.

### Interactive Floor Plan Viewer & Advanced Ticketing System
The public event detail page (`/public/event/:id`) features an interactive floor plan viewer for seat/sector selection with zoom and pan functionalities. The advanced ticketing system includes distributed seat hold management with real-time seat locking and WebSocket updates, along with a visual floor plan editor using SVG canvas and polygon drawing for zones, supporting draft/publish versioning, Smart Assist, and a heatmap overlay for occupancy recommendations.

### Desktop Bridge Relay System
A WebSocket relay system enabling remote smart card reader access from a desktop Electron application to the web application. It supports token-based authentication and company-scoped message routing, facilitating digital signatures for SIAE C1 reports using PKI functionality, managing signature error handling, and handling SIAE report transmission via email with an audit trail. It supports CAdES-BES digital signatures for SIAE report compliance and S/MIME email signatures for RCA transmissions.

### Additional Modules
-   **Italian Fiscal Validation**: Server-side validation for Italian fiscal identifiers (Codice Fiscale, Partita IVA).
-   **Name Change Management (Cambio Nominativo)**: SIAE-compliant ticket holder name change workflow with configurable limits and payment integration.
-   **SIAE-Compliant Resale Marketplace**: A marketplace for ticket resale compliant with Italian Allegato B regulations, handling fiscal compliance, seller payouts, and C1 report integration.
-   **Scanner Management Module**: Manages event scanner operators with granular event assignment and permissions.
-   **School Badge Manager Module**: Digital badge creation system for schools and organizations, supporting custom branding and QR code generation.
-   **Paid Reservation Booking System (PR Wallet)**: Reservation system for event lists and tables with promoter commission tracking and payout requests.

### Event Management & Customer Home
Events are categorized for `gestore` view into "In Corso", "Futuri", and "Passati". The public-facing home page features event categories, geolocation support with a "Vicino a te" filter, and Google Maps integration for venue display.

### Mobile App (Expo React Native)
The mobile app, located in the `mobile-app/` folder, is built with Expo SDK 52 and React Native. It features a dark nightclub theme, card-based layouts, and uses React Navigation for routing, TanStack Query for data fetching, and Zustand for state management. Key features include user authentication, public event browsing, ticket management, QR scanning for event entry, promoter dashboards, cashier functions for ticket issuance, and event management.

## External Dependencies

### Third-Party Services
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **Google Fonts CDN**: For typography.
-   **SMTP Email**: For email verification and password reset.
-   **Replit OAuth**: Optional authentication.
-   **OpenAI API**: For AI analytics (`gpt-4o-mini`).
-   **MSG91 OTP**: For SMS OTP verification.
-   **Google Maps Platform**: For map functionalities.

### Key NPM Packages
-   **UI Components**: `@radix-ui/*`, `shadcn/ui`.
-   **Forms & Validation**: `react-hook-form`, `zod`.
-   **Data Fetching**: `@tanstack/react-query`.
-   **Database**: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`.
-   **Authentication**: `passport`, `openid-client`, `express-session`, `bcryptjs`.
-   **Charts**: `recharts`.
-   **File Processing**: `papaparse`, `jspdf`, `exceljs`.
-   **QR Code**: `qrcode`.
-   **Build Tools**: `vite`, `esbuild`, `typescript`.
-   **Mobile App**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `expo-camera`, `react-native-qrcode-svg`, `expo-secure-store`.