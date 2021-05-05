import { BehaviorSubject } from "rxjs";
import { TeamCollection } from "./TeamCollection";
import { TeamRequest } from "./TeamRequest";
import { apolloClient } from "~/helpers/apollo";
import { rootCollectionsOfTeam, getCollectionChildren, getCollectionRequests } from "./utils";
import { gql } from "@apollo/client";
import pull from "lodash/pull";
import remove from "lodash/remove";

function findParentOfColl(tree: TeamCollection[], collID: string, currentParent?: TeamCollection): TeamCollection | null {
  for (const coll of tree) {
    // If the root is parent, return null
    if (coll.id === collID) return currentParent ? currentParent : null
    
    // Else run it in children
    if (coll.children) {
      const result = findParentOfColl(coll.children, collID, coll)
      if (result) return result
    }
  }

  return null
}

function findCollInTree(tree: TeamCollection[], targetID: string): TeamCollection | null {
  for (const coll of tree) {
    // If the direct child matched, then return that
    if (coll.id === targetID) return coll

    // Else run it in the children
    if (coll.children) {
      const result = findCollInTree(coll.children, targetID)
      if (result) return result
    }
  }

  // If nothing matched, return null
  return null
}

function findCollWithReqIDInTree(tree: TeamCollection[], reqID: string): TeamCollection | null {
  for (const coll of tree) {
    // Check in root collections (if expanded)
    if (coll.requests) {
      if (coll.requests.find(req => req.id === reqID)) return coll
    }

    // Check in children of collections
    if (coll.children) {
      const result = findCollWithReqIDInTree(coll.children, reqID)
      if (result) return result
    }
  }

  // No matches
  return null
}

function findReqInTree(tree: TeamCollection[], reqID: string): TeamRequest | null {
  for (const coll of tree) {
    // Check in root collections (if expanded)
    if (coll.requests) {
      const match = coll.requests.find(req => req.id === reqID)
      if (match) return match
    }

    // Check in children of collections
    if (coll.children) {
      const match = findReqInTree(coll.children, reqID)
      if (match) return match
    }
  }

  // No matches
  return null
}

function updateCollInTree(tree: TeamCollection[], updateColl: Partial<TeamCollection> & Pick<TeamCollection, "id">) {
  const el = findCollInTree(tree, updateColl.id)

  // If no match, stop the operation
  if (!el) return
  
  // Update all the specified keys
  Object.assign(el, updateColl)
}

function deleteCollInTree(tree: TeamCollection[], targetID: string) {
  // Get the parent owning the collection
  const parent = findParentOfColl(tree, targetID)

  // If we found a parent, update it
  if (parent && parent.children) {
    parent.children = parent.children.filter(coll => coll.id !== targetID)
  }

  // If there is no parent, it could mean:
  //  1. The collection with that ID does not exist
  //  2. The collection is in root (therefore, no parent)

  // Let's look for element, if not exist, then stop
  const el = findCollInTree(tree, targetID)
  if (!el) return

  // Collection exists, so this should be in root, hence removing element
  pull(tree, el)
} 

/**
 * TeamCollectionAdapter provides a reactive collections list for a specific team
 */
export default class TeamCollectionAdapter {

  /**
   * The reactive list of collections
   *
   * A new value is emitted when there is a change
   * (Use views instead)
   */
  collections$: BehaviorSubject<TeamCollection[]>

  private teamCollectionAdded$: ZenObservable.Subscription | null
  private teamCollectionUpdated$: ZenObservable.Subscription | null
  private teamCollectionRemoved$: ZenObservable.Subscription | null
  private teamRequestAdded$: ZenObservable.Subscription | null
  private teamRequestUpdated$: ZenObservable.Subscription | null
  private teamRequestDeleted$: ZenObservable.Subscription | null

  /**
   * @constructor
   *
   * @param {string} teamID - ID of the team to listen to
   */
  constructor(private teamID: string) {
    this.collections$ = new BehaviorSubject<TeamCollection[]>([]);
    this.teamCollectionAdded$ = null;
    this.teamCollectionUpdated$ = null;
    this.teamCollectionRemoved$ = null;
    this.teamRequestAdded$ = null;
    this.teamRequestDeleted$ = null;
    this.teamRequestUpdated$ = null;

    this.initialize();
  }

  changeTeamID(newTeamID: string) {
    this.collections$.next([]);

    this.teamID = newTeamID;

    this.initialize();
  }

  unsubscribeSubscriptions() {
    this.teamCollectionAdded$?.unsubscribe();
    this.teamCollectionUpdated$?.unsubscribe();
    this.teamCollectionRemoved$?.unsubscribe();
    this.teamRequestAdded$?.unsubscribe();
    this.teamRequestDeleted$?.unsubscribe();
    this.teamRequestUpdated$?.unsubscribe();
  }

  private async initialize() {
    await this.loadRootCollections();
    this.registerSubscriptions();
  }
  
  private async loadRootCollections(): Promise<void> {
    const colls = await rootCollectionsOfTeam(apolloClient, this.teamID);
    this.collections$.next(colls);
  }

  private addCollection(collection: TeamCollection, parentCollectionID: string | null) {
    const tree = this.collections$.value

    if (!parentCollectionID) {
      tree.push(collection);
    } else {
      const parentCollection = findCollInTree(tree, parentCollectionID)

      if (!parentCollection) return

      if (parentCollection.children != null) {
        parentCollection.children.push(collection)
      } else {
        parentCollection.children = [collection]
      }
    }

    this.collections$.next(tree)
  }

