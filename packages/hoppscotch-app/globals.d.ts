/*
 * Some helpful type definitions to help with type checking
 */

interface Object {
  // Allows for TypeScript to know this field now exist
  hasOwnProperty<K extends PropertyKey>(key: K): this is Record<K, unknown>
}
