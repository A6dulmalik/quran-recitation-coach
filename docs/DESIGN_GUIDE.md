# Qur'an Recitation Coaching - Visual Design Guide

## Design Philosophy

**Minimal, Elegant, Islamic-Inspired**
- Clean typography with focus on Arabic text
- Soft color palette (teals, creams, neutral tones)
- Distraction-free interface
- Smooth animations and transitions
- Mobile-first responsive design

## Color Palette

### Primary Colors
```
Primary (Teal):      #2D7F7F    oklch(0.5 0.15 160)   - Actions, highlights
Secondary (Soft):    #D9EDEC    oklch(0.85 0.08 160)  - Backgrounds, accents
Background:          #F7FAFB    oklch(0.98 0.01 200)  - Page background
```

### Neutral Colors
```
Foreground (Dark):   #333333    oklch(0.2 0 0)        - Primary text
Muted (Gray):        #888888    oklch(0.55 0 0)       - Secondary text
Card (White):        #FFFFFF    oklch(1 0 0)          - Containers
Border:              #E5E7EB    oklch(0.9 0 0)        - Dividers
```

### Feedback Colors
```
Success (Green):     #10B981                           - Correct answers
Error (Red):         #EF4444                           - Errors/incorrect
Warning (Amber):     #F59E0B                           - Warnings
```

## Typography

### Font Family
- **Primary**: Geist (Google Fonts)
- **Mono**: Geist Mono (for technical/code)
- **Arabic**: Noto Sans Arabic (with fallbacks)

### Scale
```
Heading 1: 2.25rem  (36px)  - text-4xl   font-bold
Heading 2: 1.875rem (30px)  - text-3xl   font-bold
Heading 3: 1.5rem   (24px)  - text-2xl   font-bold
Heading 4: 1.25rem  (20px)  - text-xl    font-semibold
Body:      1rem     (16px)  - text-base  font-normal
Small:     0.875rem (14px)  - text-sm    font-normal
Tiny:      0.75rem  (12px)  - text-xs    font-normal
```

### Arabic Text
```
Qur'anic Display:    3xl     font-arabic  - Main text in recitation
Verse Number:        sm      text-muted   - Metadata
```

### Line Height
```
Headings:   1.2  (tight for emphasis)
Body:       1.6  (relaxed for readability)
Arabic:     1.8  (extra space for complex scripts)
```

## Spacing Scale

All spacing uses Tailwind's default scale (multiples of 4px):

```
Micro:       2px    (p-0.5)
Extra Small: 4px    (p-1)
Small:       8px    (p-2)
Base:        12px   (p-3)
Medium:      16px   (p-4)
Large:       24px   (p-6)
X-Large:     32px   (p-8)
XX-Large:    48px   (p-12)
Huge:        64px   (p-16)
```

**Gap Classes**: `gap-2`, `gap-4`, `gap-6`, `gap-8`
**Padding Classes**: `p-4`, `px-4`, `py-6`, `pt-8`
**Margin Classes**: `m-4`, `mx-auto`, `my-0`

## Component Styles

### Button

**Primary Button** (CTA)
```
Background:     Primary (teal)
Text Color:     White
Hover:          Primary/90% (darker)
Padding:        py-3 px-6 (lg) or py-6 (full-width)
Border Radius:  rounded (default)
Shadow:         None (minimal)
Font Weight:    font-semibold
```

**Outline Button** (Secondary)
```
Background:     Transparent
Border:         1px border-border
Text Color:     Foreground
Hover:          bg-secondary/50
```

**Destructive Button** (Stop/Delete)
```
Background:     Red
Text Color:     White
Hover:          Red/90%
```

### Cards

**Base Card**
```
Background:     white (bg-card)
Border:         1px border-border/50
Border Radius:  rounded-lg
Padding:        p-6
Hover Effect:   border-primary/30 (subtle)
```

**Highlighted Card** (Selected/Active)
```
Background:     primary/10
Border:         1px border-primary
Shadow:         None
```

