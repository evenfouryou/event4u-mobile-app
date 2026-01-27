# Event4U Management System

## Overview
Event4U is an event management and inventory tracking system designed to optimize event logistics, manage inventory, and provide business intelligence. It supports multi-role management of events, inventory, and stations with real-time consumption tracking. Key capabilities include a company-centric hierarchy, role-based access control, AI-powered analytics, intelligent purchase order management, multi-bartender station assignments, and an advanced SIAE-compliant ticketing module for Italian fiscal regulations. The system aims to enhance efficiency and decision-making for event organizers, offering a comprehensive solution for event planning and execution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18, TypeScript, Vite, Wouter for routing, and Shadcn UI (Radix UI, Tailwind CSS) for components, adhering to Material Design 3. State management is handled by TanStack Query v5, and forms use React Hook Form with Zod validation. The UI features a dark, nightclub-themed aesthetic with glass-morphism, Framer Motion animations, card-based layouts, responsive grids, fixed sidebar navigation, and PWA functionality.

### Backend
The backend is developed with Node.js and Express.js in TypeScript (ESM), providing RESTful APIs with centralized error handling and session-based authentication. Drizzle ORM facilitates type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first and repository pattern within a monorepo structure.

### Authentication & Authorization
The system supports Replit OAuth and email/password registration. Session management uses `express-session` with a PostgreSQL store. Role-Based Access Control (RBAC) includes `super_admin`, `gestore`, `organizer`, `warehouse`, and `bartender` roles. Security measures include HTTP-only secure cookies, encrypted sessions, API middleware for role checks, and company-scoped data access for multi-tenancy.

### Data Model & Business Logic
The core data model links Companies to Users, Locations, Events, Products, and Price Lists. Events include Stations with detailed inventory tracking. Core features include email verification, AI analytics for inventory/consumption, an event creation wizard, and purchase order management.

### SIAE Ticketing Module
A comprehensive SIAE-compliant ticketing and fiscal management system for Italian clubs, adhering to Italian fiscal regulations. It manages reference data, fiscal compliance, customer management, ticketing, transactions, and operations. It includes API endpoints for CRUD, activation cards, customer registration, ticket emission with fiscal seals, and XML transmission. Fiscal seal generation occurs server-side via a Desktop Bridge Relay System. The module is disabled by default and can be enabled per `gestore` user by a Super Admin. It integrates CAPTCHA and supports RCA, RMG, and RPM SIAE report types. The system includes robust auto-correction and pre-transmission validation for SIAE XML to prevent common errors. Event postponement and cancellation workflows are SIAE compliant, managing deadlines and refund processes. SIAE response monitoring automatically processes email responses and extracts error codes for re-correction support.

### International Operating Mode
The system supports international ticket sales with SIAE exemption through a flexible operating mode system: `italy_only`, `international_only`, or `hybrid`. Gestori select their operating territory during registration, and individual events in `hybrid` mode can be marked as `isInternational` to bypass SIAE requirements. The system automatically skips report generation for international events and companies.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) providing a centralized view of event operations with tabbed navigation for Overview, Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance, featuring real-time updates via WebSockets.

### Interactive Floor Plan Viewer & Advanced Ticketing System
The public event detail page (`/public/event/:id`) features an interactive floor plan viewer for seat/sector selection. The advanced ticketing system includes distributed seat hold management with real-time seat locking and WebSocket updates. A visual floor plan editor uses SVG canvas and polygon drawing for zones, supporting draft/publish versioning and a heatmap overlay.

### Desktop Bridge Relay System
A WebSocket relay system enabling remote smart card reader access from a desktop Electron application to the web application. It supports token-based authentication and company-scoped message routing, facilitating digital signatures for SIAE C1 reports using PKI functionality, managing signature error handling, and handling SIAE report transmission via email with an audit trail. It supports CAdES-BES digital signatures and S/MIME email signatures for RCA transmissions.

### Mobile App (Expo React Native)
The mobile app, located in the `mobile-app/` folder, is built with Expo SDK 52 and React Native 0.76 with TypeScript. It features a dark nightclub theme with glass-morphism effects matching the web design. Uses a custom AppNavigator, TanStack Query for data fetching, and Zustand for state management.

**Completed Mobile Screens (January 2026):**
- **Admin Dashboard**: AdminGestoreDetailScreen (4 tabs), AdminCompaniesScreen, AdminUsersScreen, AdminEventsScreen, AdminEventDetailScreen (5 tabs: Overview/Tickets/Tables/Staff/Stats), AdminNameChangesScreen (filter chips, approval actions), AdminBillingScreen, AdminSettingsScreen
- **Gestore Dashboard**: GestoreDashboard, GestoreEventsScreen, GestoreEventDetailScreen (8 tabs), GestoreInventoryScreen, GestoreProductsScreen (3 tabs), GestorePriceListsScreen, GestoreStaffScreen, GestoreScannerScreen, GestoreMarketingScreen, GestoreAccountingScreen, GestoreProfileScreen, GestoreSettingsScreen, GestoreCreateEventScreen, GestorePRManagementScreen, GestoreCompaniesScreen, GestoreStationsScreen, GestoreWarehouseScreen (3 tabs), GestoreSuppliersScreen, GestorePersonnelScreen (4 role tabs), GestoreReportsScreen (4 tabs), GestoreCashierScreen, GestoreUsersScreen
- **Public/Client**: Events, Venues, EventDetail, VenueDetail, Tickets, Cart, Checkout, Account, Wallet, etc.
- **PR/Scanner**: PRDashboard, PREventsScreen, PRGuestListScreen, ScannerDashboard, ScannerEventsScreen, ScannerScanScreen

All screens follow consistent patterns: useTheme hook, Italian labels, testID attributes, RefreshControl, Loading states, Card/GlassCard/Badge components.

### Additional Modules
-   **Italian Fiscal Validation**: Server-side validation for Italian fiscal identifiers.
-   **Name Change Management (Cambio Nominativo)**: SIAE-compliant ticket holder name change workflow.
-   **SIAE-Compliant Resale Marketplace**: A marketplace for ticket resale compliant with Italian Allegato B regulations.
-   **Scanner Management Module**: Manages event scanner operators with granular event assignment and permissions.
-   **School Badge Manager Module**: Digital badge creation system for schools and organizations.
-   **Paid Reservation Booking System (PR Wallet)**: Reservation system for event lists and tables with promoter commission tracking and payout requests.

## External Dependencies

### Third-Party Services
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **Google Fonts CDN**: For typography.
-   **SMTP Email**: For email verification and password reset.
-   **Replit OAuth**: Optional authentication.
-   **OpenAI API**: For AI analytics (`gpt-4o-mini`).
-   **MSG91 OTP**: For SMS OTP verification.
-   **Google Maps Platform**: For map functionalities.