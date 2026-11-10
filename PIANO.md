# Piano di Sviluppo - Monitoraggio Idraulico Emilia-Romagna

Questo documento traccia l'avanzamento per fasi del progetto. Ogni fase prevede l'implementazione del codice, dei test unitari/integrazione con Vitest, della documentazione `README.md` di modulo e la verifica di test + build.

## Elenco delle Fasi

- [x] **Fase 1**: Scaffolding del progetto, `contratti`, `fonte-dati` (con verifica endpoint reale, eventuale proxy CORS e fixture reale), `corsi-acqua`, `soglie`, `trend` (codice, test, README).
- [x] **Fase 2**: Modulo `stato-utente` con persistenza `localStorage` e logica di cascade delete (codice, test obbligatori a/b/c, README).
- [x] **Fase 3**: Moduli UI e applicazione: `pagina-arpae`, `pagina-gruppi`, `pagina-monitoraggio`, `app` (shell, router hash, composition root, tema chiaro/scuro, accessibilità, test jsdom, README).
- [x] **Fase 4**: Modulo `notifiche` (Notification API su innalzamento livello) e integrazione soglie personalizzate end-to-end; `README.md` nella radice con architettura, struttura del progetto e comandi.
- [x] **Fase 5**: Verifica finale completa (`npm test`, test singoli per modulo, `npm run build`, verifica `/dist/index.html` e `ASSUNZIONI.md`).
