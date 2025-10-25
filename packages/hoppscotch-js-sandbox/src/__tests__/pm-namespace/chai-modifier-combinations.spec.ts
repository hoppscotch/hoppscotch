import { describe, expect, test } from "vitest"
import { TestResponse } from "~/types"
import { runTest } from "~/utils/test-helpers"

const mockResponse: TestResponse = {
  status: 200,
  statusText: "OK",
  responseTime: 0,
  body: "OK",
  headers: [],
}

describe("Chai Edge Cases - .include.members() / .contain.members() Pattern", () => {
  test("should support .include.members() for subset matching", async () => {
    const testScript = `
      pm.test("include.members subset", () => {
        pm.expect([1, 2, 3, 4]).to.include.members([1, 2]);
        pm.expect([1, 2, 3, 4]).to.contain.members([3, 4]);
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "include.members subset",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .have.members() for exact matching", async () => {
    const testScript = `
      pm.test("exact members", () => {
        pm.expect([1, 2, 3]).to.have.members([1, 2, 3]);
        pm.expect([1, 2, 3]).to.have.members([3, 2, 1]); // Order doesn't matter
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "exact members",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("hopp namespace should support include.members", async () => {
    const testScript = `
      hopp.test("hopp include.members", () => {
        hopp.expect([1, 2, 3, 4]).to.include.members([2, 3]);
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "hopp include.members",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Chai Edge Cases - .any.keys() / .all.keys() Patterns", () => {
  test("should support .any.keys() - at least one key matches", async () => {
    const testScript = `
      pm.test("any.keys pattern", () => {
        const obj = { a: 1, b: 2, c: 3 };
        pm.expect(obj).to.have.any.keys('a', 'b');  // Has both
        pm.expect(obj).to.have.any.keys('a', 'z');  // Has at least one (a)
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "any.keys pattern",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .all.keys() - must have exactly these keys", async () => {
    const testScript = `
      pm.test("all.keys pattern", () => {
        const obj = { a: 1, b: 2 };
        pm.expect(obj).to.have.all.keys('a', 'b');  // Exact match
        pm.expect(obj).to.have.keys('a', 'b');      // Default is .all
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "all.keys pattern",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should fail when .any.keys() has no matching keys", async () => {
    const testScript = `
      pm.test("any.keys failure", () => {
        const obj = { a: 1, b: 2 };
        pm.expect(obj).to.have.any.keys('x', 'y', 'z');  // None match
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "any.keys failure",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "fail" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Chai Edge Cases - .ordered.members() Pattern", () => {
  test("should support .ordered.members() - order matters", async () => {
    const testScript = `
      pm.test("ordered.members", () => {
        pm.expect([1, 2, 3]).to.have.ordered.members([1, 2, 3]);
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "ordered.members",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should fail .ordered.members() when order is wrong", async () => {
    const testScript = `
      pm.test("ordered.members wrong order", () => {
        pm.expect([1, 2, 3]).to.have.ordered.members([3, 2, 1]);
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "ordered.members wrong order",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "fail" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Chai Edge Cases - .own.include() Pattern", () => {
  test("should support .own.include() - own properties only", async () => {
    const testScript = `
      pm.test("own.include", () => {
        const obj = Object.create({ inherited: 'value' });
        obj.own = 'ownValue';

        pm.expect(obj).to.have.own.include({ own: 'ownValue' });
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "own.include",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should fail .own.include() for inherited properties", async () => {
    const testScript = `
      pm.test("own.include excludes inherited", () => {
        const obj = Object.create({ inherited: 'value' });
        obj.own = 'ownValue';

        // This should fail because 'inherited' is not an own property
        pm.expect(obj).to.have.own.include({ inherited: 'value' });
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "own.include excludes inherited",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "fail" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Chai Edge Cases - .nested.include() Pattern", () => {
  test("should support .nested.include() - dot notation for nested properties", async () => {
    const testScript = `
      pm.test("nested.include", () => {
        const obj = {
          user: {
            name: 'John',
            address: {
              city: 'NYC'
            }
          }
        };

        pm.expect(obj).to.nested.include({ 'user.name': 'John' });
        pm.expect(obj).to.nested.include({ 'user.address.city': 'NYC' });
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "nested.include",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .nested.include() with bracket notation", async () => {
    const testScript = `
      pm.test("nested.include bracket notation", () => {
        const obj = {
          'user.name': 'Alice',  // Literal key with dot
          user: { name: 'Bob' }
        };

        // Bracket notation for literal key with dot
        pm.expect(obj).to.nested.include({ '["user.name"]': 'Alice' });
        // Dot notation for nested property
        pm.expect(obj).to.nested.include({ 'user.name': 'Bob' });
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "nested.include bracket notation",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Chai Edge Cases - Modifier Combinations", () => {
  test("should support .deep.own.include() - stacked modifiers", async () => {
    const testScript = `
      pm.test("deep.own.include", () => {
        const obj = Object.create({ inherited: { a: 1 } });
        obj.own = { b: 2 };

        pm.expect(obj).to.have.deep.own.include({ own: { b: 2 } });
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "deep.own.include",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .deep.equal() - deep equality check", async () => {
    const testScript = `
      pm.test("deep.equal", () => {
        const obj1 = { a: { b: { c: 1 } } };
        const obj2 = { a: { b: { c: 1 } } };

        pm.expect(obj1).to.deep.equal(obj2);
        pm.expect(obj1).to.eql(obj2);  // eql is alias for deep.equal
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "deep.equal",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .deep.nested.include() - multiple modifiers", async () => {
    const testScript = `
      pm.test("deep.nested.include", () => {
        const obj = {
          user: {
            profile: {
              settings: { theme: 'dark', notifications: true }
            }
          }
        };

        pm.expect(obj).to.deep.nested.include({
          'user.profile.settings': { theme: 'dark', notifications: true }
        });
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "deep.nested.include",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Chai Edge Cases - .ownPropertyDescriptor() with Chaining", () => {
  test("should support chaining after .ownPropertyDescriptor()", async () => {
    const testScript = `
      pm.test("ownPropertyDescriptor chaining", () => {
        const obj = {};
        Object.defineProperty(obj, 'foo', {
          value: 42,
          writable: false,
          enumerable: true,
          configurable: false
        });

        pm.expect(obj).to.have.ownPropertyDescriptor('foo')
          .that.has.property('enumerable', true);

        pm.expect(obj).to.have.ownPropertyDescriptor('foo')
          .that.has.property('writable', false);
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "ownPropertyDescriptor chaining",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Chai Edge Cases - .respondTo() with .itself", () => {
  test("should support .itself.respondTo() for function methods", async () => {
    const testScript = `
      pm.test("itself.respondTo", () => {
        function MyFunc() {}
        MyFunc.staticMethod = function() {};

        // Check that the function itself has the method
        pm.expect(MyFunc).itself.to.respondTo('staticMethod');
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "itself.respondTo",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Chai Edge Cases - Real-World Patterns", () => {
  test("should handle complex nested assertions from API responses", async () => {
    const jsonResponse: TestResponse = {
      status: 200,
      statusText: "OK",
      responseTime: 0,
      body: JSON.stringify({
        data: {
          users: [
            { id: 1, name: "Alice", roles: ["admin", "user"] },
            { id: 2, name: "Bob", roles: ["user"] },
          ],
          meta: {
            total: 2,
            page: 1,
          },
        },
      }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    const testScript = `
      pm.test("complex API response validation", () => {
        const response = pm.response.json();

        // Deep nested property checks
        pm.expect(response).to.nested.include({ 'data.meta.total': 2 });
        pm.expect(response).to.nested.include({ 'data.meta.page': 1 });

        // Array member checks
        const userIds = response.data.users.map(u => u.id);
        pm.expect(userIds).to.include.members([1, 2]);

        // Deep property on array element
        pm.expect(response.data.users[0]).to.deep.include({
          roles: ["admin", "user"]
        });
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      jsonResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "complex API response validation",
              expectResults: [
                expect.objectContaining({
                  status: "pass",
                  message: expect.stringContaining("nested include"),
                }),
                expect.objectContaining({
                  status: "pass",
                  message: expect.stringContaining("nested include"),
                }),
                expect.objectContaining({
                  status: "pass",
                  message: expect.stringContaining("include members"),
                }),
                expect.objectContaining({
                  status: "pass",
                  message: expect.stringContaining("deep include"),
                }),
              ],
            }),
          ]),
        }),
      ])
    )
  })
})
