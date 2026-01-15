# Event4U Management System

## Overview
Event4U is a comprehensive event management and inventory tracking system designed to optimize event logistics, manage inventory, and provide actionable business intelligence. It supports multi-role management of events, inventory, and stations with real-time consumption tracking. Key capabilities include a company-centric hierarchy, role-based access control, AI-powered analytics, intelligent purchase order management, multi-bartender station assignments, and an advanced SIAE-compliant ticketing module for Italian fiscal regulations. The system aims to enhance efficiency and decision-making for event organizers, positioning the project for market leadership in event technology.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### January 15, 2026 - System Code Consistency Fix for send-email Endpoint
**Bug Fix**: Corrected the `/api/siae/transmissions/:id/send-email` endpoint to use `resolveSystemCode()` instead of direct fallback.

**Problem**: The send-email endpoint was using `systemConfig?.systemCode || SIAE_SYSTEM_CODE_DEFAULT` which bypassed the proper resolution hierarchy (SmartCard EFFF > siaeSystemConfig > DEFAULT), causing potential SIAE errors 0600/0603 due to system code inconsistency between XML content and filename.

**Solution**: Added `sendEmailResolvedSystemCode = resolveSystemCode(sendEmailCachedEfff, systemConfig)` before XML regeneration (line 5285-5288 in siae-routes.ts), ensuring the same system code resolution logic is used consistently across all transmission paths.

**Affected Paths Now Correctly Resolved**:
- Scheduler: `sendDailyReports()`, `sendMonthlyReports()`, `sendRCAReports()` ✓
- Manual: resend substitution, C1 handler, RCA event endpoints ✓
- Email: `/api/siae/transmissions/:id/send-email` regeneration path ✓ (NEW FIX)

---

### January 15, 2026 - SIAE Error Handling & Pre-Transmission Validation System
**Implementation**: Created a comprehensive SIAE error handling and pre-transmission validation system to prevent transmission failures.

**Added Components**:
1. **SIAE_ERROR_CODES Constant** (server/siae-utils.ts, line 26)
   - Complete table of 21 official SIAE error codes
   - Each code includes severity level, description, and prevention guidelines
   - Covers error categories: success (0000), warnings (0100, 2606), and errors (0600, 0601, 0603, 2101, 2108, 2110, 2111, 2112, 2114, 3111, 3203, 3706, 40601, 40603, 40604, 40605, 42605, 9999)
   - Enables consistent error messaging and user guidance across the system

2. **PreTransmissionValidationResult Interface** (server/siae-utils.ts, line 1119)
   - Standardized validation response structure
   - Properties: canTransmit (boolean), errors[], warnings[], details (validation breakdown)
   - Allows tracking of XML validity, system code consistency, encoding, field lengths, and date coherence

3. **validatePreTransmission() Function** (server/siae-utils.ts, line 3107)
   - Centralized pre-transmission validation function
   - Performs 7 comprehensive validation checks:
     1. UTF-8 encoding validation (prevents error 40603)
     2. XML structure validation using validateSiaeXml() (prevents error 40601)
     3. System code consistency check using validateSystemCodeConsistency() (prevents errors 0600, 0603)
     4. Field length validation (denominazione max 60, performer max 100)
     5. Date coherence validation (DataGenerazione, Mese, Data attributes)
     6. Required XML elements validation (Titolare, Denominazione, CodiceFiscale)
     7. Required generation attributes validation (DataGenerazione, OraGenerazione, ProgressivoGenerazione)
   - Returns detailed results with resolution guidance for each error

**Error Prevention Coverage**:
- Error 0600/0603: System code consistency checks prevent filename/content mismatches
- Error 40601: XML structure validation catches formatting issues
- Error 40603: UTF-8 encoding validation ensures proper character encoding
- Error 40605: Field length and required elements validation ensures data completeness
- All validation errors include SIAE error codes and resolution instructions

