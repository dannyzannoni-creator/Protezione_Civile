import { describe, it, expect, beforeEach } from 'vitest';
import type {
  GruppoPersonalizzato,
  ServizioStatoUtente,
  Stazione,
} from '../../contratti';
import campioneReale from '../../fonte-dati/fixtures/campione-reale.json';
import { mount } from '../index';

const stazioniCampione = campioneReale.slice(1) as Stazione[];

function creaStatoUtenteMock() {
  const gruppi: GruppoPersonalizzato[] = [];
  const monitorati = new Set<string>();
  const singole = new Set<string>(['11100']);

  const statoUtente = {
    ottieniGruppiPersonalizzati: () =>
      gruppi.map((g) => ({ ...g, stazioni: [...g.stazioni] })),
    isGruppoMonitorato: (id: string) => monitorati.has(id),
    isStazioneMonitorata: (id: string) =>
      singole.has(id) || gruppi.some((g) => monitorati.has(g.id) && g.stazioni.includes(id)),
    isStazioneAggiuntaSingolarmente: (id: string) => singole.has(id),
    creaGruppoPersonalizzato: (nome: string, stazioniIniziali: readonly string[] = []) => {
      const pulito = nome.trim();
      if (!pulito) throw new Error('Il nome del gruppo è obbligatorio.');
      if (gruppi.some((g) => g.nome.toLowerCase() === pulito.toLowerCase())) {
        throw new Error('Esiste già un gruppo con questo nome.');
      }
      const nuovo: GruppoPersonalizzato = {
        id: 'custom:test-1',
        nome: pulito,
        stazioni: [...stazioniIniziali],
      };
      gruppi.push(nuovo);
      monitorati.add(nuovo.id);
      return nuovo;
    },
    rinominaGruppoPersonalizzato: (id: string, nuovoNome: string) => {
      const g = gruppi.find((x) => x.id === id)!;
      g.nome = nuovoNome.trim();
      return g;
    },
    aggiornaStazioniGruppoPersonalizzato: (id: string, staz: readonly string[]) => {
      const g = gruppi.find((x) => x.id === id)!;
      g.stazioni = [...staz];
      return g;
    },
    calcolaImpattoEliminazioneGruppo: (id: string) => {
      const g = gruppi.find((x) => x.id === id)!;
      return {
        totaleStazioniNelGruppo: g.stazioni.length,
        stazioniCheSmetteranno: [...g.stazioni],
        stazioniSalvateDaAltriGruppi: [],
      };
    },
    eliminaGruppoPersonalizzato: (id: string) => {
      const idx = gruppi.findIndex((x) => x.id === id);
      const [rimosso] = gruppi.splice(idx, 1);
      monitorati.delete(id);
      for (const s of rimosso.stazioni) {
        singole.delete(s);
      }
      return {
        gruppoEliminato: rimosso,
        stazioniSmesseDiMonitorare: rimosso.stazioni,
        stazioniRimasteInAltriGruppi: [],
      };
    },
  } as unknown as ServizioStatoUtente;

  return statoUtente;
}

describe('Modulo pagina-gruppi (UI jsdom)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('crea un gruppo (validando nome obbligatorio e univoco), modifica le stazioni con ricerca, rinomina ed elimina con avviso Cascade Delete', () => {
    const statoUtente = creaStatoUtenteMock();

    mount(container, {
      ottieniStazioni: () => stazioniCampione,
      statoUtente,
    });

    // Tentativo nome vuoto -> mostra errore
    const formCreaVuoto = container.querySelector<HTMLFormElement>('form[data-azione="crea-gruppo"]');
    formCreaVuoto?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(container.querySelector('[data-errore-gruppi]')?.textContent).toContain('obbligatorio');

    // Creazione gruppo valido
    const formCrea = container.querySelector<HTMLFormElement>('form[data-azione="crea-gruppo"]');
    const inputNome = container.querySelector<HTMLInputElement>('#input-nome-nuovo-gruppo');
    if (inputNome) {
      inputNome.value = 'Romagna Costa';
    }
    formCrea?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const gruppi = statoUtente.ottieniGruppiPersonalizzati();
    expect(gruppi).toHaveLength(1);
    const idGruppo = gruppi[0].id;
    expect(statoUtente.isGruppoMonitorato(idGruppo)).toBe(true);

    // Aggiungi stazione 11100 e 12479
    const chk11100 = container.querySelector<HTMLInputElement>(
      'input[data-azione="toggle-stazione-in-gruppo"][data-idstazione="11100"]'
    );
    if (chk11100) {
      chk11100.checked = true;
      chk11100.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const chk12479 = container.querySelector<HTMLInputElement>(
      'input[data-azione="toggle-stazione-in-gruppo"][data-idstazione="12479"]'
    );
    if (chk12479) {
      chk12479.checked = true;
      chk12479.dispatchEvent(new Event('change', { bubbles: true }));
    }

    expect(statoUtente.ottieniGruppiPersonalizzati()[0].stazioni).toEqual(['11100', '12479']);

    // Clic su Elimina -> verifica avviso Cascade Delete con numero stazioni coinvolte
    const btnChiediElimina = container.querySelector<HTMLButtonElement>(
      `[data-azione="chiedi-elimina-gruppo"][data-gruppo-id="${idGruppo}"]`
    );
    btnChiediElimina?.click();

    const boxConferma = container.querySelector(`[data-conferma-eliminazione="${idGruppo}"]`);
    expect(boxConferma).not.toBeNull();
    expect(boxConferma?.textContent).toContain('2 stazioni coinvolte');
    expect(boxConferma?.textContent).toContain('2 stazioni smetteranno completamente di essere monitorate');

    // Conferma eliminazione
    const btnConferma = container.querySelector<HTMLButtonElement>(
      `[data-azione="conferma-elimina-gruppo"][data-gruppo-id="${idGruppo}"]`
    );
    btnConferma?.click();

    expect(statoUtente.ottieniGruppiPersonalizzati()).toHaveLength(0);
    expect(statoUtente.isStazioneMonitorata('11100')).toBe(false);
    expect(statoUtente.isStazioneAggiuntaSingolarmente('11100')).toBe(false);
  });
});
