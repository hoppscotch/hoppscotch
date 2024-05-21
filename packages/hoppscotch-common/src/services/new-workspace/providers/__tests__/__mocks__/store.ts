import { HoppCollection, getDefaultRESTRequest } from "@hoppscotch/data"

enum MoveRestRequestActions {
  TOP_LEVEL_COLLECTIONS = "TOP_LEVEL_COLLECTIONS",
  DEEPLY_NESTED_COLLECTIONS = "DEEPLY_NESTED_COLLECTIONS",
}

enum ReorderRestRequestActions {
  DESTINATION_ABOVE = "DESTINATION_ABOVE",
  DESTINATION_BELOW = "DESTINATION_BELOW",
}

enum ReorderRestCollectionActions {
  DESTINATION_ABOVE = "DESTINATION_ABOVE",
  DESTINATION_BELOW = "DESTINATION_BELOW",
}

enum MoveRestCollectionActions {
  DESTINATION_ROOT = "DESTINATION_ROOT",
  BETWEEN_DEEPLY_NESTED_COLLECTIONS = "BETWEEN_DEEPLY_NESTED_COLLECTIONS",
  SIBLING_COLLECTION_BELOW_SAME_LEVEL = "SIBLING_COLLECTION_BELOW_SAME_LEVEL",
  SIBLING_COLLECTION_BELOW_NESTED_LEVEL = "SIBLING_COLLECTION_BELOW_NESTED_LEVEL",
}

const defaultRESTRequest = getDefaultRESTRequest()

export const MOVE_REST_REQUEST: Record<
  MoveRestRequestActions,
  HoppCollection[]
