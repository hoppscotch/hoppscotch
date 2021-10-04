export class JsonFormattedError extends Error {
  constructor(jsonObject: any) {
    super(JSON.stringify(jsonObject, null, 2))
  }
}
