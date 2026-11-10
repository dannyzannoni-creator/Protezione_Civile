import type {
  CorsoAcqua,
  IstanzaPagina,
  MappaStazioniGruppi,
  ServizioStatoUtente,
  Stazione,
} from '../contratti';

export interface DipendenzePaginaGruppi {
  ottieniStazioni(): readonly Stazione[];
  ottieniCorsiAcqua?(): readonly CorsoAcqua[];
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

/**
 * Monta la pagina GRUPPI (CRUD dei gruppi personalizzati con ricerca stazioni
 * e conferma di eliminazione con avviso esplicito di Cascade Delete).
 */
export function mount(
  container: HTMLElement,
  deps: DipendenzePaginaGruppi
): IstanzaPagina {
  let messaggioErrore: string | null = null;
  let gruppoInRinomina: string | null = null;
  let gruppoInModificaStazioni: string | null = null;
  let gruppoInConfermaEliminazione: string | null = null;
  let ricercaStazioniComposizione = '';

  function costruisciMappaCorsi(): MappaStazioniGruppi {
    const corsi = deps.ottieniCorsiAcqua?.() ?? [];
    const mappa: MappaStazioniGruppi = {};
    for (const c of corsi) {
      mappa[c.id] = c.stazioni.map((s) => s.idstazione);
    }
    return mappa;
  }

  function render(): void {
    const gruppi = deps.statoUtente.ottieniGruppiPersonalizzati();
    const tutteStazioni = deps.ottieniStazioni();
    const mappaStazioniPerId = new Map<string, Stazione>();
    for (const s of tutteStazioni) {
      mappaStazioniPerId.set(s.idstazione, s);
    }
    const mappaCorsi = costruisciMappaCorsi();

    const htmlGruppi = gruppi
      .map((gruppo) => {
        const monitorato = deps.statoUtente.isGruppoMonitorato(gruppo.id);
        const inRinomina = gruppoInRinomina === gruppo.id;
        const inComposizione = gruppoInModificaStazioni === gruppo.id;
        const inEliminazione = gruppoInConfermaEliminazione === gruppo.id;

        const nomiStazioniAttuali = gruppo.stazioni.map(
          (id) => mappaStazioniPerId.get(id)?.nomestaz ?? `Stazione ${id}`
        );

        let bloccoRinomina = '';
        if (inRinomina) {
          bloccoRinomina = `
            <form class="form-rinomina-gruppo" data-azione="salva-rinomina" data-gruppo-id="${escapeHtml(gruppo.id)}">
              <label class="sr-only" for="input-rinomina-${escapeHtml(gruppo.id)}">Nuovo nome gruppo</label>
              <input
                id="input-rinomina-${escapeHtml(gruppo.id)}"
                type="text"
                name="nuovoNome"
                value="${escapeHtml(gruppo.nome)}"
                required
              />
              <button type="submit" class="btn btn-primario btn-sm">Salva nome</button>
              <button type="button" class="btn btn-neutro btn-sm" data-azione="annulla-rinomina">Annulla</button>
            </form>
          `;
        }

        let bloccoEliminazione = '';
        if (inEliminazione) {
          const impatto = deps.statoUtente.calcolaImpattoEliminazioneGruppo(
            gruppo.id,
            mappaCorsi
          );
          const numCoinvolte = impatto.totaleStazioniNelGruppo;
          const numSmetteranno = impatto.stazioniCheSmetteranno.length;
          const numSalvate = impatto.stazioniSalvateDaAltriGruppi.length;

          bloccoEliminazione = `
            <div class="box-conferma-eliminazione" role="alertdialog" aria-label="Conferma eliminazione gruppo" data-conferma-eliminazione="${escapeHtml(gruppo.id)}">
              <p class="avviso-titolo"><strong>Attenzione: eliminazione con Cascade Delete</strong></p>
              <p class="avviso-testo">
                Stai eliminando il gruppo <strong>${escapeHtml(gruppo.nome)}</strong> (${numCoinvolte} stazioni coinvolte).
                Eliminando questo gruppo, <strong>${numSmetteranno} stazioni smetteranno completamente di essere monitorate</strong>
                (anche se erano state aggiunte singolarmente dalla pagina ARPAE).
                ${
                  numSalvate > 0
                    ? `Altre ${numSalvate} stazioni resteranno monitorate poiché presenti in un altro gruppo attivo.`
                    : ''
                }
              </p>
              <div class="azioni-conferma">
                <button
                  type="button"
                  class="btn btn-pericolo btn-sm"
                  data-azione="conferma-elimina-gruppo"
                  data-gruppo-id="${escapeHtml(gruppo.id)}"
                >
                  Conferma eliminazione
                </button>
                <button
                  type="button"
                  class="btn btn-neutro btn-sm"
                  data-azione="annulla-elimina-gruppo"
                >
                  Annulla
                </button>
              </div>
            </div>
          `;
        }

        let bloccoComposizione = '';
        if (inComposizione) {
          const query = ricercaStazioniComposizione.trim().toLowerCase();
          const stazioniSelezionabili = query
            ? tutteStazioni.filter((s) => s.nomestaz.toLowerCase().includes(query))
            : tutteStazioni;
          const setStazioniGruppo = new Set(gruppo.stazioni);

          bloccoComposizione = `
            <div class="pannello-composizione-stazioni" data-composizione-gruppo="${escapeHtml(gruppo.id)}">
              <div class="composizione-header">
                <h4>Modifica stazioni del gruppo (${gruppo.stazioni.length} selezionate)</h4>
                <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-composizione">Chiudi</button>
              </div>
              <div class="barra-ricerca">
                <input
                  type="search"
                  class="input-ricerca"
                  data-azione="ricerca-stazioni-gruppo"
                  placeholder="Cerca stazione da aggiungere o rimuovere..."
                  value="${escapeHtml(ricercaStazioniComposizione)}"
                />
              </div>
              <ul class="lista-selettore-stazioni">
                ${stazioniSelezionabili
                  .map((s) => {
                    const presente = setStazioniGruppo.has(s.idstazione);
                    return `<li>
                      <label class="selettore-stazione-label">
                        <input
                          type="checkbox"
                          data-azione="toggle-stazione-in-gruppo"
                          data-gruppo-id="${escapeHtml(gruppo.id)}"
                          data-idstazione="${escapeHtml(s.idstazione)}"
                          ${presente ? 'checked' : ''}
                        />
                        <span>${escapeHtml(s.nomestaz)}</span>
                      </label>
                    </li>`;
                  })
                  .join('')}
              </ul>
            </div>
          `;
        }

        return `
          <article class="card gruppo-custom-card" data-gruppo-card="${escapeHtml(gruppo.id)}">
            <div class="gruppo-custom-header">
              <div>
                <h3 class="gruppo-custom-nome" data-gruppo-nome="${escapeHtml(gruppo.id)}">${escapeHtml(gruppo.nome)}</h3>
                <span class="gruppo-custom-meta">${gruppo.stazioni.length} stazioni · ${monitorato ? 'Monitorato' : 'Non monitorato'}</span>
              </div>
              <div class="gruppo-custom-azioni">
                <button type="button" class="btn btn-secondario btn-sm" data-azione="apri-rinomina" data-gruppo-id="${escapeHtml(gruppo.id)}">Rinomina</button>
                <button type="button" class="btn btn-secondario btn-sm" data-azione="apri-composizione" data-gruppo-id="${escapeHtml(gruppo.id)}">Modifica stazioni</button>
                <button type="button" class="btn btn-pericolo btn-sm" data-azione="chiedi-elimina-gruppo" data-gruppo-id="${escapeHtml(gruppo.id)}">Elimina</button>
              </div>
            </div>

            ${
              nomiStazioniAttuali.length > 0
                ? `<div class="chip-stazioni-gruppo">${nomiStazioniAttuali.map((n) => `<span class="chip-stazione">${escapeHtml(n)}</span>`).join('')}</div>`
                : `<p class="testo-secondario">Nessuna stazione nel gruppo. Clicca su "Modifica stazioni" per aggiungerne.</p>`
            }

            ${bloccoRinomina}
            ${bloccoEliminazione}
            ${bloccoComposizione}
          </article>
        `;
      })
      .join('');

    const elementoAttivo = document.activeElement;
    const avevaFocusRicerca =
      elementoAttivo instanceof HTMLInputElement &&
      elementoAttivo.dataset.azione === 'ricerca-stazioni-gruppo';
    const selStart = avevaFocusRicerca ? elementoAttivo.selectionStart : null;
    const selEnd = avevaFocusRicerca ? elementoAttivo.selectionEnd : null;

    container.innerHTML = `
      <div class="pagina pagina-gruppi">
        <section class="card sezione-crea-gruppo" aria-labelledby="titolo-crea-gruppo">
          <h2 id="titolo-crea-gruppo">Crea nuovo gruppo personalizzato</h2>
          <p class="sezione-sottotitolo">
            Un gruppo personalizzato appena creato è subito monitorato. I gruppi automatici per corso d'acqua non sono modificabili qui (gestiscili nella scheda ARPAE).
          </p>
          ${
            messaggioErrore
              ? `<div class="banner-errore" role="alert" data-errore-gruppi>${escapeHtml(messaggioErrore)}</div>`
              : ''
          }
          <form class="form-crea-gruppo" data-azione="crea-gruppo" novalidate>
            <label for="input-nome-nuovo-gruppo" class="sr-only">Nome del gruppo</label>
            <input
              id="input-nome-nuovo-gruppo"
              type="text"
              name="nomeGruppo"
              placeholder="Nome del nuovo gruppo (obbligatorio e univoco)..."
              required
            />
            <button type="submit" class="btn btn-primario">Crea gruppo</button>
          </form>
        </section>

        <section class="sezione-elenco-gruppi" aria-labelledby="titolo-elenco-gruppi">
          <h2 id="titolo-elenco-gruppi">I tuoi gruppi personalizzati (${gruppi.length})</h2>
          <div class="lista-gruppi-personalizzati" data-lista-gruppi>
            ${
              htmlGruppi ||
              '<p class="stato-vuoto-testo">Non hai ancora creato gruppi personalizzati.</p>'
            }
          </div>
        </section>
      </div>
    `;

    if (avevaFocusRicerca) {
      const nuovoInput = container.querySelector<HTMLInputElement>(
        'input[data-azione="ricerca-stazioni-gruppo"]'
      );
      if (nuovoInput) {
        nuovoInput.focus();
        if (selStart !== null && selEnd !== null) {
          nuovoInput.setSelectionRange(selStart, selEnd);
        }
      }
    }
  }

  function gestisciSubmit(event: Event): void {
    const form = event.target as HTMLElement | null;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.dataset.azione === 'crea-gruppo') {
      event.preventDefault();
      const formData = new FormData(form);
      const nome = String(formData.get('nomeGruppo') ?? '');
      try {
        messaggioErrore = null;
        const creato = deps.statoUtente.creaGruppoPersonalizzato(nome, []);
        gruppoInModificaStazioni = creato.id;
        ricercaStazioniComposizione = '';
        render();
      } catch (err) {
        messaggioErrore = err instanceof Error ? err.message : 'Errore nella creazione del gruppo.';
        render();
      }
      return;
    }

    if (form.dataset.azione === 'salva-rinomina') {
      event.preventDefault();
      const idGruppo = form.dataset.gruppoId;
      if (!idGruppo) return;
      const formData = new FormData(form);
      const nuovoNome = String(formData.get('nuovoNome') ?? '');
      try {
        messaggioErrore = null;
        deps.statoUtente.rinominaGruppoPersonalizzato(idGruppo, nuovoNome);
        gruppoInRinomina = null;
        render();
      } catch (err) {
        messaggioErrore = err instanceof Error ? err.message : 'Errore nella rinomina del gruppo.';
        render();
      }
    }
  }

