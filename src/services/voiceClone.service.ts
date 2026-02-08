const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

function getKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Missing ELEVENLABS_API_KEY");
  return key;
}

export async function cloneVoiceAndTts(input: {
  audioBuffer: Buffer;
  filename: string;
  mimeType: string;
  text: string;
}) {
  const apiKey = getKey();

  // 1) Add voice
  const addForm = new FormData();
  addForm.append("name", `clone-${Date.now()}`);
  addForm.append("files", new Blob([input.audioBuffer], { type: input.mimeType }), input.filename);

  const addRes = await fetch(`${ELEVEN_BASE}/voices/add`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: addForm,
  });

  if (!addRes.ok) {
    const errText = await addRes.text();
    throw new Error(`ElevenLabs voice add failed: ${errText}`);
  }

  const addJson: any = await addRes.json();
  const voiceId = addJson.voice_id;
  if (!voiceId) throw new Error("ElevenLabs voice add returned no voice_id");

  let audioBase64: string | null = null;
  try {
    // 2) TTS with cloned voice
    const ttsRes = await fetch(`${ELEVEN_BASE}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: input.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.5,
        },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      throw new Error(`ElevenLabs TTS failed: ${errText}`);
    }

    const arrayBuf = await ttsRes.arrayBuffer();
    audioBase64 = Buffer.from(arrayBuf).toString("base64");
  } finally {
    // 3) Best-effort delete voice to avoid slot usage
    try {
      await fetch(`${ELEVEN_BASE}/voices/${voiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey },
      });
    } catch {
      // ignore
    }
  }

  return { audioBase64, voiceId };
}
