export const interfaceLanguages = {
  cJSON: "cjson",
  "C++": "cpp",
  "C#": "csharp",
  Crystal: "crystal",
  Dart: "dart",
  Elm: "elm",
  Flow: "flow",
  Go: "go",
  Haskell: "haskell",
  Java: "java",
  JavaScript: "javascript",
  Kotlin: "kotlin",
  "Objective-C": "objective-c",
  PHP: "php",
  Pike: "pike",
  Python: "python",
  Ruby: "ruby",
  Rust: "rust",
  Scala3: "scala3",
  Smithy: "smithy4a",
  Swift: "swift",
  TypeScript: "typescript",
} as const

export type Language = keyof typeof interfaceLanguages
export type InterfaceLanguage = (typeof interfaceLanguages)[Language]
