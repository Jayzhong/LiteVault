# LiteVault v1.1 Design System

> **Visual Direction**: "Modern Minimal" — Soft, calm, distraction-free.

## 1. Principles

1.  **Unified Brand Color**: Single source of truth. The Primary Mint (`oklch(0.7 0.16 145)`) is used for all primary actions, logos, and success states.
2.  **Semantic Tokens**: No hardcoded hex values or utility colors (e.g., `text-emerald-600`) in semantic components. Use `text-primary`, `bg-accent`, etc.
3.  **Calm Surfaces**: Use off-whites (`bg-background`) and pure whites (`bg-card`) to create subtle depth without harsh borders.

## 2. Global Assets & Favicons
- **Favicons**: Managed via RealFaviconGenerator.
  - Location: `/public/brand/favicon/`
  - Includes: `favicon.ico`, `apple-touch-icon.png`, `site.webmanifest`.
- **Logo Mark**:
  - Display: Sidebar & Auth headers.
  - Source: `/design/assets/logo/litevault-logo-original.png`
  - Public Asset: `/public/brand/logo/logo-mark.png`
  - Component: `AppLogo.tsx` (uses `next/image`).

## 3. Color System

### Tokens (The Truth)

All colors are defined in `globals.css` as OKLCH values.

| Token | Role | Usage Rule |
| :--- | :--- | :--- |
| `primary` | **Brand/Action** | Main buttons, Logo background, Selected states (heavy). |
| `primary-foreground` | **Contrast Text** | Text on top of primary (usually White or Dark Green). |
| `accent` | **Active/Highlight** | Active Sidebar items, Toggles, Selected states (light). |
| `accent-foreground` | **Active Text** | Text on accent backgrounds. |
| `muted` | **Secondary BG** | Tag backgrounds, Ghost hover states. |
| `muted-foreground` | **Helper Text** | Metadata, Timestamps, Placeholders. |
| `background` | **Canvas** | App background (Off-white #F9FAFB). |
| `card` | **Surface** | Cards, Modals (White #FFFFFF). |

### Palette Reference

*   **Mint Green (Primary)**: `oklch(0.7 0.16 145)` (~Emerald-400)
*   **Light Mint (Accent)**: `oklch(0.95 0.05 145)` (~Emerald-50)
*   **Dark Mint (Text)**: `oklch(0.25 0.1 145)` (~Emerald-900)

## 3. Component Usage

### Buttons
*   **Primary**: `bg-primary text-primary-foreground rounded-full shadow-sm hover:bg-primary/90`
*   **Ghost/Secondary**: `bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground`

### Sidebar
*   **Active Item**: `bg-accent text-accent-foreground` (Light Mint BG + Dark Mint Text)
*   **Inactive Item**: `text-muted-foreground hover:text-foreground`

### Tags
*   **Default**: `bg-muted text-foreground`
*   **Selected**: `bg-primary text-primary-foreground` (if applicable) or `bg-accent`

### 6. Interactive Components

#### Tooltips
- **Usage**: Use for icon-only buttons or ambiguous controls.
- **Microcopy**: Tooltips must use localized strings from `microcopy.ts`.
- **Implementation**: shadcn/ui `Tooltip`.

#### Selection Highlights
- **Pattern**: Interactive list items should use a "Primary Tint" on hover/focus.
- **Tokens**:
  - Background: `bg-primary/5` (Soft Mint tint)
  - Border: `border-primary/30`
  - Border: `border-primary/30`
  - Focus Ring: `ring-primary`

#### Input Focus ("Clean Glow")
- **Pattern**: Inputs use a solid border + ring to prevent aliasing.
- **Tokens**:
  - `focus-visible:border-primary`
  - `focus-visible:ring-1 focus-visible:ring-primary`
  - (Avoid mixing opacity/blur rings with border changes)

### 7. Tag System Colors
We use a centralized palette of 10 soft/muted colors to ensure readability and brand alignment. Do not use arbitrary hex codes.

**Palette Keys**: `gray`, `red`, `orange`, `amber`, `green`, `teal`, `blue`, `indigo`, `purple`, `pink`.

**Token Structure**:
```ts
{
  id: string;     // Palette ID
  name: string;   // Display Name
  bg: string;     // Background (e.g., #ECFDF5)
  fg: string;     // Foreground Text (e.g., #065F46)
  border: string; // Border (e.g., #A7F3D0)
}
```
All tag chips should use `ColoredTagBadge` which automatically resolves these tokens.

## 4. QA Checklist
- [ ] **No Random Greens**: Are we using `bg-emerald-*` anywhere? (Should be NO).
- [ ] **Primary Consistency**: Does the "Save" button match the active Sidebar item's text hue?
- [ ] **Focus Rings**: Do inputs glow with the primary mint color? (`ring-primary`).
