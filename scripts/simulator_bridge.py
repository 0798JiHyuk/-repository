import json
import sys
import base64

try:
    from simulator_test_2 import VoicePhishingSimulator
except Exception as e:
    VoicePhishingSimulator = None
    _import_error = str(e)

simulators = {}


def write_response(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def ensure_simulator(session_id, user_profile_json):
    if VoicePhishingSimulator is None:
        raise RuntimeError(f"Failed to import simulator_test_2.py: {_import_error}")
    if session_id not in simulators:
        simulators[session_id] = VoicePhishingSimulator(user_profile_json)
    return simulators[session_id]


def handle_init(req):
    session_id = req.get("sessionId")
    user_profile = req.get("userProfile")
    if session_id is None or user_profile is None:
        raise ValueError("sessionId and userProfile are required for init")
    ensure_simulator(session_id, user_profile)
    return {"ok": True}


def handle_chat(req):
    session_id = req.get("sessionId")
    user_input = req.get("userInput")
    user_profile = req.get("userProfile")
    if session_id is None or user_input is None:
        raise ValueError("sessionId and userInput are required for chat")
    sim = ensure_simulator(session_id, user_profile or '{"user_profile": {"name": "사용자", "scenario_type": "default"}}')
    response_text, status, audio_bytes = sim.chat_turn(user_input)
    audio_b64 = None
    if audio_bytes is not None:
        try:
            audio_b64 = base64.b64encode(audio_bytes.getvalue()).decode("ascii")
        except Exception:
            try:
                audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
            except Exception:
                audio_b64 = None
    return {
        "ok": True,
        "responseText": response_text,
        "status": status,
        "audioBase64": audio_b64,
    }


for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        req = json.loads(line)
        req_id = req.get("id")
        action = req.get("action")
        if action == "init":
            data = handle_init(req)
        elif action == "chat":
            data = handle_chat(req)
        else:
            raise ValueError("Unknown action")
        data["id"] = req_id
        write_response(data)
    except Exception as e:
        write_response({"id": req.get("id") if "req" in locals() else None, "ok": False, "error": str(e)})
