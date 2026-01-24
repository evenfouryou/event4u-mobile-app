# ANALISI COMPLETA ERRORE 0604 - PROSPETTO FINALE

**Data Analisi:** 24 Gennaio 2026  
**Analista:** Event4U AI System  
**Focus:** Errore SIAE 0604 e struttura XML non conforme DTD v0039

---

## 1) INVENTARIO COMPLETO DEI FILE

| Nome File | Tipo | Data | Rilevanza | Sintesi |
|-----------|------|------|-----------|---------|
| `RiepilogoGiornaliero_v0039_20040209.dtd` | DTD | 2004-02-09 | **ALTA** | DTD ufficiale SIAE per RMG/RPM |
| `RiepilogoMensile_v0039_20040209.dtd` | DTD | 2004-02-09 | **ALTA** | DTD ufficiale SIAE per RPM |
| `Log_v0040_20190627.dtd` | DTD | 2019-06-27 | ALTA | DTD per LogTransazione |
| `ControlloAccessi_v0001_20080626.dtd` | DTD | 2008-06-26 | ALTA | DTD per RCA |
| `log_giornaliero_1767570708231.txt` | XML | 2025 | **CRITICA** | Esempio FUNZIONANTE da produzione |
| `RPG_test_evento4_oggi.xml` | XML | 2026-01-24 | **CRITICA** | Nostro file test (ERRATO) |
| `RCA_2025_12_17_001.xsi_*.txt` | Risposta SIAE | 2026-01-08 | ALTA | Risposta con errore 40604 |
| `STRUTTURA_DTD_V0039.md` | Doc | 2026 | ALTA | Nostra documentazione interna |
| `Progetto_SIETA*.txt` | Doc | SIAE | MEDIA | Documentazione SIETA ufficiale |

---

## 2) TIMELINE DEGLI EVENTI

| Data | Evento | Documento Prova | Effetto |
|------|--------|-----------------|---------|
| 2004-02-09 | Pubblicazione DTD v0039 | `RiepilogoGiornaliero_v0039_20040209.dtd` | Standard XML SIAE |
| 2019-06-27 | Aggiornamento DTD Log | `Log_v0040_20190627.dtd` | Versione corrente |
| 2026-01-24 | Test invio RPG_003 | Log server | Errore 0604 |
| 2026-01-24 | Test invio RPG_004 | Log server | Errore 0604 |

---

## 3) ANALISI DELL'ERRORE 0604

### 3.1 Definizione Ufficiale

**Codice:** 0604 / 40604  
**Messaggio:** "Il riepilogo risulta già elaborato"  
**Fonte:** `RCA_2025_12_17_001.xsi_2026_01_08_0800008258_0000_(1)_1767829930881.txt`

### 3.2 Causa Root

**CHIAVE UNIVOCA SIAE per RMG/RPM:**
```
DATA + SISTEMA_EMISSIONE + PROGRESSIVO
```

Se invii un file con la stessa combinazione di:
- `Data="20260124"` (attributo XML)
- `SistemaEmissione` (nel Titolare)
- `ProgressivoGenerazione="00X"`

SIAE rifiuta con errore 0604 perché già elaborato.

### 3.3 Condizioni per Reinvio

| Condizione | Primo Invio | Reinvio (Sostituzione) |
|------------|-------------|------------------------|
| `Sostituzione` | `"N"` | `"S"` |
| `ProgressivoGenerazione` | `"001"` | `"002"`, `"003"`, ... |
| Nome file | `RPG_2026_01_24_001.xsi` | `RPG_2026_01_24_002.xsi` |
| Contenuto | Dati nuovi | Dati corretti che sostituiscono |

---

## 4) QUADRO NORMATIVO

| Norma/DTD | Requisito | Stato | Note |
|-----------|-----------|-------|------|
| DTD v0039 `Intrattenimento` | `(TipoTassazione, Incidenza?)` | ❌ NON OK | Nostro XML ha testo invece di elementi |
| DTD v0039 `TipoTassazione` | Dentro `Intrattenimento` | ❌ NON OK | Nostro XML lo ha fuori |
| DTD v0039 `Incidenza` | Elemento opzionale | ❌ NON OK | Usiamo `IncidenzaIntrattenimento` che non esiste |
| DTD v0039 `ImponibileIntrattenimenti` | Solo in RPM | ⚠️ DA VERIFICARE | Lo usiamo in RMG |
| DTD v0039 `IVAEccedenteOmaggi` | In OrdineDiPosto (mensile) | ⚠️ DA VERIFICARE | Manca nei nostri file |
| Allegato C SIAE | Firma S/MIME obbligatoria | ✅ OK | Implementato |
| Allegato C SIAE | Email mittente = certificato | ✅ OK | tickefouryou@gmail.com |

---

## 5) DIAGNOSI: ROOT CAUSE

### 5.1 PROBLEMA PRINCIPALE

