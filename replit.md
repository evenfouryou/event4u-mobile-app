# Event4U Management System

## Overview
Event4U is an event management and inventory tracking system designed to optimize event logistics, manage inventory, and provide business intelligence. It supports multi-role management of events, inventory, and stations with real-time consumption tracking. Key capabilities include a company-centric hierarchy, role-based access control, AI-powered analytics, intelligent purchase order management, multi-bartender station assignments, and an advanced SIAE-compliant ticketing module for Italian fiscal regulations. The system aims to enhance efficiency and decision-making for event organizers.

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
The core data model links Companies to Users, Locations, Events, Products, and Price Lists. Events include Stations with detailed inventory tracking covering all stages from loading to returns. Core features include email verification, AI analytics for inventory/consumption, an event creation wizard, and purchase order management.

### SIAE Ticketing Module
A comprehensive SIAE-compliant ticketing and fiscal management system for Italian clubs, adhering to Italian fiscal regulations. It manages reference data, fiscal compliance, customer management, ticketing, transactions, and operations, including API endpoints for CRUD, activation cards, customer registration, ticket emission with fiscal seals, and XML transmission. Fiscal seal generation occurs server-side via a Desktop Bridge Relay System. The module is disabled by default and can be enabled per `gestore` user by a Super Admin. It integrates CAPTCHA and supports RCA, RMG, and RPM SIAE report types. The system includes robust auto-correction and pre-transmission validation for SIAE XML, including DTD validation and system code checks, to prevent common errors and ensure consistent system codes. This validation also prevents RPM reports from being sent for future months or including future events. System code resolution actively reads the EFFF file from the Smart Card for S/MIME signed transmissions to ensure correctness.

**Entertainment Incidence Auto-Calculation (DPR 640/1972):**
-   Genres 60-69 (dance/disco): Default 100% entertainment incidence + tax type 'I' (ISI + IVA 22%)
-   Other genres: Default 0% entertainment incidence + tax type 'S' (spectacle, IVA only)
-   Users can override these defaults if their event has different characteristics (e.g., disco with >50% live music = 0% incidence)

**Event Postponement & Cancellation Workflow (SIAE Compliance):**
-   **Postponement**: Events can be postponed with automatic enforcement of SIAE time limits:
    -   Entertainment genres (60-69): Max 90 days from original date
    -   Spectacle genres: Max 12 months from original date
    -   Already-sold tickets maintain their original fiscal seal (no re-emission required)
    -   `forceOverride` flag required to proceed if exceeding limits
-   **Cancellation**: Full event cancellation with automatic refund workflow:
    -   Closes ticket sales immediately
    -   Tracks refund deadline (configurable, default 30 days)
    -   Batch refund processing with Stripe integration
    -   Individual ticket refund failures logged for retry tracking
-   **API Endpoints**:
    -   `POST /api/siae/ticketed-events/:id/postpone` - Postpone event with new date
    -   `POST /api/siae/ticketed-events/:id/cancel` - Cancel event with reason
    -   `GET /api/siae/ticketed-events/:id/refund-list` - List tickets pending refund
    -   `POST /api/siae/tickets/:id/refund` - Refund individual ticket
    -   `POST /api/siae/ticketed-events/:id/refund-batch` - Process all refunds
    -   `GET /api/siae/ticketed-events/:id/cancellation-deadline` - Get cancellation deadline info

**Termini Annullamento (DM 13/07/2000 - Art. 7):**
-   Biglietti: Annullabili entro 5° giorno lavorativo successivo all'evento
-   Abbonamenti: Annullabili entro 5° giorno lavorativo dalla fine della validità
-   Backend enforces deadlines with 400 error after expiry (super_admin can bypass)
-   Cassa interface shows deadline reminder with days remaining
-   API: `checkCancellationDeadline()` utility in siae-utils.ts

**Blocco Emissione Eventi Terminati:**
-   Biglietti non emettibili dopo 4 ore dall'inizio evento (tolleranza per ritardatari)
-   Backend blocca con errore 400 e codice `EVENT_ENDED`
-   Super_admin può bypassare il blocco (con audit log)
-   Audit log traccia tutti i tentativi bloccati e gli override

**Coerenza Date Report SIAE (Errore 0603 Fix - 2026-01-22):**
-   L'errore SIAE 0603 "Le date dell'oggetto, del nome file, e del contenuto del riepilogo non sono coerenti" si verifica quando le date nel report non sono allineate
-   Per report RMG (giornalieri): `DataGenerazione` nell'XML DEVE corrispondere alla data nel nome file (RPG_YYYY_MM_DD) e al subject email
-   Per report RPM (mensili): `DataGenerazione` può essere la data corrente (mese successivo al periodo), ma `Mese` deve corrispondere al periodo del report
-   La validazione pre-trasmissione ora verifica la coerenza tra `DataGenerazione` e la data del report (non più la data odierna)

### International Operating Mode
The system supports international ticket sales with SIAE exemption through a flexible operating mode system:
-   **Operating Modes**: Gestori can choose between `italy_only` (default), `international_only`, or `hybrid` mode during registration or via admin settings.
-   **Registration Choice**: During gestore registration, users select their operating territory (Solo Italia, Solo Estero, Italia + Estero).
-   **Per-Event Override**: In hybrid mode, individual events can be marked as `isInternational` to bypass SIAE requirements.
-   **SIAE Auto-Skip**: The scheduler and routes automatically skip report generation (RMG, RPM, RCA) for international events and international_only companies.
-   **Admin Control**: Super Admin can modify a gestore's operating mode via the Admin Gestori page.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) providing a centralized view of event operations with tabbed navigation for Overview, Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance, featuring real-time updates via WebSockets.

