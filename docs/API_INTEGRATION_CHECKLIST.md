# API Integration Checklist

## 🔌 Required Backend APIs - CRITICAL

This document shows **exactly** which APIs need to be built and which frontend components depend on them.

---

## API #1: GET `/api/surahs` - ALL 114 SURAHS

### Requirement Level: 🔴 CRITICAL
### Priority: 1 (Do This First)

### Current State
```typescript
// In: /components/surah-selector.tsx (line 11-25)
const SURAHS = [
  { number: 1, name: 'Al-Fatiha', verses: 7 },
  { number: 2, name: 'Al-Baqarah', verses: 286 },
  // ... only 14 Surahs, need 114! ❌
];
```

### What Needs to Change
- Replace hardcoded array with API fetch
- Add loading state while fetching
- Add error state if API fails
- Cache result (doesn't change)

### Frontend Component Affected
- ✏️ `/components/surah-selector.tsx`

### API Specification
```
Method: GET
Path: /api/surahs
Authentication: None (public)
Response Time: <100ms (should be cached)
Cache TTL: 30 days (never changes)

Request:
GET /api/surahs

Response (200 OK):
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
    ... (total 114 Surahs)
  ]
}

Response (500 Error):
{
  "error": "Failed to fetch Surahs",
  "message": "External API error"
}
```

### Data Source Options
1. **✅ RECOMMENDED**: [Al-Quran Cloud API](https://alquran.cloud/api) (FREE, no auth)
2. **Alternative**: [Quran.com API](https://api.quran.com/) (FREE)
3. **Alternative**: IslamicAPI (FREE)
4. **Alternative**: Fetch from PostgreSQL if you store Qur'an locally

### Implementation Pattern
```typescript
// Backend example (Node.js + Express)
app.get('/api/surahs', async (req, res) => {
  try {
    // Check Redis cache first
    const cached = await redis.get('surahs:all');
    if (cached) return res.json(JSON.parse(cached));
    
    // Fetch from external API
    const response = await axios.get('https://api.alquran.cloud/v1/quran/en.asad/metadata');
    const surahs = response.data.data.surahs.map(surah => ({
      number: surah.number,
      name: surah.englishName,
      arabicName: surah.name,
      verses: surah.numberOfAyahs,
      revelationType: surah.revelationType
    }));
    
    // Cache for 30 days
    await redis.setex('surahs:all', 30 * 24 * 60 * 60, JSON.stringify({ surahs }));
    
    res.json({ surahs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## API #2: GET `/api/quran/:surahNumber/:verseNumber?` - QURANIC TEXT

### Requirement Level: 🔴 CRITICAL
### Priority: 2 (Do This Second)

### Current State
```typescript
// In: /components/recitation-evaluator.tsx (line 20-35)
const VERSE_DATA: Record<string, Record<number, string>> = {
  '1': {
    1: 'الحمد لله رب العالمين',
    2: 'الرحمن الرحيم',
    // ... only 3-7 verses per Surah
  },
  // ... only 4 Surahs total ❌
};
```

### What Needs to Change
- Replace hardcoded VERSE_DATA with API calls
- Support three query patterns:
  - Single verse: `/api/quran/1/5`
  - Complete Surah: `/api/quran/1`
  - Range: `/api/quran/1?fromVerse=1&toVerse=5` (optional)
- Cache all responses
- Handle both "single" and "complete" recitation modes

### Frontend Component Affected
- ✏️ `/components/recitation-evaluator.tsx` (lines ~165-179 text display)
- ✏️ `/components/recitation-evaluator.tsx` (variable `verseText`)

### API Specification

#### Single Verse Request
```
GET /api/quran/1/5

Response (200 OK):
{
  "surah": 1,
  "surahName": "Al-Fatiha",
  "verses": [
    {
      "number": 5,
      "text": "اهدنا الصراط المستقيم",
      "transliteration": "Ihdina as-sirata al-mustaqeem"
    }
  ]
}
```

#### Complete Surah Request
```
GET /api/quran/1

Response (200 OK):
{
  "surah": 1,
  "surahName": "Al-Fatiha",
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

#### Range Request (Optional)
```
GET /api/quran/1?fromVerse=1&toVerse=5

Response (200 OK):
{
  "surah": 1,
  "surahName": "Al-Fatiha",
  "verses": [
    // Verses 1-5
  ]
}
```

### Data Source Options
1. **✅ RECOMMENDED**: [Al-Quran Cloud API](https://alquran.cloud/api) (FREE)
2. **Alternative**: [Quran.com API](https://api.quran.com/) (FREE)
3. **Alternative**: Store locally in PostgreSQL

### Implementation Pattern
```typescript
// Backend example (Node.js + Express)
app.get('/api/quran/:surah/:verse?', async (req, res) => {
  try {
    const { surah, verse } = req.params;
    
    // Build cache key
    const cacheKey = verse 
      ? `surah:${surah}:verse:${verse}`
      : `surah:${surah}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
    
    // Fetch from API
    let url = `https://api.alquran.cloud/v1/surah/${surah}`;
    const response = await axios.get(url);
    
    let verses = response.data.data.ayahs;
    if (verse) {
      verses = verses.filter(v => v.numberInSurah == verse);
    }
    
    const result = {
      surah: parseInt(surah),
      surahName: response.data.data.englishName,
      verses: verses.map(v => ({
        number: v.numberInSurah,
        text: v.text
      }))
    };
    
    // Cache for 30 days
    await redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(result));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend Code That Will Use This
```typescript
// In /components/recitation-evaluator.tsx
useEffect(() => {
  if (!selectedSurah) return;
  
  const fetchVerse = async () => {
    const endpoint = selectedMode === 'complete'
      ? `/api/quran/${selectedSurah}`
      : `/api/quran/${selectedSurah}/${selectedAyah}`;
    
    const response = await fetch(endpoint);
    const data = await response.json();
    
    // For complete mode, join all verses
    if (selectedMode === 'complete') {
      setVerseText(data.verses.map(v => v.text).join(' '));
    } else {
      setVerseText(data.verses[0].text);
    }
  };
  
  fetchVerse();
}, [selectedSurah, selectedAyah, selectedMode]);
```

---

## API #3: POST `/api/transcribe` - AUDIO TO TEXT

### Requirement Level: 🔴 CRITICAL
### Priority: 3 (Do This Third)

### Current State
```typescript
// In: /components/recitation-evaluator.tsx (line ~100)
// Mock transcription - always returns same text!
const mockTranscribedText = 'الحمد لل رب العالمين'; // Hardcoded ❌
```

### What Needs to Change
- Accept audio blob from frontend
- Send to speech-to-text service
- Return accurate transcription
- This is why all recordings show wrong - transcription always returns same mock text!

### Frontend Component Affected
- ✏️ `/components/recitation-evaluator.tsx` (function `evaluateRecitation()`)

### API Specification
```
Method: POST
Path: /api/transcribe
Content-Type: multipart/form-data
Authentication: Optional (could use user ID)
Response Time: 5-30 seconds (depends on audio length)
Max File Size: 100MB

Request:
POST /api/transcribe
Content-Type: multipart/form-data

{
  "audio": <WebM audio blob>,
  "surahNumber": 1,
  "ayahNumber": 5,
  "mode": "single"  // or "complete" or "fromBeginning"
}

Response (200 OK):
{
  "transcribedText": "الحمد لله رب العالمين",
  "confidence": 0.95,
  "duration": 4.2,
  "language": "ar",
  "model": "whisper-1"
}

Response (400 Error):
{
  "error": "Audio processing failed",
  "message": "Unsupported audio format"
}

Response (429 Error):
{
  "error": "Rate limit exceeded",
  "message": "Too many transcription requests"
}
```

### Service Options (Pick One)
1. **✅ RECOMMENDED**: [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
   - Best for Arabic
   - Cost: ~$0.02 per minute
   - Requires API key

2. **Alternative**: [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text)
   - Excellent accuracy
   - Cost: ~$0.024 per 15 seconds
   - Requires credentials

3. **Budget Option**: [DeepInfra Whisper](https://deepinfra.com/)
   - Open-source Whisper
   - Cost: ~$0.00036 per minute
   - Cheapest option

### Implementation Pattern
```typescript
// Backend example (Node.js + Express)
app.post('/api/transcribe', uploadMiddleware.single('audio'), async (req, res) => {
  try {
    const audioPath = req.file.path;
    const { surahNumber, ayahNumber, mode } = req.body;
    
    // Create readable stream from audio file
    const audioStream = fs.createReadStream(audioPath);
    
    // Send to Whisper API
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioStream,
      language: 'ar' // Arabic
    });
    
    // Delete uploaded file
    fs.unlinkSync(audioPath);
    
    // Return result
    res.json({
      transcribedText: transcription.text,
      confidence: 0.95,
      duration: req.file.size / (128 * 1024) // Rough estimate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend Code That Will Call This
```typescript
// In /components/recitation-evaluator.tsx
const evaluateRecitation = async (audioBlob: Blob) => {
  setIsEvaluating(true);
  
  try {
    // Create FormData
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recitation.webm');
    formData.append('surahNumber', selectedSurah);
    formData.append('ayahNumber', selectedAyah);
    formData.append('mode', selectedMode);
    
    // Call transcribe endpoint
    const transcribeResponse = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });
    
    const { transcribedText } = await transcribeResponse.json();
    
    // Now call evaluate endpoint (see API #4)
    // ...
  } catch (error) {
    console.error('Transcription failed:', error);
  }
};
```

---

## API #4: POST `/api/evaluate` - ERROR DETECTION & ACCURACY

### Requirement Level: 🔴 CRITICAL (Most Important!)
### Priority: 4 (Do This Fourth)

### Current State
```typescript
// In: /components/recitation-evaluator.tsx (line ~120)
const mockResult: EvaluationResult = {
  accuracy: 85,
  errors: [{
    type: 'wrong',
    word: 'لل',
    expected: 'لله',
    message: 'You said "لل" instead of "لله"', // SAME ERROR EVERY TIME ❌
  }],
};
```

### ⚠️ THIS IS WHY ALL MISTAKES ARE THE SAME!

This is the **most important** API because it's what makes evaluation actually work:
- ❌ All recordings currently show the same error
- ❌ All recordings get 85% accuracy (hardcoded)
- ❌ No real comparison between what user said vs. expected text
- ✅ Once you implement this, everything works dynamically!

### What Needs to Change
- Compare actual transcribed text vs. expected Qur'anic text
- Word-by-word analysis (NOT hardcoded!)
- Generate different errors for different mistakes
- Calculate real accuracy based on performance
- Return contextual, helpful error messages

### Frontend Component Affected
- ✏️ `/components/recitation-evaluator.tsx` (function `evaluateRecitation()`)
- ✏️ `/components/recitation-results.tsx` (displays errors)

### API Specification
```
Method: POST
Path: /api/evaluate
Content-Type: application/json
Authentication: Optional

Request:
POST /api/evaluate
{
  "transcribedText": "الحمد لل رب العالمين",
  "expectedText": "الحمد لله رب العالمين",
  "surahNumber": 1,
  "ayahNumber": 1,
  "mode": "single"
}

Response (200 OK):
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
      "message": "You said 'لل' but it should be 'لله'. Remember to pronounce the 'ه' at the end.",
      "severity": "medium",
      "suggestion": "Practice the 'ه' ending sound"
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

### Algorithm Needed
1. **Normalize text**
   - Remove diacritics from expected text
   - Normalize whitespace
   - Handle Arabic special characters

2. **Word Splitting**
   - Split both texts into words
   - expected: ['الحمد', 'لله', 'رب', 'العالمين']
   - transcribed: ['الحمد', 'لل', 'رب', 'العالمين']

3. **Matching Algorithm**
   - For each word position, try to find match
   - Use fuzzy matching for phonetic similarity
   - Threshold: >80% similarity = correct pronunciation

4. **Error Classification**
   - Exact match → "correct"
   - >80% match → "correct" (phonetic variation)
   - <80% match → "incorrect"
   - Missing word → "missing"
   - Extra word → "extra"

5. **Accuracy Calculation**
   - `accuracy = (correct_words / total_expected_words) × 100`
   - Example: 3 correct out of 4 = 75%

### Implementation Pattern
```typescript
// Backend example (Node.js)
app.post('/api/evaluate', async (req, res) => {
  try {
    const { transcribedText, expectedText } = req.body;
    
    // Step 1: Normalize
    const normalizeArabic = (text) => {
      // Remove diacritics
      const diacriticsRegex = /[\u064B-\u065F]/g;
      return text.replace(diacriticsRegex, '').trim();
    };
    
    const normExpected = normalizeArabic(expectedText);
    const normTranscribed = normalizeArabic(transcribedText);
    
    // Step 2: Split into words
    const expectedWords = normExpected.split(/\s+/);
    const transcribedWords = normTranscribed.split(/\s+/);
    
    // Step 3: Create word results using fuzzy matching
    const wordResults = [];
    const errors = [];
    
    for (let i = 0; i < expectedWords.length; i++) {
      const expected = expectedWords[i];
      let found = false;
      let bestMatch = null;
      let bestScore = 0;
      
      for (const transcribed of transcribedWords) {
        const score = levenshteinSimilarity(expected, transcribed);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = transcribed;
        }
      }
      
      if (bestScore > 0.8) {
        // Correct
        wordResults.push({
          word: bestMatch,
          status: 'correct',
          confidence: bestScore
        });
        found = true;
      } else if (bestMatch) {
        // Wrong
        wordResults.push({
          word: bestMatch,
          status: 'incorrect',
          expected: expected,
          confidence: bestScore
        });
        
        errors.push({
          type: 'wrong',
          word: bestMatch,
          expected: expected,
          message: `You said '${bestMatch}' but it should be '${expected}'.`,
          severity: bestScore > 0.5 ? 'low' : 'medium'
        });
      } else {
        // Missing
        errors.push({
          type: 'missing',
          word: expected,
          message: `You missed the word '${expected}'. Don't skip any words.`,
          severity: 'high'
        });
      }
    }
    
    // Step 4: Calculate accuracy
    const correctCount = wordResults.filter(w => w.status === 'correct').length;
    const accuracy = Math.round((correctCount / expectedWords.length) * 100);
    
    res.json({
      accuracy,
      transcribedText,
      expectedText,
      wordResults,
      errors,
      summary: {
        totalWords: expectedWords.length,
        correctWords: correctCount,
        incorrectWords: errors.filter(e => e.type === 'wrong').length,
        missingWords: errors.filter(e => e.type === 'missing').length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function: Calculate similarity between two strings
function levenshteinSimilarity(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}
```

### Frontend Code That Will Use This
```typescript
// After transcribeResponse, in evaluateRecitation()
const evaluateResponse = await fetch('/api/evaluate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcribedText,
    expectedText: verseText,
    surahNumber: selectedSurah,
    ayahNumber: selectedAyah,
    mode: selectedMode
  })
});

const evaluationResult = await evaluateResponse.json();
setResult(evaluationResult); // This is what displays in RecitationResults
```

---

## Optional: API #5 - User Progress Tracking

### Requirement Level: 🟡 OPTIONAL
### Priority: 5 (Do This Last)

```
POST /api/sessions - Save user recitation session
GET /api/sessions/:userId - Get user's history
GET /api/stats/:userId - Get user statistics
```

---

## Summary Table

| API | Method | Path | Priority | Frontend File | Status |
|-----|--------|------|----------|---------------|--------|
| **Surahs** | GET | `/api/surahs` | 🔴 1 | surah-selector.tsx | ❌ Not implemented |
| **Qur'an Text** | GET | `/api/quran/:surah/:verse?` | 🔴 2 | recitation-evaluator.tsx | ❌ Not implemented |
| **Transcribe** | POST | `/api/transcribe` | 🔴 3 | recitation-evaluator.tsx | ❌ Not implemented |
| **Evaluate** | POST | `/api/evaluate` | 🔴 4 | recitation-evaluator.tsx | ❌ Not implemented |
| **Sessions** | POST/GET | `/api/sessions` | 🟡 5 | - | Optional |

---

## Implementation Order

1. ✅ **Start with `/api/surahs`** - Simplest, gets data from external API, cache it
2. ✅ **Then `/api/quran`** - Similar pattern, fetch Qur'anic text
3. ✅ **Then `/api/transcribe`** - More complex, integrates with Whisper API, handles file upload
4. ✅ **Then `/api/evaluate`** - Most complex, needs smart word matching algorithm
5. 🟡 **Finally `/api/sessions`** - Optional, for progress tracking

---

## Testing Each API

### Test `/api/surahs`
```bash
curl http://localhost:3001/api/surahs
# Should return all 114 Surahs
```

### Test `/api/quran`
```bash
curl http://localhost:3001/api/quran/1
curl http://localhost:3001/api/quran/1/5
```

### Test `/api/transcribe`
```bash
curl -F "audio=@recording.webm" http://localhost:3001/api/transcribe
# Should return Arabic text
```

### Test `/api/evaluate`
```bash
curl -X POST http://localhost:3001/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "transcribedText": "الحمد لل رب العالمين",
    "expectedText": "الحمد لله رب العالمين"
  }'
# Should return 75% accuracy with error details
```

---

## Final Note

**Once all 4 APIs are implemented**, the entire application will work:
- ✅ Users can select from all 114 Surahs
- ✅ Users can see complete Qur'anic text
- ✅ Users can record and get real transcriptions
- ✅ Users get accurate, contextual feedback
- ✅ Different recordings get different errors (not hardcoded!)
- ✅ Accuracy scores reflect actual performance

**The frontend is 100% ready. You just need the backend!** 🚀
