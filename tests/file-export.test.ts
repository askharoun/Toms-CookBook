import { describe, expect, it, vi } from "vitest";
import { shareOrDownloadFile } from "../src/lib/fileExport";

const makeFile = () => new File(["{}"], "foods.json", { type: "application/json" });

describe("file export", () => {
  it("uses native file sharing when it succeeds", async () => {
    const download = vi.fn();
    const share = vi.fn().mockResolvedValue(undefined);

    const result = await shareOrDownloadFile(makeFile(), { title: "Food library" }, {
      shareApi: { canShare: () => true, share },
      download,
    });

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledOnce();
    expect(download).not.toHaveBeenCalled();
  });

  it("downloads the file when a browser advertises sharing but rejects it", async () => {
    const download = vi.fn();

    const result = await shareOrDownloadFile(makeFile(), { title: "Food library" }, {
      shareApi: {
        canShare: () => true,
        share: vi.fn().mockRejectedValue(Object.assign(new Error("Share failed"), { name: "NotAllowedError" })),
      },
      download,
    });

    expect(result).toBe("downloaded");
    expect(download).toHaveBeenCalledOnce();
  });

  it("does not download when the user cancels the share sheet", async () => {
    const download = vi.fn();

    const result = await shareOrDownloadFile(makeFile(), { title: "Food library" }, {
      shareApi: {
        canShare: () => true,
        share: vi.fn().mockRejectedValue(Object.assign(new Error("Cancelled"), { name: "AbortError" })),
      },
      download,
    });

    expect(result).toBe("cancelled");
    expect(download).not.toHaveBeenCalled();
  });
});
