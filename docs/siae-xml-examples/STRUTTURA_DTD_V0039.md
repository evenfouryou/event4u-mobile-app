# Struttura XML SIAE - DTD v0039 (RiepilogoGiornaliero)

## Errori Comuni

| Codice | Descrizione | Causa |
|--------|-------------|-------|
| 0511 | Errore parsing RIEPILOGO GIORNALIERO | Struttura XML non conforme DTD v0039 |
| 0605 | Formato non coerente | Elementi/attributi errati o mancanti |
| 0604 | Duplicato | File con stesso progressivo gia ricevuto |
| 0603 | Data non corrispondente | Mismatch tra Data e DataGenerazione |
| 0704 | Ora generazione non valida | Formato ora errato (deve essere HHMMSS, 6 cifre) |

## Struttura DTD v0039 Corretta

```xml
<?xml version="1.0" encoding="UTF-8"?>
<RiepilogoGiornaliero 
    Data="YYYYMMDD" 
    DataGenerazione="YYYYMMDD" 
    OraGenerazione="HHMMSS"       <!-- 6 CIFRE! Es: 100000 per 10:00:00 -->
    ProgressivoGenerazione="001" 
    Sostituzione="N">
    
    <Titolare>
        <Denominazione>NOME AZIENDA</Denominazione>
        <CodiceFiscale>12345678901</CodiceFiscale>
        <SistemaEmissione>ABCD123456</SistemaEmissione>
    </Titolare>
    
    <Organizzatore>
        <Denominazione>NOME ORGANIZZATORE</Denominazione>
        <CodiceFiscale>12345678901</CodiceFiscale>
        <TipoOrganizzatore valore="G"/>
        
        <Evento>
            <Intrattenimento>S</Intrattenimento>
            <Locale>
                <Denominazione>NOME LOCALE</Denominazione>
                <CodiceLocale>0000000000001</CodiceLocale>
            </Locale>
            <DataEvento>YYYYMMDD</DataEvento>
            <OraEvento>HHMM</OraEvento>
            <TipoTassazione valore="I"/>
            <IncidenzaIntrattenimento>100</IncidenzaIntrattenimento>
            <ImponibileIntrattenimenti>0</ImponibileIntrattenimenti>
            
            <MultiGenere>
                <TipoGenere>65</TipoGenere>
                <IncidenzaGenere>100</IncidenzaGenere>
                <TitoliOpere>
                    <Titolo>NOME EVENTO</Titolo>
                </TitoliOpere>
            </MultiGenere>
            
            <!-- CORRETTO: OrdineDiPosto invece di Settore -->
            <OrdineDiPosto>
                <CodiceOrdine>UN</CodiceOrdine>
                <Capienza>500</Capienza>
                
                <!-- CORRETTO: TitoliAccesso invece di TipoBiglietto -->
                <TitoliAccesso>
                    <TipoTitolo>R1</TipoTitolo>
                    <Quantita>150</Quantita>
                    <CorrispettivoLordo>225000</CorrispettivoLordo>
                    <Prevendita>0</Prevendita>
                    <IVACorrispettivo>40573</IVACorrispettivo>
                    <IVAPrevendita>0</IVAPrevendita>
                    <ImportoPrestazione>0</ImportoPrestazione>
                </TitoliAccesso>
            </OrdineDiPosto>
        </Evento>
    </Organizzatore>
</RiepilogoGiornaliero>
```

## Elementi ERRATI vs CORRETTI

### Settore vs OrdineDiPosto

**ERRATO** (causa errore 0511):
```xml
<Settore>
    <CodiceOrdine>001</CodiceOrdine>
    <Capienza>500</Capienza>
    <TipoBiglietto>...</TipoBiglietto>
</Settore>
```

**CORRETTO**:
```xml
<OrdineDiPosto>
    <CodiceOrdine>UN</CodiceOrdine>
    <Capienza>500</Capienza>
    <TitoliAccesso>...</TitoliAccesso>
</OrdineDiPosto>
```

### BigliettiEmessi/Annullati vs Campi Diretti

**ERRATO** (causa errore 0511):
```xml
<TipoBiglietto>
    <BigliettiEmessi>
        <Quantita>150</Quantita>
        <CorrispettivoLordo>225000</CorrispettivoLordo>
        ...
    </BigliettiEmessi>
    <BigliettiAnnullati>
        <Quantita>0</Quantita>
        ...
    </BigliettiAnnullati>
</TipoBiglietto>
```

**CORRETTO**:
```xml
<TitoliAccesso>
    <TipoTitolo>R1</TipoTitolo>
    <Quantita>150</Quantita>
    <CorrispettivoLordo>225000</CorrispettivoLordo>
    <Prevendita>0</Prevendita>
    <IVACorrispettivo>40573</IVACorrispettivo>
    <IVAPrevendita>0</IVAPrevendita>
    <ImportoPrestazione>0</ImportoPrestazione>
</TitoliAccesso>
```

### CodiceOrdine Formato

**ERRATO**:
```xml
<CodiceOrdine>001</CodiceOrdine>  <!-- 3 caratteri numerici -->
```

**CORRETTO**:
```xml
<CodiceOrdine>UN</CodiceOrdine>   <!-- 2 caratteri alfanumerici -->
```

## Posizione di TipoTassazione

Nel DTD v0039, `TipoTassazione` NON e dentro OrdineDiPosto ma a livello Evento:

```xml
<Evento>
    <Intrattenimento>S</Intrattenimento>
    <Locale>...</Locale>
    <DataEvento>20260124</DataEvento>
    <OraEvento>2300</OraEvento>
    <TipoTassazione valore="I"/>        <!-- QUI, a livello Evento -->
    <IncidenzaIntrattenimento>100</IncidenzaIntrattenimento>
    <ImponibileIntrattenimenti>0</ImponibileIntrattenimenti>
    <MultiGenere>...</MultiGenere>
    <OrdineDiPosto>
        <!-- TipoTassazione NON qui! -->
        <CodiceOrdine>UN</CodiceOrdine>
        ...
    </OrdineDiPosto>
</Evento>
```

## Meccanismo Reinvio (Sostituzione)

### Primo Invio
```xml
<RiepilogoGiornaliero 
    Data="20260124" 
    ProgressivoGenerazione="001" 
    Sostituzione="N">
```
Nome file: `RPG_2026_01_24_001.xsi`

### Reinvio (dopo errore 0604)
```xml
<RiepilogoGiornaliero 
    Data="20260124" 
    ProgressivoGenerazione="002"    <!-- Incrementato -->
    Sostituzione="S">               <!-- N -> S -->
```
Nome file: `RPG_2026_01_24_002.xsi`

## Riferimenti

- DTD: `RiepilogoGiornaliero_v0039_20040209.dtd`
- DTD Mensile: `RiepilogoMensile_v0039_20040209.dtd`
- Codice sorgente: `server/siae-utils.ts` linee 4900-5180
