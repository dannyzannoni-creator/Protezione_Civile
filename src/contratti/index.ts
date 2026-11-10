/**
 * Contratti condivisi tra tutti i moduli dell'applicazione di monitoraggio idraulico.
 * Questo modulo esporta esclusivamente tipi, interfacce e costanti di contratto.
 */

export interface Stazione {
  /** Identificativo univoco della stazione (es. "11100") */
  idstazione: string;
  /** Progressivo di ordinamento geografico/idraulico da monte a valle (0 o 9999 = fuori asta) */
  ordinamento: number;
  /** Nome descrittivo della stazione (es. "Morciano di Romagna") */
  nomestaz: string;
  /** Longitudine grezza in coordinate proiettate come stringa */
  lon: string;
  /** Latitudine grezza in coordinate proiettate come stringa */
  lat: string;
  /** Soglia 1 (allerta gialla) in metri; 0 significa non definita */
  soglia1: number;
  /** Soglia 2 (allerta arancione) in metri; 0 significa non definita */
  soglia2: number;
  /** Soglia 3 (allerta rossa) in metri; 0 significa non definita */
  soglia3: number;
  /** Livello idrometrico misurato in metri, oppure null se non disponibile */
  value: number | null;
  /** Flag testuale grezzo non documentato (es. "S") */
  precedente: string | null;
}

export interface RispostaSensori {
  /** Istante di riferimento reale restituito dal primo elemento {"time": "..."} in ms epoch */
  time: number;
  /** Istante richiesto all'API (arrotondato all'ora) in ms epoch */
  timeRichiesto: number;
  /** Numero di tentativi effettuati (1 = primo tentativo riuscito, fino a 4 con 3 retry a -1h) */
  tentativi: number;
  /** Elenco delle stazioni idrometriche validate */
  stazioni: Stazione[];
}

export interface DatiSensoriConStorico {
  /** Rilevazione attuale (o più recente con valori validi) */
  corrente: RispostaSensori;
  /** Rilevazione precedente principale (time - 15 minuti o fallback a time - 1 ora) per il calcolo del trend */
  precedente: RispostaSensori | null;
  /** Rilevazione a time - 15 minuti rispetto a corrente.time */
  precedente15Min?: RispostaSensori | null;
  /** Rilevazione a time - 1 ora rispetto a corrente.time */
  precedenteUnOra?: RispostaSensori | null;
}

export interface OpzioniScaricamento {
  /** Timestamp di partenza in ms epoch (default: ora corrente arrotondata per difetto all'ora) */
  timeMs?: number;
  /** Numero massimo di retry all'indietro di 1h se tutti i value sono null (default: 3) */
  maxTentativiNull?: number;
  /** Se true, ignora la cache in memoria per ottenere i dati freschi da ARPAE */
  bypassaCache?: boolean;
}

export interface ServizioFonteDati {
  calcolaTimeRiferimento(nowMs?: number): number;
  scaricaStazioni(opzioni?: OpzioniScaricamento): Promise<RispostaSensori>;
  scaricaConStorico(nowMs?: number, bypassaCache?: boolean): Promise<DatiSensoriConStorico>;
  svuotaCache(): void;
}

export interface FasciaCorsoAcqua {
  /** Nome ufficiale del corso d'acqua (es. "Po", "Reno") */
  nome: string;
  /** Limite inferiore (incluso) dell'ordinamento */
  da: number;
  /** Limite superiore (incluso) dell'ordinamento */
  a: number;
}

export type DirezioneOrdinamento = 'CRESCENTE' | 'DECRESCENTE';

export interface CorsoAcqua {
  /** ID stabile nel formato river:<slug-del-nome> */
  id: string;
  /** Nome del corso d'acqua */
  nome: string;
  /** Limite inferiore della fascia d'ordinamento */
  da: number;
  /** Limite superiore della fascia d'ordinamento */
  a: number;
  /** Stazioni appartenenti al corso d'acqua, ordinate da monte a valle */
  stazioni: Stazione[];
}

export interface ServizioCorsiAcqua {
  ottieniFasce(): readonly FasciaCorsoAcqua[];
  generaIdCorsoAcqua(nome: string): string;
  trovaCorsoPerOrdinamento(
    ordinamento: number,
    fasce?: readonly FasciaCorsoAcqua[]
  ): FasciaCorsoAcqua | null;
  ordinaStazioni(
    stazioni: readonly Stazione[],
    direzione?: DirezioneOrdinamento
  ): Stazione[];
  raggruppaPerCorsoAcqua(
    stazioni: readonly Stazione[],
    fasce?: readonly FasciaCorsoAcqua[],
    direzione?: DirezioneOrdinamento
  ): CorsoAcqua[];
}

