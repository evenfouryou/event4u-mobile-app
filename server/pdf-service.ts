import puppeteer from 'puppeteer-core';
import QRCode from 'qrcode';
import type { DigitalTicketTemplate } from '@shared/schema';

export async function generateWalletImage(
  ticketData: {
    eventName: string;
    eventDate: Date;
    locationName: string;
    sectorName: string;
    holderName: string;
    price: string;
    ticketCode: string;
    qrCode: string;
  }
): Promise<Buffer> {
  let browser;
  
  try {
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    if (!chromiumPath) {
      throw new Error('PUPPETEER_EXECUTABLE_PATH environment variable not set');
    }
    
    const qrDataUrl = await QRCode.toDataURL(ticketData.qrCode || `TICKET-${ticketData.ticketCode}`, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    const dateStr = ticketData.eventDate.toLocaleDateString('it-IT', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    const timeStr = ticketData.eventDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const walletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1125px;
      height: 354px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #f59e0b 100%);
      color: white;
      display: flex;
      padding: 20px;
    }
    .left {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-right: 20px;
    }
    .event-name {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .info-row {
      display: flex;
      gap: 40px;
    }
    .info-item label {
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.8;
      letter-spacing: 0.5px;
    }
    .info-item p {
      font-size: 18px;
      font-weight: 600;
      margin-top: 2px;
    }
    .holder {
      font-size: 14px;
      opacity: 0.9;
    }
    .right {
      width: 220px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 16px;
      padding: 15px;
    }
    .qr-code {
      width: 180px;
      height: 180px;
    }
    .ticket-code {
      color: #333;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="left">
    <div class="event-name">${ticketData.eventName || 'Evento'}</div>
    <div class="info-row">
      <div class="info-item">
        <label>Data</label>
        <p>${dateStr}</p>
      </div>
      <div class="info-item">
        <label>Ora</label>
        <p>${timeStr}</p>
      </div>
      <div class="info-item">
        <label>Settore</label>
        <p>${ticketData.sectorName || '-'}</p>
      </div>
    </div>
    <div class="info-row">
      <div class="info-item">
        <label>Luogo</label>
        <p>${ticketData.locationName || '-'}</p>
      </div>
      <div class="info-item">
        <label>Prezzo</label>
        <p>€${ticketData.price}</p>
      </div>
    </div>
    <div class="holder">${ticketData.holderName}</div>
  </div>
  <div class="right">
    <img src="${qrDataUrl}" class="qr-code" alt="QR Code" />
    <div class="ticket-code">${ticketData.ticketCode}</div>
  </div>
</body>
</html>`;

    console.log('[PDF-SERVICE] Launching Chromium for wallet image from:', chromiumPath);
    
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
    await page.setViewport({ width: 1125, height: 354 });
    await page.setContent(walletHtml, { waitUntil: 'networkidle0' });
    
    const imageBuffer = await page.screenshot({ 
      type: 'png',
      omitBackground: false
    });

    console.log('[PDF-SERVICE] Wallet image generated successfully, size:', imageBuffer.length, 'bytes');
    return Buffer.from(imageBuffer);
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating wallet image:', error);
    throw new Error(`Failed to generate wallet image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function generateDigitalTicketPdf(
  ticketData: {
    eventName: string;
    eventDate: Date;
    locationName: string;
    locationAddress?: string;
    sectorName: string;
    holderName: string;
    price: string;
    ticketCode: string;
    qrCode: string;
    fiscalSealCode?: string;
    organizerCompany?: string;
    primaryColor?: string;
    logoUrl?: string;
  },
  template?: DigitalTicketTemplate
): Promise<Buffer> {
  let browser;
  
  try {
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    if (!chromiumPath) {
      throw new Error('PUPPETEER_EXECUTABLE_PATH environment variable not set');
    }
    
    // Extract template values with defaults
    // SIAE COMPLIANCE: All mandatory fields are ALWAYS shown in the PDF output regardless of template settings.
    // Template configuration only affects visual styling (colors, fonts, logo, QR appearance).
    // The show* flags in the template schema are for digital preview only, not PDF output.
    const primaryColor = template?.primaryColor || ticketData.primaryColor || '#6366f1';
    const secondaryColor = template?.secondaryColor || '#4f46e5';
    const backgroundColor = template?.backgroundColor || '#1e1b4b';
    const textColor = template?.textColor || '#ffffff';
    const accentColor = template?.accentColor || '#a855f7';
    const fontFamily = template?.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    const titleFontSize = template?.titleFontSize || 22;
    const bodyFontSize = template?.bodyFontSize || 14;
    const qrSize = template?.qrSize || 160;
    const logoUrl = template?.logoUrl || ticketData.logoUrl;
    const logoPosition = template?.logoPosition || 'top-center';
    const logoSize = template?.logoSize || 'medium';
    const backgroundStyle = template?.backgroundStyle || 'gradient';
    const gradientDirection = template?.gradientDirection || 'to-bottom';
    const showPerforatedEdge = template?.showPerforatedEdge !== false;
    
    // QR code configuration from template
    const qrForegroundColor = template?.qrForegroundColor || '#000000';
    const qrBackgroundColor = template?.qrBackgroundColor || 'transparent';
    
    const qrDataUrl = await QRCode.toDataURL(ticketData.qrCode || `TICKET-${ticketData.ticketCode}`, {
      width: Math.max(qrSize, 200),
      margin: 2,
      color: { 
        dark: qrForegroundColor, 
        light: qrBackgroundColor === 'transparent' ? '#FFFFFF' : qrBackgroundColor 
      },
      errorCorrectionLevel: 'H'
    });

    const dateStr = ticketData.eventDate.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    const timeStr = ticketData.eventDate.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Generate background style based on template configuration
    const getBackgroundStyle = () => {
      if (backgroundStyle === 'solid') {
        return `background: ${primaryColor};`;
      }
      if (backgroundStyle === 'gradient') {
        if (gradientDirection === 'radial') {
          return `background: radial-gradient(circle at center, ${primaryColor} 0%, ${secondaryColor} 100%);`;
        }
        const direction = gradientDirection === 'to-right' ? '90deg' : '135deg';
        return `background: linear-gradient(${direction}, ${primaryColor} 0%, ${secondaryColor} 100%);`;
      }
      return `background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);`;
    };

    // Logo HTML based on template configuration
    const logoSizeMap = { small: '30px', medium: '50px', large: '70px' };
    const logoHeight = logoSizeMap[logoSize as keyof typeof logoSizeMap] || '50px';
    const logoPositionStyle = logoPosition === 'top-left' ? 'text-align: left;' : 
                              logoPosition === 'top-right' ? 'text-align: right;' : 'text-align: center;';
    const logoHtml = logoUrl ? 
      `<div class="logo-container" style="${logoPositionStyle}">
        <img src="${logoUrl}" alt="Logo" style="height: ${logoHeight}; max-width: 150px; object-fit: contain;" />
      </div>` : '';

    const pdfHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A5; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 148mm;
      height: 210mm;
      font-family: ${fontFamily};
      background: #f8fafc;
      color: #1e293b;
      padding: 15mm;
      display: flex;
      flex-direction: column;
    }
    .ticket-card {
      background: white;
      border-radius: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      overflow: hidden;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .header {
      ${getBackgroundStyle()}
      color: ${textColor};
      padding: 20px 24px;
    }
    .logo-container {
      margin-bottom: 12px;
    }
    .header-logo {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.8;
      margin-bottom: 8px;
    }
    .event-name {
      font-size: ${titleFontSize}px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 4px;
    }
    .location {
      font-size: 13px;
      opacity: 0.9;
    }
    .content {
      padding: 24px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-item {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 12px 14px;
    }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: ${bodyFontSize}px;
      font-weight: 600;
      color: #1e293b;
    }
    .qr-section {
      background: #f8fafc;
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      margin-top: auto;
    }
    .qr-code {
      width: ${qrSize}px;
      height: ${qrSize}px;
      margin: 0 auto 12px;
    }
    .qr-instructions {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .ticket-code {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      letter-spacing: 1px;
    }
    .holder-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .holder-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .holder-name {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }
    .footer {
      text-align: center;
      padding: 12px;
      font-size: 9px;
      color: #94a3b8;
      border-top: ${showPerforatedEdge ? '1px dashed #e2e8f0' : '1px solid #e2e8f0'};
    }
    .fiscal-seal {
      font-family: 'Courier New', monospace;
      font-size: 8px;
      color: #94a3b8;
      word-break: break-all;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="ticket-card">
    <div class="header">
      ${logoHtml}
      <div class="header-logo">${ticketData.organizerCompany || 'EVENT4U'}</div>
      <div class="event-name">${ticketData.eventName}</div>
      <div class="location">${ticketData.locationName}${ticketData.locationAddress ? ' - ' + ticketData.locationAddress : ''}</div>
    </div>
    <div class="content">
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Data</div>
          <div class="info-value">${dateStr}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Ora</div>
          <div class="info-value">${timeStr}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Settore</div>
          <div class="info-value">${ticketData.sectorName || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Prezzo</div>
          <div class="info-value">€ ${ticketData.price}</div>
        </div>
      </div>
      <div class="qr-section">
        <img src="${qrDataUrl}" class="qr-code" alt="QR Code" />
        <div class="qr-instructions">Mostra questo QR code all'ingresso</div>
        <div class="ticket-code">${ticketData.ticketCode}</div>
      </div>
      <div class="holder-section">
        <div class="holder-label">Intestatario</div>
        <div class="holder-name">${ticketData.holderName}</div>
      </div>
    </div>
    <div class="footer">
      Biglietto generato da Event4U - Conserva questo documento
      ${ticketData.fiscalSealCode ? `<div class="fiscal-seal">${ticketData.fiscalSealCode}</div>` : ''}
    </div>
  </div>
</body>
</html>`;

    console.log('[PDF-SERVICE] Launching Chromium for digital ticket PDF from:', chromiumPath);
    
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
    await page.setContent(pdfHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A5',
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      printBackground: true,
    });
    
    console.log('[PDF-SERVICE] Digital ticket PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating digital ticket PDF:', error);
    throw new Error(`Failed to generate digital ticket PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

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
