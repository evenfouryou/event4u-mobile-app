# Event4U Management System

## Overview

Event4U is a comprehensive event management and inventory tracking system designed for event organizers. The application enables multi-role management of events, inventory, stations (e.g., bars, storage points), and real-time consumption tracking. Built with a React frontend and Express backend, it supports role-based access control for Super Admins, Company Admins, Organizers, Warehouse Managers, and Bartenders.

The system follows a company-centric hierarchy where:
- Super Admins manage the entire platform
- Company Admins manage their organization's settings and users
- Organizers create and manage events, locations, and inventory
- Warehouse staff handle stock movements
- Bartenders track consumption at specific stations during events

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 23, 2025
- **Multi-Bartender Assignment**: Stations now support multiple bartenders assignment instead of single bartender
  - Changed `assignedUserId` field to `bartenderIds` array in stations schema
  - Added multi-select checkbox UI for bartender assignment in station creation
  - Added inline editing UI on station cards to modify assigned bartenders with Set-based simultaneous editing
  - `editingStationIds` Set allows multiple cards to be in edit mode simultaneously without draft loss
  - `editingBartenderIds` Map stores per-station draft selections with functional updates to prevent stale closures
  - Bartender validation ensures only users with 'bartender' role from same company can be assigned
  - Test e2e verified: drafts preserved during query invalidation, concurrent editing safe
- **Personalized Dashboard Greetings**: All dashboard home pages now show personalized welcome messages
  - Super Admin: "Benvenuto, {firstName}" with operational subtitle
  - Gestore/Admin: "Benvenuto, {firstName}" with operational subtitle  
  - Bartender: Maintains "I Miei Eventi" title with "Benvenuto, {firstName}" in subtitle for task context
- **Gestore Impersonation Access**: Gestore users can now impersonate warehouse/bartender users
  - Impersonation button visible in users page for warehouse and bartender roles from same company
  - Restrictions: Cannot impersonate super_admin, other gestore, or users from different companies
  - Uses existing security model with `impersonatorId` session field
- **Removed Revenue Management**: Removed revenue management section from event detail page
- **Station Soft Delete**: Implemented soft delete for stations using `deletedAt` field - preserves historical event data
- **Station Deletion UI**: Added delete button for stations with confirmation dialog
- **Event Stations Display**: Added station count display in event cards on events list page
- **User Account Management**: 
  - Added `isActive` field for user account activation/deactivation
  - Added UI buttons to activate/deactivate user accounts
  - Added impersonation feature for super_admin and gestore users
  - Gestore can only impersonate users from their company (excluding super_admin and other gestore)
  - Added security protections: super_admin cannot self-deactivate, admins cannot modify super_admin accounts
- **Security Enhancements**:
  - Impersonation uses separate `impersonatorId` session field to prevent privilege escalation
  - Role-based protections in user PATCH endpoint
  - Soft delete filters on all station queries to preserve data integrity
- **New API Endpoints**:
  - `PATCH /api/stations/:id/bartenders` - Update bartenders assigned to a station (validates bartender role and company)
  - `POST /api/users/:id/impersonate` - Super admin can impersonate any user; gestore can impersonate users from their company (excluding admins)
  - `POST /api/users/stop-impersonation` - Return to original admin session
  - `DELETE /api/stations/:id` - Soft delete a station
  - `GET /api/events/:id/stocks` - Returns all stock items transferred to a specific event
  - `GET /api/companies/current` - Returns the company associated with the logged-in user

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing instead of React Router

**UI Component System**
- Shadcn UI component library with Radix UI primitives for accessible, headless components
- Tailwind CSS for utility-first styling with custom design tokens
- Material Design 3 / Linear-inspired design system focused on information density and clarity
- Inter font family via Google Fonts CDN for consistent typography

**State Management & Data Fetching**
- TanStack Query (React Query) v5 for server state management, caching, and synchronization
- Custom query client configuration with refetch disabled and infinite stale time for controlled data updates
- Form state managed with React Hook Form + Zod for schema validation

**Key Design Decisions**
- Card-based layout system optimized for management dashboards
- Role-based UI rendering - different navigation and features based on user role
- Responsive grid systems: 1/2/4 column layouts adapting to screen size
- Fixed sidebar navigation (16rem width, collapsible on mobile)
- Path aliases (@/, @shared/, @assets/) for clean imports

### Backend Architecture

**Runtime & Framework**
- Node.js with Express.js for RESTful API endpoints
- TypeScript with ESM (ES Modules) for modern JavaScript syntax
- Development mode uses tsx for hot reloading, production uses esbuild for bundled deployment

