---
name: UTP Incident Operations UI
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#5c403f'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#906f6e'
  outline-variant: '#e5bdbb'
  surface-tint: '#bf0229'
  primary: '#9e001f'
  on-primary: '#ffffff'
  primary-container: '#c8102e'
  on-primary-container: '#ffdad8'
  inverse-primary: '#ffb3b1'
  secondary: '#ba0037'
  on-secondary: '#ffffff'
  secondary-container: '#e70648'
  on-secondary-container: '#fffbff'
  tertiary: '#00517d'
  on-tertiary: '#ffffff'
  tertiary-container: '#006aa1'
  on-tertiary-container: '#cce5ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b1'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#92001c'
  secondary-fixed: '#ffdadb'
  secondary-fixed-dim: '#ffb2b7'
  on-secondary-fixed: '#40000d'
  on-secondary-fixed-variant: '#920029'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers a high-efficiency institutional SaaS platform tailored for the Universidad Tecnológica del Perú (UTP). Focused on Campus & IT Infrastructure Incident Management, the aesthetic combines institutional authority with modern, rapid-response enterprise ergonomics.

### Persona & Tone
- **Audience:** Campus IT engineers, operations supervisors, facilities staff, and academic service managers handling real-time ticketing, SLA tracking, and infrastructure uptime.
- **Voice & Feel:** Rigorous, responsive, dependable, and precise. The interface removes administrative clutter and provides clear visual paths for critical decision-making.

### Visual Movement: Corporate / Modern Enterprise SaaS
- **Clean surfaces:** Subtle off-white layered backdrops (`#F8FAFC`, `#F1F5F9`) contrast against crisp white content cards to eliminate visual fatigue during extended operational shifts.
- **Structural Identity:** Institutional UTP Crimson anchors top-level global anchors and primary focal points, while high-contrast Midnight Graphite guarantees legible metadata and data tables.
- **Status-Driven Visuals:** Clear, semantic indicator badges (Emerald, Amber, Sky Blue, and Red) communicate ticket health at a glance without cognitive friction.

## Colors

The palette establishes an immediate institutional link to UTP while prioritizing WCAG AA/AAA compliance across high-density data views and incident queues.

### Color Tokens & Semantic Roles
- **Primary Institutional (`#C8102E`):** Main interactive brand tone, utilized for primary submit actions, global app headers, active navigational indicators, and critical system headers.
- **Secondary Crimson Accent (`#E40046`):** Vibrant accent for interactive hover transitions, metric highlights, and focused priority elements.
- **Midnight Slate Neutral (`#1E293B` & `#111827`):** Primary canvas typography, high-priority label headers, and high-contrast structural borders (`#E2E8F0`).
- **Canvas & Surface Tier:**
  - `Surface-0 (Canvas)`: `#F8FAFC`
  - `Surface-1 (Elevated/Cards)`: `#FFFFFF`
  - `Surface-2 (Subtle Sections/Inputs)`: `#F1F5F9`
  - `Surface-Border`: `#E2E8F0`
- **Incident & Status Matrix:**
  - `Resolved / Active (`#10B981`)`: Paired with `#ECFDF5` background for healthy system nodes and resolved tickets.
  - `In Progress (`#0284C7`)`: Paired with `#F0F9FF` background for technician assignment and active diagnostics.
  - `Pending / Escalated (`#F59E0B`)`: Paired with `#FFFBEB` background for blocked or review states.
  - `High Priority / Critical Outage (`#EF4444`)`: Paired with `#FEF2F2` background and `#991B1B` text for immediate incident attention.
  - `Inactive / Closed (`#6B7280`)`: Paired with `#F3F4F6` background for archived logs and legacy items.

## Typography

The typography pairs **Montserrat** (geometric, crisp, authoritative) for structural headers with **Inter** (systematic, highly legible at small sizes) for data-dense operational tables, log timestamps, and form controls.

### Implementation Principles
- **Display & Headings:** Montserrat provides an institutional, engineering-focused look. Used exclusively for dashboard titlebars, modal headlines, and primary metric counters.
- **Body & Data Grid:** Inter delivers tall x-height, clear numeric tabular alignment, and unambiguous letterforms for server hostnames, ticket UUIDs, and technical descriptions.
- **Metadata & Timestamps:** Timestamps, API paths, and machine-generated IDs utilize `body-sm` or `label-sm` with tabular numerals (`tnum`) in muted neutral gray (`#64748B`).

## Layout & Spacing

The layout is built around a flexible 12-column responsive grid engineered for dense administrative dashboards, side-by-side split inspectors, and fast ticket triage.

