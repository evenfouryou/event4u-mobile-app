// Decode the S/MIME content from the bridge log
const base64Start = "MIIrUwYJKoZIhvcNAQcCoIIrRDCCK0ACAQExCzAJBgUrDgMCGgUAMIIikQYJKoZIhvcNAQcBoIIiggSCIn5Gcm9tOkV2ZW50NFUgU0lBRSA8dGlja2Vmb3VyeW91QGdtYWlsLmNvbT4NClRvOnNlcnZlcnRlc3QyQGJhdGVzdC5zaWFlLml0DQpTdWJqZWN0";

const decoded = Buffer.from(base64Start, 'base64');
console.log("=== Decoded S/MIME content (first 500 bytes as text) ===\n");
console.log(decoded.toString('utf8', 0, 500).replace(/\r\n/g, '\n'));
