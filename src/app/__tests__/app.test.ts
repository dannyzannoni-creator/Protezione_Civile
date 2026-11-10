import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RispostaSensori, ServizioFonteDati, Stazione } from '../../contratti';
import campioneReale from '../../fonte-dati/fixtures/campione-reale.json';
import { mount, risolviRottaHash, INTERVALLO_AGGIORNAMENTO_MS } from '../index';

const stazioniCampione = campioneReale.slice(1) as Stazione[];

function creaFonteDatiMock(): ServizioFonteDati {
  const corrente: RispostaSensori = {
    time: 1794150000000,
    timeRichiesto: 1794150000000,
    tentativi: 1,
    stazioni: stazioniCampione,
  };
  return {
    calcolaTimeRiferimento: () => 1794150000000,
    scaricaStazioni: async () => corrente,
    scaricaConStorico: async () => ({ corrente, precedente: null }),
    svuotaCache: () => {},
  };
}

describe('Modulo app (Shell, Router hash e Composition Root)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    localStorage.clear();
    window.location.hash = '#/monitoraggio';
  });

  it('risolve correttamente le rotte hash #/monitoraggio, #/arpae e #/gruppi', () => {
    expect(risolviRottaHash('')).toBe('#/monitoraggio');
    expect(risolviRottaHash('#/monitoraggio')).toBe('#/monitoraggio');
    expect(risolviRottaHash('#/arpae')).toBe('#/arpae');
    expect(risolviRottaHash('#/gruppi')).toBe('#/gruppi');
    expect(risolviRottaHash('#/sconosciuta')).toBe('#/monitoraggio');
  });

  it('monta la shell con navigazione fissa a 3 voci e naviga tra Monitoraggio, ARPAE e Gruppi', async () => {
    const app = mount(container, {
      fonteDati: creaFonteDatiMock(),
      intervalloAutoRefreshMs: null,
    });

    // Attende il completamento della promise iniziale di caricamento
    await new Promise((r) => setTimeout(r, 10));

    const navLinks = container.querySelectorAll('[data-nav-rotta]');
    expect(navLinks).toHaveLength(3);
    expect(container.querySelector('.pagina-monitoraggio')).not.toBeNull();

    // Naviga a #/arpae
    window.location.hash = '#/arpae';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(container.querySelector('.pagina-arpae')).not.toBeNull();

    // Naviga a #/gruppi
    window.location.hash = '#/gruppi';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(container.querySelector('.pagina-gruppi')).not.toBeNull();

    app.smonta();
  });

  it('ha intervallo di aggiornamento a 1 minuto ed esegue il controllo periodico', async () => {
    expect(INTERVALLO_AGGIORNAMENTO_MS).toBe(60_000);

    const mockScarica = vi.fn(async () => {
      const corrente: RispostaSensori = {
        time: 1794150000000,
        timeRichiesto: 1794150000000,
        tentativi: 1,
        stazioni: stazioniCampione,
      };
      return { corrente, precedente: null };
    });

    const fonteDatiMock: ServizioFonteDati = {
      calcolaTimeRiferimento: () => 1794150000000,
      scaricaStazioni: async () => ({
        time: 1794150000000,
        timeRichiesto: 1794150000000,
        tentativi: 1,
        stazioni: stazioniCampione,
      }),
      scaricaConStorico: mockScarica,
      svuotaCache: vi.fn(),
    };

    const app = mount(container, {
      fonteDati: fonteDatiMock,
      intervalloAutoRefreshMs: 50, // timer rapido per il test
    });

    // Caricamento iniziale
    await new Promise((r) => setTimeout(r, 20));
    expect(mockScarica.mock.calls.length).toBeGreaterThanOrEqual(1);

    // Attendi scatto del timer periodico
    await new Promise((r) => setTimeout(r, 70));
    expect(mockScarica.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Verifica che abbia passato forzaRete = true mantenendo la cache storica in memoria
    expect(mockScarica).toHaveBeenLastCalledWith(undefined, true);

    app.smonta();
  });
});