  function gestisciClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const btnRinomina = target.closest<HTMLElement>('[data-azione="apri-rinomina"]');
    if (btnRinomina) {
      messaggioErrore = null;
      gruppoInRinomina = btnRinomina.dataset.gruppoId ?? null;
      gruppoInConfermaEliminazione = null;
      render();
      return;
    }

    if (target.closest('[data-azione="annulla-rinomina"]')) {
      gruppoInRinomina = null;
      render();
      return;
    }

    const btnComposizione = target.closest<HTMLElement>('[data-azione="apri-composizione"]');
    if (btnComposizione) {
      const idGruppo = btnComposizione.dataset.gruppoId ?? null;
      gruppoInModificaStazioni = gruppoInModificaStazioni === idGruppo ? null : idGruppo;
      ricercaStazioniComposizione = '';
      render();
      return;
    }

    if (target.closest('[data-azione="chiudi-composizione"]')) {
      gruppoInModificaStazioni = null;
      render();
      return;
    }

    const btnChiediElimina = target.closest<HTMLElement>('[data-azione="chiedi-elimina-gruppo"]');
    if (btnChiediElimina) {
      messaggioErrore = null;
      gruppoInConfermaEliminazione = btnChiediElimina.dataset.gruppoId ?? null;
      gruppoInRinomina = null;
      render();
      return;
    }

