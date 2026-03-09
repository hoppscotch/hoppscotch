import { HoppRESTRequest, getDefaultRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { applyScriptRequestUpdates } from "../experimental-sandbox-integration"

const DEFAULT_REQUEST = getDefaultRESTRequest()

describe("Experimental Sandbox Integration", () => {
  describe("applyScriptRequestUpdates", () => {
    describe("Core Functionality", () => {
      test("should preserve file uploads when scripts modify other properties", () => {
        const file = new File(["test content"], "test.txt", {
          type: "text/plain",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload Request",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: [file],
                isFile: true,
                active: true,
              },
              {
                key: "name",
                value: "John",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          endpoint: "https://api.example.com/upload?timestamp=123",
          headers: [
            { key: "X-Custom", value: "header", active: true, description: "" },
          ],
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: "",
                isFile: false,
                active: true,
              },
              {
                key: "name",
                value: "John",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        expect(mergedRequest.endpoint).toBe(
          "https://api.example.com/upload?timestamp=123"
        )
        expect(mergedRequest.headers).toHaveLength(1)
        expect(mergedRequest.headers[0].key).toBe("X-Custom")

        expect(mergedRequest.body.contentType).toBe("multipart/form-data")
        if (mergedRequest.body.contentType === "multipart/form-data") {
          const fileField = mergedRequest.body.body[0]
          expect(fileField.isFile).toBe(true)
          if (fileField.isFile && Array.isArray(fileField.value)) {
            expect(fileField.value).toHaveLength(1)
            expect(fileField.value[0]).toBeInstanceOf(File)
            expect((fileField.value[0] as File).name).toBe("test.txt")
          }
        }
      })

      test("should preserve multiple files in a single field", () => {
        const file1 = new File(["content1"], "file1.txt", {
          type: "text/plain",
        })
        const file2 = new File(["content2"], "file2.txt", {
          type: "text/plain",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Multi Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "files",
                value: [file1, file2],
                isFile: true,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          method: "PUT",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "files",
                value: "",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        expect(mergedRequest.method).toBe("PUT")

        if (mergedRequest.body.contentType === "multipart/form-data") {
          const filesField = mergedRequest.body.body[0]
          if (filesField.isFile && Array.isArray(filesField.value)) {
            expect(filesField.value).toHaveLength(2)
            expect((filesField.value[0] as File).name).toBe("file1.txt")
            expect((filesField.value[1] as File).name).toBe("file2.txt")
          }
        }
      })

      test("should preserve files while allowing text fields to be updated", () => {
        const file = new File(["content"], "document.pdf", {
          type: "application/pdf",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Mixed Form",
          endpoint: "https://api.example.com/submit",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "document",
                value: [file],
                isFile: true,
                active: true,
              },
              {
                key: "title",
                value: "Original Title",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "document",
                value: "",
                isFile: false,
                active: true,
              },
              {
                key: "title",
                value: "Updated by Script",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          const docField = mergedRequest.body.body[0]
          if (docField.isFile && Array.isArray(docField.value)) {
            expect(docField.value[0]).toBeInstanceOf(File)
            expect((docField.value[0] as File).name).toBe("document.pdf")
          }

          const titleField = mergedRequest.body.body[1]
          if (!titleField.isFile) {
            expect(titleField.value).toBe("Updated by Script")
          }
        }
      })

      test("should preserve file upload in application/octet-stream body", () => {
        const file = new File(["binary content"], "data.bin", {
          type: "application/octet-stream",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Binary Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "application/octet-stream",
            body: file,
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          headers: [
            { key: "X-Auth", value: "token", active: true, description: "" },
          ],
          body: {
            contentType: "application/octet-stream",
            body: null,
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        expect(mergedRequest.headers).toHaveLength(1)
        expect(mergedRequest.body.contentType).toBe("application/octet-stream")
        if (mergedRequest.body.contentType === "application/octet-stream") {
          expect(mergedRequest.body.body).toBeInstanceOf(File)
          expect(mergedRequest.body.body).toBe(file)
        }
      })

      test("should preserve file uploads when script only modifies URL", () => {
        const file = new File(["content"], "test.txt", { type: "text/plain" })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: [file],
                isFile: true,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          endpoint: "https://api.example.com/modified",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: "",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        expect(mergedRequest.endpoint).toBe("https://api.example.com/modified")

        if (mergedRequest.body.contentType === "multipart/form-data") {
          const fileField = mergedRequest.body.body[0]
          expect(fileField.isFile).toBe(true)
          if (fileField.isFile && Array.isArray(fileField.value)) {
            expect(fileField.value[0]).toBeInstanceOf(File)
          }
        }
      })

      test("should handle non-file form data correctly", () => {
        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Form Request",
          endpoint: "https://api.example.com/form",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "name",
                value: "John",
                isFile: false,
                active: true,
              },
              {
                key: "email",
                value: "john@example.com",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "name",
                value: "Jane",
                isFile: false,
                active: true,
              },
              {
                key: "email",
                value: "john@example.com",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          const nameField = mergedRequest.body.body[0]
          if (!nameField.isFile) {
            expect(nameField.value).toBe("Jane")
          }
        }
      })
    })

    describe("Edge Cases", () => {
      test("should handle duplicate keys with mixed file and text fields", () => {
        const file1 = new File(["content1"], "col.json", {
          type: "application/json",
        })
        const file2 = new File(["content2"], "test-postman-compat.json", {
          type: "application/json",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: [file1],
                isFile: true,
                active: true,
              },
              {
                key: "file",
                value: "test",
                isFile: false,
                active: true,
              },
              {
                key: "file",
                value: [file2],
                isFile: true,
                active: true,
              },
              {
                key: "e",
                value: "test",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: "",
                isFile: false,
                active: true,
              },
              {
                key: "file",
                value: "test",
                isFile: false,
                active: true,
              },
              {
                key: "file",
                value: "",
                isFile: false,
                active: true,
              },
              {
                key: "text",
                value: "test",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          expect(mergedRequest.body.body).toHaveLength(4)

          const field0 = mergedRequest.body.body[0]
          expect(field0.key).toBe("file")
          expect(field0.isFile).toBe(true)
          if (field0.isFile && Array.isArray(field0.value)) {
            expect((field0.value[0] as File).name).toBe("col.json")
          }

          const field1 = mergedRequest.body.body[1]
          expect(field1.key).toBe("file")
          expect(field1.isFile).toBe(false)
          if (!field1.isFile) {
            expect(field1.value).toBe("test")
          }

          const field2 = mergedRequest.body.body[2]
          expect(field2.key).toBe("file")
          expect(field2.isFile).toBe(true)
          if (field2.isFile && Array.isArray(field2.value)) {
            expect((field2.value[0] as File).name).toBe(
              "test-postman-compat.json"
            )
          }

          const field3 = mergedRequest.body.body[3]
          expect(field3.key).toBe("text")
          expect(field3.isFile).toBe(false)
          if (!field3.isFile) {
            expect(field3.value).toBe("test")
          }
        }
      })

      test("should handle duplicate file keys without mixing them up", () => {
        const file1 = new File(["content1"], "file1.txt", {
          type: "text/plain",
        })
        const file2 = new File(["content2"], "file2.txt", {
          type: "text/plain",
        })
        const file3 = new File(["content3"], "file3.txt", {
          type: "text/plain",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: [file1],
                isFile: true,
                active: true,
              },
              {
                key: "file",
                value: [file2],
                isFile: true,
                active: true,
              },
              {
                key: "file",
                value: [file3],
                isFile: true,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: "",
                isFile: false,
                active: true,
              },
              {
                key: "file",
                value: "",
                isFile: false,
                active: true,
              },
              {
                key: "file",
                value: "",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          expect(mergedRequest.body.body).toHaveLength(3)

          const field0 = mergedRequest.body.body[0]
          expect(field0.isFile).toBe(true)
          if (field0.isFile && Array.isArray(field0.value)) {
            expect((field0.value[0] as File).name).toBe("file1.txt")
          }

          const field1 = mergedRequest.body.body[1]
          expect(field1.isFile).toBe(true)
          if (field1.isFile && Array.isArray(field1.value)) {
            expect((field1.value[0] as File).name).toBe("file2.txt")
          }

          const field2 = mergedRequest.body.body[2]
          expect(field2.isFile).toBe(true)
          if (field2.isFile && Array.isArray(field2.value)) {
            expect((field2.value[0] as File).name).toBe("file3.txt")
          }
        }
      })

      test("should handle scripts adding new fields", () => {
        const file = new File(["content"], "doc.pdf", {
          type: "application/pdf",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "document",
                value: [file],
                isFile: true,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "document",
                value: "",
                isFile: false,
                active: true,
              },
              {
                key: "metadata",
                value: '{"added": "by script"}',
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          expect(mergedRequest.body.body).toHaveLength(2)

          const docField = mergedRequest.body.body[0]
          if (docField.isFile && Array.isArray(docField.value)) {
            expect(docField.value[0]).toBeInstanceOf(File)
          }

          const metadataField = mergedRequest.body.body[1]
          if (!metadataField.isFile) {
            expect(metadataField.key).toBe("metadata")
          }
        }
      })

      test("should handle scripts removing fields", () => {
        const file = new File(["content"], "doc.pdf", {
          type: "application/pdf",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "document",
                value: [file],
                isFile: true,
                active: true,
              },
              {
                key: "extra",
                value: "data",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "document",
                value: "",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          expect(mergedRequest.body.body).toHaveLength(1)

          const docField = mergedRequest.body.body[0]
          if (docField.isFile && Array.isArray(docField.value)) {
            expect(docField.value[0]).toBeInstanceOf(File)
          }
        }
      })

      test("should preserve inactive file fields", () => {
        const file = new File(["content"], "doc.pdf", {
          type: "application/pdf",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "document",
                value: [file],
                isFile: true,
                active: false,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "document",
                value: "",
                isFile: false,
                active: false,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          const docField = mergedRequest.body.body[0]
          expect(docField.active).toBe(false)
          if (docField.isFile && Array.isArray(docField.value)) {
            expect(docField.value[0]).toBeInstanceOf(File)
          }
        }
      })

      test("should preserve field-level contentType metadata", () => {
        const file = new File(["content"], "image.jpg", { type: "image/jpeg" })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "image",
                value: [file],
                isFile: true,
                active: true,
                contentType: "image/jpeg",
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "image",
                value: "",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          const imageField = mergedRequest.body.body[0]
          if (imageField.isFile && Array.isArray(imageField.value)) {
            expect(imageField.value[0]).toBeInstanceOf(File)
          }
        }
      })

      test("should handle scripts reordering fields using key-based matching", () => {
        const file = new File(["content"], "doc.pdf", {
          type: "application/pdf",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "document",
                value: [file],
                isFile: true,
                active: true,
              },
              {
                key: "name",
                value: "John",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        // Script reorders fields: name moves before document
        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "name",
                value: "Jane",
                isFile: false,
                active: true,
              },
              {
                key: "document",
                value: "",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          expect(mergedRequest.body.body).toHaveLength(2)

          const nameField = mergedRequest.body.body[0]
          expect(nameField.key).toBe("name")
          expect(nameField.isFile).toBe(false)
          if (!nameField.isFile) {
            expect(nameField.value).toBe("Jane")
          }

          const docField = mergedRequest.body.body[1]
          expect(docField.key).toBe("document")
          expect(docField.isFile).toBe(true)
          if (docField.isFile && Array.isArray(docField.value)) {
            expect(docField.value[0]).toBeInstanceOf(File)
            expect((docField.value[0] as File).name).toBe("doc.pdf")
          }
        }
      })

      test("should handle scripts adding fields at beginning without corrupting file mapping", () => {
        const file = new File(["content"], "report.pdf", {
          type: "application/pdf",
        })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "report",
                value: [file],
                isFile: true,
                active: true,
              },
              {
                key: "description",
                value: "Q4 Report",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        // Script adds "timestamp" field at beginning, shifting all indices
        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "timestamp",
                value: "2024-01-01T00:00:00Z",
                isFile: false,
                active: true,
              },
              {
                key: "report",
                value: "",
                isFile: false,
                active: true,
              },
              {
                key: "description",
                value: "Q4 Report",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          expect(mergedRequest.body.body).toHaveLength(3)

          const timestampField = mergedRequest.body.body[0]
          expect(timestampField.key).toBe("timestamp")
          expect(timestampField.isFile).toBe(false)

          const reportField = mergedRequest.body.body[1]
          expect(reportField.key).toBe("report")
          expect(reportField.isFile).toBe(true)
          if (reportField.isFile && Array.isArray(reportField.value)) {
            expect(reportField.value[0]).toBeInstanceOf(File)
            expect((reportField.value[0] as File).name).toBe("report.pdf")
          }

          const descField = mergedRequest.body.body[2]
          expect(descField.key).toBe("description")
        }
      })

      test("should not preserve files when script changes field key (intentional rename)", () => {
        const file = new File(["content"], "data.csv", { type: "text/csv" })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "old_key",
                value: [file],
                isFile: true,
                active: true,
              },
            ],
          },
        }

        // Script renames the key
        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "new_key",
                value: "",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          expect(mergedRequest.body.body).toHaveLength(1)

          const field = mergedRequest.body.body[0]
          expect(field.key).toBe("new_key")
          expect(field.isFile).toBe(false)
          if (!field.isFile) {
            expect(field.value).toBe("")
          }
        }
      })

      test("should preserve generic Blob objects (technical support)", () => {
        const blob = new Blob(["blob content"], { type: "text/plain" })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "data",
                value: [blob],
                isFile: true,
                active: true,
              },
            ],
          },
        }

        const updatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "data",
                value: "",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const mergedRequest = applyScriptRequestUpdates(
          originalRequest,
          updatedRequest
        )

        if (mergedRequest.body.contentType === "multipart/form-data") {
          const dataField = mergedRequest.body.body[0]
          if (dataField.isFile && Array.isArray(dataField.value)) {
            expect(dataField.value[0]).toBeInstanceOf(Blob)
          }
        }
      })
    })

    describe("Regression", () => {
      test("should preserve file uploads through JSON serialization (regression test for #5443)", () => {
        const file = new File(["content"], "test.txt", { type: "text/plain" })

        const originalRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          name: "Upload",
          endpoint: "https://api.example.com/upload",
          method: "POST",
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: [file],
                isFile: true,
                active: true,
              },
            ],
          },
        }

        const brokenUpdatedRequest: HoppRESTRequest = {
          ...DEFAULT_REQUEST,
          body: {
            contentType: "multipart/form-data",
            body: [
              {
                key: "file",
                value: "",
                isFile: false,
                active: true,
              },
            ],
          },
        }

        const brokenMerge = { ...originalRequest, ...brokenUpdatedRequest }

        if (brokenMerge.body.contentType === "multipart/form-data") {
          const brokenFileField = brokenMerge.body.body[0]
          expect(brokenFileField.value).toEqual("")
          expect(brokenFileField.value[0]).not.toBeInstanceOf(File)
        }

        const fixedMerge = applyScriptRequestUpdates(
          originalRequest,
          brokenUpdatedRequest
        )

        if (fixedMerge.body.contentType === "multipart/form-data") {
          const fixedFileField = fixedMerge.body.body[0]
          if (fixedFileField.isFile && Array.isArray(fixedFileField.value)) {
            expect(fixedFileField.value[0]).toBeInstanceOf(File)
            expect((fixedFileField.value[0] as File).name).toBe("test.txt")
          }
        }
      })
    })
  })
})