### Spatial Rhythm
- **Rhythm Core:** Consistent 4px / 8px spatial intervals. Component internals rely on `space-sm` (8px) and `space-md` (16px), preventing unneeded whitespace while maintaining clear visual hierarchy.
- **Form Factor Adapters:**
  - **Desktop (>= 1280px):** 12-column layout with 24px gutters. A fixed 256px collapsible operations sidebar, followed by a dynamic queue pane and an optional right-hand incident detail inspector.
  - **Tablet (768px - 1279px):** 8-column layout with 16px gutters. Navigation collapses to an icon rail; cards reflow vertically with stacked inline actions.
  - **Mobile (< 768px):** Single-column fluid view with 16px outer margins (`margin`). Incident cards span 100% width, actions collapse into sticky bottom trays or full-width buttons.

## Elevation & Depth

To maintain a clean, high-performance SaaS look, visual separation relies on crisp 1px borders paired with soft, low-opacity ambient shadows rather than heavy drop shadows.

### Elevation Hierarchy
- **Level 0 (Flat / Canvas):** Used for base page backgrounds (`#F8FAFC`). No shadow, no outline.
- **Level 1 (Cards & Standard Panels):** White surface (`#FFFFFF`) with border `1px solid #E2E8F0` and shadow `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Hovered Records & Floating Menus):** White surface with border `1px solid #CBD5E1` and shadow `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modals, Action Drawers & Critical Alerts):** Border `1px solid #E2E8F0` and shadow `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Floating Action Button (FAB):** Primary red (`#C8102E`) background with shadow `0 10px 15px -3px rgba(200, 16, 46, 0.35)`.

## Shapes

The design system uses a balanced corner radius profile (`roundedness: 2`), delivering smooth rounded edges that look modern without taking up unnecessary screen space in data-heavy screens.

### Radius Assignments
- **Controls & Form Elements (`rounded` / 8px):** Inputs, select dropdowns, search bars, and standard operational buttons.
- **Surfaces & Data Cards (`rounded-lg` / 16px):** Incident cards, analytical summary widgets, and modal dialogues.
- **Badges & Tag Indicators (`rounded-full` / 9999px):** Status badges (Active, High, In Progress) use pill shapes to distinguish them from clickable rectangular buttons.
- **Card Action Footer Divider:** Subtle internal border (`#F1F5F9`) preserving the card's rounded perimeter while separating content from actionable controls.

## Components

### Buttons
- **Primary:** Background `#C8102E`, text `#FFFFFF`, radius 8px, font Inter SemiBold 14px. Hover state transitions to `#B00E28`. Active state `#980B22`.
- **Secondary (Subtle / Action Link):** Background transparent, text `#0284C7` (for edit states) or `#EF4444` (for destructive actions). Hover state adds background `#F8FAFC` with subtle border.
- **Destructive:** Background `#FEF2F2`, border `1px solid #FCA5A5`, text `#DC2626`. Hover state `#DC2626` background with `#FFFFFF` text.
- **FAB (Quick Ticket Add):** 56x56px circular action button anchored at bottom-right (24px offset), background `#C8102E`, white icon, elevated with `#C8102E` ambient glow.

### Incident Cards
- **Architecture:** White surface, `1px solid #E2E8F0`, 16px border-radius, `space-md` internal padding.
- **Header:** Montserrat 16px SemiBold incident title with inline status pills (e.g., `Active` in Emerald `#10B981` and `High` in Red `#EF4444`).
- **Body:** Key-value metadata rows (`Descripción`, `Razón de rechazo`) set in Slate `#64748B` labels with dark `#1E293B` values. Footnote shows timestamp in 12px mono-spaced Slate.
- **Footer Action Bar:** Full-width divided footer separated by a subtle 1px divider, providing two balanced 50% width interactive buttons: "Editar Estado" (Edit State) and "Eliminar" (Delete).

### Status Chips & Priority Badges
- **Compact Geometry:** Height 22px, padding 2px 10px, radius 9999px, text 11px SemiBold uppercase tracking.
- **Variants:**
  - *Active:* `#10B981` solid or `#ECFDF5` background with `#047857` text.
  - *High Priority:* `#EF4444` solid or `#FEF2F2` background with `#B91C1C` text.
  - *In Progress:* `#0284C7` solid or `#F0F9FF` background with `#0369A1` text.
  - *Inactive:* `#6B7280` solid or `#F3F4F6` background with `#374151` text.

### Form Inputs & Search Fields
- **Container:** Background `#F8FAFC`, border `1px solid #CBD5E1`, radius 8px, height 40px, padding horizontal 12px.
- **Focus State:** Background `#FFFFFF`, border-color `#C8102E`, ring `0 0 0 3px rgba(200, 16, 46, 0.15)`.
- **Search Header:** Includes left search icon in `#94A3B8`, clear button on the right, and instant keyboard shortcut indicator (`/` or `Ctrl+K`).

### Lists & Activity Feeds
- **Structure:** Clean dividers (`#F1F5F9`) separating items, row hover state tinted with `#F8FAFC`. Left-accent indicator borders (3px wide) visually mapping incident severity.