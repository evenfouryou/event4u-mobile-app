import * as fs from 'fs';

const p7mData = fs.readFileSync('attached_assets/LOG_2026_01_04_001.xsi_1767541071404.p7m');

// Find XML start
const xmlStart = p7mData.indexOf('<?xml');
if (xmlStart === -1) {
  console.log('XML non trovato nel P7M');
  process.exit(1);
}

// Find XML end (look for closing tag or ASN.1 structure)
let xmlEnd = p7mData.indexOf('</LogTransazione>', xmlStart);
if (xmlEnd !== -1) {
  xmlEnd += '</LogTransazione>'.length;
} else {
  // Try to find where XML ends
  xmlEnd = p7mData.length;
  for (let i = xmlStart; i < p7mData.length; i++) {
    if (p7mData[i] === 0x30 && p7mData[i+1] === 0x82) {
      // ASN.1 sequence marker - end of XML
      xmlEnd = i;
      break;
    }
  }
}

const xmlContent = p7mData.slice(xmlStart, xmlEnd).toString('utf-8');
fs.writeFileSync('/tmp/extracted_log.xml', xmlContent);
console.log('XML estratto salvato in /tmp/extracted_log.xml');
console.log('Dimensione:', xmlContent.length, 'bytes');
console.log('\n=== PRIMI 2000 CARATTERI ===\n');
console.log(xmlContent.substring(0, 2000));
