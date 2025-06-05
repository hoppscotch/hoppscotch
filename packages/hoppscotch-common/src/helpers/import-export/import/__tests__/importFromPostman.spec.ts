import fs from "fs"
import path from "path"
import { describe, test, expect } from "vitest"
import { hoppPostmanImporter } from "../postman"

// Load the Postman export file
const filePath = path.join(__dirname, "mockPostman.json")
const rawJsonData = fs.readFileSync(filePath, "utf8")

describe("hoppPostmanImporter", () => {
  const fileContents = rawJsonData

  test("successfully imports a Postman file with GraphQL requests", async () => {
    const result = await hoppPostmanImporter([fileContents])()
    expect(typeof result === "object" && result !== null).toBeTruthy()
  })

  test("Correctly converts a valid Postman export with basic requests", async () => {
    const result: any = await hoppPostmanImporter([fileContents])()
    expect(result._tag).toBe("Right")
    expect(result.right).toEqual(expect.any(Array))
    expect(result.right[0].name).toBe("Postman GraphQL Example")
  })

  test("extracts correct data from a GraphQL request", async () => {
    const result: any = await hoppPostmanImporter([fileContents])()
    const graphqlRequest = result.right[0].requests.find(
      (req: any) => req.name === "GraphQL Request Example"
    )
    expect(graphqlRequest).toBeDefined()
    expect(graphqlRequest.body.contentType).toBe("application/graphql")
    expect(graphqlRequest.body.body).toBeDefined()
  })
})