/**
 * Livelli di soglia idrometrica:
 * - 0: verde (sotto soglia1, oppure nessuna soglia definita)
 * - 1: giallo (value >= soglia1)
 * - 2: arancione (value >= soglia2)
 * - 3: rosso (value >= soglia3)
 * - 'nd': grigio (value === null)
 */
export type LivelloSoglia = 0 | 1 | 2 | 3 | 'nd';

export type ColoreSoglia = 'verde' | 'giallo' | 'arancione' | 'rosso' | 'grigio';

export interface SoglieStazione {
  soglia1?: number | null;
  soglia2?: number | null;
  soglia3?: number | null;
}

export interface SogliaPersonalizzata {
  idstazione: string;
  soglia1: number | null;
  soglia2: number | null;
  soglia3: number | null;
}

export interface SoglieEffettive {
  soglia1: number | null;
  soglia2: number | null;
  soglia3: number | null;
  personalizzata: boolean;
}

export interface ValutazioneSoglia {
  livello: LivelloSoglia;
  colore: ColoreSoglia;
  etichetta: string;
  etichettaBreve: string;
  soglia1Effettiva: number | null;
  soglia2Effettiva: number | null;
  soglia3Effettiva: number | null;
  personalizzata: boolean;
}

export interface ServizioSoglie {
  sogliaDefinita(valore: number | null | undefined): number | null;
  risolviSoglieEffettive(
    stazione: SoglieStazione,
    override?: SoglieStazione | null
  ): SoglieEffettive;
  calcolaLivelloSoglia(
    value: number | null,
    soglieUfficiali: SoglieStazione,
    override?: SoglieStazione | null
  ): LivelloSoglia;
  valutaStazione(
    stazione: Pick<Stazione, 'value' | 'soglia1' | 'soglia2' | 'soglia3'>,
    override?: SoglieStazione | null
  ): ValutazioneSoglia;
  formattaSoglia(valore: number | null | undefined): string;
}

export type DirezioneTrend = 'in_aumento' | 'in_calo' | 'stabile' | 'nd';

export interface CalcoloTrend {
  /** Variazione oraria in cm/h, oppure null se non calcolabile */
  trendCmOra: number | null;
  /** Direzione del livello idrometrico */
  direzione: DirezioneTrend;
  /** Previsione lineare a +1h in metri, oppure null se non calcolabile */
  previsione1h: number | null;
  /** Previsione lineare a +2h in metri, oppure null se non calcolabile */
  previsione2h: number | null;
  /** Rappresentazione testuale del trend (es. "+12.0 cm/h" o "—") */
  testoTrend: string;
  /** Rappresentazione testuale della previsione +1h (es. "1.32 m (stima)" o "—") */
  testoPrevisione1h: string;
  /** Rappresentazione testuale della previsione +2h (es. "1.44 m (stima)" o "—") */
  testoPrevisione2h: string;
}

export interface ServizioTrend {
  calcolaTrendStazione(
    valoreAttuale: number | null,
    valorePrecedente: number | null,
    oreTrascorse?: number
  ): CalcoloTrend;
  calcolaMappaTrend(
    corrente: RispostaSensori,
    precedente: RispostaSensori | null,
    precedenteUnOra?: RispostaSensori | null
  ): Record<string, CalcoloTrend>;
}

export interface GruppoPersonalizzato {
  /** Identificativo univoco nel formato custom:<uuid> */
  id: string;
  /** Nome univoco assegnato dall'utente */
  nome: string;
  /** Elenco degli idstazione appartenenti al gruppo */
  stazioni: string[];
}

export type VistaGruppo = 'estesa' | 'compatta';

export type FiltroMonitoraggio = 'blu' | 'verde' | 'giallo' | 'arancione' | 'rosso';

export interface EsitoEliminazioneGruppo {
  gruppoEliminato: GruppoPersonalizzato;
  stazioniSmesseDiMonitorare: string[];
  stazioniRimasteInAltriGruppi: string[];
}

export interface StatoUtenteSnapshot {
  stazioniSingole: string[];
  gruppiMonitorati: string[];
  gruppiPersonalizzati: GruppoPersonalizzato[];
  sogliePersonalizzate: Record<string, SogliaPersonalizzata>;
  /** Soglie di notifica personalizzate in metri (indipendenti dalle soglie ARPAE 1/2/3) */
  avvisiLivello?: Record<string, number>;
  visteGruppi: Record<string, VistaGruppo>;
}

export type ListenerStatoUtente = (stato: StatoUtenteSnapshot) => void;

