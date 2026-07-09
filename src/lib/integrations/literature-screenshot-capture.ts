/**
 * Headless screenshot capture for literature / registry portal evidence.
 * Disabled when LITERATURE_SCREENSHOT_CAPTURE=false or Playwright browsers missing.
 */
import "server-only";

export type CaptureScreenshotResult =
  | { ok: true; buffer: Buffer; contentType: "image/png"; finalUrl: string }
  | { ok: false; error: string };

export function screenshotCaptureEnabled(): boolean {
  if (process.env.LITERATURE_SCREENSHOT_CAPTURE === "false") return false;
  return true;
}

export async function capturePageScreenshot(url: string): Promise<CaptureScreenshotResult> {
  if (!screenshotCaptureEnabled()) {
    return { ok: false, error: "Screenshot capture disabled (LITERATURE_SCREENSHOT_CAPTURE=false)." };
  }
  const target = url?.trim();
  if (!target || !/^https?:\/\//i.test(target)) {
    return { ok: false, error: "Invalid URL for screenshot." };
  }

  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
        userAgent: "MDRpilot/1.0 (clinical evidence screenshot; regulatory documentation)",
      });
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(1500);
      const buffer = await page.screenshot({ fullPage: false, type: "png" });
      return {
        ok: true,
        buffer: Buffer.from(buffer),
        contentType: "image/png",
        finalUrl: page.url(),
      };
    } finally {
      await browser.close();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Executable doesn't exist|browserType\.launch/i.test(msg)) {
      return {
        ok: false,
        error:
          "Playwright browser not installed. Run: npx playwright install chromium",
      };
    }
    return { ok: false, error: msg.slice(0, 300) };
  }
}
