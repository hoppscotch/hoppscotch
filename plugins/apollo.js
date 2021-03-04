export default () => {
  return {
    httpEndpoint:
      process.env.CONTEXT === "production"
        ? "https://api.hoppscotch.io/graphql"
        : "https://api.hoppscotch.io/graphql",
  }
}
