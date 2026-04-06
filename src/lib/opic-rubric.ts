export type TargetLevel = "IL" | "IM" | "IH" | "AL" | "Communication";

export type OpicRubric = {
  label: string;
  shortLabel: string;
  coreDefinition: string;
  levelSummary: string;
  speakingExpectations: string[];
  positiveSignals: string[];
  weakSignals: string[];
  coachingFocus: string[];
  suggestedAnswerStyle: string;
  antiPatterns: string[];
  suggestionFallbacks: string[];
};

export const OPIC_RUBRIC: Record<TargetLevel, OpicRubric> = {
  Communication: {
    label: "Communication",
    shortLabel: "Communication",
    coreDefinition:
      "The speaker should communicate clearly, naturally, and in an easy-to-follow way, even if grammar and structure are not advanced.",
    levelSummary:
      "This mode prioritizes comprehensibility, clarity, and natural flow over formal level ambition.",
    speakingExpectations: [
      "Express ideas in a simple, listener-friendly way.",
      "Help the listener follow the answer without guessing.",
      "Use manageable sentence structures instead of overly complex wording.",
      "Stay natural and communicative rather than memorized or theatrical.",
    ],
    positiveSignals: [
      "Clear meaning from start to finish.",
      "Easy-to-follow sentence flow.",
      "Natural spoken phrasing.",
      "Simple transitions that guide the listener.",
      "Low listener effort to understand the message.",
    ],
    weakSignals: [
      "The listener must guess the intended meaning.",
      "Too many broken or incomplete ideas.",
      "Ideas are disconnected or hard to follow.",
      "Overly memorized-sounding language reduces naturalness.",
      "Unclear structure causes breakdown in meaning.",
    ],
    coachingFocus: [
      "clarity of message",
      "simple sentence control",
      "natural phrasing",
      "listener-friendly organization",
      "basic transitions",
    ],
    suggestedAnswerStyle:
      "Write 3-4 natural spoken sentences that are clear, simple, and easy to follow. Prioritize meaning over sophistication.",
    antiPatterns: [
      "Do not reward memorized-sounding or theatrical language.",
      "Do not force advanced grammar if it makes the answer less natural.",
      "Do not over-praise complexity when clarity is weak.",
    ],
    suggestionFallbacks: [
      "Keep your answer easy to follow with one clear idea at a time.",
      "Use simple transitions so your listener can track your meaning.",
      "Choose natural spoken wording instead of overly complex expressions.",
    ],
  },

  IL: {
    label: "OPIc IL Level",
    shortLabel: "IL",
    coreDefinition:
      "The speaker barely sustains sentence-level speech and must work to stay above isolated words or short fragments.",
    levelSummary:
      "IL means the speaker meets the minimum intermediate threshold but still struggles to hold sentence-level performance steadily.",
    speakingExpectations: [
      "Produce simple complete sentences rather than isolated words.",
      "Express one idea at a time with basic sentence control.",
      "Stay at sentence level without dropping into fragment-heavy speech.",
      "Handle simple social or personal topics in very manageable language.",
    ],
    positiveSignals: [
      "Can produce short complete sentences.",
      "Avoids collapsing into word lists.",
      "Shows basic sentence-level control.",
      "Communicates simple meaning without complete breakdown.",
    ],
    weakSignals: [
      "Frequent fragments instead of full sentences.",
      "Speech drops toward novice-like word listing.",
      "Very limited sentence continuation.",
      "Ideas are too short to sustain communication.",
    ],
    coachingFocus: [
      "complete sentences",
      "one idea per sentence",
      "basic sentence stability",
      "simple connectors",
      "clear meaning",
    ],
    suggestedAnswerStyle:
      "Write 2-4 short complete sentences in simple spoken English. Keep each sentence manageable and clear.",
    antiPatterns: [
      "Do not require paragraph-like structure.",
      "Do not force sophisticated storytelling.",
      "Do not use advanced vocabulary if it sounds unnatural for the target.",
    ],
    suggestionFallbacks: [
      "Use complete short sentences instead of fragments.",
      "Keep one clear idea in each sentence.",
      "Add simple connectors like and, but, or because to link ideas.",
    ],
  },

  IM: {
    label: "OPIc IM Level",
    shortLabel: "IM",
    coreDefinition:
      "The speaker consistently produces sentence-level responses with enough language to express ideas and support them with simple detail.",
    levelSummary:
      "IM means stable sentence-level speaking, more language output, and occasional signs of higher-level ability.",
    speakingExpectations: [
      "Sustain sentence-level speaking consistently across the response.",
      "Give reasons, examples, or supporting detail.",
      "Handle familiar social and personal situations with enough language.",
      "Show some emerging signs of more developed speaking without needing full advanced control.",
    ],
    positiveSignals: [
      "Consistent sentence-level output.",
      "Ideas are supported with reasons or examples.",
      "The response does not collapse quickly.",
      "There are occasional advanced-like moments.",
      "The speaker can keep speaking with moderate stability.",
    ],
    weakSignals: [
      "Ideas remain too short or bare.",
      "Support and detail are missing.",
      "Sentence control is unstable.",
      "The response feels underdeveloped for the amount of time available.",
    ],
    coachingFocus: [
      "sentence expansion",
      "supporting details",
      "reasons and examples",
      "better linking",
      "response development",
    ],
    suggestedAnswerStyle:
      "Write 3-5 sentence-level spoken sentences with one or two supporting details. Keep the answer natural and moderately developed.",
    antiPatterns: [
      "Do not require full paragraph-length organization.",
      "Do not overcomplicate the grammar if sentence-level control is the main goal.",
      "Do not make the answer sound memorized or essay-like.",
    ],
    suggestionFallbacks: [
      "Add one reason or detail after each main idea.",
      "Expand your answer so it does not stay too short.",
      "Use linking words to connect your sentences more smoothly.",
    ],
  },

  IH: {
    label: "OPIc IH Level",
    shortLabel: "IH",
    coreDefinition:
      "The speaker often reaches advanced-like narration and description but cannot sustain that level with full consistency.",
    levelSummary:
      "IH means confident intermediate performance with frequent advanced-like moments, but not stable enough to fully remain at advanced level.",
    speakingExpectations: [
      "Show emerging advanced functions such as narration and richer description.",
      "Use time references more clearly across past, present, or future when needed.",
      "Connect ideas with more continuity and confidence.",
      "Demonstrate more than sentence-level speaking, even if not sustained throughout.",
    ],
    positiveSignals: [
      "Frequent advanced-like moments.",
      "Some narration or more detailed description.",
      "Ideas connect with more continuity.",
      "Time reference is sometimes handled well.",
      "The response feels more confident and fuller than IM.",
    ],
    weakSignals: [
      "Advanced-like performance cannot be maintained.",
      "The answer repeatedly falls back to simpler isolated sentence patterns.",
      "Narration or time handling breaks down.",
      "The response shows ambition but not enough stability.",
    ],
    coachingFocus: [
      "narration",
      "description",
      "time control",
      "connected flow",
      "richer support",
    ],
    suggestedAnswerStyle:
      "Write 4-6 connected spoken sentences with emerging narration or richer description. Make it feel stronger than sentence-by-sentence speaking, but still natural.",
    antiPatterns: [
      "Do not assume stable advanced performance throughout.",
      "Do not produce polished essay-like paragraphs that sound memorized.",
      "Do not force complexity if continuity becomes weak.",
    ],
    suggestionFallbacks: [
      "Connect your ideas more smoothly so the answer feels more continuous.",
      "Use clearer time references when describing experiences.",
      "Add richer description so your answer sounds more developed and confident.",
    ],
  },

  AL: {
    label: "OPIc AL Level",
    shortLabel: "AL",
    coreDefinition:
      "The speaker can produce short paragraph-like speech, narrate and describe across major time frames, but may still struggle to sustain this performance smoothly.",
    levelSummary:
      "AL marks the shift from sentence-level speaking to short paragraph-length discourse, though the speaker may still sound effortful at times.",
    speakingExpectations: [
      "Produce short paragraph-like responses rather than isolated sentence strings.",
      "Narrate and describe with at least basic control of major time frames.",
      "Develop ideas in a more organized and sustained way.",
      "Handle somewhat more complex situations, even if not perfectly smoothly.",
    ],
    positiveSignals: [
      "Short paragraph-like flow is present.",
      "Narration or description develops over several connected sentences.",
      "Time frames are clearer and more controlled.",
      "The answer shows development, sequence, and support.",
      "The speaker can deal with complication better than at lower levels.",
    ],
    weakSignals: [
      "The listener still has to work hard to follow the message.",
      "Paragraph flow breaks down into disconnected sentences.",
      "Time reference becomes unclear or unstable.",
      "The speaker reaches for advanced structure but cannot maintain control well.",
    ],
    coachingFocus: [
      "paragraph development",
      "clear sequencing",
      "time frames",
      "listener-friendly organization",
      "more precise support",
    ],
    suggestedAnswerStyle:
      "Write a short paragraph-like spoken answer with clear development, sequencing, and time control. It should sound natural, not over-scripted.",
    antiPatterns: [
      "Do not reward unnatural memorized complexity.",
      "Do not produce overly polished textbook-like writing.",
      "Do not ignore listener effort; clarity still matters.",
    ],
    suggestionFallbacks: [
      "Develop your answer like a short paragraph, not just separate sentences.",
      "Use sequence markers so your ideas progress clearly.",
      "Keep your time references clear when describing experiences or events.",
    ],
  },
};

