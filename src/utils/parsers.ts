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
    // Log the raw response for debugging
    console.log("Raw LLM response:", response);
    
    // Extract JSON from response (handle cases where LLM adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new ParseError("No JSON object found in response", response);
    }

    console.log("Extracted JSON:", jsonMatch[0]);
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
    // Extract JSON from response - handle code blocks
    let jsonString = response;
    
    // Remove markdown code block markers if present
    jsonString = jsonString.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '');
    
    // Find the JSON object boundaries
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new ParseError("No JSON object found in response", response);
    }

    const rawJson = jsonMatch[0];
    
    // Try to fix common JSON issues with embedded strings
    try {
      // First attempt: direct parsing
      const parsed = JSON.parse(rawJson);
      return parseValidatedStepExecution(parsed);
    } catch {
      // Second attempt: try to fix malformed diff strings
      try {
        const fixedJson = fixMalformedJsonDiff(rawJson);
        const parsed = JSON.parse(fixedJson);
        return parseValidatedStepExecution(parsed);
      } catch {
        // Third attempt: extract fields manually if JSON is completely broken
        const manuallyParsed = extractStepExecutionManually(rawJson);
        return parseValidatedStepExecution(manuallyParsed);
      }
    }
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(`Unexpected parsing error: ${error}`, response);
  }
}

/**
 * Fix malformed JSON by properly escaping diff strings
 */
function fixMalformedJsonDiff(jsonString: string): string {
  // Find the diff field and properly escape it
  const diffPattern = /"diff":\s*"([^"]*(?:\\.[^"]*)*?)"/g;
  
  return jsonString.replace(diffPattern, (match, diffContent) => {
    // Properly escape the diff content
    const escapedDiff = diffContent
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    
    return `"diff": "${escapedDiff}"`;
  });
}

/**
 * Manually extract step execution fields when JSON parsing fails
 */
function extractStepExecutionManually(jsonString: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  // Extract step_id
  const stepIdMatch = jsonString.match(/"step_id":\s*"([^"]+)"/);
  if (stepIdMatch) {
    result.step_id = stepIdMatch[1];
  }
  
  // Extract explanation
  const explanationMatch = jsonString.match(/"explanation":\s*"([^"]*(?:\\.[^"]*)*?)"/);
  if (explanationMatch) {
    result.explanation = explanationMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  
  // Extract suggested_patch object
  const patchMatch = jsonString.match(/"suggested_patch":\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
  if (patchMatch) {
    const patchContent = patchMatch[1];
    
    // Extract format
    const formatMatch = patchContent.match(/"format":\s*"([^"]+)"/);
    
    // Extract diff - this is the tricky part due to embedded newlines
    const diffMatch = jsonString.match(/"diff":\s*"([\s\S]*?)"\s*}/);
    
    if (formatMatch && diffMatch) {
      result.suggested_patch = {
        format: formatMatch[1],
        diff: diffMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
      };
    }
  }
  
  return result;
}

/**
 * Validate parsed step execution data
 */
function parseValidatedStepExecution(parsed: Record<string, unknown>): StepExecution {

    // Validate required fields
    if (!parsed.step_id || typeof parsed.step_id !== "string") {
      throw new ParseError('Missing or invalid "step_id" field');
    }

    if (!parsed.suggested_patch || typeof parsed.suggested_patch !== "object") {
      throw new ParseError('Missing or invalid "suggested_patch" object');
    }

    const suggestedPatch = parsed.suggested_patch as Record<string, unknown>;

    if (
      !suggestedPatch.format ||
      typeof suggestedPatch.format !== "string"
    ) {
      throw new ParseError("Missing or invalid patch format");
    }

    if (
      !suggestedPatch.diff ||
      typeof suggestedPatch.diff !== "string"
    ) {
      throw new ParseError("Missing or invalid patch diff");
    }

    if (!parsed.explanation || typeof parsed.explanation !== "string") {
      throw new ParseError('Missing or invalid "explanation" field');
    }

    // Validate patch format
    const validFormats = ["unified_diff", "full_file"];
    if (!validFormats.includes(suggestedPatch.format)) {
      throw new ParseError(
        `Invalid patch format. Must be one of: ${validFormats.join(", ")}`
      );
    }

    const stepExecution: StepExecution = {
      step_id: (parsed.step_id as string).trim(),
      suggested_patch: {
        format: suggestedPatch.format as "unified_diff" | "full_file",
        diff: suggestedPatch.diff as string,
      },
      explanation: (parsed.explanation as string).trim(),
    };

    return stepExecution;
}

/**
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
    console.log(`${stepPrefix} output object:`, outputObj);
    
    const validOutputTypes = ["instruction", "patch", "file_replace"];
    let outputType = outputObj.type as string;
    
    // Handle common variations and map them to valid types
    if (outputType) {
      const typeMapping: Record<string, string> = {
        "file": "file_replace",
        "code": "patch", 
        "diff": "patch",
        "console_output": "instruction",
        "output": "instruction",
        "guidance": "instruction"
      };
      
      if (typeMapping[outputType]) {
        console.log(`${stepPrefix} Mapping output type "${outputType}" to "${typeMapping[outputType]}"`);
        outputType = typeMapping[outputType];
        // Update the object to use the correct type
        (outputObj as Record<string, unknown>).type = outputType;
      }
    }
    
    if (!outputType || !validOutputTypes.includes(outputType)) {
      console.log(`${stepPrefix} Invalid output type received:`, outputObj.type);
      throw new ParseError(
        `${stepPrefix} Invalid output type. Must be one of: ${validOutputTypes.join(
          ", "
        )}. Received: ${outputObj.type}`
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
