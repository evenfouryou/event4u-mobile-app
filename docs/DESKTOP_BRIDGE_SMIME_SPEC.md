# Desktop Bridge - Specifiche S/MIME per SIAE

## Panoramica

Per conformarsi all'Allegato C del Provvedimento Agenzia delle Entrate 04/03/2008, le email di trasmissione SIAE devono essere firmate S/MIME versione 2 utilizzando la carta di attivazione SIAE.

L'app desktop Event4U Bridge implementa l'handler `SIGN_SMIME` per firmare i messaggi email con la carta di attivazione.

**Stato implementazione: COMPLETATO** (v3.15)

## Requisiti Critici (Allegato C SIAE 1.6.2.a.3)

1. **Header "From:" deve corrispondere all'email nel certificato** - Immutabile dopo la firma S/MIME
2. **Envelope MAIL FROM deve corrispondere all'email nel certificato** - Per validazione SPF/DKIM
3. **Firma PKCS#7 valida** - Struttura ASN.1/DER conforme RFC 5652 (CMS)
4. **SHA-256** - Algoritmo di hash per la firma (micalg=sha-256)

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

## Implementazione C# (via libSIAEp7.dll)

La firma S/MIME utilizza `libSIAEp7.dll` (PKCS7SignML) per creare firme PKCS#7/CMS valide.
Questo è lo stesso meccanismo usato per le firme CAdES-BES dei report XML.

```csharp
// Workflow firma S/MIME:
// 1. Scrivi contenuto MIME in file temporaneo
// 2. Chiama PKCS7SignML per creare firma PKCS#7
// 3. Leggi file P7S risultante
// 4. Costruisci messaggio multipart/signed
// 5. Estrai email da certificato per validazione

[DllImport("libSIAEp7.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
static extern int PKCS7SignML(
    [MarshalAs(UnmanagedType.LPStr)] string pin,
    uint slot,
    [MarshalAs(UnmanagedType.LPStr)] string inputFile,
    [MarshalAs(UnmanagedType.LPStr)] string outputFile,
    int bInitialize);

// File temporanei creati:
// - smime_input_{timestamp}.mime  -> contenuto MIME da firmare
// - smime_output_{timestamp}.p7s  -> firma PKCS#7 risultante

// Estrazione email da certificato (pattern multipli):
var emailPatterns = new[] {
    // Subject Alternative Name (SAN)
    @"RFC822[^=]*=([^\s,]+)",
    @"email:([^\s,]+)", 
    @"rfc822Name=([^\s,]+)",
    // Subject DN
    @"E=([^\s,]+)",
    @"EMAIL=([^\s,]+)",
    @"EMAILADDRESS=([^\s,]+)"
};
```

### Struttura S/MIME Risultante

```
MIME-Version: 1.0
Content-Type: multipart/signed; protocol="application/pkcs7-signature"; 
              micalg=sha-256; boundary="----=_smime_xxx"

------=_smime_xxx
[contenuto MIME originale con header From: = email certificato]
------=_smime_xxx
Content-Type: application/pkcs7-signature; name="smime.p7s"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="smime.p7s"

[firma PKCS#7 base64 in righe da 76 caratteri]
------=_smime_xxx--
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
