import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} from "quicktype-core"

async function jsonToLanguage(targetLanguage: string, jsonString: string) {
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
