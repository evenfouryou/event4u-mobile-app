# Desktop Bridge - Specifiche S/MIME per SIAE

## Panoramica

Per conformarsi all'Allegato C del Provvedimento Agenzia delle Entrate 04/03/2008, le email di trasmissione SIAE devono essere firmate S/MIME versione 2 utilizzando la carta di attivazione SIAE.

L'app desktop Event4U Bridge implementa l'handler `SIGN_SMIME` per firmare i messaggi email con la carta di attivazione.

**Stato implementazione: COMPLETATO** (v3.6)

## Requisiti

- Lettore smart card connesso
- Carta di attivazione SIAE inserita
- PIN carta sbloccato
- Certificato di firma valido sulla carta

## Handler: REQUEST_SMIME_SIGNATURE

### Messaggio in Ingresso

```json
{
  "type": "REQUEST_SMIME_SIGNATURE",
  "requestId": "smime_1703847600000_abc123xyz",
  "payload": {
    "mimeContent": "From: \"Event4U\" <noreply@event4u.it>\r\nTo: servertest2@batest.siae.it\r\nSubject: RCA_2024_12_29_EVENT4U1_001_XSI_V.01.00\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"----=_Part_xxx\"\r\n\r\n...",
    "recipientEmail": "servertest2@batest.siae.it",
    "timestamp": "2024-12-29T10:00:00.000Z"
  }
}
```

### Risposta Successo

```json
{
  "type": "SMIME_SIGNATURE_RESPONSE",
  "requestId": "smime_1703847600000_abc123xyz",
  "payload": {
    "success": true,
    "signatureData": {
      "signedMime": "MIME-Version: 1.0\r\nContent-Type: multipart/signed; protocol=\"application/pkcs7-signature\"; micalg=sha-256; boundary=\"----=_smime_xxx\"\r\n\r\n------=_smime_xxx\r\n[contenuto originale]\r\n------=_smime_xxx\r\nContent-Type: application/pkcs7-signature; name=\"smime.p7s\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"smime.p7s\"\r\n\r\n[firma PKCS#7 base64]\r\n------=_smime_xxx--",
      "signerEmail": "titolare@example.it",
      "signerName": "Mario Rossi",
      "certificateSerial": "1234567890ABCDEF",
      "signedAt": "2024-12-29T10:00:05.000Z"
    }
  }
}
```

### Risposta Errore

```json
{
  "type": "SMIME_SIGNATURE_RESPONSE",
  "requestId": "smime_1703847600000_abc123xyz",
  "payload": {
    "success": false,
    "error": "CARD_NOT_PRESENT: Carta di attivazione non inserita"
  }
}
```

## Codici Errore

| Codice | Descrizione |
|--------|-------------|
| `CARD_NOT_PRESENT` | Carta di attivazione non inserita nel lettore |
| `CARD_LOCKED` | Carta bloccata (PIN errato troppe volte) |
| `PIN_REQUIRED` | PIN non inserito, richiesta autenticazione |
| `PIN_WRONG` | PIN errato |
| `CERTIFICATE_NOT_FOUND` | Certificato di firma non trovato sulla carta |
| `CERTIFICATE_EXPIRED` | Certificato scaduto |
| `SIGNATURE_FAILED` | Errore durante la firma |
| `READER_ERROR` | Errore comunicazione con lettore smart card |

## Implementazione C# (Esempio)

