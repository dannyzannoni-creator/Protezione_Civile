import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  CorsoAcqua,
  ServizioCorsiAcqua,
  ServizioSoglie,
  ServizioStatoUtente,
  ServizioTrend,
  SogliaPersonalizzata,
  Stazione,
  ValutazioneSoglia,
  VistaGruppo,
} from '../../contratti';
import campioneReale from '../../fonte-dati/fixtures/campione-reale.json';
import { mount } from '../index';

const stazioniCampione = campioneReale.slice(1) as Stazione[];

function creaDipendenzeMockMonitoraggio() {
  const gruppiMonitorati = new Set<string>();
  const singole = new Set<string>();
  const viste = new Map<string, VistaGruppo>();
  const soglieCustom = new Map<string, SogliaPersonalizzata>();

  const corsiAcqua: ServizioCorsiAcqua = {
    ottieniFasce: () => [
      { nome: 'Po', da: 1, a: 99 },
      { nome: 'Secchia', da: 800, a: 899 },
    ],
    generaIdCorsoAcqua: (n) => `river:${n.toLowerCase()}`,
    trovaCorsoPerOrdinamento: () => null,
    ordinaStazioni: (staz) => [...staz].sort((a, b) => a.ordinamento - b.ordinamento),
    raggruppaPerCorsoAcqua: (staz): CorsoAcqua[] => [
      {
        id: 'river:po',
        nome: 'Po',
        da: 1,
        a: 99,
        stazioni: staz
          .filter((s) => s.ordinamento >= 1 && s.ordinamento <= 99)
          .sort((a, b) => a.ordinamento - b.ordinamento),
      },
      {
        id: 'river:secchia',
        nome: 'Secchia',
        da: 800,
        a: 899,
        stazioni: staz
          .filter((s) => s.ordinamento >= 800 && s.ordinamento <= 899)
          .sort((a, b) => a.ordinamento - b.ordinamento),
      },
    ],
  };

  const soglie: ServizioSoglie = {
    sogliaDefinita: (v) => (v === null || v === undefined || v === 0 ? null : v),
    risolviSoglieEffettive: (s, ov) => ({
      soglia1: ov ? ov.soglia1 ?? null : s.soglia1 || null,
      soglia2: ov ? ov.soglia2 ?? null : s.soglia2 || null,
      soglia3: ov ? ov.soglia3 ?? null : s.soglia3 || null,
      personalizzata: Boolean(ov),
    }),
    calcolaLivelloSoglia: () => 0,
    valutaStazione: (s, ov): ValutazioneSoglia => {
      if (s.value === null) {
        return {
          livello: 'nd',
          colore: 'grigio',
          etichetta: 'Non disponibile',
          etichettaBreve: 'n.d. · Grigio',
          soglia1Effettiva: s.soglia1 || null,
          soglia2Effettiva: s.soglia2 || null,
          soglia3Effettiva: s.soglia3 || null,
          personalizzata: Boolean(ov),
        };
      }
      const s3 = ov ? ov.soglia3 : s.soglia3 || null;
      const isRosso = s3 !== null && s3 !== undefined && s.value >= s3;
      return {
        livello: isRosso ? 3 : 0,
        colore: isRosso ? 'rosso' : 'verde',
        etichetta: isRosso ? 'Allerta Rossa' : 'Normale',
        etichettaBreve: isRosso ? 'Liv. 3 · Rosso' : 'Liv. 0 · Verde',
        soglia1Effettiva: ov ? ov.soglia1 ?? null : s.soglia1 || null,
        soglia2Effettiva: ov ? ov.soglia2 ?? null : s.soglia2 || null,
        soglia3Effettiva: s3 ?? null,
        personalizzata: Boolean(ov),
      };
    },
    formattaSoglia: (v) => (v === null || v === undefined || v === 0 ? '—' : `${v.toFixed(2)} m`),
  };

  const trend: ServizioTrend = {
    calcolaTrendStazione: (att, prec) =>
      att !== null && prec !== null
        ? {
            trendCmOra: 10,
            direzione: 'in_aumento',
            previsione1h: att + 0.1,
            previsione2h: att + 0.2,
            testoTrend: '+10.0 cm/h',
            testoPrevisione1h: `${(att + 0.1).toFixed(2)} m (stima)`,
            testoPrevisione2h: `${(att + 0.2).toFixed(2)} m (stima)`,
          }
        : {
            trendCmOra: null,
            direzione: 'nd',
            previsione1h: null,
            previsione2h: null,
            testoTrend: '—',
            testoPrevisione1h: '—',
            testoPrevisione2h: '—',
          },
    calcolaMappaTrend: () => ({}),
  };

  const statoUtente = {
    monitoraGruppo: (id: string) => gruppiMonitorati.add(id),
    aggiungiStazioneSingola: (id: string) => singole.add(id),
    impostaSogliaPersonalizzata: (s: SogliaPersonalizzata) => soglieCustom.set(s.idstazione, s),
    ottieniSogliaPersonalizzata: (id: string) => soglieCustom.get(id) ?? null,
    isGruppoMonitorato: (id: string) => gruppiMonitorati.has(id),
    ottieniGruppiPersonalizzati: () => [],
    ottieniStazioniMonitorate: (mappaEsterna?: Record<string, readonly string[]>) => {
      const set = new Set<string>(singole);
      for (const idGrp of gruppiMonitorati) {
        for (const idStaz of mappaEsterna?.[idGrp] ?? []) {
          set.add(idStaz);
        }
      }
      return set;
    },
    ottieniStazioniSoloSingole: (mappaEsterna?: Record<string, readonly string[]>) => {
      const inGruppi = new Set<string>();
      for (const idGrp of gruppiMonitorati) {
        for (const idStaz of mappaEsterna?.[idGrp] ?? []) {
          inGruppi.add(idStaz);
        }
      }
      return Array.from(singole).filter((id) => !inGruppi.has(id));
    },
    ottieniVistaGruppo: (id: string): VistaGruppo => viste.get(id) ?? 'estesa',
    alternaVistaGruppo: (id: string): VistaGruppo => {
      const att = viste.get(id) ?? 'estesa';
      const nuova: VistaGruppo = att === 'estesa' ? 'compatta' : 'estesa';
      viste.set(id, nuova);
      return nuova;
    },
  } as unknown as ServizioStatoUtente;

  return { corsiAcqua, soglie, trend, statoUtente };
}

