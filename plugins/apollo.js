export default () => {
  return {
    httpEndpoint:
      process.env.CONTEXT === "production"
        ? "https://hoppscotch-backend.herokuapp.com/graphql"
        : "https://hoppscotch-backend.herokuapp.com/graphql",
  }
}