**Integration Points**:
- **Scheduler (server/siae-scheduler.ts)**: validatePreTransmission() integrated in sendDailyReports(), sendMonthlyReports(), sendRCAReports()
- **Manual Routes (server/siae-routes.ts)**: validatePreTransmission() integrated in resend substitution, send existing transmission, C1 handler, RCA event endpoints
- All paths block transmission and update status to 'error' with detailed SIAE error codes when validation fails

**Usage Example**:
```typescript
const validation = validatePreTransmission(
  xmlContent,
  'EVENT4U1',
  'rca',
  new Date(),
  'Business Name',
  'Performer Name'
);
if (!validation.canTransmit) {
  console.log(validation.errors);  // Show blocking errors
  console.log(validation.warnings); // Show advisory warnings
}
```

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
A comprehensive SIAE-compliant ticketing and fiscal management system for Italian clubs, adhering to Italian fiscal regulations. It manages reference data, fiscal compliance, customer management, ticketing, transactions, and operations, including API endpoints for CRUD, activation cards, customer registration, ticket emission with fiscal seals, and XML transmission. Fiscal seal generation occurs server-side via a Desktop Bridge Relay System. The module is disabled by default and can be enabled per `gestore` user by a Super Admin. It integrates CAPTCHA and supports RCA, RMG, and RPM SIAE report types.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) providing a centralized view of event operations with tabbed navigation for Overview, Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance, featuring real-time updates via WebSockets.

### Interactive Floor Plan Viewer & Advanced Ticketing System
The public event detail page (`/public/event/:id`) features an interactive floor plan viewer for seat/sector selection with zoom and pan functionalities. The advanced ticketing system includes distributed seat hold management with real-time seat locking and WebSocket updates, along with a visual floor plan editor using SVG canvas and polygon drawing for zones, supporting draft/publish versioning, Smart Assist, and a heatmap overlay for occupancy recommendations.

### Desktop Bridge Relay System
A WebSocket relay system enabling remote smart card reader access from a desktop Electron application to the web application. It supports token-based authentication and company-scoped message routing, facilitating digital signatures for SIAE C1 reports using PKI functionality, managing signature error handling, and handling SIAE report transmission via email with an audit trail. It supports CAdES-BES digital signatures for SIAE report compliance and S/MIME email signatures for RCA transmissions.

### Italian Fiscal Validation
Server-side validation for Italian fiscal identifiers (Codice Fiscale, Partita IVA) incorporating checksum algorithms.

### Name Change Management (Cambio Nominativo)
A SIAE-compliant ticket holder name change workflow with configurable temporal limits, maximum changes, optional auto-approval, and payment integration.

### SIAE-Compliant Resale Marketplace (Secondary Ticketing)
A marketplace for ticket resale compliant with Italian Allegato B regulations, featuring seller listing, buyer purchase, atomic reservation, fiscal compliance (original ticket annulment and new ticket emission), seller payouts, and C1 report integration.

### Scanner Management Module
Manages event scanner operators for `gestore`/`super_admin` users, supporting scanner account creation, mobile-optimized UI, and granular event assignment with permissions.

### School Badge Manager Module
A digital badge creation system for schools and organizations, accessible to `gestore`/`admin` users. It allows custom branded landing pages, email verification, QR code generation, and a public view page, supporting custom domains.

### Paid Reservation Booking System (PR Wallet)
A reservation system for event lists and tables with PR (promoter) commission tracking using a wallet model. It handles PR registration, authentication, commission accumulation, payout requests, and integrates with scanners for payment verification and check-in. The system uses an additive commission model, allows gestori to assign PRs to specific events, and supports multi-company PRs.

### Event Management
Events are categorized for `gestore` view into "In Corso" (ongoing), "Futuri" (upcoming), and "Passati" (past) based on dates and status.

### Customer Home with Event Discovery
A redesigned public-facing home page featuring:
- **Event Categories**: Global event categories with icons, colors, and display order for filtering.
- **Geolocation Support**: Locations table includes latitude/longitude, and a "Vicino a te" filter uses browser geolocation with Haversine formula for distance calculation.
- **Google Maps Integration**: Venues page (`/locali`) features a map/list view toggle with `@vis.gl/react-google-maps` for displaying venue markers.

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