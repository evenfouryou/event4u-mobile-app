import * as fs from 'fs';

const logContent = fs.readFileSync('attached_assets/bridge_1767795341273.log', 'utf8');

// Find the signedMime JSON response
const match = logContent.match(/"signedMime":"([^}]+)/);
if (!match) {
  console.log("signedMime not found");
  process.exit(1);
}

// Get the base64 part after the headers
const smimeEscaped = match[1];
console.log("=== S/MIME Content Analysis ===\n");

// Extract just the base64 body (after empty line)
const headerEndMatch = smimeEscaped.match(/\\r\\n\\r\\n([A-Za-z0-9+/=\\r\\n]+)/);
if (!headerEndMatch) {
  console.log("Could not find base64 body");
  process.exit(1);
}

let base64Body = headerEndMatch[1].replace(/\\r\\n/g, '');
console.log("Base64 body length:", base64Body.length);
console.log("First 200 chars:", base64Body.substring(0, 200));

// Decode
try {
  const decoded = Buffer.from(base64Body, 'base64');
  console.log("\n=== Decoded content (first 2000 bytes as text) ===\n");
  const text = decoded.toString('latin1').substring(0, 2000);
  console.log(text);
  
  // Look for attachment filename
  console.log("\n=== Searching for RCA filename in decoded content ===");
  if (text.includes('RCA_')) {
    console.log("✓ Found RCA_ in content");
    const rcaMatch = text.match(/RCA_[^\s"'<>]+/g);
    if (rcaMatch) {
      console.log("Matches:", rcaMatch);
    }
  } else {
    console.log("✗ RCA_ NOT found in first 2000 bytes");
  }
  
} catch (e) {
  console.log("Decode error:", e);
}
