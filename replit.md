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

### Interactive Floor Plan Viewer
The public event detail page (`/public/event/:id`) features a professional interactive floor plan viewer for seat/sector selection:

**Features**:
- Mouse wheel zoom centered on cursor position (pointer-centered scaling)
- Pinch-to-zoom on mobile centered on pinch centroid
- Drag-to-pan when zoomed in with translation clamping to prevent off-screen movement
- Zoom controls (+/-) and reset button with percentage indicator
- Hover tooltip (desktop) showing zone name, price, and available seats
- Auto-zoom to zone on click for numbered sectors
- Progressive seat visibility: opacity 0.3 at normal zoom, full opacity at 1.5x+, seat numbers visible at 2.5x+

**Technical Implementation**:
- `touch-action: none` to disable native browser scroll/zoom
- `useRef` for drag state (`dragStartRef`, `translateRef`, `throttleRef`) to reduce re-renders
- 60fps throttling (16ms) on mouse/touch move events
- Content-space math for zoom transformations to maintain pointer focus
- `clampTranslate()` function enforces viewport bounds

**Component**: `FloorPlanViewer` in `client/src/pages/public-event-detail.tsx`

### Event Page 3.0 Editor
An admin tool (`/siae/ticketed-events/:id/page-editor`) for customizing public event pages with modular blocks:

**Database Tables**:
- `event_page_configs`: Main configuration (hero video/image, overlay opacity, early bird countdown, theme, dress code, min age, parking info)
- `event_lineup_artists`: DJ/performer lineup with name, role, photo URL, set time, position ordering
- `event_timeline_items`: Event schedule with time, label, description, position ordering
- `event_faq_items`: FAQ with question, answer, position ordering
- `event_page_blocks`: Modular blocks for future extensibility (JSONB content, visibility flags)

**Frontend Components** (`client/src/pages/event-page-editor.tsx`):
- Tabs: Hero, Info Rapide, Line-up, Orari, FAQ
- Dialog-based CRUD for lineup artists, timeline items, and FAQ
- Sensible defaults with proper null-handling via useEffect

**API Endpoints** (`server/routes.ts` - with company ownership checks):
- GET/PUT `/api/siae/ticketed-events/:id/page-config`
- POST/PUT/DELETE `/api/siae/ticketed-events/:id/lineup`
- POST/PUT/DELETE `/api/siae/ticketed-events/:id/timeline`
- POST/PUT/DELETE `/api/siae/ticketed-events/:id/faq`

**Access**: Via "Editor Pagina" menu item in SIAE ticketed events dropdown (Palette icon)

### Desktop Bridge Relay System
A WebSocket relay system designed to enable remote smart card reader access from a desktop Electron app to the web application. It comprises a server relay (`/ws/bridge`), an Electron desktop application, and a frontend `SmartCardService`. Authentication is token-based for desktop apps and session-based for web clients, with company-scoped message routing.

### Scanner Management Module
A dedicated system for managing event scanner operators, accessible to `gestore`/`super_admin` users. It supports scanner account creation with minimal fields, offers a mobile-optimized UI, and allows granular event assignment with permissions for list, table, and ticket scanning (including specific sectors/types). Security includes company-scoped data access and sanitized API responses.

### School Badge Manager Module
A digital badge creation system for schools and organizations, accessible to `gestore`/`admin` users. It allows creation of custom branded landing pages for badge applications, email verification, QR code generation for unique badges, and a public view page for generated badges. Organizers can manage and activate/deactivate landing pages, and the module supports custom domains.

### Paid Reservation Booking System (PR Wallet)
A comprehensive reservation system for event lists and tables with PR (promoter) commission tracking using a wallet model similar to Uber/Glovo:

**Legal Terminology**: This is a "servizio di prenotazione digitale" (digital reservation service), NOT ticket sales. All UI uses "Prenotazione" terminology with mandatory access verification disclaimer: "L'accesso è subordinato al rispetto delle condizioni del locale e alla verifica in fase di accreditamento."

**Database Tables**:
- `prProfiles`: PR profiles with unique prCode, commission rates (% or fixed), wallet balances (pending/paid/total), phone-based authentication with passwordHash
- `reservationPayments`: Paid reservations with QR code (format: RES-{eventId}-{random}), customer info, payment status, check-in tracking
- `prPayouts`: Payout requests from PRs with approval workflow
- `eventReservationSettings`: Per-event settings for list/table reservation fees and access disclaimers

**PR Registration Flow**:
1. Gestore creates PR via `/api/reservations/pr-profiles` with firstName, lastName, phone only
2. System generates random password and stores bcrypt hash in `prProfiles.passwordHash`
3. SMS sent via MSG91 template 64c4bc88d6fc05193a102042 with ##name##, ##password##, ##access## variables
4. PR logs in at `/login` (unified login) with phone + password - automatically detected as phone number
5. PR can add email and change password via their wallet dashboard at `/pr/wallet`

**PR Authentication (separate from main auth)**:
- Unified login page `/login` detects phone numbers and routes to PR auth automatically
- Dedicated session: `req.session.prProfile` (not Passport-based)
- Session regeneration on login/logout for security (prevents session fixation)
- PR-specific endpoints: `/api/pr/login`, `/api/pr/me`, `/api/pr/logout`, `/api/pr/change-password`
- PR wallet endpoints: `/api/pr/wallet`, `/api/pr/reservations`, `/api/pr/payouts`

**PR Wallet Flow**:
1. Customer books via public page with optional PR code
2. Commission accumulates in PR's wallet as "pending"
3. PR requests payout via `/api/pr/payouts`
4. Gestore approves payout → status moves to "paid"

**API Endpoints**:
- Gestore management: `/api/reservations/*` (profiles, payments, wallet management)
- PR self-service: `/api/pr/*` (wallet, reservations, payouts, profile updates)
- Public: `/api/public/reservations`

**Scanner Integration**: The `/api/e4u/scan` endpoint handles RES-* QR codes, verifying payment status and check-in with proper permission checks.

**Frontend Components**:
- `pr-wallet.tsx`: PR dashboard showing earnings, reservation history, payout requests (uses `/api/pr/*` endpoints)
- `login.tsx`: Unified login page - automatically detects phone numbers for PR authentication
- `pr-management.tsx`: Gestore interface for creating/managing PRs with SMS credential delivery
- `public-reservation-section.tsx`: Public booking form with QR code generation and legal disclaimers

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