  private updateCollection(collectionUpdate: Partial<TeamCollection> & Pick<TeamCollection, 'id'>) {
    const tree = this.collections$.value

    updateCollInTree(tree, collectionUpdate)

    this.collections$.next(tree)
  }

  private removeCollection(collectionID: string) {
    const tree = this.collections$.value

    deleteCollInTree(tree, collectionID)

    this.collections$.next(tree)
  }

  private addRequest(request: TeamRequest) {
    const tree = this.collections$.value
    
    // Check if we have the collection (if not, then not loaded?)
    const coll = findCollInTree(tree, request.collectionID)
    if (!coll) return // Ignore add request

    // Collection is not expanded
    if (!coll.requests) return

    // Collection is expanded hence append request
    coll.requests.push(request)

    this.collections$.next(tree)
  }

  private removeRequest(requestID: string) {
    const tree = this.collections$.value

    // Find request in tree, don't attempt if no collection or no requests (expansion?)
    const coll = findCollWithReqIDInTree(tree, requestID)
    if (!coll || !coll.requests) return

    // Remove the collection
    remove(coll.requests, req => req.id === requestID)

    // Publish new tree
    this.collections$.next(tree)
  }

  private updateRequest(requestUpdate: Partial<TeamRequest> & Pick<TeamRequest, 'id'>) {
    const tree = this.collections$.value
    
    // Find request, if not present, don't update
    const req = findReqInTree(tree, requestUpdate.id)
    if (!req) return

    Object.assign(req, requestUpdate)
  }


  registerSubscriptions() {
    this.teamCollectionAdded$ = apolloClient.subscribe({
      query: gql`
        subscription TeamCollectionAdded($teamID: String!) {
          teamCollectionAdded(teamID: $teamID) {
            id
            title
            parent {
              id
            }
          }
        }
      `,
      variables: {
        teamID: this.teamID
      }
    }).subscribe(({ data }) => {
      this.addCollection({
        id: data.teamCollectionAdded.id,
        children: null,
        requests: null,
        title: data.teamCollectionAdded.title
      }, data.teamCollectionAdded.parent?.id)
    });
    
    this.teamCollectionUpdated$ = apolloClient.subscribe({
      query: gql`
        subscription TeamCollectionUpdated($teamID: String!) {
          teamCollectionUpdated(teamID: $teamID) {
            id
            title
            parent {
              id
            }
          }
        }
      `,
      variables: {
        teamID: this.teamID
      }
    }).subscribe(({ data }) => {
      this.updateCollection({
        id: data.teamCollectionUpdated.id,
        title: data.teamCollectionUpdated.title
      });
    });

    this.teamCollectionRemoved$ = apolloClient.subscribe({
      query: gql`
        subscription TeamCollectionRemoved($teamID: String!) {
          teamCollectionRemoved(teamID: $teamID)
        }
      `,
      variables: {
        teamID: this.teamID
      }
    }).subscribe(({ data }) => {
      this.removeCollection(data.teamCollectionRemoved)
    })

    this.teamRequestAdded$ = apolloClient.subscribe({
      query: gql`
        subscription TeamRequestAdded($teamID: String!) {
          teamRequestAdded(teamID: $teamID) {
            id
            collectionID
            request
            title
          }
        }
      `,
      variables: {
        teamID: this.teamID
      }
    }).subscribe(({ data }) => {
      this.addRequest({
        id: data.teamRequestAdded.id,
        collectionID: data.teamRequestAdded.collectionID,
        request: JSON.parse(data.teamRequestAdded.request),
        title: data.teamRequestAdded.title
      })
    })

    this.teamRequestUpdated$ = apolloClient.subscribe({
      query: gql`
        subscription TeamRequestUpdated($teamID: String!) {
          teamRequestUpdated(teamID: $teamID) {
            id
            collectionID
            request
            title
          }
        }
      `,
      variables: {
        teamID: this.teamID
      }
    }).subscribe(({ data }) => {
      this.updateRequest({
        id: data.teamRequestUpdated.id,
        collectionID: data.teamRequestUpdated.collectionID,
        request: data.teamRequestUpdated.request,
        title: data.teamRequestUpdated.title
      })
    })

    this.teamRequestDeleted$ = apolloClient.subscribe({
      query: gql`
        subscription TeamRequestDeleted($teamID: String!) {
          teamRequestDeleted(teamID: $teamID)
        }
      `,
      variables: {
        teamID: this.teamID
      }
    }).subscribe(({ data }) => {
      this.removeRequest(data.teamRequestDeleted)
    })
  }

  async expandCollection(collectionID: string): Promise<void> {
    // TODO: While expanding one collection, block (or queue) the expansion of the other, to avoid race conditions
    const tree = this.collections$.value;

    const collection = findCollInTree(tree, collectionID)

    if (!collection) return

    if (collection.children != null) return

    const collections: TeamCollection[] = (await getCollectionChildren(apolloClient, collectionID))
      .map<TeamCollection>(el => {
        return {
          id: el.id,
          title: el.title,
          children: null,
          requests: null
        }
      })

    const requests: TeamRequest[] = (await getCollectionRequests(apolloClient, collectionID))
      .map<TeamRequest>(el => {
        return {
          id: el.id,
          collectionID: collectionID,
          title: el.title,
          request: el.request
        }
      })

    collection.children = collections
    collection.requests = requests

    this.collections$.next(tree)
  }
}