> = {
  [MoveRestRequestActions.TOP_LEVEL_COLLECTIONS]: [
    {
      v: 2,
      folders: [],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-0",
      id: "clw90c6wo008juuv7pmxbldtg",
    },
    {
      v: 2,
      folders: [],
      requests: Array.from({ length: 6 }, (_, idx) => ({
        ...defaultRESTRequest,
        name: `req-1/${idx}`,
      })),
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-1",
      id: "clw90c8h3008kuuv7w5ssmxsp",
    },
    {
      v: 2,
      folders: [],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-2",
      id: "clw90ca5u008luuv7voy2npwr",
    },
    {
      name: "coll-3",
      folders: [],
      requests: Array.from({ length: 3 }, (_, idx) => ({
        ...defaultRESTRequest,
        name: `req-3/${idx}`,
      })),
      v: 2,
      auth: {
        authType: "inherit",
        authActive: false,
      },
      headers: [],
      id: "clw90cbsn008muuv70vf8a2t3",
    },
    {
      v: 2,
      folders: [],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-4",
      id: "clw90cd5c008nuuv7oh2ut1lt",
    },
  ],
  [MoveRestRequestActions.DEEPLY_NESTED_COLLECTIONS]: [
    {
      id: "clw97umg70016if3uju9s8748",
      v: 2,
      name: "coll-007",
      folders: [
        {
          id: "clw97uoyy0017if3u9kmycozq",
          v: 2,
          name: "coll-1",
          folders: [
            {
              id: "clw97v5re0018if3uqbvqpxdr",
              v: 2,
              name: "coll-2",
              folders: [
                {
                  id: "clw97v7mj0019if3uo2ed0r7v",
                  v: 2,
                  name: "coll-3",
                  folders: [
                    {
                      id: "clw97vdwh001aif3uqg5knud8",
                      v: 2,
                      name: "coll-4",
                      folders: [],
                      requests: Array.from({ length: 4 }, (_, idx) => ({
                        ...defaultRESTRequest,
                        name: `req-0/0/0/0/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: [],
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                },
              ],
              requests: [],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: [],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
      ],
      requests: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      headers: [],
    },
    {
      id: "clw97w6sv001bif3uh5bqh3aa",
      v: 2,
      name: "coll-5",
      folders: [
        {
          id: "clw97w99n001cif3uin46cvb5",
          v: 2,
          name: "coll-6",
          folders: [
            {
              id: "clw97wbqu001dif3utkqoha71",
              v: 2,
              name: "coll-7",
              folders: [
                {
                  id: "clw97xjps001gif3ule83c0zf",
                  v: 2,
                  name: "coll-8",
                  folders: [],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...defaultRESTRequest,
                    name: `req-1/0/0/0/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: false,
                  },
                  headers: [],
                },
              ],
              requests: [],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: [],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
      ],
      requests: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      headers: [],
    },
  ],
}

export const REORDER_REST_REQUEST: Record<
  ReorderRestRequestActions,
  HoppCollection[]
> = {
  [ReorderRestRequestActions.DESTINATION_ABOVE]: [
    {
      v: 2,
      folders: [
        {
          v: 2,
          folders: [
            {
              v: 2,
              folders: [],
              requests: Array.from({ length: 10 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/0/0/${idx}`,
              })),
              headers: [],
              auth: {
                authType: "inherit",
                authActive: false,
              },
              name: "coll-0/0/0",
              id: "clw90c6wo008juuv7pmxbldtg",
            },
          ],
          requests: [],
          headers: [],
          auth: {
            authType: "inherit",
            authActive: false,
          },
          name: "coll-0/0",
          id: "clw90c6wo008juuv7pmxbldtg",
        },
      ],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-0",
      id: "clw90c6wo008juuv7pmxbldtg",
    },
  ],
  [ReorderRestRequestActions.DESTINATION_BELOW]: [
    {
      v: 2,
      folders: [
        {
          v: 2,
          folders: [
            {
              v: 2,
              folders: [],
              requests: Array.from({ length: 10 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/0/0/${idx}`,
              })),
              headers: [],
              auth: {
                authType: "inherit",
                authActive: false,
              },
              name: "coll-0/0/0",
              id: "clw90c6wo008juuv7pmxbldtg",
            },
          ],
          requests: [],
          headers: [],
          auth: {
            authType: "inherit",
            authActive: false,
          },
          name: "coll-0/0",
          id: "clw90c6wo008juuv7pmxbldtg",
        },
      ],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-0",
      id: "clw90c6wo008juuv7pmxbldtg",
    },
  ],
}

export const REORDER_REST_COLLECTION: Record<
  ReorderRestCollectionActions,
  HoppCollection[]
> = {
  [ReorderRestCollectionActions.DESTINATION_ABOVE]: [
    {
      v: 2,
      name: "coll-0",
      id: "clw90c6wo008juuv7pmxbldtg",
      folders: [
        {
          v: 2,
          name: "coll-0/0",
          id: "clw90c6wo008juuv7pmxbldtg",
          folders: [
            {
              v: 2,
              name: "coll-0/0/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/0/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/0/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: false,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-0/1",
          folders: [
            {
              v: 2,
              name: "coll-0/1/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/1/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/1/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-0/2",
          folders: [
            {
              v: 2,
              name: "coll-0/2/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/2/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/2/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-0/3",
          folders: [
            {
              v: 2,
              name: "coll-0/3/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/3/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/3/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-0/4",
          folders: [
            {
              v: 2,
              name: "coll-0/4/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/4/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/4/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
      ],
      requests: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      headers: [],
    },
  ],
  [ReorderRestCollectionActions.DESTINATION_BELOW]: [
    {
      v: 2,
      name: "coll-0",
      id: "clw90c6wo008juuv7pmxbldtg",
      folders: [
        {
          v: 2,
          name: "coll-0/0",
          id: "clw90c6wo008juuv7pmxbldtg",
          folders: [
            {
              v: 2,
              name: "coll-0/0/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/0/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/0/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: false,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-0/1",
          folders: [
            {
              v: 2,
              name: "coll-0/1/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/1/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/1/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-0/2",
          folders: [
            {
              v: 2,
              name: "coll-0/2/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/2/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/2/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-0/3",
          folders: [
            {
              v: 2,
              name: "coll-0/3/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/3/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/3/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-0/4",
          folders: [
            {
              v: 2,
              name: "coll-0/4/0",
              folders: [],
              requests: Array.from({ length: 2 }, (_, idx) => ({
                ...defaultRESTRequest,
                name: `req-0/4/0/${idx}`,
              })),
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: Array.from({ length: 2 }, (_, idx) => ({
            ...defaultRESTRequest,
            name: `req-0/4/${idx}`,
          })),
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
      ],
      requests: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      headers: [],
    },
  ],
}

export const MOVE_REST_COLLECTION: Record<
  MoveRestCollectionActions,
  HoppCollection[]
> = {
  [MoveRestCollectionActions.DESTINATION_ROOT]: [
    {
      v: 2,
      folders: [],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-0",
    },
    {
      v: 2,
      folders: [
        {
          v: 2,
          name: "coll-1/0",
          folders: [
            {
              v: 2,
              name: "coll-1/0/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-1/0/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-1/0/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-1/1",
          folders: [
            {
              v: 2,
              name: "coll-1/1/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-1/1/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-1/1/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
        {
          v: 2,
          name: "coll-1/2",
          folders: [
            {
              v: 2,
              name: "coll-1/2/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-1/2/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-1/2/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
        },
      ],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-1",
    },
    {
      v: 2,
      folders: [],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-2",
    },
  ],
  [MoveRestCollectionActions.BETWEEN_DEEPLY_NESTED_COLLECTIONS]: [
    {
      v: 2,
      folders: [
        {
          v: 2,
          name: "coll-0/0",
          folders: [
            {
              v: 2,
              name: "coll-0/0/0",
              folders: [
                {
                  v: 2,
                  name: "coll-0/0/0/0",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/0/0/0/0",
                      folders: [
                        {
                          v: 2,
                          name: "coll-0/0/0/0/0/0",
                          folders: [],
                          requests: [
                            {
                              ...defaultRESTRequest,
                              name: "req-0/0/0/0/0/0/0",
                            },
                          ],
                          auth: {
                            authType: "inherit",
                            authActive: true,
                          },
                          headers: [],
                          id: "clwfzr4830009j6931fwbbccq",
                        },
                      ],
                      requests: [
                        {
                          ...defaultRESTRequest,
                          name: "req-0/0/0/0/0/0",
                        },
                      ],
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                      id: "clwfzps9q0004j693gz5rmcir",
                    },
                    {
                      v: 2,
                      name: "coll-0/0/0/0/1",
                      folders: [
                        {
                          v: 2,
                          name: "coll-0/0/0/0/1/0",
                          folders: [],
                          requests: [
                            {
                              ...defaultRESTRequest,
                              name: "req-0/0/0/0/1/0/0",
                            },
                          ],
                          auth: {
                            authType: "inherit",
                            authActive: true,
                          },
                          headers: [],
                          id: "clwfzrthf000cj693u2f80w72",
                        },
                      ],
                      requests: [
                        {
                          ...defaultRESTRequest,
                          name: "req-0/0/0/0/1/0",
                        },
                      ],
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                      id: "clwfzpxku0005j693b6blhz32",
                    },
                    {
                      v: 2,
                      name: "coll-0/0/0/0/2",
                      folders: [
                        {
                          v: 2,
                          name: "coll-0/0/0/0/2/0",
                          folders: [],
                          requests: [
                            {
                              ...defaultRESTRequest,
                              name: "req-0/0/0/0/2/0/0",
                            },
                          ],
                          auth: {
                            authType: "inherit",
                            authActive: true,
                          },
                          headers: [],
                          id: "clwfztkwp000hj693hgdr29gf",
                        },
                      ],
                      requests: [
                        {
                          ...defaultRESTRequest,
                          name: "req-0/0/0/0/2/0",
                        },
                      ],
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                      id: "clwfzq42m0006j693tilh2546",
                    },
                  ],
                  requests: [],
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                  id: "clwfzodyf0003j693bx0gxbvo",
                },
              ],
              requests: [],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwfzo8w60002j6933trvyy1q",
            },
          ],
          requests: [],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwfznvpg0001j6931q1k4g0s",
        },
      ],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-0",
      id: "clwfznrsj0000j693uu0s2ahu",
    },
    {
      name: "coll-1",
      folders: [
        {
          v: 2,
          name: "coll-1/0",
          folders: [
            {
              v: 2,
              name: "coll-1/0/0",
              folders: [
                {
                  v: 2,
                  name: "coll-1/0/0/0",
                  folders: [
                    {
                      v: 2,
                      name: "coll-1/0/0/0/0",
                      folders: [
                        {
                          v: 2,
                          name: "coll-1/0/0/0/0/0",
                          folders: [],
                          requests: [
                            {
                              ...defaultRESTRequest,
                              name: "req-1/0/0/0/0/0/0",
                            },
                          ],
                          auth: {
                            authType: "inherit",
                            authActive: true,
                          },
                          headers: [],
                          id: "clwfzx92e000tj693usdgp2lk",
                        },
                      ],
                      requests: [
                        {
                          ...defaultRESTRequest,
                          name: "req-1/0/0/0/0/0",
                        },
                      ],
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                      id: "clwfzwjob000qj693clnrfksq",
                    },
                  ],
                  requests: [],
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                  id: "clwfzw238000pj693opnx5tsg",
                },
              ],
              requests: [],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwfzvhmu000oj693yr6yqw80",
            },
          ],
          requests: [],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwfzvb98000nj693xlddf6yr",
        },
      ],
      requests: [],
      v: 2,
      auth: {
        authType: "inherit",
        authActive: false,
      },
      headers: [],
      id: "clwfzv7fm000mj6932edgzxt7",
    },
  ],
  [MoveRestCollectionActions.SIBLING_COLLECTION_BELOW_SAME_LEVEL]: [
    {
      v: 2,
      folders: [
        {
          v: 2,
          name: "coll-0/0",
          folders: [
            {
              v: 2,
              name: "coll-0/0/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/0/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwg32lj70017j6938n50ea4i",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/0/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwg31lun0010j693h09u6clv",
        },
        {
          v: 2,
          name: "coll-0/1",
          folders: [
            {
              v: 2,
              name: "coll-0/1/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/1/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwg32wxq001cj693zpntqa6w",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/1/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwg31qvy0011j693aysi78il",
        },
        {
          v: 2,
          name: "coll-0/2",
          folders: [
            {
              v: 2,
              name: "coll-0/2/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/2/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwg33mb8001hj693ki3vs88b",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/2/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwg31t9u0012j693a6vqbifk",
        },
        {
          v: 2,
          name: "coll-0/3",
          folders: [
            {
              v: 2,
              name: "coll-0/3/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/3/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwg34j2r001mj693v66z9nxv",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/3/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwg31w9l0013j693yxfo0522",
        },
        {
          v: 2,
          name: "coll-0/4",
          folders: [
            {
              v: 2,
              name: "coll-0/4/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/4/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwg3508b001rj693b6c3k9w3",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/4/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwg31z0u0014j693fvhasr2z",
        },
      ],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-0",
      id: "clwg30lvk000zj6934x3wlvzc",
    },
  ],
  [MoveRestCollectionActions.SIBLING_COLLECTION_BELOW_NESTED_LEVEL]: [
    {
      v: 2,
      folders: [
        {
          v: 2,
          name: "coll-0/0",
          folders: [
            {
              v: 2,
              name: "coll-0/0/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/0/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwgmobr4000z58vko4ioi4if",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/0/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwgmmwlw000m58vk2xgdlt4b",
        },
        {
          v: 2,
          name: "coll-0/1",
          folders: [
            {
              v: 2,
              name: "coll-0/1/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/1/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwgmojqc001258vk7rbuzzl8",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/1/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwgmn0gu000n58vkjkycpckl",
        },
        {
          v: 2,
          name: "coll-0/2",
          folders: [
            {
              v: 2,
              name: "coll-0/2/0",
              folders: [
                {
                  v: 2,
                  name: "coll-0/2/0/0",
                  folders: [],
                  requests: [],
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                  id: "clwgmnsf5000s58vkzph0awgx",
                },
              ],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/2/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwgmnmk2000r58vkq5tx6pwn",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/2/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwgmn429000o58vkw6d3ewq8",
        },
        {
          v: 2,
          name: "coll-0/3",
          folders: [
            {
              v: 2,
              name: "coll-0/3/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/3/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwgmre50001b58vkj3usu8or",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/3/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwgmn6sj000p58vkpwvz6d0e",
        },
        {
          v: 2,
          name: "coll-0/4",
          folders: [
            {
              v: 2,
              name: "coll-0/4/0/0",
              folders: [],
              requests: [
                {
                  ...defaultRESTRequest,
                  name: "req-0/4/0/0",
                },
              ],
              auth: {
                authType: "inherit",
                authActive: true,
              },
              headers: [],
              id: "clwgmrt0e001g58vk87h4s8nx",
            },
          ],
          requests: [
            {
              ...defaultRESTRequest,
              name: "req-0/4/0",
            },
          ],
          auth: {
            authType: "inherit",
            authActive: true,
          },
          headers: [],
          id: "clwgmne6o000q58vk06cn5mco",
        },
      ],
      requests: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: false,
      },
      name: "coll-0",
      id: "clwgmmt01000l58vkv67duhjz",
    },
  ],
}
