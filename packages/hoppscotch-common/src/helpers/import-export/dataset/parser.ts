/**
 * Utilities for parsing dataset files (CSV/JSON)
 */
import Papa from "papaparse";
/**
 * Parse CSV data into an array of objects
 * @param data Raw CSV string
 * @returns Array of objects where keys are column headers
 */
export function parseCSV(data: string): Array<Record<string, string>> {
    const parsed = Papa.parse<Record<string, string>>(data, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        trimHeaders: true,
    });

    if (!parsed.data || parsed.data.length === 0) {
        throw new Error("CSV file is empty or invalid")
    }

    // Remove any possible null/undefined rows (PapaParse can return empty objects for blank lines)
    const result = parsed.data.filter(
        (row) => row && Object.keys(row).length > 0
    );

    // Check if headers exist
    if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
        throw new Error("CSV headers are missing")
    }

    return result;
}

/**
 * Parse JSON data into an array of objects
 * @param data Raw JSON string
 * @returns Array of objects
 */
export function parseJSON(data: string): Array<Record<string, any>> {
    const parsed = JSON.parse(data)

    if (!Array.isArray(parsed)) {
        if (typeof parsed !== "object" || parsed === null) {
            throw new Error("JSON must be an object or array of objects")
        }
        return [parsed]
    }

    // Validate all items are objects
    if (!parsed.every((item) => typeof item === "object" && item !== null)) {
        throw new Error("JSON array must contain only objects")
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
