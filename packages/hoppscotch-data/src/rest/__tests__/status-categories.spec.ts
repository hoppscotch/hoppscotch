import { describe, it, expect } from 'vitest';

/**
 * Isolated unit tests for HTTP Status Code categorization utilities.
 */

export function getStatusCategory(statusCode: number): 'informational' | 'success' | 'redirection' | 'client_error' | 'server_error' | 'unknown' {
  if (statusCode >= 100 && statusCode < 200) return 'informational';
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 300 && statusCode < 400) return 'redirection';
  if (statusCode >= 400 && statusCode < 500) return 'client_error';
  if (statusCode >= 500 && statusCode < 600) return 'server_error';
  return 'unknown';
}

describe('HTTP Status Code Category Helpers', () => {
  it('should identify 2xx range as success', () => {
    expect(getStatusCategory(200)).toBe('success');
    expect(getStatusCategory(201)).toBe('success');
    expect(getStatusCategory(204)).toBe('success');
  });

  it('should identify 4xx range as client_error', () => {
    expect(getStatusCategory(400)).toBe('client_error');
    expect(getStatusCategory(401)).toBe('client_error');
    expect(getStatusCategory(404)).toBe('client_error');
    expect(getStatusCategory(429)).toBe('client_error');
  });

  it('should identify 5xx range as server_error', () => {
    expect(getStatusCategory(500)).toBe('server_error');
    expect(getStatusCategory(502)).toBe('server_error');
    expect(getStatusCategory(503)).toBe('server_error');
  });

  it('should identify out-of-range status codes as unknown', () => {
    expect(getStatusCategory(99)).toBe('unknown');
    expect(getStatusCategory(600)).toBe('unknown');
  });
});
