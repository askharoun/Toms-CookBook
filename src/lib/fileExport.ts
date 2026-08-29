export type FileExportResult = "shared" | "downloaded" | "cancelled";

type FileShareApi = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

type FileExportEnvironment = {
  shareApi?: FileShareApi;
  download?: (file: File) => void;
};

function isAbortError(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  // Keep the object URL alive long enough for browsers to begin saving it.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function shareOrDownloadFile(
  file: File,
  shareData: Omit<ShareData, "files">,
  environment: FileExportEnvironment = {},
): Promise<FileExportResult> {
  const shareApi = environment.shareApi ?? navigator;
  const download = environment.download ?? downloadFile;

  if (shareApi.share) {
    try {
      const canShareFile = !shareApi.canShare || shareApi.canShare({ files: [file] });
      if (canShareFile) {
        await shareApi.share({ ...shareData, files: [file] });
        return "shared";
      }
    } catch (error) {
      if (isAbortError(error)) return "cancelled";
      // Some browsers report file sharing support and still reject the share.
      // In that case, continue to the reliable download fallback.
    }
  }

  download(file);
  return "downloaded";
}
