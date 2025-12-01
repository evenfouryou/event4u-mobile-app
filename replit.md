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