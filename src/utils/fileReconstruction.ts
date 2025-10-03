import { StepExecution } from '@/types';

export interface ReconstructedFile {
  filename: string;
  originalContent: string;
  correctedContent: string;
  language: string;
  changesSummary: string;
  linesAdded: number;
  linesRemoved: number;
  totalChanges: number;
}

export interface ParsedCodeContext {
  files: Array<{
    filename: string;
    content: string;
    language: string;
  }>;
  isSingleFile: boolean;
}

/**
 * Parse code context to extract individual files
 */
export function parseCodeContext(codeContext: string): ParsedCodeContext {
  if (!codeContext?.trim()) {
    return { files: [], isSingleFile: true };
  }

  // Pattern 1: Markdown code blocks with filenames
  const markdownPattern = /(?:^|\n)(?:File:|Filename:|\*\*File:\*\*)\s*([^\n]+)\n```(\w+)?\n([\s\S]*?)\n```/gi;
  const markdownMatches = Array.from(codeContext.matchAll(markdownPattern));

  if (markdownMatches.length > 0) {
    const files = markdownMatches.map(match => ({
      filename: match[1].trim(),
      content: match[3].trim(),
      language: match[2] || detectLanguageFromFilename(match[1].trim())
    }));
    return { files, isSingleFile: files.length === 1 };
  }

  // Pattern 2: Comment-style file headers
  const commentPattern = /(?:^|\n)(?:\/\/|#|<!--)\s*([^\n]+?\.[\w]+)(?:\s*-->)?\n([\s\S]*?)(?=\n(?:\/\/|#|<!--)[^\n]+?\.[\w]+|\n*$)/gi;
  const commentMatches = Array.from(codeContext.matchAll(commentPattern));

  if (commentMatches.length > 0) {
    const files = commentMatches.map(match => ({
      filename: match[1].trim(),
      content: match[2].trim(),
      language: detectLanguageFromFilename(match[1].trim())
    }));
    return { files, isSingleFile: files.length === 1 };
  }

  // Pattern 3: Multiple code blocks without explicit filenames
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)\n```/g;
  const codeBlocks = Array.from(codeContext.matchAll(codeBlockPattern));

  if (codeBlocks.length > 1) {
    const files = codeBlocks.map((match, index) => ({
      filename: `file${index + 1}.${getExtensionFromLanguage(match[1] || 'txt')}`,
      content: match[2].trim(),
      language: match[1] || 'text'
    }));
    return { files, isSingleFile: false };
  }

  // Single file or plain text
  const cleanedContent = codeContext
    .replace(/```\w*\n?/g, '') // Remove code block markers
    .trim();

  return {
    files: [{
      filename: 'main.txt',
      content: cleanedContent,
      language: detectLanguageFromContent(cleanedContent)
    }],
    isSingleFile: true
  };
}

/**
 * Apply patches to reconstruct complete files
 */
export function reconstructFiles(
  codeContext: string,
  acceptedExecutions: StepExecution[]
): ReconstructedFile[] {
  const parsedContext = parseCodeContext(codeContext);
  
  if (parsedContext.files.length === 0) {
    return [];
  }

  // Group patches by target file
  const patchesByFile = groupPatchesByFile(acceptedExecutions, parsedContext);

  return parsedContext.files.map(file => {
    const filePatches = patchesByFile[file.filename] || [];
    const correctedContent = applyPatchesToContent(file.content, filePatches);
    
    const stats = calculateChangeStats(file.content, correctedContent);
    
    return {
      filename: file.filename,
      originalContent: file.content,
      correctedContent,
      language: file.language,
      changesSummary: generateChangesSummary(filePatches, stats),
      ...stats
    };
  });
}

/**
 * Group patches by their target file
 */
function groupPatchesByFile(
  executions: StepExecution[],
  parsedContext: ParsedCodeContext
): Record<string, StepExecution[]> {
  const patchesByFile: Record<string, StepExecution[]> = {};

  executions.forEach(execution => {
    if (!execution.suggested_patch?.diff) return;

    // Try to determine target file from patch or context
    const targetFile = determineTargetFile(execution, parsedContext);
    
    if (!patchesByFile[targetFile]) {
      patchesByFile[targetFile] = [];
    }
    patchesByFile[targetFile].push(execution);
  });

  return patchesByFile;
}

/**
 * Determine which file a patch targets
 */
