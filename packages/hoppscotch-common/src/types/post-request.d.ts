declare namespace pw {
  function test(name: string, func: () => void): void
  function expect(value: any): Expectation

  const response: {
    status: number
    headers: any
    body: any
  }

  namespace env {
    function set(key: string, value: string): void
    function unset(key: string): void
    function get(key: string): string
    function getResolve(key: string): string
    function resolve(value: string): string
  }
}

interface Expectation extends ExpectationMethods {
  not: BaseExpectation
}

interface BaseExpectation extends ExpectationMethods {}

interface ExpectationMethods {
  toBe(value: any): void
  toBeLevel2xx(): void
  toBeLevel3xx(): void
  toBeLevel4xx(): void
  toBeLevel5xx(): void
  toBeType(type: string): void
  toHaveLength(length: number): void
  toInclude(value: any): void
}
