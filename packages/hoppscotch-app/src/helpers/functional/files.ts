import * as TO from "fp-ts/TaskOption"

export const readFileAsText = (file: File) =>
  TO.tryCatch(
    () =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => {
          resolve(reader.result as string)
        }

        reader.onerror = () => {
          reject(new Error("File err"))
        }

        reader.readAsText(file)
      })
  )
