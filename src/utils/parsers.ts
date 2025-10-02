/**
 * LLM response parsing utilities with validation and error handling
 */

import { Plan, Step, StepExecution } from "@/types";

export class ParseError extends Error {
  constructor(message: string, public readonly originalResponse?: string) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Parse and validate a Plan response from the LLM
 */
export function parsePlanResponse(response: string): Plan {
  try {
    // Extract JSON from response (handle cases where LLM adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new ParseError("No JSON object found in response", response);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.task || typeof parsed.task !== "string") {
      throw new ParseError('Missing or invalid "task" field');
    }

    if (!Array.isArray(parsed.steps)) {
      throw new ParseError('Missing or invalid "steps" array');
    }

    if (parsed.steps.length === 0) {
      throw new ParseError("Steps array cannot be empty");
    }

    // Validate each step
    const validatedSteps: Step[] = parsed.steps.map(
      (step: unknown, index: number) => {
        return validateStep(step, index);
      }
    );

    const plan: Plan = {
      task: parsed.task.trim(),
      language: parsed.language || undefined,
      file: parsed.file || undefined,
      steps: validatedSteps,
    };

    return plan;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new ParseError(`Invalid JSON format: ${error.message}`, response);
    }

    throw new ParseError(`Unexpected parsing error: ${error}`, response);
  }
}

/**
 * Parse and validate a StepExecution response from the LLM
 */
export function parseStepExecutionResponse(response: string): StepExecution {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new ParseError("No JSON object found in response", response);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.step_id || typeof parsed.step_id !== "string") {
      throw new ParseError('Missing or invalid "step_id" field');
    }

    if (!parsed.suggested_patch || typeof parsed.suggested_patch !== "object") {
      throw new ParseError('Missing or invalid "suggested_patch" object');
    }

    if (
      !parsed.suggested_patch.format ||
      typeof parsed.suggested_patch.format !== "string"
    ) {
      throw new ParseError("Missing or invalid patch format");
    }

    if (
      !parsed.suggested_patch.diff ||
      typeof parsed.suggested_patch.diff !== "string"
    ) {
      throw new ParseError("Missing or invalid patch diff");
    }

    if (!parsed.explanation || typeof parsed.explanation !== "string") {
      throw new ParseError('Missing or invalid "explanation" field');
    }

    // Validate patch format
    const validFormats = ["unified_diff", "full_file"];
    if (!validFormats.includes(parsed.suggested_patch.format)) {
      throw new ParseError(
        `Invalid patch format. Must be one of: ${validFormats.join(", ")}`
      );
    }

    const stepExecution: StepExecution = {
      step_id: parsed.step_id.trim(),
      suggested_patch: {
        format: parsed.suggested_patch.format as "unified_diff" | "full_file",
        diff: parsed.suggested_patch.diff,
      },
      explanation: parsed.explanation.trim(),
    };

    return stepExecution;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new ParseError(`Invalid JSON format: ${error.message}`, response);
    }

    throw new ParseError(`Unexpected parsing error: ${error}`, response);
  }
} /**

 * Validate a single step object
 */
function validateStep(step: unknown, index: number): Step {
  const stepPrefix = `Step ${index + 1}:`;

  // Type guard to ensure step is an object
  if (typeof step !== "object" || step === null) {
    throw new ParseError(`${stepPrefix} Step must be an object`);
  }

  const stepObj = step as Record<string, unknown>;

  if (!stepObj.id || typeof stepObj.id !== "string") {
    throw new ParseError(`${stepPrefix} Missing or invalid "id" field`);
  }

  if (!stepObj.title || typeof stepObj.title !== "string") {
    throw new ParseError(`${stepPrefix} Missing or invalid "title" field`);
  }

  if (!stepObj.description || typeof stepObj.description !== "string") {
    throw new ParseError(
      `${stepPrefix} Missing or invalid "description" field`
    );
  }

  // Validate optional fields
  if (stepObj.input_files !== undefined) {
    if (!Array.isArray(stepObj.input_files)) {
      throw new ParseError(`${stepPrefix} "input_files" must be an array`);
    }

    if (!stepObj.input_files.every((file: unknown) => typeof file === "string")) {
      throw new ParseError(`${stepPrefix} All "input_files" must be strings`);
    }
  }

  if (stepObj.output !== undefined) {
    if (typeof stepObj.output !== "object" || stepObj.output === null) {
      throw new ParseError(`${stepPrefix} "output" must be an object`);
    }

    const outputObj = stepObj.output as Record<string, unknown>;
    const validOutputTypes = ["instruction", "patch", "file_replace"];
    if (!outputObj.type || !validOutputTypes.includes(outputObj.type as string)) {
      throw new ParseError(
        `${stepPrefix} Invalid output type. Must be one of: ${validOutputTypes.join(
          ", "
        )}`
      );
    }
  }

  return {
    id: stepObj.id.trim(),
    title: stepObj.title.trim(),
    description: stepObj.description.trim(),
    input_files: stepObj.input_files as string[] | undefined,
    output: stepObj.output as Step["output"] | undefined,
  };
}

/**
 * Attempt to fix common JSON formatting issues in LLM responses
 */
export function sanitizeJsonResponse(response: string): string {
  let cleaned = response.trim();

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*$/g, "");

  // Remove common prefixes/suffixes
  cleaned = cleaned.replace(/^Here's the.*?:\s*/i, "");
  cleaned = cleaned.replace(/^The response is:\s*/i, "");

  // Fix common JSON issues
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1"); // Remove trailing commas
  cleaned = cleaned.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys

  return cleaned;
}

/**
 * Validate that a response contains valid JSON structure
 */
export function validateJsonStructure(response: string): boolean {
  try {
    const sanitized = sanitizeJsonResponse(response);
    const jsonMatch = sanitized.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return false;
    }

    JSON.parse(jsonMatch[0]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract error information from malformed responses
 */
export function extractErrorInfo(response: string): {
  hasJson: boolean;
  jsonContent?: string;
  errorHints: string[];
} {
  const hasJson = /\{[\s\S]*\}/.test(response);
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  const errorHints: string[] = [];

  if (!hasJson) {
    errorHints.push("No JSON object found in response");
  } else {
    try {
      JSON.parse(jsonMatch![0]);
    } catch (error) {
      if (error instanceof SyntaxError) {
        errorHints.push(`JSON syntax error: ${error.message}`);
      }
    }
  }

  // Check for common issues
  if (response.includes("```")) {
    errorHints.push("Response contains markdown code blocks");
  }

  if (response.includes('"task"') && !response.includes('"steps"')) {
    errorHints.push('Missing required "steps" field');
  }

  if (response.includes('"steps"') && !response.includes('"task"')) {
    errorHints.push('Missing required "task" field');
  }

  return {
    hasJson,
    jsonContent: jsonMatch?.[0],
    errorHints,
  };
}
