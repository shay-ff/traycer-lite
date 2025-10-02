/**
 * Export utilities for generating and downloading patch files
 */

import { Plan, Step, StepExecution } from '../types';

export interface ExportOptions {
  format: 'unified_diff' | 'git_patch' | 'combined';
  includeMetadata?: boolean;
  filename?: string;
}

export interface AcceptedStep {
  step: Step;
  execution: StepExecution;
  accepted: boolean;
}

/**
 * Generate a combined patch file from accepted step executions
 */
export function generateCombinedPatch(
  plan: Plan,
  acceptedSteps: AcceptedStep[],
  options: ExportOptions = { format: 'unified_diff' }
): string {
  const { format, includeMetadata = true } = options;
  
  let patchContent = '';
  
  // Add metadata header if requested
  if (includeMetadata) {
    patchContent += generatePatchHeader(plan, acceptedSteps);
  }
  
  // Process each accepted step
  acceptedSteps
    .filter(item => item.accepted)
    .forEach((item, index) => {
      const { step, execution } = item;
      
      // Add step separator
      if (index > 0) {
        patchContent += '\n\n';
      }
      
      // Add step information
      if (includeMetadata) {
        patchContent += `# Step ${step.id}: ${step.title}\n`;
        patchContent += `# ${step.description}\n`;
        if (execution.explanation) {
          patchContent += `# Explanation: ${execution.explanation}\n`;
        }
        patchContent += '\n';
      }
      
      // Add the actual patch content
      const patch = execution.suggested_patch.diff;
      
      if (format === 'git_patch' && execution.suggested_patch.format === 'unified_diff') {
        // Ensure git patch format
        patchContent += formatAsGitPatch(patch, step);
      } else {
        patchContent += patch;
      }
    });
  
  return patchContent;
}

/**
 * Generate patch file header with metadata
 */
function generatePatchHeader(plan: Plan, acceptedSteps: AcceptedStep[]): string {
  const timestamp = new Date().toISOString();
  const acceptedCount = acceptedSteps.filter(item => item.accepted).length;
  
  let header = `# Coding Agent Planner - Generated Patch\n`;
  header += `# Generated: ${timestamp}\n`;
  header += `# Task: ${plan.task}\n`;
  
  if (plan.language) {
    header += `# Language: ${plan.language}\n`;
  }
  
  if (plan.file) {
    header += `# Primary File: ${plan.file}\n`;
  }
  
  header += `# Steps Applied: ${acceptedCount}/${plan.steps.length}\n`;
  header += `\n`;
  
  return header;
}

/**
 * Format patch content as proper git patch
 */
function formatAsGitPatch(patch: string, step: Step): string {
  // If it's already a proper git patch, return as-is
  if (patch.includes('diff --git') || patch.includes('index ')) {
    return patch;
  }
  
  // If it's a unified diff, ensure it has proper git headers
  if (patch.includes('---') && patch.includes('+++')) {
    return patch;
  }
  
  // For simple patches, add basic git-style headers
  const filename = step.input_files?.[0] || 'unknown.txt';
  let gitPatch = `diff --git a/${filename} b/${filename}\n`;
  gitPatch += `index 0000000..0000000 100644\n`;
  gitPatch += patch;
  
  return gitPatch;
}

/**
 * Download patch content as a file
 */
export function downloadPatch(
  content: string, 
  filename: string = 'changes.patch'
): void {
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download patch:', error);
    throw new Error('Failed to download patch file');
  }
}

/**
 * Generate filename based on plan and timestamp
 */
export function generatePatchFilename(plan: Plan, format: string = 'patch'): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const taskName = plan.task
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
  
  return `${taskName}-${timestamp}.${format}`;
}

/**
 * Export accepted changes as a downloadable patch file
 */
export function exportAcceptedChanges(
  plan: Plan,
  acceptedSteps: AcceptedStep[],
  options: ExportOptions = { format: 'unified_diff' }
): void {
  const patchContent = generateCombinedPatch(plan, acceptedSteps, options);
  const filename = options.filename || generatePatchFilename(plan, 'patch');
  
  downloadPatch(patchContent, filename);
}

/**
 * Get export format options for UI
 */
export const EXPORT_FORMATS = [
  { value: 'unified_diff', label: 'Unified Diff', description: 'Standard diff format' },
  { value: 'git_patch', label: 'Git Patch', description: 'Git-compatible patch format' },
  { value: 'combined', label: 'Combined', description: 'All changes in one file' }
] as const;