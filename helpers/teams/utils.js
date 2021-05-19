import gql from "graphql-tag"
import { BehaviorSubject } from "rxjs"

/**
 * Returns an observable list of team members in the given Team
 *
 * @param {ApolloClient<any>} apollo - Instance of ApolloClient
 * @param {string} teamID - ID of the team to observe
 *
 * @returns {{user: {uid: string, email: string}, role: 'OWNER' | 'EDITOR' | 'VIEWER'}}
 */
export async function getLiveTeamMembersList(apollo, teamID) {
  const subject = new BehaviorSubject([])

  const { data } = await apollo.query({
    query: gql`
      query GetTeamMembers($teamID: String!) {
        team(teamID: $teamID) {
          members {
            user {
              uid
              email
            }
            role
          }
        }
      }
    `,
    variables: {
      teamID,
    },
  })

  subject.next(data.team.members)

  const addedSub = apollo
    .subscribe({
      query: gql`
        subscription TeamMemberAdded($teamID: String!) {
          teamMemberAdded(teamID: $teamID) {
            user {
              uid
              email
            }
            role
          }
        }
      `,
      variables: {
        teamID,
      },
    })
    .subscribe(({ data }) => {
      subject.next([...subject.value, data.teamMemberAdded])
    })

  const updateSub = apollo
    .subscribe({
      query: gql`
        subscription TeamMemberUpdated($teamID: String!) {
          teamMemberUpdated(teamID: $teamID) {
            user {
              uid
              email
            }
            role
          }
        }
      `,
      variables: {
        teamID,
      },
    })
    .subscribe(({ data }) => {
      const val = subject.value.find(
        (member) => member.user.uid === data.teamMemberUpdated.user.uid
      )

      if (!val) return

      Object.assign(val, data.teamMemberUpdated)
    })

  const removeSub = apollo
    .subscribe({
      query: gql`
        subscription TeamMemberRemoved($teamID: String!) {
          teamMemberRemoved(teamID: $teamID)
        }
      `,
      variables: {
        teamID,
      },
    })
    .subscribe(({ data }) => {
      subject.next(
        subject.value.filter(
          (member) => member.user.uid !== data.teamMemberAdded.user.uid
        )
      )
    })

  const mainSub = subject.subscribe({
    complete() {
      addedSub.unsubscribe()
      updateSub.unsubscribe()
      removeSub.unsubscribe()

      mainSub.unsubscribe()
    },
  })

  return subject
}

export function createTeam(apollo, name) {
  return apollo.mutate({
    mutation: gql`
      mutation ($name: String!) {
        createTeam(name: $name) {
          name
        }
      }
    `,
    variables: {
      name,
    },
  })
}

export function addTeamMemberByEmail(apollo, userRole, userEmail, teamID) {
  return apollo.mutate({
    mutation: gql`
      mutation addTeamMemberByEmail(
        $userRole: TeamMemberRole!
        $userEmail: String!
        $teamID: String!
      ) {
        addTeamMemberByEmail(
          userRole: $userRole
          userEmail: $userEmail
          teamID: $teamID
        ) {
          role
        }
      }
    `,
    variables: {
      userRole,
      userEmail,
      teamID,
    },
  })
}

export function updateTeamMemberRole(apollo, userID, newRole, teamID) {
  return apollo.mutate({
    mutation: gql`
      mutation updateTeamMemberRole(
        $newRole: TeamMemberRole!
        $userUid: String!
        $teamID: String!
      ) {
        updateTeamMemberRole(
          newRole: $newRole
          userUid: $userUid
          teamID: $teamID
        ) {
          role
        }
      }
    `,
    variables: {
      newRole,
      userUid: userID,
      teamID,
    },
  })
}

export function renameTeam(apollo, name, teamID) {
  return apollo.mutate({
    mutation: gql`
      mutation renameTeam($newName: String!, $teamID: String!) {
        renameTeam(newName: $newName, teamID: $teamID) {
          id
        }
      }
    `,
    variables: {
      newName: name,
      teamID,
    },
  })
}

