import { chromium } from "playwright-core"
import { existsSync } from "fs"

const chromiumCandidates = [
  process.env.CHROMIUM_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
]

const resolveChromiumPath = () => {
  for (const candidate of chromiumCandidates) {
    if (candidate && existsSync(candidate)) {
      return candidate
    }
  }
  return undefined
}

export const renderPdfFromHtml = async (html: string) => {
  const executablePath = resolveChromiumPath()
  if (!executablePath) {
    throw new Error("Chromium executable not found")
  }

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle" })
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "24px", bottom: "24px", left: "24px", right: "24px" },
    })
    return pdf
  } finally {
    await browser.close()
  }
}
