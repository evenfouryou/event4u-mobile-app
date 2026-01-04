import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import sharp from 'sharp';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = 210;
const pageHeight = 297;
const margin = 20;
const contentWidth = pageWidth - 2 * margin;
let y = margin;
let pageNum = 1;

// Load and convert image to base64 JPEG
async function loadImage(path: string): Promise<string> {
  try {
    const buffer = await sharp(path)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return buffer.toString('base64');
  } catch (e) {
    console.error(`Failed to load ${path}:`, e);
    return '';
  }
}

function addPage() {
  doc.addPage();
  y = margin;
  pageNum++;
}

function checkPageBreak(height: number) {
  if (y + height > pageHeight - margin - 10) {
    addPage();
  }
}

function title(text: string, color: number[] = [0, 51, 102]) {
  checkPageBreak(20);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(text, pageWidth / 2, y, { align: 'center' });
  y += 15;
}

function subtitle(text: string) {
  checkPageBreak(15);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 102, 153);
  doc.text(text, margin, y);
  y += 10;
}

function heading(text: string) {
  checkPageBreak(12);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text(text, margin, y);
  y += 8;
}

function paragraph(text: string) {
  checkPageBreak(10);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(text, contentWidth);
  doc.text(lines, margin, y);
  y += lines.length * 5 + 3;
}

function bulletPoint(text: string, indent: number = 0) {
  checkPageBreak(8);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('•', margin + 2 + indent, y);
  const lines = doc.splitTextToSize(text, contentWidth - 10 - indent);
  doc.text(lines, margin + 8 + indent, y);
  y += lines.length * 5 + 2;
}

function numberedItem(num: number, text: string, bold: boolean = false) {
  checkPageBreak(10);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 102, 153);
  doc.text(`${num}.`, margin + 2, y);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(text, contentWidth - 12);
  doc.text(lines, margin + 10, y);
  y += lines.length * 5 + 4;
}

