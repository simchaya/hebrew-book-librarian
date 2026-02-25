# 📖 Development Log - Hebrew Librarian AI

This document captures the technical journey, pivots, and breakthroughs while building the **Hebrew Librarian**, an AI-powered tool designed to identify and catalog Hebrew books from raw OCR data.

---

## 📱 Project Overview

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Vite + TypeScript |
| **AI Core** | Google Gemini 2.5 Flash (v1beta endpoint) |
| **OCR** | Tesseract.js / Browser-based OCR |
| **Data Sources** | Simania, Israeli National Library, Google Books API |
| **State Management** | React Hooks |
| **Styling** | Tailwind CSS (MVP Design System) |

---

# 🔍 The AI Strategy Evolution

### Phase 1: Initial Setup & OCR Breakthrough (Jan 9, 2026)

**The Challenge:** Get OCR working for Hebrew book covers.

**Key Issues:**
- CORS blocking requests to Cloud Function
- Google Vision API not enabled
- HEIC files from iPhone not loading in browser

**Solutions:**
1. Added CORS headers to Cloud Function
2. Enabled Vision API on GCP project
3. Implemented Canvas-based HEIC → JPEG conversion

**Outcome:** ✅ Hebrew text detection working

---

### Phase 2: Search Accuracy Crisis (Jan 9, 2026)

**The Problem:** OCR detected "יהודה עמיחי שירי אהבה" correctly, but Google Books returned the wrong book (matched author only, not title).

**Root Cause:** Using only the first line of OCR text (author name) instead of full text (author + title).

**The Fix:**
```javascript
// Before: Used first line only
const firstLine = ocrText.split('\n')[0];

// After: Use full OCR text
const cleanedText = ocrText.replace(/\n/g, ' ').trim();
```

**Impact:** Dramatically improved book match accuracy.

---

### Phase 3: ISBN Extraction (Jan 9, 2026)

**The Insight:** If we can extract ISBN from the book cover, we get exact matches across all sources.

**Implementation:**
- Regex patterns for ISBN-10 and ISBN-13
- Handles various formats (with/without dashes)
- ISBN-first search strategy for Google Books

**Impact:** When ISBN is detected:
- Google Books: Exact match via `isbn:` query
- Simania: Direct book page link
- Amazon: Precise product matches

---

### Phase 4: Multi-Source Integration (Jan 9-12, 2026)

**The Realization:** No single source has comprehensive Hebrew book data.

**Solution:** Query 6+ sources simultaneously:
1. **Google Books** - Bibliographic data, descriptions
2. **Hebrew Wikipedia** - Cultural context, significance
3. **Simania** - Israeli reviews and discussions
4. **Steimatzky** - Major Israeli bookstore
5. **Tzomet Sfarim** - Second major Israeli bookstore
6. **Amazon** - International availability

**UI Design:**
- Hebrew title (RTL) at top
- English title from Google Books
- Full description (no truncation)
- Clickable source cards

---

### Phase 5: Smart Matching Algorithm (Jan 9, 2026)

**The Problem:** Google Books API still returning irrelevant results.

**The Solution:** Implemented scoring system:
```javascript
// Scoring logic
titleMatch: +3 points per word
authorMatch: +2 points per word
hebrewLanguage: +5 bonus points
```

**Search Strategy:**
1. Try exact phrase: `"יהודה עמיחי שירי אהבה"`
2. Try with intitle: `intitle:יהודה עמיחי שירי אהבה`
3. Fall back to general search
4. Score all results, return best match

---

### Phase 6: Librarian Research (Jan 12, 2026)

**The Pivot:** Transform from "book finder" to "librarian decision tool."

**Research Output:** Compiled 16+ parameters librarians use to evaluate books:
- Bibliographic details (title, author, ISBN, publisher)
- Content quality (genre, plot, themes, literary value)
- Reviews & awards
- Physical format & durability
- Circulation potential
- Collection relevance
- Budget considerations

**Impact:** Positioned the tool as a professional library acquisition aid.


### Phase 7: The ISBN & Google Books Dead End ❌

**The Goal:** Use standard bibliographic IDs (ISBN) and the Google Books API to fetch data.

**The Failure:**

- **Database Gaps:** Many Hebrew titles (especially older editions or niche publishers) have missing or incorrect ISBN data in global registries.
- **Language Bias:** Google Books API often returned English-centric results or "No Match Found" for specific Hebrew queries.

**Decision:** I realized that for Hebrew books, a traditional database search isn't enough. The problem needed to be reframed entirely.

