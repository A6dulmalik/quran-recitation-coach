# Qur'an Recitation Evaluator - Implementation Guide

## Project Overview

This is a modern web application that allows users to practice and improve their Qur'an recitation with AI-powered evaluation and real-time feedback. Users select a Surah, choose a recitation mode, and receive word-by-word accuracy analysis with corrections.

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4 with custom design tokens
- **Component Library**: shadcn/ui (Field, Select, Button, Card components)
- **Icons**: Lucide React
- **Audio Recording**: Browser MediaRecorder API

### Backend (To be implemented)
- **Language**: Node.js (recommended) or Python FastAPI
- **Database**: PostgreSQL with Supabase (or similar)
- **Speech-to-Text**: Google Cloud Speech-to-Text, OpenAI Whisper, or similar
- **Qur'anic Text API**: External Qur'anic API (e.g., Al-Quran Cloud API)
- **Caching**: Redis (Upstash) for frequently accessed Qur'anic verses

## Current State

The frontend is fully functional with mock data. The app flow is:
1. User selects a Surah from dropdown
2. User chooses recitation mode: Single Verse, Complete Surah, or From Beginning to Verse
3. Full Qur'anic text is displayed for reference
4. User clicks "Begin Recitation" button (full-width at bottom)
5. User records their recitation
6. Mock evaluation is returned (currently showing same error for all)
7. Results show accuracy score, transcribed text, and errors

## API Integration Requirements

All items marked with 🔌 require backend API implementation:

### 1. 🔌 Fetch All 114 Surahs with Metadata
**Endpoint**: `GET /api/surahs`

**Current**: Only 14 sample Surahs are hardcoded in `surah-selector.tsx`

