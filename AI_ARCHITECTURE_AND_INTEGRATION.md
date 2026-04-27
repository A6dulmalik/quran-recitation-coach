# AI Architecture & Integration Guide

## Complete Overview: How the AI Works

This document explains **exactly** how the Qur'an Recitation Evaluator's AI system works, from current implementation to advanced future features.

---

## Table of Contents

1. [Current AI Implementation (MVP)](#current-ai-implementation-mvp)
2. [How the Evaluation Works (Step-by-Step)](#how-the-evaluation-works-step-by-step)
3. [Backend Architecture Diagram](#backend-architecture-diagram)
4. [API Endpoints Required](#api-endpoints-required)
5. [Advanced AI Features (Future)](#advanced-ai-features-future)
6. [Technology Recommendations](#technology-recommendations)

---

## Current AI Implementation (MVP)

### What The Current App Does

The **frontend is 100% complete** but relies on mock evaluation data because the backend APIs don't exist yet.

**Current Flow**:
1. User records audio (WebM format)
2. Frontend shows a mock evaluation result
3. **Issue**: All recordings return the same hardcoded error

**Why?** Because the backend hasn't:
- Converted the audio to text
- Compared it with the actual Qur'anic text
- Detected real errors

### What The Current App *Doesn't* Do

- ❌ Convert audio to text (no Whisper/Google Speech-to-Text integration)
- ❌ Compare user's recitation with expected Qur'anic text
- ❌ Generate real error analysis
- ❌ Provide word-by-word accuracy
- ❌ Detect Tajweed violations
- ❌ Provide pronunciation guidance

---

## How The Evaluation Works (Step-by-Step)

### The Complete Evaluation Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                  USER RECORDS RECITATION                         │
│                 (Speaks into microphone)                          │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                              │ Audio Blob (WebM)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              STEP 1: SPEECH-TO-TEXT CONVERSION                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Service: OpenAI Whisper API (RECOMMENDED)                  │  │
│  │          or Google Cloud Speech-to-Text                    │  │
│  │                                                             │  │
│  │ Input:  MP3/WAV audio from browser recording               │  │
│  │ Output: Transcribed Arabic text                            │  │
│  │ Language: Arabic (ar)                                      │  │
│  │                                                             │  │
│  │ Example:                                                   │  │
│  │ Audio: [user speaks "الحمد لل رب العالمين"]            │  │
│  │ Text:  "الحمد لل رب العالمين"                           │  │
│  │ Confidence: 0.95 (95%)                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                              │ Transcribed Text (String)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│             STEP 2: FETCH EXPECTED QUR'ANIC TEXT                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Source: Al-Quran Cloud API or local database               │  │
│  │                                                             │  │
│  │ Query: "Get Surah 1, Verses 1-7"                          │  │
│  │ Response: All verses from Al-Fatiha                        │  │
│  │                                                             │  │
│  │ Example Response:                                          │  │
│  │ [                                                           │  │
│  │   "الحمد لله رب العالمين",        // Verse 1           │  │
│  │   "الرحمن الرحيم",                  // Verse 2           │  │
│  │   "مالك يوم الدين"                  // Verse 3           │  │
│  │   ...                                                      │  │
│  │ ]                                                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                              │ Expected Text (Array of strings)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│        STEP 3: WORD-BY-WORD COMPARISON & ERROR DETECTION        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Algorithm: Levenshtein Distance + Fuzzy String Matching    │  │
│  │                                                             │  │
│  │ INPUT:                                                     │  │
│  │   Expected: "الحمد لله رب العالمين"                      │  │
│  │   User Said: "الحمد لل رب العالمين"                      │  │
│  │                                                             │  │
│  │ SPLIT INTO WORDS:                                          │  │
│  │   Expected: [الحمد] [لله] [رب] [العالمين]               │  │
│  │   User Said: [الحمد] [لل] [رب] [العالمين]               │  │
│  │                                                             │  │
│  │ COMPARE EACH WORD:                                         │  │
│  │   Word 1: "الحمد" == "الحمد"      ✓ CORRECT               │  │
│  │   Word 2: "لله" vs "لل"           ✗ MISMATCH (wrong)     │  │
│  │   Word 3: "رب" == "رب"            ✓ CORRECT               │  │
│  │   Word 4: "العالمين" == "العالمين" ✓ CORRECT             │  │
│  │                                                             │  │
│  │ ERROR TYPES DETECTED:                                      │  │
│  │   1. Missing Words (word in expected but not in user)      │  │
│  │   2. Wrong Words (mispronunciation/different word)         │  │
│  │   3. Extra Words (word in user recitation but not expected)│  │
│  │   4. Word Order Issues (words in wrong sequence)           │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                              │ Word Results, Errors Detected
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│         STEP 4: CALCULATE ACCURACY & GENERATE FEEDBACK            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ACCURACY CALCULATION:                                      │  │
│  │ Accuracy = (Correct Words / Total Words) × 100             │  │
│  │                                                             │  │
│  │ Example:                                                   │  │
│  │   Correct Words: 3 (الحمد, رب, العالمين)                 │  │
│  │   Total Words: 4                                           │  │
│  │   Accuracy: (3 / 4) × 100 = 75%                            │  │
│  │                                                             │  │
│  │ GENERATE ERROR MESSAGES:                                   │  │
│  │   For each wrong/missing/extra word:                       │  │
│  │                                                             │  │
│  │   Error Message:                                           │  │
│  │   "You said 'لل' instead of 'لله'. Remember to include   │  │
│  │    all letters of the word."                              │  │
│  │                                                             │  │
│  │ MOTIVATIONAL MESSAGE (based on accuracy):                  │  │
│  │   75% → "Great effort! Keep practicing, you're close!"    │  │
│  │   50% → "Keep trying! Review these words and recite again."│  │
│  │   90%+ → "Excellent! You're mastering this verse!"        │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                              │ Accuracy %, Errors, Feedback
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              STEP 5: SEND RESULTS TO FRONTEND                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Response JSON:                                             │  │
│  │ {                                                           │  │
│  │   "accuracy": 75,                                          │  │
│  │   "transcribedText": "الحمد لل رب العالمين",             │  │
│  │   "expectedText": "الحمد لله رب العالمين",               │  │
│  │   "wordResults": [                                         │  │
│  │     { "word": "الحمد", "status": "correct" },            │  │
│  │     { "word": "لل", "status": "incorrect",                │  │
│  │       "expected": "لله" },                               │  │
│  │     { "word": "رب", "status": "correct" },               │  │
│  │     { "word": "العالمين", "status": "correct" }          │  │
│  │   ],                                                        │  │
│  │   "errors": [                                              │  │
│  │     {                                                      │  │
│  │       "type": "wrong",                                     │  │
│  │       "word": "لل",                                       │  │
│  │       "expected": "لله",                                  │  │
│  │       "message": "You said 'لل' instead of 'لله'"        │  │
│  │     }                                                      │  │
│  │   ]                                                         │  │
│  │ }                                                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                              ▼
                    DISPLAY FEEDBACK TO USER
              (Red for errors, green for correct)
              (Accuracy score with progress bar)
              (Motivational message)
              (Option to try again)
```

---

## Backend Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  - Records audio with MediaRecorder API                         │
│  - Sends audio blob to backend                                  │
│  - Displays results with word-by-word highlighting              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTP POST
                           │ /api/evaluate
                           │ { audio, surah, verse }
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node/Python)                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ API Gateway / Load Balancer                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                     │
│          ┌────────────────┼────────────────┐                  │
│          │                │                │                  │
│          ▼                ▼                ▼                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │   Whisper    │ │  Al-Quran    │ │  Comparison  │          │
│  │    API       │ │   Cloud API  │ │   Logic      │          │
│  │   (Speech    │ │   (Quranic   │ │  (String     │          │
│  │  to Text)    │ │   Text)      │ │  matching)   │          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
│          │                │                │                  │
│          │ Transcribed    │ Expected       │ Errors &        │
│          │ Text           │ Text           │ Accuracy        │
│          │                │                │                  │
│          └────────────────┼────────────────┘                  │
│                           │                                     │
│                           ▼                                     │
│          ┌────────────────────────────────┐                   │
│          │  Cache Layer (Redis/Upstash)   │                   │
│          │  (Cache Qur'anic text & results)                   │
│          └────────────────────────────────┘                   │
│                           │                                     │
│                           ▼                                     │
│          ┌────────────────────────────────┐                   │
│          │  Database (PostgreSQL)         │                   │
│          │  - User progress tracking      │                   │
│          │  - Recitation history          │                   │
│          │  - Accuracy trends             │                   │
│          └────────────────────────────────┘                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ JSON Response
                           │ { accuracy, errors, feedback }
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                              │
│              Display Results & User Feedback                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Required

### API 1: POST `/api/evaluate` - Main AI Evaluation

**This is the core API that does the speech-to-text and comparison**

```
POST /api/evaluate

Headers:
  Content-Type: multipart/form-data
  Authorization: Bearer <optional_user_token>

Body (FormData):
  - audio: File (MP3/WAV)
  - surah: number (1-114)
  - startVerse: number (1+)
  - endVerse: number (optional, for range)
  - mode: string ("single" | "complete" | "fromBeginning")

Response (200 OK):
{
  "accuracy": 85,
  "transcribedText": "الحمد لل رب العالمين",
  "expectedText": "الحمد لله رب العالمين",
  "wordResults": [
    { "word": "الحمد", "status": "correct" },
    { "word": "لل", "status": "incorrect", "expected": "لله" },
    { "word": "رب", "status": "correct" },
    { "word": "العالمين", "status": "correct" }
  ],
  "errors": [
    {
      "type": "wrong",
      "word": "لل",
      "expected": "لله",
      "message": "You said 'لل' instead of 'لله'"
    }
  ],
  "feedback": {
    "overall": "Great effort! Keep practicing, you're close!",
    "motivationalScore": 7
  }
}

Error Response (400):
{
  "error": "Invalid request",
  "message": "Audio file is required"
}
```

### API 2: GET `/api/surahs` - List All Surahs

```
GET /api/surahs

Response (200 OK):
{
  "surahs": [
    {
      "number": 1,
      "name": "Al-Fatiha",
      "arabicName": "الفاتحة",
      "verses": 7,
      "revelationType": "Meccan"
    },
    {
      "number": 2,
      "name": "Al-Baqarah",
      "arabicName": "البقرة",
      "verses": 286,
      "revelationType": "Medinan"
    },
    ... (114 total)
  ]
}
```

### API 3: GET `/api/quran/:surah/:verse?` - Get Qur'anic Text

```
GET /api/quran/1/5

Response (200 OK):
{
  "surah": 1,
  "verse": 5,
  "text": "إياك نعبد وإياك نستعين"
}

GET /api/quran/1 (complete surah)

Response (200 OK):
{
  "surah": 1,
  "name": "Al-Fatiha",
  "verses": [
    { "number": 1, "text": "الحمد لله رب العالمين" },
    { "number": 2, "text": "الرحمن الرحيم" },
    ...
  ]
}
```

---

## Advanced AI Features (Future)

### Phase 2: Enhanced Evaluation

These features are **not in the MVP** but can be added later:

#### Feature 1: Tajweed Rule Detection
```
Detect when user violates Tajweed rules:
- Missing vowels (Fatha, Damma, Kasra)
- Incorrect Sukun (ْ) handling
- Improper prolongation (Madd)
- Incorrect Shadda (ّ) emphasis

Example:
  Expected: "السَّلاَم" (with Shadda)
  User said: "السلام" (without Shadda)
  Error: "Shadda violation on 'س'. This letter should be emphasized."
```

#### Feature 2: Phonetic Analysis
```
Instead of exact word matching, analyze pronunciation:
- Use phonetic libraries to compare sounds
- Detect subtle differences in Arabic letters:
  ض vs د
  ص vs س
  ث vs ت
  ق vs ك

Example:
  Expected: "الضالين" (with ض)
  User said: "الدالين" (with د)
  Error: "You pronounced ض as د. Practice the emphatic د sound."
```

#### Feature 3: Personalized Learning Paths
```
Track user progress and adapt difficulty:
- Level 1: Short verses (3-5 words)
- Level 2: Medium verses (10-20 words)
- Level 3: Long verses (20+ words)
- Level 4: Complete Surahs

Recommend next verses based on weak areas
```

#### Feature 4: Real-time Coaching
```
During recording (if using streaming audio):
- Highlight words as they're spoken correctly/incorrectly
- Pause and correct in real-time
- Provide immediate pronunciation guidance
```

#### Feature 5: Confidence Scoring
```
Beyond accuracy, measure:
- Audio quality (background noise, clarity)
- Recitation pace (too fast/slow vs. proper Tajweed pace)
- Breathiness (proper breathing at Waqf points)
- Overall pronunciation confidence

Response:
{
  "accuracy": 85,
  "audioQuality": 90,
  "pacingScore": 78,
  "confidenceOverall": 84
}
```

#### Feature 6: Machine Learning Adaptation
```
Train custom model on:
- User's speaking pattern
- Regional dialect variations
- Learning progression

Improve accuracy over time as system learns user's voice
```

---

## Technology Recommendations

### Current (MVP - What To Build First)

| Component | Recommended | Reason |
|-----------|-------------|--------|
| **Speech-to-Text** | OpenAI Whisper API | Best for Arabic, highly accurate, cost-effective |
| **Qur'an Text** | Al-Quran Cloud API | Free, well-maintained, complete data |
| **Backend** | Node.js + Express | Fast, JavaScript ecosystem, easy to integrate |
| **Comparison** | String similarity library | Simple but effective word matching |
| **Caching** | Upstash Redis | Serverless, no infrastructure needed |
| **Database** | Supabase PostgreSQL | Managed, includes auth, real-time capabilities |

### Alternative Options

```
Speech-to-Text Alternatives:
- Google Cloud Speech-to-Text (good, more expensive)
- Azure Speech Services (good, enterprise)
- Groq/DeepInfra (fast inference, emerging)

Qur'an Text Alternatives:
- Quran.com API (good alternative)
- Local JSON/CSV database (complete control)
- Tanzil Qur'an Text project (open-source)

Backend Alternatives:
- Python FastAPI (if team prefers Python)
- Go (for performance)
- Java Spring (enterprise)

String Matching Alternatives:
- Fuzzy matching with python-Levenshtein
- Advanced NLP with transformers
- Vector embeddings with semantic search
```

---

## Implementation Checklist

### Phase 1: MVP (Current + Backend APIs)
- [ ] Implement POST `/api/evaluate` with Whisper
- [ ] Implement GET `/api/surahs`
- [ ] Implement GET `/api/quran/:surah/:verse`
- [ ] Build string comparison logic
- [ ] Add caching layer
- [ ] Deploy backend

### Phase 2: Enhanced Features (Weeks 2-4)
- [ ] Add Tajweed rule detection
- [ ] Implement user authentication
- [ ] Add progress tracking database
- [ ] Create user dashboard/analytics

### Phase 3: Advanced AI (Weeks 5+)
- [ ] Phonetic analysis
- [ ] Real-time coaching
- [ ] Machine learning model training
- [ ] Mobile app version

---

## Quick Start: Minimal Backend to Deploy Today

```javascript
// Minimal Express API that works with current frontend

const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk'); // or Whisper

const app = express();

// 1. Fetch Surahs from Al-Quran Cloud
app.get('/api/surahs', async (req, res) => {
  const response = await axios.get(
    'https://api.alquran.cloud/v1/quran/en.asad/metadata'
  );
  const surahs = response.data.data.surahs.map(s => ({
    number: s.number,
    name: s.englishName,
    arabicName: s.name,
    verses: s.numberOfAyahs
  }));
  res.json({ surahs });
});

// 2. Fetch Qur'anic text
app.get('/api/quran/:surah/:verse?', async (req, res) => {
  const response = await axios.get(
    `https://api.alquran.cloud/v1/surah/${req.params.surah}`
  );
  res.json(response.data.data);
});

// 3. Main evaluation (the critical one!)
app.post('/api/evaluate', async (req, res) => {
  // Get audio file from request
  const audioFile = req.files.audio;
  
  // 1. Convert to text using Whisper
  const transcribedText = await transcribeWithWhisper(audioFile);
  
  // 2. Get expected text
  const expectedText = await getQur'anText(req.body.surah, req.body.verse);
  
  // 3. Compare words
  const { accuracy, errors } = compareTexts(transcribedText, expectedText);
  
  // 4. Return results
  res.json({
    accuracy,
    transcribedText,
    expectedText,
    errors
  });
});

app.listen(3000);
```

This is what the frontend is waiting for!

---

## Summary

| Aspect | Current | Status |
|--------|---------|--------|
| **AI Evaluation** | Mock (hardcoded) | ❌ Not working |
| **Speech-to-Text** | Not implemented | 🔌 Needs API |
| **Text Comparison** | Hardcoded sample | ❌ Not real |
| **Error Detection** | Mock data | ❌ Not real |
| **User Interface** | Complete | ✅ Production-ready |
| **Accuracy Calculation** | Ready (waiting for real data) | ⏳ Blocked on APIs |
| **Advanced Features** | Planned | 📋 Phase 2+ |

**Next Step**: Build the `/api/evaluate` endpoint and integrate OpenAI Whisper API.

