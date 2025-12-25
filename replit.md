# Event4U Management System

## Overview
Event4U is an event management and inventory tracking system designed for event organizers. It supports multi-role management of events, inventory, and stations, with real-time consumption tracking. The system features a company-centric hierarchy, role-based access control, email verification, AI-powered analytics, intelligent purchase order management, and multi-bartender station assignments. Its goal is to streamline event logistics, optimize inventory, and provide actionable business intelligence for improved efficiency and decision-making.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18, TypeScript, and Vite, with Wouter for routing and Shadcn UI (Radix UI, Tailwind CSS) for components, adhering to Material Design 3. State management is via TanStack Query v5, and forms use React Hook Form with Zod validation. The UI features a dark, nightclub-themed aesthetic with glass-morphism, Framer Motion animations, card-based layouts, responsive grids, and fixed sidebar navigation. It supports PWA functionality with `manifest.json` and a Service Worker for caching and offline support.

### Backend
Built with Node.js and Express.js in TypeScript (ESM), the backend provides RESTful APIs with centralized error handling and session-based authentication. Drizzle ORM is used for type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first and repository pattern. The project maintains a monorepo structure for distinct environments.

### Authentication & Authorization
Supports Replit OAuth and email/password registration with BCrypt hashing and email verification. Session management uses `express-session` with a PostgreSQL store. Role-Based Access Control (RBAC) includes `super_admin`, `gestore`, `organizer`, `warehouse`, and `bartender` roles. Security measures include HTTP-only secure cookies, encrypted sessions, API middleware for role checks, and company-scoped data access for multi-tenancy.

### Data Model & Business Logic
The core data model links Companies to Users, Locations, Events, Products, and Price Lists. Events include Stations with inventory tracking (Stocks, Stock Movements) covering loading, transfer, allocation, consumption, and returns. Events transition through `draft`, `scheduled`, `ongoing`, and `closed` states. Key features include email verification, AI analytics for inventory/consumption, event creation wizard, and purchase order management.

### SIAE Ticketing Module
A SIAE-compliant ticketing and fiscal management system for Italian clubs, adhering to Italian fiscal regulations. It includes reference data, fiscal compliance, customer management, ticketing, transactions, and operations. API endpoints manage CRUD for reference data, activation cards, customer registration, ticket emission with fiscal seals, transaction processing, and XML transmission tracking. Fiscal seal generation is server-side via a Desktop Bridge Relay System. This module is disabled by default and can be enabled per `gestore` user by a Super Admin. It also includes CAPTCHA integration.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) with tabbed navigation for Overview (KPIs, activity log, entrance charts, venue map), Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance. Features `KPICard`, `EntranceChart`, `VenueMap`, `ActivityLogEntry`, `AlertBanner`, and `QuickActionButton` with real-time updates via WebSockets.

### Interactive Floor Plan Viewer
The public event detail page (`/public/event/:id`) features an interactive floor plan viewer for seat/sector selection with pointer-centered zoom, pinch-to-zoom, drag-to-pan, zoom controls, hover tooltips, and auto-zoom to zones on click. Technical implementation uses `touch-action: none`, `useRef` for drag state, 60fps throttling, and content-space math for zoom transformations.

### Advanced Ticketing System
A real-time ticketing system with seat hold management, floor plan editing, and smart recommendations.
-   **Distributed HOLD System**: Real-time seat locking with TTL, using `seat_holds`, `seat_hold_events`, `event_seat_status` tables. WebSockets (`/ws/ticketing`) broadcast seat status changes.
-   **Floor Plan Editor**: Visual editor (`/editor/floor-plans/:id`) with SVG canvas, polygon drawing for zones, and zone properties. Supports draft/publish versioning.
-   **Smart Assist & Heatmap**: Heatmap overlay showing occupancy, Smart Assist modal for recommendations, and an Operational Mode (`?mode=operational`) for staff with quick actions and detailed seat info.

### Event Page 3.0 Editor
An admin tool (`/siae/ticketed-events/:id/page-editor`) for customizing public event pages with modular blocks. Manages event configuration, lineup artists, timeline items, and FAQ through dedicated database tables (`event_page_configs`, `event_lineup_artists`, `event_timeline_items`, `event_faq_items`, `event_page_blocks`).

### Desktop Bridge Relay System
A WebSocket relay system (`/ws/bridge`) enabling remote smart card reader access from a desktop Electron app to the web application. Uses token-based authentication for desktop apps and session-based for web clients, with company-scoped message routing.
-   **Digital Signature**: Supports XML-DSig digital signatures for SIAE C1 reports using the smart card's PKI functionality. Flow: `REQUEST_XML_SIGNATURE` message → Desktop app → `SIGN_XML` command → C# bridge with `SignML()` function → SHA-1 hash + RSA signature + X509 certificate embedding.
-   **SIAE Report Transmission**: Signed XML reports are sent via email to SIAE test environment (`servertest2@batest.siae.it`) with manual confirmation for status updates.

### Scanner Management Module
Manages event scanner operators for `gestore`/`super_admin` users. Supports scanner account creation, a mobile-optimized UI, and granular event assignment with permissions for list, table, and ticket scanning (including specific sectors/types). Ensures company-scoped data access and sanitized API responses.

### School Badge Manager Module
A digital badge creation system for schools and organizations, accessible to `gestore`/`admin` users. Allows custom branded landing pages for badge applications, email verification, QR code generation for unique badges, and a public view page for generated badges. Supports custom domains.

### Paid Reservation Booking System (PR Wallet)
A reservation system for event lists and tables with PR (promoter) commission tracking using a wallet model. It's explicitly a "digital reservation service" (not ticket sales) with specific legal disclaimers.
-   **Database Tables**: `prProfiles`, `reservationPayments`, `prPayouts`, `eventReservationSettings`.
-   **PR Registration Flow**: Gestore creates PR, system generates password, SMS sent with credentials. PR logs in via unified login.
-   **PR Authentication**: Unified login (`/login`) detects phone numbers for PR auth. Dedicated session (`req.session.prProfile`).
-   **PR Wallet Flow**: Commissions accumulate, PR requests payout, Gestore approves.
-   **Scanner Integration**: Handles `RES-*` QR codes for payment verification and check-in.

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