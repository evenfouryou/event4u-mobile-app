# Relazione Tecnica 1: Sistema di Autenticazione e Autorizzazione

## Event4U Management System

**Versione**: 1.0  
**Data**: 04 Gennaio 2026  
**Classificazione**: Documentazione Tecnica Interna

---

## 1. Panoramica del Sistema

Il sistema Event4U implementa un'architettura di autenticazione ibrida che supporta:

1. **Replit OAuth (OIDC)** - Autenticazione SSO via OpenID Connect
2. **Email/Password** - Autenticazione classica con verifica email
3. **OTP Telefono (PR Module)** - Autenticazione per promoter via SMS

Il controllo degli accessi è basato su **Role-Based Access Control (RBAC)** con segregazione dei dati per azienda (multi-tenancy).

---

## 2. Modello dei Ruoli

### 2.1 Gerarchia dei Ruoli

| Ruolo | Descrizione | Livello |
|-------|-------------|---------|
| `super_admin` | Amministratore globale della piattaforma | Sistema |
| `gestore` | Titolare/Manager di una o più aziende | Azienda |
| `gestore_covisione` | Co-gestore con permessi delegati | Azienda |
| `capo_staff` | Responsabile staff evento | Evento |
| `pr` | Promoter (gestione liste/tavoli) | Evento |
| `warehouse` | Magazziniere | Azienda |
| `bartender` | Barista/Operatore stazione | Evento |
| `cassiere` | Operatore cassa | Evento |
| `scanner` | Operatore controllo accessi | Evento |
| `cliente` | Cliente finale (acquisto biglietti) | Pubblico |

### 2.2 Schema Database Utenti

```sql
-- Tabella users (shared/schema.ts linea 48-70)
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  role VARCHAR NOT NULL DEFAULT 'gestore',
  company_id VARCHAR REFERENCES companies(id),
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR,
  reset_token VARCHAR,
  reset_token_expires TIMESTAMP,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

### 2.3 Associazione Utente-Azienda (Multi-Tenancy)

```sql
-- Tabella user_companies (shared/schema.ts linea 189-196)
CREATE TABLE user_companies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  company_id VARCHAR NOT NULL REFERENCES companies(id),
  role VARCHAR(50) DEFAULT 'owner', -- owner, manager, viewer
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

---

## 3. Flussi di Autenticazione

### 3.1 Replit OAuth (OIDC)

**File**: `server/replitAuth.ts`

```
[Client] ──GET /api/login──> [Server] ──Redirect──> [Replit OIDC]
                                                          │
[Client] <──/api/callback─── [Server] <──Token────────────┘
                │
                └─> Creazione/Aggiornamento utente
                └─> Sessione con access_token + refresh_token
```

**Configurazione OIDC:**
- **Issuer URL**: `https://replit.com/oidc`
- **Scope**: `openid email profile offline_access`
- **Token Refresh**: Automatico alla scadenza

**Codice chiave (server/replitAuth.ts linee 67-133):**
```typescript
export async function setupAuth(app: Express) {
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Strategia OIDC dinamica per dominio
  const ensureStrategy = (domain: string) => {
    const strategy = new Strategy({
      config,
      scope: "openid email profile offline_access",
      callbackURL: `https://${domain}/api/callback`,
    }, verify);
    passport.use(strategy);
  };
}
```

### 3.2 Email/Password

**File**: `server/routes.ts` (linee 367-526, 928-1033)

```
[Registrazione]
    │
    ├─> Validazione Zod schema
    ├─> Normalizzazione email (lowercase + trim)
    ├─> Hash password (bcrypt, 10 rounds)
    ├─> Generazione token verifica (crypto.randomBytes)
    ├─> Creazione utente + azienda (se gestore)
    └─> Invio email verifica

[Login]
    │
    ├─> Ricerca utente per email
    ├─> Verifica password (bcrypt.compare)
    ├─> Check verifica email (opzionale per alcuni ruoli)
    └─> Creazione sessione Passport
```

**Ruoli che NON richiedono verifica email:**
- `super_admin`
- `scanner`
- `bartender`
- `cassiere`
- `warehouse`
- `pr`
- `capo_staff`

### 3.3 OTP Telefono (Modulo PR)

**File**: `server/pr-routes.ts` (linee 593-727)

```
[PR Registration/Login]
    │
    ├─> Invio OTP via MSG91
    ├─> Rate limiting (3 tentativi/10 min)
    ├─> Verifica OTP
    └─> Creazione sessione PR
