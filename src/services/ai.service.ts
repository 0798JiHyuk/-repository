import { simulatorChatTurn } from "./simulator.service";

export async function aiGenerateLongformReply(input: {
  sessionId: number;
  turnNo: number;
  userText: string | null;
  userAudioUrl: string | null;
  userProfileJson?: string;
}) {
  const enabled = process.env.SIMULATOR_ENABLED === "true";
  if (enabled && input.userText) {
    const sim = await simulatorChatTurn({
      sessionId: input.sessionId,
      userInput: input.userText,
      userProfileJson: input.userProfileJson,
    });
    return {
      aiText: sim.responseText,
      aiAudioUrl: null as string | null,
      aiAudioBase64: sim.audioBase64,
      status: sim.status,
      flags: [],
    };
  }

  return {
    aiText:
      "Seoul Prosecutors Office. There is an issue with your account. Please confirm your identity.",
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
