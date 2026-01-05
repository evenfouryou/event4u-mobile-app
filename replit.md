# Event4U Management System

## Overview
Event4U is an event management and inventory tracking system designed to streamline event logistics, optimize inventory, and provide actionable business intelligence for event organizers. It supports multi-role management of events, inventory, and stations with real-time consumption tracking. Key capabilities include a company-centric hierarchy, role-based access control, AI-powered analytics, intelligent purchase order management, multi-bartender station assignments, and an advanced SIAE-compliant ticketing module for Italian fiscal regulations. The system aims to enhance efficiency and decision-making in event operations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18, TypeScript, and Vite, with Wouter for routing and Shadcn UI (Radix UI, Tailwind CSS) for components, adhering to Material Design 3. State management is via TanStack Query v5, and forms use React Hook Form with Zod validation. The UI features a dark, nightclub-themed aesthetic with glass-morphism, Framer Motion animations, card-based layouts, responsive grids, and fixed sidebar navigation. It supports PWA functionality for caching and offline support.

### Backend
Built with Node.js and Express.js in TypeScript (ESM), the backend provides RESTful APIs with centralized error handling and session-based authentication. Drizzle ORM is used for type-safe PostgreSQL operations via Neon's serverless driver, following a schema-first and repository pattern within a monorepo structure.

### Authentication & Authorization
The system supports Replit OAuth and email/password registration with BCrypt hashing and email verification. Session management uses `express-session` with a PostgreSQL store. Role-Based Access Control (RBAC) includes `super_admin`, `gestore`, `organizer`, `warehouse`, and `bartender` roles. Security measures include HTTP-only secure cookies, encrypted sessions, API middleware for role checks, and company-scoped data access for multi-tenancy.

### Data Model & Business Logic
The core data model links Companies to Users, Locations, Events, Products, and Price Lists. Events include Stations with inventory tracking (Stocks, Stock Movements) covering loading, transfer, allocation, consumption, and returns. Events transition through `draft`, `scheduled`, `ongoing`, and `closed` states. Core features include email verification, AI analytics for inventory/consumption, an event creation wizard, and purchase order management.

### SIAE Ticketing Module
A SIAE-compliant ticketing and fiscal management system for Italian clubs, adhering to Italian fiscal regulations (Provvedimento 04/03/2008). It manages reference data, fiscal compliance, customer management, ticketing, transactions, and operations. API endpoints handle CRUD for reference data, activation cards, customer registration, ticket emission with fiscal seals, transaction processing, and XML transmission tracking. Fiscal seal generation is server-side via a Desktop Bridge Relay System. This module is disabled by default and can be enabled per `gestore` user by a Super Admin. It includes CAPTCHA integration and supports three SIAE report types:
- **RCA (RiepilogoControlloAccessi)**: Single-event report with SIAE response (Log.xsi confirmation or error)
- **RMG (Riepilogo Mensile Giornaliero)**: Daily report aggregating events by day (silent, no response)
- **RPM (Riepilogo Periodico Mensile)**: Monthly fiscal report (silent, no response)

#### RCA XML Structure (DTD: ControlloAccessi_v0001_20080626.dtd)
The RCA XML generator (`generateRCAXml` in siae-utils.ts) produces DTD-compliant output:
```xml
<RiepilogoControlloAccessi Sostituzione="N">
  <Titolare>
    <DenominazioneTitolareCA>, <CFTitolareCA>, <CodiceSistemaCA>,
    <DataRiepilogo>, <DataGenerazioneRiepilogo>, <OraGenerazioneRiepilogo>,
    <ProgressivoRiepilogo>
  </Titolare>
  <Evento>
    <CFOrganizzatore>, <DenominazioneOrganizzatore>, <TipologiaOrganizzatore>,
    <SpettacoloIntrattenimento>, <IncidenzaIntrattenimento>, <DenominazioneLocale>,
    <CodiceLocale>, <DataEvento>, <OraEvento>, <TipoGenere>, <TitoloEvento>,
    <Autore>, <Esecutore>, <NazionalitaFilm>, <NumOpereRappresentate>,
    <SistemaEmissione>
      <CodiceSistemaEmissione>
      <Titoli>  <!-- One per sector (CodiceOrdinePosto) -->
        <CodiceOrdinePosto>, <Capienza>,
        <TotaleTipoTitolo>+  <!-- One per ticket type (I1, R1, O1) -->
      </Titoli>*
    </SistemaEmissione>
  </Evento>
</RiepilogoControlloAccessi>
```
- **TipoTitolo codes**: I1=Intero (full), R1=Ridotto (discounted), O1=Omaggio (free)
- **Element order**: Strictly follows DTD sequence specification
- **Reference files**: `attached_assets/siae_master/siae-master/src/SIAE/templates/RCA_2015_09_22_001.xml`

