import * as E from "fp-ts/Either"
import { ReqType } from "@api/generated/graphql"
import { HoppCollection } from "@hoppscotch/data"
import { fetchAndConvertUserCollections } from "./mutations"
import {
    setRESTCollections,
    setGraphqlCollections,
    appendRESTCollections,
    appendGraphqlCollections
} from "@hoppscotch/common/newstore/collections"
import {
    importUserCollectionsFromJSON
} from "./api"
import { def as platformAuth } from "@platform/auth/desktop"

/**
 * Platform-specific import function for selfhost-desktop that uses the correct nested collection queries
 */
export const importToPersonalWorkspace = async (collections: HoppCollection[], reqType: ReqType) => {
    const currentUser = platformAuth.getCurrentUserStream()

    // If user is logged in, try to import to backend first
    if (currentUser.value) {
        try {
            const transformedCollection = collections.map((collection) =>
                translateToPersonalCollectionFormat(collection)
            )

            const res = await importUserCollectionsFromJSON(
                JSON.stringify(transformedCollection),
                reqType
            )

            if (E.isRight(res)) {
                // Backend import succeeded, now fetch and persist collections in store
                const fetchResult = await fetchAndConvertUserCollections(reqType)

                if (E.isRight(fetchResult)) {
                    // Replace local collections with backend collections
                    if (reqType === ReqType.Rest) {
                        setRESTCollections(fetchResult.right)
                    } else {
                        setGraphqlCollections(fetchResult.right)
                    }
                } else {
                    // Failed to fetch, append to local store as fallback
                    if (reqType === ReqType.Rest) {
                        appendRESTCollections(collections)
                    } else {
                        appendGraphqlCollections(collections)
                    }
                }

                return E.right({ success: true })
            }
            // Backend import failed, fall back to local storage
            if (reqType === ReqType.Rest) {
                appendRESTCollections(collections)
            } else {
                appendGraphqlCollections(collections)
            }
            return E.right({ success: true })
        } catch {
            // Backend import failed, fall back to local storage
            if (reqType === ReqType.Rest) {
                appendRESTCollections(collections)
            } else {
                appendGraphqlCollections(collections)
            }
            return E.right({ success: true })
        }
    } else {
        // User not logged in, use local storage
        if (reqType === ReqType.Rest) {
            appendRESTCollections(collections)
        } else {
            appendGraphqlCollections(collections)
        }
        return E.right({ success: true })
    }
}

function translateToPersonalCollectionFormat(x: HoppCollection) {
    const folders: HoppCollection[] = (x.folders ?? []).map(
        translateToPersonalCollectionFormat
    )

    const data = {
        auth: x.auth,
        headers: x.headers,
        variables: x.variables,
    }

    const obj = {
        ...x,
        folders,
        data,
    }

    return obj
}