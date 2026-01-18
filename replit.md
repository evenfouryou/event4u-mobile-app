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

**System Code Validation (2026-01-16)**: Added `validateSiaeSystemCode()` function to prevent SIAE error 0600 caused by using unregistered system codes:
- Validates 8-character length requirement
- Blocks default placeholder code EVENT4U1 (not registered with SIAE)
- Validates test code format (P + 7 digits, e.g., P0004010)
- Pre-transmission validation blocks XML generation if system code is invalid
- Returns actionable error messages with configuration guidance

**C1 XML Generation Consolidation (2026-01-16)**: The C1 report generation (RMG/RPM) has been unified into a single `generateC1Xml()` function in `siae-utils.ts`, replacing duplicate implementations across routes and scheduler. Key improvements:
- TypeScript interfaces: `C1XmlParams`, `C1EventContext`, `C1SectorData`, `C1TicketData`, `C1SubscriptionData` for type safety
- Single source of truth for XML generation, preventing divergence between routes and scheduler
- Consistent handling of progressivo, system codes, events, sectors, and subscriptions
- Helper function `hydrateC1EventContextFromTickets` in routes for data preparation
- Removed ~302 lines of duplicate code from `siae-routes.ts`

**RCA Date Coherence Fix (2026-01-17)**: Fixed SIAE error 0603 for RCA reports by updating `validatePreTransmission`:
- RCA uses elements (not attributes) for dates: `<DataRiepilogo>`, `<DataGenerazioneRiepilogo>`, `<OraGenerazioneRiepilogo>`
- RMG/RPM use attributes: `DataGenerazione="..."`, `OraGenerazione="..."`
- Added validation: `DataRiepilogo` must match the date in filename (RCA_yyyyMMdd_SSSSSSSS_nnn.xsi)
- Added validation: `DataGenerazioneRiepilogo` must be today's date (file generation date)
- Separated required elements for RCA (`DenominazioneTitolareCA`, `CFTitolareCA`, `CodiceSistemaCA`) vs RMG/RPM (`Denominazione`, `CodiceFiscale`)

**Error 0600 Prevention Enhancement (2026-01-17)**: Fixed root causes of SIAE error 0600 by blocking XML generation when system code is invalid:
- Added `resolveSystemCodeSafe()` function that returns error instead of falling back to invalid `EVENT4U1` default
- Updated `generateRCAXml()` and `generateC1LogXml()` to validate system code BEFORE generating XML
- Updated `generateSiaeAttachmentName()` to throw error if system code is missing or is the invalid default
- Removed all `|| SIAE_SYSTEM_CODE_DEFAULT` fallback patterns from XML generation code paths
- System code validation now blocks at generation time, not just at transmission time

**S/MIME System Code Consistency Fix (2026-01-17, extended 2026-01-18)**: Added `resolveSystemCodeForSmime()` function to prevent error 0600 caused by Smart Card / configuration mismatch:
- **ALL transmissions** (RCA, RMG, RPM) are signed with S/MIME, therefore the system code MUST come from the Smart Card's EFFF file
- SIAE verifies that the system code in the XML matches the one registered on the Smart Card used for signing
- Using `siaeConfig.systemCode` when the Smart Card has a different code causes error 0600 "Nome del file contenente il riepilogo sbagliato"
- FIX 2026-01-18: Extended `resolveSystemCodeForSmime()` to ALL transmission types (not just RCA)
- All code paths (generate, resend, post, sendEmail, preview) now require Smart Card connection
- Blocks transmission if Smart Card's systemId is not available or invalid
- Logs warning if siaeConfig.systemCode differs from Smart Card code (uses Smart Card code anyway)

**RPM Future Event Blocking (2026-01-18)**: Added validation to prevent SIAE error 0603 caused by future event dates:
- RPM (monthly reports) cannot be sent for a month that hasn't concluded yet
- Validates that `DataGenerazione` must be in the month AFTER the report period (e.g., January 2026 report requires `DataGenerazione` >= February 2026)
- Validates that no `<DataEvento>` in the XML is in the future relative to `DataGenerazione`
- Events scheduled for dates after today are blocked from being included in riepiloghi
- Pre-transmission validation returns actionable error messages with resolution guidance

**Universal Pre-Transmission DTD Validation (2026-01-18)**: All transmission paths now execute `validatePreTransmission()` before signing/sending:
- Manual routes (generate, resend, post, sendEmail) block with DTD_VALIDATION_FAILED if XML is invalid
- Scheduler jobs (RMG daily, RPM monthly) skip transmission with detailed error logging if validation fails
- Ensures no structurally invalid XML can be transmitted to SIAE
- Combined with auto-correction and system code validation for complete error prevention

**Active EFFF Read for System Code (2026-01-18)**: Fixed system code resolution to actively read EFFF file from Smart Card:
- The `systemId` is NOT included in automatic status updates from Desktop Bridge
- Now calls `requestCardEfffData()` to send explicit `READ_EFFF` command before transmission
- Desktop Bridge reads the EFFF file from Smart Card and returns `systemId`
- Falls back to cached data or config only if active read fails
- Ensures correct system code is always used for S/MIME signed transmissions

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