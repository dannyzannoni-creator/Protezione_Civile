import { describe, it, expect, beforeEach } from 'vitest';
import type {
  CorsoAcqua,
  ServizioCorsiAcqua,
  ServizioSoglie,
  ServizioStatoUtente,
  SogliaPersonalizzata,
  Stazione,
  ValutazioneSoglia,
} from '../../contratti';
import campioneReale from '../../fonte-dati/fixtures/campione-reale.json';
import { mount } from '../index';

const stazioniCampione = campioneReale.slice(1) as Stazione[];

function creaMocksPaginaArpae() {
  const gruppiMonitorati = new Set<string>();
  const stazioniSingole = new Set<string>();
  const soglieCustom = new Map<string, SogliaPersonalizzata>();

  const corsiAcqua: ServizioCorsiAcqua = {
    ottieniFasce: () => [{ nome: 'Po', da: 1, a: 99 }],
    generaIdCorsoAcqua: (nome) => `river:${nome.toLowerCase()}`,
    trovaCorsoPerOrdinamento: (ord) =>
      ord >= 1 && ord <= 99 ? { nome: 'Po', da: 1, a: 99 } : null,
    ordinaStazioni: (stazioni) =>
      [...stazioni].sort((a, b) => a.ordinamento - b.ordinamento),
    raggruppaPerCorsoAcqua: (stazioni): CorsoAcqua[] => [
      {
        id: 'river:po',
        nome: 'Po',
        da: 1,
        a: 99,
        stazioni: [...stazioni]
          .filter((s) => s.ordinamento >= 1 && s.ordinamento <= 99)
          .sort((a, b) => a.ordinamento - b.ordinamento),
      },
    ],
  };

  const soglie: ServizioSoglie = {
    sogliaDefinita: (v) => (v === null || v === undefined || v === 0 ? null : v),
    risolviSoglieEffettive: (staz, ov) => ({
      soglia1: ov ? ov.soglia1 ?? null : staz.soglia1 || null,
      soglia2: ov ? ov.soglia2 ?? null : staz.soglia2 || null,
      soglia3: ov ? ov.soglia3 ?? null : staz.soglia3 || null,
      personalizzata: Boolean(ov),
    }),
    calcolaLivelloSoglia: (val, staz, ov) => {
      if (val === null) return 'nd';
      const s1 = ov ? ov.soglia1 : staz.soglia1 || null;
      if (s1 !== null && s1 !== undefined && val >= s1) return 1;
      return 0;
    },
    valutaStazione: (staz, ov): ValutazioneSoglia => {
      const s1 = ov ? ov.soglia1 ?? null : staz.soglia1 || null;
      const s2 = ov ? ov.soglia2 ?? null : staz.soglia2 || null;
      const s3 = ov ? ov.soglia3 ?? null : staz.soglia3 || null;
      const isGiallo = staz.value !== null && s1 !== null && staz.value >= s1;
      return {
        livello: staz.value === null ? 'nd' : isGiallo ? 1 : 0,
        colore: staz.value === null ? 'grigio' : isGiallo ? 'giallo' : 'verde',
        etichetta: isGiallo ? 'Allerta Gialla' : 'Normale',
        etichettaBreve: isGiallo ? 'Liv. 1 · Giallo' : 'Liv. 0 · Verde',
        soglia1Effettiva: s1,
        soglia2Effettiva: s2,
        soglia3Effettiva: s3,
        personalizzata: Boolean(ov),
      };
    },
    formattaSoglia: (v) => (v === null || v === undefined || v === 0 ? '—' : `${v.toFixed(2)} m`),
  };

  const statoUtente = {
    isGruppoMonitorato: (id: string) => gruppiMonitorati.has(id),
    impostaMonitoraggioGruppo: (id: string, m: boolean) => {
      if (m) gruppiMonitorati.add(id);
      else gruppiMonitorati.delete(id);
    },
    isStazioneAggiuntaSingolarmente: (id: string) => stazioniSingole.has(id),
    isStazioneMonitorata: (id: string) => stazioniSingole.has(id),
    impostaStazioneSingola: (id: string, m: boolean) => {
      if (m) stazioniSingole.add(id);
      else stazioniSingole.delete(id);
    },
    ottieniSogliaPersonalizzata: (id: string) => soglieCustom.get(id) ?? null,
    impostaSogliaPersonalizzata: (s: SogliaPersonalizzata) => {
      soglieCustom.set(s.idstazione, s);
    },
    ripristinaSogliaUfficiale: (id: string) => {
      soglieCustom.delete(id);
    },
  } as unknown as ServizioStatoUtente;

  return { corsiAcqua, soglie, statoUtente };
}

