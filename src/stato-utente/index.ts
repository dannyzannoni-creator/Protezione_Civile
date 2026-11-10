import type {
  EsitoEliminazioneGruppo,
  GruppoPersonalizzato,
  ListenerStatoUtente,
  MappaStazioniGruppi,
  ServizioStatoUtente,
  SogliaPersonalizzata,
  StatoUtenteSnapshot,
  VistaGruppo,
} from '../contratti';

export const CHIAVE_STORAGE_DEFAULT = 'monitoraggio_idraulico_er_stato_v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ConfigurazioneStatoUtente {
  storage?: StorageLike;
  chiaveStorage?: string;
  generaUuid?: () => string;
  gruppiCorsiAcquaIniziali?: MappaStazioniGruppi;
}

function generaUuidDefault(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function creaStatoVuoto(): StatoUtenteSnapshot {
  return {
    stazioniSingole: [],
    gruppiMonitorati: [],
    gruppiPersonalizzati: [],
    sogliePersonalizzate: {},
    avvisiLivello: {},
    visteGruppi: {},
  };
}

function clonaSnapshot(stato: StatoUtenteSnapshot): StatoUtenteSnapshot {
  return {
    stazioniSingole: [...stato.stazioniSingole],
    gruppiMonitorati: [...stato.gruppiMonitorati],
    gruppiPersonalizzati: stato.gruppiPersonalizzati.map((g) => ({
      id: g.id,
      nome: g.nome,
      stazioni: [...g.stazioni],
    })),
    sogliePersonalizzate: Object.fromEntries(
      Object.entries(stato.sogliePersonalizzate).map(([k, v]) => [k, { ...v }])
    ),
    avvisiLivello: { ...(stato.avvisiLivello ?? {}) },
    visteGruppi: { ...stato.visteGruppi },
  };
}

function parsaStatoSalvato(jsonRaw: string | null): StatoUtenteSnapshot {
  if (!jsonRaw) {
    return creaStatoVuoto();
  }
  try {
    const parsed: unknown = JSON.parse(jsonRaw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return creaStatoVuoto();
    }
    const obj = parsed as Record<string, unknown>;

    const stazioniSingole = Array.isArray(obj.stazioniSingole)
      ? Array.from(new Set(obj.stazioniSingole.filter((x): x is string => typeof x === 'string')))
      : [];

    const gruppiMonitorati = Array.isArray(obj.gruppiMonitorati)
      ? Array.from(new Set(obj.gruppiMonitorati.filter((x): x is string => typeof x === 'string')))
      : [];

    const gruppiPersonalizzati: GruppoPersonalizzato[] = [];
    if (Array.isArray(obj.gruppiPersonalizzati)) {
      for (const item of obj.gruppiPersonalizzati) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const rec = item as Record<string, unknown>;
          if (typeof rec.id === 'string' && typeof rec.nome === 'string' && Array.isArray(rec.stazioni)) {
            gruppiPersonalizzati.push({
              id: rec.id,
              nome: rec.nome,
              stazioni: Array.from(
                new Set(rec.stazioni.filter((s): s is string => typeof s === 'string'))
              ),
            });
          }
        }
      }
    }

    const sogliePersonalizzate: Record<string, SogliaPersonalizzata> = {};
    if (typeof obj.sogliePersonalizzate === 'object' && obj.sogliePersonalizzate !== null) {
      for (const [idstaz, val] of Object.entries(obj.sogliePersonalizzate as Record<string, unknown>)) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          const sRec = val as Record<string, unknown>;
          sogliePersonalizzate[idstaz] = {
            idstazione: idstaz,
            soglia1: typeof sRec.soglia1 === 'number' ? sRec.soglia1 : null,
            soglia2: typeof sRec.soglia2 === 'number' ? sRec.soglia2 : null,
            soglia3: typeof sRec.soglia3 === 'number' ? sRec.soglia3 : null,
          };
        }
      }
    }

    const visteGruppi: Record<string, VistaGruppo> = {};
    if (typeof obj.visteGruppi === 'object' && obj.visteGruppi !== null) {
      for (const [idGrp, vista] of Object.entries(obj.visteGruppi as Record<string, unknown>)) {
        if (vista === 'estesa' || vista === 'compatta') {
          visteGruppi[idGrp] = vista;
        }
      }
    }

    const avvisiLivello: Record<string, number> = {};
    if (typeof obj.avvisiLivello === 'object' && obj.avvisiLivello !== null) {
      for (const [idStaz, metri] of Object.entries(obj.avvisiLivello as Record<string, unknown>)) {
        if (typeof metri === 'number' && Number.isFinite(metri)) {
          avvisiLivello[idStaz] = metri;
        }
      }
    }

    return {
      stazioniSingole,
      gruppiMonitorati,
      gruppiPersonalizzati,
      sogliePersonalizzate,
      avvisiLivello,
      visteGruppi,
    };
  } catch {
    return creaStatoVuoto();
  }
}

