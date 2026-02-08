import { simulatorChatTurn } from "./simulator.service";

function removeSurrogates(str: string) {
  return str.replace(/[\uD800-\uDFFF]/g, "");
}

function sanitizeUtf8(str: string) {
  return Buffer.from(str, "utf8").toString("utf8");
}

function sanitizeText(str: string) {
  return removeSurrogates(sanitizeUtf8(str));
}

export async function aiGenerateLongformReply(input: {
  sessionId: number;
  turnNo: number;
  userText: string | null;
  userAudioUrl: string | null;
  userProfileJson?: string;
}) {
  const enabled = process.env.SIMULATOR_ENABLED === "true";
  if (enabled && input.userText) {
    try {
      const sim = await simulatorChatTurn({
        sessionId: input.sessionId,
        userInput: input.userText,
        userProfileJson: input.userProfileJson,
      });
      const safeText = sanitizeText(sim.responseText || "");
      if (!safeText) {
        return {
          aiText: "AI 응답 생성 중 오류가 발생했습니다.",
          aiAudioUrl: null as string | null,
          aiAudioBase64: null as string | null,
          status: "error",
          errorCode: "AI_TEXT_EMPTY_AFTER_SANITIZE",
          flags: [],
        };
      }
      return {
        aiText: safeText,
        aiAudioUrl: null as string | null,
        aiAudioBase64: sim.audioBase64,
        status: sim.status,
        flags: [],
      };
    } catch (_err) {
      return {
        aiText: "AI 응답 생성 중 오류가 발생했습니다.",
        aiAudioUrl: null as string | null,
        aiAudioBase64: null as string | null,
        status: "error",
        errorCode: "AI_SIMULATOR_ERROR",
        flags: [],
      };
    }
  }

  const fallbackText = sanitizeText(
    "Seoul Prosecutors Office. There is an issue with your account. Please confirm your identity."
  );
  return {
    aiText: fallbackText || "AI 응답 생성 중 오류가 발생했습니다.",
    aiAudioUrl: "https://example.com/ai.mp3",
    aiAudioBase64: null as string | null,
    status: "ongoing",
    flags: [
      { flagType: "impersonation", keyword: "Seoul Prosecutors", severity: 3 },
      { flagType: "personal_info_request", keyword: "confirm your identity", severity: 4 },
    ],
  };
}

export async function aiScoreLongformSession(_input: { sessionId: number }) {
  return {
    score: 65,
    analysisData: { panicScore: 0.7, complianceRisk: 0.5 },
    aiSummary: "User was initially flustered but recovered with questions.",
    aiCoaching: "Prepare a short script for impersonation calls.",
    goodPoints: ["Tried to verify the caller's identity"],
    improvementPoints: ["Attempted to share personal info", "Delayed hang up"],
  };
}
