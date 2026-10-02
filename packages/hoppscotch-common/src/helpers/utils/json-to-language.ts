import { InterfaceLanguage } from "./interfaceLanguages"

async function jsonToLanguage(
  targetLanguage: InterfaceLanguage,
  jsonString: string
) {
  // quicktype is ~1MB and only used when generating types from a response,
  // so it's loaded on demand rather than with the app.
  const { quicktype, InputData, jsonInputForTargetLanguage } =
    await import("quicktype-core")

  const jsonInput = jsonInputForTargetLanguage(targetLanguage)

  await jsonInput.addSource({
    name: "JSONSchema",
    samples: [jsonString],
  })

  const inputData = new InputData()
  inputData.addInput(jsonInput)

  return await quicktype({
    inputData,
    lang: targetLanguage,
    rendererOptions: {
      "just-types": true,
    },
  })
}

export default jsonToLanguage
