import { discoverOidcMetadata } from './oidc-discovery';

const metadata = {
  issuer: 'https://idp.example.com/realms/acme',
  authorization_endpoint: 'https://idp.example.com/auth',
  token_endpoint: 'https://idp.example.com/token',
  userinfo_endpoint: 'https://idp.example.com/userinfo',
  jwks_uri: 'https://idp.example.com/certs',
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as any;
});

describe('discoverOidcMetadata', () => {
  test('loads the endpoints from the well-known discovery document', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => metadata });

    await expect(
      discoverOidcMetadata('https://idp.example.com/realms/acme/'),
    ).resolves.toEqual({
      issuer: metadata.issuer,
      authorization_endpoint: metadata.authorization_endpoint,
      token_endpoint: metadata.token_endpoint,
      userinfo_endpoint: metadata.userinfo_endpoint,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://idp.example.com/realms/acme/.well-known/openid-configuration',
      expect.anything(),
    );
  });

  test('throws when the issuer responds with an error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(
      discoverOidcMetadata('https://idp.example.com'),
    ).rejects.toThrow('HTTP 404');
  });

  test('throws when a required endpoint is missing', async () => {
    const incomplete = { ...metadata, userinfo_endpoint: undefined };
    fetchMock.mockResolvedValue({ ok: true, json: async () => incomplete });

    await expect(
      discoverOidcMetadata('https://idp.example.com'),
    ).rejects.toThrow('userinfo_endpoint');
  });
});
