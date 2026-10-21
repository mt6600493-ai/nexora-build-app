import { describe, expect, it } from "vitest";
import { buildPreview } from "@/lib/files";
import { addAttachments } from "@/lib/attachments";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

describe("uploaded images", () => {
  it("show up in the live preview through their project path", () => {
    const html = buildPreview({ "index.html": '<html><head></head><body><img src="assets/logo.png"></body></html>', "assets/logo.png": PNG })!;
    expect(html).toContain(`src="${PNG}"`);
  });

  it("never overwrite an existing file with the same name", () => {
    const { files, paths } = addAttachments({ "assets/logo.png": "data:image/png;base64,AAAA" }, [
      { name: "logo.png", path: "assets/logo.png", kind: "image", content: PNG },
    ]);
    expect(paths[0]).toBe("assets/logo-2.png");
    expect(files["assets/logo.png"]).toBe("data:image/png;base64,AAAA");
  });
});