**La struttura XML è NON CONFORME al DTD v0039 ufficiale SIAE.**

### 5.2 Evidenze Specifiche

#### NOSTRO FILE (ERRATO):
```xml
<Evento>
    <Intrattenimento>S</Intrattenimento>        <!-- ❌ ERRATO: contiene testo -->
    <Locale>...</Locale>
    <DataEvento>20260124</DataEvento>
    <OraEvento>2130</OraEvento>
    <TipoTassazione valore="I"/>                <!-- ❌ ERRATO: fuori da Intrattenimento -->
    <IncidenzaIntrattenimento>100</IncidenzaIntrattenimento>  <!-- ❌ NON ESISTE nel DTD -->
    <ImponibileIntrattenimenti>0</ImponibileIntrattenimenti>  <!-- ❌ Solo in mensile -->
    ...
</Evento>
```

#### FILE FUNZIONANTE (CORRETTO) - da `log_giornaliero_1767570708231.txt`:
```xml
<Evento>
    <Intrattenimento>
        <TipoTassazione valore="S"/>            <!-- ✅ DENTRO Intrattenimento -->
    </Intrattenimento>
    <Locale>...</Locale>
    <DataEvento>20250527</DataEvento>
    <OraEvento>1859</OraEvento>
    <MultiGenere>...</MultiGenere>
    <OrdineDiPosto>
        <CodiceOrdine>A0</CodiceOrdine>
        <Capienza>90</Capienza>
        <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>  <!-- ✅ Presente -->
    </OrdineDiPosto>
    ...
</Evento>
```

### 5.3 DTD v0039 Ufficiale

```dtd
<!ELEMENT Evento (Intrattenimento, Locale, DataEvento, OraEvento, MultiGenere+, OrdineDiPosto+)>
<!ELEMENT Intrattenimento (TipoTassazione, Incidenza?)>
<!ELEMENT TipoTassazione EMPTY>
<!ATTLIST TipoTassazione valore (S | I) "S">
<!ELEMENT Incidenza %text;>
```

### 5.4 Impatto

| Errore Strutturale | Conseguenza SIAE |
|--------------------|------------------|
| `<Intrattenimento>S</Intrattenimento>` | Errore parsing 0511 |
| `TipoTassazione` fuori posizione | Errore formato 0605 |
| `IncidenzaIntrattenimento` inesistente | Errore parsing 0511 |
| Progressivo già usato | Errore 0604 (duplicato) |

### 5.5 Perché Errore 0604?

Il file viene **elaborato parzialmente** da SIAE:
1. Riceve il file con firma S/MIME valida ✅
2. Estrae i metadati (Data, Progressivo, Sistema) ✅
3. Controlla se già esistente → **SÌ** → Errore 0604

Il problema è che anche file precedenti con struttura errata sono stati "registrati" nel sistema SIAE, causando duplicati quando reinviamo con lo stesso progressivo.

---

## 6) SOLUZIONE OPERATIVA

### 6.1 Azioni Immediate

| # | Azione | Priorità | File da Modificare | Verifica |
|---|--------|----------|-------------------|----------|
| 1 | Correggere struttura `Intrattenimento` | **CRITICA** | `siae-utils.ts` | XML conforme DTD |
| 2 | Spostare `TipoTassazione` dentro `Intrattenimento` | **CRITICA** | `siae-utils.ts` | DTD validation |
| 3 | Rimuovere `IncidenzaIntrattenimento` | **CRITICA** | `siae-utils.ts` | Usare `Incidenza` |
| 4 | Rimuovere `ImponibileIntrattenimenti` da giornaliero | ALTA | `siae-utils.ts` | Solo in mensile |
| 5 | Aggiungere `IVAEccedenteOmaggi` in OrdineDiPosto | ALTA | `siae-utils.ts` | Valore 0 default |
| 6 | Usare DATA NUOVA per test | ALTA | Test manuale | Evitare 0604 |
| 7 | Se reinvio stesso giorno: `Sostituzione="S"` | ALTA | `siae-utils.ts` | Nuovo progressivo |

### 6.2 Struttura XML Corretta da Implementare

