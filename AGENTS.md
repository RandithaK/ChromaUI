<!-- BEGIN:workspace-agent-rules -->
# ChromaUI Project Brief

ChromaUI is a monorepo with a Python backend and a Next.js frontend. The backend in `backend/` serves FastAPI-based APIs and uses **local Ollama models** (preferring `gemma3:12b`) for inference, falling back to the cloud **Gemini API** via `GEMINI_API_KEY` if local services are unavailable.

The frontend in `frontend/` is the user-facing app, with editor and preview flows built on a Next.js app router structure.

Work should stay scoped to the relevant package unless a change crosses the backend/frontend boundary. Read the package-level guidance in `frontend/AGENTS.md` before editing frontend code, and follow the repository `README.md` for setup and run commands.

When making changes, prefer small, focused edits that preserve the existing architecture and avoid duplicating content already documented in `README.md`.
<!-- END:workspace-agent-rules -->