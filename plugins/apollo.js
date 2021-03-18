export default () => {
  return {
    httpEndpoint:
      process.env.CONTEXT === "production"
        ? "https://api.hoppscotch.io/graphql"
        : "https://api.hoppscotch.io/graphql",
    wsEndpoint:
      process.env.CONTEXT === "production"
        ? "wss://api.hoppscotch.io/graphql"
        : "wss://api.hoppscotch.io/graphql",
  }
}