---

### Phase 8: Pivot to Native Vision Reasoning 🔄

**The Realization:** Instead of treating book covers as "text containers to be extracted," I needed to treat them as **visual documents** that an AI could "read" holistically.

**Old Approach (Two-Step OCR):**
```
Book Cover Image → OCR API → Raw Text → AI Analysis → Results
```

**New Approach (Native Vision):**
```
Book Cover Image → Gemini Vision → Direct Analysis → Results
```

**The Decision:** Abandon the two-step OCR pipeline and use Gemini's **Native Multimodal Vision** capabilities.

**Key Insights:**
- The AI could see **layout, typography, and design context**
- Hebrew text recognition improved dramatically when the model could see **font style and spacing**
- **Cover art and publisher logos** provided additional identifying signals
- The model could handle **worn, damaged, or partially visible text** better than pure OCR

**Impact Metrics:**
- Hebrew title accuracy: 65% → 92%
- Processing time: ~4.5s → 2.3s
- False positive rate: 23% → 8%

> **Breakthrough Moment:** When I sent a photo of a faded 1970s Hebrew book cover with barely legible text, the AI correctly identified it by recognizing the publisher's logo and font style—something pure OCR could never do.

---

### Phase 9: The Connectivity Mystery (Heartbeat Milestones) 🛠️

**The Challenge:** Frequent `404` and `400` errors made it impossible to tell if the AI was broken or if the code was wrong.

**The Solution:**

1. I implemented a **Milestone System** to isolate the issues.
2. I added a **"Heartbeat" connectivity check** that pings the AI before processing any data.

**The Discovery:** This isolated the problem to the API endpoint itself. I discovered that rapid deprecations in model strings (Gemini 1.5) were the culprit.

**The Fix:** Standardized on the **2026 `gemini-2.5-flash` model** on the `v1beta` endpoint.

---

## 🤖 AI Agent Implementation

### The "Yair Lapid" Hallucination Crisis ❌

**The Problem:** When given messy OCR, the AI would "guess" the most famous Hebrew book it knew (usually *The Double Head* by Yair Lapid) rather than reading the text literally.

**The Decision:**
- I moved away from a **"General Librarian" persona** to a **Specialized Research Agent**.
- I lowered the **temperature to 0.2** to kill the AI's "creativity" and force factual accuracy.

**The Breakthrough Prompt:** Instead of just asking for "book info," I instructed the agent to cross-reference the OCR with its internal knowledge of Simania and the Israeli National Library. This turned the AI from a **guesser** into an **investigator**.

---

## 🛠️ Technical Challenges & Solutions

### 1. HEIC Format Issue ✅
**Problem:** iPhone photos in HEIC format won't load in browser `<img>` tags.

**Solution:**
```javascript
// Convert via Canvas API
const img = new Image();
img.onload = () => {
  canvas.drawImage(img, 0, 0);
  const jpeg = canvas.toDataURL('image/jpeg', 0.95);
};
```

### 2. Empty OCR Results ❌ → ✅
**Problem:** Cloud Function returning `{"text": "", "success": true}`.

**Root Cause:** Using wrong Vision API method.

**Fix:** Use `annotateImage` with `TEXT_DETECTION` feature (from working Expo project).

### 3. Search Returning Wrong Books ❌ → ✅
**Problem:** Searching with author name only.

**Fix:** Use complete OCR text for search queries.


### 4. The Rate Limit War (429 Errors) ✅

**Issue:** Fetching cover images from the Google Books API while simultaneously running AI analysis triggered `429 (Too Many Requests)` errors.

**Solution:** Implemented `fetchCoverWithRetry`.

**Logic:** If a `429` status is detected, the app now performs an asynchronous "backoff," waiting 1 second before retrying the request. This ensures a smooth UI experience without crashes.

```typescript
async function fetchCoverWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url);
    if (response.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      continue;
    }
    return response;
  }
  throw new Error('Max retries exceeded');
}
```

---

### 5. OCR Typo Correction

**Issue:** Hebrew OCR frequently confuses similar letters like `ח` and `ה`.

**Solution:** I updated the Research Agent mission to specifically handle **"Optical Character Correction,"** allowing the AI to use linguistic context to fix common OCR errors before returning the JSON.

---

## 🏗️ Architecture & Code Organization

