import Vue from "vue";
import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";

// Initialize Firebase, copied from cloud console
var config = {
  apiKey: "AIzaSyCMsFreESs58-hRxTtiqQrIcimh4i1wbsM",
  authDomain: "postwoman-api.firebaseapp.com",
  databaseURL: "https://postwoman-api.firebaseio.com",
  projectId: "postwoman-api",
  storageBucket: "postwoman-api.appspot.com",
  messagingSenderId: "421993993223",
  appId: "1:421993993223:web:ec0baa8ee8c02ffa1fc6a2",
  measurementId: "G-ERJ6025CEB"
};
firebase.initializeApp(config);

// a reference to the Balls collection
const ballsCollection = firebase.firestore().collection("balls");

// the shared state object that any vue component
// can get access to
export const store = {
  ballsInFeed: null,
  currentUser: null,
  writeBall: message => {
    const dt = {
      createdOn: new Date(),
      author: store.currentUser.uid,
      author_name: store.currentUser.displayName,
      author_image: store.currentUser.photoURL,
      message
    };
    return ballsCollection
      .add(dt)
      .catch(e => console.error("error inserting", dt, e));
  }
};

// onSnapshot is executed every time the data
// in the underlying firestore collection changes
// It will get passed an array of references to
// the documents that match your query
ballsCollection
  .orderBy("createdOn", "desc")
  .limit(5)
  .onSnapshot(ballsRef => {
    const balls = [];
    ballsRef.forEach(doc => {
      const ball = doc.data();
      ball.id = doc.id;
      balls.push(ball);
    });
    console.log("Received Balls feed:", balls);
    store.ballsInFeed = balls;
  });

// When a user logs in or out, save that in the store
firebase.auth().onAuthStateChanged(user => {
  console.log("Logged in as:", user);
  store.currentUser = user;
});
