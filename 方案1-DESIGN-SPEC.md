# WattVision Design System Spec

> A professional SaaS dashboard design system with dual-theme support (light + dark).
> Originally built for Drone Bench, reusable for any data dashboard project.

---

## 1. Layout Architecture

```
┌──────────┬──────────────────────────────────────────┐
│  SIDEBAR │  TOP HEADER (60px, sticky)               │
│  (240px) │  [搜索]               [icon] [icon] [👤] │
│  fixed   ├──────────────────────────────────────────┤
│  z:100   │  PAGE CONTENT                            │
│          │                                          │
│  [Logo]  │  Page Title + Actions Row                │
│  Nav 1   │  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐  │
│  Nav 2   │  │ KPI ││ KPI ││ KPI ││ KPI ││ KPI │  │
│  Nav 3   │  └─────┘└─────┘└─────┘└─────┘└─────┘  │
│  ...     │  ┌──────────────────┬────────────────┐  │
│  [导出]  │  │  Main Column     │ Side Column    │  │
│          │  │  (cards, charts, │ (timer, list,  │  │
│          │  │   tasks, notes)  │  resources)    │  │
│          │  └──────────────────┴────────────────┘  │
└──────────┴──────────────────────────────────────────┘
```

- Sidebar: 240px fixed, full height, z-index 100
- Main area: margin-left 240px, flex column
- Top header: 60px, sticky top, z-index 50, backdrop blur
- Page content: max-width 1400px, padding 24px 28px
- Page header: flex row, title left + actions right
- KPI row: grid 5 columns, gap 16px
- Dashboard grid: 2 columns (1fr + 340px), gap 20px

---

## 2. Color Palette

### Light Mode (Default) — Professional SaaS feel

| Role | Color | Usage |
|------|-------|-------|
| Background | `#f8fafc` | Page background |
| Background Alt | `#f1f5f9` | Input backgrounds, hover states |
| Card | `#ffffff` | Card backgrounds |
| Card Border | `#e2e8f0` | Card borders, dividers |
| Accent (Primary) | `#2563eb` | Links, active states, buttons |
| Accent Dim | `rgba(37,99,235,0.08)` | Hover backgrounds |
| Alert | `#ef4444` | Errors, warnings |
| Success | `#22c55e` | Positive states |
| Text Primary | `#0f172a` | Headings, body |
| Text Secondary | `#64748b` | Labels, meta |
| Text Tertiary | `#94a3b8` | Placeholders |
| Shadow | `0 1px 3px rgba(0,0,0,0.06)` | Card shadows |
| Shadow MD | `0 4px 6px rgba(0,0,0,0.05)` | Elevated cards |

### Dark Mode — Power BI Dashboard feel

| Role | Color | Usage |
|------|-------|-------|
| Background | `#121212` | Page background |
| Background Alt | `#1a1a1a` | Input backgrounds |
| Card | `#1E1E1E` | Card backgrounds |
| Card Border | `#2C2C2E` | Card borders, dividers |
| Accent (Primary) | `#00E5FF` | Links, active states, buttons |
| Accent Dim | `rgba(0,229,255,0.12)` | Hover backgrounds |
| Alert | `#FF453A` | Errors, warnings |
| Alert BG | `#3A1C1C` | Alert card bg |
| Success | `#32D74B` | Positive states |
| Text Primary | `#FFFFFF` | Headings, body |
| Text Secondary | `#98989D` | Labels, meta |
| Text Tertiary | `rgba(255,255,255,0.35)` | Placeholders |

---

## 3. Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Page Title | Inter | 22px | 700 |
| Card Title | Inter | 14px | 600 |
| KPI Value | JetBrains Mono | 30-32px | 700 |
| KPI Label | Inter | 12px | 500 |
| Body | Inter | 13-14px | 400 |
| Meta/Label | JetBrains Mono | 10-11px | 400-500 |
| Pill/Badge | JetBrains Mono | 10px | 600 |

---

## 4. Component Specs

### Sidebar
- Width: 240px, fixed position
- Logo: 40x40px rounded square with accent gradient
- Nav items: 10px radius, padding 10px 14px, gap 12px
- Active state: accent-dim background + accent color
- Footer: border-top separator, gradient button
- Mobile: hidden by default (translateX(-100%)), toggle via hamburger

### Top Header
- Height: 60px, sticky top, backdrop blur
- Left: search box (max-width 360px, 10px radius, bg-alt background)
- Right: icon buttons (34x34px, 10px radius) + user avatar

### KPI Cards
- White card with subtle shadow
- Top row: 38x38px icon (12px radius, pastel bg) + pill badge (right-aligned)
- Label in gray, large value in dark bold, unit in gray
- 5-column grid, responsive

### Content Cards (Watt Card)
- Border-radius: 16px
- Padding: 20px
- Background: var(--card), border: 1px solid var(--card-border)
- Header: flex row with title + optional badge
- Grid gap: 16px between cards

### Alert Box
- Left border: 4px solid var(--alert)
- Background: var(--alert-bg)
- Icon: 32px rounded square in alert color
- Title: alert color, body: text-secondary

### Buttons
- Default: border-only, text-secondary, accent on hover
- Primary: accent-dim background + accent color
- Ghost: transparent, accent on hover
- Danger: alert color, red hover
- All: font-mono, 11px, border-radius 6px

### Timer Ring
- 100x100px circular progress indicator
- Conic gradient for progress
- States: running (pulse glow), warning (orange), end (red)

---

## 5. CSS Variable Reference

```css
/* Layout */
--radius: 16px;         /* Card radius */
--radius-sm: 10px;      /* Small card radius */
--radius-xs: 6px;       /* Button/input radius */
--blur: 20px;           /* Backdrop blur */
--shadow: ...;           /* Card shadow (light only) */
--shadow-md: ...;        /* Elevated shadow (light only) */

/* Spacing */
/* Page content padding: 24px 28px */
/* Card padding: 20px */
/* Grid gaps: 16px (KPI), 20px (dashboard grid) */
/* Sidebar padding: 20px 20px 24px (brand), 12px 10px (nav) */

/* Transition */
--t: .25s cubic-bezier(.25,.46,.45,.94);
--ease-spring: .4s cubic-bezier(.34,1.56,.64,1);
```

---

## 6. Usage Instructions

To apply this design system to a new project:

1. Copy the `:root` (light) and `[data-theme="dark"]` CSS variables
2. Implement the sidebar + top-header + page-content layout structure
3. Use `.watt-card` for all content containers
4. Grid values: 5-col KPI, 1fr/340px dashboard split
5. Include Inter and JetBrains Mono fonts from Google Fonts
6. Theme toggle: toggle `data-theme="dark"` on `<html>`

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```js
// Theme toggle
function toggleTheme(){
  const html = document.documentElement;
  if(html.dataset.theme === 'dark'){
    html.dataset.theme = '';
    localStorage.setItem('theme', 'light');
  } else {
    html.dataset.theme = 'dark';
    localStorage.setItem('theme', 'dark');
  }
}
```

---

## 7. Mobile Breakpoints

| Breakpoint | Changes |
|-----------|---------|
| < 1200px | Dashboard grid → single column, KPI → 3 cols |
| < 860px | Sidebar hidden (overlay), KPI → 2 cols, page padding → 16px |
| < 640px | KPI → 2 cols, KPI font → 24px, header padding → 12px, time filter hidden |
