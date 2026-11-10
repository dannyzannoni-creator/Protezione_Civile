import type {
  CalcoloTrend,
  CorsoAcqua,
  IstanzaPagina,
  MappaStazioniGruppi,
  RottaApp,
  ServizioCorsiAcqua,
  ServizioFonteDati,
  ServizioNotifiche,
  ServizioSoglie,
  ServizioStatoUtente,
  ServizioTrend,
  Stazione,
} from '../contratti';
import { creaServizioFonteDati } from '../fonte-dati';
import { creaServizioCorsiAcqua } from '../corsi-acqua';
import { creaServizioSoglie } from '../soglie';
import { creaServizioTrend } from '../trend';
import { creaServizioStatoUtente, type ServizioStatoUtenteEsteso } from '../stato-utente';
import { creaServizioNotifiche } from '../notifiche';
import { mount as mountMonitoraggio } from '../pagina-monitoraggio';
import { mount as mountArpae } from '../pagina-arpae';
import { mount as mountGruppi } from '../pagina-gruppi';

export const INTERVALLO_AGGIORNAMENTO_MS = 60 * 1000; // 1 minuto (60 secondi)

export interface DipendenzeApp {
  fonteDati?: ServizioFonteDati;
  corsiAcqua?: ServizioCorsiAcqua;
  soglie?: ServizioSoglie;
  trend?: ServizioTrend;
  statoUtente?: ServizioStatoUtenteEsteso | ServizioStatoUtente;
  notifiche?: ServizioNotifiche;
  intervalloAutoRefreshMs?: number | null;
}

/**
 * Risolve una stringa hash del browser in una delle 3 rotte canoniche dell'applicazione.
 */
export function risolviRottaHash(hash: string): RottaApp {
  const pulito = hash.trim().toLowerCase();
  if (pulito === '#/arpae' || pulito.startsWith('#/arpae?')) {
    return '#/arpae';
  }
  if (pulito === '#/gruppi' || pulito.startsWith('#/gruppi?')) {
    return '#/gruppi';
  }
  return '#/monitoraggio';
}

/**
 * Composition root, shell mobile-first e router hash dell'applicazione.
 */
