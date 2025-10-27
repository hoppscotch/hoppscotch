/**
 * Utilities for parsing dataset files (CSV/JSON)
 */

/**
 * Parse CSV data into an array of objects
 * @param data Raw CSV string
 * @returns Array of objects where keys are column headers
 */
export function parseCSV(data: string): Array<Record<string, string>> {
    const lines = data.split("\n").filter((line) => line.trim() !== "")

    if (lines.length === 0) {
        throw new Error("CSV file is empty")
    }

    const result: Array<Record<string, string>> = []
    const headers = lines[0].split(",").map((header) => header.trim())

    if (headers.length === 0) {
        throw new Error("CSV headers are missing")
    }

    for (let i = 1; i < lines.length; i++) {
        const obj: Record<string, string> = {}
        const currentLine = lines[i].split(",")

        headers.forEach((header, j) => {
            obj[header] = currentLine[j]?.trim() || ""
        })

        result.push(obj)
    }

    return result
}

/**
 * Parse JSON data into an array of objects
 * @param data Raw JSON string
 * @returns Array of objects
 */
export function parseJSON(data: string): Array<Record<string, any>> {
    const parsed = JSON.parse(data)

    if (!Array.isArray(parsed)) {
        // If it's a single object, wrap it in an array
        return [parsed]
    }

    return parsed
}

/**
 * Validate dataset structure
 * @param data Dataset array
 * @returns true if valid
 */
export function validateDataset(data: Array<Record<string, any>>): boolean {
    if (!Array.isArray(data) || data.length === 0) {
        return false
    }

    // Check if all items are objects
    return data.every((item) => typeof item === "object" && item !== null)
}
