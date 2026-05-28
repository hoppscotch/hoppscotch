import { InfraTokenService } from './infra-token.service';
import * as E from 'fp-ts/Either';
import { INFRA_TOKEN_EXPIRY_INVALID, INFRA_TOKEN_LABEL_SHORT } from 'src/errors';
import { Admin } from 'src/admin/admin.model';

describe('InfraTokenService - create', () => {
  let service: InfraTokenService;
  let prismaMock: any;
  let adminServiceMock: any;

  beforeEach(() => {
    // Setup Test Double (Mock) for the Database
    prismaMock = {
      infraToken: {
        create: jest.fn().mockResolvedValue({
          token: 'mocked-token-123',
          id: '1',
          label: 'API',
          createdOn: new Date(),
          expiresOn: new Date(),
          updatedOn: new Date(),
        }),
      },
    };
    adminServiceMock = {};
    service = new InfraTokenService(prismaMock, adminServiceMock);
  });

  const mockAdmin: Admin = { uid: 'admin-uid-123' } as Admin;

  // --- White-box Tests (MC/DC coverage for expiry) ---

  it('should create a lifetime token when expiryInDays is null', async () => {
    const result = await service.create('API', null as any, mockAdmin);
    expect(E.isRight(result)).toBeTruthy();
  });

  it('should create a token when expiryInDays is valid (e.g., 30)', async () => {
    const result = await service.create('API', 30, mockAdmin);
    expect(E.isRight(result)).toBeTruthy();
  });

  it('should return error when expiryInDays is outside the allowed range (e.g., 15)', async () => {
    const result = await service.create('API', 15, mockAdmin);
    expect(result).toEqual(E.left(INFRA_TOKEN_EXPIRY_INVALID));
  });

  // --- Black-box Tests (Boundary Value Analysis for Label length) ---

  it('should create a token when label has exactly 3 characters', async () => {
    // Changed expiry to 7 to be independent of CT02
    const result = await service.create('API', 7, mockAdmin);
    expect(E.isRight(result)).toBeTruthy();
  });

  it('should return error when label has 2 characters', async () => {
    const result = await service.create('CI', 30, mockAdmin);
    expect(result).toEqual(E.left(INFRA_TOKEN_LABEL_SHORT));
  });
});