```csharp
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Text;

public class SmimeSignatureHandler
{
    public async Task<SmimeSignatureResponse> HandleRequest(SmimeSignatureRequest request)
    {
        try
        {
            // 1. Ottieni il certificato dalla smart card
            var certificate = GetSmartCardCertificate();
            if (certificate == null)
            {
                return new SmimeSignatureResponse
                {
                    Success = false,
                    Error = "CERTIFICATE_NOT_FOUND: Certificato di firma non trovato"
                };
            }

            // 2. Verifica validita' certificato
            if (certificate.NotAfter < DateTime.Now)
            {
                return new SmimeSignatureResponse
                {
                    Success = false,
                    Error = "CERTIFICATE_EXPIRED: Certificato scaduto"
                };
            }

            // 3. Firma il contenuto MIME con S/MIME
            var signedMime = SignMimeContent(request.MimeContent, certificate);

            // 4. Estrai informazioni dal certificato
            var signerEmail = GetEmailFromCertificate(certificate);
            var signerName = certificate.GetNameInfo(X509NameType.SimpleName, false);

            return new SmimeSignatureResponse
            {
                Success = true,
                SignatureData = new SmimeSignatureData
                {
                    SignedMime = signedMime,
                    SignerEmail = signerEmail,
                    SignerName = signerName,
                    CertificateSerial = certificate.SerialNumber,
                    SignedAt = DateTime.UtcNow.ToString("o")
                }
            };
        }
        catch (CryptographicException ex)
        {
            return new SmimeSignatureResponse
            {
                Success = false,
                Error = $"SIGNATURE_FAILED: {ex.Message}"
            };
        }
    }

    private X509Certificate2 GetSmartCardCertificate()
    {
        // Apri lo store delle smart card
        using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
        store.Open(OpenFlags.ReadOnly);

        // Cerca certificati con chiave privata su smart card
        foreach (var cert in store.Certificates)
        {
            if (cert.HasPrivateKey)
            {
                // Verifica se e' su smart card (CSP specifico)
                var privateKey = cert.GetRSAPrivateKey();
                if (privateKey is RSACng rsaCng)
                {
                    var keyHandle = rsaCng.Key;
                    // Verifica provider smart card
                    if (IsSmartCardKey(keyHandle))
                    {
                        return cert;
                    }
                }
            }
        }
        return null;
    }

    private string SignMimeContent(string mimeContent, X509Certificate2 certificate)
    {
        // Converti il contenuto MIME in bytes
        byte[] contentBytes = Encoding.UTF8.GetBytes(mimeContent);

        // Crea il contenuto PKCS#7
        var contentInfo = new ContentInfo(contentBytes);
        var signedCms = new SignedCms(contentInfo, detached: true);

        // Crea il firmatario
        var signer = new CmsSigner(SubjectIdentifierType.IssuerAndSerialNumber, certificate)
        {
            DigestAlgorithm = new Oid("2.16.840.1.101.3.4.2.1") // SHA-256
        };

        // Firma
        signedCms.ComputeSignature(signer);
        byte[] signatureBytes = signedCms.Encode();
        string signatureBase64 = Convert.ToBase64String(signatureBytes);

        // Costruisci il messaggio S/MIME multipart/signed
        string boundary = $"----=_smime_{Guid.NewGuid():N}";
        
        var sb = new StringBuilder();
        sb.AppendLine($"MIME-Version: 1.0");
        sb.AppendLine($"Content-Type: multipart/signed; protocol=\"application/pkcs7-signature\"; micalg=sha-256; boundary=\"{boundary}\"");
        sb.AppendLine();
        sb.AppendLine($"--{boundary}");
        sb.Append(mimeContent);
        sb.AppendLine();
        sb.AppendLine($"--{boundary}");
        sb.AppendLine("Content-Type: application/pkcs7-signature; name=\"smime.p7s\"");
        sb.AppendLine("Content-Transfer-Encoding: base64");
        sb.AppendLine("Content-Disposition: attachment; filename=\"smime.p7s\"");
        sb.AppendLine();
        
        // Dividi la firma base64 in righe da 76 caratteri
        for (int i = 0; i < signatureBase64.Length; i += 76)
        {
            int length = Math.Min(76, signatureBase64.Length - i);
            sb.AppendLine(signatureBase64.Substring(i, length));
        }
        
        sb.AppendLine($"--{boundary}--");

        return sb.ToString().Replace("\n", "\r\n");
    }

    private string GetEmailFromCertificate(X509Certificate2 certificate)
    {
        // Cerca l'email nel Subject Alternative Name
        foreach (var extension in certificate.Extensions)
        {
            if (extension.Oid?.Value == "2.5.29.17") // Subject Alternative Name
            {
                var asnData = new AsnEncodedData(extension.Oid, extension.RawData);
                var sanString = asnData.Format(false);
                // Parse per trovare l'email (RFC822 Name)
                var match = System.Text.RegularExpressions.Regex.Match(sanString, @"RFC822 Name=([^\s,]+)");
                if (match.Success)
                {
                    return match.Groups[1].Value;
                }
            }
        }
        
        // Fallback: cerca nel Subject
        var subjectMatch = System.Text.RegularExpressions.Regex.Match(
            certificate.Subject, @"E=([^\s,]+)");
        return subjectMatch.Success ? subjectMatch.Groups[1].Value : "";
    }
}
```

## Requisiti SIAE (Allegato C)

### Sezione 1.6.1 - Requisiti Mittente
- a.1: Il mittente deve essere titolare con carta di attivazione
- a.2: L'email deve essere firmata mediante la carta di attivazione
- a.3: L'indirizzo email del mittente deve corrispondere a quello nel certificato

### Sezione 1.6.2 - Comportamento SIAE
- SIAE non risponde a email non conformi
- La conferma di ricezione viene inviata solo per email correttamente firmate

## Test

### Ambiente di Test SIAE
- Email: `servertest2@batest.siae.it`
- Modalita': Test (non produce effetti fiscali)

### Verifica Locale
1. Inserire la carta di attivazione
2. Inviare una richiesta di test tramite l'interfaccia web
3. Verificare che la risposta contenga `signedMime` valido
4. Verificare che `signerEmail` corrisponda al certificato

## Integrazione WebSocket

L'handler deve essere registrato nel gestore messaggi WebSocket esistente:

```csharp
case "REQUEST_SMIME_SIGNATURE":
    var smimeHandler = new SmimeSignatureHandler();
    var smimeRequest = JsonConvert.DeserializeObject<SmimeSignatureRequest>(message.Payload);
    var smimeResponse = await smimeHandler.HandleRequest(smimeRequest);
    
    SendToServer(new
    {
        type = "SMIME_SIGNATURE_RESPONSE",
        requestId = message.RequestId,
        payload = new
        {
            success = smimeResponse.Success,
            signatureData = smimeResponse.SignatureData,
            error = smimeResponse.Error
        }
    });
    break;
```

## Note Importanti

1. **Non modificare il contenuto dopo la firma**: Il `mimeContent` deve essere firmato esattamente come ricevuto
2. **CRLF**: Usare `\r\n` per i terminatori di riga nel messaggio S/MIME
3. **Timeout**: Il server attende 60 secondi per la risposta
4. **Certificato email**: L'email nel certificato DEVE corrispondere al mittente configurato