describe('Modulo pagina-arpae (UI jsdom)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('mostra i gruppi per corso d’acqua con stazioni ordinate da monte a valle e consente di monitorare un gruppo', () => {
    const { corsiAcqua, soglie, statoUtente } = creaMocksPaginaArpae();

    const pagina = mount(container, {
      ottieniStazioni: () => stazioniCampione,
      corsiAcqua,
      soglie,
      statoUtente,
    });

    const btnEspandiPo = container.querySelector<HTMLButtonElement>(
      '[data-azione="toggle-espandi-corso"][data-corso-id="river:po"]'
    );
    expect(btnEspandiPo).not.toBeNull();
    btnEspandiPo?.click();

    const itemsPo = Array.from(
      container.querySelectorAll<HTMLElement>('[data-corso-stazioni="river:po"] [data-ordinamento]')
    ).map((el) => Number(el.dataset.ordinamento));
    expect(itemsPo).toEqual([46, 48, 50]);

    const chkPo = container.querySelector<HTMLInputElement>(
      'input[data-azione="toggle-monitora-corso"][data-corso-id="river:po"]'
    );
    if (chkPo) {
      chkPo.checked = true;
      chkPo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(statoUtente.isGruppoMonitorato('river:po')).toBe(true);

    // Ricerca nei gruppi per corso d'acqua
    const inputRicercaCorsi = container.querySelector<HTMLInputElement>(
      'input[data-azione="ricerca-corsi"]'
    );
    expect(inputRicercaCorsi).not.toBeNull();
    if (inputRicercaCorsi) {
      inputRicercaCorsi.value = 'Inesistente';
      inputRicercaCorsi.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(container.querySelectorAll('[data-corso-id]')).toHaveLength(0);

    pagina.smonta();
  });

  it('filtra le stazioni per nome (case-insensitive), mostra "—" per soglie a 0 e consente soglie personalizzate', () => {
    const { corsiAcqua, soglie, statoUtente } = creaMocksPaginaArpae();

    mount(container, {
      ottieniStazioni: () => stazioniCampione,
      corsiAcqua,
      soglie,
      statoUtente,
    });

    const soglieFiscaglia = container.querySelector('[data-soglie-stazione="53227"]');
    expect(soglieFiscaglia?.textContent).toContain('Soglia 1: —');

    const inputRicerca = container.querySelector<HTMLInputElement>(
      'input[data-azione="ricerca-stazioni"]'
    );
    if (inputRicerca) {
      inputRicerca.value = 'MORCIANO';
      inputRicerca.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const cardsVisibili = container.querySelectorAll('[data-stazione-card]');
    expect(cardsVisibili).toHaveLength(1);
    expect(cardsVisibili[0].getAttribute('data-stazione-card')).toBe('11100');

    const btnGrafico = cardsVisibili[0].querySelector<HTMLAnchorElement>(
      'a[data-azione="apri-grafico"][data-idstazione="11100"]'
    );
    expect(btnGrafico).not.toBeNull();
    expect(btnGrafico?.getAttribute('target')).toBe('_blank');
    expect(btnGrafico?.getAttribute('href')).toContain('&r=11100/254,0,0/1,-,-,-/B13215/');
    expect(btnGrafico?.getAttribute('href')).toContain('&stazione=11100&variabile=254,0,0/1,-,-,-/B13215');

    const btnApriSoglie = container.querySelector<HTMLButtonElement>(
      '[data-azione="apri-soglie"][data-idstazione="11100"]'
    );
    btnApriSoglie?.click();

    const formSoglie = container.querySelector<HTMLFormElement>(
      'form[data-azione="salva-soglie"][data-idstazione="11100"]'
    );
    const inputS1 = formSoglie?.querySelector<HTMLInputElement>('input[name="soglia1"]');
    if (inputS1) {
      inputS1.value = '0.01';
    }
    formSoglie?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const badgeStato = container.querySelector('[data-stato-stazione="11100"]');
    expect(badgeStato?.textContent).toContain('Giallo');
    expect(container.querySelector('[data-badge-personalizzata="11100"]')).not.toBeNull();
  });
});
