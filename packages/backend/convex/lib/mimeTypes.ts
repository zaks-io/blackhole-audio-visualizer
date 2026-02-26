const MIME_TO_EXT: Record<string, string> = {
  "video/webm": "webm",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
};

export function getExtensionFromMimeType(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? "mp4";
}
