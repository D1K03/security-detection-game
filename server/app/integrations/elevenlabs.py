"""
ElevenLabs Text-to-Speech Integration
"""
import os
import base64
import httpx
from typing import Optional


ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

# Voice IDs mapping (using ElevenLabs preset voices)
VOICE_IDS = {
    "ship_computer": "EXAVITQu4vr4xnSDxMaL",  # Sarah - clear, professional
    "default": "EXAVITQu4vr4xnSDxMaL",
}


def generate_speech(text: str, voice_id: Optional[str] = None) -> tuple[str, float]:
    """
    Generate speech using ElevenLabs API.

    Args:
        text: The text to convert to speech
        voice_id: Optional voice ID or preset name (e.g., "ship_computer")

    Returns:
        tuple: (base64_encoded_audio, duration_seconds)

    Raises:
        RuntimeError: If API key is not configured or request fails
    """
    if not ELEVENLABS_API_KEY:
        raise RuntimeError("ELEVENLABS_API_KEY not configured in environment")

    # Map voice presets to actual voice IDs
    actual_voice_id = VOICE_IDS.get(voice_id or "default", VOICE_IDS["default"])

    url = f"{ELEVENLABS_API_URL}/text-to-speech/{actual_voice_id}"

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }

    data = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=data, headers=headers)
            response.raise_for_status()

            # Get audio data
            audio_data = response.content

            # Encode to base64 for transmission
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')

            # Create data URL for audio
            audio_url = f"data:audio/mpeg;base64,{audio_base64}"

            # Estimate duration (rough calculation based on text length)
            # Average speaking rate is ~150 words per minute
            word_count = len(text.split())
            duration = (word_count / 150) * 60

            return audio_url, duration

    except httpx.HTTPStatusError as exc:
        raise RuntimeError(f"ElevenLabs API error: {exc.response.status_code} - {exc.response.text}") from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"Failed to connect to ElevenLabs API: {str(exc)}") from exc
    except Exception as exc:
        raise RuntimeError(f"Unexpected error generating speech: {str(exc)}") from exc
