import type {
  CalcoloTrend,
  CorsoAcqua,
  FiltroMonitoraggio,
  IstanzaPagina,
  LivelloSoglia,
  MappaStazioniGruppi,
  ServizioCorsiAcqua,
  ServizioNotifiche,
  ServizioSoglie,
  ServizioStatoUtente,
  ServizioTrend,
  Stazione,
  ValutazioneSoglia,
  VistaGruppo,
} from '../contratti';
import { costruisciUrlGraficoStazione } from '../fonte-dati';

export interface StatoDatiMonitoraggio {
  caricamento: boolean;
  errore: string | null;
  timeRilevazione: number | null;
  ultimoControlloMs?: number | null;
  stazioni: readonly Stazione[];
  corsiAcqua?: readonly CorsoAcqua[];
  mappaTrend: Readonly<Record<string, CalcoloTrend>>;
}

export interface DipendenzePaginaMonitoraggio {
  ottieniStatoDati(): StatoDatiMonitoraggio;
  richiediAggiornamento(): Promise<void> | void;
  navigaA?(rotta: '#/arpae' | '#/gruppi'): void;
  corsiAcqua: ServizioCorsiAcqua;
  soglie: ServizioSoglie;
  trend: ServizioTrend;
  statoUtente: ServizioStatoUtente;
  notifiche?: ServizioNotifiche;
}

function escapeHtml(testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formattaOraAggiornamento(timeMs: number | null): string {
  if (timeMs === null || !Number.isFinite(timeMs)) {
    return '--:--';
  }
  const data = new Date(timeMs);
  const ore = String(data.getHours()).padStart(2, '0');
  const minuti = String(data.getMinutes()).padStart(2, '0');
  return `${ore}:${minuti}`;
}

function formattaValore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return 'n.d.';
  }
  return `${value.toFixed(2)} m`;
}

export function corrispondeAlFiltro(
  livello: LivelloSoglia,
  filtro: FiltroMonitoraggio
): boolean {
  switch (filtro) {
    case 'blu':
      return true; // Tutte le stazioni monitorate, incluse le 'nd'
    case 'verde':
      return livello === 0;
    case 'giallo':
      return livello === 1;
    case 'arancione':
      return livello === 2;
    case 'rosso':
      return livello === 3;
  }
}

/**
 * Monta la pagina principale MONITORAGGIO con filtri rapidi a 5 icone circolari,
 * gruppi monitorati con toggle vista estesa/compatta, stazioni singole,
 * pulsante aggiorna, notifiche e gestione stati vuoto/caricamento/errore.
 */
