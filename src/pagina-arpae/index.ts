import type {
  CalcoloTrend,
  CorsoAcqua,
  IstanzaPagina,
  ServizioCorsiAcqua,
  ServizioSoglie,
  ServizioStatoUtente,
  Stazione,
} from '../contratti';
import { costruisciUrlGraficoStazione } from '../fonte-dati';

export interface DipendenzePaginaArpae {
  ottieniStazioni(): readonly Stazione[];
  ottieniCorsiAcqua?(): readonly CorsoAcqua[];
  ottieniMappaTrend?(): Readonly<Record<string, CalcoloTrend>>;
  corsiAcqua: ServizioCorsiAcqua;
  soglie: ServizioSoglie;
  statoUtente: ServizioStatoUtente;
}

function escapeHtml(testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formattaValore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return 'n.d.';
  }
  return `${value.toFixed(2)} m`;
}

function parsaInputSoglia(raw: string): number | null {
  const pulito = raw.trim().replace(',', '.');
  if (!pulito) return null;
  const num = Number(pulito);
  if (!Number.isFinite(num) || num === 0) {
    return null;
  }
  return num;
}

/**
 * Monta la pagina ARPAE (Catalogo corsi d'acqua, elenco completo stazioni con ricerca
 * case-insensitive e gestione delle soglie personalizzate).
 */
