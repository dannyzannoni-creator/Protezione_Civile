import { describe, it, expect, vi } from 'vitest';
import type { Stazione, ValutazioneSoglia } from '../../contratti';
import { creaServizioNotifiche, type NotificationApiLike } from '../index';

function creaStazioneTest(id: string, nome: string, value: number | null): Stazione {
  return {
    idstazione: id,
    ordinamento: 100,
    nomestaz: nome,
    lon: '100',
    lat: '200',
    soglia1: 1.0,
    soglia2: 2.0,
    soglia3: 3.0,
    value,
    precedente: 'N',
  };
}

function valutaMock(s: Stazione): ValutazioneSoglia {
  if (s.value === null) {
    return {
      livello: 'nd',
      colore: 'grigio',
      etichetta: 'Non disponibile',
      etichettaBreve: 'n.d.',
      soglia1Effettiva: 1,
      soglia2Effettiva: 2,
      soglia3Effettiva: 3,
      personalizzata: false,
    };
  }
  const liv = s.value >= 3 ? 3 : s.value >= 2 ? 2 : s.value >= 1 ? 1 : 0;
  return {
    livello: liv,
    colore: liv === 3 ? 'rosso' : liv === 2 ? 'arancione' : liv === 1 ? 'giallo' : 'verde',
    etichetta: `Livello ${liv}`,
    etichettaBreve: `Liv. ${liv}`,
    soglia1Effettiva: 1,
    soglia2Effettiva: 2,
    soglia3Effettiva: 3,
    personalizzata: false,
  };
}

