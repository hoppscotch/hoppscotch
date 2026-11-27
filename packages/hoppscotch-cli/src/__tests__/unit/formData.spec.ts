import { describe, expect, it } from "vitest";

import { toFormData } from "../../utils/mutators";

describe("toFormData", () => {
  it("does not use the field key as filename for text fields with a manually set content type", () => {
    const formData = toFormData([
      {
        key: "json",
        value: '{"foo": "bar"}',
        contentType: "application/json",
      },
    ]);

    const entry = formData.get("json");
    expect(entry).toBeInstanceOf(Blob);
    expect((entry as Blob).type).toBe("application/json");
    expect(entry instanceof File ? entry.name : null).not.toBe("json");
  });

  it("keeps plain text fields as text entries", () => {
    const formData = toFormData([{ key: "auto", value: "auto text" }]);

    expect(formData.get("auto")).toBe("auto text");
  });

  it("preserves the original filename for file fields", () => {
    const file = new File(["fake-png"], "img.png", { type: "image/png" });

    const formData = toFormData([{ key: "file", value: file }]);

    const entry = formData.get("file");
    expect(entry).toBeInstanceOf(File);
    expect((entry as File).name).toBe("img.png");
    expect((entry as File).type).toBe("image/png");
  });

  it("preserves the filename when a file field has a content type override", () => {
    const file = new File(["fake-png"], "img.png", { type: "image/png" });

    const formData = toFormData([
      { key: "file", value: file, contentType: "image/jpeg", isFile: true },
    ]);

    const entry = formData.get("file");
    expect(entry).toBeInstanceOf(File);
    expect((entry as File).name).toBe("img.png");
    expect((entry as File).type).toBe("image/jpeg");
  });
});
