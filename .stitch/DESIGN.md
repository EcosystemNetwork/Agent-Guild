# Design System Specification — Agent Guild

## 1. Overview & Creative North Star

This design system is built to transform a standard data interface into a high-fidelity "Mission Control" experience. Moving away from the sterile, flat aesthetic of modern SaaS, we are embracing a philosophy of **"The Tactical Void."**

The Creative North Star for this system is the intersection of **deep space exploration and high-frequency intelligence.** We achieve this through a "depth-first" layout strategy. Instead of a flat grid, we use a modular, asymmetric architecture that suggests a living, breathing command center. Components should feel like physical glass panels floating in a darkened cockpit — layered, luminous, and hyper-functional.

## 2. Colors & Surface Philosophy

### Tokens
| Token | Hex | Role |
|---|---|---|
| `background` | #131318 | Base layer |
| `surface` | #131318 | Primary surface |
| `surface-container-low` | #1b1b20 | Primary workspaces |
| `surface-container` | #1f1f25 | Standard containers |
| `surface-container-high` | #2a292f | Actionable modules |
| `surface-container-highest` | #35343a | Floating intelligence |
| `surface-bright` | #39383e | Hover states |
| `primary` | #d2bbff | Primary text/accent |
| `primary-container` | #7c3aed | Electric Violet CTA |
| `secondary` | #4cd7f6 | Neon Cyan accent |
| `secondary-container` | #03b5d3 | Cyan container |
| `on-surface` | #e4e1e9 | Primary text |
| `on-surface-variant` | #ccc3d8 | Secondary text |
| `outline-variant` | #4a4455 | Ghost borders (15% opacity) |

### Status Colors
- **Online/Active**: Emerald #10B981
- **Busy/In-Mission**: Amber #F59E0B
- **Offline/Error**: Rose #F43F5E

### Rules
- **No-Line Rule**: No 100% opaque solid borders. Use tonal shifts and glassmorphism.
- **Glass & Gradient Rule**: Use Electric Violet and Neon Cyan as soft (10-15% opacity) radial gradients behind key modules.

## 3. Typography
- **Headlines/Labels**: Space Grotesk, uppercase, letter-spacing 0.05em
- **Body**: Inter, regular weight
- **Display**: Tight tracking (-2%), used sparingly for hero metrics

## 4. Elevation & Depth
- Tonal layering, NOT drop shadows
- Ambient glows: primary at 8% opacity, blur 32px
- Ghost Borders: outline-variant at 15% opacity
- Inner Glow: primary at 10% opacity for "powered on" effect

## 5. Component Rules
- **Buttons**: Primary = solid #7C3AED + outer glow; Secondary = ghost border; Tertiary = text-only
- **Cards**: No divider lines, tonal separation only. Hover → surface-bright
- **Status Chips**: Pill-shaped, 4px glowing dot + label
- **Corners**: 8px default, 12px max, pill for chips

## 6. Signature Elements
- Scanline overlays at 2% opacity
- Data scaffolding grid marks at 10% opacity
- Kinetic motion: 200ms ease-out transitions
