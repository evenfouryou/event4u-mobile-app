# Struttura XML SIAE - DTD v0039

**Ultimo aggiornamento:** 24 Gennaio 2026
**Fonte:** DTD ufficiali SIAE v0039 (RiepilogoGiornaliero_v0039_20040209.dtd, RiepilogoMensile_v0039_20040209.dtd)

## Errori Comuni

| Codice | Descrizione | Causa |
|--------|-------------|-------|
| 0511 | Errore parsing RIEPILOGO | Struttura XML non conforme DTD v0039 |
| 0605 | Formato non coerente | Elementi/attributi errati o mancanti |
| 0604 | Duplicato | File con stesso progressivo gia ricevuto |
| 0603 | Data non corrispondente | Mismatch tra Data e DataGenerazione |
| 0704 | Ora generazione non valida | Formato ora errato (deve essere HHMMSS, 6 cifre) |

## DIFFERENZE CRITICHE TRA RPG E RPM

| Aspetto | RPG (Giornaliero) | RPM (Mensile) |
|---------|-------------------|---------------|
| Attributo periodo | `Data="YYYYMMDD"` | `Mese="YYYYMM"` |
| Filename | `RPG_AAAA_MM_GG_###.xsi` (5 parti) | `RPM_AAAA_MM_###.xsi` (4 parti) |
| Intrattenimento | `TipoTassazione, Incidenza?` | `TipoTassazione, Incidenza?, ImponibileIntrattenimenti?` |
| OrdineDiPosto | NO `IVAEccedenteOmaggi` | **SI** `IVAEccedenteOmaggi` (obbligatorio) |

## Struttura RPG (RiepilogoGiornaliero) - DTD v0039

```xml
<?xml version="1.0" encoding="UTF-8"?>
<RiepilogoGiornaliero 
    Data="YYYYMMDD" 
    DataGenerazione="YYYYMMDD" 
    OraGenerazione="HHMMSS"
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
            <!-- CORRETTO: Intrattenimento contiene elementi, NON testo! -->
            <Intrattenimento>
                <TipoTassazione valore="I"/>
                <Incidenza>100</Incidenza>
            </Intrattenimento>
            <Locale>
                <Denominazione>NOME LOCALE</Denominazione>
                <CodiceLocale>0000000000001</CodiceLocale>
            </Locale>
            <DataEvento>YYYYMMDD</DataEvento>
            <OraEvento>HHMM</OraEvento>
            <MultiGenere>
                <TipoGenere>65</TipoGenere>
                <IncidenzaGenere>100</IncidenzaGenere>
                <TitoliOpere>
                    <Titolo>NOME EVENTO</Titolo>
                </TitoliOpere>
            </MultiGenere>
            <!-- RPG: NO IVAEccedenteOmaggi -->
            <OrdineDiPosto>
                <CodiceOrdine>UN</CodiceOrdine>
                <Capienza>500</Capienza>
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

## Struttura RPM (RiepilogoMensile) - DTD v0039

```xml
<?xml version="1.0" encoding="UTF-8"?>
<RiepilogoMensile 
    Mese="YYYYMM"
    DataGenerazione="YYYYMMDD" 
    OraGenerazione="HHMMSS"
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
            <!-- RPM: Intrattenimento con ImponibileIntrattenimenti opzionale -->
            <Intrattenimento>
                <TipoTassazione valore="I"/>
                <Incidenza>100</Incidenza>
                <ImponibileIntrattenimenti>0</ImponibileIntrattenimenti>
            </Intrattenimento>
            <Locale>
                <Denominazione>NOME LOCALE</Denominazione>
                <CodiceLocale>0000000000001</CodiceLocale>
            </Locale>
            <DataEvento>YYYYMMDD</DataEvento>
            <OraEvento>HHMM</OraEvento>
            <MultiGenere>
                <TipoGenere>65</TipoGenere>
                <IncidenzaGenere>100</IncidenzaGenere>
                <TitoliOpere>
                    <Titolo>NOME EVENTO</Titolo>
                </TitoliOpere>
            </MultiGenere>
            <!-- RPM: IVAEccedenteOmaggi OBBLIGATORIO -->
            <OrdineDiPosto>
                <CodiceOrdine>UN</CodiceOrdine>
                <Capienza>500</Capienza>
                <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>
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
</RiepilogoMensile>
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

## Struttura Intrattenimento (CRITICO!)

**ATTENZIONE:** `<Intrattenimento>` NON contiene testo, ma elementi figli!

**ERRATO** (causa errore 0511):
```xml
<Intrattenimento>S</Intrattenimento>
<TipoTassazione valore="I"/>
<IncidenzaIntrattenimento>100</IncidenzaIntrattenimento>
```

**CORRETTO** (DTD v0039):
```xml
<Intrattenimento>
    <TipoTassazione valore="I"/>
    <Incidenza>100</Incidenza>
</Intrattenimento>
```

Per RPM mensile, aggiungere `ImponibileIntrattenimenti`:
```xml
<Intrattenimento>
    <TipoTassazione valore="I"/>
    <Incidenza>100</Incidenza>
    <ImponibileIntrattenimenti>0</ImponibileIntrattenimenti>
</Intrattenimento>
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