**API Design Pattern**
- RESTful architecture with resource-based endpoints (/api/companies, /api/events, etc.)
- JSON request/response format with express.json() middleware
- Centralized error handling and request logging
- Session-based authentication with cookies

**Database Layer**
- Drizzle ORM for type-safe database operations
- PostgreSQL via Neon serverless driver with WebSocket support
- Schema-first approach with shared TypeScript types between client and server
- Database schema defined in `shared/schema.ts` for full-stack type safety

**Storage Pattern**
- Repository pattern implementation in `server/storage.ts`
- Abstraction layer (IStorage interface) separating business logic from data access
- CRUD operations for all entities: Users, Companies, Locations, Events, Stations, Products, Price Lists, Stock Movements

**Key Design Decisions**
- Monorepo structure with shared schema between frontend and backend prevents type drift
- Separate index files for dev (index-dev.ts) and production (index-prod.ts) environments
- Dev mode serves Vite middleware for HMR; prod mode serves pre-built static files
- Stock tracking uses event/station hierarchy for granular inventory management

### Authentication & Authorization

**Authentication Strategy**
- Dual authentication: Replit OAuth (openid-client + passport) for platform users and classic email/password for independent registrations
- Session management via express-session with PostgreSQL store (connect-pg-simple)
- BCrypt for password hashing when using email/password registration
- Email verification flag for classic registrations

**Authorization Model**
- Role-based access control (RBAC) with 5 roles:
  - `super_admin`: Full platform access, manages all companies
  - `company_admin`: Manages single company settings, users, and permissions
  - `organizer`: Creates events, locations, manages inventory
  - `warehouse`: Stock loading/unloading operations
  - `bartender`: Consumption tracking at assigned stations

**Security Considerations**
- HTTP-only secure cookies with 7-day TTL
- Session data encrypted and stored in database
- Role checks enforced in API middleware (isAuthenticated)
- Company-scoped data access for multi-tenant isolation

### Data Model & Business Logic

**Entity Relationships**
- Companies have many Users, Locations, Events, Products, Price Lists
- Events belong to Locations and have many Stations
- Stations track inventory via Stocks (quantity per product)
- Stock Movements log all inventory changes (in/out) with timestamps and reasons
- Price Lists contain Price List Items (product pricing per list)

**Stock Movement Workflow**
1. General warehouse stock loaded by warehouse staff
2. Organizer transfers stock to event (creates event-level stock)
3. Organizer allocates stock to stations within event
4. Bartenders consume stock from their assigned station during event
5. End of event: Remaining stock can be returned to general warehouse

**Event Lifecycle States**
- `draft`: Initial creation, not yet scheduled
- `scheduled`: Date set, not yet started
- `ongoing`: Event currently active, consumption tracking enabled
- `closed`: Event completed, generates reports

### Import/Export Features

**CSV Import System**
- PapaParse library for CSV parsing with validation preview
- Bulk product import with category/unit normalization
- Bulk price list item import with product lookup
- Client-side validation before server submission
- Error reporting per row with warnings for non-critical issues

**Reporting & Analytics**
- PDF generation via jsPDF for event reports
- Excel export via XLSX (SheetJS) for data analysis
- Revenue analysis: Theoretical (price list based) vs actual tracking
- Consumption reports by station and product
- Super Admin analytics dashboard for cross-company metrics

## External Dependencies

### Third-Party Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support for edge deployments
- **Google Fonts CDN**: Inter font family delivery
- **SMTP Email**: Nodemailer integration for verification emails (configurable SMTP host/credentials)
- **Replit OAuth**: Optional authentication provider for Replit platform integration

### Key NPM Packages
- **UI Components**: @radix-ui/* primitives, shadcn/ui components
- **Forms & Validation**: react-hook-form, zod, @hookform/resolvers
- **Data Fetching**: @tanstack/react-query
- **Database**: drizzle-orm, drizzle-kit, @neondatabase/serverless
- **Authentication**: passport, openid-client, express-session, bcryptjs
- **Charts**: recharts for analytics visualizations
- **File Processing**: papaparse (CSV), jspdf (PDF), xlsx (Excel)
- **Build Tools**: vite, esbuild, typescript, tsx (dev runtime)

### Development Tools
- TypeScript compiler with strict mode and path aliases
- Tailwind CSS with PostCSS for processing
- Drizzle Kit for database migrations and schema management
- Replit-specific plugins: runtime error overlay, cartographer, dev banner (dev only)