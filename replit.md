# Event4U Management System

## Overview
Event4U is a comprehensive event management and inventory tracking system designed to optimize event logistics, manage inventory, and provide actionable business intelligence. It supports multi-role management of events, inventory, and stations with real-time consumption tracking. The system features a company-centric hierarchy, role-based access control, AI-powered analytics, intelligent purchase order management, multi-bartender station assignments, and an advanced SIAE-compliant ticketing module for Italian fiscal regulations. Its core purpose is to enhance efficiency and decision-making for event organizers, including a focus on business vision for market leadership in event tech.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, and Vite, utilizing Wouter for routing and Shadcn UI (Radix UI, Tailwind CSS) for components, adhering to Material Design 3. State management is handled by TanStack Query v5, and forms use React Hook Form with Zod validation. The UI features a dark, nightclub-themed aesthetic with glass-morphism, Framer Motion animations, card-based layouts, responsive grids, and fixed sidebar navigation. It also supports PWA functionality for offline use.

### Backend
The backend is developed with Node.js and Express.js in TypeScript (ESM), providing RESTful APIs with centralized error handling and session-based authentication. Drizzle ORM facilitates type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first and repository pattern within a monorepo structure.

### Authentication & Authorization
The system supports Replit OAuth and email/password registration with BCrypt hashing and email verification. Session management uses `express-session` with a PostgreSQL store. Role-Based Access Control (RBAC) includes `super_admin`, `gestore`, `organizer`, `warehouse`, and `bartender` roles. Security measures include HTTP-only secure cookies, encrypted sessions, API middleware for role checks, and company-scoped data access for multi-tenancy.

### Data Model & Business Logic
The core data model links Companies to Users, Locations, Events, Products, and Price Lists. Events include Stations with detailed inventory tracking (Stocks, Stock Movements) covering all stages from loading to returns. Events transition through `draft`, `scheduled`, `ongoing`, and `closed` states. Core features include email verification, AI analytics for inventory/consumption, an event creation wizard, and purchase order management.

### SIAE Ticketing Module
A comprehensive SIAE-compliant ticketing and fiscal management system for Italian clubs, adhering to Italian fiscal regulations (Provvedimento 04/03/2008). It manages reference data, fiscal compliance, customer management, ticketing, transactions, and operations. This module provides API endpoints for CRUD operations on reference data, activation cards, customer registration, ticket emission with fiscal seals, transaction processing, and XML transmission tracking. Fiscal seal generation occurs server-side via a Desktop Bridge Relay System. The module is disabled by default and can be enabled per `gestore` user by a Super Admin. It includes CAPTCHA integration and supports RCA, RMG, and RPM SIAE report types with specific XML structures and transmission UIs.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) providing a centralized view of event operations with tabbed navigation for Overview (KPIs, activity log, entrance charts, venue map), Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance, featuring real-time updates via WebSockets.

### Interactive Floor Plan Viewer & Advanced Ticketing System
The public event detail page (`/public/event/:id`) features an interactive floor plan viewer for seat/sector selection with various zoom and pan functionalities. The advanced ticketing system includes distributed seat hold management with real-time seat locking and WebSocket updates, along with a visual floor plan editor using SVG canvas and polygon drawing for zones, supporting draft/publish versioning, Smart Assist, and a heatmap overlay for occupancy recommendations.

### Event Page Editor
An administrative tool for customizing public event pages through modular blocks, managing event configuration, lineup artists, timeline items, and FAQs.

### Desktop Bridge Relay System
A WebSocket relay system (`/ws/bridge`) enabling remote smart card reader access from a desktop Electron application to the web application. It supports token-based authentication and company-scoped message routing, facilitating digital signatures for SIAE C1 reports using PKI functionality, managing signature error handling, and handling SIAE report transmission via email with an audit trail.

### SIAE Digital Signatures (CAdES-BES) & S/MIME Email Signatures
The system supports CAdES-BES digital signatures for SIAE report compliance, generating .p7m binary files using the official SIAE smart card library (`libSIAEp7.dll`). This includes direct smart card signing, file-based workflow, and robust error handling. For SIAE RCA transmissions, emails are S/MIME signed per Allegato C requirements using the `SMIMESignML` function from `libSIAEp7.dll`, ensuring RFC822-compliant S/MIME creation with proper email header and attachment naming conventions.

#### SIAE S/MIME Email Format (2026-01-07 Critical Fix)
**Critical discovery**: SIAE requires **one signature** (S/MIME), not two (CAdES + S/MIME). The previous flow created `S/MIME(P7M(XML))` = double signature = Error 40605 "riepilogo illeggibile". The correct flow is: XML → SMIMESignML → S/MIME opaque (single signature). Note: Section 1.4.1 (.xsi.p7m) applies to CD-R storage only, not email. For email: attachment is `.xsi` (XML), Subject uses full format `RCA_AAAA_MM_GG_SSSSSSSS_###_XSI_V.01.00`. Key functions: `generateSiaeAttachmentName()` and `generateSiaeSubject()` in `siae-utils.ts`.

#### SIAE TipoGenere Mapping (2026-01-08 Fix Error 2101)
**Error 2101**: "Tipo evento diverso da quelli previsti nella tabella 1 all.A provv. 23/7/2001". The system now uses centralized `mapToSiaeTipoGenere()` function in `siae-utils.ts` that:
- Maps all internal/legacy genre codes to valid SIAE 2-digit numeric codes (01-78)
- Valid codes: 77=Discoteca, 01=Teatro, 09=Concerti, 20=Cinema, 70=Sport, 76=Altro
- Handles both numeric legacy codes (60, 61, etc.) and text codes (discoteca, club, etc.)
- Default: 77 (discoteca) for unmapped/unknown codes
- Applied in: `siae-utils.ts`, `siae-scheduler.ts`, `siae-routes.ts`

### Italian Fiscal Validation
Server-side validation for Italian fiscal identifiers, including Codice Fiscale and Partita IVA, incorporating checksum algorithms compliant with Agenzia delle Entrate requirements.

### Name Change Management (Cambio Nominativo)
A SIAE-compliant ticket holder name change workflow with configurable temporal limits, maximum changes per ticket, optional auto-approval, and payment integration for fees.

### SIAE-Compliant Resale Marketplace (Secondary Ticketing)
A marketplace for ticket resale compliant with Italian Allegato B regulations. It features seller listing, buyer purchase flow with atomic reservation, fiscal compliance (original ticket annulment and new ticket emission), seller payouts, and C1 report integration for annulled tickets. An auto-expiration scheduler manages listed resales.

### Scanner Management Module
Manages event scanner operators for `gestore`/`super_admin` users, supporting scanner account creation, mobile-optimized UI, and granular event assignment with permissions for list, table, and ticket scanning.

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