# ChromaUI

Monorepo with backend and frontend apps.

## Structure

- `backend/` - Python backend service.
- `frontend/` - Next.js frontend app.

## .gitignore strategy

- Root `.gitignore` covers common workspace-wide files (`.env`, OS temp files, lock files, etc.).
- `backend/.gitignore` is for Python/venv/test artifacts.
- `frontend/.gitignore` is for Next.js/node artifacts.

This allows fine-grained ignores in each package while keeping global defaults centralized.