describe('Modulo pagina-monitoraggio (UI jsdom)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('mostra lo stato vuoto con rimando alla pagina ARPAE quando non ci sono stazioni monitorate', () => {
    const { corsiAcqua, soglie, trend, statoUtente } = creaDipendenzeMockMonitoraggio();

    mount(container, {
      ottieniStatoDati: () => ({
        caricamento: false,
        errore: null,
        timeRilevazione: 1794150000000,
        stazioni: stazioniCampione,
        mappaTrend: {},
      }),
      richiediAggiornamento: vi.fn(),
      corsiAcqua,
      soglie,
      trend,
      statoUtente,
    });

    const boxVuoto = container.querySelector('[data-stato-vuoto]');
    expect(boxVuoto).not.toBeNull();
    expect(boxVuoto?.querySelector('a[href="#/arpae"]')).not.toBeNull();
  });

  it('verifica i 5 filtri rapidi esclusivi (stazioni "nd" solo nel blu, secondo clic torna al blu, gruppi vuoti nascosti)', () => {
    const { corsiAcqua, soglie, trend, statoUtente } = creaDipendenzeMockMonitoraggio();

    statoUtente.monitoraGruppo('river:secchia');
    statoUtente.aggiungiStazioneSingola('11100');
    statoUtente.impostaSogliaPersonalizzata({
      idstazione: '11100',
      soglia1: 0.005,
      soglia2: 0.01,
      soglia3: 0.015,
    });

    mount(container, {
      ottieniStatoDati: () => ({
        caricamento: false,
        errore: null,
        timeRilevazione: 1794150000000,
        stazioni: stazioniCampione,
        mappaTrend: {},
      }),
      richiediAggiornamento: vi.fn(),
      corsiAcqua,
      soglie,
      trend,
      statoUtente,
    });

    expect(container.querySelector('[data-contatore-filtro="blu"]')?.textContent).toBe('6');
    expect(container.querySelector('[data-contatore-filtro="verde"]')?.textContent).toBe('3');
    expect(container.querySelector('[data-contatore-filtro="rosso"]')?.textContent).toBe('1');
    expect(container.querySelector('[data-stazione-id="12668"]')).not.toBeNull();

    // Clic su VERDE -> nasconde 'nd' (12668) e Stazioni singole (rossa)
    container
      .querySelector<HTMLButtonElement>('[data-azione="seleziona-filtro"][data-filtro="verde"]')
      ?.click();
    expect(container.querySelector('[data-stazione-id="12668"]')).toBeNull();
    expect(container.querySelector('[data-stazione-id="12639"]')).not.toBeNull();
    expect(container.querySelector('[data-sezione-singole]')).toBeNull();

    // Clic su ROSSO -> nasconde river:secchia rimasto vuoto, mostra 11100
    container
      .querySelector<HTMLButtonElement>('[data-azione="seleziona-filtro"][data-filtro="rosso"]')
      ?.click();
    expect(container.querySelector('[data-gruppo-monitorato="river:secchia"]')).toBeNull();
    expect(container.querySelector('[data-stazione-id="11100"]')).not.toBeNull();

    // Secondo clic su ROSSO -> torna a BLU
    container
      .querySelector<HTMLButtonElement>('[data-azione="seleziona-filtro"][data-filtro="rosso"]')
      ?.click();
    expect(container.querySelector('[data-stazione-id="12668"]')).not.toBeNull();
  });

  it('alterna vista estesa e vista compatta salvando la scelta per gruppo e nascondendo valori/trend/previsioni in compatta', () => {
    const { corsiAcqua, soglie, trend, statoUtente } = creaDipendenzeMockMonitoraggio();

    statoUtente.monitoraGruppo('river:po');

    mount(container, {
      ottieniStatoDati: () => ({
        caricamento: false,
        errore: null,
        timeRilevazione: 1794150000000,
        stazioni: stazioniCampione,
        mappaTrend: {
          '5325': trend.calcolaTrendStazione(0.4, 0.3, 1),
        },
      }),
      richiediAggiornamento: vi.fn(),
      corsiAcqua,
      soglie,
      trend,
      statoUtente,
    });

    const cardEstesa = container.querySelector('[data-stazione-id="5325"]');
    expect(cardEstesa?.getAttribute('data-vista')).toBe('estesa');
    expect(cardEstesa?.querySelector('[data-valore]')?.textContent).toBe('0.40 m');
    expect(cardEstesa?.querySelector('[data-trend]')?.textContent).toBe('+10.0 cm/h');
    expect(cardEstesa?.querySelector('[data-prev1h]')?.textContent).toContain('(stima)');

    const btnGrafico = cardEstesa?.querySelector<HTMLAnchorElement>(
      'a[data-azione="apri-grafico"][data-idstazione="5325"]'
    );
    expect(btnGrafico).not.toBeNull();
    expect(btnGrafico?.getAttribute('target')).toBe('_blank');
    expect(btnGrafico?.getAttribute('href')).toContain('&r=5325/254,0,0/1,-,-,-/B13215/');
    expect(btnGrafico?.getAttribute('href')).toContain('&stazione=5325&variabile=254,0,0/1,-,-,-/B13215');

    container
      .querySelector<HTMLButtonElement>(
        '[data-azione="toggle-vista-gruppo"][data-gruppo-id="river:po"]'
      )
      ?.click();

    expect(statoUtente.ottieniVistaGruppo('river:po')).toBe('compatta');
    const cardCompatta = container.querySelector('[data-stazione-id="5325"]');
    expect(cardCompatta?.getAttribute('data-vista')).toBe('compatta');
    expect(cardCompatta?.querySelector('[data-valore]')).toBeNull();
    expect(cardCompatta?.querySelector('[data-trend]')).toBeNull();
    expect(cardCompatta?.querySelector('[data-prev1h]')).toBeNull();
    expect(cardCompatta?.querySelector('[data-soglie]')).toBeNull();
  });
});
