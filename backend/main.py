import os
import json
import secrets
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Any, Tuple

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from ruamel.yaml import YAML

# Load environment variables
load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_NAME = "gemini-flash-lite-latest"

app = FastAPI()

# Add CORS middleware to allow the frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

yaml = YAML()
yaml.preserve_quotes = True
yaml.indent(mapping=2, sequence=4, offset=2)

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
GENERATED_TEMPLATES_DIR = BASE_DIR / "generated_templates"
GENERATED_TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

# Keep filename aliases short and stable.
TEMPLATE_ALIASES = {
    "login": "login",
    "register": "reg",
}


def read_yaml(file_path: Path) -> Dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as f:
        return yaml.load(f) or {}


def write_yaml(file_path: Path, config: Dict[str, Any]):
    with open(file_path, "w", encoding="utf-8") as f:
        yaml.dump(config, f)


def read_template(template_name: str) -> Dict[str, Any]:
    return read_yaml(TEMPLATES_DIR / template_name)


def template_alias(template_name: str) -> str:
    stem = Path(template_name).stem.lower()
    return TEMPLATE_ALIASES.get(stem, stem)


def snapshot_file_name(session_id: str, template_name: str, version: int) -> str:
    return f"{session_id}-{template_alias(template_name)}-v{version}.yml"


def list_template_snapshots(session_id: str, template_name: str) -> List[Tuple[int, Path]]:
    alias = template_alias(template_name)
    pattern = f"{session_id}-{alias}-v*.yml"
    prefix = f"{session_id}-{alias}-v"

    snapshots: List[Tuple[int, Path]] = []
    for file_path in GENERATED_TEMPLATES_DIR.glob(pattern):
        if not file_path.name.endswith(".yml"):
            continue

        version_text = file_path.stem[len(prefix):]
        if version_text.isdigit():
            snapshots.append((int(version_text), file_path))

    snapshots.sort(key=lambda item: item[0])
    return snapshots


def read_latest_session_config(session_id: str, template_name: str) -> Tuple[Dict[str, Any], int, Path]:
    snapshots = list_template_snapshots(session_id, template_name)
    if snapshots:
        latest_version, latest_path = snapshots[-1]
        return read_yaml(latest_path), latest_version, latest_path

    # Version 0 always comes from immutable defaults in templates/.
    default_path = TEMPLATES_DIR / template_name
    return read_template(template_name), 0, default_path


def write_next_snapshot(session_id: str, template_name: str, config: Dict[str, Any]) -> Tuple[int, Path]:
    snapshots = list_template_snapshots(session_id, template_name)
    current_version = snapshots[-1][0] if snapshots else 0
    next_version = current_version + 1
    next_path = GENERATED_TEMPLATES_DIR / snapshot_file_name(session_id, template_name, next_version)
    write_yaml(next_path, config)
    return next_version, next_path


def generate_uuid7() -> str:
    # UUIDv7 layout: 48-bit unix_ts_ms + version/variant bits + randomness.
    unix_ts_ms = int(time.time() * 1000)
    rand_a = secrets.randbits(12)
    rand_b = secrets.randbits(62)

    value = 0
    value |= (unix_ts_ms & ((1 << 48) - 1)) << 80
    value |= 0x7 << 76
    value |= rand_a << 64
    value |= 0b10 << 62
    value |= rand_b

    return str(uuid.UUID(int=value))


def update_nested_dict(d: dict, path: str, value: Any):
    keys = path.split(".")
    for key in keys[:-1]:
        if key not in d:
            d[key] = {}
        d = d[key]
    d[keys[-1]] = value


@dataclass
class SessionState:
    browser_session_id: str
    session_id: str
    active_template: str = "login.yml"


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_sessions: Dict[WebSocket, SessionState] = {}
        self.browser_sessions: Dict[str, SessionState] = {}

    async def connect(self, websocket: WebSocket, browser_session_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)

        session = self.browser_sessions.get(browser_session_id)
        if session is None:
            session = SessionState(
                browser_session_id=browser_session_id,
                session_id=generate_uuid7(),
            )
            self.browser_sessions[browser_session_id] = session

        self.connection_sessions[websocket] = session

        config, version, source_file = read_latest_session_config(
            session.session_id,
            session.active_template,
        )
        await self.send_state_sync(websocket, session, config, version, source_file)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self.connection_sessions.pop(websocket, None)

    def get_session(self, websocket: WebSocket) -> SessionState:
        return self.connection_sessions[websocket]

    async def send_state_sync(
        self,
        websocket: WebSocket,
        session: SessionState,
        config: Dict[str, Any],
        version: int,
        source_file: Path,
    ):
        await websocket.send_json(
            {
                "type": "STATE_SYNC",
                "activeTemplate": session.active_template,
                "sessionId": session.session_id,
                "version": version,
                "sourceFile": source_file.name,
                "config": config,
            }
        )


manager = ConnectionManager()


async def determine_intent(prompt: str, current_template: str) -> str:
    """Use Gemini to determine which template to use based on user prompt."""

    intent_prompt = f"""You are a template router for a UI builder application.

Current active template: {current_template}

Available templates:
- login.yml: Use for login, sign-in, authentication screens
- register.yml: Use for registration, sign-up, account creation screens

User request: "{prompt}"

Based on the user's request, determine which template should be active.
Only switch templates if the user explicitly wants to work on a different screen type.
If the request is just about styling/colors/modifications, keep the current template.

Respond with ONLY the template filename (login.yml or register.yml), nothing else."""

    try:
        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=intent_prompt,
        )
        template = response.text.strip()

        # Validate response
        if template in ["login.yml", "register.yml"]:
            return template

        # If invalid response, keep current
        return current_template
    except Exception as e:
        print(f"Intent detection error: {e}")
        return current_template


