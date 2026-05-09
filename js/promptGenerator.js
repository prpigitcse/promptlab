/**
 * Copyright 2026 Pradosh Ranjan Pattanayak
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

export function buildPromptString(data, sectionOrder) {
  // Use provided order or default canonical order
  const order = Array.isArray(sectionOrder) && sectionOrder.length === 4
    ? sectionOrder
    : ["identity", "task", "boundaries", "delivery"];

  const strategyInstruction = getStrategyInstruction(data);

  // Each section ID → function that returns an array of markdown blocks
  const sectionBuilders = {
    identity(d) {
      const blocks = [];
      if (hasValue(d.role))
        blocks.push(`## ROLE\nYou are acting as ${d.role}.`);
      if (hasValue(d.audience))
        blocks.push(`## TARGET AUDIENCE\n${d.audience}`);
      if (hasValue(d.context))
        blocks.push(`## BACKGROUND CONTEXT\n${d.context}`);
      return blocks;
    },
    task(d) {
      const blocks = [];
      blocks.push(`## PRIMARY TASK\n${d.task}`);
      if (hasValue(strategyInstruction))
        blocks.push(`## PROMPTING STRATEGY\n${strategyInstruction}`);
      if (hasValue(d.variables))
        blocks.push(`## INPUT VARIABLES\nUse these placeholders when relevant: ${d.variables}`);
      if (hasValue(d.reasoning))
        blocks.push(`## APPROACH\n${d.reasoning}`);
      if (hasValue(d.examples))
        blocks.push(`## REFERENCE EXAMPLES\n${d.examples}`);
      return blocks;
    },
    boundaries(d) {
      const blocks = [];
      if (hasValue(d.mustInclude))
        blocks.push(`## MUST INCLUDE\n${d.mustInclude}`);
      if (hasValue(d.avoid))
        blocks.push(`## AVOID\n${d.avoid}`);
      if (hasValue(d.constraints))
        blocks.push(`## CONSTRAINTS\n${d.constraints}`);
      if (hasValue(d.rules))
        blocks.push(`## RULES\n${d.rules}`);
      if (hasValue(d.criteria))
        blocks.push(`## SUCCESS CRITERIA\n${d.criteria}`);
      if (hasValue(d.errorPolicy))
        blocks.push(`## WHEN INFORMATION IS MISSING\n${d.errorPolicy}`);
      return blocks;
    },
    delivery(d) {
      const reqs = [];
      if (hasValue(d.tone))   reqs.push(`- Tone and style: ${d.tone}`);
      if (hasValue(d.format)) reqs.push(`- Format: ${d.format}`);
      if (hasValue(d.length)) reqs.push(`- Length: ${d.length}`);
      if (hasValue(d.tools))  reqs.push(`- Available tools: ${d.tools}`);
      if (hasValue(d.memory)) reqs.push(`- Memory policy: ${d.memory}`);
      const blocks = [];
      if (reqs.length > 0)
        blocks.push(`## OUTPUT REQUIREMENTS\n${reqs.join("\n")}`);
      if (hasValue(d.outputStructure))
        blocks.push(`## OUTPUT BLUEPRINT\n${d.outputStructure}`);
      return blocks;
    },
  };

  const allBlocks = [];
  order.forEach((sectionId) => {
    const builder = sectionBuilders[sectionId];
    if (builder) allBlocks.push(...builder(data));
  });

  return allBlocks.join("\n\n");
}

