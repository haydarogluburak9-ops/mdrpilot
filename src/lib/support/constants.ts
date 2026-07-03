export const SUPPORT_MAX_FILES = 5;
export const SUPPORT_MAX_FILE_MB = 10;
export const SUPPORT_MAX_FILE_BYTES = SUPPORT_MAX_FILE_MB * 1024 * 1024;

export type SupportAttachmentMeta = {
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};
