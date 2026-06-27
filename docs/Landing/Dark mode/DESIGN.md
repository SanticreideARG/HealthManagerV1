---
name: Suites Manager
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
---

## Brand & Style
The design system for this hospitality platform is built upon a foundation of **Professionalism, Elegance, and Efficiency**. The aesthetic targets high-end property managers and hospitality staff who require a tool that feels as premium as the services they provide.

The design style is **Modern Corporate with Glassmorphic Accents**. It utilizes a clean, airy layout with heavy whitespace to reduce cognitive load. Subtle transparency effects are reserved for high-level navigational elements to provide a sense of depth and contemporary sophistication without sacrificing the utility required for an enterprise-grade management tool.

## Colors
The palette is rooted in deep architectural tones to evoke stability and trust. 

- **Primary Backgrounds**: The system pivots between a crisp Light mode (`#F9FAFB`) for daytime operations and a focused Dark mode (`#111827`) for low-light environments.
- **Primary Action**: A deep slate (`#0F172A`) is used for primary buttons and text in light mode to maintain high contrast and authority.
- **Secondary/Accent**: A refined blue (`#3B82F6`) identifies interactive elements, status indicators, and selected states.
- **Glassmorphism**: Navigational surfaces use a blurred transparency of the background color at 70% opacity with a subtle white (light mode) or grey (dark mode) 1px border.

## Typography
This design system utilizes **Inter** for all roles to ensure maximum legibility across dense data tables and room management interfaces.

- **Headlines**: Use Semi-Bold weights with slight negative letter-spacing to create a tight, professional appearance.
- **Body Text**: Standardized at 16px for optimal readability.
- **Labels**: Small labels use uppercase with increased tracking (letter-spacing) to differentiate them from interactive body text, perfect for metadata like room numbers or status tags.

## Layout & Spacing
The system employs a **Fluid Grid** with a maximum container width for wide-screen desktop displays.

- **Grid System**: A 12-column grid is used for desktop layouts, transitioning to a 4-column grid for mobile.
- **Rhythm**: All spacing (padding, margins, gaps) follows an 8px linear scale.
- **Padding**: Large 24px-32px internal padding is used within cards and containers to maintain an "elegant" feel and prevent the UI from feeling cramped during heavy data entry.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Ambient Shadows**.

- **Level 0 (Base)**: The primary background color.
- **Level 1 (Cards)**: Raised by a very soft, diffused shadow (15% opacity) with a 1px neutral border (`#E5E7EB` in light mode) to define edges.
- **Level 2 (Navigation/Modals)**: Employs **Glassmorphism**. Surfaces utilize a 12px backdrop-blur and semi-transparent fills. 
- **Interactive Depth**: Buttons and list items do not use shadows by default, but gain a subtle inner-glow or slight lift on hover to indicate interactivity.

## Shapes
The shape language is consistently **Rounded**, striking a balance between the clinical sharpness of legacy software and the overly round "bubbly" feel of consumer apps.

- **Standard Elements**: Buttons and input fields use a 0.5rem (8px) radius.
- **Containers**: Room listing cards and modals use a 1rem (16px) radius to feel approachable yet structured.
- **Indicators**: Status badges (Available, Booked, Maintenance) utilize a full pill-shape (999px) to distinguish them from functional buttons.

## Components

### Buttons
- **Primary**: Solid background (Primary color), white text. Hover state shifts background brightness by 10%.
- **Secondary**: Ghost style with a 1px border of the Primary color. Background fills to a 5% opacity on hover.
- **Icon Buttons**: Circular background only appears on hover to keep the interface clean.

### Room Listing Cards
- High-quality imagery with a fixed aspect ratio (16:9).
- Content is separated by generous 24px padding.
- Price points are emphasized using `headline-md`.
- Secondary details (SQFT, Bed count) use `label-sm` with subtle icons.

### Calendar & Inputs
- **Inputs**: 48px height for touch-ready efficiency. Borders darken on focus.
- **Calendar**: A clean, minimalist grid. Selected dates use the Secondary blue as a solid circular background. Date ranges are indicated by a 10% opacity blue tint connecting the start and end dates.

### Navigation Bar
- Positioned at the top or side, utilizing the glassmorphic blur effect to allow content to scroll underneath beautifully.
- Active links are indicated by a 2px solid bottom or side stroke in the Secondary color.