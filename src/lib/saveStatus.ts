export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

export function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case "dirty":
      return "等待保存";
    case "saving":
      return "保存中…";
    case "saved":
      return "已保存";
    case "error":
      return "保存失败";
    case "conflict":
      return "内容有冲突";
    default:
      return "";
  }
}
