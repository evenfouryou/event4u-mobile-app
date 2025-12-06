# Event4U Management System

## Overview
Event4U is a comprehensive event management and inventory tracking system designed for event organizers. It supports multi-role management of events, inventory, stations, and real-time consumption tracking. The system features a company-centric hierarchy with role-based access control, enabling efficient operations from platform-level oversight to event-specific inventory management and consumption tracking. Key capabilities include email verification, AI-powered analytics for insights, intelligent purchase order management, and multi-bartender station assignments. The system aims to streamline event logistics, optimize inventory, and provide actionable business intelligence.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18, TypeScript, and Vite. It uses Wouter for routing and Shadcn UI with Radix UI primitives, styled with Tailwind CSS, following Material Design 3 principles. State management and data fetching are handled by TanStack Query v5, while form management uses React Hook Form with Zod for validation. The design emphasizes a card-based layout, role-based UI rendering, responsive grid systems, and fixed sidebar navigation. All data-heavy pages are converted to responsive card layouts for mobile, and the system features a dark nightclub-themed UI with glass-morphism effects and Framer Motion animations.

### Backend Architecture
The backend is developed with Node.js and Express.js, using TypeScript with ESM for RESTful APIs. It features centralized error handling and session-based authentication. The database layer employs Drizzle ORM for type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first approach. A repository pattern provides an abstraction layer for CRUD operations. The system maintains a monorepo structure with separate development and production environments.

### Authentication & Authorization
Authentication supports both Replit OAuth and classic email/password registration with BCrypt hashing and email verification. Session management is handled by `express-session` with a PostgreSQL store. Authorization is based on a Role-Based Access Control (RBAC) model with five roles: `super_admin`, `gestore` (company admin), `organizer`, `warehouse`, and `bartender`. Security considerations include HTTP-only secure cookies, encrypted session data, role checks in API middleware, and company-scoped data access for multi-tenant isolation. User-level feature management controls module access dynamically.

### Data Model & Business Logic
The system's data model links Companies to Users, Locations, Events, Products, and Price Lists. Events contain Stations, which track inventory via Stocks. Stock Movements log all inventory changes. The stock movement workflow involves loading general warehouse stock, transferring to events, allocating to stations, consumption by bartenders, and returning remaining stock. Events progress through `draft`, `scheduled`, `ongoing`, and `closed` lifecycle states. Features include an email verification system, AI-powered analytics for low stock alerts and consumption patterns, a step-by-step event creation wizard with recurrence configuration, and a purchase order management system. New modules include Contabilità (Accounting), Personale (Personnel), Cassa (Cash Register), and File della Serata (Night File).

### Import/Export Features
The system supports CSV import for bulk product and price list item uploads. Reporting capabilities include PDF generation for event reports and Excel export for data analysis, covering revenue and consumption reports.

### SIAE Ticketing Module (Event Four You Manage)
A comprehensive SIAE-compliant event ticketing and fiscal management system for Italian clubs and event organizers, designed to comply with Italian fiscal regulations (Decreto 23/07/2001, Provvedimento 356768/2025).

**Database Architecture (18+ SIAE tables in production):**
- **TAB.1-5 Reference Tables**: Event genres, sector codes, ticket types, service codes, cancellation reasons
- **Fiscal Compliance**: Activation cards (Carta di Attivazione), emission channels, fiscal seals
- **Customer Management**: SIAE customers with OTP/SPID authentication, unique customer codes
- **Ticketing**: Ticketed events, event sectors, numbered/unnumbered seats, tickets with fiscal seals
- **Transactions**: Purchase transactions, name changes, secondary ticketing (resales)
- **Operations**: Box office sessions, subscriptions, audit logs, XML transmissions to SIAE

**API Endpoints (`/api/siae/*`):**
- Reference tables (TAB.1-5) with CRUD operations
- Activation cards and emission channels management
- Customer registration with OTP verification
- Ticketed events and sector configuration
- Ticket emission with fiscal seal generation
- Transaction processing and name change requests
- Secondary ticketing marketplace
- Box office session management
- Audit logs with company scoping and Zod validation
- Numbered seats management with sector-based organization
- SIAE XML transmission tracking