export function removeTeamMember(apollo, userID, teamID) {
  return apollo.mutate({
    mutation: gql`
      mutation removeTeamMember($userUid: String!, $teamID: String!) {
        removeTeamMember(userUid: $userUid, teamID: $teamID)
      }
    `,
    variables: {
      userUid: userID,
      teamID,
    },
  })
}

export async function deleteTeam(apollo, teamID) {
  let response
  while (true) {
    response = await apollo.mutate({
      mutation: gql`
        mutation ($teamID: String!) {
          deleteTeam(teamID: $teamID)
        }
      `,
      variables: {
        teamID,
      },
    })
    if (response !== undefined) break
  }
  return response
}

export function exitTeam(apollo, teamID) {
  apollo.mutate({
    mutation: gql`
      mutation ($teamID: String!) {
        leaveTeam(teamID: $teamID)
      }
    `,
    variables: {
      teamID,
    },
  })
}

export async function rootCollectionsOfTeam(apollo, teamID) {
  const collections = []
  let cursor = ""
  while (true) {
    const response = await apollo.query({
      query: gql`
        query rootCollectionsOfTeam($teamID: String!, $cursor: String!) {
          rootCollectionsOfTeam(teamID: $teamID, cursor: $cursor) {
            id
            title
          }
        }
      `,
      variables: {
        teamID,
        cursor,
      },
      fetchPolicy: "no-cache",
    })
    if (response.data.rootCollectionsOfTeam.length === 0) break
    response.data.rootCollectionsOfTeam.forEach((collection) => {
      collections.push(collection)
    })
    cursor = collections[collections.length - 1].id
  }
  return collections
}

export async function getCollectionChildren(apollo, collectionID) {
  const children = []
  const response = await apollo.query({
    query: gql`
      query getCollectionChildren($collectionID: String!) {
        collection(collectionID: $collectionID) {
          children {
            id
            title
          }
        }
      }
    `,
    variables: {
      collectionID,
    },
    fetchPolicy: "no-cache",
  })
  response.data.collection.children.forEach((child) => {
    children.push(child)
  })
  return children
}

export async function getCollectionRequests(apollo, collectionID) {
  const requests = []
  let cursor = ""
  while (true) {
    const response = await apollo.query({
      query: gql`
        query getCollectionRequests($collectionID: String!, $cursor: String) {
          requestsInCollection(collectionID: $collectionID, cursor: $cursor) {
            id
            title
            request
          }
        }
      `,
      variables: {
        collectionID,
        cursor,
      },
      fetchPolicy: "no-cache",
    })

    response.data.requestsInCollection.forEach((request) => {
      requests.push(request)
    })

    if (response.data.requestsInCollection.length < 10) {
      break
    }
    cursor = requests[requests.length - 1].id
  }
  return requests
}

export async function renameCollection(apollo, title, id) {
  let response
  while (true) {
    response = await apollo.mutate({
      mutation: gql`
        mutation ($newTitle: String!, $collectionID: String!) {
          renameCollection(newTitle: $newTitle, collectionID: $collectionID) {
            id
          }
        }
      `,
      variables: {
        newTitle: title,
        collectionID: id,
      },
    })
    if (response !== undefined) break
  }
  return response
}

export async function updateRequest(apollo, request, requestName, requestID) {
  let response
  while (true) {
    response = await apollo.mutate({
      mutation: gql`
        mutation ($data: UpdateTeamRequestInput!, $requestID: String!) {
          updateRequest(data: $data, requestID: $requestID) {
            id
          }
        }
      `,
      variables: {
        data: {
          request: JSON.stringify(request),
          title: requestName,
        },
        requestID,
      },
    })
    if (response !== undefined) break
  }
  return response
}

