import { importJSONToTeam } from "~/helpers/backend/mutations/TeamCollection"

export async function toTeamsImporter(content: string, teamID: string) {
  try {
    // Parse the JSON content
    const collections = JSON.parse(content)

    // Ensure collections is an array
    const collectionsArray = Array.isArray(collections) ? collections : [collections]

    // Sort the requests in each collection by index
    const sortedCollections = collectionsArray.map((collection: any) => ({
      ...collection,
      requests: collection.requests
        ? collection.requests.sort((a: any, b: any) => {
            const indexA = typeof a.index === 'number' ? a.index : 0
            const indexB = typeof b.index === 'number' ? b.index : 0
            return indexA - indexB
          })
        : [],
    }))

    // Convert back to JSON
    const sortedContent = JSON.stringify(sortedCollections)

    // Call the import function with sorted content
    return importJSONToTeam(sortedContent, teamID)
  } catch (error) {
    console.error("Error importing collections:", error)
    throw error
  }
}