export const SUGGESTED_ANSWER_RULES: Record<TargetLevel, string> = {
  Communication:
    "Keep the answer simple, clear, natural, and easy to follow in 3-4 spoken sentences.",
  IL:
    "Write 2-4 short complete sentences. Keep grammar simple and meaning clear.",
  IM:
    "Write 3-5 sentence-level spoken sentences with one or two supporting details.",
  IH:
    "Write 4-6 connected spoken sentences with emerging narration or richer description.",
  AL:
    "Write a short paragraph-like spoken answer with clear development and better time control.",
};

export function getOpicRubric(target: TargetLevel): OpicRubric {
  return OPIC_RUBRIC[target];
}

export function normalizeImprovementPoints(
  target: TargetLevel,
  points: string[] | undefined | null
): string[] {
  const cleaned =
    points?.filter((p): p is string => typeof p === "string" && !!p.trim()).map((p) => p.trim()) ??
    [];

  if (cleaned.length >= 3) return cleaned.slice(0, 3);

  const fallbacks = OPIC_RUBRIC[target].suggestionFallbacks;
  return [...cleaned, ...fallbacks].slice(0, 3);
}

export function buildRubricPromptBlock(target: TargetLevel): string {
  const rubric = OPIC_RUBRIC[target];

  return `
Target level:
${rubric.label}

Core definition:
${rubric.coreDefinition}

Level summary:
${rubric.levelSummary}

What this level is expected to do:
${rubric.speakingExpectations.map((x) => `- ${x}`).join("\n")}

Positive signals for this level:
${rubric.positiveSignals.map((x) => `- ${x}`).join("\n")}

Weak signals / risks for this level:
${rubric.weakSignals.map((x) => `- ${x}`).join("\n")}

Coaching focus:
${rubric.coachingFocus.map((x) => `- ${x}`).join("\n")}

Suggested answer style:
${rubric.suggestedAnswerStyle}

Avoid these patterns:
${rubric.antiPatterns.map((x) => `- ${x}`).join("\n")}
`.trim();
}