    if (target.closest('[data-azione="annulla-elimina-gruppo"]')) {
      gruppoInConfermaEliminazione = null;
      render();
      return;
    }

    const btnConfermaElimina = target.closest<HTMLElement>(
      '[data-azione="conferma-elimina-gruppo"]'
    );
    if (btnConfermaElimina) {
      const idGruppo = btnConfermaElimina.dataset.gruppoId;
      if (idGruppo) {
        deps.statoUtente.eliminaGruppoPersonalizzato(idGruppo, costruisciMappaCorsi());
        gruppoInConfermaEliminazione = null;
        if (gruppoInModificaStazioni === idGruppo) {
          gruppoInModificaStazioni = null;
        }
        render();
      }
    }
  }

  function gestisciChange(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (
      target instanceof HTMLInputElement &&
      target.dataset.azione === 'toggle-stazione-in-gruppo'
    ) {
      const idGruppo = target.dataset.gruppoId;
      const idstazione = target.dataset.idstazione;
      if (!idGruppo || !idstazione) return;

      const gruppo = deps.statoUtente
        .ottieniGruppiPersonalizzati()
        .find((g) => g.id === idGruppo);
      if (!gruppo) return;

      const setAttuale = new Set(gruppo.stazioni);
      if (target.checked) {
        setAttuale.add(idstazione);
      } else {
        setAttuale.delete(idstazione);
      }

      deps.statoUtente.aggiornaStazioniGruppoPersonalizzato(idGruppo, Array.from(setAttuale));
      render();
    }
  }

  function gestisciInput(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (
      target instanceof HTMLInputElement &&
      target.dataset.azione === 'ricerca-stazioni-gruppo'
    ) {
      ricercaStazioniComposizione = target.value;
      render();
    }
  }

  container.addEventListener('submit', gestisciSubmit);
  container.addEventListener('click', gestisciClick);
  container.addEventListener('change', gestisciChange);
  container.addEventListener('input', gestisciInput);

  render();

  return {
    aggiorna: render,
    smonta: () => {
      container.removeEventListener('submit', gestisciSubmit);
      container.removeEventListener('click', gestisciClick);
      container.removeEventListener('change', gestisciChange);
      container.removeEventListener('input', gestisciInput);
      container.innerHTML = '';
    },
  };
}

