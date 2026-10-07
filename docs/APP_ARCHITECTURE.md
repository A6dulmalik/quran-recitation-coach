# Qur'an Recitation Coaching Platform - UI Architecture

## Overview

This is a complete redesign of the Qur'an recitation evaluation platform, built as a **multi-page application** with a focus on clean UI/UX inspired by Quran.com.

## App Structure

### 1. **Homepage** (`app/page.tsx`)
- Redirects to `/onboarding` using Next.js `redirect()`
- Entry point for all users

### 2. **Onboarding Page** (`app/onboarding/page.tsx`)
- Clean, welcoming introduction
- Step-by-step guide (4 steps)
- Feature highlights (word-by-word analysis, real-time feedback, accuracy score)
- Primary CTA: "Start Recitation" button
- Design: Hero section with gradient background, cards for each step

**Key Features:**
- Responsive design (mobile-first)
- Smooth visual hierarchy
- Minimal, distraction-free approach
- Clear value proposition

### 3. **Surah Selection Page** (`app/select-surah/page.tsx`)
- Searchable list of Surahs (currently 14 sample Surahs, 🔌 API to fetch all 114)
- Two-column layout on desktop (Surah list + Practice options)
- Practice modes:
  - **Full Surah**: Recite the entire Surah
  - **Specific Verses**: Choose start and end verses
- Right sidebar:
  - "How to Use" guide (instructions only on this page)
  - Selected Surah details
  - Mode selection dropdowns
  - "Begin Recitation" button (disabled until valid selection)

**Key Features:**
- Real-time search filtering
- ScrollArea for long Surah list
- Verse range validation
- Context-aware UI (verse options only show when mode is "Specific")

### 4. **Recitation Page** (`app/recitation/page.tsx`)
- **Main coaching interface** - the heart of the app
- Query parameters:
  - `surah`: Surah number
  - `mode`: 'full' or 'range'
  - `start`, `end`: Verse numbers (if mode is 'range')

#### Layout Components:

**A. Sticky Top Bar**
- Back button to Surah selection
- Surah name and selected verse range
- Live accuracy percentage (updates after recording)

**B. Main Content Area (Scrollable)**
- **Before Recording / During Recording:**
  - Large, readable Arabic text (3xl, RTL, font-arabic)
  - Each verse in its own card with verse number
  - Current verse highlighted (subtle blue background when recording)
  - Word-level feedback during recording (real-time highlighting)

- **After Recording (Feedback View):**
  - Large accuracy score (circle badge)
  - Motivational message based on score (Excellent/Good Job/Keep Practicing)
  - Verse-by-verse review cards:
    - Full verse text
    - Word-level error annotations
    - Color-coded feedback:
      - Green checkmark: All correct
      - Red alert icon: Has errors
    - Detailed error list for each verse:
      - Incorrect words: "You said: X → Expected: Y"
      - Missing words: "Missing word: X"

**C. Floating Bottom Control Bar (Sticky)**
- **During Recording State:**
  - Live duration counter with waveform animation (5 vertical bars)
  - "Stop Recording" button (red/destructive)
  
- **Before Recording State:**
  - "Start Recording" button (primary, full-width)
  - "Reset" button (outline, if already recorded)

- **After Feedback State:**
  - "Try Again" button (outline, to re-record)
  - "Choose Different Surah" button (primary, links to selection page)

## Design System

### Colors (Used in this app)
- **Primary**: Teal/Blue (`oklch(0.5 0.15 160)`) - Action buttons, highlights, accents
- **Secondary**: Light blue (`oklch(0.85 0.08 160)`) - Background panels, subtle highlights
- **Background**: Very light blue (`oklch(0.98 0.01 200)`) - Page background
- **Foreground**: Dark gray (`oklch(0.2 0 0)`) - Text
- **Muted**: Light gray (`oklch(0.55 0 0)`) - Secondary text
- **Card**: White (`oklch(1 0 0)`) - Panels and containers
- **Red (feedback)**: `oklch(0.65 0.2 30)` - Error/incorrect feedback
- **Green (feedback)**: Built-in green-600 for correct answers

### Typography
- **Font**: Geist (default), Geist Mono (for technical elements)
- **Headings**: Bold (font-bold), large sizes (text-2xl, text-3xl)
- **Body**: Regular weight, good line-height (leading-relaxed)
- **Arabic**: Special font class `.font-arabic` with RTL support

### Layout
- **Max-width container**: 4xl (56rem) for narrow content
- **Responsive**: Mobile-first, full-width on mobile, centered on desktop
- **Spacing**: Tailwind spacing scale (gap-2, p-4, py-6, etc.)
- **Flexbox**: Primary layout method (flex items-center, flex-col, etc.)

## Component Usage

### Shadcn/UI Components Used:
- **Button**: Primary actions
- **Input**: Search field in Surah selection
- **ScrollArea**: Scrollable Surah list
- **Select/SelectTrigger/SelectContent**: Verse range selection
- **FieldGroup/Field/FieldLabel**: Form layout structure
- **Progress**: Could be used for accuracy bar (currently using direct div)
- **Sheet**: (Available for error feedback side panel if needed)

