import * as fs from 'fs';

// Read more of the bridge log to get the full base64
const logContent = fs.readFileSync('attached_assets/bridge_1767795341273.log', 'utf8');
const lines = logContent.split('\n');

// Find the S/MIME base64 content - lines after line 2338
let base64Content = '';
let capturing = false;
let lineNum = 0;

for (const line of lines) {
  lineNum++;
  if (lineNum >= 2338 && lineNum <= 2341) {
    // Extract base64 from log lines like "[15:09:25.913]   13: [MIIrUwYJKoZ...]"
    const match = line.match(/\d+: \[([A-Za-z0-9+/=]+)\]/);
    if (match) {
      base64Content += match[1];
    }
  }
}

console.log("=== Base64 from log (first 300 chars) ===");
console.log(base64Content.substring(0, 300));

// Now let's decode the actual signed MIME from the response JSON
// Search for the signedMime in the log
const smimeMatch = logContent.match(/"signedMime":"([^"]+)"/);
if (smimeMatch) {
  console.log("\n=== signedMime from JSON response (first 1000 chars) ===");
  const smimeEscaped = smimeMatch[1].substring(0, 1000);
  // Unescape \r\n
  const smime = smimeEscaped.replace(/\\r\\n/g, '\n').replace(/\\t/g, '\t');
  console.log(smime);
}
