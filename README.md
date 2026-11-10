# IdroMonitor Emilia-Romagna

Web app mobile-first in TypeScript (strict, zero dipendenze UI) per il monitoraggio idraulico dell'Emilia-Romagna basata sui dati open dell'endpoint ufficiale **Allerta Meteo Emilia-Romagna (ARPAE)**.

## Caratteristiche Principali

- **Monitoraggio personalizzato**: visualizza solo i corsi d'acqua, i gruppi personalizzati e le stazioni singole scelte dall'utente.
- **5 Filtri rapidi esclusivi**: barra orizzontale scrollabile con icone circolari e contatore (`BLU` = tutte incluse `n.d.`, `VERDE` = livello 0, `GIALLO` = livello 1, `ARANCIONE` = livello 2, `ROSSO` = livello 3). Un secondo clic sul filtro attivo riporta al filtro `BLU`. I gruppi rimasti vuoti vengono nascosti automaticamente.
- **Vista Estesa e Vista Compatta per gruppo**: commutabili tramite il chevron nel titolo di ciascun gruppo e salvate in `localStorage`.
  - *Vista Estesa (default)*: nome, livello in metri, soglie 1/2/3, trend orario (`cm/h`), previsioni lineari a `+1h` e `+2h` (etichettate `"stima"`), badge di stato e icone secondarie.
  - *Vista Compatta*: card bassa con il solo nome a sinistra e il pallino colorato di stato a destra (valori, trend e previsioni nascosti).
- **Catalogo ARPAE e Corsi d'Acqua**: raggruppamento automatico in 32 corsi d'acqua tramite fasce d'ordinamento configurabili (`src/corsi-acqua/fasce.config.json`), ordinate rigorosamente da monte a valle (`ordinamento` crescente). Ricerca stazioni case-insensitive.
- **Soglie Personalizzate**: override locale delle soglie `1 / 2 / 3` per ciascuna stazione modificabile direttamente dalla scheda ARPAE, applicato al calcolo dello stato in tutta l'applicazione con possibilità di ripristino alle soglie ufficiali.
- **Gruppi Personalizzati e Cascade Delete**: CRUD completo con validazione di nome obbligatorio e univoco, composizione stazioni con ricerca e avviso di eliminazione che informa sul numero di stazioni coinvolte prima di applicare il **Cascade Delete** (rimozione anche dalle stazioni aggiunte singolarmente, salvo appartenenza a un altro gruppo ancora monitorato).
- **Notifiche Browser**: integrazione con la `Notification API` per avvisare quando una stazione monitorata sale di livello (controllo ogni 5 minuti ad app aperta, una sola notifica per ogni cambio di livello).
- **Accessibilità e Tema Chiaro/Scuro**: supporto automatico a `prefers-color-scheme` e abbinamento sistematico di etichette testuali ad ogni stato cromatico.

---

## Architettura e Struttura del Progetto

Il progetto adotta un'architettura modulare ("microservizi" plug-and-play lato client): ogni modulo in `src/` espone esclusivamente `index.ts` come API pubblica, dipende solo dai contratti condivisi in `src/contratti` (e da interfacce iniettate) e include la propria suite di test Vitest in `__tests__` e il proprio `README.md`. Unico punto di collegamento è la composition root in `src/app`.

```text
├── ASSUNZIONI.md                  # Registro delle decisioni architetturali e di dominio
├── PIANO.md                       # Piano di lavoro per fasi
├── README.md                      # Documentazione generale del progetto
├── index.html                     # Entrypoint HTML statico
├── package.json                   # Script npm e dipendenze di sviluppo
├── tsconfig.json                  # Configurazione TypeScript (strict: true, noImplicitAny)
├── vite.config.ts                 # Configurazione Vite e Vitest (jsdom)
├── server/
│   └── proxy.mjs                  # Server HTTP statico (/dist) + proxy CORS (/api/sensori) zero-dipendenze
└── src/
    ├── main.ts                    # Bootstrap applicazione
    ├── contratti/                 # Tipi e interfacce TypeScript condivisi
    ├── fonte-dati/                # Client API ARPAE, retry su value null, cache storica -1h e fixture reale
    ├── corsi-acqua/               # Fasce di ordinamento (fasce.config.json), slug river:* e ordinamento crescente
    ├── soglie/                    # Calcolo livelli 0/1/2/3/nd, soglie negative, soglia=0 e override utente
    ├── trend/                     # Calcolo variazione cm/h e previsioni +1h/+2h ("stima" / "—")
    ├── stato-utente/              # Persistenza localStorage e logica di Cascade Delete
    ├── notifiche/                 # Gestione Notification API su innalzamento di livello
    ├── pagina-monitoraggio/       # Modulo UI pagina principale (#/monitoraggio)
    ├── pagina-arpae/              # Modulo UI catalogo ARPAE e soglie personalizzate (#/arpae)
    ├── pagina-gruppi/             # Modulo UI gestione gruppi personalizzati (#/gruppi)
    └── app/                       # Shell mobile-first, router hash e composition root
```

---

## Requisiti e Comandi

- **Node.js**: `>= 20.0.0`

### Installazione
```bash
npm install
```

### Sviluppo locale (Vite Dev Server)
```bash
npm run dev
```

### Esecuzione di tutti i test (Vitest + jsdom)
```bash
npm test
```

### Esecuzione dei test di un singolo modulo
```bash
npm run test:modulo -- fonte-dati
npm run test:modulo -- corsi-acqua
npm run test:modulo -- soglie
npm run test:modulo -- trend
npm run test:modulo -- stato-utente
npm run test:modulo -- notifiche
npm run test:modulo -- pagina-monitoraggio
npm run test:modulo -- pagina-arpae
npm run test:modulo -- pagina-gruppi
npm run test:modulo -- app
```

### Build di produzione
Esegue il type-check completo (`tsc --noEmit`) e genera il bundle statico nella cartella `/dist` (con `/dist/index.html` apribile direttamente o servibile via HTTP):
```bash
npm run build
```

### Anteprima o avvio con Proxy CORS integrato
```bash
# Anteprima Vite
npm run preview

# Server Node.js zero-dipendenze che serve /dist e inoltra /api/sensori all'API ARPAE
npm start
```
Variabili d'ambiente opzionali per `npm start` (`server/proxy.mjs`):
- `PORT`: porta HTTP (default `3000`)
- `ARPAE_API_URL`: URL base dell'endpoint sensori (default: endpoint ufficiale Regione Emilia-Romagna).