function determineTargetFile(
  execution: StepExecution,
  parsedContext: ParsedCodeContext
): string {
  const patch = execution.suggested_patch?.diff || '';
  
  // Look for file headers in unified diff format
  const fileHeaderMatch = patch.match(/^(?:\+\+\+|---)\s+(.+)$/m);
  if (fileHeaderMatch) {
    const filename = fileHeaderMatch[1].replace(/^[ab]\//, ''); // Remove a/ or b/ prefix
    return filename;
  }

  // If single file context, use that file
  if (parsedContext.isSingleFile && parsedContext.files.length === 1) {
    return parsedContext.files[0].filename;
  }

  // Default to first file or create generic name
  return parsedContext.files[0]?.filename || 'modified_file.txt';
}

/**
 * Apply multiple patches to content sequentially
 */
function applyPatchesToContent(originalContent: string, patches: StepExecution[]): string {
  let currentContent = originalContent;

  for (const patch of patches) {
    if (!patch.suggested_patch?.diff) continue;

    try {
      currentContent = applyUnifiedDiff(currentContent, patch.suggested_patch.diff);
    } catch (error) {
      console.warn('Failed to apply patch:', error);
      // Continue with current content if patch fails
    }
  }

  return currentContent;
}

/**
 * Apply a unified diff to content
 */
function applyUnifiedDiff(content: string, diff: string): string {
  const lines = content.split('\n');
  const diffLines = diff.split('\n');
  
  let currentLineIndex = 0;
  let i = 0;

  while (i < diffLines.length) {
    const line = diffLines[i];
    
    // Parse hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
    if (hunkMatch) {
      const oldStart = parseInt(hunkMatch[1]) - 1; // Convert to 0-based
      currentLineIndex = oldStart;
      i++;
      continue;
    }

    // Apply changes
    if (line.startsWith('-')) {
      // Remove line
      if (currentLineIndex < lines.length) {
        lines.splice(currentLineIndex, 1);
      }
    } else if (line.startsWith('+')) {
      // Add line
      const newLine = line.substring(1);
      lines.splice(currentLineIndex, 0, newLine);
      currentLineIndex++;
    } else if (line.startsWith(' ')) {
      // Context line (unchanged)
      currentLineIndex++;
    }
    
    i++;
  }

  return lines.join('\n');
}

/**
 * Calculate change statistics
 */
function calculateChangeStats(original: string, corrected: string) {
  const originalLines = original.split('\n');
  const correctedLines = corrected.split('\n');
  
  // Simple diff calculation
  const linesAdded = Math.max(0, correctedLines.length - originalLines.length);
  const linesRemoved = Math.max(0, originalLines.length - correctedLines.length);
  
  // Count actual changes by comparing line by line
  let changedLines = 0;
  const minLength = Math.min(originalLines.length, correctedLines.length);
  
  for (let i = 0; i < minLength; i++) {
    if (originalLines[i] !== correctedLines[i]) {
      changedLines++;
    }
  }

  const totalChanges = changedLines + linesAdded + linesRemoved;

  return { linesAdded, linesRemoved, totalChanges };
}

/**
 * Generate a summary of changes
 */
function generateChangesSummary(patches: StepExecution[], stats: ReturnType<typeof calculateChangeStats>): string {
  const { linesAdded, linesRemoved, totalChanges } = stats;
  
  if (totalChanges === 0) {
    return 'No changes applied';
  }

  const changes = [];
  if (linesAdded > 0) changes.push(`+${linesAdded} lines`);
  if (linesRemoved > 0) changes.push(`-${linesRemoved} lines`);
  
  const summary = changes.length > 0 ? changes.join(', ') : `${totalChanges} modifications`;
  
  return `${patches.length} patch${patches.length === 1 ? '' : 'es'} applied: ${summary}`;
}

/**
 * Detect programming language from filename
 */
function detectLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'ps1': 'powershell'
  };

  return languageMap[ext || ''] || 'text';
}

/**
 * Detect language from content patterns
 */
function detectLanguageFromContent(content: string): string {
  // Look for common language patterns
  if (/^\s*(?:import|from|def|class|if\s+__name__)/m.test(content)) return 'python';
  if (/^\s*(?:function|const|let|var|class|import|export)/m.test(content)) return 'javascript';
  if (/^\s*(?:interface|type|class|import|export).*:\s*\w/m.test(content)) return 'typescript';
  if (/^\s*(?:public|private|class|import|package)/m.test(content)) return 'java';
  if (/^\s*(?:#include|int\s+main|void\s+\w)/m.test(content)) return 'c';
  if (/^\s*(?:<\?php|function\s+\w|class\s+\w)/m.test(content)) return 'php';
  if (/^\s*(?:def\s+\w|class\s+\w|module\s+\w)/m.test(content)) return 'ruby';
  
  return 'text';
}

/**
 * Get file extension from language
 */
function getExtensionFromLanguage(language: string): string {
  const extensionMap: Record<string, string> = {
    'javascript': 'js',
    'typescript': 'ts',
    'python': 'py',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'csharp': 'cs',
    'php': 'php',
    'ruby': 'rb',
    'go': 'go',
    'rust': 'rs',
    'swift': 'swift',
    'kotlin': 'kt',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'markdown': 'md',
    'sql': 'sql',
    'bash': 'sh'
  };

  return extensionMap[language] || 'txt';
}