export function mount(
  container: HTMLElement,
  deps: DipendenzeApp = {}
): IstanzaPagina {
  const fonteDati = deps.fonteDati ?? creaServizioFonteDati();
  const corsiAcqua = deps.corsiAcqua ?? creaServizioCorsiAcqua();
  const soglie = deps.soglie ?? creaServizioSoglie();
  const trend = deps.trend ?? creaServizioTrend();
  const statoUtente = deps.statoUtente ?? creaServizioStatoUtente();
  const notifiche = deps.notifiche ?? creaServizioNotifiche();
  const intervalloMs =
    deps.intervalloAutoRefreshMs !== undefined
      ? deps.intervalloAutoRefreshMs
      : INTERVALLO_AGGIORNAMENTO_MS;

  let caricamento = false;
  let errore: string | null = null;
  let timeRilevazione: number | null = null;
  let ultimoControlloMs: number | null = null;
  let stazioni: Stazione[] = [];
  let corsi: CorsoAcqua[] = [];
  let mappaTrend: Record<string, CalcoloTrend> = {};

  let rottaCorrente: RottaApp = risolviRottaHash(window.location.hash);
  let paginaMontata: IstanzaPagina | null = null;

  container.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="app-header-inner">
          <div>
            <h1 class="app-titolo">IdroMonitor Emilia-Romagna</h1>
            <p class="app-sottotitolo">Livelli idrometrici, soglie di allerta e previsioni ARPAE</p>
          </div>
        </div>
      </header>

      <main class="app-main" id="app-contenuto-pagina" aria-live="polite"></main>

      <nav class="bottom-nav" aria-label="Navigazione principale">
        <a href="#/monitoraggio" class="bottom-nav-link" data-nav-rotta="#/monitoraggio">
          <span class="bottom-nav-icon" aria-hidden="true">🌊</span>
          <span>Monitoraggio</span>
        </a>
        <a href="#/arpae" class="bottom-nav-link" data-nav-rotta="#/arpae">
          <span class="bottom-nav-icon" aria-hidden="true">📡</span>
          <span>ARPAE</span>
        </a>
        <a href="#/gruppi" class="bottom-nav-link" data-nav-rotta="#/gruppi">
          <span class="bottom-nav-icon" aria-hidden="true">🗂️</span>
          <span>Gruppi</span>
        </a>
      </nav>
    </div>
  `;

  const mainEl = container.querySelector<HTMLElement>('#app-contenuto-pagina')!;

  function aggiornaStatoLinkNav(): void {
    const links = container.querySelectorAll<HTMLAnchorElement>('[data-nav-rotta]');
    links.forEach((link) => {
      const isAttivo = link.dataset.navRotta === rottaCorrente;
      link.classList.toggle('nav-attivo', isAttivo);
      if (isAttivo) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function costruisciMappaCorsi(): MappaStazioniGruppi {
    const mappa: MappaStazioniGruppi = {};
    for (const c of corsi) {
      mappa[c.id] = c.stazioni.map((s) => s.idstazione);
    }
    return mappa;
  }

  function verificaNotificheSulleStazioniMonitorate(): void {
    if (stazioni.length === 0) return;
    const mappaCorsi = costruisciMappaCorsi();
    const idsMonitorate = statoUtente.ottieniStazioniMonitorate(mappaCorsi);
    const listaMonitorate = stazioni.filter((s) => idsMonitorate.has(s.idstazione));

    notifiche.controllaEInviaNotifiche(
      listaMonitorate,
      (s) => {
        const override = statoUtente.ottieniSogliaPersonalizzata(s.idstazione);
        return soglie.valutaStazione(s, override);
      },
      (idstazione) => statoUtente.ottieniAvvisoLivello?.(idstazione) ?? null
    );
  }

  async function caricaDatiSensori(forzaRete: boolean = true): Promise<void> {
    caricamento = true;
    errore = null;
    paginaMontata?.aggiorna();

    try {
      const { corrente, precedente, precedenteUnOra } = await fonteDati.scaricaConStorico(
        undefined,
        forzaRete
      );
      stazioni = corrente.stazioni;
      timeRilevazione = corrente.time;
      ultimoControlloMs = Date.now();
      corsi = corsiAcqua.raggruppaPerCorsoAcqua(stazioni);
      mappaTrend = trend.calcolaMappaTrend(corrente, precedente, precedenteUnOra ?? null);

      statoUtente.impostaMappaGruppiEsterni?.(costruisciMappaCorsi());

      verificaNotificheSulleStazioniMonitorate();
    } catch (err) {
      errore =
        err instanceof Error
          ? err.message
          : 'Impossibile caricare i dati dall’endpoint ARPAE.';
    } finally {
      caricamento = false;
      paginaMontata?.aggiorna();
    }
  }

  function montaPaginaPerRotta(rotta: RottaApp): void {
    paginaMontata?.smonta();
    paginaMontata = null;
    rottaCorrente = rotta;
    aggiornaStatoLinkNav();

    if (rotta === '#/arpae') {
      paginaMontata = mountArpae(mainEl, {
        ottieniStazioni: () => stazioni,
        ottieniCorsiAcqua: () => corsi,
        ottieniMappaTrend: () => mappaTrend,
        corsiAcqua,
        soglie,
        statoUtente,
      });
    } else if (rotta === '#/gruppi') {
      paginaMontata = mountGruppi(mainEl, {
        ottieniStazioni: () => stazioni,
        ottieniCorsiAcqua: () => corsi,
        statoUtente,
      });
    } else {
      paginaMontata = mountMonitoraggio(mainEl, {
        ottieniStatoDati: () => ({
          caricamento,
          errore,
          timeRilevazione,
          ultimoControlloMs,
          stazioni,
          corsiAcqua: corsi,
          mappaTrend,
        }),
        richiediAggiornamento: () => caricaDatiSensori(true),
        navigaA: (nuovaRotta) => {
          window.location.hash = nuovaRotta;
          montaPaginaPerRotta(nuovaRotta);
        },
        corsiAcqua,
        soglie,
        trend,
        statoUtente,
        notifiche,
      });
    }
  }

  function gestisciHashChange(): void {
    const nuovaRotta = risolviRottaHash(window.location.hash);
    if (nuovaRotta !== rottaCorrente) {
      montaPaginaPerRotta(nuovaRotta);
    }
  }

  const disiscriviStato = statoUtente.iscrivi(() => {
    verificaNotificheSulleStazioniMonitorate();
    paginaMontata?.aggiorna();
  });

  window.addEventListener('hashchange', gestisciHashChange);

  if (!window.location.hash) {
    try {
      window.history.replaceState(null, '', '#/monitoraggio');
    } catch {
      window.location.hash = '#/monitoraggio';
    }
  }

  montaPaginaPerRotta(risolviRottaHash(window.location.hash));
  void caricaDatiSensori(true);

  const timerAutoRefresh =
    intervalloMs && intervalloMs > 0
      ? window.setInterval(() => {
          void caricaDatiSensori(true);
        }, intervalloMs)
      : null;

  return {
    aggiorna: () => {
      paginaMontata?.aggiorna();
    },
    smonta: () => {
      if (timerAutoRefresh !== null) {
        window.clearInterval(timerAutoRefresh);
      }
      window.removeEventListener('hashchange', gestisciHashChange);
      disiscriviStato();
      paginaMontata?.smonta();
      container.innerHTML = '';
    },
  };
}