**Frontend Pages (`/siae/*`):**
- `/siae/system-config` - System configuration for SIAE integration
- `/siae/ticketed-events` - Ticketed events management
- `/siae/sectors` - Event sectors configuration
- `/siae/fiscal-seals` - Fiscal seal management
- `/siae/tickets` - Ticket emission and management
- `/siae/transactions` - Transaction processing
- `/siae/customers` - Customer registry with OTP
- `/siae/name-changes` - Nominative ticket changes
- `/siae/resales` - Secondary ticketing marketplace
- `/siae/box-office` - Box office session management
- `/siae/subscriptions` - Subscription management
- `/siae/transmissions` - XML transmission to SIAE
- `/siae/audit-logs` - Audit log viewing with filtering
- `/siae/numbered-seats` - Numbered seat management by sector

**Key Files:**
- `server/siae-storage.ts`: Storage layer with CRUD operations for all SIAE tables (20+ tables)
- `server/siae-routes.ts`: REST API routes with role-based access control and Zod validation
- `shared/schema.ts`: Database schema definitions with Zod validation and TypeScript types

**Security Features:**
- Zod validation on all POST/PATCH endpoints
- Company-scoped data access for multi-tenant isolation
- Role-based authorization (requireGestore, requireOrganizer)
- Proper 404/403 responses for access control

**Feature Activation:**
- SIAE module is disabled by default for all users
- Super Admin can enable/disable SIAE for individual gestore users via the Users page
- When siaeEnabled=true, the "Biglietteria SIAE" section appears in the sidebar for that gestore
- Feature toggle stored in user_features table (siaeEnabled field)

### Event Command Center (Event Hub)
A unified real-time dashboard for managing events during operation, replacing scattered navigation with a single comprehensive view.

**Route**: `/events/:id/hub`

**Tab Navigation:**
- **Panoramica (Overview)**: Main dashboard with KPIs, activity log, entrance charts, venue map
- **Biglietteria (Ticketing)**: SIAE ticket management integration
- **Liste (Guest Lists)**: Guest list management with check-in tracking
- **Tavoli (Tables)**: Table booking and seating management
- **Staff**: Staff assignments and coordination
- **Inventario (Inventory)**: Stock management and transfers
- **Incassi (Finance)**: Revenue tracking and financial summaries

**Key Components:**
- `KPICard`: Real-time metrics with trend indicators (entries, capacity, tables, revenue)
- `EntranceChart`: Recharts area chart showing entry flow by time slot
- `VenueMap`: Interactive table grid organized by type (standard/VIP/privé) with status colors
- `ActivityLogEntry`: Real-time activity feed for check-ins, sales, bookings
- `AlertBanner`: Warning/error/success notifications for operational alerts
- `QuickActionButton`: Rapid action triggers (QR scan, add guest, book table)
- `TopConsumptionsWidget`: Pie chart of top-selling products

**Real-time Features:**
- WebSocket connection on port 18765 for live updates
- Live indicator showing connection status
- Automatic activity log updates
- Alert system for low stock, capacity warnings

**Quick Actions Sheet:**
- QR code scanning
- Guest addition
- Table booking
- Stock transfer
- Report generation
- Emergency actions (pause ticketing, close doors, call security)

**Navigation:**
- Events list (`/events`) now routes to Event Hub (`/events/:id/hub`) for non-draft events
- Draft events route to wizard (`/events/wizard/:id`)

### Progressive Web App (PWA)
Event4U is a fully installable PWA with:
- **manifest.json**: App metadata, icons, and shortcuts for installation
- **Service Worker (sw.js)**: Caching strategy for offline support
- **Install Prompt**: Native installation prompt on Android/Chrome, instructions for iOS
- **Offline Support**: Cached assets and graceful API error handling
- Users can install the app from browser to home screen for native-like experience

## External Dependencies

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Google Fonts CDN**: For consistent typography.
- **SMTP Email**: For sending verification emails.
- **Replit OAuth**: Optional authentication provider.
- **OpenAI API**: For AI-powered analytics and insights (`gpt-4o-mini`).

### Key NPM Packages
- **UI Components**: `@radix-ui/*`, `shadcn/ui`.
- **Forms & Validation**: `react-hook-form`, `zod`, `@hookform/resolvers`.
- **Data Fetching**: `@tanstack/react-query`.
- **Database**: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`.
- **Authentication**: `passport`, `openid-client`, `express-session`, `bcryptjs`.
- **Charts**: `recharts`.
- **File Processing**: `papaparse` (CSV), `jspdf` (PDF), `xlsx` (Excel).
- **Build Tools**: `vite`, `esbuild`, `typescript`, `tsx`.