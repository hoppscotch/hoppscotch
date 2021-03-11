import firebase from "firebase/app"
import "firebase/firestore"
import "firebase/auth"

// Initialize Firebase, copied from cloud console
const firebaseConfig = {
  apiKey: process.env.API_KEY || "AIzaSyCMsFreESs58-hRxTtiqQrIcimh4i1wbsM",
  authDomain: process.env.AUTH_DOMAIN || "postwoman-api.firebaseapp.com",
  databaseURL: process.env.DATABASE_URL || "https://postwoman-api.firebaseio.com",
  projectId: process.env.PROJECT_ID || "postwoman-api",
  storageBucket: process.env.STORAGE_BUCKET || "postwoman-api.appspot.com",
  messagingSenderId: process.env.MESSAGING_SENDER_ID || "421993993223",
  appId: process.env.APP_ID || "1:421993993223:web:ec0baa8ee8c02ffa1fc6a2",
  measurementId: process.env.MEASUREMENT_ID || "G-ERJ6025CEB",
}

export const authProviders = {
  google: () => new firebase.auth.GoogleAuthProvider(),
  github: () => new firebase.auth.GithubAuthProvider(),
}

export class FirebaseInstance {
  constructor(fbapp, authProviders) {
    this.app = fbapp
    this.authProviders = authProviders

    this.usersCollection = this.app.firestore().collection("users")

    this.currentUser = null
    this.currentFeeds = []
    this.currentSettings = []
    this.currentHistory = []
    this.currentGraphqlHistory = []
    this.currentCollections = []
    this.currentEnvironments = []

    this.app.auth().onAuthStateChanged((user) => {
      if (user) {
        this.currentUser = user

        this.currentUser.providerData.forEach((profile) => {
          let us = {
            updatedOn: new Date(),
            provider: profile.providerId,
            name: profile.displayName,
            email: profile.email,
            photoUrl: profile.photoURL,
            uid: profile.uid,
          }
          this.usersCollection
            .doc(this.currentUser.uid)
            .set(us, { merge: true })
            .catch((e) => console.error("error updating", us, e))
        })

        this.usersCollection.doc(this.currentUser.uid).onSnapshot((doc) => {
          this.currentUser.provider = doc.data().provider
          this.currentUser.accessToken = doc.data().accessToken
        })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("feeds")
          .orderBy("createdOn", "desc")
          .onSnapshot((feedsRef) => {
            const feeds = []
            feedsRef.forEach((doc) => {
              const feed = doc.data()
              feed.id = doc.id
              feeds.push(feed)
            })
            this.currentFeeds = feeds
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("settings")
          .onSnapshot((settingsRef) => {
            const settings = []
            settingsRef.forEach((doc) => {
              const setting = doc.data()
              setting.id = doc.id
              settings.push(setting)
            })
            this.currentSettings = settings
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("history")
          .onSnapshot((historyRef) => {
            const history = []
            historyRef.forEach((doc) => {
              const entry = doc.data()
              entry.id = doc.id
              history.push(entry)
            })
            this.currentHistory = history
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("graphqlHistory")
          .onSnapshot((historyRef) => {
            const history = []
            historyRef.forEach((doc) => {
              const entry = doc.data()
              entry.id = doc.id
              history.push(entry)
            })
            this.currentGraphqlHistory = history
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("collections")
          .onSnapshot((collectionsRef) => {
            const collections = []
            collectionsRef.forEach((doc) => {
              const collection = doc.data()
              collection.id = doc.id
              collections.push(collection)
            })
            if (collections.length > 0) {
              this.currentCollections = collections[0].collection
            }
          })

        this.usersCollection
          .doc(this.currentUser.uid)
          .collection("environments")
          .onSnapshot((environmentsRef) => {
            const environments = []
            environmentsRef.forEach((doc) => {
              const environment = doc.data()
              environment.id = doc.id
              environments.push(environment)
            })
            if (environments.length > 0) {
              this.currentEnvironments = environments[0].environment
            }
          })
      } else {
        this.currentUser = null
      }
    })
  }

  async signInUserWithGoogle() {
    return await this.app.auth().signInWithPopup(this.authProviders.google())
  }

  async signInUserWithGithub() {
    return await this.app.auth().signInWithPopup(this.authProviders.github().addScope("gist"))
  }

  async signInWithEmailAndPassword(email, password) {
    return await this.app.auth().signInWithEmailAndPassword(email, password)
  }

  async getSignInMethodsForEmail(email) {
    return await this.app.auth().fetchSignInMethodsForEmail(email)
  }

  async signOutUser() {
    if (!this.currentUser) throw new Error("No user has logged in")

    await this.app.auth().signOut()
    this.currentUser = null
  }

  async writeFeeds(message, label) {
    const dt = {
      createdOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      message,
      label,
    }

    try {
      await this.usersCollection.doc(this.currentUser.uid).collection("feeds").add(dt)
    } catch (e) {
      console.error("error inserting", dt, e)
      throw e
    }
  }

  async deleteFeed(id) {
    try {
      await this.usersCollection.doc(this.currentUser.uid).collection("feeds").doc(id).delete()
    } catch (e) {
      console.error("error deleting", id, e)
      throw e
    }
  }

  async writeSettings(setting, value) {
    const st = {
      updatedOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      name: setting,
      value,
    }

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("settings")
        .doc(setting)
        .set(st)
    } catch (e) {
      console.error("error updating", st, e)
      throw e
    }
  }

  async writeHistory(entry) {
    const hs = entry

    try {
      await this.usersCollection.doc(this.currentUser.uid).collection("history").add(hs)
    } catch (e) {
      console.error("error inserting", hs, e)
      throw e
    }
  }

  async writeGraphqlHistory(entry) {
    const hs = entry

    try {
      await this.usersCollection.doc(this.currentUser.uid).collection("graphqlHistory").add(hs)
    } catch (e) {
      console.error("error inserting", hs, e)
      throw e
    }
  }

  async deleteHistory(entry) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("history")
        .doc(entry.id)
        .delete()
    } catch (e) {
      console.error("error deleting", entry, e)
      throw e
    }
  }

  async deleteGraphqlHistory(entry) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("graphqlHistory")
        .doc(entry.id)
        .delete()
    } catch (e) {
      console.error("error deleting", entry, e)
      throw e
    }
  }

  async clearHistory() {
    const { docs } = await this.usersCollection
      .doc(this.currentUser.uid)
      .collection("history")
      .get()

    await Promise.all(docs.map((e) => this.deleteHistory(e)))
  }

  async clearGraphqlHistory() {
    const { docs } = await this.usersCollection
      .doc(this.currentUser.uid)
      .collection("graphqlHistory")
      .get()

    await Promise.all(docs.map((e) => this.deleteGraphqlHistory(e)))
  }

  async toggleStar(entry, value) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("history")
        .doc(entry.id)
        .update({ star: value })
    } catch (e) {
      console.error("error deleting", entry, e)

      throw e
    }
  }

  async toggleGraphqlHistoryStar(entry, value) {
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("graphqlHistory")
        .doc(entry.id)
        .update({ star: value })
    } catch (e) {
      console.error("error deleting", entry, e)

      throw e
    }
  }

  async writeCollections(collection) {
    const cl = {
      updatedOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      collection,
    }

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("collections")
        .doc("sync")
        .set(cl)
    } catch (e) {
      console.error("error updating", cl, e)

      throw e
    }
  }

  async writeEnvironments(environment) {
    const ev = {
      updatedOn: new Date(),
      author: this.currentUser.uid,
      author_name: this.currentUser.displayName,
      author_image: this.currentUser.photoURL,
      environment,
    }

    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .collection("environments")
        .doc("sync")
        .set(ev)
    } catch (e) {
      console.error("error updating", ev, e)

      throw e
    }
  }

  async setProviderInfo(id, token) {
    const us = {
      updatedOn: new Date(),
      provider: id,
      accessToken: token,
    }
    try {
      await this.usersCollection
        .doc(this.currentUser.uid)
        .update(us)
        .catch((e) => console.error("error updating", us, e))
    } catch (e) {
      console.error("error updating", ev, e)

      throw e
    }
  }
}

export const fb = new FirebaseInstance(firebase.initializeApp(firebaseConfig), authProviders)