### Icons (from lucide-react):
- `BookOpen` - Surah/coaching icon
- `Search` - Search field icon
- `ChevronRight` - Navigation indicator
- `Mic` - Record button
- `Square` - Stop recording
- `RotateCcw` - Reset/Try again
- `Play/Pause` - Playback controls (optional)
- `AlertCircle` - Error indicator
- `CheckCircle2` - Success indicator
- `ArrowRight` - CTA button arrow

## Data Flow

### Onboarding → Surah Selection
```
[Start Recitation Button]
  ↓
  Link to /select-surah
```

### Surah Selection → Recitation
```
[Begin Recitation Button with URL params]
  ↓
  /recitation?surah=1&mode=full&start=1&end=7
  ↓
  Query params parsed and fetched via useSearchParams()
```

### State Management (per page)
- **Onboarding**: Stateless (just navigation)
- **Surah Selection**: 
  - `search` - Filter Surahs
  - `selection` - Current choices (surah, mode, verses)
- **Recitation**:
  - `isRecording` - Recording status
  - `duration` - Time elapsed
  - `currentVerseIndex` - Active verse during recording
  - `verses` - Array of verse data with word feedback
  - `accuracy` - Score percentage
  - `showFeedback` - Toggle between recording and feedback views

## 🔌 API Integration Points (Future)

1. **GET `/api/surahs`**
   - Fetch all 114 Surahs with metadata
   - Replace hardcoded `SURAHS` array in `select-surah/page.tsx`

2. **GET `/api/quran/:surah/:verse?`**
   - Fetch Qur'anic text for display
   - Replace hardcoded `QURAN_DATA` object in `recitation/page.tsx`

3. **POST `/api/transcribe`**
   - Send audio blob from recording
   - Return transcribed Arabic text
   - Called after `stopRecording()`

4. **POST `/api/evaluate`**
   - Accept: transcribed text, expected text, surah/verse info
   - Return: word-level accuracy, error details
   - Generates feedback display data

5. **POST `/api/save-session`** (Optional for logged-in users)
   - Store recitation history and progress
   - Currently disabled (guest-only mode)

## Key UX Decisions

1. **Instructions on Selection Page Only**
   - Reduces cognitive load during recording
   - Keeps recording interface clean and focused

2. **Live Verse Highlighting During Recording**
   - Helps user stay on track
   - Provides real-time context

3. **Word-Level Feedback**
   - More granular than accuracy percentage
   - Helps user pinpoint exact mistakes
   - Supports learning and improvement

4. **Sticky Controls**
   - Always accessible (bottom bar)
   - Never requires scrolling to record/submit
   - Consistent across all screens

5. **Motivational Messaging**
   - Feedback after submission
   - Encourages repeated practice
   - Builds confidence

## Accessibility Features

- Semantic HTML (header, main, etc.)
- ARIA labels on buttons
- Color contrast ratios meet WCAG AA
- Keyboard navigation support (built into Radix UI components)
- Focus indicators on buttons
- Screen reader friendly text hierarchy

## Performance Optimizations

- Next.js 16 with Turbopack
- Client components ('use client') for interactivity
- ScrollArea prevents rendering long Surah lists
- Memoized search filtering (`useMemo`)
- Lazy-loaded pages via app router

## Browser Compatibility

- Uses modern Web APIs:
  - `navigator.mediaDevices.getUserMedia()` - Audio recording
  - `MediaRecorder API` - Audio encoding
  - `useSearchParams()` - URL parsing
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari 14+, Android Chrome)

## Future Enhancements

1. User accounts and progress tracking
2. Tajweed rules guidance
3. Audio playback of correct recitation
4. Adjustable playback speed
5. Repeat verse button
6. Favorite verses/Surahs
7. Difficulty levels
8. Real-time waveform visualization
9. Offline mode with cached data
10. Multi-language support

## File Structure Summary

```
app/
  layout.tsx           - Root layout (metadata, fonts)
  page.tsx             - Redirect to onboarding
  onboarding/
    page.tsx           - Welcome/guide page
  select-surah/
    page.tsx           - Surah and verse selection
  recitation/
    page.tsx           - Main coaching interface

components/
  ui/                  - Shadcn/UI components
  [Old components]     - Previous version (can be removed)

globals.css            - Design tokens, utilities, animations
```

## Testing Recommendations

1. Test responsive design on mobile, tablet, desktop
2. Test audio recording on different browsers
3. Test Surah search with Arabic/English queries
4. Test verse range validation
5. Test keyboard navigation
6. Test mobile camera/microphone permissions
7. Performance test on low-end devices

---

**Note**: This is a UI/UX implementation. Backend APIs are mocked with demo data. Replace `evaluateRecitation()` and data sources with real API calls for production.
