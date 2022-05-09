import { isRESTCollection } from "../../../utils/checks";

describe("isRESTCollection", () => {
  test("Undefined collection value.", () => {
    expect(isRESTCollection(undefined)).toBeFalsy();
  });

  test("Invalid id value.", () => {
    expect(
      isRESTCollection({
        v: 1,
        name: "test",
        id: 1,
      })
    ).toBeFalsy();
  });

  test("Invalid requests value.", () => {
    expect(
      isRESTCollection({
        v: 1,
        name: "test",
        id: "1",
        requests: null,
      })
    ).toBeFalsy();
  });

  test("Invalid folders value.", () => {
    expect(
      isRESTCollection({
        v: 1,
        name: "test",
        id: "1",
        requests: [],
        folders: undefined,
      })
    ).toBeFalsy();
  });

  test("Invalid RESTCollection(s) in folders.", () => {
    expect(
      isRESTCollection({
        v: 1,
        name: "test",
        id: "1",
        requests: [],
        folders: [
          {
            v: 1,
            name: "test1",
            id: "2",
            requests: undefined,
            folders: [],
          },
        ],
      })
    ).toBeFalsy();
  });

  test("Invalid HoppRESTRequest(s) in requests.", () => {
    expect(
      isRESTCollection({
        v: 1,
        name: "test",
        id: "1",
        requests: [{}],
        folders: [],
      })
    ).toBeFalsy();
  });

  test("Valid RESTCollection.", () => {
    expect(
      isRESTCollection({
        v: 1,
        name: "test",
        id: "1",
        requests: [],
        folders: [],
      })
    ).toBeTruthy();
  });
});
