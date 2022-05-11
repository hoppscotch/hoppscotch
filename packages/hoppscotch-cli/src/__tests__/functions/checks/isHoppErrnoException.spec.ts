import { isHoppErrnoException } from "../../../utils/checks";

describe("isHoppErrnoException", () => {
  test("NULL exception value.", () => {
    expect(isHoppErrnoException(null)).toBeFalsy();
  });

  test("Non-existing name property.", () => {
    expect(isHoppErrnoException({ what: "what" })).toBeFalsy();
  });

  test("Invalid name value.", () => {
    expect(isHoppErrnoException({ name: 3 })).toBeFalsy();
  });

  test("Valid name value.", () => {
    expect(isHoppErrnoException({ name: "name" })).toBeTruthy();
  });
});