export function mount(
  container: HTMLElement,
  deps: DipendenzePaginaArpae
): IstanzaPagina {
  let termineRicercaCorsi = '';
  let termineRicerca = '';
  let stazioneInModificaSoglie: string | null = null;
  let stazioneInModificaAvviso: string | null = null;
  const corsiEspansi = new Set<string>();

  function calcolaMappaGruppiCorsi(corsi: readonly CorsoAcqua[]): Record<string, string[]> {
    const mappa: Record<string, string[]> = {};
    for (const c of corsi) {
      mappa[c.id] = c.stazioni.map((s) => s.idstazione);
    }
    return mappa;
  }

  function render(): void {
    const tutteStazioni = deps.ottieniStazioni();
    const corsi =
      deps.ottieniCorsiAcqua?.() ?? deps.corsiAcqua.raggruppaPerCorsoAcqua(tutteStazioni);
    const mappaTrend = deps.ottieniMappaTrend?.() ?? {};
    const mappaGruppiCorsi = calcolaMappaGruppiCorsi(corsi);

    const queryCorsi = termineRicercaCorsi.trim().toLowerCase();
    const corsiFiltrati = queryCorsi
      ? corsi.filter(
          (c) =>
            c.nome.toLowerCase().includes(queryCorsi) ||
            c.stazioni.some((s) => s.nomestaz.toLowerCase().includes(queryCorsi))
        )
      : corsi;

    const query = termineRicerca.trim().toLowerCase();
    const stazioniFiltrate = query
      ? tutteStazioni.filter((s) => s.nomestaz.toLowerCase().includes(query))
      : tutteStazioni;

    const htmlCorsi = corsiFiltrati
      .map((corso) => {
        const monitorato = deps.statoUtente.isGruppoMonitorato(corso.id);
        const espanso = corsiEspansi.has(corso.id);
        const righeStazioniCorso = espanso
          ? `<ul class="arpae-corso-stazioni" data-corso-stazioni="${escapeHtml(corso.id)}">
              ${corso.stazioni
                .map((staz) => {
                  const override = deps.statoUtente.ottieniSogliaPersonalizzata(staz.idstazione);
                  const val = deps.soglie.valutaStazione(staz, override);
                  const urlGraficoCorso = costruisciUrlGraficoStazione(staz.idstazione);
                  return `<li class="arpae-corso-stazione-item" data-idstazione="${escapeHtml(staz.idstazione)}" data-ordinamento="${staz.ordinamento}">
                    <span class="staz-ord">#${staz.ordinamento}</span>
                    <span class="staz-nome">${escapeHtml(staz.nomestaz)}</span>
                    <span class="staz-valore">${formattaValore(staz.value)}</span>
                    <span class="badge-stato stato-${val.colore}" aria-label="${escapeHtml(val.etichetta)}">${escapeHtml(val.etichettaBreve)}</span>
                    <a
                      href="${escapeHtml(urlGraficoCorso)}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn btn-secondario btn-sm"
                      data-azione="apri-grafico"
                      data-idstazione="${escapeHtml(staz.idstazione)}"
                    >📈 Grafico</a>
                  </li>`;
                })
                .join('')}
            </ul>`
          : '';

        return `<article class="card arpae-corso-card ${monitorato ? 'corso-monitorato' : ''}" data-corso-id="${escapeHtml(corso.id)}">
          <div class="arpae-corso-header">
            <button type="button" class="btn-espandi-corso" data-azione="toggle-espandi-corso" data-corso-id="${escapeHtml(corso.id)}" aria-expanded="${espanso}">
              <span class="chevron" aria-hidden="true">${espanso ? '▲' : '▼'}</span>
              <span class="corso-titolo">${escapeHtml(corso.nome)}</span>
              <span class="corso-conteggio">(${corso.stazioni.length} stazioni)</span>
            </button>
            <label class="toggle-monitora-gruppo">
              <input
                type="checkbox"
                data-azione="toggle-monitora-corso"
                data-corso-id="${escapeHtml(corso.id)}"
                ${monitorato ? 'checked' : ''}
              />
              <span>Monitora gruppo</span>
            </label>
          </div>
          ${righeStazioniCorso}
        </article>`;
      })
      .join('');

    const htmlStazioni = stazioniFiltrate
      .map((staz) => {
        const override = deps.statoUtente.ottieniSogliaPersonalizzata(staz.idstazione);
        const valutazione = deps.soglie.valutaStazione(staz, override);
        const aggiuntaSingola = deps.statoUtente.isStazioneAggiuntaSingolarmente(staz.idstazione);
        const monitorataTotale = deps.statoUtente.isStazioneMonitorata(
          staz.idstazione,
          mappaGruppiCorsi
        );
        const monitorataDaGruppo = monitorataTotale && !aggiuntaSingola;

        const urlGrafico = costruisciUrlGraficoStazione(staz.idstazione);
        const s1Testo = deps.soglie.formattaSoglia(valutazione.soglia1Effettiva);
        const s2Testo = deps.soglie.formattaSoglia(valutazione.soglia2Effettiva);
        const s3Testo = deps.soglie.formattaSoglia(valutazione.soglia3Effettiva);
        const infoTrend = mappaTrend[staz.idstazione] ?? {
          testoTrend: '—',
          testoPrevisione1h: '—',
          testoPrevisione2h: '—',
        };

        const inModifica = stazioneInModificaSoglie === staz.idstazione;
        const inModificaAvviso = stazioneInModificaAvviso === staz.idstazione;
        const quotaAvviso = deps.statoUtente.ottieniAvvisoLivello?.(staz.idstazione) ?? null;
        const valFormS1 =
          valutazione.soglia1Effettiva !== null ? String(valutazione.soglia1Effettiva) : '';
        const valFormS2 =
          valutazione.soglia2Effettiva !== null ? String(valutazione.soglia2Effettiva) : '';
        const valFormS3 =
          valutazione.soglia3Effettiva !== null ? String(valutazione.soglia3Effettiva) : '';

        const formAvvisoHtml = inModificaAvviso
          ? `<form class="form-soglie-personalizzate" data-azione="salva-avviso-metri" data-idstazione="${escapeHtml(staz.idstazione)}">
              <p class="sezione-sottotitolo" style="margin-bottom:6px;">
                Imposta un livello dell'acqua (in metri) raggiunto il quale ricevere una notifica, <strong>senza modificare le soglie ufficiali ARPAE</strong>:
              </p>
              <div class="form-crea-gruppo" style="margin-bottom:8px;">
                <input
                  type="text"
                  inputmode="decimal"
                  name="quotaAvviso"
                  value="${quotaAvviso !== null ? escapeHtml(String(quotaAvviso)) : ''}"
                  placeholder="Es. 1.50 (in metri)"
                />
                <button type="submit" class="btn btn-primario btn-sm">Salva avviso</button>
                ${
                  quotaAvviso !== null
                    ? `<button type="button" class="btn btn-pericolo btn-sm" data-azione="rimuovi-avviso-metri" data-idstazione="${escapeHtml(staz.idstazione)}">Rimuovi avviso</button>`
                    : ''
                }
                <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-avviso-metri">Annulla</button>
              </div>
            </form>`
          : '';

        const formSoglieHtml = inModifica
          ? `<form class="form-soglie-personalizzate" data-azione="salva-soglie" data-idstazione="${escapeHtml(staz.idstazione)}">
              <div class="form-soglie-grid">
                <label>
                  <span>Soglia 1 (Gialla, m)</span>
                  <input type="text" inputmode="decimal" name="soglia1" value="${escapeHtml(valFormS1)}" placeholder="—" />
                </label>
                <label>
                  <span>Soglia 2 (Arancione, m)</span>
                  <input type="text" inputmode="decimal" name="soglia2" value="${escapeHtml(valFormS2)}" placeholder="—" />
                </label>
                <label>
                  <span>Soglia 3 (Rossa, m)</span>
                  <input type="text" inputmode="decimal" name="soglia3" value="${escapeHtml(valFormS3)}" placeholder="—" />
                </label>
              </div>
              <div class="form-soglie-azioni">
                <button type="submit" class="btn btn-primario btn-sm">Salva soglie</button>
                ${
                  valutazione.personalizzata
                    ? `<button type="button" class="btn btn-secondario btn-sm" data-azione="ripristina-soglie" data-idstazione="${escapeHtml(staz.idstazione)}">Ripristina soglie ufficiali</button>`
                    : ''
                }
                <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-soglie">Annulla</button>
              </div>
            </form>`
          : '';

        return `<article class="card arpae-stazione-card" data-stazione-card="${escapeHtml(staz.idstazione)}">
          <div class="arpae-stazione-top">
            <div class="arpae-stazione-info">
              <h4 class="arpae-stazione-nome">${escapeHtml(staz.nomestaz)}</h4>
              <div class="arpae-stazione-valore-row">
                <span class="valore-idrometrico" data-valore-stazione="${escapeHtml(staz.idstazione)}">${formattaValore(staz.value)}</span>
                <span class="badge-stato stato-${valutazione.colore}" data-stato-stazione="${escapeHtml(staz.idstazione)}" aria-label="${escapeHtml(valutazione.etichetta)}">
                  <span class="pallino-stato pallino-${valutazione.colore}" aria-hidden="true"></span>
                  <span>${escapeHtml(valutazione.etichettaBreve)}</span>
                </span>
                ${
                  valutazione.personalizzata
                    ? `<span class="badge-custom-soglia" data-badge-personalizzata="${escapeHtml(staz.idstazione)}">Soglie personalizzate</span>`
                    : ''
                }
              </div>
            </div>
            <div class="arpae-stazione-controlli">
              <label class="toggle-monitora-stazione">
                <input
                  type="checkbox"
                  data-azione="toggle-monitora-stazione"
                  data-idstazione="${escapeHtml(staz.idstazione)}"
                  ${aggiuntaSingola || monitorataDaGruppo ? 'checked' : ''}
                />
                <span>Monitora${monitorataDaGruppo ? ' (da gruppo)' : ''}</span>
              </label>
            </div>
          </div>

          <div class="arpae-stazione-soglie" data-soglie-stazione="${escapeHtml(staz.idstazione)}">
            <span>Trend: <strong>${escapeHtml(infoTrend.testoTrend)}</strong></span>
            <span>Prev. +1h: <strong>${escapeHtml(infoTrend.testoPrevisione1h)}</strong></span>
            <span>Prev. +2h: <strong>${escapeHtml(infoTrend.testoPrevisione2h)}</strong></span>
            <span>Soglia 1: <strong>${escapeHtml(s1Testo)}</strong></span>
            <span>Soglia 2: <strong>${escapeHtml(s2Testo)}</strong></span>
            <span>Soglia 3: <strong>${escapeHtml(s3Testo)}</strong></span>
            ${
              quotaAvviso !== null
                ? `<span class="badge-custom-soglia" data-avviso-attivo="${escapeHtml(staz.idstazione)}">🔔 Avviso a <strong>${quotaAvviso.toFixed(2)} m</strong></span>`
                : ''
            }
            <a
              href="${escapeHtml(urlGrafico)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondario btn-sm"
              data-azione="apri-grafico"
              data-idstazione="${escapeHtml(staz.idstazione)}"
            >
              📈 Grafico
            </a>
            <button
              type="button"
              class="btn-link"
              data-azione="apri-avviso-metri"
              data-idstazione="${escapeHtml(staz.idstazione)}"
            >
              ${quotaAvviso !== null ? '🔔 Modifica avviso (m)' : '🔔 Imposta avviso notifica (m)'}
            </button>
            <button
              type="button"
              class="btn-link"
              data-azione="apri-soglie"
              data-idstazione="${escapeHtml(staz.idstazione)}"
            >
              ${valutazione.personalizzata ? 'Modifica/Ripristina soglie' : 'Personalizza soglie'}
            </button>
          </div>
          ${formAvvisoHtml}
          ${formSoglieHtml}
        </article>`;
      })
      .join('');

    // Preserva il focus e la posizione del cursore se l'utente sta digitando nei campi di ricerca
    const elementoAttivo = document.activeElement;
    const azioneFocusRicerca =
      elementoAttivo instanceof HTMLInputElement &&
      (elementoAttivo.dataset.azione === 'ricerca-stazioni' ||
        elementoAttivo.dataset.azione === 'ricerca-corsi')
        ? elementoAttivo.dataset.azione
        : null;
    const selezioneStart =
      azioneFocusRicerca && elementoAttivo instanceof HTMLInputElement
        ? elementoAttivo.selectionStart
        : null;
    const selezioneEnd =
      azioneFocusRicerca && elementoAttivo instanceof HTMLInputElement
        ? elementoAttivo.selectionEnd
        : null;

    container.innerHTML = `
      <div class="pagina pagina-arpae">
        <section class="sezione-arpae-corsi" aria-labelledby="titolo-corsi-acqua">
          <div class="sezione-header">
            <h2 id="titolo-corsi-acqua">Gruppi per corso d'acqua (${corsiFiltrati.length})</h2>
            <p class="sezione-sottotitolo">Stazioni ordinate da monte a valle (ordinamento crescente)</p>
            <div class="barra-ricerca">
              <label for="input-ricerca-corsi-arpae" class="sr-only">Cerca gruppo corso d'acqua</label>
              <input
                id="input-ricerca-corsi-arpae"
                type="search"
                class="input-ricerca"
                data-azione="ricerca-corsi"
                placeholder="Cerca gruppo per corso d'acqua (es. Po, Reno, Secchia) o stazione..."
                value="${escapeHtml(termineRicercaCorsi)}"
              />
            </div>
          </div>
          <div class="lista-corsi-acqua" data-lista-corsi>
            ${htmlCorsi || '<p class="stato-vuoto-testo">Nessun corso d’acqua corrisponde alla ricerca.</p>'}
          </div>
        </section>

        <section class="sezione-arpae-stazioni" aria-labelledby="titolo-elenco-stazioni">
          <div class="sezione-header">
            <h2 id="titolo-elenco-stazioni">Elenco completo stazioni (${stazioniFiltrate.length})</h2>
            <div class="barra-ricerca">
              <label for="input-ricerca-arpae" class="sr-only">Cerca stazione per nome</label>
              <input
                id="input-ricerca-arpae"
                type="search"
                class="input-ricerca"
                data-azione="ricerca-stazioni"
                placeholder="Cerca stazione per nome..."
                value="${escapeHtml(termineRicerca)}"
              />
            </div>
          </div>
          <div class="lista-stazioni-arpae" data-lista-stazioni>
            ${htmlStazioni || '<p class="stato-vuoto-testo">Nessuna stazione corrisponde alla ricerca.</p>'}
          </div>
        </section>
      </div>
    `;

    if (azioneFocusRicerca) {
      const nuovoInput = container.querySelector<HTMLInputElement>(
        `input[data-azione="${azioneFocusRicerca}"]`
      );
      if (nuovoInput) {
        nuovoInput.focus();
        if (selezioneStart !== null && selezioneEnd !== null) {
          nuovoInput.setSelectionRange(selezioneStart, selezioneEnd);
        }
      }
    }
  }

  function gestisciClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const btnEspandi = target.closest<HTMLElement>('[data-azione="toggle-espandi-corso"]');
    if (btnEspandi) {
      const idCorso = btnEspandi.dataset.corsoId;
      if (idCorso) {
        if (corsiEspansi.has(idCorso)) {
          corsiEspansi.delete(idCorso);
        } else {
          corsiEspansi.add(idCorso);
        }
        render();
      }
      return;
    }

    const btnApriAvviso = target.closest<HTMLElement>('[data-azione="apri-avviso-metri"]');
    if (btnApriAvviso) {
      const idstazione = btnApriAvviso.dataset.idstazione ?? null;
      stazioneInModificaAvviso =
        stazioneInModificaAvviso === idstazione ? null : idstazione;
      stazioneInModificaSoglie = null;
      render();
      return;
    }

    const btnChiudiAvviso = target.closest<HTMLElement>('[data-azione="chiudi-avviso-metri"]');
    if (btnChiudiAvviso) {
      stazioneInModificaAvviso = null;
      render();
      return;
    }

    const btnRimuoviAvviso = target.closest<HTMLElement>('[data-azione="rimuovi-avviso-metri"]');
    if (btnRimuoviAvviso) {
      const idstazione = btnRimuoviAvviso.dataset.idstazione;
      if (idstazione) {
        deps.statoUtente.rimuoviAvvisoLivello?.(idstazione);
        stazioneInModificaAvviso = null;
        render();
      }
      return;
    }

    const btnApriSoglie = target.closest<HTMLElement>('[data-azione="apri-soglie"]');
    if (btnApriSoglie) {
      const idstazione = btnApriSoglie.dataset.idstazione ?? null;
      stazioneInModificaSoglie =
        stazioneInModificaSoglie === idstazione ? null : idstazione;
      stazioneInModificaAvviso = null;
      render();
      return;
    }

    const btnChiudiSoglie = target.closest<HTMLElement>('[data-azione="chiudi-soglie"]');
    if (btnChiudiSoglie) {
      stazioneInModificaSoglie = null;
      render();
      return;
    }

    const btnRipristina = target.closest<HTMLElement>('[data-azione="ripristina-soglie"]');
    if (btnRipristina) {
      const idstazione = btnRipristina.dataset.idstazione;
      if (idstazione) {
        deps.statoUtente.ripristinaSogliaUfficiale(idstazione);
        stazioneInModificaSoglie = null;
        render();
      }
      return;
    }
  }

  function gestisciChange(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (
      target instanceof HTMLInputElement &&
      target.dataset.azione === 'toggle-monitora-corso'
    ) {
      const idCorso = target.dataset.corsoId;
      if (idCorso) {
        deps.statoUtente.impostaMonitoraggioGruppo(idCorso, target.checked);
        render();
      }
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.dataset.azione === 'toggle-monitora-stazione'
    ) {
      const idstazione = target.dataset.idstazione;
      if (idstazione) {
        deps.statoUtente.impostaStazioneSingola(idstazione, target.checked);
        render();
      }
      return;
    }
  }

  function gestisciInput(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.dataset.azione === 'ricerca-corsi') {
      termineRicercaCorsi = target.value;
      render();
      return;
    }

    if (target.dataset.azione === 'ricerca-stazioni') {
      termineRicerca = target.value;
      render();
    }
  }

  function gestisciSubmit(event: Event): void {
    const form = event.target as HTMLElement | null;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (form.dataset.azione === 'salva-avviso-metri') {
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
      return;
    }

    if (form.dataset.azione !== 'salva-soglie') {
      return;
    }
    event.preventDefault();
    const idstazione = form.dataset.idstazione;
    if (!idstazione) return;

    const formData = new FormData(form);
    const s1 = parsaInputSoglia(String(formData.get('soglia1') ?? ''));
    const s2 = parsaInputSoglia(String(formData.get('soglia2') ?? ''));
    const s3 = parsaInputSoglia(String(formData.get('soglia3') ?? ''));

    deps.statoUtente.impostaSogliaPersonalizzata({
      idstazione,
      soglia1: s1,
      soglia2: s2,
      soglia3: s3,
    });
    stazioneInModificaSoglie = null;
    render();
  }

  container.addEventListener('click', gestisciClick);
  container.addEventListener('change', gestisciChange);
  container.addEventListener('input', gestisciInput);
  container.addEventListener('submit', gestisciSubmit);

  render();

  return {
    aggiorna: render,
    smonta: () => {
      container.removeEventListener('click', gestisciClick);
      container.removeEventListener('change', gestisciChange);
      container.removeEventListener('input', gestisciInput);
      container.removeEventListener('submit', gestisciSubmit);
      container.innerHTML = '';
    },
  };
}

