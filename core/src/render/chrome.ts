/**
 * Lazy Chrome provisioning (install-weight optimization, 2026-07-17).
 *
 * Why: the `puppeteer` package's postinstall downloads BOTH Chrome for Testing
 * (~346MB unpacked) AND chrome-headless-shell (~193MB unpacked) on every fresh
 * machine — and Chitra never uses the headless-shell at all. Depending on
 * `puppeteer-core` instead makes `npm install` a 7-second, 107MB affair; the
 * browser (ONLY the one we use) downloads on first probe/render with progress.
 *
 * Determinism: the build is PINNED to the exact version puppeteer-core 25.3
 * expects, so the rendering binary — and therefore every pixel — is unchanged
 * from the eager-download era. If puppeteer-core is ever bumped, update
 * CHROME_BUILD from its PUPPETEER_REVISIONS in the same commit.
 */
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Browser, computeExecutablePath, detectBrowserPlatform, install } from "@puppeteer/browsers";

export const CHROME_BUILD = "150.0.7871.24";

export const chitraCacheDir = () => process.env.CHITRA_CACHE_DIR ?? path.join(os.homedir(), ".cache", "chitra");

/** Resolve a usable Chrome, downloading it once if needed.
 *  Resolution order: CHITRA_CHROME_PATH env → chitra cache → puppeteer's cache
 *  (same pinned build; avoids a re-download for users who had puppeteer) → download. */
export async function ensureChrome(onProgress?: (pct: number) => void): Promise<string> {
  const override = process.env.CHITRA_CHROME_PATH;
  if (override && existsSync(override)) return override;

  const ours = computeExecutablePath({ browser: Browser.CHROME, buildId: CHROME_BUILD, cacheDir: chitraCacheDir() });
  if (existsSync(ours)) return ours;

  const pptr = computeExecutablePath({
    browser: Browser.CHROME,
    buildId: CHROME_BUILD,
    cacheDir: path.join(os.homedir(), ".cache", "puppeteer"),
  });
  if (existsSync(pptr)) return pptr;

  if (!detectBrowserPlatform()) throw new Error("Unsupported platform: cannot download Chrome for Testing");
  let last = -10;
  await install({
    browser: Browser.CHROME,
    buildId: CHROME_BUILD,
    cacheDir: chitraCacheDir(),
    downloadProgressCallback: (downloaded, total) => {
      const pct = total > 0 ? Math.floor((downloaded / total) * 100) : 0;
      if (pct >= last + 10) {
        last = pct;
        onProgress?.(pct);
      }
    },
  });
  return ours;
}

/** True if Chrome is already available without a download (for probe reporting). */
export function chromeReady(): string | null {
  const override = process.env.CHITRA_CHROME_PATH;
  if (override && existsSync(override)) return override;
  const ours = computeExecutablePath({ browser: Browser.CHROME, buildId: CHROME_BUILD, cacheDir: chitraCacheDir() });
  if (existsSync(ours)) return ours;
  const pptr = computeExecutablePath({
    browser: Browser.CHROME,
    buildId: CHROME_BUILD,
    cacheDir: path.join(os.homedir(), ".cache", "puppeteer"),
  });
  if (existsSync(pptr)) return pptr;
  return null;
}
