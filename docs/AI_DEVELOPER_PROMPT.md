# AI Developer Prompt: Qur'an Recitation Evaluator Implementation

## Executive Summary

This document provides a complete, detailed brief for an AI assistant (like Claude, GPT-4, etc.) to understand, continue, and complete the backend implementation of the Qur'an Recitation Evaluator application.

**Status**: Frontend is 100% complete. Backend API endpoints need to be implemented.

---

## Application Overview

### What Is This App?

A web-based Qur'an recitation practice platform where users:
1. Select a Surah (chapter) of the Qur'an
2. Choose a recitation mode (single verse, complete surah, or verses from beginning to selected verse)
3. See the Qur'anic text displayed for reference
4. Record their recitation using their microphone
5. Get instant AI-powered feedback with accuracy scoring, word-by-word corrections, and pronunciation guidance

### Target Users

- Muslim students learning Qur'an
- Hafiz (Qur'an memorizers) seeking practice
- Teachers of Islamic studies
- Individuals seeking spiritual improvement through Qur'anic study

### Tech Stack (Final)

**Frontend**:
- Next.js 16 (App Router with React Server Components)
- React 19 with TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Browser MediaRecorder API (already implemented)

**Backend** (To be implemented):
- **Recommended**: Node.js with Express.js or Python with FastAPI
- **Database**: PostgreSQL (Supabase recommended for managed hosting)
- **Speech-to-Text**: OpenAI Whisper API (best for Arabic) or Google Cloud Speech-to-Text
- **Caching**: Redis/Upstash for Qur'anic data
- **Qur'anic Text Source**: Al-Quran Cloud API (free) or Quran.com API (free)

---

## Current Frontend Implementation Details

### File Structure

```
/vercel/share/v0-project/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── globals.css         # Tailwind v4 with design tokens
│   └── page.tsx            # Main page (very simple, just imports RecitationEvaluator)
├── components/
│   ├── header.tsx          # Header with title and gradient background
│   ├── audio-recorder.tsx  # Recording UI component
│   ├── surah-selector.tsx  # Surah & recitation mode selection
│   ├── recitation-results.tsx  # Results display with accuracy score
│   └── recitation-evaluator.tsx # Main orchestrator component
└── IMPLEMENTATION_GUIDE.md    # Detailed technical guide
```

### Core Components Explained

#### 1. **RecitationEvaluator** (Main Orchestrator)
- **Location**: `/components/recitation-evaluator.tsx`
- **State managed**:
  - `selectedSurah` (number or null)
  - `selectedAyah` / `selectedMode` (string: 'single' | 'complete' | 'fromBeginning')
  - `recordedAudio` (Blob or null)
  - `result` (EvaluationResult or null)
  - `isEvaluating` (boolean)

- **Key Flow**:
  1. Show SurahSelector (dropdown + recitation mode selection)
  2. When Surah selected → Display full Qur'anic text
  3. Show AudioRecorder component
  4. Show full-width "Begin Recitation" button
  5. On recording complete → Call `evaluateRecitation(audioBlob)`
  6. Display RecitationResults with accuracy score and errors
  7. Allow "Try Again" or "Try Different Verse"

- **Mock Data Location**: Hardcoded in `VERSE_DATA` object (lines ~20-30)
  - Only has sample verses for 4 Surahs
  - Returns same mock errors for all recordings

#### 2. **SurahSelector**
- **Location**: `/components/surah-selector.tsx`
- **Props**:
  - `selectedSurah`, `selectedAyah`, `selectedMode`
  - `onSurahChange`, `onAyahChange`, `onModeChange` callbacks
  - `verseText` for preview display

- **Features**:
  - Dropdown to select from 14 sample Surahs (needs to be 114!)
  - Three recitation modes:
    - **Single**: User selects one specific verse to recite
    - **Complete**: User recites entire Surah from beginning to end
    - **From Beginning**: User recites from Ayah 1 to selected Ayah N
  - Shows "How to Use" instructions (only on this page)
  - Shows text preview when verse selected

- **Hardcoded Data**: `SURAHS` array (lines ~11-25)
  - Only 14 Surahs included
  - Has correct metadata (name, verse count)

#### 3. **AudioRecorder**
- **Location**: `/components/audio-recorder.tsx`
- **Status**: Fully functional!
- **Features**:
  - Start/Stop recording buttons
  - Waveform animation during recording
  - Duration counter
  - Reset button
  - Calls `onRecordingComplete(audioBlob)` when user stops
  - Audio format: WebM (browser native)

#### 4. **RecitationResults**
- **Location**: `/components/recitation-results.tsx`
- **Displays**:
  - Accuracy percentage with color-coded progress bar
  - Your recitation vs. Expected text (side by side)
  - List of errors found
  - Play recording button
  - Try Again button

- **Current Issue**: Errors are hardcoded mock data
  - All recordings show the same error: "You said 'لل' instead of 'لله'"
  - Real implementation needs dynamic error generation from API

---

## What Needs Backend Implementation

### API Endpoint 1: GET `/api/surahs`
**Purpose**: Fetch all 114 Surahs with metadata

**Replace**: Hardcoded `SURAHS` array in `/components/surah-selector.tsx`

**Request**:
```
GET /api/surahs
```

**Response** (200 OK):
```json
{
  "surahs": [
    {
      "number": 1,
      "name": "Al-Fatiha",
      "arabicName": "الفاتحة",
      "verses": 7,
      "englishName": "The Opening",
      "revelationType": "Meccan"
    },
    {
      "number": 2,
      "name": "Al-Baqarah",
      "arabicName": "البقرة",
      "verses": 286,
      "englishName": "The Cow",
      "revelationType": "Medinan"
    },
    ... (all 114 Surahs)
  ]
}
```

**Recommendation**: Fetch from [Al-Quran Cloud API](https://alquran.cloud/api) and cache in Redis with 30-day TTL.

---

### API Endpoint 2: GET `/api/quran/:surahNumber/:verseNumber?`
**Purpose**: Fetch Qur'anic text by Surah and optionally by verse range

**Replaces**: Hardcoded `VERSE_DATA` object in `/components/recitation-evaluator.tsx`

**Requests**:
```
# Get single verse
GET /api/quran/1/5

# Get complete surah
GET /api/quran/1

# Get range of verses (optional feature)
GET /api/quran/1?fromVerse=1&toVerse=5
```

**Response** (single verse):
```json
{
  "surah": 1,
  "verses": [
    {
      "number": 5,
      "text": "اهدنا الصراط المستقيم",
      "transliteration": "Ihdina as-sirata al-mustaqeem"
    }
  ]
}
```

**Response** (complete surah):
```json
{
  "surah": 1,
  "verses": [
    {
      "number": 1,
      "text": "الحمد لله رب العالمين"
    },
    {
      "number": 2,
      "text": "الرحمن الرحيم"
    },
    ... (all 7 verses)
  ]
}
```

**Recommendation**: Use Al-Quran Cloud API and Redis cache (1 hour TTL).

---

### API Endpoint 3: POST `/api/transcribe`
**Purpose**: Convert recorded audio to text (speech-to-text)

**What It Receives**:
```
Method: POST
Content-Type: multipart/form-data

Body:
- audio: Blob (WebM audio file)
- surahNumber: number
- ayahNumber: number
- mode: 'single' | 'complete' | 'fromBeginning'
```

**Processing Steps**:
1. Save audio file temporarily (or stream directly)
2. Send to speech-to-text service:
   - **Recommended**: OpenAI Whisper API (best Arabic support)
   - **Alternative**: Google Cloud Speech-to-Text API
   - **Budget option**: DeepInfra Whisper (cheapest)
3. Get transcribed Arabic text
4. Return transcribed text to frontend

**Response** (200 OK):
```json
{
  "transcribedText": "الحمد لله رب العالمين",
  "confidence": 0.95,
  "duration": 4.2,
  "language": "ar"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Audio processing failed",
  "message": "Audio file corrupted or unsupported format"
}
```

**Important Notes**:
- Handle timeout for audio > 1 hour
- Delete uploaded file after processing
- Log transcription confidence for analytics
- Handle Arabic-specific issues (diacritics, dialects)

---

### API Endpoint 4: POST `/api/evaluate`
**Purpose**: Compare transcribed text against expected Qur'anic text and generate error report

**What It Receives**:
```
Method: POST
Content-Type: application/json

Body:
{
  "transcribedText": "الحمد لل رب العالمين",
  "expectedText": "الحمد لله رب العالمين",
  "surahNumber": 1,
  "ayahNumber": 1,
  "mode": "single"
}
```

**Processing Steps**:

1. **Text Normalization**:
   - Remove diacritics from expected text (since transcription won't include them)
   - Normalize whitespace
   - Handle Arabic-specific characters

2. **Word-by-Word Matching**:
   - Split both texts into word arrays
   - For each word in expected text:
     - Look for exact match in transcribed text
     - If no exact match, use fuzzy matching (Levenshtein distance or phonetic similarity)
     - Threshold: >80% match = considered correct
   - Mark as: 'correct' | 'incorrect' | 'missing'

3. **Error Detection**:
   - For each mismatch, generate:
     - Error type: 'missing' (not spoken) | 'wrong' (said something else) | 'extra' (added extra word)
     - Expected word
     - Actual word (if wrong type)
     - Helpful message: "You said 'X' but it should be 'Y'"
     - Severity: 'low' | 'medium' | 'high'

4. **Accuracy Calculation**:
   - `accuracy = (correct_words / total_expected_words) × 100`
   - Consider using weighted scoring:
     - Skipped important words = -10%
     - Mispronounced common words = -5%
     - Minor pronunciation errors = -2%

**Response** (200 OK):
```json
{
  "accuracy": 75,
  "transcribedText": "الحمد لل رب العالمين",
  "expectedText": "الحمد لله رب العالمين",
  "wordResults": [
    {
      "word": "الحمد",
      "status": "correct",
      "confidence": 0.99
    },
    {
      "word": "لل",
      "status": "incorrect",
      "expected": "لله",
      "confidence": 0.85
    },
    {
      "word": "رب",
      "status": "correct",
      "confidence": 0.98
    },
    {
      "word": "العالمين",
      "status": "correct",
      "confidence": 0.97
    }
  ],
  "errors": [
    {
      "type": "wrong",
      "position": 2,
      "word": "لل",
      "expected": "لله",
      "message": "You said 'لل' instead of 'لله'. Remember to pronounce the 'ه' at the end.",
      "severity": "medium",
      "suggestion": "Practice the 'ه' ending sound separately"
    }
  ],
  "summary": {
    "totalWords": 4,
    "correctWords": 3,
    "incorrectWords": 1,
    "missingWords": 0,
    "extraWords": 0
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Evaluation failed",
  "message": "Text comparison algorithm error"
}
```

---

## Data Flow Diagram

```
Frontend                           Backend API
─────────────────────────────────────────────────────────────

User selects Surah
    │
    ├─→ GET /api/surahs  ──────→  [Fetch all 114 Surahs]
    │                             [Cache in Redis]
    ←────  [List of Surahs] ←─────
    │
    (Surah & mode selected)
    │
    ├─→ GET /api/quran/1 ────────→  [Fetch Surah 1 verses]
    │                               [From Al-Quran Cloud or DB]
    │                               [Cache in Redis]
    ←────  [Qur'anic text] ←────────
    │
    (User clicks "Begin Recitation")
    │
    (Audio is recorded using Browser MediaRecorder API)
    │
    (User stops recording)
    │
    ├─→ POST /api/transcribe ───→  [1. Receive audio blob]
    │                              [2. Send to Whisper API]
    │                              [3. Get transcribed text]
    │                              [4. Validate Arabic text]
    ←────  [Transcribed text] ←─────
    │
    ├─→ POST /api/evaluate ─────→  [1. Normalize text]
    │                              [2. Word-by-word matching]
    │                              [3. Detect errors]
    │                              [4. Calculate accuracy]
    │                              [5. Generate feedback]
    ←────  [Evaluation result] ←────
    │
    (Display results with accuracy score and errors)
```

---

## Implementation Recommendations

### Stack Selection

**For Node.js (Recommended)**:
```
- Express.js or Fastify (fast)
- TypeScript for type safety
- Prisma ORM for database
- Redis client for caching
- OpenAI SDK for Whisper API
- Axios for HTTP requests
- Zod for request validation
```

**For Python (Alternative)**:
```
- FastAPI for API
- Pydantic for validation
- SQLAlchemy ORM
- Redis for caching
- OpenAI library for Whisper
- Requests library
```

### Database Schema (PostgreSQL)

```sql
-- Users table (optional, for future features)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table (optional, for tracking user progress)
CREATE TABLE recitation_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  surah_number INT NOT NULL,
  ayah_number INT,
  mode VARCHAR(20),
  accuracy INT,
  transcribed_text TEXT,
  recording_duration INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Errors table (optional, for analytics)
CREATE TABLE recitation_errors (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES recitation_sessions(id),
  word_position INT,
  expected_word VARCHAR(255),
  actual_word VARCHAR(255),
  error_type VARCHAR(20),
  severity VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Caching Strategy

**Redis Keys**:
```
surahs:all              → All 114 Surahs list (30-day TTL)
surah:1                 → Surah 1 complete text (30-day TTL)
surah:1:verse:5         → Specific verse (30-day TTL)
transcription:audio-id  → Temporary storage of transcribed text (1-hour TTL)
```

### Error Handling

**API Error Codes**:
- `400` - Bad request (invalid audio format, missing params)
- `422` - Unprocessable entity (transcription failed)
- `429` - Rate limit exceeded
- `500` - Server error
- `503` - External API unavailable (Whisper, Al-Quran Cloud)

### Security Considerations

1. **Input Validation**: Validate all request parameters
2. **File Upload**: Max audio file size: 100MB
3. **Rate Limiting**: Limit transcription calls per IP/user
4. **CORS**: Configure for frontend domain
5. **Audio Deletion**: Delete uploaded audio after processing
6. **API Keys**: Store Whisper/Google Cloud keys in environment variables
7. **Database**: Use connection pooling for PostgreSQL

---

## Testing Checklist

- [ ] Test `/api/surahs` returns all 114 Surahs
- [ ] Test `/api/quran/:surah` returns complete Surah text
- [ ] Test `/api/transcribe` with sample Arabic audio
- [ ] Test error handling for corrupted audio
- [ ] Test `/api/evaluate` with various error types
- [ ] Verify accuracy calculation is correct
- [ ] Test with different Arabic dialects/accents
- [ ] Test caching works (Redis hit rate)
- [ ] Load test with multiple simultaneous requests
- [ ] Test CORS headers
- [ ] Test rate limiting
- [ ] Verify audio files are deleted after processing

---

## Deployment Checklist

- [ ] Setup environment variables (.env)
  - `OPENAI_API_KEY` (for Whisper)
  - `DATABASE_URL` (PostgreSQL)
  - `REDIS_URL` (Upstash)
  - `FRONTEND_URL` (for CORS)
- [ ] Setup database (Supabase or similar)
- [ ] Setup Redis cache (Upstash)
- [ ] Deploy backend (Vercel, Railway, Heroku)
- [ ] Test all endpoints in production
- [ ] Setup error logging (Sentry, LogRocket)
- [ ] Monitor API response times
- [ ] Setup alerts for failures

---

## Next Steps for You (AI Developer)

1. **Choose your stack** (Node.js recommended)
2. **Setup base server** with Express/FastAPI and basic middleware
3. **Implement `/api/surahs`** endpoint first (fetch from Al-Quran Cloud)
4. **Implement `/api/quran`** endpoint (fetch Qur'anic text)
5. **Implement `/api/transcribe`** endpoint (integrate Whisper API)
6. **Implement `/api/evaluate`** endpoint (word-matching algorithm)
7. **Add caching layer** (Redis)
8. **Add error handling** and logging
9. **Write tests** for all endpoints
10. **Deploy** to production

---

## Questions to Ask Before Starting

1. Which programming language/framework preference? (Node.js recommended)
2. Should users have accounts or just use anonymously?
3. Do you want to track user statistics/progress?
4. What's the expected user volume?
5. Budget for API calls (Whisper API is ~$0.02-0.03 per minute)?
6. Should results be saved to database?
7. Any specific error message customization needed?

---

## Important: The Current Issue Explained

**Why all recordings show the same error**:

Currently, the frontend has a mock evaluation function:
```typescript
// In recitation-evaluator.tsx line ~86
const evaluateRecitation = async (audioBlob: Blob) => {
  // ... audio URL setup ...
  
  // MOCK EVALUATION - This always returns the same hardcoded result
  const mockResult: EvaluationResult = {
    accuracy: 85,
    wordResults: [
      { word: 'الحمد', status: 'correct' },
      { word: 'لل', status: 'incorrect', expected: 'لله' }, // Always this error!
      { word: 'رب', status: 'correct' },
      { word: 'العالمين', status: 'correct' },
    ],
    errors: [{
      type: 'wrong',
      word: 'لل',
      expected: 'لله',
      message: 'You said "لل" instead of "لله"', // Same message every time!
    }],
    // ...
  };
};
```

**How to fix it**: Replace this entire mock function with a real API call to `/api/transcribe` and `/api/evaluate` that processes the actual recorded audio and returns genuine evaluation results.

---

## Contact & Resources

- **Frontend Code**: `/vercel/share/v0-project/`
- **Technical Guide**: `/vercel/share/v0-project/IMPLEMENTATION_GUIDE.md`
- **Al-Quran Cloud API**: https://alquran.cloud/api
- **OpenAI Whisper API**: https://platform.openai.com/docs/guides/speech-to-text
- **Firebase/Supabase**: https://supabase.com
- **Upstash Redis**: https://upstash.com

---

**Good luck! You've got this! The frontend is solid, now make the magic happen on the backend.** ✨
