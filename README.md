# ChromaUI

Monorepo with backend and frontend apps.

## Structure

- `backend/` - Python backend service (FastAPI).
- `frontend/` - Next.js frontend app.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/RandithaK/ChromaUI.git
cd ChromaUI
```

### 2. Backend

The backend is a FastAPI app. It supports both local AI (Ollama) and cloud AI (Gemini).

**Ollama (Local AI - Preferred)**
1. Install [Ollama](https://ollama.com/).
2. Pull the preferred model:
   ```bash
   ollama pull gemma3:4b
   ```
3. The backend will automatically try to use `gemma3:4b` if available. And fallback to any other available ollama model accoeind to the list.

_Note that you may use any other model depending on availability and system specifications in such an event you would need to alter the main.py file._


**Gemini (Cloud AI - Fallback)**
The backend requires a `GEMINI_API_KEY` if Ollama is unavailable or fails.

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file and add your Gemini API key
# (create the file manually and add: GEMINI_API_KEY=your_api_key_here)

# Run the backend server (http://localhost:8000)
python main.py
```

### 3. Frontend

The frontend is a Next.js app.

```bash
# From the project root
cd frontend

# Install dependencies
npm install

# Run the development server (http://localhost:3000)
npm run dev
```

> Make sure the backend is running before starting the frontend.

## .gitignore strategy

- Root `.gitignore` covers common workspace-wide files (`.env`, OS temp files, lock files, etc.).
- `backend/.gitignore` is for Python/venv/test artifacts.
- `frontend/.gitignore` is for Next.js/node artifacts.

This allows fine-grained ignores in each package while keeping global defaults centralized.
