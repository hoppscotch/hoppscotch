declare const pw: {
  env: {
    get(key: string): string
    set(key: string, value: string): void
    unset(key: string): void
    getResolve(key: string): string
    resolve(value: string): string
  }
}
