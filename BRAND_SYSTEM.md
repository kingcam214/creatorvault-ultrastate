# CreatorVault ULTRASTATE — Brand System

## Logo & Name
- **Primary:** CreatorVault ULTRASTATE
- **Short:** CreatorVault
- **Tagline:** "The ultimate creator economy platform. Monetize your content, build your brand, and connect with your audience across cultures."

## Color Palette
```css
/* Primary Brand Colors */
--brand-purple: #8B5CF6      /* Main brand color */
--brand-pink: #EC4899         /* Accent/highlight */
--brand-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)

/* Dark Theme (Primary) */
--background: #0f0f23         /* Deep purple-black */
--foreground: #f8f9fa         /* Off-white text */
--card: #1a1a2e               /* Card backgrounds */
--border: #2d2d44             /* Subtle borders */
--accent: #8B5CF6             /* Interactive elements */
--muted: #6b7280              /* Secondary text */

/* Status Colors */
--success: #10b981            /* Green for success */
--warning: #f59e0b            /* Orange for warnings */
--error: #ef4444              /* Red for errors */
--info: #3b82f6               /* Blue for info */
```

## Typography
```css
/* Primary Font: Inter (modern, clean) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Headings */
h1: 3rem (48px), font-weight: 800, letter-spacing: -0.02em
h2: 2.25rem (36px), font-weight: 700, letter-spacing: -0.01em
h3: 1.875rem (30px), font-weight: 600
h4: 1.5rem (24px), font-weight: 600

/* Body */
body: 1rem (16px), font-weight: 400, line-height: 1.6
small: 0.875rem (14px), font-weight: 400
```

## Logo Usage
- **Header:** White "CreatorVault" text with gradient "ULTRASTATE"
- **Favicon:** CV monogram in purple
- **Social:** Full logo on gradient background
- **Bots:** Text-only "CreatorVault" (Telegram/WhatsApp)

## Voice & Tone
- **KingCam Tone:** Direct, confident, no-BS, results-focused
- **Creator Tone:** Empowering, supportive, action-oriented
- **Technical Tone:** Clear, precise, proof-driven

## UI Patterns
- **Cards:** Dark backgrounds with subtle borders, rounded corners (0.75rem)
- **Buttons:** Gradient primary, outline secondary, ghost tertiary
- **Inputs:** Dark with purple focus rings
- **Badges:** Pill-shaped with role-specific colors
- **Modals:** Centered with backdrop blur

## Component Library
- **shadcn/ui** as base
- Custom overrides for brand colors
- Consistent spacing: 4px base unit (0.25rem)
- Border radius: 0.5rem (medium), 0.75rem (large), 9999px (full)

## Iconography
- **Style:** Lucide icons (outline style)
- **Size:** 20px default, 24px large, 16px small
- **Color:** Inherit from parent or brand-purple

## Animation
- **Transitions:** 200ms ease-in-out (default)
- **Hover:** Scale 1.02, brightness 1.1
- **Loading:** Pulse animation on brand-purple
- **Success:** Bounce animation

## Enforcement Rules
1. NO generic blue (#3b82f6) as primary color
2. NO default shadcn colors without override
3. NO white backgrounds in dark theme
4. ALL headings must use brand gradient or purple
5. ALL interactive elements must have hover states
6. ALL forms must have validation feedback
7. ALL modals must have backdrop blur
8. ALL cards must have consistent padding (1.5rem)
