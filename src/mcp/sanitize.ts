/**
 * Neutralizes control characters in client-supplied strings before they are
 * interpolated into log messages, resources, and summaries. Prevents log
 * forging (CWE-117): newline/CR injection of fake log lines and ANSI escape
 * sequence injection.
 */
export const sanitizeLogValue = (value: unknown): string => {
  if (value === undefined || value === null) return 'unknown';
  return String(value)
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
    .trim();
};
