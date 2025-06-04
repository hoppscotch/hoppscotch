import fs from "fs"
import path from "path"
import { describe, test, expect } from "vitest"
import { hoppInsomniaImporter } from "../insomnia"

// Retrieve file contents dynamically in your tests
const filePath = path.join(__dirname, "mockInsomnia.json")
const rawJsonData = fs.readFileSync(filePath, "utf8")

describe("hoppInsomniaImporter", () => {
  const fileContents = rawJsonData

  test("successfully imports insomnia file", async () => {
    const result = await hoppInsomniaImporter([fileContents])()
    const isObject = typeof result === "object" && result !== null
    expect(isObject).toBeTruthy()
  })

  test("Correctly converts a valid Insomnia export with basic requests", async () => {
    const result: any = await hoppInsomniaImporter([fileContents])()
    expect(result._tag).toBe("Right")
    expect(result.right).toEqual(expect.any(Array))
    expect(result.right[0].name).toBe("Insomnia Sample JSON")
  })

  test("Correctly imports GraphQL requests", async () => {
    const result: any = await hoppInsomniaImporter([fileContents])()
    const graphqlRequest = result.right[0].requests.find(
      (req: any) => req.name === "GraphQL Sample Request"
    )

    expect(graphqlRequest).toBeDefined()
    expect(graphqlRequest.method).toBe("POST")
    expect(graphqlRequest.body.contentType).toBe("application/graphql")
    expect(graphqlRequest.body.body).toBeDefined()
  })
})
