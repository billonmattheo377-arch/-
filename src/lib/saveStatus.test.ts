import { saveStatusLabel } from "./saveStatus";

describe("saveStatusLabel", () => {
  it("maps autosave states to concise UI labels", () => {
    expect(saveStatusLabel("dirty")).toBe("等待保存");
    expect(saveStatusLabel("saving")).toBe("保存中…");
    expect(saveStatusLabel("saved")).toBe("已保存");
    expect(saveStatusLabel("conflict")).toBe("内容有冲突");
    expect(saveStatusLabel("idle")).toBe("");
  });
});
