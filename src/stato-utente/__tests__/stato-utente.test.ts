import { describe, it, expect, beforeEach } from 'vitest';
import { creaServizioStatoUtente, type StorageLike } from '../index';

function creaMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

describe('Modulo stato-utente e Cascade Delete', () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = creaMemoryStorage();
  });

  it('crea un gruppo personalizzato con ID custom:<uuid> e lo imposta subito come monitorato', () => {
    let contatore = 1;
    const servizio = creaServizioStatoUtente({
      storage,
      generaUuid: () => `uuid-${contatore++}`,
    });

    const gruppo = servizio.creaGruppoPersonalizzato('Allerta Romagna', ['11100', '12479']);
    expect(gruppo.id).toBe('custom:uuid-1');
    expect(gruppo.nome).toBe('Allerta Romagna');
    expect(gruppo.stazioni).toEqual(['11100', '12479']);
    expect(servizio.isGruppoMonitorato(gruppo.id)).toBe(true);
    expect(servizio.isStazioneMonitorata('11100')).toBe(true);
    expect(servizio.isStazioneMonitorata('12479')).toBe(true);
  });

  it('impone nome obbligatorio e univoco nei gruppi personalizzati e supporta rinomina e modifica', () => {
    const servizio = creaServizioStatoUtente({ storage });
    const g1 = servizio.creaGruppoPersonalizzato('Bacino Reno', ['3153']);

    expect(() => servizio.creaGruppoPersonalizzato('   ')).toThrow(/obbligatorio/i);
    expect(() => servizio.creaGruppoPersonalizzato('bacino reno')).toThrow(/Esiste già/i);

    const rinominato = servizio.rinominaGruppoPersonalizzato(g1.id, 'Reno Inferiore');
    expect(rinominato.nome).toBe('Reno Inferiore');

    const aggiornato = servizio.aggiornaStazioniGruppoPersonalizzato(g1.id, ['3153', '3152']);
    expect(aggiornato.stazioni).toEqual(['3153', '3152']);
  });

  it('Test obbligatorio Cascade Delete (a): stazione solo nel gruppo eliminato -> non più monitorata', () => {
    const servizio = creaServizioStatoUtente({ storage });
    const gruppo = servizio.creaGruppoPersonalizzato('Gruppo Test A', ['STAZ_SOLO_GRUPPO']);

    expect(servizio.isStazioneMonitorata('STAZ_SOLO_GRUPPO')).toBe(true);

    const esito = servizio.eliminaGruppoPersonalizzato(gruppo.id);
    expect(esito.stazioniSmesseDiMonitorare).toEqual(['STAZ_SOLO_GRUPPO']);
    expect(servizio.isStazioneMonitorata('STAZ_SOLO_GRUPPO')).toBe(false);
    expect(servizio.ottieniStazioniMonitorate().has('STAZ_SOLO_GRUPPO')).toBe(false);
    expect(servizio.ottieniStazioniSoloSingole()).not.toContain('STAZ_SOLO_GRUPPO');
  });

  it('Test obbligatorio Cascade Delete (b): stazione nel gruppo eliminato E aggiunta singolarmente -> non più monitorata e tolta anche dalle stazioni singole', () => {
    const servizio = creaServizioStatoUtente({ storage });

    // L'utente aggiunge la stazione singolarmente dalla pagina ARPAE
    servizio.aggiungiStazioneSingola('STAZ_ANCHE_SINGOLA');
    expect(servizio.isStazioneAggiuntaSingolarmente('STAZ_ANCHE_SINGOLA')).toBe(true);

    // L'utente crea un gruppo personalizzato che contiene quella stazione
    const gruppo = servizio.creaGruppoPersonalizzato('Gruppo Test B', ['STAZ_ANCHE_SINGOLA']);
    expect(servizio.isStazioneMonitorata('STAZ_ANCHE_SINGOLA')).toBe(true);

    // L'utente elimina il gruppo personalizzato
    const esito = servizio.eliminaGruppoPersonalizzato(gruppo.id);

    expect(esito.stazioniSmesseDiMonitorare).toEqual(['STAZ_ANCHE_SINGOLA']);
    expect(servizio.isStazioneAggiuntaSingolarmente('STAZ_ANCHE_SINGOLA')).toBe(false);
    expect(servizio.isStazioneMonitorata('STAZ_ANCHE_SINGOLA')).toBe(false);
    expect(servizio.ottieniStazioniSoloSingole()).not.toContain('STAZ_ANCHE_SINGOLA');
    expect(servizio.ottieniSnapshot().stazioniSingole).not.toContain('STAZ_ANCHE_SINGOLA');
  });

  it('Test obbligatorio Cascade Delete (c): stazione presente anche in un altro gruppo monitorato -> resta monitorata', () => {
    const gruppiCorsiAcqua = {
      'river:secchia': ['12639', '5438'],
    };
    const servizio = creaServizioStatoUtente({
      storage,
      gruppiCorsiAcquaIniziali: gruppiCorsiAcqua,
    });

    // Monitoriamo il corso d'acqua river:secchia e un secondo gruppo personalizzato
    servizio.monitoraGruppo('river:secchia');
    const altroGruppoCustom = servizio.creaGruppoPersonalizzato('Altro Gruppo Attivo', ['3153']);

    // Aggiungiamo 12639 anche singolarmente per verificare che venga tolta dalle singole ma resti monitorata tramite river:secchia
    servizio.aggiungiStazioneSingola('12639');

    // Creiamo il gruppo da eliminare con:
    // - '12639' (presente in river:secchia monitorato)
    // - '3153' (presente in altroGruppoCustom monitorato)
    // - '11100' (presente solo qui)
    const gruppoDaEliminare = servizio.creaGruppoPersonalizzato('Gruppo Da Eliminare', [
      '12639',
      '3153',
      '11100',
    ]);

    const impatto = servizio.calcolaImpattoEliminazioneGruppo(gruppoDaEliminare.id);
    expect(impatto.totaleStazioniNelGruppo).toBe(3);
    expect(impatto.stazioniCheSmetteranno).toEqual(['11100']);
    expect(impatto.stazioniSalvateDaAltriGruppi).toEqual(['12639', '3153']);

    const esito = servizio.eliminaGruppoPersonalizzato(gruppoDaEliminare.id);

    expect(esito.stazioniSmesseDiMonitorare).toEqual(['11100']);
    expect(esito.stazioniRimasteInAltriGruppi).toEqual(['12639', '3153']);

    // 11100 non è più monitorata
    expect(servizio.isStazioneMonitorata('11100')).toBe(false);

    // 12639 e 3153 restano monitorate tramite gli altri gruppi attivi
    expect(servizio.isStazioneMonitorata('12639')).toBe(true);
    expect(servizio.isStazioneMonitorata('3153')).toBe(true);
    expect(servizio.isGruppoMonitorato(altroGruppoCustom.id)).toBe(true);

    // 12639 è stata comunque tolta dal set delle stazioni singole
    expect(servizio.isStazioneAggiuntaSingolarmente('12639')).toBe(false);
  });

  it('persiste e ricarica correttamente viste gruppi e soglie personalizzate da localStorage', () => {
    const servizio1 = creaServizioStatoUtente({ storage });

    expect(servizio1.ottieniVistaGruppo('river:po')).toBe('estesa');
    expect(servizio1.alternaVistaGruppo('river:po')).toBe('compatta');

    servizio1.impostaSogliaPersonalizzata({
      idstazione: '11100',
      soglia1: 0.9,
      soglia2: 1.4,
      soglia3: 1.9,
    });

    // Nuova istanza sullo stesso storage verifica la persistenza
    const servizio2 = creaServizioStatoUtente({ storage });
    expect(servizio2.ottieniVistaGruppo('river:po')).toBe('compatta');
    expect(servizio2.ottieniSogliaPersonalizzata('11100')).toEqual({
      idstazione: '11100',
      soglia1: 0.9,
      soglia2: 1.4,
      soglia3: 1.9,
    });

    servizio2.ripristinaSogliaUfficiale('11100');
    expect(servizio2.ottieniSogliaPersonalizzata('11100')).toBeNull();
  });
});