The transmission UI provides color-coded guidance (green for RCA with response, blue for RMG, amber for RPM) and enforces security validations including company ownership, event closure status, and exclusion of cancelled/annulled tickets from totals. An event approval workflow is in place for SIAE ticketed events.

### Event Command Center (Event Hub)
A real-time dashboard (`/events/:id/hub`) with tabbed navigation for Overview (KPIs, activity log, entrance charts, venue map), Ticketing, Guest Lists, Tables, Staff, Inventory, and Finance, featuring real-time updates via WebSockets.

### Interactive Floor Plan Viewer
The public event detail page (`/public/event/:id`) features an interactive floor plan viewer for seat/sector selection with pointer-centered zoom, pinch-to-zoom, drag-to-pan, zoom controls, hover tooltips, and auto-zoom to zones on click.

### Advanced Ticketing System
A real-time ticketing system featuring a distributed seat hold management with real-time seat locking and WebSocket updates. It includes a visual floor plan editor with SVG canvas and polygon drawing for zones, supporting draft/publish versioning. Smart Assist and a heatmap overlay provide occupancy recommendations and an operational mode for staff.

### Event Page 3.0 Editor
An admin tool for customizing public event pages with modular blocks, managing event configuration, lineup artists, timeline items, and FAQs through dedicated database tables.

### Desktop Bridge Relay System
A WebSocket relay system (`/ws/bridge`) enables remote smart card reader access from a desktop Electron app to the web application. It supports token-based authentication and company-scoped message routing. This system facilitates digital signatures for SIAE C1 reports using PKI functionality, manages signature error handling, and handles SIAE report transmission via email with an audit trail.

### SIAE Digital Signatures (CAdES-BES via libSIAEp7.dll)
The system supports CAdES-BES digital signatures for SIAE report compliance, generating .p7m binary files using the official SIAE smart card library. Key features:
- **Direct smart card signing**: Uses `libSIAEp7.dll` with `PKCS7SignML` function for direct P7M creation
- **Bypasses Windows CSP**: Smart card accessed directly via SIAE library, avoiding certificate store issues
- **File-based workflow**: XML written to temp file → PKCS7SignML creates P7M → read and Base64 encode
- **Error handling**: Interprets smart card error codes (0x6983=PIN blocked, 0x6982=wrong PIN, 0x63Cx=attempts remaining)
- **Signature persistence**: P7M content stored in `siaeTransmissions.p7mContent` for offline resend
- **CAdES-BES ONLY (2025)**: No XMLDSig fallback - SIAE requires SHA-256 CAdES-BES detached signatures (fixes Error 40605)
- **Email transmission**: P7M attachments sent as `application/pkcs7-mime` with proper binary encoding
- **Offline resilience**: Cached signatures used when bridge is disconnected during resend operations
- **RCA DTD Compliance**: XML remains unmodified (DTD: `RiepilogoControlloAccessi` allows only `Titolare, Evento+`), signature is detached P7M

**Error 40605 Resolution (2026-01-05)**: The legacy XMLDSig approach embedded a `<Signature>` element inside the XML, violating the RCA DTD schema which only allows `(Titolare, Evento+)` children. The fix uses CAdES-BES detached signatures via `libSIAEp7.dll` + BouncyCastle, keeping the XML DTD-compliant while the P7M wraps both XML and signature in a standard PKCS#7 container.

