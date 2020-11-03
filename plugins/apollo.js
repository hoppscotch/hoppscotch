export default () => {
  return {
    httpEndpoint: process.env.PRODUCTION
      ? "https://hoppscotch-backend.herokuapp.com/graphql"
      : "http://localhost:3170/graphql",
  }
}
