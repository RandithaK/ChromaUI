import os
import asyncio
import json
from typing import List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ruamel.yaml import YAML
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_NAME = 'gemini-flash-lite-latest'

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

TEMPLATES_DIR = Path("templates")

def read_template(template_name: str) -> Dict[str, Any]:
    file_path = TEMPLATES_DIR / template_name
    with open(file_path, "r") as f:
        return yaml.load(f)

def write_template(template_name: str, config: Dict[str, Any]):
    file_path = TEMPLATES_DIR / template_name
    with open(file_path, "w") as f:
        yaml.dump(config, f)

def update_nested_dict(d: dict, path: str, value: any):
    keys = path.split('.')
    for key in keys[:-1]:
        if key not in d:
            d[key] = {}
        d = d[key]
    d[keys[-1]] = value

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.active_template: str = "login.yml"

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send initial state sync
        config = read_template(self.active_template)
        await self.send_state_sync(websocket, config)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in self.active_connections:
            await connection.send_json(message)

    async def send_state_sync(self, websocket: WebSocket, config: Dict[str, Any]):
        await websocket.send_json({
            "type": "STATE_SYNC",
            "activeTemplate": self.active_template,
            "config": config
        })

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

async def process_ai_prompt(prompt: str, config_dict: dict) -> List[Dict[str, Any]]:
    """Use Gemini to generate config mutations (path/value pairs) based on user prompt.

    Returns a list of mutations to preserve YAML comments.
    Example: [{"path": "colors.primary.main", "value": "#ff0000"}]
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
Respond with a JSON array of mutations (path/value pairs) that should be applied.

Example format:
[
  {{"path": "colors.primary.main", "value": "#3b82f6"}},
  {{"path": "theme.mode", "value": "dark"}}
]

IMPORTANT:
- Only include fields that need to change
- Use dot notation for nested paths (e.g., "colors.primary.main")
- Respond with ONLY the JSON array, no explanations or markdown formatting"""

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
        mutations = json.loads(response_text)

        # Validate that it's a list of mutations
        if isinstance(mutations, list):
            for mutation in mutations:
                if not isinstance(mutation, dict) or "path" not in mutation or "value" not in mutation:
                    print(f"Invalid mutation format: {mutation}")
                    return []
            return mutations

        # If invalid, return empty list (no changes)
        return []
    except Exception as e:
        print(f"AI edit error: {e}")
        print(f"Response was: {response.text if 'response' in locals() else 'No response'}")
        return []

@app.websocket("/ws/editor")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "HUMAN_MUTATION":
                path = data["path"]
                value = data["value"]

                # Read current
                config = read_template(manager.active_template)
                # Update
                update_nested_dict(config, path, value)
                # Save
                write_template(manager.active_template, config)
                # Broadcast
                await manager.broadcast({
                    "type": "STATE_SYNC",
                    "activeTemplate": manager.active_template,
                    "config": config
                })

            elif data["type"] == "AI_PROMPT":
                prompt = data["prompt"]

                # Lock UI
                await manager.broadcast({"type": "UI_LOCK"})

                # Determine if we should switch templates
                new_template = await determine_intent(prompt, manager.active_template)

                # Load current or new template config
                manager.active_template = new_template
                config = read_template(manager.active_template)

                # Get AI-generated mutations
                mutations = await process_ai_prompt(prompt, config)

                # Apply each mutation to preserve YAML structure and comments
                for mutation in mutations:
                    update_nested_dict(config, mutation["path"], mutation["value"])

                # Save changes (comments preserved!)
                write_template(manager.active_template, config)

                # Broadcast new state
                await manager.broadcast({
                    "type": "STATE_SYNC",
                    "activeTemplate": manager.active_template,
                    "config": config
                })

                # Unlock UI
                await manager.broadcast({"type": "UI_UNLOCK"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
