import gql from "graphql-tag"

async function rootCollectionsOfTeam(apollo, teamID) {
    var collections = [];
    var cursor = "";
    while(true) {
        var response = await apollo.query({
            query: gql`
            query rootCollectionsOfTeam($teamID: String!, $cursor: String!) {
              rootCollectionsOfTeam(teamID: $teamID, cursor: $cursor) {
                id
                title
              }
            }`,
            variables: {
                teamID: teamID,
                cursor: cursor
            },
            fetchPolicy: 'no-cache'
        })
        if(response.data.rootCollectionsOfTeam.length == 0) break;
        response.data.rootCollectionsOfTeam.forEach((collection) => {
            collections.push(collection);
        });
        cursor = collections[collections.length - 1].id;
    }
    return collections;
}

async function getCollectionChildren(apollo, collectionID) {
    var children = [];
    var response = await apollo.query({
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
            collectionID: collectionID,
        }
    });
    response.data.collection.children.forEach((child) => {
        children.push(child);
    });
    return children;
}

async function getCollectionRequests(apollo, collectionID) {
    var requests = [];
    var cursor = "";
    while(true) {
        var response = await apollo.query({
            query: gql`
            query getCollectionRequests($collectionID: String!, $cursor: String!) {
                requestsInCollection(collectionID: $collectionID, cursor: $cursor) {
                    id
                    title
                    request
                }
            }
            `,
            variables: {
                collectionID: collectionID,
                cursor: cursor
            }
        });
        if(response.data.requestsInCollection.length == 0) {
            break;
        }
        response.data.requestsInCollection.forEach((request) => {
            requests.push(requests);
        });
        cursor = requests[requests.length - 1].id;
    }
    return requests;
}

async function editFolderForChildCollections(apollo, title, id){
    let response = undefined
    while (true){
        response = await apollo.mutate({
          mutation: gql`
            mutation($newTitle: String!, $collectionID: String!) {
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
        if (response != undefined) break;
    }
    return response

}

async function addChildCollection(apollo, title, id){
    let response = undefined
    while (true){
        response = await apollo.mutate({
            mutation: gql`
              mutation($childTitle: String!, $collectionID: String!) {
                createChildCollection(childTitle: $childTitle, collectionID: $collectionID) {
                  id
                }
              }
            `,
            variables: {
              childTitle: title,
              collectionID: id,
            },
        })
        if (response != undefined) break;
    }
    return response

}

async function deleteChildCollection(apollo, id){
    let response = undefined
    while (true){
        response = await apollo.mutate({
            mutation: gql`
              mutation($collectionID: String!) {
                deleteCollection(collectionID: $collectionID) 
              }
            `,
            variables: {
              collectionID: id,
            },
        })
        if (response != undefined) break;
    }
    return response

}

async function createNewRootCollection(apollo, title, id){
    let response = undefined
    while (true){
        response = await apollo.mutate({
            mutation: gql`
              mutation($title: String!, $teamID: String!) {
                createRootCollection(title: $title, teamID: $teamID) {
                  id
                }
              }
            `,
            variables: {
              title: title,
              teamID: id,
            },
          })
        if (response != undefined) break;
    }
    return response

}

async function exitFromTeam(apollo, id){
    let response = undefined
    while (true){
        response = await apollo.mutate({
            mutation: gql`
              mutation($teamID: String!) {
                deleteTeam(teamID: $teamID)
              }
            `,
            variables: {
              teamID: this.teamID,
            },
        })
        if (response != undefined) break;
    }
    return response

}

export default {
    rootCollectionsOfTeam: rootCollectionsOfTeam,
    getCollectionChildren: getCollectionChildren,
    getCollectionRequests: getCollectionRequests,
    editFolderForChildCollections: editFolderForChildCollections,
    addChildCollection: addChildCollection,
    deleteChildCollection: deleteChildCollection,
    createNewRootCollection: createNewRootCollection,
    exitFromTeam: exitFromTeam
}