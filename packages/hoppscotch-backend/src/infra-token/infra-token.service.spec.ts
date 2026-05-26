import { InfraTokenService } from './infra-token.service';
import * as E from 'fp-ts/Either';
import { INFRA_TOKEN_EXPIRY_INVALID, INFRA_TOKEN_LABEL_SHORT } from 'src/errors';
import { Admin } from 'src/admin/admin.model';

describe('InfraTokenService - create', () => {
  let service: InfraTokenService;
  let prismaMock: any;
  let adminServiceMock: any;

  beforeEach(() => {
    // Configuração do Dublê de Teste (Mock) para o Banco de Dados
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

  // --- Testes Caixa-Branca (Cobertura MC/DC para expiração) ---

  it('CT01 [MC/DC - V,F]: Deve criar token vitalício quando expiryInDays for nulo', async () => {
    const result = await service.create('API', null as any, mockAdmin);
    expect(E.isRight(result)).toBeTruthy();
  });

  it('CT02 [MC/DC - F,V]: Deve criar token quando expiryInDays for válido (ex: 30)', async () => {
    const result = await service.create('API', 30, mockAdmin);
    expect(E.isRight(result)).toBeTruthy();
  });

  it('CT03 [MC/DC - F,F]: Deve retornar falha quando expiryInDays estiver fora do padrão (ex: 15)', async () => {
    const result = await service.create('API', 15, mockAdmin);
    expect(result).toEqual(E.left(INFRA_TOKEN_EXPIRY_INVALID));
  });

  // --- Testes Caixa-Preta (Valor Limite para tamanho do Label) ---

  it('CT04 [Valor Limite Válido]: Deve criar token quando label possuir exatamente 3 caracteres', async () => {
    const result = await service.create('API', 30, mockAdmin);
    expect(E.isRight(result)).toBeTruthy();
  });

  it('CT05 [Valor Limite Inválido]: Deve retornar falha quando label possuir 2 caracteres', async () => {
    const result = await service.create('CI', 30, mockAdmin);
    expect(result).toEqual(E.left(INFRA_TOKEN_LABEL_SHORT));
  });
});