**What's needed**:
- Backend API that returns all 114 Surahs
- Each Surah should include: `{ number, arabicName, englishName, verses, transliteration }`
- Example API: [Al-Quran Cloud API](https://alquran.cloud/api) provides free Qur'anic data
- Cache the response with Redis/Upstash for performance

**File to update**: `/components/surah-selector.tsx`
- Replace hardcoded SURAHS array with API fetch in a useEffect
- Add loading and error states
- Implement proper React Query/SWR for data fetching

**Example API Response**:
```json
{
  "surahs": [
    {
      "number": 1,
      "name": "Al-Fatiha",
      "verses": 7,
      "englishName": "The Opening",
      "revelationType": "Meccan"
    },
    ...
  ]
}
```

---

### 2. 🔌 Fetch Full Qur'anic Text for Selected Surah/Verses
**Endpoint**: `GET /api/quran/:surahNumber/:verseNumber?`

**Current**: Mock data with 3-7 sample verses hardcoded in `recitation-evaluator.tsx`

**What's needed**:
- Backend retrieves complete Qur'anic text from API or database
- Support filtering by:
  - Single verse: `/api/quran/1/5` → returns Ayah 1:5
  - Complete Surah: `/api/quran/1` → returns all 7 Ayahs
  - Range: `/api/quran/1?fromVerse=1&toVerse=5` → returns Ayahs 1-5
- Return both Arabic text and transliteration (optional)
- Cache responses in Redis by surah:verse key

**File to update**: `/components/recitation-evaluator.tsx`
- Replace hardcoded VERSE_DATA with API fetch
- Handle loading states while displaying text
- Memoize requests to avoid refetching

**Example API Response**:
```json
{
  "surah": 1,
  "verses": [
    {
      "number": 1,
      "text": "الحمد لله رب العالمين",
      "transliteration": "Al-hamdu lillaahi rabbi al-'aalameen"
    },
    ...
  ]
}
```

---

### 3. 🔌 Audio Transcription (Speech-to-Text)
**Endpoint**: `POST /api/transcribe`

**Current**: Mock transcription returning hardcoded incorrect text

**What's needed**:
- Accept audio blob (WebM/MP3 format from MediaRecorder)
- Send to speech-to-text service:
  - **Recommended**: OpenAI Whisper API (excellent for Arabic)
  - **Alternative**: Google Cloud Speech-to-Text (very accurate)
  - **Alternative**: DeepInfra Whisper (cheaper, open-source)
- Return transcribed text in Arabic
- Handle timeout for long audio

**File to update**: `/components/recitation-evaluator.tsx` → `evaluateRecitation()` function

**Implementation approach**:
```typescript
// Convert blob to FormData
const formData = new FormData();
formData.append('audio', audioBlob, 'recitation.webm');
formData.append('surahNumber', selectedSurah);
formData.append('ayahNumber', selectedAyah);
formData.append('mode', selectedMode);

const response = await fetch('/api/transcribe', {
  method: 'POST',
  body: formData,
});
const { transcribedText, confidence } = await response.json();
```

**Example API Response**:
```json
{
  "transcribedText": "الحمد لله رب العالمين",
  "confidence": 0.95,
  "duration": 4.2
}
```

---

### 4. 🔌 Intelligent Error Detection & Word-by-Word Comparison
**Endpoint**: `POST /api/evaluate`

**Current**: Mock evaluation returning same error type for all mistakes

**What's needed**:
- Compare transcribed text against expected Qur'anic text
- Use sophisticated text matching (handles:
  - Diacritics (tashkeel) - optional since recitations don't include diacritics
  - Phonetic similarities (user may say "الله" but transcription returns "الالا")
  - Missing words
  - Extra words
  - Word order issues
- Return for each word: `{ word, status: 'correct'|'incorrect'|'missing', expected?, message }`
- Calculate overall accuracy as percentage of correct words
- Return prioritized error list (most critical first)

**File to update**: `/components/recitation-evaluator.tsx` → `evaluateRecitation()` function

**Logic needed**:
1. Split both texts into word arrays
2. Use string similarity algorithm (Levenshtein distance or similar)
3. Match words with >80% similarity threshold
4. Mark unmatched words as incorrect/missing
5. Generate contextual error messages: "You said X instead of Y"
6. Calculate accuracy: (correct words / total expected words) × 100

**Example API Request**:
```json
{
  "transcribedText": "الحمد لل رب العالمين",
  "expectedText": "الحمد لله رب العالمين",
  "surahNumber": 1,
  "ayahNumber": 1
}
```

**Example API Response**:
```json
{
  "accuracy": 75,
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
      "message": "You said 'لل' instead of 'لله'. Make sure to pronounce the 'ه' sound.",
      "position": 2,
      "severity": "medium"
    }
  ]
}
```

---

### 5. 🔌 Complete Surah & From Beginning Options
**Current**: UI buttons show modes but backend doesn't handle them

**What's needed**:
- When mode is "complete", return ALL verses for that Surah
- When mode is "fromBeginning", return verses 1 to selectedAyah
- Adjust accuracy calculation for longer texts
- Consider breaking very long recitations into segments for evaluation

**Files to update**: 
- `/components/surah-selector.tsx` - Already shows mode options
- `/components/recitation-evaluator.tsx` - Pass `selectedMode` to API

---

## File Structure & Implementation Order

### Phase 1: Data Integration
1. **Replace hardcoded Surahs** → Connect to Qur'anic API
2. **Replace hardcoded verses** → Fetch dynamically from API
3. **Add loading/error states** → Improve UX

### Phase 2: Audio Processing
4. **Implement audio transcription** → Send recorded audio to speech-to-text API
5. **Handle audio preprocessing** → Convert formats, compress if needed
6. **Add error handling** → Timeout, unsupported audio, etc.

### Phase 3: Evaluation Engine
7. **Build word comparison logic** → String matching algorithm
8. **Generate error messages** → Helpful, contextual feedback
9. **Calculate accuracy metrics** → Weighted scoring for different error types

### Phase 4: Optimization & Features
10. **Add caching** → Redis for frequently accessed Surahs
11. **Add user accounts** → Track progress (optional)
12. **Add pronunciation guide** → Audio samples for difficult words (optional)

---

## Implementation Checklist

### Backend Setup
- [ ] Choose and setup backend framework (Node.js Express or Python FastAPI)
- [ ] Setup PostgreSQL database (Supabase recommended)
- [ ] Setup Redis cache (Upstash recommended)
- [ ] Create `/api/transcribe` endpoint
- [ ] Create `/api/evaluate` endpoint
- [ ] Create `/api/quran` endpoints
- [ ] Create `/api/surahs` endpoint
- [ ] Setup error handling & logging
- [ ] Setup CORS for frontend

### Frontend Updates
- [ ] Update `surah-selector.tsx` to fetch from `/api/surahs`
- [ ] Update `recitation-evaluator.tsx` to fetch Qur'anic text from `/api/quran`
- [ ] Update `evaluateRecitation()` to call `/api/transcribe` and `/api/evaluate`
- [ ] Update `recitation-results.tsx` to highlight errors in red
- [ ] Add proper error states and user feedback
- [ ] Add loading skeletons while fetching

### Testing
- [ ] Test with various accent/dialects in Qur'an recitation
- [ ] Test edge cases (very short audio, very long audio, noise)
- [ ] Test Complete Surah mode with long recitations
- [ ] Load test API endpoints

---

## Important Notes

1. **Speech-to-Text Accuracy**: Whisper is currently the best Arabic speech-to-text model. Google Cloud Speech-to-Text is also excellent but costs more.

2. **Diacritics**: Qur'anic text includes diacritics (tashkeel), but spoken recitations don't have them. The comparison algorithm must account for this.

3. **Dialects**: Different Qur'anic recitation styles (Warsh, Hafs, etc.) may have slight pronunciation variations. Consider making this configurable.

4. **Phonetic Matching**: A simple string comparison won't work. Use phonetic algorithms like Metaphone or phonetic-similarity libraries.

5. **User Privacy**: Store audio files securely and for limited time. Consider user consent before storing.

6. **Performance**: Cache all Qur'anic data aggressively. This data never changes.

7. **Cost Optimization**: 
   - Free Qur'anic APIs: Al-Quran Cloud API (no cost)
   - Speech-to-Text: DeepInfra Whisper is cheapest (~$0.00036/min)
   - Caching: Upstash Redis free tier is sufficient initially

---

## Recommended Qur'anic APIs

1. **Al-Quran Cloud API** (FREE, Recommended)
   - https://alquran.cloud/api
   - Free, no authentication needed
   - Complete Qur'anic text in multiple translations
   - Very reliable

2. **Quran.com API** (FREE)
   - https://api.quran.com/
   - Excellent data quality
   - Multiple recitations available

3. **IslamicAPI** (FREE)
   - Multiple Qur'anic endpoints
   - Fast responses

---

## Error Message Guidelines

Generate messages like:
- ✗ "You said 'لل' but it should be 'لله' - remember the 'ه' sound"
- ✓ Perfect! You pronounced 'الحمد' correctly
- ⚠ You missed the word 'لله' - don't skip any words
- ℹ Try pronouncing 'رب' more clearly (emphasis on the 'ب')

---

## Future Enhancements

- [ ] Progress tracking & statistics
- [ ] Spaced repetition algorithm
- [ ] Pronunciation guide with audio
- [ ] Multiple recitation styles (Qira'at)
- [ ] Difficulty levels
- [ ] Group learning features
- [ ] Tajweed rules explanation
- [ ] Recording library
- [ ] Share results
- [ ] Leaderboards

---

## Questions or Clarifications Needed?

Ensure you understand:
1. How recitation modes work (single vs complete vs from beginning)
2. Why error messages are currently identical (mock data issue)
3. How word-by-word matching should handle diacritics
4. Which speech-to-text service to use
5. How to calculate weighted accuracy scores
