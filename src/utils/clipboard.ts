/**
 * Clipboard utilities for copying patches and code content
 */

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Copy text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  try {
    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { success: true };
    }
    
    // Fallback for older browsers or non-secure contexts
    return copyToClipboardFallback(text);
  } catch (error) {
    console.error('Clipboard API failed:', error);
    return copyToClipboardFallback(text);
  }
}

/**
 * Fallback clipboard implementation using document.execCommand
 */
function copyToClipboardFallback(text: string): ClipboardResult {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return { success: true };
    } else {
      return { success: false, error: 'Copy command failed' };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if clipboard API is available
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard || document.execCommand);
}

/**
 * Copy patch content with user feedback
 */
export async function copyPatch(
  patch: string, 
  onSuccess?: () => void, 
  onError?: (error: string) => void
): Promise<void> {
  const result = await copyToClipboard(patch);
  
  if (result.success) {
    onSuccess?.();
  } else {
    onError?.(result.error || 'Failed to copy to clipboard');
  }
}