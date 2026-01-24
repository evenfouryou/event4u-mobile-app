# Esempi XML SIAE - DTD v0039 Compliant

## Panoramica

Questa cartella contiene esempi completi di XML SIAE conformi al DTD v0039.

## File Disponibili

| File | Tipo | Descrizione |
|------|------|-------------|
| `RMG_primo_invio_001.xml` | RiepilogoGiornaliero | Prima trasmissione (Sostituzione="N") |
| `RMG_reinvio_002.xml` | RiepilogoGiornaliero | Reinvio/Sostituzione (Sostituzione="S") |
| `RCA_primo_invio_001.xml` | RiepilogoControlloAccessi | Prima trasmissione (Sostituzione="N") |
| `RCA_reinvio_002.xml` | RiepilogoControlloAccessi | Reinvio/Sostituzione (Sostituzione="S") |
| `RPG_reinvio_corretto.xml` | RiepilogoGiornaliero | Esempio reinvio DTD v0039 corretto |
| `STRUTTURA_DTD_V0039.md` | Documentazione | Struttura elementi DTD v0039 |

## Struttura DTD v0039 - Elementi Chiave

### RMG/RPM (RiepilogoGiornaliero/Mensile)

```xml
<RiepilogoGiornaliero 
    Data="20260124" 
    DataGenerazione="20260124" 
    OraGenerazione="1000" 
    ProgressivoGenerazione="001"
    Sostituzione="N">
    
    <Titolare>
        <Denominazione>...</Denominazione>
        <CodiceFiscale>...</CodiceFiscale>
        <SistemaEmissione>...</SistemaEmissione>
    </Titolare>
    
    <Organizzatore>
        <Denominazione>...</Denominazione>
        <CodiceFiscale>...</CodiceFiscale>
        <TipoOrganizzatore valore="G"/>
        
        <Evento>
            <Intrattenimento>S</Intrattenimento>
            <Locale>...</Locale>
            <DataEvento>20260124</DataEvento>
            <OraEvento>2300</OraEvento>
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
            
            <!-- CORRETTO: OrdineDiPosto (non Settore!) -->
            <OrdineDiPosto>
                <CodiceOrdine>UN</CodiceOrdine>
                <Capienza>500</Capienza>
                <!-- CORRETTO: TitoliAccesso (non TipoBiglietto!) -->
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

### RCA (RiepilogoControlloAccessi)

```xml
<RiepilogoControlloAccessi Sostituzione="N">
    <Titolare>
        <ProgressivoRiepilogo>001</ProgressivoRiepilogo>
        <Denominazione>...</Denominazione>
        <CodiceFiscale>...</CodiceFiscale>
        <SistemaEmissione>...</SistemaEmissione>
    </Titolare>
    ...
</RiepilogoControlloAccessi>
```

## Differenza Chiave: Posizione del Progressivo

| Tipo | Progressivo | Sostituzione |
|------|-------------|--------------|
| RMG/RPM | Attributo ROOT `ProgressivoGenerazione` | Attributo ROOT |
| RCA | Elemento `<ProgressivoRiepilogo>` in Titolare | Attributo ROOT |

## Errori Comuni SIAE

| Codice | Descrizione | Causa Comune |
|--------|-------------|--------------|
| 0511 | Errore parsing | Struttura XML non conforme DTD |
| 0604 | Duplicato | File con stesso progressivo gia inviato |
| 0605 | Formato non coerente | Elementi errati o mancanti |
| 0603 | Data non corrispondente | Mismatch Data/DataGenerazione |

## Elementi ERRATI vs CORRETTI

| ERRATO | CORRETTO |
|--------|----------|
| `<Settore>` | `<OrdineDiPosto>` |
| `<TipoBiglietto>` | `<TitoliAccesso>` |
| `<CodiceOrdine>001</CodiceOrdine>` | `<CodiceOrdine>UN</CodiceOrdine>` |
| `<BigliettiEmessi><Quantita>` | `<Quantita>` diretto |

## Meccanismo Reinvio

| Parametro | Primo Invio | Reinvio |
|-----------|-------------|---------|
| ProgressivoGenerazione (RMG) | "001" | "002", "003", ... |
| ProgressivoRiepilogo (RCA) | "001" | "002", "003", ... |
| Sostituzione | "N" | "S" |
| Nome file | `RPG_2026_01_24_001.xsi` | `RPG_2026_01_24_002.xsi` |

## Riferimenti

- DTD RMG: `RiepilogoGiornaliero_v0039_20040209.dtd`
- DTD RPM: `RiepilogoMensile_v0039_20040209.dtd`
- DTD RCA: `ControlloAccessi_v0001_20080626.dtd`
- Codice: `server/siae-utils.ts` linee 4900-5180
