export default [
  {
    name: "Status code: Status code is 200",
    script: `\n\npw.test("Status code is 200", ()=> {
    pw.expect(pw.response.statusCode).toBe(200);
});`,
  },
  {
    name: "Response body: Contains string",
    script: `\n\npw.test("Status code is 200", ()=> {
    pw.expect(pw.response.statusCode).toBe(200);
});`,
  },
]
