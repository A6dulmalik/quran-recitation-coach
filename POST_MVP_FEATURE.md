/\*
POST-MVP ENHANCEMENT ROADMAP FOR QUR’AN RECITATION ENGINE

We have a working MVP with:

- Simulation mode
- Word-level feedback
- Error detection UI

Now extend the system with the following features:

---

1. BATCH RECITATION MODE

- User recites a full verse
- System evaluates after recording ends
- Update all words at once

---

2. REAL AUDIO PIPELINE INTEGRATION

Prepare engine to accept:

- Transcribed text input
- Word-level comparison results

Add a function:
applyComparisonResult(result)

---

3. PROGRESS TRACKING

Track:

- Completed verses
- Accuracy per session
- Total sessions

---

4. SESSION HISTORY

Store:

- Surah
- Verses recited
- Accuracy
- Mistakes

---

5. AUDIO PLAYBACK SUPPORT

- Play correct recitation for a verse
- Replay user recording

---

6. MODES

Support:

- strict (pause on error)
- flow (continue, show errors later)

---

7. OFFLINE SUPPORT (PWA)

- Cache Qur’an data locally
- Allow reading without internet

---

8. PERFORMANCE IMPROVEMENTS

- Avoid unnecessary re-renders
- Memoize heavy computations

---

CONSTRAINTS

- Maintain compatibility with existing engine
- Keep logic modular
- Avoid breaking simulation mode

---

\*/
