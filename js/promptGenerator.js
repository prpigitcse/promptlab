export const CUSTOM_FORMAT_OPTION = "__custom__";

export function cleanValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\r\n/g, "\n").trim();
}

export function hasValue(value) {
  return cleanValue(value).length > 0;
}

export function resolveSelectedFormat(data) {
  if (cleanValue(data.format) === CUSTOM_FORMAT_OPTION) {
    return cleanValue(data.customFormat);
  }
  return cleanValue(data.format);
}

export function normalizePromptData(data) {
  const normalized = {};
  Object.keys(data).forEach((key) => {
    normalized[key] = cleanValue(data[key]);
  });
  normalized.type = cleanValue(normalized.type);
  normalized.format = resolveSelectedFormat(normalized);
  return normalized;
}

export function buildPromptSummary(data) {
  const parts = [];
  if (hasValue(data.type)) parts.push(`Strategy: ${data.type}`);
  if (hasValue(data.role)) parts.push(`Role: ${data.role}`);
  if (hasValue(data.format)) parts.push(`Format: ${data.format}`);

  return parts.join(" | ") || "Custom prompt";
}

function getStrategyInstruction(data) {
  switch (data.type) {
    case "Zero-Shot":
      return "Handle the request directly from the provided instructions without relying on reference examples unless they are explicitly included below.";
    case "Few-Shot":
      return hasValue(data.examples)
        ? "Use the reference examples below as the quality and structure baseline. Adapt them to the new input instead of copying them literally."
        : "When examples are provided, use them as the preferred pattern for structure, tone, and depth.";
    case "Chain-of-Thought":
      return "Work through the request carefully before answering, then present a clear final response. Keep intermediate reasoning focused and only expose it if the user explicitly asks for it.";
    case "Persona":
      return "Stay consistent with the requested role, judgment, and communication style throughout the response.";
    case "Tool-Using":
      return hasValue(data.tools)
        ? "Plan the work briefly, use the available tools when they improve accuracy, and ground the final answer in the tool results."
        : "Plan the work briefly and use tools when they improve accuracy or completeness.";
    case "Critique & Revise":
      return "Produce a strong first draft, check it against the success criteria and constraints, then refine it before returning the final answer.";
    default:
      return "";
  }
}

export function buildPromptString(data) {
  const sections = [];
  const outputRequirements = [];
  const strategyInstruction = getStrategyInstruction(data);

  if (hasValue(data.role)) sections.push(`## ROLE\nYou are acting as ${data.role}.`);
  if (hasValue(data.audience)) sections.push(`## TARGET AUDIENCE\n${data.audience}`);
  if (hasValue(data.context)) sections.push(`## BACKGROUND CONTEXT\n${data.context}`);
  
  sections.push(`## PRIMARY TASK\n${data.task}`);
  
  if (hasValue(strategyInstruction)) sections.push(`## PROMPTING STRATEGY\n${strategyInstruction}`);
  if (hasValue(data.variables)) sections.push(`## INPUT VARIABLES\nUse these placeholders when relevant: ${data.variables}`);
  if (hasValue(data.reasoning)) sections.push(`## APPROACH\n${data.reasoning}`);
  if (hasValue(data.examples)) sections.push(`## REFERENCE EXAMPLES\n${data.examples}`);
  if (hasValue(data.mustInclude)) sections.push(`## MUST INCLUDE\n${data.mustInclude}`);
  if (hasValue(data.avoid)) sections.push(`## AVOID\n${data.avoid}`);
  if (hasValue(data.constraints)) sections.push(`## CONSTRAINTS\n${data.constraints}`);
  if (hasValue(data.rules)) sections.push(`## RULES\n${data.rules}`);
  if (hasValue(data.criteria)) sections.push(`## SUCCESS CRITERIA\n${data.criteria}`);
  if (hasValue(data.errorPolicy)) sections.push(`## WHEN INFORMATION IS MISSING\n${data.errorPolicy}`);
  if (hasValue(data.tone)) outputRequirements.push(`- Tone and style: ${data.tone}`);
  if (hasValue(data.format)) outputRequirements.push(`- Format: ${data.format}`);
  if (hasValue(data.length)) outputRequirements.push(`- Length: ${data.length}`);
  if (hasValue(data.tools)) outputRequirements.push(`- Available tools: ${data.tools}`);
  if (hasValue(data.memory)) outputRequirements.push(`- Memory policy: ${data.memory}`);

  if (outputRequirements.length > 0) {
    sections.push(`## OUTPUT REQUIREMENTS\n${outputRequirements.join("\n")}`);
  }

  if (hasValue(data.outputStructure)) {
    sections.push(`## OUTPUT BLUEPRINT\n${data.outputStructure}`);
  }

  return sections.join("\n\n");
}
