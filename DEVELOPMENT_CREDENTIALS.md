# Credenziali di Sviluppo - Event4U

Questo documento contiene le credenziali degli account di test per lo sviluppo.

⚠️ **ATTENZIONE**: Queste credenziali sono solo per sviluppo locale. **NON usare in produzione!**

## Come creare gli account di test

Esegui lo script di seed:

```bash
npx tsx server/seed.ts
```

## Credenziali Account di Test

### 🔑 Super Admin
- **Email**: `
`
- **Password**: `admin123`
- **Accesso**: Completo a tutto il sistema
- **Company**: Nessuna (gestisce tutte le company)

---

### 🏢 Gestore (Event4U Demo)
- **Email**: `gestore@demo.com`
- **Password**: `gestore123`
- **Accesso**: Gestione completa della company "Event4U Demo"
- **Company**: Event4U Demo
- **Funzioni**: 
  - Gestione utenti della company
  - Gestione eventi, prodotti, listini
  - Accesso a tutte le funzionalità admin
  - Può impersonare utenti warehouse e bartender

---

### 📦 Magazziniere (Event4U Demo)
- **Email**: `magazzino@demo.com`
- **Password**: `magazzino123`
- **Accesso**: Gestione inventario e movimenti
- **Company**: Event4U Demo
- **Funzioni**:
  - Gestione prodotti e giacenze
  - Movimenti di magazzino
  - Ordini ai fornitori
  - Analisi AI inventario

---

### 🍺 Barista (Event4U Demo)
- **Email**: `barista@demo.com`
- **Password**: `barista123`
- **Accesso**: Gestione consumi alle stazioni
- **Company**: Event4U Demo
- **Funzioni**:
  - Visualizza eventi assegnati
  - Registra consumi alle stazioni
  - Visualizza inventario disponibile

---

## Note Importanti

1. **Email verificate**: Tutti gli account di test hanno l'email già verificata (`emailVerified: true`)
2. **Account attivi**: Tutti gli account sono attivi (`isActive: true`)
3. **Company Demo**: Gli account gestore, magazzino e barista appartengono alla stessa company "Event4U Demo"
4. **Password semplici**: Le password sono volutamente semplici per facilitare i test
5. **Idempotente**: Lo script può essere eseguito più volte - non crea duplicati

## Ricreare gli account

Se hai bisogno di ricreare gli account:

1. Elimina gli account esistenti dal database (opzionale)
2. Riesegui lo script di seed: `npx tsx server/seed.ts`

Lo script salterà automaticamente gli account già esistenti.

## Testing dei ruoli

Usa questi account per testare le diverse funzionalità in base ai ruoli:

- **Super Admin**: Test di gestione globale e multi-tenant
- **Gestore**: Test di gestione company, creazione eventi, impersonificazione
- **Magazziniere**: Test di gestione inventario, movimenti stock, ordini
- **Barista**: Test di registrazione consumi, visualizzazione eventi

## Sicurezza

⚠️ **IMPORTANTE**: 
- Queste credenziali NON devono mai essere usate in produzione
- Cambia sempre le password in produzione
- Non committare questo file se contiene credenziali reali
- Usa variabili d'ambiente per credenziali sensibili in produzione