```xml
<Evento>
    <Intrattenimento>
        <TipoTassazione valore="I"/>
        <Incidenza>100</Incidenza>  <!-- Opzionale, per intrattenimento -->
    </Intrattenimento>
    <Locale>
        <Denominazione>CLUB NAPOLI SUNSET</Denominazione>
        <CodiceLocale>0000000000003</CodiceLocale>
    </Locale>
    <DataEvento>20260124</DataEvento>
    <OraEvento>2130</OraEvento>
    <MultiGenere>
        <TipoGenere>65</TipoGenere>
        <IncidenzaGenere>100</IncidenzaGenere>
        <TitoliOpere>
            <Titolo>DISCO NIGHT PARADISE</Titolo>
        </TitoliOpere>
    </MultiGenere>
    <OrdineDiPosto>
        <CodiceOrdine>UN</CodiceOrdine>
        <Capienza>400</Capienza>
        <TitoliAccesso>
            <TipoTitolo>R1</TipoTitolo>
            <Quantita>120</Quantita>
            <CorrispettivoLordo>180000</CorrispettivoLordo>
            <Prevendita>0</Prevendita>
            <IVACorrispettivo>32459</IVACorrispettivo>
            <IVAPrevendita>0</IVAPrevendita>
            <ImportoPrestazione>0</ImportoPrestazione>
        </TitoliAccesso>
        <IVAEccedenteOmaggi>0</IVAEccedenteOmaggi>
    </OrdineDiPosto>
</Evento>
```

---

## 7) PROSPETTO FINALE

### 7.1 Stato Pratica 0604

| Aspetto | Stato |
|---------|-------|
| Firma S/MIME | ✅ Funzionante |
| Invio Email | ✅ Funzionante |
| Risposta SIAE | ✅ Ricevuta |
| Parsing risposta | ✅ Corretto (dal contenuto) |
| Struttura XML | ❌ **NON CONFORME DTD v0039** |
| Progressivo | ⚠️ Già usato per data 20260124 |

### 7.2 Motivo Rinvio/Errore

**Citazione diretta dalla risposta SIAE:**
```
ERRORE
CODICE:      40604
DESCRIZIONE: Il riepilogo risulta gia' elaborato
```

**Root Cause:** File con stesso DATA + PROGRESSIVO già ricevuto da SIAE.

### 7.3 Checklist Documentale e Normativa

| Elemento | Stato | Azione |
|----------|-------|--------|
| DTD v0039 disponibile | ✅ OK | - |
| Struttura Intrattenimento | ❌ NON OK | Correggere |
| TipoTassazione posizione | ❌ NON OK | Spostare |
| IncidenzaIntrattenimento | ❌ NON OK | Rinominare in Incidenza |
| ImponibileIntrattenimenti | ❌ NON OK | Rimuovere da giornaliero |
| IVAEccedenteOmaggi | ❌ NON OK | Aggiungere |
| Progressivo univoco | ⚠️ DA VERIFICARE | Usare data nuova o Sostituzione="S" |
| Firma S/MIME | ✅ OK | - |

### 7.4 Documenti Mancanti/Critici

| Documento | Stato | Impatto |
|-----------|-------|---------|
| XSD ufficiale SIAE | MANCANTE | Validazione più precisa |
| Manuale Allegato C completo | PARZIALE | Riferimenti normativi |

### 7.5 Azioni Immediate (Top 5)

1. **CORREGGERE `<Intrattenimento>`** - Deve contenere `<TipoTassazione>` come elemento figlio
2. **RIMUOVERE elementi inesistenti** - `IncidenzaIntrattenimento`, `ImponibileIntrattenimenti`
3. **AGGIUNGERE `<IVAEccedenteOmaggi>`** - In ogni OrdineDiPosto
4. **TESTARE CON DATA NUOVA** - Usare data 20260125 per evitare 0604
5. **SE REINVIO STESSA DATA** - Usare `Sostituzione="S"` con progressivo incrementato

### 7.6 Prossimi Passi

1. Modificare `server/siae-utils.ts` per generare XML conforme DTD v0039
2. Creare file test con struttura corretta
3. Inviare a `servertest2@batest.siae.it` con data nuova (es. 20260125)
4. Attendere risposta SIAE
5. Se OK → Aggiornare tutta la generazione XML nel sistema

---

## ALLEGATO: Confronto Struttura

### DTD v0039 (UFFICIALE)

```dtd
<!ELEMENT Evento (Intrattenimento, Locale, DataEvento, OraEvento, MultiGenere+, OrdineDiPosto+)>
<!ELEMENT Intrattenimento (TipoTassazione, Incidenza?)>
```

### Nostro XML (ERRATO)

```
Evento
├── Intrattenimento (contiene testo "S") ❌
├── Locale
├── DataEvento
├── OraEvento  
├── TipoTassazione (fuori posizione) ❌
├── IncidenzaIntrattenimento (non esiste) ❌
├── ImponibileIntrattenimenti (solo mensile) ❌
├── MultiGenere
└── OrdineDiPosto (manca IVAEccedenteOmaggi) ❌
```

### XML Corretto (DA IMPLEMENTARE)

```
Evento
├── Intrattenimento
│   ├── TipoTassazione valore="I" ✅
│   └── Incidenza (opzionale) ✅
├── Locale
├── DataEvento
├── OraEvento
├── MultiGenere+
└── OrdineDiPosto+
    ├── CodiceOrdine
    ├── Capienza
    ├── TitoliAccesso*
    └── IVAEccedenteOmaggi ✅
```

---

**Fine Prospetto**
