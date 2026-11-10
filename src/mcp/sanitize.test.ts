import { sanitizeLogValue } from './sanitize';

describe('sanitizeLogValue', () => {
  it('should neutralize CR/LF log-forging attempts', () => {
    // Arrange / Act
    const result = sanitizeLogValue('client\nSECURITY_EVENT admin_granted\r\nnext');

    // Assert
    expect(result).toBe('client SECURITY_EVENT admin_granted  next');
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\r');
  });

  it('should strip ANSI escape sequences', () => {
    // Arrange / Act
    const result = sanitizeLogValue('\x1b[31mred\x1b[0m text');

    // Assert
    expect(result).toBe('red text');
  });

  it('should neutralize Unicode line separators', () => {
    // Arrange / Act
    const result = sanitizeLogValue('a\u2028b\u2029c');

    // Assert
    expect(result).toBe('a b c');
  });

  it('should fall back to "unknown" for missing values', () => {
    expect(sanitizeLogValue(undefined)).toBe('unknown');
    expect(sanitizeLogValue(null)).toBe('unknown');
  });

  it('should stringify and trim non-string values', () => {
    expect(sanitizeLogValue(42)).toBe('42');
    expect(sanitizeLogValue('  padded  ')).toBe('padded');
  });
});