export function mount(
  container: HTMLElement,
  deps: DipendenzePaginaMonitoraggio
): IstanzaPagina {
  let filtroAttivo: FiltroMonitoraggio = 'blu';
  let stazioneInModificaAvviso: string | null = null;

  function valutaConOverride(stazione: Stazione): ValutazioneSoglia {
    const override = deps.statoUtente.ottieniSogliaPersonalizzata(stazione.idstazione);
    return deps.soglie.valutaStazione(stazione, override);
  }

  function renderCardStazione(
    stazione: Stazione,
    valutazione: ValutazioneSoglia,
    infoTrend: CalcoloTrend,
    vista: VistaGruppo
  ): string {
    const urlGrafico = costruisciUrlGraficoStazione(stazione.idstazione);

    if (vista === 'compatta') {
      // VISTA COMPATTA: card bassa con il nome a sinistra, pulsante Grafico e pallino colorato di stato a destra;
      // nascondi valori, trend e previsioni.
      return `
        <article
          class="stazione-card stazione-card-compatta"
          data-stazione-id="${escapeHtml(stazione.idstazione)}"
          data-vista="compatta"
          data-livello="${String(valutazione.livello)}"
        >
          <span class="stazione-compatta-nome">${escapeHtml(stazione.nomestaz)}</span>
          <div style="display:inline-flex;align-items:center;gap:8px;">
            <a
              href="${escapeHtml(urlGrafico)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondario btn-sm"
              data-azione="apri-grafico"
              data-idstazione="${escapeHtml(stazione.idstazione)}"
            >
              📈 Grafico
            </a>
            <span
              class="stazione-compatta-stato stato-${valutazione.colore}"
              aria-label="${escapeHtml(valutazione.etichetta)}"
              title="${escapeHtml(valutazione.etichetta)}"
            >
              <span class="pallino-stato pallino-${valutazione.colore}" aria-hidden="true"></span>
              <span class="sr-only">${escapeHtml(valutazione.etichettaBreve)}</span>
            </span>
          </div>
        </article>
      `;
    }

    // VISTA ESTESA (default): nome, valore in m, soglie, trend cm/h, previsioni +1h/+2h, icona di stato e icone secondarie
    const iconaTrend =
      infoTrend.direzione === 'in_aumento'
        ? '↗'
        : infoTrend.direzione === 'in_calo'
          ? '↘'
          : infoTrend.direzione === 'stabile'
            ? '→'
            : '·';

    const s1 = deps.soglie.formattaSoglia(valutazione.soglia1Effettiva);
    const s2 = deps.soglie.formattaSoglia(valutazione.soglia2Effettiva);
    const s3 = deps.soglie.formattaSoglia(valutazione.soglia3Effettiva);

    const quotaAvviso = deps.statoUtente.ottieniAvvisoLivello?.(stazione.idstazione) ?? null;
    const avvisoSuperato =
      quotaAvviso !== null && stazione.value !== null && stazione.value >= quotaAvviso;
    const inModificaAvviso = stazioneInModificaAvviso === stazione.idstazione;

    const formAvvisoHtml = inModificaAvviso
      ? `<form class="form-soglie-personalizzate" data-azione="salva-avviso-metri-mon" data-idstazione="${escapeHtml(stazione.idstazione)}">
          <p class="sezione-sottotitolo" style="margin-bottom:6px;">
            Ricevi una notifica quando il livello dell'acqua raggiunge questa quota in metri (le soglie ARPAE restano invariate):
          </p>
          <div class="form-crea-gruppo">
            <input
              type="text"
              inputmode="decimal"
              name="quotaAvviso"
              value="${quotaAvviso !== null ? escapeHtml(String(quotaAvviso)) : ''}"
              placeholder="Livello in metri (es. 1.50)"
            />
            <button type="submit" class="btn btn-primario btn-sm">Salva</button>
            ${
              quotaAvviso !== null
                ? `<button type="button" class="btn btn-pericolo btn-sm" data-azione="rimuovi-avviso-metri-mon" data-idstazione="${escapeHtml(stazione.idstazione)}">Rimuovi</button>`
                : ''
            }
            <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-avviso-metri-mon">Annulla</button>
          </div>
        </form>`
      : '';

    return `
      <article
        class="stazione-card stazione-card-estesa bordostato-${valutazione.colore}"
        data-stazione-id="${escapeHtml(stazione.idstazione)}"
        data-vista="estesa"
        data-livello="${String(valutazione.livello)}"
      >
        <div class="stazione-estesa-header">
          <div class="stazione-estesa-titolo-wrap">
            <h4 class="stazione-estesa-nome">${escapeHtml(stazione.nomestaz)}</h4>
            <div class="stazione-icone-secondarie">
              <span class="icona-secondaria" title="Ordinamento idraulico">🧭 #${stazione.ordinamento}</span>
              <span class="icona-secondaria" title="Direzione trend">${iconaTrend}</span>
              ${
                valutazione.personalizzata
                  ? '<span class="icona-secondaria badge-soglia-custom" title="Soglie personalizzate attive">⚙ Soglie pers.</span>'
                  : ''
              }
              ${
                quotaAvviso !== null
                  ? `<span class="icona-secondaria ${avvisoSuperato ? 'stato-rosso badge-stato' : ''}" data-avviso-card="${escapeHtml(stazione.idstazione)}">🔔 Avviso: ${quotaAvviso.toFixed(2)} m${avvisoSuperato ? ' (RAGGIUNTO!)' : ''}</span>`
                  : ''
              }
            </div>
          </div>
          <div class="stazione-estesa-stato-wrap">
            <span class="valore-principale" data-valore>${formattaValore(stazione.value)}</span>
            <span
              class="badge-stato stato-${valutazione.colore}"
              aria-label="${escapeHtml(valutazione.etichetta)}"
            >
              <span class="pallino-stato pallino-${valutazione.colore}" aria-hidden="true"></span>
              <span>${escapeHtml(valutazione.etichettaBreve)}</span>
            </span>
          </div>
        </div>

        <div class="stazione-estesa-metriche">
          <div class="metrica-box">
            <span class="metrica-label">Trend orario</span>
            <strong class="metrica-valore" data-trend>${escapeHtml(infoTrend.testoTrend)}</strong>
          </div>
          <div class="metrica-box">
            <span class="metrica-label">Prev. +1h</span>
            <strong class="metrica-valore" data-prev1h>${escapeHtml(infoTrend.testoPrevisione1h)}</strong>
          </div>
          <div class="metrica-box">
            <span class="metrica-label">Prev. +2h</span>
            <strong class="metrica-valore" data-prev2h>${escapeHtml(infoTrend.testoPrevisione2h)}</strong>
          </div>
        </div>

        <div class="stazione-estesa-soglie" data-soglie>
          <span>S1 (Gialla): <strong>${escapeHtml(s1)}</strong></span>
          <span>S2 (Arancione): <strong>${escapeHtml(s2)}</strong></span>
          <span>S3 (Rossa): <strong>${escapeHtml(s3)}</strong></span>
          <a
            href="${escapeHtml(urlGrafico)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondario btn-sm"
            data-azione="apri-grafico"
            data-idstazione="${escapeHtml(stazione.idstazione)}"
          >
            📈 Grafico
          </a>
          <button
            type="button"
            class="btn-link"
            data-azione="apri-avviso-metri-mon"
            data-idstazione="${escapeHtml(stazione.idstazione)}"
          >
            ${quotaAvviso !== null ? `🔔 Modifica avviso (${quotaAvviso.toFixed(2)} m)` : '🔔 Imposta avviso notifica (m)'}
          </button>
        </div>
        ${formAvvisoHtml}
      </article>
    `;
  }

  function render(): void {
    const statoDati = deps.ottieniStatoDati();
    const tutteStazioni = statoDati.stazioni;
    const mappaStazioni = new Map<string, Stazione>();
    for (const s of tutteStazioni) {
      mappaStazioni.set(s.idstazione, s);
    }

    const corsi =
      statoDati.corsiAcqua ?? deps.corsiAcqua.raggruppaPerCorsoAcqua(tutteStazioni);
    const mappaGruppiCorsi: MappaStazioniGruppi = {};
    for (const c of corsi) {
      mappaGruppiCorsi[c.id] = c.stazioni.map((s) => s.idstazione);
    }

    const idsMonitorate = deps.statoUtente.ottieniStazioniMonitorate(mappaGruppiCorsi);

    // Calcolo contatori per i 5 filtri circolari (esclusivi; 'nd' compare solo nel blu)
    const contatori: Record<FiltroMonitoraggio, number> = {
      blu: 0,
      verde: 0,
      giallo: 0,
      arancione: 0,
      rosso: 0,
    };

    for (const idStaz of idsMonitorate) {
      const staz = mappaStazioni.get(idStaz);
      if (!staz) continue;
      contatori.blu++;
      const val = valutaConOverride(staz);
      if (val.livello === 0) contatori.verde++;
      else if (val.livello === 1) contatori.giallo++;
      else if (val.livello === 2) contatori.arancione++;
      else if (val.livello === 3) contatori.rosso++;
    }

    const oraFormattata = formattaOraAggiornamento(statoDati.timeRilevazione);
    const oraControllo =
      statoDati.ultimoControlloMs && Number.isFinite(statoDati.ultimoControlloMs)
        ? new Date(statoDati.ultimoControlloMs).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : null;

    // Bottone notifiche se il servizio notifiche è iniettato
    let htmlBottoneNotifiche = '';
    if (deps.notifiche) {
      const attivo = deps.notifiche.isAttivo();
      const permesso = deps.notifiche.ottieniPermesso();
      const testoBtn =
        permesso === 'unsupported'
          ? 'Notifiche non supportate'
          : attivo
            ? '🔔 Notifiche attive'
            : '🔕 Attiva notifiche';
      htmlBottoneNotifiche = `
        <button
          type="button"
          class="btn ${attivo ? 'btn-notifiche-attive' : 'btn-secondario'} btn-sm"
          data-azione="toggle-notifiche"
          ${permesso === 'unsupported' ? 'disabled' : ''}
        >
          ${testoBtn}
        </button>
      `;
    }

    // Costruzione barra 5 filtri rapidi circolari
    const configFiltri: Array<{
      id: FiltroMonitoraggio;
      titolo: string;
      sottotitolo: string;
    }> = [
      { id: 'blu', titolo: 'Tutte', sottotitolo: 'Blu (incl. n.d.)' },
      { id: 'verde', titolo: 'Liv. 0', sottotitolo: 'Verde' },
      { id: 'giallo', titolo: 'Liv. 1', sottotitolo: 'Giallo' },
      { id: 'arancione', titolo: 'Liv. 2', sottotitolo: 'Arancione' },
      { id: 'rosso', titolo: 'Liv. 3', sottotitolo: 'Rosso' },
    ];

    const htmlFiltri = configFiltri
      .map((f) => {
        const isAttivo = filtroAttivo === f.id;
        return `
          <button
            type="button"
            class="filtro-circolare filtro-${f.id} ${isAttivo ? 'filtro-attivo' : ''}"
            data-azione="seleziona-filtro"
            data-filtro="${f.id}"
            aria-pressed="${isAttivo}"
            aria-label="Filtro ${f.titolo} (${f.sottotitolo}): ${contatori[f.id]} stazioni"
          >
            <span class="filtro-cerchio">
              <span class="filtro-contatore" data-contatore-filtro="${f.id}">${contatori[f.id]}</span>
            </span>
            <span class="filtro-etichetta">${f.titolo}</span>
          </button>
        `;
      })
      .join('');

    // Costruzione blocchi dei gruppi monitorati (corsi d'acqua + gruppi personalizzati)
    interface GruppoDaRenderizzare {
      id: string;
      nome: string;
      tipo: 'Corso d’acqua' | 'Gruppo personalizzato';
      stazioni: Stazione[];
    }

    const gruppiDaMostrare: GruppoDaRenderizzare[] = [];

    for (const corso of corsi) {
      if (deps.statoUtente.isGruppoMonitorato(corso.id)) {
        gruppiDaMostrare.push({
          id: corso.id,
          nome: corso.nome,
          tipo: 'Corso d’acqua',
          stazioni: deps.corsiAcqua.ordinaStazioni(corso.stazioni),
        });
      }
    }

    for (const grpCustom of deps.statoUtente.ottieniGruppiPersonalizzati()) {
      if (deps.statoUtente.isGruppoMonitorato(grpCustom.id)) {
        const stazioniGrp = grpCustom.stazioni
          .map((id) => mappaStazioni.get(id))
          .filter((s): s is Stazione => s !== undefined);
        gruppiDaMostrare.push({
          id: grpCustom.id,
          nome: grpCustom.nome,
          tipo: 'Gruppo personalizzato',
          stazioni: deps.corsiAcqua.ordinaStazioni(stazioniGrp),
        });
      }
    }

    const htmlGruppiMonitorati = gruppiDaMostrare
      .map((gruppo) => {
        const vista = deps.statoUtente.ottieniVistaGruppo(gruppo.id);
        const stazioniFiltrate = gruppo.stazioni.filter((s) =>
          corrispondeAlFiltro(valutaConOverride(s).livello, filtroAttivo)
        );

        // Specifica Sezione 6: "I filtri nascondono le stazioni non corrispondenti e i gruppi rimasti vuoti."
        if (stazioniFiltrate.length === 0) {
          return '';
        }

        const cardsHtml = stazioniFiltrate
          .map((s) => {
            const val = valutaConOverride(s);
            const tr =
              statoDati.mappaTrend[s.idstazione] ??
              deps.trend.calcolaTrendStazione(s.value, null);
            return renderCardStazione(s, val, tr, vista);
          })
          .join('');

        const frecciaChevron = vista === 'estesa' ? '▲' : '▼';
        const etichettaVista = vista === 'estesa' ? 'Vista estesa' : 'Vista compatta';

        return `
          <section class="gruppo-monitorato-section" data-gruppo-monitorato="${escapeHtml(gruppo.id)}" data-vista-gruppo="${vista}">
            <header class="gruppo-monitorato-header">
              <button
                type="button"
                class="btn-toggle-vista-gruppo"
                data-azione="toggle-vista-gruppo"
                data-gruppo-id="${escapeHtml(gruppo.id)}"
                aria-label="Alterna vista per ${escapeHtml(gruppo.nome)} (attuale: ${etichettaVista})"
              >
                <span class="chevron-vista" aria-hidden="true">${frecciaChevron}</span>
                <span class="gruppo-monitorato-titolo">${escapeHtml(gruppo.nome)}</span>
                <span class="gruppo-monitorato-badge">${escapeHtml(gruppo.tipo)} · ${stazioniFiltrate.length}</span>
              </button>
            </header>
            <div class="gruppo-monitorato-lista lista-${vista}">
              ${cardsHtml}
            </div>
          </section>
        `;
      })
      .filter(Boolean)
      .join('');

    // Sezione "Stazioni singole" (monitorate che non appartengono ad alcun gruppo monitorato)
    const idsSoloSingole = deps.statoUtente.ottieniStazioniSoloSingole(mappaGruppiCorsi);
    const stazioniSoloSingole = idsSoloSingole
      .map((id) => mappaStazioni.get(id))
      .filter((s): s is Stazione => s !== undefined)
      .filter((s) => corrispondeAlFiltro(valutaConOverride(s).livello, filtroAttivo));

    let htmlStazioniSingole = '';
    if (stazioniSoloSingole.length > 0) {
      const vistaSingole = deps.statoUtente.ottieniVistaGruppo('single:stazioni');
      const cardsSingole = stazioniSoloSingole
        .map((s) => {
          const val = valutaConOverride(s);
          const tr =
            statoDati.mappaTrend[s.idstazione] ??
            deps.trend.calcolaTrendStazione(s.value, null);
          return renderCardStazione(s, val, tr, vistaSingole);
        })
        .join('');

      htmlStazioniSingole = `
        <section class="gruppo-monitorato-section sezione-stazioni-singole" data-sezione-singole data-vista-gruppo="${vistaSingole}">
          <header class="gruppo-monitorato-header">
            <button
              type="button"
              class="btn-toggle-vista-gruppo"
              data-azione="toggle-vista-gruppo"
              data-gruppo-id="single:stazioni"
            >
              <span class="chevron-vista" aria-hidden="true">${vistaSingole === 'estesa' ? '▲' : '▼'}</span>
              <span class="gruppo-monitorato-titolo">Stazioni singole</span>
              <span class="gruppo-monitorato-badge">${stazioniSoloSingole.length}</span>
            </button>
          </header>
          <div class="gruppo-monitorato-lista lista-${vistaSingole}">
            ${cardsSingole}
          </div>
        </section>
      `;
    }

    // Gestione stato di errore, caricamento, stato vuoto o nessun risultato per il filtro
    let corpoPrincipaleHtml = '';

    if (statoDati.errore) {
      corpoPrincipaleHtml = `
        <div class="card stato-errore-box" role="alert" data-stato-errore>
          <h3>Errore nel caricamento dei dati</h3>
          <p>${escapeHtml(statoDati.errore)}</p>
          <button type="button" class="btn btn-primario" data-azione="riprova-caricamento">
            Riprova
          </button>
        </div>
      `;
    } else if (statoDati.caricamento && tutteStazioni.length === 0) {
      corpoPrincipaleHtml = `
        <div class="card stato-caricamento-box" data-stato-caricamento>
          <p>Caricamento dei livelli idrometrici in corso...</p>
        </div>
      `;
    } else if (idsMonitorate.size === 0) {
      corpoPrincipaleHtml = `
        <div class="card stato-vuoto-box" data-stato-vuoto>
          <h3>Nessuna stazione o gruppo monitorato</h3>
          <p>Aggiungi corsi d'acqua o singole stazioni idrometriche dal catalogo ARPAE per iniziare il monitoraggio.</p>
          <a href="#/arpae" class="btn btn-primario" data-azione="vai-ad-arpae">
            Vai al catalogo ARPAE
          </a>
        </div>
      `;
    } else if (!htmlGruppiMonitorati && !htmlStazioniSingole) {
      corpoPrincipaleHtml = `
        <div class="card stato-nessun-risultato-filtro" data-nessun-risultato-filtro>
          <p>Nessuna stazione monitorata corrisponde al filtro selezionato.</p>
        </div>
      `;
    } else {
      corpoPrincipaleHtml = `
        ${htmlGruppiMonitorati}
        ${htmlStazioniSingole}
      `;
    }

    container.innerHTML = `
      <div class="pagina pagina-monitoraggio">
        <div class="monitoraggio-toolbar">
          <div class="toolbar-info">
            <span class="ultimo-aggiornamento" data-ultimo-aggiornamento>
              Ultimo aggiornamento ${oraFormattata}${oraControllo ? ` · Verificato alle ${oraControllo}` : ''}
            </span>
          </div>
          <div class="toolbar-azioni">
            ${htmlBottoneNotifiche}
            <button
              type="button"
              class="btn btn-secondario btn-sm"
              data-azione="aggiorna-dati"
              title="Scarica subito i dati più recenti da ARPAE senza attendere il controllo automatico al minuto"
              ${statoDati.caricamento ? 'disabled' : ''}
            >
              ${statoDati.caricamento ? 'Aggiornamento...' : '↻ Aggiorna'}
            </button>
          </div>
        </div>

        <nav class="barra-filtri-rapidi" aria-label="Filtri rapidi per livello di allerta" data-barra-filtri>
          ${htmlFiltri}
        </nav>

        <div class="monitoraggio-contenuto" data-monitoraggio-contenuto>
          ${corpoPrincipaleHtml}
        </div>
      </div>
    `;
  }

  function gestisciClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const btnFiltro = target.closest<HTMLElement>('[data-azione="seleziona-filtro"]');
    if (btnFiltro) {
      const selezionato = btnFiltro.dataset.filtro as FiltroMonitoraggio | undefined;
      if (selezionato) {
        // Specifica Sezione 6: "Il filtro attivo si ripete con un secondo clic per tornare al blu."
        if (filtroAttivo === selezionato && selezionato !== 'blu') {
          filtroAttivo = 'blu';
        } else {
          filtroAttivo = selezionato;
        }
        render();
      }
      return;
    }

    const btnVistaGruppo = target.closest<HTMLElement>('[data-azione="toggle-vista-gruppo"]');
    if (btnVistaGruppo) {
      const idGruppo = btnVistaGruppo.dataset.gruppoId;
      if (idGruppo) {
        deps.statoUtente.alternaVistaGruppo(idGruppo);
        render();
      }
      return;
    }

    if (
      target.closest('[data-azione="aggiorna-dati"]') ||
      target.closest('[data-azione="riprova-caricamento"]')
    ) {
      void deps.richiediAggiornamento();
      return;
    }

    if (target.closest('[data-azione="toggle-notifiche"]') && deps.notifiche) {
      if (deps.notifiche.isAttivo()) {
        deps.notifiche.disattivaNotifiche();
        render();
      } else {
        void deps.notifiche.attivaNotifiche().then(() => {
          render();
        });
      }
      return;
    }

    const btnApriAvviso = target.closest<HTMLElement>('[data-azione="apri-avviso-metri-mon"]');
    if (btnApriAvviso) {
      const idStaz = btnApriAvviso.dataset.idstazione ?? null;
      stazioneInModificaAvviso = stazioneInModificaAvviso === idStaz ? null : idStaz;
      render();
      return;
    }

    if (target.closest('[data-azione="chiudi-avviso-metri-mon"]')) {
      stazioneInModificaAvviso = null;
      render();
      return;
    }

    const btnRimuoviAvviso = target.closest<HTMLElement>(
      '[data-azione="rimuovi-avviso-metri-mon"]'
    );
    if (btnRimuoviAvviso) {
      const idStaz = btnRimuoviAvviso.dataset.idstazione;
      if (idStaz) {
        deps.statoUtente.rimuoviAvvisoLivello?.(idStaz);
        stazioneInModificaAvviso = null;
        render();
      }
      return;
    }

    const linkArpae = target.closest<HTMLElement>('[data-azione="vai-ad-arpae"]');
    if (linkArpae && deps.navigaA) {
      event.preventDefault();
      deps.navigaA('#/arpae');
    }
  }

  function gestisciSubmit(event: Event): void {
    const form = event.target as HTMLElement | null;
    if (
      !(form instanceof HTMLFormElement) ||
      form.dataset.azione !== 'salva-avviso-metri-mon'
    ) {
      return;
    }
    event.preventDefault();
    const idstazione = form.dataset.idstazione;
    if (!idstazione) return;

    const formData = new FormData(form);
    const raw = String(formData.get('quotaAvviso') ?? '').trim().replace(',', '.');
    if (!raw) {
      deps.statoUtente.rimuoviAvvisoLivello?.(idstazione);
    } else {
      const num = Number(raw);
      if (Number.isFinite(num)) {
        deps.statoUtente.impostaAvvisoLivello?.(idstazione, num);
      }
    }
    stazioneInModificaAvviso = null;
    render();
  }

  container.addEventListener('click', gestisciClick);
  container.addEventListener('submit', gestisciSubmit);
  render();

  return {
    aggiorna: render,
    smonta: () => {
      container.removeEventListener('click', gestisciClick);
      container.removeEventListener('submit', gestisciSubmit);
      container.innerHTML = '';
    },
  };
}