describe('Modulo notifiche', () => {
  it('chiede il permesso con attivaNotifiche() e invia una sola notifica per ogni aumento di livello', async () => {
    let permessoCorrente: NotificationPermission = 'default';
    const creaNotificaMock = vi.fn();

    const apiMock: NotificationApiLike = {
      get permission() {
        return permessoCorrente;
      },
      requestPermission: vi.fn(async () => {
        permessoCorrente = 'granted';
        return permessoCorrente;
      }),
      creaNotifica: creaNotificaMock,
    };

    const servizio = creaServizioNotifiche({ notificationApi: apiMock, disabilitaSuono: true, disabilitaCookie: true });
    expect(servizio.isAttivo()).toBe(false);

    const esitoPermesso = await servizio.attivaNotifiche();
    expect(esitoPermesso).toBe('granted');
    expect(servizio.isAttivo()).toBe(true);

    // 1. Prima rilevazione (baseline a livello 0): nessuna notifica
    const t0 = [creaStazioneTest('11100', 'Morciano', 0.5)];
    expect(servizio.controllaEInviaNotifiche(t0, valutaMock)).toHaveLength(0);
    expect(creaNotificaMock).not.toHaveBeenCalled();

    // 2. Salita a livello 1 (value = 1.2): invia 1 notifica
    const t1 = [creaStazioneTest('11100', 'Morciano', 1.2)];
    const cambi1 = servizio.controllaEInviaNotifiche(t1, valutaMock);
    expect(cambi1).toHaveLength(1);
    expect(cambi1[0].livelloPrecedente).toBe(0);
    expect(cambi1[0].livelloAttuale).toBe(1);
    expect(creaNotificaMock).toHaveBeenCalledTimes(1);

    // 3. Controllo successivo allo stesso livello 1 (value = 1.4): NON invia una seconda notifica
    const t2 = [creaStazioneTest('11100', 'Morciano', 1.4)];
    expect(servizio.controllaEInviaNotifiche(t2, valutaMock)).toHaveLength(0);
    expect(creaNotificaMock).toHaveBeenCalledTimes(1);

    // 4. Salita a livello 3 (value = 3.5): invia una nuova notifica
    const t3 = [creaStazioneTest('11100', 'Morciano', 3.5)];
    const cambi3 = servizio.controllaEInviaNotifiche(t3, valutaMock);
    expect(cambi3).toHaveLength(1);
    expect(cambi3[0].livelloPrecedente).toBe(1);
    expect(cambi3[0].livelloAttuale).toBe(3);
    expect(creaNotificaMock).toHaveBeenCalledTimes(2);

    // 5. Discesa a livello 2 (value = 2.1): nessuna notifica, ma aggiorna il livello noto
    const t4 = [creaStazioneTest('11100', 'Morciano', 2.1)];
    expect(servizio.controllaEInviaNotifiche(t4, valutaMock)).toHaveLength(0);
    expect(creaNotificaMock).toHaveBeenCalledTimes(2);

    // 6. Superamento quota avviso in metri (es. avviso a 0.40m con valore 0.50m, livello ARPAE resta 0)
    const t5 = [creaStazioneTest('11100', 'Morciano', 0.5)];
    servizio.controllaEInviaNotifiche(t5, valutaMock, () => 0.4);
    expect(creaNotificaMock).toHaveBeenCalledTimes(3);
    expect(creaNotificaMock).toHaveBeenLastCalledWith(
      expect.stringContaining('Avviso Livello Acqua'),
      expect.objectContaining({
        body: expect.stringContaining('0.50 m'),
      })
    );
  });

  it('persiste lo stato attivazione via cookie e lo recupera alla sessione successiva', async () => {
    // Simula document.cookie
    let cookieStore = '';
    Object.defineProperty(document, 'cookie', {
      get: () => cookieStore,
      set: (v: string) => {
        // Semplicistica: sovrascrive tutto per il test
        const [pair] = v.split(';');
        const [key] = pair.split('=');
        // Rimuovi il vecchio valore se presente
        const existing = cookieStore.split('; ').filter((c) => !c.startsWith(key + '='));
        existing.push(pair);
        cookieStore = existing.filter(Boolean).join('; ');
      },
      configurable: true,
    });

    let permessoCorrente: NotificationPermission = 'granted';
    const apiMock: NotificationApiLike = {
      get permission() { return permessoCorrente; },
      requestPermission: vi.fn(async () => { permessoCorrente = 'granted'; return permessoCorrente; }),
      creaNotifica: vi.fn(),
    };

    // Prima sessione: attiva le notifiche (scrive il cookie)
    const servizio1 = creaServizioNotifiche({ notificationApi: apiMock, disabilitaSuono: true });
    await servizio1.attivaNotifiche();
    expect(servizio1.isAttivo()).toBe(true);
    expect(cookieStore).toContain('notifiche_attive=1');

    // Seconda sessione: il cookie indica attivo, il permesso è granted => attivo
    const servizio2 = creaServizioNotifiche({ notificationApi: apiMock, disabilitaSuono: true });
    expect(servizio2.isAttivo()).toBe(true);

    // Disattiva esplicitamente
    servizio2.disattivaNotifiche();
    expect(cookieStore).toContain('notifiche_attive=0');

    // Terza sessione: cookie dice 0 => non attivo
    const servizio3 = creaServizioNotifiche({ notificationApi: apiMock, disabilitaSuono: true });
    expect(servizio3.isAttivo()).toBe(false);
  });

  it('creaNotifica include requireInteraction: true per notifiche persistenti nel centro notifiche', async () => {
    let permessoCorrente: NotificationPermission = 'granted';
    const creaNotificaMock = vi.fn();

    const apiMock: NotificationApiLike = {
      get permission() { return permessoCorrente; },
      requestPermission: vi.fn(async () => { permessoCorrente = 'granted'; return permessoCorrente; }),
      creaNotifica: creaNotificaMock,
    };

    const servizio = creaServizioNotifiche({ notificationApi: apiMock, attivoInizialmente: true, disabilitaSuono: true, disabilitaCookie: true });

    // Baseline
    const t0 = [creaStazioneTest('500', 'TestPersist', 0.5)];
    servizio.controllaEInviaNotifiche(t0, valutaMock);

    // Aumento livello => notifica con requireInteraction
    const t1 = [creaStazioneTest('500', 'TestPersist', 1.5)];
    servizio.controllaEInviaNotifiche(t1, valutaMock);
    expect(creaNotificaMock).toHaveBeenCalledWith(
      expect.stringContaining('Allerta Idrometrica'),
      expect.objectContaining({ requireInteraction: true })
    );
  });
});

