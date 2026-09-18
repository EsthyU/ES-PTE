# ES-PTE

A PTE Core trainer for the phone: every task type, a written-for-this-app practice bank, and eight full mock exams with timings and scoring.

Plain files, no build step. Every score stays on your device.

## Files

| File | What it does |
|---|---|
| `index.html` | The shell, styling and icons |
| `app.js` | The app: runners, timers, scoring, progress |
| `bank-speaking.js`, `bank-writing-reading.js`, `bank-listening.js` | The practice items |
| `manifest.json`, `sw.js` | Installable and offline |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App icons |

## Publish and install

1. Create a public repo named `ES-PTE` and upload all of these files (the files, not the folder).
2. Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.
3. Open `https://esthyu.github.io/ES-PTE/` in Safari, then Share → Add to Home Screen.
4. Allow the microphone the first time you run a speaking task.

Use headphones. The app speaks through your phone's own voice, and the microphone picks up the speaker otherwise.

## What's inside

All 20 PTE Core task types:

- **Speaking & Writing** — Read Aloud, Repeat Sentence, Describe Image, Respond to a Situation, Answer Short Question, Summarize Written Text, Write Email.
- **Reading** — Reading & Writing Fill in the Blanks, MCQ multiple, Re-order Paragraphs, Reading Fill in the Blanks, MCQ single.
- **Listening** — Summarize Spoken Text, MCQ multiple, Fill in the Blanks, Highlight Correct Summary, MCQ single, Select Missing Word, Highlight Incorrect Words, Write from Dictation.

Bank sizes: 24 Read Aloud texts, 48 Repeat Sentence, 48 short questions, 16 images, 16 situations, 8 summarise passages, 10 email prompts, 16 + 12 cloze sets, 12 re-order sets, 12 + 8 reading MCQs, 8 spoken lectures, 12 listening cloze, 8 correct-summary, 8 + 8 listening MCQs, 12 missing word, 12 highlight incorrect, 36 dictation sentences. About 290 items.

**Eight mocks**, 42 items each, in exam order, real timings, no replays, roughly 70 minutes.

## How marking works

- **Marked by the app:** all blanks, both kinds of multiple choice, re-ordering (scored on adjacent pairs, as Pearson does), select missing word, highlight incorrect words (a wrong tap cancels a right one), dictation (scored word by word), short questions.
- **Scored by you:** Read Aloud, Repeat Sentence, Describe Image, Respond to a Situation, Summarize Written Text, Write Email, Summarize Spoken Text. You get a rubric and, for speaking, a playback of your own recording. Word count and the limit are checked for you, and an answer outside the limit is capped.
- **Progress** uses the average of your last five attempts in each task type.

## Timings

From Pearson's published PTE Core format: Read Aloud 35s prep, Repeat Sentence 15s, Describe Image 25s prep and 40s speaking, Respond to a Situation 20s prep and 40s speaking, Answer Short Question 10s, Summarize Written Text 10 min and 25–50 words, Write Email 9 min and 80–120 words, Re-order 2 min, Summarize Spoken Text 8 min and 20–30 words. Change the voice speed in the Guide tab.

## Honest limits

- The items were written for this app. They follow the published formats but are not past papers, and they are not marked by Pearson's scoring engine.
- The audio is your phone's speech voice, which is clearer and flatter than the exam's recordings. Practise at a faster speed as you improve.
- Speaking scores are your own judgement. Be strict.

## Updating

Upload the changed files, then bump `VERSION` in `sw.js` so phones pick up the new version. Your progress isn't touched.
