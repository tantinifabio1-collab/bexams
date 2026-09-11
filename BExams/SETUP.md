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
package.json
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
5. Conserva i valori `apiKey`, `authDomain`, `projectId`, `appId` e `measurementId` mostrati in `firebaseConfig`.

## 3. Attiva l'accesso

In **Authentication > Sign-in method**:

1. Attiva **Google** e seleziona un'email di supporto.
2. Attiva **Email/Password**.
3. Non è necessario attivare **Email link**.

Nel sito non c'è una registrazione separata: l'utente scrive email e password e preme **Continua con email**. Se l'account esiste viene effettuato l'accesso; se è la prima volta, l'account viene creato automaticamente. Il collegamento **Password dimenticata?** invia l'email di recupero tramite Firebase.

In **Authentication > Settings > Authorized domains** aggiungi soltanto il nome host del sito, senza `https://` e senza barre finali. Esempio:

```text
bexams.vercel.app
```

Se colleghi un dominio personale, aggiungi anche quello.

Per il progetto attuale aggiungi almeno:

```text
bexams.vercel.app
www.bexams.app
bexams.app
```

Se provi un deployment di anteprima, aggiungi anche il suo host, per esempio:

```text
bexams-npdzds26y-be-xams.vercel.app
```

Se la finestra Google si apre e poi si chiude, controlla nell'ordine:

1. **Authentication > Metodo di accesso > Google**: deve risultare abilitato e deve esserci un'email di assistenza.
2. **Authentication > Impostazioni > Domini autorizzati**: aggiungi l'host esatto che vedi nella barra del browser, senza `https://`, `/` o percorsi.
3. In Vercel verifica che tutte le variabili Firebase siano applicate a **Production** e **Preview**, quindi esegui un nuovo **Redeploy**.
4. Consenti i popup per il sito e riprova in una finestra anonima. Il codice usa il popup Firebase, compatibile anche con il sito ospitato su Vercel.

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

In Vercel apri **Project > Settings > Environment Variables** e crea queste cinque variabili:

| Nome in Vercel | Valore preso da Firebase |
|---|---|
| `FIREBASE_API_KEY` | `apiKey` |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `FIREBASE_PROJECT_ID` | `projectId` |
| `FIREBASE_APP_ID` | `appId` |
| `FIREBASE_MEASUREMENT_ID` | `measurementId` |

Applicale a **Production**, **Preview** e **Development**, poi apri **Deployments** e fai **Redeploy** dell'ultima versione.

Questi sono identificativi pubblici dell'app web, non password amministrative. La protezione dei dati è affidata all'autenticazione e alle regole Firestore. Non aggiungere mai chiavi private o credenziali di service account.

## 6. Attiva il tasto Contribuisci

I contributi vengono salvati in un archivio **Vercel Blob privato**: non diventano pubblici automaticamente e puoi controllarli prima di aggiungerli al sito. Non viene usato Firebase Storage, perché per i nuovi progetti richiede il piano Blaze.

1. In Vercel apri il progetto BExams.
2. Apri **Storage** (oppure **Database**) e premi **Create Database**.
3. Scegli **Blob** e crea uno store **Private**.
4. Collegalo al progetto BExams e seleziona Production, Preview e Development.
5. Fai un nuovo **Redeploy**.

Vercel aggiunge automaticamente la variabile necessaria allo store. Nel piano Hobby Blob comprende una quota gratuita; i file inviati dal sito sono limitati a 4 MB. Per vedere i contributi apri lo store Blob in Vercel e cerca la cartella `contributi/`: ogni invio contiene il file, se presente, e un `dati.json` con corso, anno, materia, note e autore.

Soltanto chi ha effettuato un vero accesso Firebase con Google oppure email/password può inviare. Gli ospiti e gli accessi locali non possono caricare file.

## 7. Prova finale

Apri il sito Vercel in una finestra anonima e verifica:

1. **Continua senza account** apre subito l'app.
2. **Continua con email** crea automaticamente un nuovo account oppure accede a uno esistente.
3. **Continua con Google** apre la selezione dell'account.
4. Il download di un esame usa un indirizzo `https://`.
5. Dopo un download compare il segno rosso.
6. Dopo logout e nuovo accesso il segno rosso ricompare sul computer e sul telefono.
7. **Contribuisci** accetta un file o un testo e crea una nuova cartella privata nello store Blob.

La raccolta `users` viene creata automaticamente al primo accesso. Non devi creare manualmente tabelle o documenti.

## Aggiungere nuovi esami

1. Inserisci il file nella cartella corretta dentro `Bexams_Esami`.
2. Aggiungi la relativa riga nell'oggetto `realFiles` di `index.html`.
3. Usa un percorso relativo, per esempio:

```js
url: "Bexams_Esami/Primo_Anno/Primo_Semestre_1/Mate1/Mat_1.1.pdf"
```

Non inserire mai percorsi che iniziano con `C:\\Users`, `file:///` o con il nome di una cartella presente soltanto sul tuo computer.
