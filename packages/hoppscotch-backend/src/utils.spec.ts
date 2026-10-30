import { getWhitelistedOrigins } from './utils';

describe('getWhitelistedOrigins', () => {
  describe('Tauri origin generation from https origins', () => {
    test('Should generate a Tauri origin for a simple https domain', () => {
      const result = getWhitelistedOrigins('https://hoppscotch.example.com');
      expect(result).toContain('https://hoppscotch.example.com');
      expect(result).toContain('https://app.hoppscotch_hoppscotch_example_com');
    });

    test('Should generate a Tauri origin for each https domain in a comma-separated list', () => {
      const result = getWhitelistedOrigins(
        'https://hoppscotch.company.com,hopp_auth://token',
      );
      expect(result).toContain('https://hoppscotch.company.com');
      expect(result).toContain('hopp_auth://token');
      expect(result).toContain('https://app.hoppscotch_hoppscotch_company_com');
      // hopp_auth:// is not http/https, should not generate a Tauri origin
      expect(result).not.toContain(expect.stringContaining('hopp_auth_'));
    });

    test('Should generate Tauri origins for both http and https', () => {
      const result = getWhitelistedOrigins(
        'http://localhost:3000,https://hoppscotch.yourdomain.com',
      );
      expect(result).toContain('http://localhost:3000');
      expect(result).toContain('https://hoppscotch.yourdomain.com');
      // http localhost => Tauri origin
      expect(result).toContain('https://app.hoppscotch_localhost');
      // https domain => Tauri origin
      expect(result).toContain(
        'https://app.hoppscotch_hoppscotch_yourdomain_com',
      );
    });

    test('Should correctly replace dots with underscores in Tauri origin', () => {
      const result = getWhitelistedOrigins('https://my.deeply.nested.domain.io');
      expect(result).toContain(
        'https://app.hoppscotch_my_deeply_nested_domain_io',
      );
    });

    test('Should NOT generate Tauri origin for non-http/https schemes', () => {
      const result = getWhitelistedOrigins(
        'hopp_auth://token,app://localhost_3200',
      );
      // These are not http/https, so no Tauri origins should be generated
      expect(result.length).toBe(2);
      expect(result).toContain('hopp_auth://token');
      expect(result).toContain('app://localhost_3200');
    });
  });

  describe('Edge cases and null handling', () => {
    test('Should return empty array for null input', () => {
      const result = getWhitelistedOrigins(null);
      expect(result).toEqual([]);
    });

    test('Should return empty array for undefined input', () => {
      const result = getWhitelistedOrigins(undefined);
      expect(result).toEqual([]);
    });

    test('Should return empty array for empty string', () => {
      const result = getWhitelistedOrigins('');
      expect(result).toEqual([]);
    });

    test('Should not produce duplicate Tauri origins', () => {
      const result = getWhitelistedOrigins('https://hoppscotch.io');
      const tauriOrigin = 'https://app.hoppscotch_hoppscotch_io';
      const count = result.filter((o) => o === tauriOrigin).length;
      expect(count).toBe(1);
    });

    test('Should silently skip malformed/unparseable origin strings', () => {
      const result = getWhitelistedOrigins(
        'not-a-valid-url,https://hoppscotch.io',
      );
      // malformed entry is preserved in origins, but no Tauri origin generated for it
      expect(result).toContain('not-a-valid-url');
      expect(result).toContain('https://hoppscotch.io');
      expect(result).toContain('https://app.hoppscotch_hoppscotch_io');
    });
  });

  describe('Real-world Helm chart scenario (issue #6389)', () => {
    test('Should resolve desktop app auth with self-hosted Helm instance', () => {
      // Simulates the exact scenario from the bug report:
      // WHITELISTED_ORIGINS only has the web URL and hopp_auth,
      // but the Desktop App (Tauri v2) needs its auto-generated origin.
      const result = getWhitelistedOrigins(
        'https://hoppscotch.yourdomain.com,hopp_auth://token',
      );

      // The computed Tauri origin should be in the list
      expect(result).toContain(
        'https://app.hoppscotch_hoppscotch_yourdomain_com',
      );
    });
  });
});
