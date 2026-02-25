📖 Development Log - Hebrew Librarian AI
This document captures the technical journey, pivots, and breakthroughs while building the Hebrew Librarian, an AI-powered tool designed to identify and catalog Hebrew books from raw OCR data.

📱 Project Overview
Tech Stack:

Frontend: React + Vite + TypeScript

AI Core: Google Gemini 2.5 Flash (v1beta endpoint)

OCR: Tesseract.js / Browser-based OCR

Data Sources: Simania, Israeli National Library, Google Books API

State Management: React Hooks

Styling: Tailwind CSS (MVP Design System)

🔍 The AI Strategy Pivot
Phase 1: The ISBN & Google Books Dead End ❌

The Goal: Use standard bibliographic IDs (ISBN) and the Google Books API to fetch data.

The Failure:

Database Gaps: Many Hebrew titles (especially older editions or niche publishers) have missing or incorrect ISBN data in global registries.

Language Bias: Google Books API often returned English-centric results or "No Match Found" for specific Hebrew queries.

Decision: I realized that for Hebrew books, a traditional database search isn't enough. I decided to abandon the ISBN-first approach and treat the problem as a "visual research" task.

"Pivot: From Traditional OCR to Native Vision Reasoning"

Decision: Instead of using a two-step process (Step 1: Extract text with OCR API, Step 2: Feed text to AI), I utilized Gemini’s Native Multimodal Vision.

Impact: This allowed the model to see the layout, font, and style of the book cover directly, leading to far higher accuracy in Hebrew title recognition than a raw text-to-text workflow.

Phase 2: The Connectivity Mystery (Heartbeat Milestones) 🛠️

The Challenge: Frequent 404 and 400 errors made it impossible to tell if the AI was broken or if the code was wrong.

The Solution:

I implemented a Milestone System to isolate the issues.

I added a "Heartbeat" connectivity check that pings the AI before processing any data.

The Discovery: This isolated the problem to the API endpoint itself. I discovered that rapid deprecations in model strings (Gemini 1.5) were the culprit.

The Fix: Standardized on the 2026 gemini-2.5-flash model on the v1beta endpoint.

🤖 AI Agent Implementation
The "Yair Lapid" Hallucination Crisis ❌

The Problem: When given messy OCR, the AI would "guess" the most famous Hebrew book it knew (usually The Double Head by Yair Lapid) rather than reading the text literally.

The Decision: - I moved away from a "General Librarian" persona to a Specialized Research Agent.

I lowered the temperature to 0.2 to kill the AI's "creativity" and force factual accuracy.

The Breakthrough Prompt:
Instead of just asking for "book info," I instructed the agent to cross-reference the OCR with its internal knowledge of Simania and the Israeli National Library. This turned the AI from a guesser into an investigator.

🛠️ Technical Challenges & Solutions
1. The Rate Limit War (429 Errors) ✅

Issue: Fetching cover images from the Google Books API while simultaneously running AI analysis triggered 429 (Too Many Requests) errors.

Solution: Implemented fetchCoverWithRetry.

Logic: If a 429 status is detected, the app now performs an asynchronous "backoff," waiting 1 second before retrying the request. This ensures a smooth UI experience without crashes.

2. OCR Typo Correction

Issue: Hebrew OCR frequently confuses similar letters like ח and ה.

Solution: I updated the Research Agent mission to specifically handle "Optical Character Correction," allowing the AI to use linguistic context to fix common OCR errors before returning the JSON.

🏗️ Architecture & Code Organization
Path	Description
src/hooks/	Custom hooks for OCR processing and AI state.
src/utils/fetchBookData.ts	The core Research Agent logic and prompt engineering.
src/components/	Modular UI for the AI Analysis Card and Image Uploader.
DEVLOG.md	Chronological record of technical pivots.
💡 Lessons Learned
AI as a Researcher, Not a Database: For languages with "thin" digital footprints like Hebrew, AI performs better as a reasoning engine (Agent) than a simple lookup tool.

Isolate the Signal from the Noise: By adding connectivity milestones, I saved hours of debugging by identifying that the API endpoint—not my logic—was failing.

Handle Rate Limits Gracefully: Never assume an external API will always be available. Retry logic is a requirement, not a "nice-to-have."

Prompt Context is Everything: Telling an AI where to "look" (Simania, NLI) drastically changes the quality of the result compared to a generic request.

Last Updated: February 25, 2026

Status: ✅ MVP 1.0 Ready for Librarian Review