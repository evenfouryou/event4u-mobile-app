# Event4U Management System

## Overview

Event4U is a comprehensive event management and inventory tracking system designed for event organizers. It supports multi-role management of events, inventory, stations, and real-time consumption tracking. The system features a company-centric hierarchy with role-based access control, enabling efficient operations from platform-level oversight to event-specific inventory management and consumption tracking. Key capabilities include email verification, AI-powered analytics for insights, intelligent purchase order management, and multi-bartender station assignments. The system aims to streamline event logistics, optimize inventory, and provide actionable business intelligence.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 30, 2025
- **Comprehensive UI/UX Redesign - Dark Nightclub Theme**: Complete visual overhaul with club/nightlife aesthetic
  - **Color System**: Dark background (#0a0e17), card backgrounds (#151922), golden primary accent (#FFD700), teal status indicators (#00CED1)
  - **Glass-Morphism Effects**: New `glass-card` class with backdrop-blur and semi-transparent backgrounds, includes solid fallback for unsupported browsers
  - **Golden Gradient Buttons**: `gradient-golden` class for CTAs with enforced black text in all states (hover/focus/active)
  - **Framer Motion Animations**: Added subtle animations (opacity/y transitions) across all pages for modern feel
  - **Gradient Icon Containers**: Stats cards use rounded-2xl icon containers with color gradients
- **Updated Pages (15+ files)**: Landing, Login, Register, Home, Beverage, Events, Event Detail, Warehouse, Products, Stations, Suppliers, Companies, Users, Settings, Accounting, Personnel, Night File
- **Mobile Bottom Navigation Improvements**: 
  - Golden center FAB with role-specific functional links
  - Warehouse FAB now opens bulk load dialog via `?action=load` URL parameter
  - Updated icons and labels for all roles
- **StatsCard & QuickActionCard Components**: Reusable components for consistent dashboard styling across modules
- **Accessibility Improvements**: WCAG-compliant contrast on golden buttons, glass-card fallback for browsers without backdrop-filter support

### November 29, 2025
- **User-Level Feature Management**: Migrated from company-level to user-level module access control
  - **user_features table**: Boolean flags for each module per user (Beverage, Contabilità, Personale, Cassa, Night File)
  - **API Endpoints**: GET/PUT for per-user feature configuration (/api/user-features/:userId, /api/user-features/current/my)
  - **Users Page UI**: Super admins can manage modules via Settings2 icon on gestore user cards
  - **Dynamic Home Page**: Modules conditionally rendered based on user's enabled features
  - **Default Features**: Beverage enabled by default, other modules disabled until super admin enables them
- **Company Deletion**: Super admins can delete companies via trash icon with foreign key constraint handling
- **Route Ordering Fix**: Specific routes (/current/my) now registered before parameterized routes (/:userId) to prevent path matching issues
- **Four New Management Modules Implemented**: Complete backend and frontend for Contabilità, Personale, Cassa, and File della Serata
  - **Contabilità (Accounting)**: Fixed costs, extra costs, maintenances, and documents management with full CRUD operations
  - **Personale (Personnel)**: Staff registry with event assignments and payment tracking
  - **Cassa (Cash Register)**: Sectors, positions, cash entries, and funds reconciliation for events
  - **File della Serata (Night File)**: Central document integrating all modules per event with generation, approval, and export workflows
- **Database Schema Extended**: New tables for all modules with proper relations to events and companies
- **API Routes with Role Protection**: Admin-only mutations protected with isAdminOrSuperAdmin middleware
- **Home Page Navigation Updated**: All 4 new modules accessible from dashboard cards, "Dati" shows "Prossimamente"

### November 25, 2025
- **Comprehensive Mobile Optimization**: Full mobile-first responsive design implementation
  - **Touch-Friendly Targets**: All interactive elements (buttons, inputs, selects) have 44px minimum touch height on mobile (iOS standard)
  - **iOS Auto-Zoom Prevention**: Input fields use 16px font-size on mobile to prevent Safari auto-zoom on focus
  - **Safe Area Support**: CSS env(safe-area-inset-*) handling for iPhone notch and home indicator
  - **Mobile Bottom Navigation**: Fixed bottom navigation bar with Home, Events, Warehouse, Reports shortcuts (visible only on screens < 768px)
  - **Responsive Headers**: Login, Register, and Landing pages have compact mobile headers with smaller logos and optimized button layouts
  - **Dialog/Sheet Mobile Optimization**: Full-screen dialogs on mobile with proper keyboard handling and safe-area padding
  - **Viewport Configuration**: Disabled user scaling for app-like experience on mobile devices

### November 24, 2025
- **Module-Based Home Page Structure**: Restructured navigation with a new home page featuring four main sections (Beverage, Contabilità, Personale, Dati). Each section is displayed as a large card with icon, description and navigation. Only Beverage is currently active, other sections show "Prossimamente" (Coming Soon).
- **Dedicated Beverage Dashboard**: Created /beverage route containing the full operational dashboard with stats (ongoing events, scheduled events, products, low stock), quick access links, events list, and low stock alerts. This replaces the old home page content for gestore/organizer users.
- **EventFourYou Logo Integration**: Applied the new logo image throughout the application: sidebar header, login page header, register page, and landing page.
- **Role-Specific Views Preserved**: Bartenders and warehouse users still see their specialized views in the Beverage dashboard; SuperAdmin sees company management dashboard on home.
- **Step-by-Step Event Creation Wizard**: Replaced dialog-based event creation with comprehensive multi-step wizard (/events/wizard) featuring:
  - **4-Step Process**: (1) Basic info (name, location, format), (2) Dates/times/capacity, (3) Recurrence configuration with manual date selection, (4) Summary and notes
  - **Draft Auto-Save**: Automatic draft saving every 30 seconds + on step navigation, enabling users to pause and resume event creation
  - **State Preservation**: Intelligent state management using previewVersion hash and userEditedSelection flag to preserve manual recurring date selections across draft loads and parameter changes
  - **Date Serialization**: Proper ISO string conversion for all Date objects before API submission
  - **Visual Progress**: Progress bar, step icons, and last-saved timestamp for clear workflow status
  - **Draft Management**: Dedicated "Bozze in Sospeso" section in events.tsx for viewing and resuming incomplete events
- **Event Formats/Categories System**: Added event_formats table and CRUD API with admin-only permissions. Created management UI with color picker and badge preview. Events can now be classified with custom formats (e.g., "Wedding", "Concert") displayed as colored badges throughout the UI.
- **Manual Recurring Event Date Selection**: Enhanced recurring events UI with real-time date preview and checkbox selection. Users can now review generated dates and manually select which occurrences to create. Backend validates selected dates and preserves all event fields correctly with meaningful metadata (interval=1, count=selected_count, endDate=last_date).
- **Recurring Events Validation**: Implemented strict backend validation - automatic recurring requires interval>=1 and either count or endDate; manual selection validates ISO strings and requires at least one date selected. Removed default value from recurrenceInterval to enable proper validation distinction.
- **OIDC User Role Preservation**: Fixed upsertUser to filter undefined values preventing existing user fields (especially role) from being overwritten with undefined during OIDC authentication updates.
- **Event Format CompanyId Fix**: Fixed event format creation by removing empty companyId from frontend submission and stripping it from backend request body before validation, ensuring authenticated user's companyId is always used.
- **Date Input Validation**: Fixed "Invalid time value" error in event form by adding isNaN check before calling toISOString() on Date objects, preventing crashes with invalid Date instances.
- **Warehouse Multi-Product Operations**: Added bulk-load and bulk-unload endpoints with table interface for managing multiple products simultaneously with quantity validation
- **Search & Filtering**: Implemented product search by name/code in stock list, and movement filters by type/supplier/product with defensive enrichment
- **Email Verification URLs**: Replaced deprecated `REPL_SLUG`/`REPL_OWNER` with `REPLIT_DEV_DOMAIN` and `PUBLIC_URL` fallback for production deployments
- **Warehouse Role Permissions**: Enforced warehouse role restrictions - protected supplier creation/edit/delete and event creation endpoints with `isAdminOrSuperAdmin` middleware, disabled UI buttons for warehouse users

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and bundling. It utilizes Wouter for routing and Shadcn UI with Radix UI primitives, styled with Tailwind CSS, for an accessible and responsive user interface based on Material Design 3 principles. State management and data fetching are handled by TanStack Query v5, while form management uses React Hook Form with Zod for validation. The design emphasizes a card-based layout, role-based UI rendering, responsive grid systems, and fixed sidebar navigation.

### Backend Architecture

The backend is developed with Node.js and Express.js, using TypeScript with ESM for RESTful APIs. It features a centralized error handling system and session-based authentication. The database layer employs Drizzle ORM for type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first approach for full-stack type safety. A repository pattern provides an abstraction layer for CRUD operations across all entities. The system maintains a monorepo structure with separate development and production environments.

### Authentication & Authorization

Authentication supports both Replit OAuth and classic email/password registration with BCrypt hashing and email verification. Session management is handled by `express-session` with a PostgreSQL store. Authorization is based on a Role-Based Access Control (RBAC) model with five roles: `super_admin`, `gestore` (company admin), `organizer`, `warehouse`, and `bartender`. Security considerations include HTTP-only secure cookies, encrypted session data, role checks in API middleware, and company-scoped data access for multi-tenant isolation. Impersonation features for `super_admin` and `gestore` roles are also implemented. Warehouse users have read-only access to suppliers and events but cannot create, modify, or delete them.

### Data Model & Business Logic

The system's data model links Companies to Users, Locations, Events, Products, and Price Lists. Events contain Stations, which track inventory via Stocks. Stock Movements log all inventory changes. The stock movement workflow involves loading general warehouse stock, transferring to events, allocating to stations, consumption by bartenders, and returning remaining stock. Events progress through `draft`, `scheduled`, `ongoing`, and `closed` lifecycle states. Key features include an email verification system, AI-powered analytics for insights like low stock alerts and consumption patterns, recurring event series, and a purchase order management system with intelligent order generation based on stock levels and consumption. Multi-bartender assignment to stations and user account activation/deactivation are also supported.

### Import/Export Features

The system supports CSV import for bulk product and price list item uploads with client-side validation. Reporting capabilities include PDF generation for event reports and Excel export for data analysis, covering revenue and consumption reports.

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