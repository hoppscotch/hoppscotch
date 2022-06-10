import * as R from "fp-ts/Record"
import * as O from "fp-ts/Option"
import { Artifacts } from "./types"

export const createArtifact = (
  key: string,
  value: string,
  artifacts: Artifacts
): Artifacts => {
  if (R.has(key, artifacts)) {
    return updateArtifact(key, value, artifacts)
  }

  artifacts[key] = value

  return artifacts
}

export const getArtifact = (key: string, artifacts: Artifacts) => {
  return O.fromNullable(artifacts[key])
}

export const updateArtifact = (
  key: string,
  value: string,
  artifacts: Artifacts
): Artifacts => {
  if (!R.has(key, artifacts)) {
    return artifacts
  }

  artifacts[key] = value

  return artifacts
}

export const deleteArtifact = (
  key: string,
  artifacts: Artifacts
): Artifacts => {
  if (!R.has(key, artifacts)) {
    return artifacts
  }

  delete artifacts[key]

  return artifacts
}