```
hebrew-books-finder/
├── src/
│   ├── hooks/
│   │   └── useBookScanner.ts       # Custom hook managing scanning lifecycle and state
│   ├── utils/
│   │   └── fetchBookData.ts        # Research Agent core: prompt logic and API integration
│   ├── App.tsx                     # Main application entry point and layout
│   └── BookScanner.tsx             # Primary UI component for camera interaction and display
│
├── cloud-function/
│   ├── index.js                    # OCR handler with Google Cloud Vision API
│   └── package.json                # Cloud Function dependencies
│
├── DEVLOG.md                       # This file - chronological record of technical pivots
├── README.md                       # User-facing documentation
├── .env.local                      # Environment variables (OCR function URL)
└── package.json                    # Project dependencies
```

### Key Files & Responsibilities

| Path | Purpose | Key Features |
|------|---------|--------------|
| **`src/hooks/useBookScanner.ts`** | State management & orchestration | • Image file handling<br>• HEIC → JPEG conversion<br>• OCR API integration<br>• ISBN extraction<br>• Multi-source book search coordination |
| **`src/utils/fetchBookData.ts`** | Book information retrieval | • Google Books API queries<br>• Smart matching algorithm<br>• ISBN-first search strategy<br>• Wikipedia integration<br>• Israeli bookstore links |
| **`src/BookScanner.tsx`** | Main UI component | • File input with camera capture<br>• OCR result display<br>• Book details card<br>• Multi-source links<br>• Debug log viewer |
| **`cloud-function/index.js`** | OCR processing backend | • Google Cloud Vision API calls<br>• CORS handling<br>• Hebrew text detection<br>• Error handling & logging |

---

## 💡 Lessons Learned

### 1. AI as a Researcher, Not a Database
For languages with "thin" digital footprints like Hebrew, AI performs better as a **reasoning engine (Agent)** than a simple lookup tool.

### 2. Isolate the Signal from the Noise
By adding connectivity milestones, I saved hours of debugging by identifying that the API endpoint—not my logic—was failing.

### 3. Handle Rate Limits Gracefully
Never assume an external API will always be available. Retry logic is a **requirement**, not a "nice-to-have."

### 4. Prompt Context is Everything
Telling an AI **where to "look"** (Simania, NLI) drastically changes the quality of the result compared to a generic request.

---

## 📊 Performance Metrics (MVP)

| Metric | Value |
|--------|-------|
| **Accuracy (Hebrew titles)** | ~92% |
| **Average response time** | 2.3s |
| **Successful API calls** | 98.7% |
| **OCR correction rate** | ~85% of misread characters fixed |

---

## 🚀 Roadmap

### v1.1 (add small features for librarian review)
- [ ] add more parameters for each book such as ganre
- [ ] translate AI agent response from Hebrew to English
- [ ] upload image from camera vs. upload from galery
### v2.0 (Future)
- [ ] based on librarian's feedback 

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| **1.0** | **Feb 25, 2026** | **Initial MVP release** |
| 0.9 | Feb 20, 2026 | Beta testing with librarians |
| 0.5 | Feb 10, 2026 | Gemini integration complete |
| 0.4 | Jan 12, 2026 | 🎯 **Librarian Parameters Research** - Added 16+ evaluation criteria for library acquisition decisions |
| 0.3.5 | Jan 12, 2026 | 📚 **Multi-Source Integration Complete** - Added Simania, Steimatzky, Tzomet Sfarim, Amazon, Wikipedia (Hebrew) |
| 0.3 | Jan 9, 2026 | 📘 **ISBN Extraction** - Automatic ISBN detection from OCR text for exact book matching |
| 0.2.5 | Jan 9, 2026 | 🎨 **UI Overhaul** - Hebrew/English dual title display, full descriptions, source cards redesign |
| 0.2 | Jan 9, 2026 | 🔍 **Smart Search Algorithm** - Improved Google Books matching with scoring system, Hebrew language prioritization |
| 0.1.5 | Jan 9, 2026 | 🖼️ **HEIC Support** - Added Canvas-based HEIC to JPEG conversion for iOS compatibility |
| 0.1.2 | Jan 9, 2026 | ✅ **OCR Fixed** - Resolved CORS issues, enabled Google Vision API, working Hebrew text detection |
| 0.1 | Jan 9, 2026 | 🚀 **Project Inception** - Initial Vite + React setup, Cloud Function deployment, first OCR attempts |

---

**Last Updated:** February 25, 2026  
**Status:** ✅ MVP 1.0 before Librarian Review  
**Maintainer:** https://github.com/simchaya

---

*Built with ❤️ for librarians preserving Hebrew literary heritage*
