/**
 * Prompt generation utilities for Groq API integration
 */

export interface PromptContext {
  codeContext: string;
  intent: string;
  language?: string;
  file?: string;
}

export interface StepExecutionContext {
  stepTitle: string;
  stepDescription: string;
  codeContext: string;
  inputFiles?: string[];
}

/**
 * Generate a prompt for plan generation
 */
export function generatePlanPrompt(context: PromptContext): string {
  const { codeContext, intent, language, file } = context;
  
  const languageContext = language ? `\nProgramming Language: ${language}` : '';
  const fileContext = file ? `\nTarget File: ${file}` : '';
  
  return `You are a coding assistant that creates step-by-step implementation plans. Given code context and user intent, generate a detailed plan with discrete, actionable steps.

## Context
${languageContext}${fileContext}

## Code Context
\`\`\`
${codeContext}
\`\`\`

## User Intent
${intent}

## Instructions
Create a plan with steps that are:
1. Discrete and actionable
2. Focused on specific code changes
3. Ordered logically for implementation
4. Clear about input files and expected output

Return your response as a JSON object with this exact structure:
{
  "task": "${intent}",
  "language": "${language || 'auto-detect'}",
  "file": "${file || 'auto-detect'}",
  "steps": [
    {
      "id": "step_1",
      "title": "Brief step title",
      "description": "Detailed description of what to implement",
      "input_files": ["file1.ts", "file2.ts"],
      "output": {
        "type": "patch",
        "patch_format": "unified_diff"
      }
    }
  ]
}

Generate 3-8 steps that cover the complete implementation. Each step should be implementable independently.`;
}

/**
 * Generate a prompt for step execution
 */
export function generateStepExecutionPrompt(context: StepExecutionContext): string {
  const { stepTitle, stepDescription, codeContext, inputFiles } = context;
  
  const inputFilesContext = inputFiles && inputFiles.length > 0 
    ? `\nInput Files: ${inputFiles.join(', ')}` 
    : '';
  
  return `You are a coding assistant that implements specific code changes. Given a step description and code context, generate the exact code changes needed.

## Step to Implement
**Title:** ${stepTitle}
**Description:** ${stepDescription}${inputFilesContext}

## Current Code Context
\`\`\`
${codeContext}
\`\`\`

## Instructions
Implement the requested step by generating the exact code changes. Focus on:
1. Making minimal, targeted changes
2. Following best practices and existing code patterns
3. Ensuring the change is complete and functional
4. Providing clear explanations

Return your response as a JSON object with this exact structure:
{
  "step_id": "step_id_here",
  "suggested_patch": {
    "format": "unified_diff",
    "diff": "--- a/file.ts\\n+++ b/file.ts\\n@@ -1,3 +1,4 @@\\n line1\\n+new line\\n line2"
  },
  "explanation": "Clear explanation of what was changed and why"
}

Generate a unified diff format patch that can be applied to the codebase.`;
}

/**
 * Replace template variables in prompt strings
 */
export function replaceTemplateVariables(
  template: string, 
  variables: Record<string, string>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Sanitize user input for prompt injection prevention
 */
export function sanitizeInput(input: string): string {
  // Remove potential prompt injection patterns
  return input
    .replace(/```/g, '\\`\\`\\`') // Escape code blocks
    .replace(/\n\s*##\s/g, '\n\\## ') // Escape markdown headers
    .replace(/\n\s*\*\*Instructions\*\*/gi, '\n\\**Instructions**') // Escape instruction headers
    .trim();
}

/**
 * Validate prompt context before generation
 */
export function validatePromptContext(context: PromptContext): void {
  if (!context.codeContext?.trim()) {
    throw new Error('Code context is required');
  }
  
  if (!context.intent?.trim()) {
    throw new Error('Intent is required');
  }
  
  if (context.codeContext.length > 50000) {
    throw new Error('Code context is too large (max 50,000 characters)');
  }
  
  if (context.intent.length > 1000) {
    throw new Error('Intent is too long (max 1,000 characters)');
  }
}

/**
 * Validate step execution context
 */
export function validateStepExecutionContext(context: StepExecutionContext): void {
  if (!context.stepTitle?.trim()) {
    throw new Error('Step title is required');
  }
  
  if (!context.stepDescription?.trim()) {
    throw new Error('Step description is required');
  }
  
  if (!context.codeContext?.trim()) {
    throw new Error('Code context is required');
  }
  
  if (context.codeContext.length > 50000) {
    throw new Error('Code context is too large (max 50,000 characters)');
  }
}