export async function addChildCollection(apollo, title, id) {
  let response
  while (true) {
    response = await apollo.mutate({
      mutation: gql`
        mutation ($childTitle: String!, $collectionID: String!) {
          createChildCollection(
            childTitle: $childTitle
            collectionID: $collectionID
          ) {
            id
          }
        }
      `,
      variables: {
        childTitle: title,
        collectionID: id,
      },
    })
    if (response !== undefined) break
  }
  return response
}

export async function deleteCollection(apollo, id) {
  let response
  while (true) {
    response = await apollo.mutate({
      mutation: gql`
        mutation ($collectionID: String!) {
          deleteCollection(collectionID: $collectionID)
        }
      `,
      variables: {
        collectionID: id,
      },
    })
    if (response !== undefined) break
  }
  return response
}

export async function deleteRequest(apollo, requestID) {
  let response
  while (true) {
    response = await apollo.mutate({
      mutation: gql`
        mutation ($requestID: String!) {
          deleteRequest(requestID: $requestID)
        }
      `,
      variables: {
        requestID,
      },
    })
    if (response !== undefined) break
  }
  return response
}

export async function createNewRootCollection(apollo, title, id) {
  let response
  while (true) {
    response = await apollo.mutate({
      mutation: gql`
        mutation ($title: String!, $teamID: String!) {
          createRootCollection(title: $title, teamID: $teamID) {
            id
          }
        }
      `,
      variables: {
        title,
        teamID: id,
      },
    })
    if (response !== undefined) break
  }
  return response
}

export async function saveRequestAsTeams(
  apollo,
  request,
  title,
  teamID,
  collectionID
) {
  await apollo.mutate({
    mutation: gql`
      mutation ($data: CreateTeamRequestInput!, $collectionID: String!) {
        createRequestInCollection(data: $data, collectionID: $collectionID) {
          collection {
            id
            team {
              id
              name
            }
          }
        }
      }
    `,
    variables: {
      collectionID,
      data: {
        teamID,
        title,
        request,
      },
    },
  })
}

export async function overwriteRequestTeams(apollo, request, title, requestID) {
  await apollo.mutate({
    mutation: gql`
      mutation updateRequest(
        $data: UpdateTeamRequestInput!
        $requestID: String!
      ) {
        updateRequest(data: $data, requestID: $requestID) {
          id
          title
        }
      }
    `,
    variables: {
      requestID,
      data: {
        request,
        title,
      },
    },
  })
}

export async function importFromMyCollections(apollo, collectionID, teamID) {
  const response = await apollo.mutate({
    mutation: gql`
      mutation importFromMyCollections(
        $fbCollectionPath: String!
        $teamID: String!
      ) {
        importCollectionFromUserFirestore(
          fbCollectionPath: $fbCollectionPath
          teamID: $teamID
        ) {
          id
          title
        }
      }
    `,
    variables: {
      fbCollectionPath: collectionID,
      teamID,
    },
  })
  return response.data != null
}

export async function importFromJSON(apollo, collections, teamID) {
  const response = await apollo.mutate({
    mutation: gql`
      mutation importFromJSON($jsonString: String!, $teamID: String!) {
        importCollectionsFromJSON(jsonString: $jsonString, teamID: $teamID)
      }
    `,
    variables: {
      jsonString: JSON.stringify(collections),
      teamID,
    },
  })
  return response.data != null
}

export async function replaceWithJSON(apollo, collections, teamID) {
  const response = await apollo.mutate({
    mutation: gql`
      mutation replaceWithJSON($jsonString: String!, $teamID: String!) {
        replaceCollectionsWithJSON(jsonString: $jsonString, teamID: $teamID)
      }
    `,
    variables: {
      jsonString: JSON.stringify(collections),
      teamID,
    },
  })
  return response.data != null
}

export async function exportAsJSON(apollo, teamID) {
  const response = await apollo.query({
    query: gql`
      query exportAsJSON($teamID: String!) {
        exportCollectionsToJSON(teamID: $teamID)
      }
    `,
    variables: {
      teamID,
    },
  })
  return response.data.exportCollectionsToJSON
}