export interface MappaStazioniGruppi {
  /** Mappa da id gruppo (es. river:po o custom:...) a lista di idstazione */
  [idGruppo: string]: readonly string[];
}

export interface ServizioStatoUtente {
  ottieniSnapshot(): StatoUtenteSnapshot;
  iscrivi(listener: ListenerStatoUtente): () => void;
  impostaMappaGruppiEsterni?(mappa: MappaStazioniGruppi): void;

  // Stazioni singole
  aggiungiStazioneSingola(idstazione: string): void;
  rimuoviStazioneSingola(idstazione: string): void;
  impostaStazioneSingola(idstazione: string, monitorata: boolean): void;
  isStazioneAggiuntaSingolarmente(idstazione: string): boolean;

  // Gruppi monitorati (sia river:<slug> sia custom:<uuid>)
  monitoraGruppo(idGruppo: string): void;
  smettiMonitoraggioGruppo(idGruppo: string): void;
  impostaMonitoraggioGruppo(idGruppo: string, monitorato: boolean): void;
  isGruppoMonitorato(idGruppo: string): boolean;

  // Interrogazione stato di monitoraggio effettivo
  isStazioneMonitorata(idstazione: string, gruppiEsterni?: MappaStazioniGruppi): boolean;
  ottieniStazioniMonitorate(gruppiEsterni?: MappaStazioniGruppi): Set<string>;
  ottieniStazioniSoloSingole(gruppiEsterni?: MappaStazioniGruppi): string[];

  // CRUD Gruppi personalizzati
  ottieniGruppiPersonalizzati(): GruppoPersonalizzato[];
  creaGruppoPersonalizzato(nome: string, stazioniIniziali?: readonly string[]): GruppoPersonalizzato;
  rinominaGruppoPersonalizzato(idGruppo: string, nuovoNome: string): GruppoPersonalizzato;
  aggiornaStazioniGruppoPersonalizzato(idGruppo: string, stazioni: readonly string[]): GruppoPersonalizzato;
  calcolaImpattoEliminazioneGruppo(idGruppo: string, gruppiEsterni?: MappaStazioniGruppi): {
    totaleStazioniNelGruppo: number;
    stazioniCheSmetteranno: string[];
    stazioniSalvateDaAltriGruppi: string[];
  };
  eliminaGruppoPersonalizzato(idGruppo: string, gruppiEsterni?: MappaStazioniGruppi): EsitoEliminazioneGruppo;

  // Vista estesa/compatta per gruppo
  ottieniVistaGruppo(idGruppo: string): VistaGruppo;
  impostaVistaGruppo(idGruppo: string, vista: VistaGruppo): void;
  alternaVistaGruppo(idGruppo: string): VistaGruppo;

  // Soglie personalizzate
  ottieniSogliaPersonalizzata(idstazione: string): SogliaPersonalizzata | null;
  ottieniTutteSogliePersonalizzate(): Record<string, SogliaPersonalizzata>;
  impostaSogliaPersonalizzata(soglia: SogliaPersonalizzata): void;
  ripristinaSogliaUfficiale(idstazione: string): void;

  // Avvisi livello acqua in metri (senza modificare le soglie ufficiali ARPAE)
  ottieniAvvisoLivello?(idstazione: string): number | null;
  ottieniTuttiAvvisiLivello?(): Record<string, number>;
  impostaAvvisoLivello?(idstazione: string, metri: number): void;
  rimuoviAvvisoLivello?(idstazione: string): void;
}

export type PermessoNotifiche = 'default' | 'granted' | 'denied' | 'unsupported';

export interface CambioLivelloStazione {
  idstazione: string;
  nomestaz: string;
  livelloPrecedente: 0 | 1 | 2 | 3;
  livelloAttuale: 0 | 1 | 2 | 3;
  valore: number | null;
  etichettaAttuale: string;
}

export interface ServizioNotifiche {
  ottieniPermesso(): PermessoNotifiche;
  isAttivo(): boolean;
  attivaNotifiche(): Promise<PermessoNotifiche>;
  disattivaNotifiche(): void;
  controllaEInviaNotifiche(
    stazioniMonitorate: readonly Stazione[],
    calcolaValutazione: (stazione: Stazione) => ValutazioneSoglia,
    ottieniAvvisoLivelloMetri?: (idstazione: string) => number | null
  ): CambioLivelloStazione[];
  resettaStatoLivelli(): void;
}

export type RottaApp = '#/monitoraggio' | '#/arpae' | '#/gruppi';

export interface IstanzaPagina {
  /** Aggiorna la vista quando cambiano i dati dei sensori o lo stato utente */
  aggiorna(): void;
  /** Rimuove i listener e pulisce il DOM prima dello smontaggio */
  smonta(): void;
}
