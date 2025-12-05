import { randomUUID } from 'crypto';

const generateRefId = () => `${Date.now().toString(36)}_${randomUUID()}`;

export const mockServerCollRequestExample = (
  collectionName: string = 'Hoppscotch API Mock example',
) => {
  const baseEnv = '<<mockUrl>>';
  return [
    {
      v: 10,
      name: collectionName,
      folders: [],
      requests: [
        {
          v: '16',
          _ref_id: `req_${generateRefId()}`,
          name: 'addPet',
          method: 'POST',
          endpoint: baseEnv + '/v2/pet',
          params: [],
          headers: [],
          auth: {
            authType: 'oauth-2',
            authActive: true,
            grantTypeInfo: {
              authEndpoint: baseEnv + '/oauth/authorize',
              clientID: '',
              grantType: 'IMPLICIT',
              scopes: 'write:pets read:pets',
              token: '',
              authRequestParams: [],
              refreshRequestParams: [],
            },
            addTo: 'HEADERS',
          },
          body: {
            contentType: 'application/json',
            body: '{\n\t"id": 1,\n\t"category": {\n\t\t"id": 1,\n\t\t"name": "string"\n\t},\n\t"name": "doggie",\n\t"photoUrls": [\n\t\t"string"\n\t],\n\t"tags": [],\n\t"status": "available"\n}',
          },
          preRequestScript: '',
          testScript: '',
          requestVariables: [],
          responses: {
            'Invalid input': {
              name: 'Invalid input',
              status: 'Method Not Allowed',
              code: 405,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'addPet',
                auth: {
                  authType: 'oauth-2',
                  authActive: true,
                  grantTypeInfo: {
                    authEndpoint: baseEnv + '/oauth/authorize',
                    clientID: '',
                    grantType: 'IMPLICIT',
                    scopes: 'write:pets read:pets',
                    token: '',
                    authRequestParams: [],
                    refreshRequestParams: [],
                  },
                  addTo: 'HEADERS',
                },
                body: {
                  contentType: 'application/json',
                  body: '{\n\t"id": 1,\n\t"category": {\n\t\t"id": 1,\n\t\t"name": "string"\n\t},\n\t"name": "doggie",\n\t"photoUrls": [\n\t\t"string"\n\t],\n\t"tags": [],\n\t"status": "available"\n}',
                },
                endpoint: baseEnv + '/v2/pet',
                params: [],
                headers: [],
                method: 'POST',
                requestVariables: [],
              },
            },
          },
        },
        {
          v: '16',
          _ref_id: `req_${generateRefId()}`,
          name: 'updatePet',
          method: 'PUT',
          endpoint: baseEnv + '/v2/pet',
          params: [],
          headers: [],
          auth: {
            authType: 'oauth-2',
            authActive: true,
            grantTypeInfo: {
              authEndpoint: baseEnv + '/oauth/authorize',
              clientID: '',
              grantType: 'IMPLICIT',
              scopes: 'write:pets read:pets',
              token: '',
              authRequestParams: [],
              refreshRequestParams: [],
            },
            addTo: 'HEADERS',
          },
          body: {
            contentType: 'application/json',
            body: '{\n\t"id": 1,\n\t"category": {\n\t\t"id": 1,\n\t\t"name": "string"\n\t},\n\t"name": "doggie",\n\t"photoUrls": [\n\t\t"string"\n\t],\n\t"tags": [],\n\t"status": "available"\n}',
          },
          preRequestScript: '',
          testScript: '',
          requestVariables: [],
          responses: {
            'Invalid ID supplied': {
              name: 'Invalid ID supplied',
              status: 'Bad Request',
              code: 400,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'updatePet',
                auth: {
                  authType: 'oauth-2',
                  authActive: true,
                  grantTypeInfo: {
                    authEndpoint: baseEnv + '/oauth/authorize',
                    clientID: '',
                    grantType: 'IMPLICIT',
                    scopes: 'write:pets read:pets',
                    token: '',
                    authRequestParams: [],
                    refreshRequestParams: [],
                  },
                  addTo: 'HEADERS',
                },
                body: {
                  contentType: 'application/json',
                  body: '{\n\t"id": 1,\n\t"category": {\n\t\t"id": 1,\n\t\t"name": "string"\n\t},\n\t"name": "doggie",\n\t"photoUrls": [\n\t\t"string"\n\t],\n\t"tags": [],\n\t"status": "available"\n}',
                },
                endpoint: baseEnv + '/v2/pet',
                params: [],
                headers: [],
                method: 'PUT',
                requestVariables: [],
              },
            },
            'Pet not found': {
              name: 'Pet not found',
              status: 'Not Found',
              code: 404,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'updatePet',
                auth: {
                  authType: 'oauth-2',
                  authActive: true,
                  grantTypeInfo: {
                    authEndpoint: baseEnv + '/oauth/authorize',
                    clientID: '',
                    grantType: 'IMPLICIT',
                    scopes: 'write:pets read:pets',
                    token: '',
                    authRequestParams: [],
                    refreshRequestParams: [],
                  },
                  addTo: 'HEADERS',
                },
                body: {
                  contentType: 'application/json',
                  body: '{\n\t"id": 1,\n\t"category": {\n\t\t"id": 1,\n\t\t"name": "string"\n\t},\n\t"name": "doggie",\n\t"photoUrls": [\n\t\t"string"\n\t],\n\t"tags": [],\n\t"status": "available"\n}',
                },
                endpoint: baseEnv + '/v2/pet',
                params: [],
                headers: [],
                method: 'PUT',
                requestVariables: [],
              },
            },
            'Validation exception': {
              name: 'Validation exception',
              status: 'Method Not Allowed',
              code: 405,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'updatePet',
                auth: {
                  authType: 'oauth-2',
                  authActive: true,
                  grantTypeInfo: {
                    authEndpoint: baseEnv + '/oauth/authorize',
                    clientID: '',
                    grantType: 'IMPLICIT',
                    scopes: 'write:pets read:pets',
                    token: '',
                    authRequestParams: [],
                    refreshRequestParams: [],
                  },
                  addTo: 'HEADERS',
                },
                body: {
                  contentType: 'application/json',
                  body: '{\n\t"id": 1,\n\t"category": {\n\t\t"id": 1,\n\t\t"name": "string"\n\t},\n\t"name": "doggie",\n\t"photoUrls": [\n\t\t"string"\n\t],\n\t"tags": [],\n\t"status": "available"\n}',
                },
                endpoint: baseEnv + '/v2/pet',
                params: [],
                headers: [],
                method: 'PUT',
                requestVariables: [],
              },
            },
          },
        },
        {
          v: '16',
          _ref_id: `req_${generateRefId()}`,
          name: 'findPetsByStatus',
          method: 'GET',
          endpoint: baseEnv + '/v2/pet/findByStatus',
          params: [
            {
              key: 'status',
              value: '',
              active: true,
              description:
                'Status values that need to be considered for filter',
            },
          ],
          headers: [],
          auth: {
            authType: 'oauth-2',
            authActive: true,
            grantTypeInfo: {
              authEndpoint: baseEnv + '/oauth/authorize',
              clientID: '',
              grantType: 'IMPLICIT',
              scopes: 'write:pets read:pets',
              token: '',
              authRequestParams: [],
              refreshRequestParams: [],
            },
            addTo: 'HEADERS',
          },
          body: {
            contentType: null,
            body: null,
          },
          preRequestScript: '',
          testScript: '',
          requestVariables: [],
          responses: {
            'successful operation': {
              name: 'successful operation',
              status: 'OK',
              code: 200,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'findPetsByStatus',
                auth: {
                  authType: 'oauth-2',
                  authActive: true,
                  grantTypeInfo: {
                    authEndpoint: baseEnv + '/oauth/authorize',
                    clientID: '',
                    grantType: 'IMPLICIT',
                    scopes: 'write:pets read:pets',
                    token: '',
                    authRequestParams: [],
                    refreshRequestParams: [],
                  },
                  addTo: 'HEADERS',
                },
                body: {
                  contentType: null,
                  body: null,
                },
                endpoint: 'petstore.swagger.io/v2/pet/findByStatus',
                params: [
                  {
                    key: 'status',
                    value: '',
                    active: true,
                    description:
                      'Status values that need to be considered for filter',
                  },
                ],
                headers: [],
                method: 'GET',
                requestVariables: [],
              },
            },
            'Invalid status value': {
              name: 'Invalid status value',
              status: 'Bad Request',
              code: 400,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'findPetsByStatus',
                auth: {
                  authType: 'oauth-2',
                  authActive: true,
                  grantTypeInfo: {
                    authEndpoint: baseEnv + '/oauth/authorize',
                    clientID: '',
                    grantType: 'IMPLICIT',
                    scopes: 'write:pets read:pets',
                    token: '',
                    authRequestParams: [],
                    refreshRequestParams: [],
                  },
                  addTo: 'HEADERS',
                },
                body: {
                  contentType: null,
                  body: null,
                },
                endpoint: 'petstore.swagger.io/v2/pet/findByStatus',
                params: [
                  {
                    key: 'status',
                    value: '',
                    active: true,
                    description:
                      'Status values that need to be considered for filter',
                  },
                ],
                headers: [],
                method: 'GET',
                requestVariables: [],
              },
            },
          },
        },
        {
          v: '16',
          _ref_id: `req_${generateRefId()}`,
          name: 'getPetById',
          method: 'GET',
          endpoint: baseEnv + '/v2/pet/<<petId>>',
          params: [],
          headers: [],
          auth: {
            authType: 'api-key',
            addTo: 'HEADERS',
            authActive: true,
            key: 'api_key',
            value: '',
          },
          body: {
            contentType: null,
            body: null,
          },
          preRequestScript: '',
          testScript: '',
          requestVariables: [
            {
              key: 'petId',
              value: '',
              active: true,
            },
          ],
          responses: {
            'successful operation': {
              name: 'successful operation',
              status: 'OK',
              code: 200,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'getPetById',
                auth: {
                  authType: 'api-key',
                  addTo: 'HEADERS',
                  authActive: true,
                  key: 'api_key',
                  value: '',
                },
                body: {
                  contentType: null,
                  body: null,
                },
                endpoint: 'petstore.swagger.io/v2/pet/<<petId>>',
                params: [],
                headers: [],
                method: 'GET',
                requestVariables: [
                  {
                    key: 'petId',
                    value: '',
                    active: true,
                  },
                ],
              },
            },
            'Invalid ID supplied': {
              name: 'Invalid ID supplied',
              status: 'Bad Request',
              code: 400,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'getPetById',
                auth: {
                  authType: 'api-key',
                  addTo: 'HEADERS',
                  authActive: true,
                  key: 'api_key',
                  value: '',
                },
                body: {
                  contentType: null,
                  body: null,
                },
                endpoint: 'petstore.swagger.io/v2/pet/<<petId>>',
                params: [],
                headers: [],
                method: 'GET',
                requestVariables: [
                  {
                    key: 'petId',
                    value: '',
                    active: true,
                  },
                ],
              },
            },
            'Pet not found': {
              name: 'Pet not found',
              status: 'Not Found',
              code: 404,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'getPetById',
                auth: {
                  authType: 'api-key',
                  addTo: 'HEADERS',
                  authActive: true,
                  key: 'api_key',
                  value: '',
                },
                body: {
                  contentType: null,
                  body: null,
                },
                endpoint: 'petstore.swagger.io/v2/pet/<<petId>>',
                params: [],
                headers: [],
                method: 'GET',
                requestVariables: [
                  {
                    key: 'petId',
                    value: '',
                    active: true,
                  },
                ],
              },
            },
          },
        },
        {
          v: '16',
          _ref_id: `req_${generateRefId()}`,
          name: 'updatePetWithForm',
          method: 'POST',
          endpoint: baseEnv + '/v2/pet/<<petId>>',
          params: [],
          headers: [],
          auth: {
            authType: 'oauth-2',
            authActive: true,
            grantTypeInfo: {
              authEndpoint: baseEnv + '/oauth/authorize',
              clientID: '',
              grantType: 'IMPLICIT',
              scopes: 'write:pets read:pets',
              token: '',
              authRequestParams: [],
              refreshRequestParams: [],
            },
            addTo: 'HEADERS',
          },
          body: {
            contentType: 'application/x-www-form-urlencoded',
            body: 'name: \nstatus: ',
          },
          preRequestScript: '',
          testScript: '',
          requestVariables: [
            {
              key: 'petId',
              value: '',
              active: true,
            },
          ],
          responses: {
            'Invalid input': {
              name: 'Invalid input',
              status: 'Method Not Allowed',
              code: 405,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'updatePetWithForm',
                auth: {
                  authType: 'oauth-2',
                  authActive: true,
                  grantTypeInfo: {
                    authEndpoint: baseEnv + '/oauth/authorize',
                    clientID: '',
                    grantType: 'IMPLICIT',
                    scopes: 'write:pets read:pets',
                    token: '',
                    authRequestParams: [],
                    refreshRequestParams: [],
                  },
                  addTo: 'HEADERS',
                },
                body: {
                  contentType: 'application/x-www-form-urlencoded',
                  body: 'name: \nstatus: ',
                },
                endpoint: 'petstore.swagger.io/v2/pet/<<petId>>',
                params: [],
                headers: [],
                method: 'POST',
                requestVariables: [
                  {
                    key: 'petId',
                    value: '',
                    active: true,
                  },
                ],
              },
            },
          },
        },
        {
          v: '16',
          _ref_id: `req_${generateRefId()}`,
          name: 'deletePet',
          method: 'DELETE',
          endpoint: baseEnv + '/v2/pet/<<petId>>',
          params: [],
          headers: [
            {
              key: 'api_key',
              value: '',
              active: true,
              description: '',
            },
          ],
          auth: {
            authType: 'oauth-2',
            authActive: true,
            grantTypeInfo: {
              authEndpoint: baseEnv + '/oauth/authorize',
              clientID: '',
              grantType: 'IMPLICIT',
              scopes: 'write:pets read:pets',
              token: '',
              authRequestParams: [],
              refreshRequestParams: [],
            },
            addTo: 'HEADERS',
          },
          body: {
            contentType: null,
            body: null,
          },
          preRequestScript: '',
          testScript: '',
          requestVariables: [
            {
              key: 'petId',
              value: '',
              active: true,
            },
          ],
          responses: {
            'Invalid ID supplied': {
              name: 'Invalid ID supplied',
              status: 'Bad Request',
              code: 400,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'deletePet',
                auth: {
                  authType: 'oauth-2',
                  authActive: true,
                  grantTypeInfo: {
                    authEndpoint: baseEnv + '/oauth/authorize',
                    clientID: '',
                    grantType: 'IMPLICIT',
                    scopes: 'write:pets read:pets',
                    token: '',
                    authRequestParams: [],
                    refreshRequestParams: [],
                  },
                  addTo: 'HEADERS',
                },
                body: {
                  contentType: null,
                  body: null,
                },
                endpoint: 'petstore.swagger.io/v2/pet/<<petId>>',
                params: [],
                headers: [
                  {
                    key: 'api_key',
                    value: '',
                    active: true,
                    description: '',
                  },
                ],
                method: 'DELETE',
                requestVariables: [
                  {
                    key: 'petId',
                    value: '',
                    active: true,
                  },
                ],
              },
            },
            'Pet not found': {
              name: 'Pet not found',
              status: 'Not Found',
              code: 404,
              headers: [
                {
                  key: 'content-type',
                  value: 'application/json',
                  description: '',
                  active: true,
                },
              ],
              body: '',
              originalRequest: {
                v: '6',
                name: 'deletePet',
                auth: {
                  authType: 'oauth-2',
                  authActive: true,
                  grantTypeInfo: {
                    authEndpoint: baseEnv + '/oauth/authorize',
                    clientID: '',
                    grantType: 'IMPLICIT',
                    scopes: 'write:pets read:pets',
                    token: '',
                    authRequestParams: [],
                    refreshRequestParams: [],
                  },
                  addTo: 'HEADERS',
                },
                body: {
                  contentType: null,
                  body: null,
                },
                endpoint: 'petstore.swagger.io/v2/pet/<<petId>>',
                params: [],
                headers: [
                  {
                    key: 'api_key',
                    value: '',
                    active: true,
                    description: '',
                  },
                ],
                method: 'DELETE',
                requestVariables: [
                  {
                    key: 'petId',
                    value: '',
                    active: true,
                  },
                ],
              },
            },
          },
        },
      ],
      data: {
        auth: {
          authType: 'inherit',
          authActive: true,
        },
        headers: [],
        _ref_id: `coll_${generateRefId()}`,
      },
    },
  ];
};
