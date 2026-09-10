# BExams: pubblicazione su Vercel

Il progetto è già pronto per Vercel. Il sito e tutti gli esami sono nella stessa cartella; Firebase gestisce gli account e la sincronizzazione dell'archivio.

Se Firebase non è ancora configurato, il sito funziona comunque: scegli **Continua senza account** oppure entra con un'email locale. In questo caso i progressi restano soltanto nel browser usato.

## Perché Firebase e non Neon

Neon è un database PostgreSQL, ma non include il sistema di accesso necessario a questo progetto. Per usarlo servirebbero anche API server, sessioni sicure e un servizio di autenticazione. Firebase offre nello stesso servizio account Google/email, database e regole di sicurezza ed è la soluzione più semplice per questa versione di BExams.

Il piano gratuito di Firestore include 1 GiB, 50.000 letture e 20.000 scritture al giorno: per salvare soltanto cronologia e preferenze degli studenti è più che sufficiente. Il sito usa Google ed email/password, evitando i link di accesso via email che nel piano gratuito hanno un limite giornaliero molto basso.

## 1. Pubblica la cartella su Vercel

La cartella da pubblicare deve contenere direttamente:

```text
index.html
vercel.json
api/
Bexams_Esami/
```

1. Carica questi file nel repository GitHub.
2. In Vercel scegli **Add New > Project** e importa il repository.
3. Se Vercel lo chiede, usa **Framework Preset: Other**.
4. Non inserire Build Command e lascia la cartella di output vuota.
5. Premi **Deploy**.

I PDF, ZIP e file Excel resteranno su Vercel insieme al sito. Quando uno studente preme **Scarica**, il collegamento sarà `https://tuo-sito.vercel.app/Bexams_Esami/...`, non un percorso `file:///C:/...`.

> Non provare i download aprendo `index.html` con un doppio clic. In quel caso il browser usa necessariamente percorsi `file:///`. Provali dall'indirizzo Vercel oppure tramite un server locale.

## 2. Crea il progetto Firebase gratuito

1. Apri <https://console.firebase.google.com> e crea un progetto, per esempio `bexams`.
2. Google Analytics non è necessario.
3. Nella pagina principale aggiungi un'app **Web** tramite l'icona `</>`.
4. Registra l'app senza attivare Firebase Hosting: il sito resta su Vercel.
5. Conserva i quattro valori `apiKey`, `authDomain`, `projectId` e `appId` mostrati in `firebaseConfig`.

## 3. Attiva l'accesso

In **Authentication > Sign-in method**:

1. Attiva **Google** e seleziona un'email di supporto.
2. Attiva **Email/Password**.
3. Non è necessario attivare **Email link**.

In **Authentication > Settings > Authorized domains** aggiungi soltanto il nome host del sito, senza `https://` e senza barre finali. Esempio:

```text
bexams.vercel.app
```

Se colleghi un dominio personale, aggiungi anche quello.

## 4. Crea Firestore

1. Apri **Firestore Database** e premi **Create database**.
2. Scegli **Production mode**.
3. Scegli una località europea; `europe-west8` corrisponde a Milano quando disponibile.
4. Apri **Rules**, sostituisci tutto con le regole seguenti e premi **Publish**:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null
                         && request.auth.uid == uid;
    }
  }
}
```

Ogni studente può così leggere e modificare soltanto il proprio documento.

## 5. Collega Firebase da Vercel

In Vercel apri **Project > Settings > Environment Variables** e crea queste quattro variabili:

| Nome in Vercel | Valore preso da Firebase |
|---|---|
| `FIREBASE_API_KEY` | `apiKey` |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `FIREBASE_PROJECT_ID` | `projectId` |
| `FIREBASE_APP_ID` | `appId` |

Applicale a **Production**, **Preview** e **Development**, poi apri **Deployments** e fai **Redeploy** dell'ultima versione.

Questi sono identificativi pubblici dell'app web, non password amministrative. La protezione dei dati è affidata all'autenticazione e alle regole Firestore. Non aggiungere mai chiavi private o credenziali di service account.

## 6. Prova finale

Apri il sito Vercel in una finestra anonima e verifica:

1. **Continua senza account** apre subito l'app.
2. **Accedi > Registrati** crea un account email/password.
3. **Continua con Google** apre la selezione dell'account.
4. Il download di un esame usa un indirizzo `https://`.
5. Dopo un download compare il segno rosso.
6. Dopo logout e nuovo accesso il segno rosso ricompare sul computer e sul telefono.

La raccolta `users` viene creata automaticamente al primo accesso. Non devi creare manualmente tabelle o documenti.

## Aggiungere nuovi esami

1. Inserisci il file nella cartella corretta dentro `Bexams_Esami`.
2. Aggiungi la relativa riga nell'oggetto `realFiles` di `index.html`.
3. Usa un percorso relativo, per esempio:

```js
url: "Bexams_Esami/Primo_Anno/Primo_Semestre_1/Mate1/Mat_1.1.pdf"
```

Non inserire mai percorsi che iniziano con `C:\\Users`, `file:///` o con il nome di una cartella presente soltanto sul tuo computer.
