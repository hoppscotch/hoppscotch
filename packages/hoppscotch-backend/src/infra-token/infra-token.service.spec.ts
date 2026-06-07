import { InfraTokenService } from './infra-token.service';
import * as E from 'fp-ts/Either';
import { INFRA_TOKEN_EXPIRY_INVALID, INFRA_TOKEN_LABEL_SHORT, INFRA_TOKEN_NOT_FOUND,} from 'src/errors';
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

describe('InfraTokenService - revoke', () => {
  let service: InfraTokenService;
  let prismaMock: any;
  let adminServiceMock: any;

  beforeEach(() => {
    // Database Mock setup focused on the delete function
    prismaMock = {
      infraToken: {
        delete: jest.fn(), 
      },
    };
    adminServiceMock = {};
    service = new InfraTokenService(prismaMock, adminServiceMock);
  });

  // --- White-box Tests (try/catch coverage) ---

  it('should return E.right(true) when the token is successfully deleted in Prisma', async () => {
    prismaMock.infraToken.delete.mockResolvedValue({ id: 'valid-id-123' });

    const result = await service.revoke('valid-id-123');

    expect(prismaMock.infraToken.delete).toHaveBeenCalledWith({
      where: { id: 'valid-id-123' },
    });
    //Ensures the return is a success containing "true"
    expect(result).toEqual(E.right(true));
  });

  it('should return E.left(INFRA_TOKEN_NOT_FOUND) when Prisma throws an error', async () => {
    
    prismaMock.infraToken.delete.mockRejectedValue(
      new Error('Record to delete does not exist.')
    );

    const result = await service.revoke('invalid-id-456');

    expect(prismaMock.infraToken.delete).toHaveBeenCalledWith({
      where: { id: 'invalid-id-456' },
    });
    // Ensures it caught the error and returned the expected Left
    expect(result).toEqual(E.left(INFRA_TOKEN_NOT_FOUND));
  });
});

