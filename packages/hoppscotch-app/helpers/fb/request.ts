import {
  audit,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  from,
  map,
  Subscription,
} from "rxjs"
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore"
import cloneDeep from "lodash/cloneDeep"
import {
  HoppRESTRequest,
  translateToNewRequest,
} from "../types/HoppRESTRequest"
import { currentUser$, HoppUser } from "./auth"
import { restRequest$ } from "~/newstore/RESTSession"

/**
 * Writes a request to a user's firestore sync
 *
 * @param user The user to write to
 * @param request The request to write to the request sync
 */
function writeCurrentRequest(user: HoppUser, request: HoppRESTRequest) {
  const req = cloneDeep(request)

  // Remove FormData entries because those can't be stored on Firestore
  if (req.body.contentType === "multipart/form-data") {
    req.body.body = req.body.body.map((formData) => {
      if (!formData.isFile) return formData

      return {
        active: formData.active,
        isFile: false,
        key: formData.key,
        value: "",
      }
    })
  }
  return setDoc(doc(getFirestore(), "users", user.uid, "requests", "rest"), req)
}

/**
 * Loads the synced request from the firestore sync
 *
 * @returns Fetched request object if exists else null
 */
export async function loadRequestFromSync(): Promise<HoppRESTRequest | null> {
  const currentUser = currentUser$.value

  if (!currentUser)
    throw new Error("Cannot load request from sync without login")

  const fbDoc = await getDoc(
    doc(getFirestore(), "users", currentUser.uid, "requests", "rest")
  )

  const data = fbDoc.data()

  if (!data) return null
  else return translateToNewRequest(data)
}

/**
 * Performs sync of the REST Request session with Firestore.
 *
 * @returns A subscription to the sync observable stream.
 * Unsubscribe to stop syncing.
 */
export function startRequestSync(): Subscription {
  const sub = combineLatest([
    currentUser$,
    restRequest$.pipe(distinctUntilChanged()),
  ])
    .pipe(
      map(([user, request]) =>
        user ? from(writeCurrentRequest(user, request)) : EMPTY
      ),
      audit((x) => x)
    )
    .subscribe(() => {
      // NOTE: This subscription should be kept
    })

  return sub
}
