/**
 * Normalizes keyboard events to return the physical key name for alphanumeric keys,
 * ensuring consistency when modifiers are pressed (e.g., Alt+E returns "E", not "É").
 */
export const getNormalizedKey = (e: KeyboardEvent): string => {
  const code = e.code;

  // Handle Alphanumeric keys using code to ignore modifiers
  if (code.startsWith('Key')) {
    return code.replace('Key', '');
  }
  
  // Handle Digits
  if (code.startsWith('Digit')) {
    return code.replace('Digit', '');
  }

  // Handle Arrow keys explicitly to ensure consistency
  if (code === 'ArrowUp') return 'ArrowUp';
  if (code === 'ArrowDown') return 'ArrowDown';
  if (code === 'ArrowLeft') return 'ArrowLeft';
  if (code === 'ArrowRight') return 'ArrowRight';
  
  // Handle Space
  if (code === 'Space') return 'Space';

  // Fallback for symbols and other keys where key value might be more appropriate
  // or identifying the exact physical key is less critical/standardized
  // e.g. "BracketLeft" might be better than "{", but "Shift+1" vs "!" is subjective.
  // For now, let's trust e.key for non-alphanumeric to support different layouts better
  // unless we specifically want to force physical layout.
  // However, the issue described is specifically about Alt+Char being weird.
  
  const key = e.key;
  if (key === ' ') return 'Space';
  
  // Clean up single char keys to uppercase
  if (key.length === 1) return key.toUpperCase();
  
  return key;
};
