import { isHoppCLIError } from "../../../utils/checks";

describe("isHoppCLIError", () => {
  test("NULL error value.", () => {
    expect(isHoppCLIError(null)).toBeFalsy();
  });

  test("Non-existing code property.", () => {
    expect(isHoppCLIError({ name: "name" })).toBeFalsy();
  });

  test("Invalid code value.", () => {
    expect(isHoppCLIError({ code: 2 })).toBeFalsy();
  });

  test("Valid code value.", () => {
    expect(isHoppCLIError({ code: "TEST_SCRIPT_ERROR" })).toBeTruthy();
  });
});