async def process_ai_prompt(prompt: str, config_dict: dict) -> tuple[List[Dict[str, Any]], str]:
    """Use Gemini to generate config mutations (path/value pairs) based on user prompt.

    Returns a tuple of (mutations, response_message):
    - mutations: list of changes to apply
    - response_message: AI's text explanation of what it did
    Example: ([{"path": "colors.primary.main", "value": "#ff0000"}], "I've changed the primary color to red!")
    """

    current_config_json = json.dumps(config_dict, indent=2)

    edit_prompt = f"""You are a UI configuration editor for ChromaUI.

Current configuration:
```json
{current_config_json}
```

User request: "{prompt}"

Available configuration options:
- theme.mode: "dark" or "light"
- colors.primary.main: hex color (e.g., "#6366f1")
- colors.primary.light: hex color
- colors.primary.dark: hex color
- colors.primary.contrastText: hex color (usually "#ffffff" or "#000000")
- components.authForm.allowPasskey: boolean (login template only)
- components.authForm.requireTermsAcceptance: boolean (register template only)
- components.authForm.providers: array of strings (e.g., ["google", "github", "email"])

Analyze the user's request and determine what needs to change.
Respond with a JSON object containing:
1. "mutations": array of mutation objects (path/value pairs) that should be applied
2. "message": a friendly text response explaining what you did (1-2 sentences)

Example format:
{{
  "mutations": [
    {{"path": "colors.primary.main", "value": "#3b82f6"}},
    {{"path": "theme.mode", "value": "dark"}}
  ],
  "message": "I've changed the primary color to blue and switched to dark mode!"
}}

IMPORTANT:
- Only include fields that need to change in mutations
- Use dot notation for nested paths (e.g., "colors.primary.main")
- The message should be conversational and friendly
- Respond with ONLY the JSON object, no explanations or markdown formatting"""

    try:
        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=edit_prompt,
        )
        response_text = response.text.strip()

        # Clean markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first line (```json or ```) and last line (```)
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text

        # Parse the JSON response
        result = json.loads(response_text)

        # Validate that it has mutations and message
        if isinstance(result, dict) and "mutations" in result and "message" in result:
            mutations = result["mutations"]
            message = result["message"]

            # Validate mutations format
            if isinstance(mutations, list):
                for mutation in mutations:
                    if not isinstance(mutation, dict) or "path" not in mutation or "value" not in mutation:
                        print(f"Invalid mutation format: {mutation}")
                        return ([], "Sorry, I encountered an error processing your request.")
                return (mutations, message)

        # If invalid, return empty list with error message
        return ([], "Sorry, I couldn't understand how to make those changes.")
    except Exception as e:
        print(f"AI edit error: {e}")
        print(f"Response was: {response.text if 'response' in locals() else 'No response'}")
        return ([], f"Sorry, I encountered an error: {str(e)}")


@app.websocket("/ws/editor")
async def websocket_endpoint(websocket: WebSocket):
    browser_session_id = websocket.query_params.get("browserSessionId") or str(uuid.uuid4())
    await manager.connect(websocket, browser_session_id)
    try:
        while True:
            data = await websocket.receive_json()
            session = manager.get_session(websocket)
            message_type = data.get("type")

            if message_type == "HUMAN_MUTATION":
                path = data["path"]
                value = data["value"]

                # Read current session config
                config, _, _ = read_latest_session_config(session.session_id, session.active_template)
                # Update
                update_nested_dict(config, path, value)
                # Save immutable snapshot
                version, snapshot_path = write_next_snapshot(session.session_id, session.active_template, config)
                # Sync back only to this browser session
                await manager.send_state_sync(websocket, session, config, version, snapshot_path)

            elif message_type == "AI_PROMPT":
                prompt = data["prompt"]

                # Lock this browser session's UI
                await websocket.send_json({"type": "UI_LOCK"})
                try:
                    # Determine if we should switch templates
                    new_template = await determine_intent(prompt, session.active_template)
                    template_switched = new_template != session.active_template

                    # Load current or new template config
                    session.active_template = new_template
                    config, _, _ = read_latest_session_config(session.session_id, session.active_template)

                    # Get AI-generated mutations and response message
                    mutations, ai_message = await process_ai_prompt(prompt, config)

                    # If template was switched, prepend that info to the message
                    if template_switched:
                        template_name = new_template.replace(".yml", "").capitalize()
                        ai_message = f"Switched to {template_name} template. {ai_message}"

                    # Apply each mutation to preserve YAML structure and comments
                    for mutation in mutations:
                        update_nested_dict(config, mutation["path"], mutation["value"])

                    # Save immutable snapshot (comments preserved)
                    version, snapshot_path = write_next_snapshot(
                        session.session_id,
                        session.active_template,
                        config,
                    )

                    # Send new state for this browser session
                    await manager.send_state_sync(websocket, session, config, version, snapshot_path)

                    # Send AI text response
                    await websocket.send_json(
                        {
                            "type": "AI_RESPONSE",
                            "message": ai_message,
                        }
                    )
                finally:
                    # Unlock even if AI processing fails
                    await websocket.send_json({"type": "UI_UNLOCK"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
