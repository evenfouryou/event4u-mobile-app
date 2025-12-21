# Event4U Management System

## Overview
Event4U is an event management and inventory tracking system for event organizers. It provides multi-role management of events, inventory, and stations, with real-time consumption tracking. The system features a company-centric hierarchy, role-based access control, email verification, AI-powered analytics, intelligent purchase order management, and multi-bartender station assignments. Its purpose is to streamline event logistics, optimize inventory, and deliver actionable business intelligence.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
Built with React 18, TypeScript, and Vite, using Wouter for routing and Shadcn UI (Radix UI, Tailwind CSS) following Material Design 3. State management is handled by TanStack Query v5, and form management uses React Hook Form with Zod. The design features a dark, nightclub-themed UI with glass-morphism effects, Framer Motion animations, card-based layouts, responsive grids, and fixed sidebar navigation.

### Backend
Developed with Node.js and Express.js (TypeScript, ESM) for RESTful APIs. It includes centralized error handling and session-based authentication. Drizzle ORM is used for type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first approach and a repository pattern. The system maintains a monorepo structure with separate development and production environments.

### Authentication & Authorization
Supports Replit OAuth and email/password registration (BCrypt hashing, email verification). Session management uses `express-session` with a PostgreSQL store. Authorization is role-based (RBAC) with `super_admin`, `gestore`, `organizer`, `warehouse`, and `bartender` roles. Security features include HTTP-only secure cookies, encrypted sessions, API middleware role checks, and company-scoped data access for multi-tenancy.

### Data Model & Business Logic
The data model links Companies to Users, Locations, Events, Products, and Price Lists. Events contain Stations with inventory tracking via Stocks and Stock Movements. The stock workflow covers loading, transfer, allocation, consumption, and returns. Events progress through `draft`, `scheduled`, `ongoing`, and `closed` states. Features include email verification, AI analytics for low stock and consumption, a step-by-step event creation wizard, and purchase order management.

### SIAE Ticketing Module
A SIAE-compliant ticketing and fiscal management system for Italian clubs, adhering to Italian fiscal regulations. It includes 18+ database tables for reference data, fiscal compliance, customer management, ticketing, transactions, and operations. API endpoints (`/api/siae/*`) provide CRUD for reference data, activation cards, customer registration, ticket emission with fiscal seals, transaction processing, and XML transmission tracking. Frontend pages (`/siae/*`) offer comprehensive management for all module functionalities. All fiscal seal generation is server-side and mandatory for ticket emission, using a Desktop Bridge Relay System to interact with physical smart cards. The module is disabled by default and can be enabled per `gestore` user by a Super Admin.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) for event operations, featuring tabbed navigation for Overview (KPIs, activity log, entrance charts, venue map), Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance. Key components include `KPICard` for real-time metrics, `EntranceChart`, `VenueMap`, `ActivityLogEntry`, `AlertBanner`, and `QuickActionButton` for rapid actions. Real-time updates are powered by WebSockets.

### Desktop Bridge Relay System
A WebSocket relay system enabling remote smart card reader access from a desktop Electron app to the web application. It involves a server relay (`/ws/bridge`), an Electron desktop app, and a frontend `SmartCardService`. Authentication is token-based for desktop apps and session-based for web clients, with company-scoped message routing.

### Progressive Web App (PWA)
The system is an installable PWA with a `manifest.json` for metadata, a Service Worker (`sw.js`) for caching and offline support, and native installation prompts.

### Scanner Management Module
A dedicated management system for event scanner operators, accessible via "Scanner" in the sidebar (for gestore/super_admin users). Features include:
- **Scanner Account Creation**: Simplified form with only required fields (first name, last name, email as username, password)
- **Mobile-Optimized UI**: Search bar for filtering scanners, responsive card layout
- **Event Assignment**: Dialog to assign scanners to specific events with granular permissions:
  - List scanning permission (guest lists)
  - Table scanning permission (reservations)
  - Ticket scanning permission (SIAE tickets)
  - Selection of allowed ticket sectors/types for ticket scanning