### Interactive Floor Plan Viewer & Advanced Ticketing System
The public event detail page (`/public/event/:id`) features an interactive floor plan viewer for seat/sector selection with zoom and pan functionalities. The advanced ticketing system includes distributed seat hold management with real-time seat locking and WebSocket updates, along with a visual floor plan editor using SVG canvas and polygon drawing for zones, supporting draft/publish versioning, Smart Assist, and a heatmap overlay for occupancy recommendations.

### Desktop Bridge Relay System
A WebSocket relay system enabling remote smart card reader access from a desktop Electron application to the web application. It supports token-based authentication and company-scoped message routing, facilitating digital signatures for SIAE C1 reports using PKI functionality, managing signature error handling, and handling SIAE report transmission via email with an audit trail. It supports CAdES-BES digital signatures for SIAE report compliance and S/MIME email signatures for RCA transmissions.

### Additional Modules
-   **Italian Fiscal Validation**: Server-side validation for Italian fiscal identifiers.
-   **Name Change Management (Cambio Nominativo)**: SIAE-compliant ticket holder name change workflow.
-   **SIAE-Compliant Resale Marketplace**: A marketplace for ticket resale compliant with Italian Allegato B regulations.
-   **Scanner Management Module**: Manages event scanner operators with granular event assignment and permissions.
-   **School Badge Manager Module**: Digital badge creation system for schools and organizations.
-   **Paid Reservation Booking System (PR Wallet)**: Reservation system for event lists and tables with promoter commission tracking and payout requests.

### Event Management & Customer Home
Events are categorized for `gestore` view into "In Corso", "Futuri", and "Passati". The public-facing home page features event categories, geolocation support with a "Vicino a te" filter, and Google Maps integration for venue display.

### Mobile App (Expo React Native)
The mobile app, located in the `mobile-app/` folder, is built with Expo SDK 54 and React Native. It features a dark nightclub theme (#0a0e17 background, #FFD700 golden accent, #00CED1 teal status) with glass-morphism effects matching the web design exactly. Uses React Navigation for routing, TanStack Query for data fetching, and Zustand for state management. Backend connection: https://workspace.jonathanpetrell.repl.co

**Mobile Modules (155 screens total - Complete Feature Parity):**
-   **Authentication**: Login, Register, Forgot Password (3 screens)
-   **Public Events**: Home, Landing, Events list, Event details, Venues, Cart, Checkout, TicketVerify (8 screens)
-   **Account Management**: Profile, Tickets, Wallet, Name Change, Resales, Subscriptions, ClientWallet, ResaleSuccess (8 screens)
-   **SIAE Ticketing**: Dashboard, Transmissions, Reports, Config, ActivationCards, Customers, Events, Tickets, TicketTypes, NameChanges, Resales, Transactions, BoxOffice, Subscriptions, NumberedSeats, AuditLogs, Approvals, Tables, TicketingConsole, ReportC1, ReportC2 (22 screens)
-   **Inventory/Magazzino**: Products, Stock levels, Consumption, Adjustments, Warehouse, Suppliers, PurchaseOrders, ReturnToWarehouse (8 screens)
-   **Management/Organizer**: Dashboard, Events, Locations, LocationDetail, Stations, StationDetail, EventWizard, DirectStock, BartenderStock, EventFormats, NightFile, Personnel, Staff, Reports, EventPageEditor (15 screens)
-   **AI Analytics**: Dashboard, Insights, Trends, Predictions, Recommendations (5 screens)
-   **Accounting/Contabilità**: Dashboard, Invoices, InvoiceDetail, Transactions, FinancialReports (5 screens)
-   **Admin Super**: Dashboard, SuperAdminDashboard, Gestori, GestoreDetail, Companies, SystemSettings, Users, NameChanges, SiteSettings, BillingPlans, BillingOrganizers, BillingOrganizerDetail, BillingInvoices, BillingReports, GestoreCompanies, GestoreUsers, GestoreEvents, EventDetail, Stripe (19 screens)
-   **Floor Plan Editor**: Home, Viewer, Editor, ZoneDetail (4 screens)
-   **Scanner Management**: Home, Scanning, Scanned, Tickets, Management (5 screens)
-   **PR Dashboard**: Home, Dashboard, MyEvents, Staff, Management, StaffPrHome, StaffPrEventPanel, Scanner (8 screens)
-   **Cashier**: Home, Dashboard, CassaBiglietti, Management, EventAllocations (5 screens)
-   **Marketing**: Dashboard, Email, Loyalty, Referrals, Bundles (5 screens)
-   **School Badges**: Manager, Landing, Verify, View, Error, Scanner (6 screens)
-   **Settings/Tools**: Settings, Printer, TemplateBuilder, DigitalTemplateBuilder, DownloadSmartCardApp, Import, PriceLists, Beverage (8 screens)

## External Dependencies

### Third-Party Services
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **Google Fonts CDN**: For typography.
-   **SMTP Email**: For email verification and password reset.
-   **Replit OAuth**: Optional authentication.
-   **OpenAI API**: For AI analytics (`gpt-4o-mini`).
-   **MSG91 OTP**: For SMS OTP verification.
-   **Google Maps Platform**: For map functionalities.