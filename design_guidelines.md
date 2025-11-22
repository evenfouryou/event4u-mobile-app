# Event4U Management System - Design Guidelines

## Design Approach

**Selected Approach:** Design System - Material Design 3 / Linear-inspired
**Justification:** Information-dense management application requiring clarity, efficient workflows, and role-based dashboards. Draws from Linear's clean data presentation and Material Design's structured component hierarchy.

## Typography System

**Font Family:** Inter (via Google Fonts CDN)
- Headings: 600 weight
- Body: 400 weight
- Data/Numbers: 500 weight (tabular figures)

**Scale:**
- Page Title: text-2xl (24px)
- Section Header: text-xl (20px)
- Card Title: text-lg (18px)
- Body/Forms: text-base (16px)
- Labels/Meta: text-sm (14px)
- Table Data: text-sm (14px)

## Layout System

**Spacing Units:** Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, py-8)

**Application Structure:**
- Fixed sidebar navigation (w-64) - collapsible on mobile
- Top header bar (h-16) with user profile, notifications, company selector
- Main content area with max-w-7xl container, px-6 py-8
- Card-based layout with rounded-lg, shadow-sm

**Grid Systems:**
- Dashboard metrics: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Data tables: Full width with horizontal scroll on mobile
- Forms: grid-cols-1 lg:grid-cols-2 for multi-column inputs

## Component Library

### Navigation
**Sidebar:**
- Role-based menu items with icons (Heroicons)
- Active state: subtle left border indicator
- Grouped sections: "Events," "Inventory," "Reports," "Settings"
- Bottom section: Company switcher (for users with multiple companies)

**Top Bar:**
- Left: Breadcrumb navigation (Home > Events > Summer Festival 2024)
- Right: Search, notifications bell, user avatar dropdown

### Data Display

**Tables:**
- Sticky header row
- Hover state on rows
- Inline actions (edit, delete icons) on row hover
- Pagination at bottom
- Filter/sort controls above table
- Empty states with illustrations and CTAs

**Cards:**
- Consistent padding: p-6
- Header with title and action button
- Divider between header and content
- Footer for metadata or actions

**Stats Cards (Dashboard):**
- Large number display (text-3xl, font-semibold)
- Label below (text-sm)
- Trend indicator (↑/↓ with percentage)
- Icon in top-right corner

### Forms

**Input Fields:**
- Floating labels or top-aligned labels with required asterisk
- Helper text below (text-sm)
- Error states with red border and error message
- Consistent height: h-10 for inputs
- Full width within container

**Form Layout:**
- Group related fields with subtle section headers
- Action buttons right-aligned at bottom
- "Save" primary button, "Cancel" secondary button with gap-3

**Special Inputs:**
- Date/time pickers for events
- Quantity adjusters (+/- buttons) for inventory
- Dropdown selects for locations, products, stations
- Multi-select for permissions/roles

### Inventory-Specific Components

**Stock Level Indicator:**
- Progress bar showing current vs. capacity
- Color coding threshold (critical/warning/healthy) - described semantically
- Quantity badge overlay

**Quick Consumption Panel (Mobile):**
- Large touch targets (min-h-14)
- Product name with current quantity
- - and + buttons flanking quantity display
- Swipe-to-consume pattern option

**Movement Log:**
- Timeline-style list with icons
- User avatar, action description, timestamp
- Expandable details for each entry

### Event Management

**Event Card:**
- Event name (text-lg, font-semibold)
- Date/time with calendar icon
- Location with map pin icon
- Status badge (Draft/Active/Closed)
- Participant count
- Quick action menu (•••)

**Station Assignment:**
- Drag-and-drop interface for assigning staff
- Station cards showing assigned bartender avatar
- Stock status indicator per station

### Reports

**End-of-Night Report:**
- Summary cards at top (total consumption, cost, variance)
- Expandable sections per station
- Product breakdown table with columns: Product | Initial | Consumed | Remaining | Cost
- Export buttons (PDF, Excel) in header
- Date range selector for historical reports

## Role-Based Dashboards

**Super Admin:**
- Company list with creation CTA
- System-wide metrics
- Activity feed

**Company Admin:**
- Quick stats (upcoming events, stock alerts)
- Recent activity timeline
- Team management shortcuts

**Organizer:**
- Calendar view of events
- Active events with real-time consumption
- Inventory alerts prominently displayed
- Quick create event button (floating action button)

**Warehouse Manager:**
- Stock levels overview
- Pending transfers list
- Load/unload forms immediately accessible

**Bartender (Mobile-First):**
- Today's assigned events (card list)
- Tap event → see station → product list
- Large touch-friendly consumption controls
- Offline sync indicator

## Mobile Considerations

- Bottom navigation for primary actions
- Swipe gestures for common tasks
- Simplified header (logo + notifications)
- Sticky action buttons at screen bottom
- Pull-to-refresh for inventory updates
- Haptic feedback on quantity adjustments

## Accessibility

- Consistent focus indicators (2px outline)
- ARIA labels for icon-only buttons
- Keyboard navigation throughout
- Screen reader announcements for stock updates
- High contrast ratios for all text
- Touch targets minimum 44x44px on mobile