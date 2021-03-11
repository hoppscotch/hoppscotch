import { FirebaseInstance } from "../fb"

import { MockAuthentication, MockFirestore, MockFirebaseSdk } from "firebase-mock"

let mockAuth
let mockFirestore

let mocksdk

const testuser = {
  uid: "testuid",
  displayName: "Test User",
  email: "test@hoppsctoch.io",
  photoURL: "testphotourl",
  providerData: [
    {
      displayName: "Test User",
      email: "test@hoppscotch.io",
      photoURL: "testphotourl",
      providerId: "google.com",
      uid: "testprovideruid",
    },
  ],
}

// Tear down and make a new instance for testing each time
beforeEach(async () => {
  mockAuth = new MockAuthentication()
  mockFirestore = new MockFirestore()

  mocksdk = new MockFirebaseSdk(
    () => null,
    () => mockAuth,
    () => mockFirestore,
    () => null,
    () => null
  )

  mocksdk.auth().autoFlush()
  mocksdk.firestore().autoFlush()

  await mocksdk.firestore().collection("users").doc(testuser.uid).set({
    updatedOn: new Date(),
    provider: testuser.provider,
    name: testuser.displayName,
    email: testuser.providerData[0].email,
    photoURL: testuser.photourl,
    uid: testuser.uid,
  })

  // Test History Entry
  await mocksdk
    .firestore()
    .collection("users")
    .doc(testuser.uid)
    .collection("history")
    .doc()
    .set({
      auth: "None",
      bearerToken: "",
      bodyParams: [],
      contentType: "",
      updatedOn: new Date(1598703948000),
      date: "8/29/2020",
      duration: 708,
      headers: [],
      httpPassword: "",
      httpUser: "",
      label: "",
      method: "GET",
      params: [],
      path: "/status/200",
      preRequestScript: "// pw.env.set('variable', 'value');",
      rawInput: true,
      rawParams: "",
      requestType: "",
      star: false,
      status: 200,
      testScript: "// pw.expect('variable').toBe('value');",
      time: "12:12:27 PM",
      url: "https://postman-echo.com",
      usesPostScripts: true,
      usesPreScripts: true,
    })

  await mocksdk
    .firestore()
    .collection("users")
    .doc(testuser.uid)
    .collection("settings")
    .doc("syncCollections")
    .set({
      author: testuser.uid,
      author_image: testuser.photoURL,
      author_name: testuser.displayName,
      name: "syncCollections",
      updatedOn: new Date(1598703948000),
      value: true,
    })

  await mocksdk
    .firestore()
    .collection("users")
    .doc(testuser.uid)
    .collection("settings")
    .doc("syncEnvironments")
    .set({
      author: testuser.uid,
      author_image: testuser.photoURL,
      author_name: testuser.displayName,
      name: "syncEnvironments",
      updatedOn: new Date(1598703948000),
      value: true,
    })

  await mocksdk
    .firestore()
    .collection("users")
    .doc(testuser.uid)
    .collection("settings")
    .doc("syncHistory")
    .set({
      author: testuser.uid,
      author_image: testuser.photoURL,
      author_name: testuser.displayName,
      name: "syncHistory",
      updatedOn: new Date(1598703948000),
      value: true,
    })

  await mocksdk
    .firestore()
    .collection("users")
    .doc(testuser.uid)
    .collection("feeds")
    .doc()
    .set({
      author: testuser.uid,
      author_image: testuser.photoURL,
      author_name: testuser.displayName,
      createdOn: new Date(1598703948000),
      label: "Test Feed Entry",
      message: "Testing is awesome",
    })
})

function signInUser() {
  mocksdk.auth().changeAuthState(testuser)
}

function signOutUser() {
  mocksdk.auth().changeAuthState(null)
}

