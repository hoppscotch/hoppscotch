export default () => {
  return {
    httpEndpoint:
      process.env.CONTEXT === "production"
        ? "https://hoppscotch-backend.herokuapp.com/graphql"
        : "http://localhost:3170/graphql",
  }
}