**Feedback Panel** (Error/Success)
```
Background:     secondary/50 or error/50
Border:         1px border-primary/20 or error/20
Icon:           AlertCircle or CheckCircle2
```

### Input Fields

```
Background:     bg-input (light)
Border:         1px border-border
Border Radius:  rounded
Padding:        px-3 py-2
Focus:          border-primary
Placeholder:    text-muted-foreground
```

### Scroll Area

- Custom scrollbar styling (Radix UI scroll-area)
- Padding right: pr-4 (to avoid text overlap)
- Height: Fixed (h-[500px]) for Surah list
- Smooth scrolling

## Layout Patterns

### Container
```
Max-width:      max-w-4xl (56rem)
Horizontal:     mx-auto (centered)
Padding:        px-4 (responsive margins)
```

### Hero Section (Onboarding)
```
Display:        Flex column, centered
Min Height:     min-h-screen
Justify:        items-center justify-center
Padding:        py-12 px-4
Background:     Gradient from-primary/5 to-background
```

### Sticky Bar (Top Navigation)
```
Position:       sticky top-0 z-20
Background:     bg-card/50 backdrop-blur-sm
Border:         border-b border-border/50
Padding:        py-4
```

### Sticky Controls (Bottom)
```
Position:       sticky bottom-0
Background:     bg-card/80 backdrop-blur-sm (semi-transparent)
Border:         border-t border-border/50
Padding:        py-6 px-4
Backdrop Blur:  sm (subtle frosted effect)
Gradient:       from-background to-transparent (top gradient)
```

### Grid Layouts

**Two Column Layout** (Surah Selection)
```
Grid:           grid grid-cols-1 lg:grid-cols-3
Gap:            gap-8
Desktop:        2 cols (list) + 1 col (sidebar)
Mobile:         Single column, stacked
```

**Single Column** (Recitation)
```
Grid:           Single centered container
Max-width:      max-w-4xl
Centered:       mx-auto
```

## Animation & Transitions

### Smooth Transitions
```
Duration:       200-300ms
Easing:         ease-in-out (default)
Applied to:     All hover states, border colors, backgrounds
```

### Recording Waveform Animation
```
Duration:       1.5s
Type:           opacity pulse
Loop:           infinite
Bars:           5 vertical bars, staggered delays
Colors:         primary (teal)
Heights:        Increasing (20px to 80px)
Delay Stagger:  0.1s between bars
```

### Page Transitions
```
Type:           CSS fade
Duration:       200ms
Applied to:     Page changes, card enters
```

### Loading Spinner
```
Duration:       2s
Type:           continuous rotation
Icon:           Loader2 from lucide
Color:          primary
Size:           w-10 h-10
```

## Responsive Breakpoints

```
Mobile:         < 640px   (full-width, single column)
Tablet:         640px+    (md: prefix)
Desktop:        1024px+   (lg: prefix)
Large Desktop:  1280px+   (xl: prefix)
```

### Responsive Classes Used
```
md:text-lg      - Larger text on tablet+
lg:col-span-2   - Multi-column on desktop
md:grid-cols-3  - 3 columns on tablet+
sm:p-6          - Adjust padding on mobile
```

## Accessibility

### Focus States
```
Outline:        outline-ring/50
Color:          Primary
Width:          2px
Applied to:     All focusable elements
```

### Color Contrast
```
Body Text:      WCAG AA (4.5:1 minimum)
Large Text:     WCAG AA (3:1 minimum)
UI Components:  WCAG AA
```

### Semantic HTML
```
<header>        - Top navigation
<main>          - Primary content
<h1>, <h2>, etc> - Proper hierarchy
<button>        - Interactive elements
<label>         - Form labels
```

### ARIA Labels
```
aria-label="Search Surahs"
aria-disabled="true"
role="region"
```

## Visual Hierarchy

### Page Weight (Visual Importance)
1. **Primary CTA** (e.g., "Start Recitation")
   - Largest, brightest, full-width
   - Primary color
   
2. **Heading**
   - Large, bold, dark text
   - 2xl-3xl size
   
