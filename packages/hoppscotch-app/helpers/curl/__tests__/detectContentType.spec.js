import { detectContentType } from "../sub_helpers/contentParser"

describe("detect content type", () => {
  test("should return null for blank input", () => {
    expect(detectContentType("")).toBe(null)
  })

  describe("application/json", () => {
    test('should return text/plain for "{"', () => {
      expect(detectContentType("{")).toBe("text/plain")
    })

    test('should return application/json for "{}"', () => {
      expect(detectContentType("{}")).toBe("application/json")
    })

    test("should return application/json for valid json data", () => {
      expect(
        detectContentType(`
          {
            "body": "some text",
            "name": "interesting name",
            "code": [1, 5, 6, 2]
          }
        `)
      ).toBe("application/json")
    })
  })

  describe("application/xml", () => {
    test("should return text/html for XML data without XML declaration", () => {
      expect(
        detectContentType(`
          <book category="cooking">
            <title lang="en">Everyday Italian</title>
            <author>Giada De Laurentiis</author>
            <year>2005</year>
            <price>30.00</price>
          </book>
        `)
      ).toBe("text/html")
    })

    test("should return application/xml for valid XML data", () => {
      expect(
        detectContentType(`
        <?xml version="1.0" encoding="UTF-8"?>
        <book category="cooking">
          <title lang="en">Everyday Italian</title>
          <author>Giada De Laurentiis</author>
          <year>2005</year>
          <price>30.00</price>
        </book>
      `)
      ).toBe("text/html")
    })

    test("should return text/html for invalid XML data", () => {
      expect(
        detectContentType(`
        <book category="cooking">
          <title lang="en">Everyday Italian
          <abcd>Giada De Laurentiis</abcd>
          <year>2005</year>
          <price>30.00</price>
      `)
      ).toBe("text/html")
    })
  })

  describe("text/html", () => {
    test("should return text/html for valid HTML data", () => {
      expect(
        detectContentType(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Page Title</title>
          </head>
          <body>
            <h1>This is a Heading</h1>
            <p>This is a paragraph.</p>
          </body>
        </html>
      `)
      ).toBe("text/html")
    })

    test("should return text/html for invalid HTML data", () => {
      expect(
        detectContentType(`
          <head>
            <title>Page Title</title>
          <body>
            <h1>This is a Heading</h1>
          </body>
        </html>
      `)
      ).toBe("text/html")
    })

    test("should return text/html for unmatched tag", () => {
      expect(detectContentType("</html>")).toBe("text/html")
    })

    test("should return text/plain for no valid tags in input", () => {
      expect(detectContentType("</html")).toBe("text/plain")
    })
  })

  describe("application/x-www-form-urlencoded", () => {
    test("should return application/x-www-form-urlencoded for valid data", () => {
      expect(detectContentType("hello=world&hopp=scotch")).toBe(
        "application/x-www-form-urlencoded"
      )
    })

    test("should return application/x-www-form-urlencoded for empty pair", () => {
      expect(detectContentType("hello=world&hopp=scotch&")).toBe(
        "application/x-www-form-urlencoded"
      )
    })

    test("should return application/x-www-form-urlencoded for dangling param", () => {
      expect(detectContentType("hello=world&hoppscotch")).toBe(
        "application/x-www-form-urlencoded"
      )
    })

    test('should return text/plain for "="', () => {
      expect(detectContentType("=")).toBe("text/plain")
    })

    test("should return application/x-www-form-urlencoded for no value field", () => {
      expect(detectContentType("hello=")).toBe(
        "application/x-www-form-urlencoded"
      )
    })
  })

  describe("multipart/form-data", () => {
    test("should return multipart/form-data for valid data", () => {
      expect(
        detectContentType(
          `------WebKitFormBoundaryj3oufpIISPa2DP7c\\r\\nContent-Disposition: form-data; name="EmailAddress"\\r\\n\\r\\ntest@test.com\\r\\n------WebKitFormBoundaryj3oufpIISPa2DP7c\\r\\nContent-Disposition: form-data; name="Entity"\\r\\n\\r\\n1\\r\\n------WebKitFormBoundaryj3oufpIISPa2DP7c--\\r\\n`
        )
      ).toBe("multipart/form-data")
    })

    test("should return application/x-www-form-urlencoded for data with only one boundary", () => {
      expect(
        detectContentType(
          `\\r\\nContent-Disposition: form-data; name="EmailAddress"\\r\\n\\r\\ntest@test.com\\r\\n\\r\\nContent-Disposition: form-data; name="Entity"\\r\\n\\r\\n1\\r\\n------WebKitFormBoundaryj3oufpIISPa2DP7c--\\r\\n`
        )
      ).toBe("application/x-www-form-urlencoded")
    })
  })
})
