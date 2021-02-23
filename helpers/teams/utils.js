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

export default {
    rootCollectionsOfTeam: rootCollectionsOfTeam,
    getCollectionChildren: getCollectionChildren,
    getCollectionRequests: getCollectionRequests
}