3. **Secondary Info**
   - Normal size, gray text
   - Regular weight
   
4. **Tertiary**
   - Small text, muted color
   - xs size, lighter weight

### Visual Balance
- Center important content
- Use whitespace generously
- Align items in grids
- Consistent icon sizing (w-5 h-5, w-6 h-6)

## Icon Usage

### Icon Sizing
```
Navigation:     w-5 h-5  (20px)
Buttons:        w-5 h-5  (inline with text)
Large Icons:    w-6 h-6  (24px)
Display Icons:  w-10 h-10 (40px) or w-20 h-20 (80px)
```

### Icon Color
```
Primary Action:  text-primary
Secondary:       text-muted-foreground
Error:           text-red-600
Success:         text-green-600
```

### Icon Spacing
```
With Text:      gap-2 (8px between icon and text)
Standalone:     Centered in container
```

## Dark Mode (Optional Future)

If dark mode is implemented:
```
Background:     Very dark (#1a1a1a)
Cards:          Dark gray (#2d2d2d)
Text:           Light (#f0f0f0)
Primary:        Lighter teal (lightened 15%)
Secondary:      Adjusted for contrast
Borders:        Light gray
```

## Micro-interactions

### Button Hover
```
Scale:          Subtle (99% → 100%)
Shadow:         Add light shadow
Duration:       200ms
```

### Card Hover
```
Border:         Change to primary/30
Shadow:         Light shadow appears
Duration:       200ms
```

### Verse Selection
```
Background:     Fade to primary/10
Border:         Fade to primary
Icon:           Appear on right (ChevronRight)
```

### Error Feedback
```
Background:     Red/50
Icon:           AlertCircle (red)
Text:           Red with explanation
Animation:      Fade in 200ms
```

## Spacing Examples

### Surah Card
```
Outer Padding:      p-4
Inner Number Size:  text-xs uppercase
Name Font:          font-semibold text-foreground
Description:        text-sm text-muted-foreground mt-1
Gap Between Items:  gap-4 (flex)
Vertical Spacing:   space-y-2
```

### Recitation Card
```
Padding:            p-6
Top Label:          text-xs uppercase tracking-widest text-muted-foreground mb-3
Arabic Text:        text-3xl leading-relaxed text-right
Verse Number:       text-xs text-muted-foreground mt-2
Word-level Gap:     gap-2 flex flex-wrap
```

### Control Bar
```
Top Padding:        pt-6
Bottom Padding:     pb-4
Horizontal:         px-4
Border Top:         border-t border-border/50
Gap Between Buttons: gap-3
Button Height:      py-6 (large)
```

## Design Files & Assets

### Fonts (Google Fonts - Already Imported)
- Geist (sans)
- Geist Mono (mono)
- Noto Sans Arabic (for Arabic text)

### Icons (lucide-react - Already Available)
- All icons used are from lucide-react package
- No custom icons needed
- Consistent sizing and styling

### Images (None Currently)
- Pure CSS styling
- No background images
- Can add decoration if needed

## Implementation Checklist

- [x] Color variables in CSS
- [x] Typography scale set up
- [x] Spacing scale applied
- [x] Responsive design implemented
- [x] Focus states added
- [x] Animations implemented
- [x] Accessibility features included
- [x] Icons integrated
- [x] Cards and containers styled
- [x] Buttons variants created
- [x] Form fields styled
- [x] Feedback colors applied
- [x] Sticky bar positioned
- [x] Mobile-first approach used

## Testing the Design

1. **Responsive Test**: View on mobile, tablet, desktop
2. **Color Test**: Check contrast ratios for accessibility
3. **Typography Test**: Verify hierarchy and readability
4. **Animation Test**: Smooth transitions on all interactions
5. **Icon Test**: Consistent sizing and colors
6. **Print Test**: Ensure readable in print (if needed)

---

**Design System Version**: 1.0
**Last Updated**: April 2026
**Framework**: Next.js 16 + Tailwind CSS v4 + Shadcn/UI
