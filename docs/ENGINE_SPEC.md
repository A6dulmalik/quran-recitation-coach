/\*
PROJECT CONTEXT: QUR’AN RECITATION COACH (PWA)

You are assisting in building a production-ready MVP for a Qur’an recitation coaching web app.

This is NOT a static reader.
This is an INTERACTIVE RECITATION ENGINE.

---

CORE IDEA

The app listens to a user reciting the Qur’an and provides real-time feedback.

However, for now, we are SIMULATING recitation logic before integrating speech recognition.

---

CURRENT TASK

Implement the Qur’an Recitation Page system using React (Next.js App Router).

This page is the CORE ENGINE of the app.

---

EXPECTED USER FLOW

1. User selects Surah and optionally verse range
2. User clicks "Begin"
3. User is navigated to Qur’an page
4. User clicks "Start Recitation"
5. App begins simulated recitation:
   - Words are processed one-by-one
   - Words turn green when correct
   - Some words randomly turn red (incorrect)
6. When an error occurs:
   - Recitation pauses
   - UI shows feedback
   - User clicks "Try Again"
   - Word becomes correct
   - Recitation resumes
7. Continues until all verses are completed

---

STATE MANAGEMENT REQUIREMENTS

Implement a state machine:

type RecitationState =
| "idle"
| "listening"
| "paused_on_error"
| "completed"

Track:

- currentVerseIndex
- currentWordIndex

---

DATA STRUCTURE

Each verse must be structured like:

type WordState = {
text: string
status: "pending" | "correct" | "incorrect"
}

type VerseState = {
verseNumber: number
words: WordState[]
status: "idle" | "active" | "completed"
}

---

UI REQUIREMENTS

Inspired by Quran.com (clean, minimal, readable Arabic layout)

- Each verse rendered clearly
- Each word is a span (for styling)
- Active verse highlighted
- Active word subtly highlighted

Word colors:

- pending → normal
- correct → green
- incorrect → red

---

SIMULATION LOGIC

Use a timer (setInterval or requestAnimationFrame):

Every ~800ms:

- Move to next word
- Mark word as correct OR incorrect (randomly for now)

If incorrect:

- Pause simulation
- Set state to "paused_on_error"

---

ERROR HANDLING UI

When paused_on_error:

- Show message: "Incorrect word"
- Highlight incorrect word
- Show button: "Try Again"

On click:

- Mark word as correct
- Resume simulation

---

SCROLL BEHAVIOR

- Auto-scroll to active verse
- Smooth scrolling
- Keep active verse centered

---

CONTROLS

Add:

- Start Recitation button
- Stop Recitation button (resets state)

---

IMPORTANT CONSTRAINTS

- Do NOT implement backend calls yet
- Do NOT implement speech recognition yet
- Focus ONLY on frontend logic and state
- Keep code modular and clean
- Use hooks where appropriate

---

PWA REQUIREMENTS (IMPORTANT)

This app will be a Progressive Web App.

Ensure:

1. Layout is mobile-first
2. No reliance on desktop-only interactions
3. Components are touch-friendly
4. Avoid heavy blocking operations on main thread

Prepare for:

- Service Worker integration later
- Offline support for Qur’an text
- Installable app behavior

---

FUTURE INTEGRATION (DO NOT IMPLEMENT YET)

Later we will integrate:

- Speech-to-text (Whisper)
- Real-time audio input
- Backend API (NestJS)
- User authentication + progress tracking

---

OUTPUT EXPECTATION

Generate:

- Clean React component(s)
- Proper state handling
- Readable, maintainable code
- No overengineering

---

\*/

/\*
Set up this Next.js app as a Progressive Web App (PWA).

Requirements:

- Use next-pwa or a modern equivalent
- Generate a manifest.json
- Add app name, icons, theme color
- Enable installable behavior
- Configure service worker

Ensure:

- Works in production build
- Does not break development mode

Add:

- Basic offline fallback page
- Cache static assets

Keep configuration clean and minimal.
\*/