```

---

## 4. Gestione Sessioni

### 4.1 Configurazione Session Store

**File**: `server/replitAuth.ts` (linee 22-43)

```typescript
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 settimana
  const pgStore = connectPg(session);
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: "sessions",
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}
```

### 4.2 Impersonazione (Super Admin)

Il sistema supporta l'impersonazione degli utenti da parte del super_admin:

```typescript
// server/routes.ts
if (req.session.impersonatorId) {
  return res.json({ 
    ...sanitizeUser(user), 
    isImpersonated: true,
    impersonatorId: req.session.impersonatorId 
  });
}
```

---

## 5. Middleware di Autorizzazione

### 5.1 isAuthenticated

Verifica che l'utente sia autenticato con sessione valida:

```typescript
// server/routes.ts (linea 1036-1042)
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
```

### 5.2 isSuperAdmin

Verifica ruolo super_admin (accesso globale):

```typescript
// server/routes.ts (linea 1172-1182)
const isSuperAdmin = async (req: any): Promise<boolean> => {
  const userId = getCurrentUserId(req);
  const user = await storage.getUser(userId);
  return user?.role === 'super_admin';
};
```

### 5.3 isAdminOrSuperAdmin

Verifica ruoli amministrativi (gestore o super_admin):

```typescript
// server/routes.ts (linea 1044-1060)
const isAdminOrSuperAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(req.user.claims.sub);
  if (!['super_admin', 'gestore'].includes(user?.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};
```

---

## 6. Controllo Accesso Dati (Data-Level RBAC)

### 6.1 Segregazione per Azienda

Ogni richiesta API filtra i dati in base all'azienda dell'utente:

```typescript
// server/routes.ts
const companyId = await getUserCompanyId(req);
const events = await storage.getEventsByCompany(companyId);
```

### 6.2 Funzioni Helper

```typescript
// Ottiene ID utente corrente (gestisce impersonazione)
function getCurrentUserId(req: any): string {
  return req.session.impersonatorId 
    ? req.session.userId 
    : req.user.claims.sub;
}

// Ottiene ID azienda corrente
async function getUserCompanyId(req: any): Promise<string | null> {
  const userId = getCurrentUserId(req);
  const user = await storage.getUser(userId);
  return user?.companyId || null;
}
```

---

## 7. Matrice dei Permessi

### 7.1 API Endpoints Principali

| Endpoint | super_admin | gestore | warehouse | bartender | scanner |
|----------|:-----------:|:-------:|:---------:|:---------:|:-------:|
| GET /api/companies | Tutte | Proprie | - | - | - |
| POST /api/companies | Si | - | - | - | - |
| GET /api/events | Tutte | Proprie | Proprie | Assegnate | Assegnate |
| POST /api/events | Si | Si | - | - | - |
| GET /api/tickets | Tutte | Proprie | - | - | Assegnate |
| POST /api/tickets | Si | Si | - | - | - |
| GET /api/stocks | Tutte | Proprie | Proprie | Stazione | - |
| POST /api/stock-movements | Si | Si | Si | Si | - |

### 7.2 Feature Flags per Ruolo

Il sistema supporta feature flags a livello utente e azienda:

```sql
-- Tabella user_features
CREATE TABLE user_features (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  feature_code VARCHAR NOT NULL,
  enabled BOOLEAN DEFAULT TRUE
);

-- Tabella company_features  
CREATE TABLE company_features (
  id VARCHAR PRIMARY KEY,
  company_id VARCHAR REFERENCES companies(id),
  feature_code VARCHAR NOT NULL,
  enabled BOOLEAN DEFAULT TRUE
);
```

**Feature codes disponibili:**
- `siae_ticketing` - Modulo SIAE (per gestore)
- `advanced_analytics` - Analytics avanzate
- `multi_location` - Gestione multi-sede
- `staff_management` - Gestione staff avanzata

---

## 8. Sicurezza

### 8.1 Protezioni Implementate

| Misura | Implementazione |
|--------|-----------------|
| Password Hashing | BCrypt con 10 rounds |
| Session Cookies | HttpOnly, Secure (prod), SameSite=Lax |
| Token Verifica | crypto.randomBytes(32) |
| Token Reset Password | crypto.randomBytes(32) con scadenza |
| Rate Limiting | 3 tentativi OTP / 10 minuti |
| Input Validation | Zod schemas su tutti gli endpoint |

### 8.2 Protezione CSRF

Le sessioni usano `sameSite: 'lax'` per mitigare attacchi CSRF. Le richieste mutative (POST, PUT, DELETE) sono protette dalla verifica della sessione.

### 8.3 Sanitizzazione Output

```typescript
function sanitizeUser(user: any) {
  const { passwordHash, verificationToken, resetToken, ...safe } = user;
  return safe;
}
```

---

## 9. Diagramma di Flusso Autenticazione

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    CLIENT                           │
                    └─────────────────────────────────────────────────────┘
                                          │
                      ┌───────────────────┼───────────────────┐
                      ▼                   ▼                   ▼
              ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
              │  Replit OIDC  │   │ Email/Password│   │   OTP Phone   │
              │  (SSO OAuth)  │   │  (Classic)    │   │  (PR Module)  │
              └───────────────┘   └───────────────┘   └───────────────┘
                      │                   │                   │
                      └───────────────────┼───────────────────┘
                                          ▼
                    ┌─────────────────────────────────────────────────────┐
                    │              PASSPORT.JS SESSION                    │
                    │        (PostgreSQL session store)                   │
                    └─────────────────────────────────────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────────────┐
                    │               MIDDLEWARE STACK                      │
                    │  isAuthenticated → isSuperAdmin/isAdminOrSuperAdmin │
                    └─────────────────────────────────────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────────────┐
                    │            DATA-LEVEL RBAC FILTER                   │
                    │        (Company-scoped data access)                 │
                    └─────────────────────────────────────────────────────┘
```

---

## 10. Variabili d'Ambiente Richieste

| Variabile | Descrizione | Obbligatoria |
|-----------|-------------|:------------:|
| `SESSION_SECRET` | Chiave crittografia sessioni | Si |
| `DATABASE_URL` | Connessione PostgreSQL | Si |
| `ISSUER_URL` | URL OIDC Replit (default: replit.com/oidc) | No |
| `REPL_ID` | ID Replit per OAuth | Si (OIDC) |
| `MSG91_AUTH_KEY` | Chiave API MSG91 per OTP | No |
| `MSG91_TEMPLATE_ID` | Template SMS MSG91 | No |

---

## 11. Conclusioni

Il sistema di autenticazione Event4U offre:

- **Flessibilità**: Supporto per OAuth, email/password e OTP
- **Sicurezza**: Best practices per hashing, sessioni e validazione
- **Multi-Tenancy**: Segregazione dati completa per azienda
- **Scalabilità**: Session store PostgreSQL per alta disponibilità
- **Estensibilità**: Feature flags per controllo granulare

---

*Documento generato automaticamente - Event4U v2.0*