describe("FirebaseInstance", () => {
  describe("signInUserWithGoogle", () => {
    test("resolves when the firebase request resolves", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithPopup")

      const fb = new FirebaseInstance(mocksdk, {
        google: () => {},
      })

      signOutUser()

      fbFunc.mockImplementation(() => Promise.resolve(""))

      await expect(fb.signInUserWithGoogle()).resolves.toBeDefined()
    })
    test("rejects when the firebase request rejects", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithPopup")

      const fb = new FirebaseInstance(mocksdk, {
        google: () => {},
      })

      signOutUser()

      fbFunc.mockImplementation(() => Promise.reject(""))

      await expect(fb.signInUserWithGoogle()).rejects.toBeDefined()
    })
    test("throws the error the firebase request throws", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithPopup")

      const fb = new FirebaseInstance(mocksdk, {
        google: () => {},
      })

      signOutUser()

      fbFunc.mockImplementation(() => Promise.reject("test error"))

      await expect(fb.signInUserWithGoogle()).rejects.toEqual("test error")
    })
    test("resolves the response the firebase request resolves", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithPopup")

      const fb = new FirebaseInstance(mocksdk, {
        google: () => {},
      })

      signOutUser()

      fbFunc.mockImplementation(() => Promise.resolve("test"))

      await expect(fb.signInUserWithGoogle()).resolves.toEqual("test")
    })
  })
  describe("signInUserWithGithub", () => {
    test("resolves when the firebase request resolves", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithPopup")

      const fb = new FirebaseInstance(mocksdk, {
        github: () => {
          return {
            addScope: () => {},
          }
        },
      })

      signOutUser()

      fbFunc.mockImplementation(() => Promise.resolve(""))

      await expect(fb.signInUserWithGithub()).resolves.toBeDefined()
    })
    test("rejects when the firebase request rejects", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithPopup")

      const fb = new FirebaseInstance(mocksdk, {
        github: () => {
          return {
            addScope: () => {},
          }
        },
      })

      signOutUser()

      fbFunc.mockImplementation(() => Promise.reject(""))

      await expect(fb.signInUserWithGithub()).rejects.toBeDefined()
    })
    test("throws the error the firebase request throws", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithPopup")

      const fb = new FirebaseInstance(mocksdk, {
        github: () => {
          return {
            addScope: () => {},
          }
        },
      })

      signOutUser()

      fbFunc.mockImplementation(() => Promise.reject("test error"))

      await expect(fb.signInUserWithGithub()).rejects.toEqual("test error")
    })
    test("adds 'gist' scope", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithPopup")

      const addScopeMock = jest.fn()

      const fb = new FirebaseInstance(mocksdk, {
        github: () => {
          return {
            addScope: addScopeMock,
          }
        },
      })

      signOutUser()

      fbFunc.mockImplementation(() => Promise.resolve("test"))
      await fb.signInUserWithGithub()

      expect(addScopeMock).toBeCalledWith("gist")
    })
    test("resolves the response the firebase request resolves", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithPopup")

      const fb = new FirebaseInstance(mocksdk, {
        github: () => {
          return {
            addScope: () => {},
          }
        },
      })

      signOutUser()

      fbFunc.mockImplementation(() => Promise.resolve("test"))

      await expect(fb.signInUserWithGithub()).resolves.toEqual("test")
    })
  })
  describe("signInWithEmailAndPassword", () => {
    test("email and password are properly passed to the firebase request", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithEmailAndPassword")

      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      let sentEmail
      let sentPassword

      fbFunc.mockImplementation((email, password) => {
        sentEmail = email
        sentPassword = password

        return Promise.resolve("")
      })

      await fb.signInWithEmailAndPassword("test@hoppscotch.io", "testpass")

      expect(sentEmail).toEqual("test@hoppscotch.io")
      expect(sentPassword).toEqual("testpass")
    })
    test("resolves when the firebase request resolves", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithEmailAndPassword")

      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      fbFunc.mockImplementation(() => Promise.resolve(""))

      await expect(
        fb.signInWithEmailAndPassword("test@hoppscotch.io", "testpass")
      ).resolves.toBeDefined()
    })
    test("rejects when the firebase request rejects", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithEmailAndPassword")

      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      fbFunc.mockImplementation(() => Promise.reject(""))

      await expect(
        fb.signInWithEmailAndPassword("test@hoppscotch.io", "testpass")
      ).rejects.toBeDefined()
    })
    test("throws the error the firebase request throws", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithEmailAndPassword")

      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      fbFunc.mockImplementation(() => Promise.reject("test error"))

      await expect(fb.signInWithEmailAndPassword("test@hoppscotch.io", "testpass")).rejects.toEqual(
        "test error"
      )
    })
    test("resolves the response the firebase request resolves", async () => {
      const fbFunc = jest.spyOn(mockAuth, "signInWithEmailAndPassword")

      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      fbFunc.mockImplementation(() => Promise.resolve("test"))

      await expect(
        fb.signInWithEmailAndPassword("test@hoppscotch.io", "testpass")
      ).resolves.toEqual("test")
    })
  })
  describe("signOutUser", () => {
    test("resolves for a proper request with authentication", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      await expect(fb.signOutUser()).resolves.toBeUndefined()
    })

    test("rejects for a request with no user logged in", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signOutUser()

      await expect(fb.signOutUser()).rejects.toBeDefined()
    })

    test("asks firebase to signOut the user", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      const fn = jest.spyOn(mocksdk.auth(), "signOut")
      fn.mockResolvedValueOnce(null)

      await fb.signOutUser()

      expect(fn).toHaveBeenCalledTimes(1)
    })

    test("sets the currentUser field to null", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      await fb.signOutUser()

      expect(fb.currentUser).toBeNull()
    })
  })
  describe("writeFeeds", () => {
    test("resolves for a proper request with auth", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      await expect(fb.writeFeeds("Test Message", "Test Label")).resolves.toBeUndefined()
    })

    test("rejects if user not authenticated", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signOutUser()

      await expect(fb.writeFeeds("Test Message", "Test Label")).rejects.toBeDefined()
    })

    test("stored feed object has proper structure", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      await fb.writeFeeds("Test Message", "Test Label")

      const doc = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("feeds")
          .limit(10)
          .get()
      ).docs.map((snapshot) => snapshot.data())[0]

      expect(doc).toEqual(
        expect.objectContaining({
          createdOn: expect.any(Date),
          author: expect.any(String),
          author_name: expect.any(String),
          author_image: expect.any(String),
          message: expect.any(String),
          label: expect.any(String),
        })
      )
    })

    test("stored feed object has proper values", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      await fb.writeFeeds("Test Message", "Test Label")

      const doc = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("feeds")
          .limit(10)
          .get()
      ).docs.map((snapshot) => snapshot.data())[1]

      expect(doc).toEqual(
        expect.objectContaining({
          createdOn: expect.any(Date),
          author: testuser.uid,
          author_name: testuser.displayName,
          author_image: testuser.photoURL,
          message: "Test Message",
          label: "Test Label",
        })
      )
    })
  })

  describe("deleteFeed", () => {
    test("resolves for proper request", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      await fb.writeFeeds("Test Message", "Test Label")

      const id = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("feeds")
          .limit(10)
          .get()
      ).docs.map((s) => s.id)[0]

      await expect(fb.deleteFeed(id)).resolves.toBeUndefined()
    })

    test("rejects if user not authenticated", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      await fb.writeFeeds("Test Message", "Test Label")

      signOutUser()

      const id = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("feeds")
          .limit(10)
          .get()
      ).docs.map((s) => s.id)[0]

      await expect(fb.deleteFeed(id)).rejects.toBeDefined()
    })

    test("deletes feed if ID is correct and valid", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      await fb.writeFeeds("Test Message", "Test Label")

      const id = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("feeds")
          .limit(10)
          .get()
      ).docs.map((s) => s.id)[0]

      await fb.deleteFeed(id)

      expect(
        (
          await mocksdk
            .firestore()
            .collection("users")
            .doc(testuser.uid)
            .collection("feeds")
            .limit(10)
            .get()
        ).docs
      ).toHaveLength(1)
    })

    test("rejects if the ID is null", async () => {
      const fb = new FirebaseInstance(mocksdk)
      signInUser()

      await fb.writeFeeds("Test Message", "Test Label")

      await expect(fb.deleteFeed(null)).rejects.toBeDefined()
    })
  })

  describe("writeSettings", () => {
    test("resolves for a proper update request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await expect(fb.writeSettings("syncCollections", true)).resolves.toBeUndefined()
    })

    test("rejects for an unauthenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      await expect(fb.writeSettings("syncCollections", true)).rejects.toBeDefined()
    })

    test("rejects if the setting is null", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await expect(fb.writeSettings(null, false)).rejects.toBeDefined()
    })

    test("resolves even if the value is null", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await expect(fb.writeSettings("syncCollections", null)).resolves.toBeUndefined()
    })

    test("writes a new setting if not existing", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeSettings("newTestSetting", true)

      const doc = await mocksdk
        .firestore()
        .collection("users")
        .doc(testuser.uid)
        .collection("settings")
        .doc("newTestSetting")
        .get()

      expect(doc.exists).toEqual(true)
    })

    test("updates setting if existing", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeSettings("syncCollections", false)

      const doc = await mocksdk
        .firestore()
        .collection("users")
        .doc(testuser.uid)
        .collection("settings")
        .doc("syncCollections")
        .get()

      expect(doc.data().value).toEqual(false)
    })

    test("new setting object has proper fields", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeSettings("newTestSetting", false)

      const doc = await mocksdk
        .firestore()
        .collection("users")
        .doc(testuser.uid)
        .collection("settings")
        .doc("newTestSetting")
        .get()

      expect(doc.data()).toEqual(
        expect.objectContaining({
          updatedOn: expect.any(Date),
          author: expect.any(String),
          author_name: expect.any(String),
          author_image: expect.any(String),
          name: expect.any(String),
          value: expect.anything(),
        })
      )
    })

    test("new setting object has proper values", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeSettings("newTestSetting", false)

      const doc = await mocksdk
        .firestore()
        .collection("users")
        .doc(testuser.uid)
        .collection("settings")
        .doc("newTestSetting")
        .get()

      expect(doc.data()).toEqual(
        expect.objectContaining({
          updatedOn: expect.any(Date),
          author: testuser.uid,
          author_name: testuser.displayName,
          author_image: testuser.photoURL,
          name: "newTestSetting",
          value: false,
        })
      )
    })

    test("updated setting object has proper fields", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeSettings("syncCollections", false)

      const doc = await mocksdk
        .firestore()
        .collection("users")
        .doc(testuser.uid)
        .collection("settings")
        .doc("syncCollections")
        .get()

      expect(doc.data()).toEqual(
        expect.objectContaining({
          updatedOn: expect.any(Date),
          author: expect.any(String),
          author_name: expect.any(String),
          author_image: expect.any(String),
          name: expect.any(String),
          value: expect.anything(),
        })
      )
    })

    test("updated setting object fields has proper values", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeSettings("syncCollections", false)

      const doc = await mocksdk
        .firestore()
        .collection("users")
        .doc(testuser.uid)
        .collection("settings")
        .doc("syncCollections")
        .get()

      expect(doc.data()).toEqual(
        expect.objectContaining({
          updatedOn: expect.any(Date),
          author: testuser.uid,
          author_name: testuser.displayName,
          author_image: testuser.photoURL,
          name: "syncCollections",
          value: false,
        })
      )
    })
  })

  describe("writeHistory", () => {
    const testEntry = {
      auth: "None",
      bearerToken: "",
      bodyParams: [],
      contentType: "",
      updatedOn: new Date(1598703948000),
      date: "8/29/2021",
      duration: 708,
      headers: [],
      httpPassword: "",
      httpUser: "",
      label: "",
      method: "GET",
      params: [],
      path: "/status/200",
      preRequestScript: "// pw.env.set('variable', 'value');",
      rawInput: true,
      rawParams: "",
      requestType: "",
      star: false,
      status: 200,
      testScript: "// pw.expect('variable').toBe('value');",
      time: "12:12:28 PM",
      url: "https://test-entry.test",
      usesPostScripts: true,
      usesPreScripts: true,
    }

    test("resolves for a proper write request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await expect(fb.writeHistory(testEntry)).resolves.toBeUndefined()
    })

    test("rejects if the user is not autenticated", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      await expect(fb.writeHistory(testEntry)).rejects.toBeDefined()
    })

    test("stores the exact same field values in firestore", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeHistory(testEntry)

      const doc = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("history")
          .where("url", "==", testEntry.url)
          .limit(1)
          .get()
      ).docs.map((e) => e.data())[0]

      expect(doc).toEqual(testEntry)
    })
  })

  describe("deleteHistory", () => {
    test("resolves for proper authenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      const entry = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("history")
          .limit(1)
          .get()
      ).docs.map((e) => {
        return {
          ...e.data(),
          id: e.id,
        }
      })[0]

      await expect(fb.deleteHistory(entry)).resolves.toBeUndefined()
    })

    test("rejects if the user is not authenticated", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      const entry = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("history")
          .limit(1)
          .get()
      ).docs.map((e) => {
        return {
          ...e.data(),
          id: e.id,
        }
      })[0]

      await expect(fb.deleteHistory(entry)).rejects.toBeDefined()
    })

    test("performs the deletion on firestore", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      const entry = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("history")
          .limit(1)
          .get()
      ).docs.map((e) => {
        return {
          ...e.data(),
          id: e.id,
        }
      })[0]

      await fb.deleteHistory(entry)

      const docs = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("history")
          .limit(1)
          .get()
      ).docs

      expect(docs).toHaveLength(0)
    })
  })

  describe("clearHistory", () => {
    test("resolves for a proper authenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await expect(fb.clearHistory()).resolves.toBeUndefined()
    })

    test("rejects for a non-authenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      await expect(fb.clearHistory()).rejects.toBeDefined()
    })

    test("actually performs the deletion", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeHistory({
        auth: "None",
        bearerToken: "",
        bodyParams: [],
        contentType: "",
        updatedOn: new Date(1598703948000),
        date: "8/29/2021",
        duration: 708,
        headers: [],
        httpPassword: "",
        httpUser: "",
        label: "",
        method: "GET",
        params: [],
        path: "/status/200",
        preRequestScript: "// pw.env.set('variable', 'value');",
        rawInput: true,
        rawParams: "",
        requestType: "",
        star: false,
        status: 200,
        testScript: "// pw.expect('variable').toBe('value');",
        time: "12:12:28 PM",
        url: "https://test-entry.test",
        usesPostScripts: true,
        usesPreScripts: true,
      })

      await fb.clearHistory()

      const docs = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("history")
          .limit(10)
          .get()
      ).docs

      expect(docs).toHaveLength(0)
    })
  })

  describe("toggleStar", () => {
    const testEntry = {
      auth: "None",
      bearerToken: "",
      bodyParams: [],
      contentType: "",
      updatedOn: new Date(1598703948000),
      date: "8/29/2021",
      duration: 708,
      headers: [],
      httpPassword: "",
      httpUser: "",
      label: "",
      method: "GET",
      params: [],
      path: "/status/200",
      preRequestScript: "// pw.env.set('variable', 'value');",
      rawInput: true,
      rawParams: "",
      requestType: "",
      star: false,
      status: 200,
      testScript: "// pw.expect('variable').toBe('value');",
      time: "12:12:28 PM",
      url: "https://test-entry.test",
      usesPostScripts: true,
      usesPreScripts: true,
    }

    test("resolves for a proper authenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeHistory(testEntry)

      await expect(fb.toggleStar(testEntry, true)).resolves.toBeUndefined()
    })

    test("rejects for a non-authenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeHistory(testEntry)

      signOutUser()

      await expect(fb.toggleStar(testEntry, true)).rejects.toBeDefined()
    })

    test("updates only the star data for the requested entry", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeHistory(testEntry)

      const entry = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("history")
          .where("url", "==", testEntry.url)
          .limit(1)
          .get()
      ).docs.map((e) => {
        return {
          ...e.data(),
          id: e.id,
        }
      })[0]

      await fb.toggleStar(entry, true)

      const updatedDoc = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("history")
          .doc(entry.id)
          .get()
      ).data()

      const updatedEntry = {
        ...updatedDoc,
        id: entry.id,
      }

      expect(updatedEntry).toEqual(
        expect.objectContaining({
          ...entry,
          star: true,
        })
      )
    })

    test("does not update the data for the non-requested entries", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeHistory(testEntry)

      const otherEntry = (
        await mocksdk.firestore().collection("users").doc(testuser.uid).collection("history").get()
      ).docs.map((e) => {
        return {
          ...e.data(),
          id: e.id,
        }
      })[1]

      const entry = (
        await mocksdk.firestore().collection("users").doc(testuser.uid).collection("history").get()
      ).docs.map((e) => {
        return {
          ...e.data(),
          id: e.id,
        }
      })[0]

      await fb.toggleStar(entry, true)

      const afterUpdateOtherDoc = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("history")
          .doc(otherEntry.id)
          .get()
      ).data()

      const afterUpdateOtherEntry = {
        ...afterUpdateOtherDoc,
        id: otherEntry.id,
      }

      expect(afterUpdateOtherEntry).toEqual(otherEntry)
    })
  })

  describe("writeCollections", () => {
    test("resolves for proper authenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await expect(fb.writeCollections([])).resolves.toBeUndefined()
    })

    test("rejects for non-authenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      await expect(fb.writeCollections([])).rejects.toBeDefined()
    })

    test("stores data on firestore with proper structure", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeCollections([])

      const doc = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("collections")
          .doc("sync")
          .get()
      ).data()

      expect(doc).toEqual(
        expect.objectContaining({
          updatedOn: expect.any(Date),
          author: expect.any(String),
          author_name: expect.any(String),
          author_image: expect.any(String),
          collection: expect.anything(),
        })
      )
    })

    test("stores data on firestore with fields having proper values", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeCollections([])

      const doc = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("collections")
          .doc("sync")
          .get()
      ).data()

      expect(doc).toEqual(
        expect.objectContaining({
          updatedOn: expect.any(Date),
          author: testuser.uid,
          author_name: testuser.displayName,
          author_image: testuser.photoURL,
          collection: expect.anything(),
        })
      )
    })
  })

  describe("writeEnvironments", () => {
    test("resolves for proper authenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await expect(fb.writeEnvironments([])).resolves.toBeUndefined()
    })

    test("rejects for non-authenticated request", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signOutUser()

      await expect(fb.writeEnvironments([])).rejects.toBeDefined()
    })

    test("stores data on firestore with proper structure", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeEnvironments([])

      const doc = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("environments")
          .doc("sync")
          .get()
      ).data()

      expect(doc).toEqual(
        expect.objectContaining({
          updatedOn: expect.any(Date),
          author: expect.any(String),
          author_name: expect.any(String),
          author_image: expect.any(String),
          environment: expect.anything(),
        })
      )
    })

    test("stores data on firestore with fields having proper values", async () => {
      const fb = new FirebaseInstance(mocksdk)

      signInUser()

      await fb.writeEnvironments([])

      const doc = (
        await mocksdk
          .firestore()
          .collection("users")
          .doc(testuser.uid)
          .collection("environments")
          .doc("sync")
          .get()
      ).data()

      expect(doc).toEqual(
        expect.objectContaining({
          updatedOn: expect.any(Date),
          author: testuser.uid,
          author_name: testuser.displayName,
          author_image: testuser.photoURL,
          environment: expect.anything(),
        })
      )
    })
  })
})