- **Security**: Company-scoped data access, sanitized API responses (no password hashes exposed)
- **API Endpoints**: 
  - `GET /api/users/scanners` - Returns scanner users with safe fields only
  - `GET /api/e4u/scanners/assignments` - Returns scanner event assignments scoped to company
  - `POST /api/e4u/scanners/assign` - Creates scanner event assignments

### School Badge Manager Module
A digital badge creation system for schools and organizations, accessible via "Badge Scuole" in the sidebar (for gestore/admin users). Database schema includes 3 tables: `schoolBadgeLandings` (organization landing pages), `schoolBadgeRequests` (badge applications), and `schoolBadges` (generated badges with QR codes). Features include:
- **Landing Page Creation**: Custom branded pages with school name, description, logo upload (base64), email domain validation, and primary color
- **Public Badge Request Flow**: `/badge/:slug` public landing where users submit name/email/phone for badge request
- **Email Verification**: 24-hour verification tokens sent via SMTP with automatic expiration
- **QR Code Generation**: Uses `qrcode` library to generate QR codes (data URLs) pointing to `/badge/view/:code`
- **Badge View Page**: Public page at `/badge/view/:code` showing badge holder info, school branding, and QR code for verification
- **Error Handling**: `/badge-error` page for invalid/expired/used verification tokens
- **Activation Control**: Landing pages can be activated/deactivated by organizers
- **Custom Domain**: Set `CUSTOM_DOMAIN` env var (e.g., `manage.eventfouryou.com`) for badge URLs
- **Organizer Management**: Dashboard showing all landings with request counts and badge statistics

## External Dependencies

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Google Fonts CDN**: Typography.
- **SMTP Email**: Email verification and password reset.
- **Replit OAuth**: Optional authentication.
- **OpenAI API**: AI analytics (`gpt-4o-mini`).
- **MSG91 OTP**: SMS OTP verification for customer phone validation (requires `MSG91_AUTHKEY` and `MSG91_TEMPLATE_ID` secrets).

### Key NPM Packages
- **UI Components**: `@radix-ui/*`, `shadcn/ui`.
- **Forms & Validation**: `react-hook-form`, `zod`, `@hookform/resolvers`.
- **Data Fetching**: `@tanstack/react-query`.
- **Database**: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`.
- **Authentication**: `passport`, `openid-client`, `express-session`, `bcryptjs`.
- **Charts**: `recharts`.
- **File Processing**: `papaparse` (CSV), `jspdf` (PDF), `exceljs` (Excel).
- **QR Code**: `qrcode` for generating QR code data URLs.
- **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.
- **Mobile App**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` for iOS native app packaging.

## iOS App Build Instructions

The project is configured with Capacitor to build a native iOS app. Follow these steps:

### Prerequisites
- Mac with Xcode installed (required for iOS builds)
- Apple Developer Account ($99/year for App Store publishing)
- Node.js 18+

### Build Steps

1. **Build the web app**:
   ```bash
   npm run build
   ```

2. **Add iOS platform** (first time only):
   ```bash
   npx cap add ios
   ```

3. **Sync web assets to iOS**:
   ```bash
   npx cap sync ios
   ```

4. **Open in Xcode**:
   ```bash
   npx cap open ios
   ```

5. **In Xcode**:
   - Select your Team in Signing & Capabilities
   - Set Bundle Identifier (e.g., `com.event4u.app`)
   - Add app icons in Assets.xcassets
   - Run on simulator or device with the Play button
   - For App Store: Product → Archive → Distribute App

### Configuration
- App ID: `com.event4u.app` (change in `capacitor.config.ts`)
- App Name: `Event4U`
- Web Directory: `dist/public`

### Updating the App
After making changes to the web app:
```bash
npm run build && npx cap sync ios
```