### S/MIME Email Signatures (via libSIAEp7.dll)
For SIAE RCA transmissions, emails must be S/MIME signed per Allegato C (Provvedimento 04/03/2008). Key compliance requirements:
- **Email header "From:" must match certificate email**: Allegato C 1.6.2.a.3 - immutable after S/MIME signature
- **Valid PKCS#7 structure**: Uses `libSIAEp7.dll` (PKCS7SignML) for RFC 5652 compliant CMS signatures
- **SHA-256 algorithm**: Modern hash algorithm (micalg=sha-256)
- **Certificate email extraction**: Multiple patterns supported (SAN: RFC822, email:, rfc822Name=; Subject: E=, EMAIL=, EMAILADDRESS=)
- **multipart/signed format**: Standard S/MIME v2 structure with smime.p7s attachment
- **Server-side validation**: Blocks RCA transmission if certificate email unavailable
- **External headers preservation**: From/To/Subject headers placed OUTSIDE multipart/signed structure for email client visibility (fixed 2026-01-04, commit f5319092)

#### S/MIME Message Structure (RFC 5751 Compliant)
```
From: certificate-email@example.com     ← EXTERNAL (visible to email client)
To: servertest2@batest.siae.it          ← EXTERNAL (visible to email client)
Subject: RCA_YYYY_MM_DD_CODE_###...     ← EXTERNAL (visible to email client)
MIME-Version: 1.0
Content-Type: multipart/signed; protocol="application/pkcs7-signature"; 
  micalg=sha-256; boundary="----=_smime_..."

------=_smime_...
[Body MIME content - THIS IS SIGNED]
------=_smime_...
Content-Type: application/pkcs7-signature; name="smime.p7s"
[Base64 signature]
------=_smime_...--
```

**Critical**: External headers (From/To/Subject) are NOT part of the signature and must be placed before MIME-Version. The bridge desktop (`Program.cs SignSmime()`) extracts these headers from the input MIME and places them externally.

### Italian Fiscal Validation
Server-side validation for Italian fiscal identifiers including Codice Fiscale (16-character) and Partita IVA (11-digit) with checksum algorithms, adhering to Agenzia delle Entrate requirements.

### Name Change Management (Cambio Nominativo)
SIAE-compliant ticket holder name change workflow with configurable temporal limits, maximum changes per ticket, optional auto-approval, and payment integration for fees.

### SIAE-Compliant Resale Marketplace (Secondary Ticketing)
A marketplace for ticket resale complying with Italian Allegato B regulations. Key features:
- **Seller listing**: Ticket holders can list tickets for resale with price ≤ original face value
- **Buyer purchase flow**: Atomic reservation with 10-minute Stripe checkout window
- **Fiscal compliance**: Original ticket annulled with `annullato_rivendita` status, new ticket emitted with fresh fiscal seal (`sigilloFiscaleRivendita`)
- **Seller payout**: Automatic wallet credit minus 5% platform fee via `siaeWalletTransactions`
- **C1 report integration**: Resale annulments included in cancelled tickets count for SIAE reporting
- **UI components**: `ResaleMarketplace` on public event pages with SIAE verification badges, success page at `/account/resale-success`

### Scanner Management Module
Manages event scanner operators for `gestore`/`super_admin` users, supporting scanner account creation, mobile-optimized UI, and granular event assignment with permissions for list, table, and ticket scanning (including specific sectors/types).

### School Badge Manager Module
A digital badge creation system for schools and organizations, accessible to `gestore`/`admin` users. It allows custom branded landing pages, email verification, QR code generation, and a public view page for badges, supporting custom domains.

### Paid Reservation Booking System (PR Wallet)
A reservation system for event lists and tables with PR (promoter) commission tracking using a wallet model. It handles PR registration, authentication, commission accumulation, payout requests, and integrates with scanners for payment verification and check-in.

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