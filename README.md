# Security Detection Game

An Among-Us-inspired security training game. Players inspect short code snippets,
label them as SAFE or VULNERABLE, and receive a post-game audit powered by
Hacktron and Claude. Optional voice summaries are generated via ElevenLabs.

## Features
- LLM-generated tasks with realistic vulnerabilities (XSS, SQLi, SSRF, RCE, etc.)
- Claude-generated per-snippet hints (tutorial mode, reveal on demand)
- Real-time gameplay with timer, scoring, and system status
- Hacktron CLI scan of missed tasks only (fast, focused audits)
- Claude "Security Mentor" post-mortem summary
- Optional ElevenLabs voice output
- Live scan log overlay + staggered findings reveal
- Audit split-screen (live logs + progress ring)
- Tutorial mode toggle with per-snippet hints
- Accuracy by vulnerability type in the report

## Tech Stack
- Frontend: React + Vite + TypeScript
- Backend: FastAPI (Python)
- LLM: Anthropic Claude
- Scanner: Hacktron CLI (WSL supported)
- TTS: ElevenLabs

## Project Structure
```
client/   # React UI
server/   # FastAPI backend
```

## Quick Start (Windows / PowerShell)
### 1) Backend
```
cd server
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend
```
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables
### Root `.env` (repo root)
```
ANTHROPIC_API_KEY=your_key
ANTHROPIC_MODEL=claude-sonnet-4-0
ANTHROPIC_VERSION=2023-06-01

ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=your_voice_id
ELEVENLABS_MODEL=eleven_multilingual_v2

CORS_ORIGINS=http://localhost:5173

# Hacktron (WSL)
HACKTRON_CMD=wsl
HACKTRON_ARGS=/home/ser/.local/bin/hacktron --format json {file}
```

### Frontend `.env` (client/.env)
```
VITE_API_URL=http://localhost:8000
```

## How It Works
1) Frontend calls `/generate` to get tasks from Claude.
2) Player marks snippets SAFE/VULNERABLE.
3) Frontend calls `/audit` with missed tasks.
4) Backend runs Hacktron on those snippets.
5) Claude summarizes the vulnerabilities + fixes.
6) ElevenLabs can generate voice summary.
7) Tutorial mode can reveal Claude-generated hints per snippet.
8) Report shows accuracy by vulnerability type.

## API Endpoints (Backend)
- `GET /health`
- `POST /generate`
- `POST /audit`
- `POST /tts`
- Session endpoints (optional flow):
  - `POST /session`
  - `GET /session/{id}/tasks`
  - `POST /session/{id}/submit`
  - `POST /session/{id}/finish`

## Troubleshooting
**/generate returns 503**
- Check Anthropic model name and API key.
- Ensure `.env` is loaded and uvicorn restarted.

**Hints are missing**
- Claude may not be returning `hints`; the UI falls back to static language tips.

**/tts returns 503**
- Check ElevenLabs API key.
- Verify `.env` is loaded (restart uvicorn).

**Hacktron errors on Windows**
- Use WSL and ensure the path is accessible from Linux.
- Test directly:
  ```
  wsl /home/ser/.local/bin/hacktron --help
  ```

## License
MIT (see LICENSE)
