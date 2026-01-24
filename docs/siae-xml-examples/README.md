# Esempi XML SIAE - Differenze Strutturali

## Panoramica

Questa cartella contiene esempi completi di XML SIAE per dimostrare le differenze strutturali tra i tipi di report.

## File Disponibili

| File | Tipo | Descrizione |
|------|------|-------------|
| `RMG_primo_invio_001.xml` | RiepilogoGiornaliero | Prima trasmissione (Sostituzione="N") |
| `RMG_reinvio_002.xml` | RiepilogoGiornaliero | Reinvio/Sostituzione (Sostituzione="S") |
| `RCA_primo_invio_001.xml` | RiepilogoControlloAccessi | Prima trasmissione (Sostituzione="N") |
| `RCA_reinvio_002.xml` | RiepilogoControlloAccessi | Reinvio/Sostituzione (Sostituzione="S") |

## Differenza Chiave: Posizione del Progressivo

### RMG/RPM (RiepilogoGiornaliero/Mensile)
```xml
<RiepilogoGiornaliero 
    Data="20260124" 
    DataGenerazione="20260124" 
    OraGenerazione="1000" 
    ProgressivoGenerazione="001"    <!-- ATTRIBUTO ROOT -->
    Sostituzione="N">               <!-- ATTRIBUTO ROOT -->
    <Titolare>
        <Denominazione>...</Denominazione>
        <!-- NO ProgressivoRiepilogo qui! -->
    </Titolare>
</RiepilogoGiornaliero>
```

### RCA (RiepilogoControlloAccessi)
```xml
<RiepilogoControlloAccessi 
    Sostituzione="N">               <!-- ATTRIBUTO ROOT (solo questo!) -->
    <Titolare>
        <ProgressivoRiepilogo>001</ProgressivoRiepilogo>  <!-- ELEMENTO INTERNO -->
        <Denominazione>...</Denominazione>
    </Titolare>
</RiepilogoControlloAccessi>
```

## Tabella Comparativa

| Aspetto | RCA | RMG/RPM |
|---------|-----|---------|
| **Sostituzione** | Attributo ROOT | Attributo ROOT |
| **Progressivo** | Elemento `<ProgressivoRiepilogo>` dentro `<Titolare>` | Attributo `ProgressivoGenerazione` nel ROOT |
| **Data** | Non presente nel ROOT | Attributo `Data` nel ROOT |
| **DataGenerazione** | Non presente | Attributo nel ROOT |
| **OraGenerazione** | Non presente | Attributo nel ROOT |

## Meccanismo Sostituzione

Il meccanismo è **IDENTICO** per tutti i tipi:

1. **Primo Invio**: `Sostituzione="N"`, progressivo = 001
2. **Reinvio**: `Sostituzione="S"`, progressivo = 002, 003, ...

La differenza è solo nella **posizione** del progressivo, non nel meccanismo.

## Codice Sorgente

- RMG/RPM: `server/siae-utils.ts` linee 5170-5177
- RCA: `server/siae-routes.ts` funzione `generateRcaXml`
- Logica Sostituzione: `server/siae-utils.ts` linea 4871