export interface ServizioStatoUtenteEsteso extends ServizioStatoUtente {
  impostaMappaGruppiEsterni(mappa: MappaStazioniGruppi): void;
}

function creaStorageSicuroDefault(): StorageLike {
  const memoria = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      try {
        if (typeof globalThis.localStorage !== 'undefined') {
          return globalThis.localStorage.getItem(key);
        }
      } catch {
        // Fallback in memoria se localStorage è bloccato (es. file:// in modalità restrittiva)
      }
      return memoria.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      memoria.set(key, value);
      try {
        if (typeof globalThis.localStorage !== 'undefined') {
          globalThis.localStorage.setItem(key, value);
        }
      } catch {
        // Fallback in memoria
      }
    },
    removeItem(key: string): void {
      memoria.delete(key);
      try {
        if (typeof globalThis.localStorage !== 'undefined') {
          globalThis.localStorage.removeItem(key);
        }
      } catch {
        // Fallback in memoria
      }
    },
  };
}

/**
 * Crea un'istanza del servizio di gestione dello stato utente persistito in localStorage.
 */
export function creaServizioStatoUtente(
  config: ConfigurazioneStatoUtente = {}
): ServizioStatoUtenteEsteso {
  const storage: StorageLike = config.storage ?? creaStorageSicuroDefault();
  const chiaveStorage = config.chiaveStorage ?? CHIAVE_STORAGE_DEFAULT;
  const generaUuid = config.generaUuid ?? generaUuidDefault;

  let mappaGruppiEsterniRegistrata: MappaStazioniGruppi = {
    ...(config.gruppiCorsiAcquaIniziali ?? {}),
  };

  let stato: StatoUtenteSnapshot = parsaStatoSalvato(storage.getItem(chiaveStorage));
  const listeners = new Set<ListenerStatoUtente>();

  function salvaENotifica(): void {
    try {
      storage.setItem(chiaveStorage, JSON.stringify(stato));
    } catch {
      // Gestione difensiva in caso di QuotaExceededError
    }
    const snapshot = clonaSnapshot(stato);
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function risolviMappaCompletaGruppi(gruppiEsterni?: MappaStazioniGruppi): MappaStazioniGruppi {
    const mappa: MappaStazioniGruppi = {
      ...mappaGruppiEsterniRegistrata,
      ...(gruppiEsterni ?? {}),
    };
    for (const gruppo of stato.gruppiPersonalizzati) {
      mappa[gruppo.id] = gruppo.stazioni;
    }
    return mappa;
  }

  function impostaMappaGruppiEsterni(mappa: MappaStazioniGruppi): void {
    mappaGruppiEsterniRegistrata = { ...mappa };
  }

  function ottieniSnapshot(): StatoUtenteSnapshot {
    return clonaSnapshot(stato);
  }

  function iscrivi(listener: ListenerStatoUtente): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  // --- Stazioni singole ---

  function aggiungiStazioneSingola(idstazione: string): void {
    const id = idstazione.trim();
    if (!id || stato.stazioniSingole.includes(id)) return;
    stato.stazioniSingole.push(id);
    salvaENotifica();
  }

  function rimuoviStazioneSingola(idstazione: string): void {
    const idx = stato.stazioniSingole.indexOf(idstazione);
    if (idx === -1) return;
    stato.stazioniSingole.splice(idx, 1);
    salvaENotifica();
  }

  function impostaStazioneSingola(idstazione: string, monitorata: boolean): void {
    if (monitorata) {
      aggiungiStazioneSingola(idstazione);
    } else {
      rimuoviStazioneSingola(idstazione);
    }
  }

  function isStazioneAggiuntaSingolarmente(idstazione: string): boolean {
    return stato.stazioniSingole.includes(idstazione);
  }

  // --- Gruppi monitorati ---

  function monitoraGruppo(idGruppo: string): void {
    const id = idGruppo.trim();
    if (!id || stato.gruppiMonitorati.includes(id)) return;
    stato.gruppiMonitorati.push(id);
    salvaENotifica();
  }

  function smettiMonitoraggioGruppo(idGruppo: string): void {
    const idx = stato.gruppiMonitorati.indexOf(idGruppo);
    if (idx === -1) return;
    stato.gruppiMonitorati.splice(idx, 1);
    salvaENotifica();
  }

  function impostaMonitoraggioGruppo(idGruppo: string, monitorato: boolean): void {
    if (monitorato) {
      monitoraGruppo(idGruppo);
    } else {
      smettiMonitoraggioGruppo(idGruppo);
    }
  }

  function isGruppoMonitorato(idGruppo: string): boolean {
    return stato.gruppiMonitorati.includes(idGruppo);
  }

  // --- Interrogazione stato di monitoraggio ---

  function ottieniStazioniInGruppiMonitorati(
    gruppiEsterni?: MappaStazioniGruppi,
    escludiIdGruppo?: string
  ): Set<string> {
    const mappaGruppi = risolviMappaCompletaGruppi(gruppiEsterni);
    const setStazioni = new Set<string>();

    for (const idGruppo of stato.gruppiMonitorati) {
      if (escludiIdGruppo && idGruppo === escludiIdGruppo) {
        continue;
      }
      const stazioniDelGruppo = mappaGruppi[idGruppo];
      if (stazioniDelGruppo) {
        for (const idStaz of stazioniDelGruppo) {
          setStazioni.add(idStaz);
        }
      }
    }
    return setStazioni;
  }

  function ottieniStazioniMonitorate(gruppiEsterni?: MappaStazioniGruppi): Set<string> {
    const risultato = ottieniStazioniInGruppiMonitorati(gruppiEsterni);
    for (const idStaz of stato.stazioniSingole) {
      risultato.add(idStaz);
    }
    return risultato;
  }

  function isStazioneMonitorata(
    idstazione: string,
    gruppiEsterni?: MappaStazioniGruppi
  ): boolean {
    if (stato.stazioniSingole.includes(idstazione)) {
      return true;
    }
    const inGruppi = ottieniStazioniInGruppiMonitorati(gruppiEsterni);
    return inGruppi.has(idstazione);
  }

  /**
   * Restituisce le "Stazioni singole" che compaiono nella sezione sotto i gruppi in Monitoraggio:
   * sono le stazioni aggiunte singolarmente che NON appartengono ad alcun gruppo attualmente monitorato.
   */
  function ottieniStazioniSoloSingole(gruppiEsterni?: MappaStazioniGruppi): string[] {
    const inGruppi = ottieniStazioniInGruppiMonitorati(gruppiEsterni);
    return stato.stazioniSingole.filter((idStaz) => !inGruppi.has(idStaz));
  }

  // --- CRUD Gruppi personalizzati & CASCADE DELETE ---

  function ottieniGruppiPersonalizzati(): GruppoPersonalizzato[] {
    return stato.gruppiPersonalizzati.map((g) => ({
      id: g.id,
      nome: g.nome,
      stazioni: [...g.stazioni],
    }));
  }

  function validaNomeUnivoco(nome: string, idGruppoDaIgnorare?: string): string {
    const pulito = nome.trim();
    if (!pulito) {
      throw new Error('Il nome del gruppo è obbligatorio.');
    }
    const conflitto = stato.gruppiPersonalizzati.some(
      (g) => g.id !== idGruppoDaIgnorare && g.nome.toLowerCase() === pulito.toLowerCase()
    );
    if (conflitto) {
      throw new Error(`Esiste già un gruppo personalizzato chiamato "${pulito}".`);
    }
    return pulito;
  }

  function creaGruppoPersonalizzato(
    nome: string,
    stazioniIniziali: readonly string[] = []
  ): GruppoPersonalizzato {
    const nomeValido = validaNomeUnivoco(nome);
    const id = `custom:${generaUuid()}`;
    const stazioniUniche = Array.from(
      new Set(stazioniIniziali.map((s) => s.trim()).filter(Boolean))
    );

    const nuovoGruppo: GruppoPersonalizzato = {
      id,
      nome: nomeValido,
      stazioni: stazioniUniche,
    };

    stato.gruppiPersonalizzati.push(nuovoGruppo);
    // Specifica Sezione 5: "Un gruppo personalizzato appena creato è subito monitorato."
    if (!stato.gruppiMonitorati.includes(id)) {
      stato.gruppiMonitorati.push(id);
    }

    salvaENotifica();
    return {
      ...nuovoGruppo,
      stazioni: [...nuovoGruppo.stazioni],
    };
  }

  function rinominaGruppoPersonalizzato(
    idGruppo: string,
    nuovoNome: string
  ): GruppoPersonalizzato {
    const gruppo = stato.gruppiPersonalizzati.find((g) => g.id === idGruppo);
    if (!gruppo) {
      throw new Error(`Gruppo personalizzato non trovato: ${idGruppo}`);
    }
    const nomeValido = validaNomeUnivoco(nuovoNome, idGruppo);
    gruppo.nome = nomeValido;
    salvaENotifica();
    return {
      ...gruppo,
      stazioni: [...gruppo.stazioni],
    };
  }

  function aggiornaStazioniGruppoPersonalizzato(
    idGruppo: string,
    stazioni: readonly string[]
  ): GruppoPersonalizzato {
    const gruppo = stato.gruppiPersonalizzati.find((g) => g.id === idGruppo);
    if (!gruppo) {
      throw new Error(`Gruppo personalizzato non trovato: ${idGruppo}`);
    }
    gruppo.stazioni = Array.from(new Set(stazioni.map((s) => s.trim()).filter(Boolean)));
    salvaENotifica();
    return {
      ...gruppo,
      stazioni: [...gruppo.stazioni],
    };
  }

  function calcolaImpattoEliminazioneGruppo(
    idGruppo: string,
    gruppiEsterni?: MappaStazioniGruppi
  ): {
    totaleStazioniNelGruppo: number;
    stazioniCheSmetteranno: string[];
    stazioniSalvateDaAltriGruppi: string[];
  } {
    const gruppo = stato.gruppiPersonalizzati.find((g) => g.id === idGruppo);
    if (!gruppo) {
      throw new Error(`Gruppo personalizzato non trovato: ${idGruppo}`);
    }

    const stazioniInAltriGruppiMonitorati = ottieniStazioniInGruppiMonitorati(
      gruppiEsterni,
      idGruppo
    );

    const stazioniCheSmetteranno: string[] = [];
    const stazioniSalvateDaAltriGruppi: string[] = [];

    for (const idStaz of gruppo.stazioni) {
      if (stazioniInAltriGruppiMonitorati.has(idStaz)) {
        stazioniSalvateDaAltriGruppi.push(idStaz);
      } else {
        stazioniCheSmetteranno.push(idStaz);
      }
    }

    return {
      totaleStazioniNelGruppo: gruppo.stazioni.length,
      stazioniCheSmetteranno,
      stazioniSalvateDaAltriGruppi,
    };
  }

  /**
   * CASCADE DELETE (Sezione 5):
   * Eliminando un gruppo personalizzato:
   * 1. Si cancella il gruppo e lo si rimuove dai gruppi monitorati.
   * 2. Si rimuovono TUTTE le stazioni che contiene anche dal set delle stazioni aggiunte singolarmente.
   * 3. Eventuali stazioni presenti anche in un altro gruppo ancora monitorato restano monitorate
   *    esclusivamente tramite quell'altro gruppo.
   */
  function eliminaGruppoPersonalizzato(
    idGruppo: string,
    gruppiEsterni?: MappaStazioniGruppi
  ): EsitoEliminazioneGruppo {
    const idx = stato.gruppiPersonalizzati.findIndex((g) => g.id === idGruppo);
    if (idx === -1) {
      throw new Error(`Gruppo personalizzato non trovato: ${idGruppo}`);
    }

    const impatto = calcolaImpattoEliminazioneGruppo(idGruppo, gruppiEsterni);
    const [gruppoEliminato] = stato.gruppiPersonalizzati.splice(idx, 1);

    // Rimuove il gruppo dai gruppi monitorati
    stato.gruppiMonitorati = stato.gruppiMonitorati.filter((id) => id !== idGruppo);

    // Rimuove tutte le stazioni del gruppo eliminato anche dal set delle stazioni singole
    const setStazioniGruppo = new Set(gruppoEliminato.stazioni);
    stato.stazioniSingole = stato.stazioniSingole.filter(
      (idStaz) => !setStazioniGruppo.has(idStaz)
    );

    // Pulisce eventuale preferenza vista associata al gruppo eliminato
    delete stato.visteGruppi[idGruppo];

    salvaENotifica();

    return {
      gruppoEliminato: {
        ...gruppoEliminato,
        stazioni: [...gruppoEliminato.stazioni],
      },
      stazioniSmesseDiMonitorare: impatto.stazioniCheSmetteranno,
      stazioniRimasteInAltriGruppi: impatto.stazioniSalvateDaAltriGruppi,
    };
  }

  // --- Vista estesa / compatta per gruppo ---

  function ottieniVistaGruppo(idGruppo: string): VistaGruppo {
    return stato.visteGruppi[idGruppo] ?? 'estesa';
  }

  function impostaVistaGruppo(idGruppo: string, vista: VistaGruppo): void {
    stato.visteGruppi[idGruppo] = vista;
    salvaENotifica();
  }

  function alternaVistaGruppo(idGruppo: string): VistaGruppo {
    const attuale = ottieniVistaGruppo(idGruppo);
    const nuova: VistaGruppo = attuale === 'estesa' ? 'compatta' : 'estesa';
    impostaVistaGruppo(idGruppo, nuova);
    return nuova;
  }

  // --- Soglie personalizzate ---

  function ottieniSogliaPersonalizzata(idstazione: string): SogliaPersonalizzata | null {
    const trovata = stato.sogliePersonalizzate[idstazione];
    return trovata ? { ...trovata } : null;
  }

  function ottieniTutteSogliePersonalizzate(): Record<string, SogliaPersonalizzata> {
    return Object.fromEntries(
      Object.entries(stato.sogliePersonalizzate).map(([k, v]) => [k, { ...v }])
    );
  }

  function impostaSogliaPersonalizzata(soglia: SogliaPersonalizzata): void {
    stato.sogliePersonalizzate[soglia.idstazione] = {
      idstazione: soglia.idstazione,
      soglia1: soglia.soglia1,
      soglia2: soglia.soglia2,
      soglia3: soglia.soglia3,
    };
    salvaENotifica();
  }

  function ripristinaSogliaUfficiale(idstazione: string): void {
    if (!(idstazione in stato.sogliePersonalizzate)) return;
    delete stato.sogliePersonalizzate[idstazione];
    salvaENotifica();
  }

  // --- Avvisi livello acqua in metri (indipendenti dalle soglie ARPAE) ---

  function ottieniAvvisoLivello(idstazione: string): number | null {
    const mappa = stato.avvisiLivello ?? {};
    const val = mappa[idstazione];
    return typeof val === 'number' && Number.isFinite(val) ? val : null;
  }

  function ottieniTuttiAvvisiLivello(): Record<string, number> {
    return { ...(stato.avvisiLivello ?? {}) };
  }

  function impostaAvvisoLivello(idstazione: string, metri: number): void {
    if (!Number.isFinite(metri)) return;
    if (!stato.avvisiLivello) {
      stato.avvisiLivello = {};
    }
    stato.avvisiLivello[idstazione] = Number(metri.toFixed(2));
    salvaENotifica();
  }

  function rimuoviAvvisoLivello(idstazione: string): void {
    if (!stato.avvisiLivello || !(idstazione in stato.avvisiLivello)) return;
    delete stato.avvisiLivello[idstazione];
    salvaENotifica();
  }

  return {
    impostaMappaGruppiEsterni,
    ottieniSnapshot,
    iscrivi,
    aggiungiStazioneSingola,
    rimuoviStazioneSingola,
    impostaStazioneSingola,
    isStazioneAggiuntaSingolarmente,
    monitoraGruppo,
    smettiMonitoraggioGruppo,
    impostaMonitoraggioGruppo,
    isGruppoMonitorato,
    isStazioneMonitorata,
    ottieniStazioniMonitorate,
    ottieniStazioniSoloSingole,
    ottieniGruppiPersonalizzati,
    creaGruppoPersonalizzato,
    rinominaGruppoPersonalizzato,
    aggiornaStazioniGruppoPersonalizzato,
    calcolaImpattoEliminazioneGruppo,
    eliminaGruppoPersonalizzato,
    ottieniVistaGruppo,
    impostaVistaGruppo,
    alternaVistaGruppo,
    ottieniSogliaPersonalizzata,
    ottieniTutteSogliePersonalizzate,
    impostaSogliaPersonalizzata,
    ripristinaSogliaUfficiale,
    ottieniAvvisoLivello,
    ottieniTuttiAvvisiLivello,
    impostaAvvisoLivello,
    rimuoviAvvisoLivello,
  };
}
