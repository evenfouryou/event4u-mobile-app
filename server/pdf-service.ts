import puppeteer from 'puppeteer-core';

export async function generateTicketPdf(
  html: string,
  widthMm: number,
  heightMm: number
): Promise<Buffer> {
  let browser;
  
  try {
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    if (!chromiumPath) {
      throw new Error('PUPPETEER_EXECUTABLE_PATH environment variable not set');
    }
    
    console.log('[PDF-SERVICE] Launching Chromium from:', chromiumPath);
    
    browser = await puppeteer.launch({
      executablePath: chromiumPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process',
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      width: `${widthMm}mm`,
      height: `${heightMm}mm`,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      printBackground: true,
    });
    
    console.log('[PDF-SERVICE] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