function codeBlock(text: string) {
  checkPageBreak(20);
  doc.setFillColor(240, 240, 240);
  const lines = text.split('\n');
  const boxHeight = lines.length * 4.5 + 6;
  doc.roundedRect(margin, y - 3, contentWidth, boxHeight, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('courier', 'normal');
  doc.setTextColor(51, 51, 51);
  lines.forEach((line, i) => {
    doc.text(line, margin + 4, y + i * 4.5);
  });
  y += boxHeight + 4;
}

function addImage(base64: string, caption: string, width: number = 150) {
  const imgHeight = width * 0.6;
  checkPageBreak(imgHeight + 15);
  
  const x = (pageWidth - width) / 2;
  
  // Add border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(x - 1, y - 1, width + 2, imgHeight + 2);
  
  doc.addImage('data:image/jpeg;base64,' + base64, 'JPEG', x, y, width, imgHeight);
  y += imgHeight + 3;
  
  // Caption
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(caption, pageWidth / 2, y, { align: 'center' });
  y += 8;
}

function spacer(height: number = 5) {
  y += height;
}

function divider() {
  checkPageBreak(10);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
}

function infoBox(title: string, content: string, color: number[] = [230, 247, 255]) {
  checkPageBreak(25);
  const lines = doc.splitTextToSize(content, contentWidth - 16);
  const boxHeight = lines.length * 5 + 15;
  
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(margin, y - 2, contentWidth, boxHeight, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text(title, margin + 5, y + 5);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(lines, margin + 5, y + 12);
  
  y += boxHeight + 5;
}

function warningBox(content: string) {
  infoBox('⚠ Attenzione', content, [255, 243, 205]);
}

function tipBox(content: string) {
  infoBox('💡 Suggerimento', content, [220, 255, 220]);
}

async function main() {
  // Load images
  console.log('Caricamento immagini...');
  const imgDesktopApp = await loadImage('attached_assets/generated_images/siae_lettore_desktop_app_interface.png');
  const imgSmartCard = await loadImage('attached_assets/generated_images/smart_card_reader_hardware_setup.png');
  const imgInstaller = await loadImage('attached_assets/generated_images/windows_installer_wizard_screenshot.png');
  const imgWorkflow = await loadImage('attached_assets/generated_images/digital_signature_workflow_diagram.png');
  const imgLogo = await loadImage('attached_assets/generated_images/event4u_app_icon_logo.png');
  const imgGestore = await loadImage('attached_assets/generated_images/gestore_siae_event_configuration.png');
  const imgCustomer = await loadImage('attached_assets/generated_images/customer_ticket_purchase_and_wallet.png');
  
  // === COVER PAGE ===
  y = 40;
  
  // Logo
  if (imgLogo) {
    doc.addImage('data:image/jpeg;base64,' + imgLogo, 'JPEG', (pageWidth - 50) / 2, y, 50, 50);
    y += 60;
  }
  
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text('SIAE Lettore', pageWidth / 2, y, { align: 'center' });
  y += 12;
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 102, 153);
  doc.text('Manuale Utente Completo', pageWidth / 2, y, { align: 'center' });
  y += 20;
  
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text('Versione 3.15', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.text('Gennaio 2026', pageWidth / 2, y, { align: 'center' });
  y += 30;
  
  // Feature boxes
  doc.setFillColor(240, 248, 255);
  doc.roundedRect(margin, y, contentWidth, 50, 5, 5, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text('Caratteristiche Principali:', margin + 5, y + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  const features = [
    '✓ Firma digitale CAdES-BES conforme ETSI',
    '✓ Firma S/MIME per trasmissioni email SIAE',
    '✓ Integrazione WebSocket con Event4U',
    '✓ Supporto report RCA, RMG e RPM'
  ];
  features.forEach((f, i) => {
    doc.text(f, margin + 10, y + 18 + i * 8);
  });
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Event Four You - Sistema di Gestione Eventi e Ticketing', pageWidth / 2, pageHeight - 25, { align: 'center' });
  doc.text('Documento riservato', pageWidth / 2, pageHeight - 18, { align: 'center' });
  
  // === TABLE OF CONTENTS ===
  addPage();
  title('Indice');
  spacer(10);
  
  const toc = [
    ['1. Introduzione', '3'],
    ['2. Requisiti di Sistema', '4'],
    ['3. Installazione', '5'],
    ['4. Configurazione', '7'],
    ['5. Collegamento Smart Card', '9'],
    ['6. Firma Digitale', '11'],
    ['7. Trasmissioni SIAE', '13'],
    ['8. Risoluzione Problemi', '15'],
    ['9. Appendice Tecnica', '17'],
  ];
  
  doc.setFontSize(12);
  toc.forEach(([title, page]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin, y);
    doc.text(page, pageWidth - margin, y, { align: 'right' });
    
    // Dotted line
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 2], 0);
    const titleWidth = doc.getTextWidth(title);
    doc.line(margin + titleWidth + 5, y, pageWidth - margin - 10, y);
    doc.setLineDashPattern([], 0);
    
    y += 10;
  });
  
  // === CHAPTER 1: INTRODUZIONE ===
  addPage();
  title('1. Introduzione');
  spacer(5);
  
  paragraph('SIAE Lettore e l\'applicazione desktop ufficiale per la gestione delle smart card SIAE nell\'ambito del sistema Event4U. Permette di effettuare firme digitali sui report fiscali e trasmetterli in conformita con le normative italiane.');
  
  spacer(5);
  
  if (imgDesktopApp) {
    addImage(imgDesktopApp, 'Figura 1.1 - Interfaccia principale di SIAE Lettore', 160);
  }
  
  spacer(5);
  subtitle('Cos\'e SIAE Lettore?');
  paragraph('SIAE Lettore e un\'applicazione Electron che funge da ponte tra la piattaforma web Event4U e la smart card SIAE. L\'applicazione permette di:');
  
  bulletPoint('Leggere i certificati digitali dalla smart card SIAE');
  bulletPoint('Firmare digitalmente i report fiscali con CAdES-BES');
  bulletPoint('Firmare le email con S/MIME per le trasmissioni RCA');
  bulletPoint('Gestire la connessione sicura con il server Event4U');
  
  spacer(5);
  subtitle('Perche e necessario?');
  paragraph('Le normative SIAE richiedono che i report fiscali (RCA, RMG, RPM) siano firmati digitalmente utilizzando il certificato presente sulla smart card ufficiale SIAE. Questa firma garantisce l\'autenticita e l\'integrita dei dati trasmessi.');
  
  // === CHAPTER 2: REQUISITI ===
  addPage();
  title('2. Requisiti di Sistema');
  spacer(5);
  
  subtitle('Hardware Richiesto');
  spacer(3);
  
  if (imgSmartCard) {
    addImage(imgSmartCard, 'Figura 2.1 - Lettore smart card USB con smart card SIAE inserita', 150);
  }
  
  heading('Lettore Smart Card');
  bulletPoint('Lettore USB compatibile PC/SC (standard ISO 7816)');
  bulletPoint('Consigliati: Gemalto, ACR, Bit4id');
  bulletPoint('Driver installati automaticamente su Windows 10/11');
  
  spacer(3);
  heading('Smart Card SIAE');
  bulletPoint('Smart card SIAE con chip attivo');
  bulletPoint('Certificato digitale valido e non scaduto');
  bulletPoint('PIN di accesso (fornito dalla SIAE)');
  
  spacer(5);
  subtitle('Software Richiesto');
  spacer(3);
  
  bulletPoint('Windows 10 (versione 1903 o successiva) oppure Windows 11');
  bulletPoint('Connessione Internet stabile');
  bulletPoint('Browser moderno (Chrome 90+, Edge 90+, Firefox 88+)');
  bulletPoint('Almeno 200 MB di spazio libero su disco');
  bulletPoint('4 GB di RAM (8 GB consigliati)');
  
  warningBox('L\'applicazione funziona SOLO su Windows. Non e disponibile per macOS o Linux a causa delle dipendenze dalla libreria SIAE.');
  
  // === CHAPTER 3: INSTALLAZIONE ===
  addPage();
  title('3. Installazione');
  spacer(5);
  
  subtitle('Download dell\'Installer');
  paragraph('L\'ultima versione di SIAE Lettore e disponibile nella sezione Releases del repository GitHub:');
  
  codeBlock('https://github.com/evenfouryou/event-four-you-siae-lettore/releases');
  
  paragraph('Scarica il file con estensione .exe (es. SiaeLettore-Setup-3.15.0.exe).');
  
  spacer(5);
  subtitle('Procedura di Installazione');
  spacer(3);
  
  if (imgInstaller) {
    addImage(imgInstaller, 'Figura 3.1 - Wizard di installazione Windows', 140);
  }
  
  numberedItem(1, 'Esegui l\'installer scaricato facendo doppio clic sul file .exe');
  numberedItem(2, 'Se appare l\'avviso di Windows SmartScreen, clicca "Ulteriori informazioni" e poi "Esegui comunque"');
  numberedItem(3, 'Accetta i termini di licenza');
  numberedItem(4, 'Scegli la cartella di installazione (consigliato: lasciare quella predefinita)');
  numberedItem(5, 'Clicca "Installa" e attendi il completamento');
  numberedItem(6, 'Al termine, l\'applicazione sara disponibile nel menu Start');
  
  tipBox('Per una corretta installazione, esegui l\'installer come amministratore: tasto destro sul file → "Esegui come amministratore".');
  
  // === CHAPTER 4: CONFIGURAZIONE ===
  addPage();
  title('4. Configurazione');
  spacer(5);
  
  subtitle('Primo Avvio');
  paragraph('Al primo avvio, SIAE Lettore mostrera la schermata principale con lo stato di connessione. L\'applicazione cerchera automaticamente di connettersi al server Event4U.');
  
  spacer(3);
  heading('Indicatori di Stato');
  bulletPoint('🟢 Verde: Connesso e pronto per la firma');
  bulletPoint('🟡 Giallo: Connessione in corso o in attesa');
  bulletPoint('🔴 Rosso: Disconnesso o errore di connessione');
  
  spacer(5);
  subtitle('Configurazione del Token');
  paragraph('Per collegare l\'applicazione desktop al tuo account Event4U, e necessario generare un token di autenticazione:');
  
  spacer(3);
  
  if (imgGestore) {
    addImage(imgGestore, 'Figura 4.1 - Pannello configurazione SIAE nel portale Event4U', 160);
  }
  
  numberedItem(1, 'Accedi al portale Event4U con le tue credenziali');
  numberedItem(2, 'Vai in Impostazioni → Integrazioni → SIAE Bridge');
  numberedItem(3, 'Clicca su "Genera Nuovo Token"');
  numberedItem(4, 'Copia il token generato (valido 30 giorni)');
  numberedItem(5, 'Nell\'applicazione desktop, clicca sull\'icona ingranaggio');
  numberedItem(6, 'Incolla il token nel campo apposito e salva');
  
  warningBox('Il token ha una scadenza di 30 giorni. Dovrai rigenerarlo periodicamente per mantenere la connessione attiva.');
  
  // === CHAPTER 5: SMART CARD ===
  addPage();
  title('5. Collegamento Smart Card');
  spacer(5);
  
  subtitle('Inserimento della Smart Card');
  paragraph('Per utilizzare la firma digitale, la smart card SIAE deve essere correttamente inserita nel lettore:');
  
  numberedItem(1, 'Collega il lettore smart card a una porta USB del computer');
  numberedItem(2, 'Attendi che Windows riconosca il dispositivo (la prima volta potrebbe richiedere qualche secondo)');
  numberedItem(3, 'Inserisci la smart card SIAE nel lettore con il chip rivolto verso l\'alto');
  numberedItem(4, 'L\'applicazione SIAE Lettore dovrebbe rilevare automaticamente la carta');
  
  spacer(5);
  subtitle('Verifica del Certificato');
  paragraph('Per verificare che la smart card sia correttamente riconosciuta:');
  
  numberedItem(1, 'Nell\'applicazione, clicca su "Test Smart Card"');
  numberedItem(2, 'Inserisci il PIN quando richiesto');
  numberedItem(3, 'Verifica i dati del certificato visualizzati');
  
  spacer(3);
  heading('Informazioni Visualizzate');
  bulletPoint('Nome del titolare del certificato');
  bulletPoint('Codice fiscale associato');
  bulletPoint('Email del certificato (usata per S/MIME)');
  bulletPoint('Data di scadenza del certificato');
  bulletPoint('Ente emittente (SIAE)');
  
  warningBox('Il PIN ha un numero limitato di tentativi (solitamente 3). Dopo troppi errori, la carta si blocca e dovra essere sbloccata con il PUK o contattando la SIAE.');
  
  // === CHAPTER 6: FIRMA DIGITALE ===
  addPage();
  title('6. Firma Digitale');
  spacer(5);
  
  subtitle('Il Processo di Firma');
  paragraph('La firma digitale e il cuore dell\'applicazione SIAE Lettore. Il processo avviene in modo automatico quando richiesto dalla piattaforma web Event4U.');
  
  spacer(3);
  
  if (imgWorkflow) {
    addImage(imgWorkflow, 'Figura 6.1 - Flusso del processo di firma digitale', 160);
  }
  
  spacer(3);
  subtitle('Tipi di Firma');
  
  heading('CAdES-BES (per documenti)');
  paragraph('La firma CAdES-BES (CMS Advanced Electronic Signatures - Basic Electronic Signature) e utilizzata per firmare i file XML dei report. Genera un file .p7m contenente il documento originale e la firma digitale.');
  
  bulletPoint('Conforme allo standard ETSI EN 319 122-1');
  bulletPoint('Utilizza algoritmo SHA-256');
  bulletPoint('Include il certificato completo nella firma');
  
  spacer(3);
  heading('S/MIME (per email)');
  paragraph('La firma S/MIME e utilizzata per le email di trasmissione RCA. L\'email viene firmata digitalmente per garantire l\'autenticita del mittente.');
  
  bulletPoint('Conforme a RFC 5652 (CMS)');
  bulletPoint('L\'indirizzo email del certificato diventa il mittente');
  bulletPoint('Obbligatoria per le trasmissioni RCA alla SIAE');
  
  tipBox('La libreria libSIAEp7.dll gestisce automaticamente entrambi i tipi di firma utilizzando le funzioni della smart card.');
  
  // === CHAPTER 7: TRASMISSIONI ===
  addPage();
  title('7. Trasmissioni SIAE');
  spacer(5);
  
  subtitle('Tipi di Report');
  paragraph('Event4U supporta tre tipi di report fiscali SIAE, ciascuno con caratteristiche specifiche:');
  
  spacer(3);
  heading('RCA - Riepilogo Controllo Accessi');
  bulletPoint('Generato al termine di ogni singolo evento');
  bulletPoint('Contiene i dati di tutti i biglietti emessi e validati');
  bulletPoint('Richiede risposta dalla SIAE (conferma o errore)');
  bulletPoint('Trasmesso via email firmata S/MIME');
  bulletPoint('Codice colore nel sistema: 🟢 Verde');
  
  spacer(3);
  heading('RMG - Riepilogo Mensile Giornaliero');
  bulletPoint('Report giornaliero che aggrega tutti gli eventi del giorno');
  bulletPoint('Generato automaticamente a fine giornata');
  bulletPoint('Non richiede risposta dalla SIAE (silenzioso)');
  bulletPoint('Codice colore nel sistema: 🔵 Blu');
  
  spacer(3);
  heading('RPM - Riepilogo Periodico Mensile');
  bulletPoint('Report mensile con riepilogo fiscale');
  bulletPoint('Generato a fine mese');
  bulletPoint('Non richiede risposta dalla SIAE (silenzioso)');
  bulletPoint('Codice colore nel sistema: 🟡 Ambra');
  
  spacer(5);
  subtitle('Processo di Trasmissione RCA');
  
  numberedItem(1, 'L\'evento viene chiuso nella piattaforma Event4U');
  numberedItem(2, 'Viene generato automaticamente il report XML');
  numberedItem(3, 'Il sistema richiede la firma digitale');
  numberedItem(4, 'L\'app desktop mostra il popup per il PIN');
  numberedItem(5, 'Il documento viene firmato (CAdES-BES → .p7m)');
  numberedItem(6, 'L\'email viene composta e firmata (S/MIME)');
  numberedItem(7, 'La trasmissione viene inviata alla SIAE');
  numberedItem(8, 'La risposta viene registrata nel sistema');
  
  // === CHAPTER 8: TROUBLESHOOTING ===
  addPage();
  title('8. Risoluzione Problemi');
  spacer(5);
  
  subtitle('Problemi di Connessione');
  
  heading('L\'applicazione non si connette al server');
  bulletPoint('Verifica la connessione internet');
  bulletPoint('Controlla che il firewall non blocchi l\'applicazione');
  bulletPoint('Verifica che il token sia valido e non scaduto');
  bulletPoint('Prova a rigenerare il token dal portale Event4U');
  
  spacer(5);
  subtitle('Problemi con la Smart Card');
  
  heading('Errore: "Smart card non trovata"');
  bulletPoint('Verifica che il lettore sia collegato correttamente');
  bulletPoint('Controlla che la smart card sia inserita nel verso giusto');
  bulletPoint('Prova a scollegare e ricollegare il lettore');
  bulletPoint('Verifica in Gestione Dispositivi che il lettore sia riconosciuto');
  
  spacer(3);
  heading('Errore: "PIN errato" (codice 6982)');
  bulletPoint('Il PIN inserito non e corretto');
  bulletPoint('Attenzione: dopo 3 tentativi errati la carta si blocca');
  bulletPoint('Verifica di non avere il CAPS LOCK attivo');
  
  spacer(3);
  heading('Errore: "PIN bloccato" (codice 6983)');
  bulletPoint('La smart card e bloccata per troppi tentativi errati');
  bulletPoint('E necessario sbloccarla con il PUK');
  bulletPoint('Se non si dispone del PUK, contattare la SIAE');
  
  spacer(5);
  subtitle('Problemi di Firma');
  
  heading('Errore durante la firma del documento');
  bulletPoint('Verifica che il certificato sulla smart card non sia scaduto');
  bulletPoint('Controlla i log dell\'applicazione per dettagli');
  bulletPoint('Prova a riavviare l\'applicazione');
  
  // === CHAPTER 9: APPENDICE ===
  addPage();
  title('9. Appendice Tecnica');
  spacer(5);
  
  subtitle('Specifiche Tecniche');
  
  heading('Algoritmi di Firma');
  bulletPoint('Hash: SHA-256 (SHA-1 deprecato)');
  bulletPoint('Firma: RSA con PKCS#1 v1.5');
  bulletPoint('Formato: CAdES-BES (ETSI EN 319 122-1)');
  bulletPoint('S/MIME: RFC 5652 (CMS)');
  
  spacer(3);
  heading('Libreria SIAE');
  paragraph('L\'applicazione utilizza la libreria ufficiale SIAE:');
  codeBlock('libSIAEp7.dll - PKCS7SignML function\nVersione: Compatibile Windows x86');
  
  spacer(5);
  subtitle('Percorsi File');
  
  heading('Installazione');
  codeBlock('%LOCALAPPDATA%\\Programs\\siae-lettore\\');
  
  heading('Log Applicazione');
  codeBlock('%APPDATA%\\SiaeLettore\\logs\\');
  
  heading('Configurazione');
  codeBlock('%APPDATA%\\SiaeLettore\\config.json');
  
  spacer(5);
  subtitle('Connessioni di Rete');
  
  bulletPoint('WebSocket: wss://[server]/ws/bridge (porta 443)');
  bulletPoint('Protocollo: WSS con TLS 1.2+');
  bulletPoint('Autenticazione: Token Bearer');
  
  spacer(5);
  subtitle('Contatti Supporto');
  
  paragraph('Per assistenza tecnica:');
  bulletPoint('Email: support@eventfouryou.com');
  bulletPoint('Documentazione: docs.eventfouryou.com');
  bulletPoint('Repository: github.com/evenfouryou');
  
  // === FOOTER ON ALL PAGES ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pagina ${i} di ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    if (i > 1) {
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.text('SIAE Lettore - Manuale Utente v3.15', margin, pageHeight - 10);
      doc.text('Event Four You', pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
  }
  
  // Save
  const pdfBuffer = doc.output('arraybuffer');
  fs.writeFileSync('docs/SIAE_Lettore_Manuale_Completo.pdf', Buffer.from(pdfBuffer));
  console.log('✓ PDF creato: docs/SIAE_Lettore_Manuale_Completo.pdf');
  console.log(`  Pagine: ${totalPages}`);
}

main().catch(console.error);
