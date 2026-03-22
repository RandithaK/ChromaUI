# ChromaUI

Monorepo with backend and frontend apps.

## Structure

- `backend/` - Python backend service.
- `frontend/` - Next.js frontend app.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/RandithaK/ChromaUI.git
cd ChromaUI
```

### 2. Backend

The backend is a FastAPI app. It requires a `GEMINI_API_KEY` to connect to the Gemini AI service.

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
