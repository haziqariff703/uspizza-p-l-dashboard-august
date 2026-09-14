# US Pizza Finance Dashboard Design System

Executive, Swiss-influenced financial interface tailored specifically for US Pizza Malaysia operations. Dense, calm, high legibility, strong contrast, zero decorative "AI slop".

---

## 1. Brand Color Palette (MY US Pizza Identity)

| Token | Hex | HSL | Usage |
|---|---|---|---|
| **Brand Primary (US Pizza Red)** | `#C8102E` / `#BE123C` | `348° 83% 41%` | Primary active states, brand emblem, key callouts |
| **Brand Midnight (Corporate Navy)** | `#0B192C` / `#0F172A` | `215° 60% 11%` | Executive headers, primary text ink, topbar accents |
| **Warm Crust Accent (Gold/Amber)** | `#F59E0B` / `#D97706` | `38° 92% 50%` | Warning badges, pending reconciliation alerts |
| **Canvas Background** | `#F8FAFC` | `210° 40% 98%` | Global dashboard background canvas |
| **Card Surface** | `#FFFFFF` | `0° 0% 100%` | KPI cards, data tables, modals |
| **Hairline Borders** | `#E2E8F0` | `214° 32% 91%` | Card & table separators (subtle, non-distracting) |
| **Muted Text** | `#64748B` | `215° 16% 47%` | Subtitles, helper text, footnote caveats |

---

## 2. Platform Brand Colors & Logos (Point-of-Origin Only)

| Platform | Official Hex | Background Tint | Visual Identity |
|---|---|---|---|
| **GrabFood** | `#00B14F` | `#ECFDF5` | Signature Grab green SVG emblem |
| **Foodpanda** | `#D70F64` | `#FDF2F8` | Signature Foodpanda pink SVG emblem |
| **ShopeeFood** | `#EE4D2D` | `#FFF7ED` | Signature Shopee orange SVG emblem |
| **US Pizza App / Web** | `#C8102E` | `#FFF1F2` | US Pizza branded direct app SVG emblem |
| **In-Store POS** | `#334155` | `#F1F5F9` | Modern counter terminal / register SVG |

---

## 3. Anti-Icon-Slop & Craft Rules (`/oracle` + `@librarian` Review)

1. **Brand SVGs at Anchor Points Only:**
   - Render platform SVGs only on platform cards, platform filter pill triggers, and table column headers.
   - Never sprinkle icons inside every table cell or next to every numeric value.
2. **Actionable Utility Icons Only:**
   - Lucide icons (`ChevronDown`, `Search`, `SlidersHorizontal`, `CalendarDays`, `Download`, `ArrowRight`) reserved strictly for user controls.
   - Standardized at 14px–16px with 1.5px stroke width.
3. **Typography First:**
   - IBM Plex Sans / Inter with `tabular-nums` for all financial numbers.
   - Clear weight hierarchy (Extrabold for KPIs, Semibold for headers, Regular for body).
4. **No Purple AI Gradients:**
   - All generic purple/violet backgrounds replaced with intentional US Pizza Red, Slate, or semantic financial tones.
