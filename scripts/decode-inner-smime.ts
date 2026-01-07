import * as fs from 'fs';
import * as crypto from 'crypto';

const logContent = fs.readFileSync('attached_assets/bridge_1767795341273.log', 'utf8');

// Find the full base64 content from line 13 onwards
const lines = logContent.split('\n');
let base64Lines: string[] = [];
let collecting = false;

for (const line of lines) {
  if (line.includes('13: [MII')) {
    collecting = true;
  }
  if (collecting) {
    // Extract base64 from log lines like: [15:09:25.913]   13: [MIIrUw...]
    const match = line.match(/\[([A-Za-z0-9+/=]+)\]/);
    if (match && match[1].length > 50) {
      base64Lines.push(match[1]);
    }
    if (line.includes('=== FINE PREVIEW ===')) {
      break;
    }
  }
}

console.log("Found", base64Lines.length, "base64 lines");
if (base64Lines.length === 0) {
  process.exit(1);
}

const base64Combined = base64Lines.join('');
console.log("Combined length:", base64Combined.length);

// Decode
const decoded = Buffer.from(base64Combined, 'base64');
console.log("\n=== Decoded content (first 1500 chars) ===\n");
const text = decoded.toString('latin1');
console.log(text.substring(0, 1500));

// Search for filename patterns
console.log("\n=== Searching for 'filename=' patterns ===");
const filenameMatches = text.match(/filename[^;]+/gi);
if (filenameMatches) {
  filenameMatches.forEach(m => console.log(m));
}

console.log("\n=== Searching for 'RCA_' patterns ===");
const rcaMatches = text.match(/RCA_[^\s"'<>\r\n]+/g);
if (rcaMatches) {
  [...new Set(rcaMatches)].forEach(m => console.log(m));
}
