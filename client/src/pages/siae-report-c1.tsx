import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Printer, RefreshCw, CheckCircle, Loader2, FileText, Euro, Ticket, Building2, Calendar, History, Eye } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Interfaccia conforme al modello C1 SIAE - Allegato 3 G.U. n.188 12/08/2004
interface C1ReportData {
  reportType: string;
  reportName: string;
  generatedAt: string;
  eventId: string;
  
  // QUADRO A - Dati Identificativi (conforme Allegato 3)
  quadroA: {
    // Dati Organizzatore
    denominazioneOrganizzatore: string;
    codiceFiscaleOrganizzatore: string;
    partitaIvaOrganizzatore: string;
    indirizzoOrganizzatore: string;
    comuneOrganizzatore: string;
    provinciaOrganizzatore: string;
    capOrganizzatore: string;
    
    // Titolare Sistema di Emissione (campo obbligatorio Allegato 3)
    titolareSistemaEmissione: string;
    codiceFiscaleTitolareSistema: string;
    partitaIvaTitolareSistema: string;
    indirizzoTitolareSistema: string;
    comuneTitolareSistema: string;
    provinciaTitolareSistema: string;
    capTitolareSistema: string;
    codiceSistemaEmissione: string;
    
    // Mancato funzionamento sistema (sezione opzionale)
    sistemaFunzionante: boolean;
    dataInizioMalfunzionamento: string | null;
    oraInizioMalfunzionamento: string | null;
    dataFineMalfunzionamento: string | null;
    oraFineMalfunzionamento: string | null;
    
    // Dati Locale/Venue
    codiceLocale: string;
    denominazioneLocale: string;
    indirizzoLocale: string;
    comuneLocale: string;
    provinciaLocale: string;
    capLocale: string;
    capienza: number;
    
    // Dati Evento
    denominazioneEvento: string;
    codiceEvento: string;
    dataEvento: string;
    oraEvento: string;
    oraFineEvento: string;
    tipologiaEvento: string;
    genereEvento: string;
    periodoRiferimento: string;
    dataRiferimento: string | null;
  };
  
  // QUADRO B - Dettaglio Titoli (conforme Allegato 3 con colonne ufficiali)
  quadroB: {
    // Righe dettaglio conformi al modello ufficiale SIAE
    // Colonne: Ordine posto, Settore, Capienza, Tipo titolo, Prezzo unit., 
    // N° titoli emessi, Ricavo lordo, Imposta intratt., Imponibile IVA, N° annullati, IVA lorda
    righeDettaglio: Array<{
      ordinePosto: number;
      settore: string;
      capienza: number;
      tipoTitolo: string;           // Codice TAB.3: I1, RX, OX, etc.
      tipoTitoloDescrizione: string;
      prezzoUnitario: number;
      numeroTitoliEmessi: number;
      ricavoLordo: number;
      impostaIntrattenimenti: number;
      imponibileIva: number;
      numeroTitoliAnnullati: number;
      ivaLorda: number;
    }>;
    
    // Settori aggregati (legacy - per compatibilità)
    settori: Array<{
      ordinePosto: number;
      codiceSettore: string;
      denominazione: string;
      capienza: number;
      interi: { quantita: number; prezzoUnitario: number; totale: number };
      ridotti: { quantita: number; prezzoUnitario: number; totale: number };
      omaggi: { quantita: number; totale: number; prezzoUnitario?: number };
      totaleVenduti: number;
      totaleAnnullati: number;
      totaleIncasso: number;
    }>;
    
    // Riepilogo per tipologia (TAB.3 codici)
    riepilogoTipologie: {
      interi: { codice: string; descrizione: string; quantita: number; prezzoUnitario: number; totale: number };
      ridotti: { codice: string; descrizione: string; quantita: number; prezzoUnitario: number; totale: number };
      omaggi: { codice: string; descrizione: string; quantita: number; prezzoUnitario: number; totale: number };
    };
    
    progressivoEmissione: number;
    totaleBigliettiEmessi: number;
    totaleBigliettiVenduti: number;
    totaleBigliettiAnnullati: number;
    totaleRicavoLordo: number;
    totaleIncassoLordo: number;
    totaleImpostaIntrattenimenti: number;
    totaleImponibileIva: number;
    totaleIvaLorda: number;
  };
  
  // QUADRO C - Imposte
  quadroC: {
    incassoLordo: number;
    aliquotaIVA: number;
    baseImponibileIVA: number;
    importoIVA: number;
    isIntrattenimento: boolean;
    aliquotaImpostaIntrattenimenti: number;
    baseImponibileIntrattenimenti: number;
    importoImpostaIntrattenimenti: number;
    dirittoAutore: number;
    totaleImposte: number;
    incassoNetto: number;
  };
  
  dailySales: Array<{
    date: string;
    ticketsSold: number;
    totalAmount: number;
  }>;
}

interface TransmissionRecord {
  id: string;
  periodDate: string;
  transmissionType: 'daily' | 'monthly';
  status: 'pending' | 'sent' | 'error';
  totalAmount?: string;
  createdAt: string;
}

export default function SiaeReportC1() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Get report type from query string and use as state
  const urlParams = new URLSearchParams(window.location.search);
  const defaultType = urlParams.get('type') || 'giornaliero';
  const defaultDate = urlParams.get('date') || new Date().toISOString().split('T')[0];
  const [reportType, setReportType] = useState<'giornaliero' | 'mensile'>(defaultType as 'giornaliero' | 'mensile');
  const [reportDate, setReportDate] = useState<string>(defaultDate);
  const isMonthly = reportType === 'mensile';

  // Update URL when report type or date changes
  useEffect(() => {
    const newUrl = `${window.location.pathname}?type=${reportType}&date=${reportDate}`;
    window.history.replaceState({}, '', newUrl);
  }, [reportType, reportDate]);

  const { data: report, isLoading, error, isFetching } = useQuery<C1ReportData>({
    queryKey: ['/api/siae/ticketed-events', id, 'reports', 'c1', reportType, reportDate],
    queryFn: async () => {
      const res = await fetch(`/api/siae/ticketed-events/${id}/reports/c1?type=${reportType}&date=${reportDate}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Errore nel caricamento del report');
      }
      return res.json();
    },
    enabled: !!id,
    refetchOnMount: 'always',
    staleTime: 0,
    gcTime: 0,
    placeholderData: undefined,
  });

  // Fetch transmission history
  const { data: transmissions, isLoading: transmissionsLoading } = useQuery<TransmissionRecord[]>({
    queryKey: ['/api/siae/ticketed-events', id, 'transmissions'],
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['/api/siae/ticketed-events', id, 'reports', 'c1', reportType] 
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Inviato';
      case 'error': return 'Errore';
      case 'pending': return 'In attesa';
      default: return status;
    }
  };

  if (isLoading || (isFetching && !report)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">Errore nel caricamento del report</p>
        <Button variant="outline" onClick={() => setLocation("/siae/ticketed-events")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Torna indietro
        </Button>
      </div>
    );
  }

  // Estrai dati dai Quadri
  const { quadroA, quadroB, quadroC } = report;
  
  const eventDate = quadroA.dataEvento ? new Date(quadroA.dataEvento) : new Date();
  const reportDisplayDate = quadroA.dataRiferimento ? new Date(quadroA.dataRiferimento) : eventDate;
  const formattedDate = reportDisplayDate.toLocaleDateString('it-IT');
  const transmissionDate = new Date().toLocaleDateString('it-IT');
  const monthName = eventDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  const totalCapacity = quadroA.capienza;
  const totalEmessi = quadroB.totaleBigliettiEmessi;
  const totalRicavoLordo = quadroB.totaleIncassoLordo;
  const imponibileIva = quadroC.baseImponibileIVA;
  const ivaLorda = quadroC.importoIVA;

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-report-c1">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%;
              background: white !important;
              color: black !important;
            }
            .no-print { display: none !important; }
            .print-area table { border-collapse: collapse; }
            .print-area td, .print-area th { border: 1px solid black; }
          }
        `}</style>

        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Report C1 - Riepilogo Titoli</h1>
              <p className="text-muted-foreground">{quadroA.denominazioneEvento} - {formattedDate}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" /> Aggiorna
            </Button>
            <Button variant="outline" onClick={handlePrint} data-testid="button-print">
              <Printer className="w-4 h-4 mr-2" /> Stampa
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 no-print">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Biglietti Emessi</span>
              </div>
              <div className="text-2xl font-bold">{totalEmessi}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Euro className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Ricavo Lordo</span>
              </div>
              <div className="text-2xl font-bold">{totalRicavoLordo.toFixed(2)} €</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">IVA</span>
              </div>
              <div className="text-2xl font-bold">{ivaLorda.toFixed(2)} €</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">Capienza Totale</span>
              </div>
              <div className="text-2xl font-bold">{totalCapacity}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-4 gap-4 no-print">
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Tipo e Periodo Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                  <Select value={reportType} onValueChange={(value: 'giornaliero' | 'mensile') => setReportType(value)}>
                    <SelectTrigger data-testid="select-report-type">
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="giornaliero">Giornaliero</SelectItem>
                      <SelectItem value="mensile">Mensile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isMonthly ? 'Mese' : 'Data'}
                  </label>
                  <input
                    type={isMonthly ? 'month' : 'date'}
                    value={isMonthly ? reportDate.substring(0, 7) : reportDate}
                    onChange={(e) => setReportDate(isMonthly ? `${e.target.value}-01` : e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="input-report-date"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isMonthly 
                  ? "Report cumulativo per l'intero mese selezionato" 
                  : "Report dettagliato per la data selezionata"}
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Storico Trasmissioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transmissionsLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !transmissions || transmissions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessuna trasmissione ancora effettuata</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transmissions.map((t) => (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between p-2 border rounded-md"
                      data-testid={`transmission-${t.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {format(new Date(t.periodDate), 'dd/MM/yyyy', { locale: it })}
                        </span>
                        <Badge variant="outline">
                          {t.transmissionType === 'daily' ? 'Giornaliero' : 'Mensile'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.totalAmount && (
                          <span className="text-sm text-muted-foreground">
                            €{Number(t.totalAmount).toFixed(2)}
                          </span>
                        )}
                        <Badge variant={getStatusBadgeVariant(t.status)}>
                          {getStatusLabel(t.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div ref={printRef} className="print-area bg-white text-black p-8 max-w-[210mm] mx-auto font-serif text-sm rounded-lg border">
          <div className="text-right text-xs mb-2">mod. C 1 fronte</div>
          
          <h1 className="text-center font-bold text-lg mb-4 uppercase tracking-wide">
            RIEPILOGO TITOLI D'ACCESSO PER EVENTO
          </h1>

          <div className="flex gap-8 mb-4 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={!isMonthly} readOnly className="w-3 h-3" />
              Riep. giornaliero del <span className="border-b border-black px-2 min-w-[80px]">{formattedDate}</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={isMonthly} readOnly className="w-3 h-3" />
              Riep. mensile del <span className="border-b border-black px-2 min-w-[80px]">{isMonthly ? monthName : "............"}</span>
            </label>
          </div>

          <div className="flex gap-4 mb-4 text-xs">
            <span>Dal giorno <span className="border-b border-black px-2">{formattedDate}</span></span>
            <span>alle ore <span className="border-b border-black px-2">{quadroA.oraEvento || "21:00"}</span></span>
            <span>al giorno <span className="border-b border-black px-2">{formattedDate}</span></span>
            <span>alle ore <span className="border-b border-black px-2">06:00</span></span>
          </div>

          <div className="text-xs mb-6">
            Trasmesso in data <span className="border-b border-black px-2">{transmissionDate}</span>
          </div>

          <div className="border border-black mb-4">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
              QUADRO A - DATI IDENTIFICATIVI
            </div>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="border border-black p-1 w-1/4 font-semibold">ORGANIZZATORE</td>
                  <td className="border border-black p-1" colSpan={3}>{quadroA.denominazioneOrganizzatore}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">CODICE FISCALE</td>
                  <td className="border border-black p-1">{quadroA.codiceFiscaleOrganizzatore}</td>
                  <td className="border border-black p-1 font-semibold">PARTITA IVA</td>
                  <td className="border border-black p-1">{quadroA.partitaIvaOrganizzatore}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">INDIRIZZO</td>
                  <td className="border border-black p-1">{quadroA.indirizzoOrganizzatore || 'N/D'}</td>
                  <td className="border border-black p-1 font-semibold">COMUNE</td>
                  <td className="border border-black p-1">{quadroA.comuneOrganizzatore || 'N/D'} ({quadroA.provinciaOrganizzatore || ''}) - {quadroA.capOrganizzatore || ''}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-black p-1 font-semibold">TITOLARE SISTEMA EMISSIONE</td>
                  <td className="border border-black p-1" colSpan={3}>{quadroA.titolareSistemaEmissione || quadroA.denominazioneOrganizzatore}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">C.F. TITOLARE SISTEMA</td>
                  <td className="border border-black p-1">{quadroA.codiceFiscaleTitolareSistema || 'N/D'}</td>
                  <td className="border border-black p-1 font-semibold">P.IVA TITOLARE SISTEMA</td>
                  <td className="border border-black p-1">{quadroA.partitaIvaTitolareSistema || 'N/D'}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">INDIRIZZO TITOLARE</td>
                  <td className="border border-black p-1">{quadroA.indirizzoTitolareSistema || 'N/D'}</td>
                  <td className="border border-black p-1 font-semibold">COMUNE TITOLARE</td>
                  <td className="border border-black p-1">{quadroA.comuneTitolareSistema || 'N/D'} ({quadroA.provinciaTitolareSistema || ''}) - {quadroA.capTitolareSistema || ''}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">CODICE SISTEMA EMISSIONE</td>
                  <td className="border border-black p-1" colSpan={3}>{quadroA.codiceSistemaEmissione || 'E4U-SYS'}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">CODICE LOCALE (BA)</td>
                  <td className="border border-black p-1">{quadroA.codiceLocale}</td>
                  <td className="border border-black p-1 font-semibold">DENOMINAZIONE LOCALE</td>
                  <td className="border border-black p-1">{quadroA.denominazioneLocale}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">INDIRIZZO LOCALE</td>
                  <td className="border border-black p-1">{quadroA.indirizzoLocale || 'N/D'}</td>
                  <td className="border border-black p-1 font-semibold">COMUNE LOCALE</td>
                  <td className="border border-black p-1">{quadroA.comuneLocale || 'N/D'} ({quadroA.provinciaLocale || ''}) - {quadroA.capLocale || ''}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">DENOMINAZIONE EVENTO</td>
                  <td className="border border-black p-1" colSpan={3}>{quadroA.denominazioneEvento}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">CODICE EVENTO</td>
                  <td className="border border-black p-1">{quadroA.codiceEvento}</td>
                  <td className="border border-black p-1 font-semibold">GENERE</td>
                  <td className="border border-black p-1">{quadroA.genereEvento}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">DATA EVENTO</td>
                  <td className="border border-black p-1">{formattedDate}</td>
                  <td className="border border-black p-1 font-semibold">ORA INIZIO / FINE</td>
                  <td className="border border-black p-1">{quadroA.oraEvento} - {quadroA.oraFineEvento || '06:00'}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">TIPOLOGIA</td>
                  <td className="border border-black p-1">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={quadroA.tipologiaEvento === 'spettacolo'} readOnly className="w-3 h-3" /> Spettacolo
                    </label>
                    <label className="flex items-center gap-1 ml-2">
                      <input type="checkbox" checked={quadroA.tipologiaEvento === 'intrattenimento'} readOnly className="w-3 h-3" /> Intrattenimento
                    </label>
                  </td>
                  <td className="border border-black p-1 font-semibold">CAPIENZA LOCALE</td>
                  <td className="border border-black p-1">{quadroA.capienza}</td>
                </tr>
              </tbody>
            </table>
            
            {quadroA.sistemaFunzionante === false && (
              <div className="border-t border-black bg-yellow-50 p-2">
                <div className="font-semibold text-xs mb-1">MANCATO FUNZIONAMENTO DEL SISTEMA DI EMISSIONE:</div>
                <div className="text-xs">
                  Dal giorno <span className="border-b border-black px-2">{quadroA.dataInizioMalfunzionamento || '__/__/____'}</span> 
                  alle ore <span className="border-b border-black px-2">{quadroA.oraInizioMalfunzionamento || '__:__'}</span> 
                  al giorno <span className="border-b border-black px-2">{quadroA.dataFineMalfunzionamento || '__/__/____'}</span> 
                  alle ore <span className="border-b border-black px-2">{quadroA.oraFineMalfunzionamento || '__:__'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="border border-black mb-4">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
              QUADRO B - RIEPILOGO TITOLI D'ACCESSO PER EVENTO
            </div>
            <div className="text-right text-xs p-1 border-b border-black">
              Gli importi sono espressi in Euro - Codici TAB.3: I1 = Intero, RX = Ridotto, OX = Omaggio
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-black p-1 text-center w-8">ORD.<br/><span className="font-normal">(1)</span></th>
                  <th className="border border-black p-1 text-left">SETTORE<br/><span className="font-normal">(2)</span></th>
                  <th className="border border-black p-1 text-center">CAP.<br/><span className="font-normal">(3)</span></th>
                  <th className="border border-black p-1 text-center">TIPO TITOLO<br/><span className="font-normal">(4) TAB.3</span></th>
                  <th className="border border-black p-1 text-right">PREZZO<br/>UNIT.<br/><span className="font-normal">(5)</span></th>
                  <th className="border border-black p-1 text-right">N° TITOLI<br/>EMESSI</th>
                  <th className="border border-black p-1 text-right">RICAVO<br/>LORDO<br/><span className="font-normal">(6)</span></th>
                  <th className="border border-black p-1 text-right">IMPOSTA<br/>INTRATT.</th>
                  <th className="border border-black p-1 text-right">IMPONIBILE<br/>IVA</th>
                  <th className="border border-black p-1 text-center">N° ANNUL.</th>
                  <th className="border border-black p-1 text-right">IVA<br/>LORDA</th>
                </tr>
              </thead>
              <tbody>
                {(quadroB.righeDettaglio || []).length > 0 ? (
                  (quadroB.righeDettaglio || []).map((riga, index) => (
                    <tr key={`riga-${index}`}>
                      <td className="border border-black p-1 text-center">{riga.ordinePosto}°</td>
                      <td className="border border-black p-1">{riga.settore}</td>
                      <td className="border border-black p-1 text-center">{riga.capienza}</td>
                      <td className="border border-black p-1 text-center" title={riga.tipoTitoloDescrizione}>
                        {riga.tipoTitolo}
                      </td>
                      <td className="border border-black p-1 text-right">{riga.prezzoUnitario.toFixed(2)}</td>
                      <td className="border border-black p-1 text-right">{riga.numeroTitoliEmessi}</td>
                      <td className="border border-black p-1 text-right">{riga.ricavoLordo.toFixed(2)}</td>
                      <td className="border border-black p-1 text-right">{riga.impostaIntrattenimenti.toFixed(2)}</td>
                      <td className="border border-black p-1 text-right">{riga.imponibileIva.toFixed(2)}</td>
                      <td className="border border-black p-1 text-center">{riga.numeroTitoliAnnullati}</td>
                      <td className="border border-black p-1 text-right">{riga.ivaLorda.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  quadroB.settori.map((settore) => {
                    const settoreVat = settore.totaleIncasso * (quadroC.aliquotaIVA / (100 + quadroC.aliquotaIVA));
                    const settoreNet = settore.totaleIncasso - settoreVat;
                    return (
                      <tr key={settore.codiceSettore}>
                        <td className="border border-black p-1 text-center">{settore.ordinePosto}°</td>
                        <td className="border border-black p-1">{settore.denominazione}</td>
                        <td className="border border-black p-1 text-center">{settore.capienza}</td>
                        <td className="border border-black p-1 text-center">I1</td>
                        <td className="border border-black p-1 text-right">{settore.interi.prezzoUnitario.toFixed(2)}</td>
                        <td className="border border-black p-1 text-right">{settore.totaleVenduti}</td>
                        <td className="border border-black p-1 text-right">{settore.totaleIncasso.toFixed(2)}</td>
                        <td className="border border-black p-1 text-right">{quadroC.isIntrattenimento ? (settoreNet * quadroC.aliquotaImpostaIntrattenimenti / 100).toFixed(2) : '0.00'}</td>
                        <td className="border border-black p-1 text-right">{settoreNet.toFixed(2)}</td>
                        <td className="border border-black p-1 text-center">{settore.totaleAnnullati}</td>
                        <td className="border border-black p-1 text-right">{settoreVat.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-black p-1" colSpan={5}>TOTALE</td>
                  <td className="border border-black p-1 text-right">{quadroB.totaleBigliettiEmessi || totalEmessi}</td>
                  <td className="border border-black p-1 text-right">{(quadroB.totaleRicavoLordo || totalRicavoLordo).toFixed(2)}</td>
                  <td className="border border-black p-1 text-right">{(quadroB.totaleImpostaIntrattenimenti || quadroC.importoImpostaIntrattenimenti).toFixed(2)}</td>
                  <td className="border border-black p-1 text-right">{(quadroB.totaleImponibileIva || imponibileIva).toFixed(2)}</td>
                  <td className="border border-black p-1 text-center">{quadroB.totaleBigliettiAnnullati}</td>
                  <td className="border border-black p-1 text-right">{(quadroB.totaleIvaLorda || ivaLorda).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <div className="p-2 text-xs border-t border-black">
              <strong>Legenda TAB.3:</strong> I1 = Intero • RX = Ridotto generico • OX = Omaggio generico • 
              Progressivo emissione: {quadroB.progressivoEmissione || totalEmessi}
            </div>
          </div>

          <div className="border border-black mb-4">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
              QUADRO C - RIEPILOGO CORRISPETTIVI E IMPOSTE
            </div>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="border border-black p-2 w-1/2 font-semibold">Ricavo Lordo</td>
                  <td className="border border-black p-2 text-right">{quadroC.incassoLordo.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-semibold">Base Imponibile IVA</td>
                  <td className="border border-black p-2 text-right">{quadroC.baseImponibileIVA.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-semibold">IVA ({quadroC.aliquotaIVA}%)</td>
                  <td className="border border-black p-2 text-right">{quadroC.importoIVA.toFixed(2)}</td>
                </tr>
                {quadroC.isIntrattenimento && (
                  <>
                    <tr>
                      <td className="border border-black p-2 font-semibold">Base Imponibile Intrattenimenti</td>
                      <td className="border border-black p-2 text-right">{quadroC.baseImponibileIntrattenimenti.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-semibold">Imposta Intrattenimenti ({quadroC.aliquotaImpostaIntrattenimenti}%)</td>
                      <td className="border border-black p-2 text-right">{quadroC.importoImpostaIntrattenimenti.toFixed(2)}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="border border-black p-2 font-semibold">Totale Imposte</td>
                  <td className="border border-black p-2 text-right font-bold">{quadroC.totaleImposte.toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="border border-black p-2 font-bold">INCASSO NETTO</td>
                  <td className="border border-black p-2 text-right font-bold text-lg">{quadroC.incassoNetto.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {quadroB.totaleBigliettiAnnullati > 0 && (
            <div className="border border-black mb-4" data-testid="quadro-annullamenti">
              <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
                QUADRO D - ANNULLAMENTI
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-black p-1">TOTALE BIGLIETTI ANNULLATI</td>
                    <td className="border border-black p-1 text-right">{quadroB.totaleBigliettiAnnullati}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between mt-8 text-xs">
            <div className="w-1/3">
              <div className="border border-black p-2 mb-2 flex items-center gap-2">
                <div className="w-12 h-12 border border-black flex items-center justify-center text-[8px]">
                  SIAE<br/>Timbro
                </div>
                <div>
                  <div className="font-semibold">SIAE DI</div>
                  <div className="border-b border-black w-32 mt-4"></div>
                </div>
              </div>
            </div>
            <div className="w-1/3 text-center">
              <div className="font-semibold mb-2">TITOLARE SISTEMA DI EMISSIONE</div>
              <div className="font-semibold mb-2">ORGANIZZATORE</div>
              <div className="border-b border-black w-48 mx-auto mt-8"></div>
              <div className="text-[10px] mt-1">FIRMA</div>
            </div>
          </div>

          <div className="mt-6 text-[8px] border-t border-black pt-2">
            <p>(1) Prov. AE 23/7/2001 all. A tab. 1</p>
            <p>(2) Prov. AE 23/7/2001 all. A tab. 2</p>
            <p>(3) Prov. AE 23/7/2001 all. A tab. 3</p>
            <p>(4) TOTALE IVA da assolvere: riepilogo I titoli, a pagamento od omaggio, per i quali l'IVA viene liquidata con riferimento alla data di inizio della manifestazione.</p>
            <p>(5) TOTALE IVA già assolta: riepilogo i titoli degli abbonamenti, i titoli il cui corrispettivo è stato certificato con precedente fattura.</p>
          </div>
        </div>
      </div>
    );
  }

  // Mobile version
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          .print-area table { border-collapse: collapse; }
          .print-area td, .print-area th { border: 1px solid black; }
        }
      `}</style>

      <div className="no-print p-4 bg-background border-b flex flex-col gap-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrint} data-testid="button-print">
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo Report</label>
            <Select value={reportType} onValueChange={(value: 'giornaliero' | 'mensile') => setReportType(value)}>
              <SelectTrigger data-testid="select-report-type-mobile">
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="giornaliero">Giornaliero</SelectItem>
                <SelectItem value="mensile">Mensile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {isMonthly ? 'Mese' : 'Data'}
            </label>
            <input
              type={isMonthly ? 'month' : 'date'}
              value={isMonthly ? reportDate.substring(0, 7) : reportDate}
              onChange={(e) => setReportDate(isMonthly ? `${e.target.value}-01` : e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="input-report-date-mobile"
            />
          </div>
        </div>
      </div>

      <div ref={printRef} className="print-area bg-white text-black p-8 max-w-[210mm] mx-auto font-serif text-sm" data-testid="report-c1">
        <div className="text-right text-xs mb-2">mod. C 1 fronte</div>
        
        <h1 className="text-center font-bold text-lg mb-4 uppercase tracking-wide">
          RIEPILOGO TITOLI D'ACCESSO PER EVENTO
        </h1>

        <div className="flex gap-8 mb-4 text-xs">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={!isMonthly} readOnly className="w-3 h-3" />
            Riep. giornaliero del <span className="border-b border-black px-2 min-w-[80px]">{formattedDate}</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={isMonthly} readOnly className="w-3 h-3" />
            Riep. mensile del <span className="border-b border-black px-2 min-w-[80px]">{isMonthly ? monthName : "............"}</span>
          </label>
        </div>

        <div className="flex gap-4 mb-4 text-xs">
          <span>Dal giorno <span className="border-b border-black px-2">{formattedDate}</span></span>
          <span>alle ore <span className="border-b border-black px-2">{quadroA.oraEvento || "21:00"}</span></span>
          <span>al giorno <span className="border-b border-black px-2">{formattedDate}</span></span>
          <span>alle ore <span className="border-b border-black px-2">06:00</span></span>
        </div>

        <div className="text-xs mb-6">
          Trasmesso in data <span className="border-b border-black px-2">{transmissionDate}</span>
        </div>

        <div className="border border-black mb-4">
          <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
            QUADRO A - DATI IDENTIFICATIVI
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="border border-black p-1 w-1/4 font-semibold">ORGANIZZATORE</td>
                <td className="border border-black p-1" colSpan={3}>{quadroA.denominazioneOrganizzatore}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">CODICE FISCALE</td>
                <td className="border border-black p-1">{quadroA.codiceFiscaleOrganizzatore}</td>
                <td className="border border-black p-1 font-semibold">PARTITA IVA</td>
                <td className="border border-black p-1">{quadroA.partitaIvaOrganizzatore}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">CODICE LOCALE (BA)</td>
                <td className="border border-black p-1">{quadroA.codiceLocale}</td>
                <td className="border border-black p-1 font-semibold">LOCALE</td>
                <td className="border border-black p-1">{quadroA.denominazioneLocale}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">DENOMINAZIONE EVENTO</td>
                <td className="border border-black p-1" colSpan={3}>{quadroA.denominazioneEvento}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">CODICE EVENTO</td>
                <td className="border border-black p-1">{quadroA.codiceEvento}</td>
                <td className="border border-black p-1 font-semibold">GENERE</td>
                <td className="border border-black p-1">{quadroA.genereEvento}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">DATA EVENTO</td>
                <td className="border border-black p-1">{formattedDate}</td>
                <td className="border border-black p-1 font-semibold">ORA INIZIO</td>
                <td className="border border-black p-1">{quadroA.oraEvento}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">TIPOLOGIA</td>
                <td className="border border-black p-1">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={quadroA.tipologiaEvento === 'spettacolo'} readOnly className="w-3 h-3" /> Spettacolo
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={quadroA.tipologiaEvento === 'intrattenimento'} readOnly className="w-3 h-3" /> Intrattenimento
                  </label>
                </td>
                <td className="border border-black p-1 font-semibold">CAPIENZA</td>
                <td className="border border-black p-1">{quadroA.capienza}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-black mb-4">
          <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
            QUADRO B - RIEPILOGO TITOLI D'ACCESSO PER EVENTO
          </div>
          <div className="text-right text-xs p-1 border-b border-black">
            Gli importi sono espressi in Euro
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-black p-1 text-left">SETTORE<br/><span className="font-normal">(2)</span></th>
                <th className="border border-black p-1 text-center">CAPIENZA<br/><span className="font-normal">(3)</span></th>
                <th className="border border-black p-1 text-center">TIPO TITOLO<br/><span className="font-normal">(4)</span></th>
                <th className="border border-black p-1 text-right">PREZZO<br/>UNITARIO<br/><span className="font-normal">(5)</span></th>
                <th className="border border-black p-1 text-right">N° TITOLI<br/>EMESSI</th>
                <th className="border border-black p-1 text-right">RICAVO<br/>LORDO<br/><span className="font-normal">(6)</span></th>
                <th className="border border-black p-1 text-right">IMPOSTA<br/>INTRATT.</th>
                <th className="border border-black p-1 text-right">IMPONIBILE<br/>IVA</th>
                <th className="border border-black p-1 text-center">N° TITOLI<br/>ANNULLATI</th>
                <th className="border border-black p-1 text-right">IVA<br/>L'ORDA</th>
              </tr>
            </thead>
            <tbody>
              {quadroB.settori.map((settore) => {
                const settoreVat = settore.totaleIncasso * (quadroC.aliquotaIVA / (100 + quadroC.aliquotaIVA));
                const settoreNet = settore.totaleIncasso - settoreVat;
                return (
                  <tr key={settore.codiceSettore}>
                    <td className="border border-black p-1">{settore.denominazione}</td>
                    <td className="border border-black p-1 text-center">{settore.capienza}</td>
                    <td className="border border-black p-1 text-center">{settore.codiceSettore}</td>
                    <td className="border border-black p-1 text-right">{settore.interi.prezzoUnitario.toFixed(2)}</td>
                    <td className="border border-black p-1 text-right">{settore.totaleVenduti}</td>
                    <td className="border border-black p-1 text-right">{settore.totaleIncasso.toFixed(2)}</td>
                    <td className="border border-black p-1 text-right">{quadroC.isIntrattenimento ? (settoreNet * quadroC.aliquotaImpostaIntrattenimenti / 100).toFixed(2) : '0,00'}</td>
                    <td className="border border-black p-1 text-right">{settoreNet.toFixed(2)}</td>
                    <td className="border border-black p-1 text-center">{settore.totaleAnnullati}</td>
                    <td className="border border-black p-1 text-right">{settoreVat.toFixed(2)}</td>
                  </tr>
                );
              })}
              {quadroB.riepilogoTipologie.ridotti.quantita > 0 && (
                <tr>
                  <td className="border border-black p-1">Ridotti (totale)</td>
                  <td className="border border-black p-1 text-center">-</td>
                  <td className="border border-black p-1 text-center">RID</td>
                  <td className="border border-black p-1 text-right">-</td>
                  <td className="border border-black p-1 text-right">{quadroB.riepilogoTipologie.ridotti.quantita}</td>
                  <td className="border border-black p-1 text-right">{quadroB.riepilogoTipologie.ridotti.totale.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right">-</td>
                  <td className="border border-black p-1 text-right">-</td>
                  <td className="border border-black p-1 text-center">-</td>
                  <td className="border border-black p-1 text-right">-</td>
                </tr>
              )}
              {quadroB.riepilogoTipologie.omaggi.quantita > 0 && (
                <tr>
                  <td className="border border-black p-1">Omaggi (totale)</td>
                  <td className="border border-black p-1 text-center">-</td>
                  <td className="border border-black p-1 text-center">OMA</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                  <td className="border border-black p-1 text-right">{quadroB.riepilogoTipologie.omaggi.quantita}</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                  <td className="border border-black p-1 text-center">-</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                </tr>
              )}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black p-1" colSpan={4}>TOTALE</td>
                <td className="border border-black p-1 text-right">{totalEmessi}</td>
                <td className="border border-black p-1 text-right">{totalRicavoLordo.toFixed(2)}</td>
                <td className="border border-black p-1 text-right">{quadroC.importoImpostaIntrattenimenti.toFixed(2)}</td>
                <td className="border border-black p-1 text-right">{imponibileIva.toFixed(2)}</td>
                <td className="border border-black p-1 text-center">{quadroB.totaleBigliettiAnnullati}</td>
                <td className="border border-black p-1 text-right">{ivaLorda.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-black mb-4">
          <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
            QUADRO C - RIEPILOGO CORRISPETTIVI E IMPOSTE
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="border border-black p-2 w-1/2 font-semibold">Ricavo Lordo</td>
                <td className="border border-black p-2 text-right">{quadroC.incassoLordo.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Base Imponibile IVA</td>
                <td className="border border-black p-2 text-right">{quadroC.baseImponibileIVA.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">IVA ({quadroC.aliquotaIVA}%)</td>
                <td className="border border-black p-2 text-right">{quadroC.importoIVA.toFixed(2)}</td>
              </tr>
              {quadroC.isIntrattenimento && (
                <>
                  <tr>
                    <td className="border border-black p-2 font-semibold">Imposta Intrattenimenti ({quadroC.aliquotaImpostaIntrattenimenti}%)</td>
                    <td className="border border-black p-2 text-right">{quadroC.importoImpostaIntrattenimenti.toFixed(2)}</td>
                  </tr>
                </>
              )}
              <tr>
                <td className="border border-black p-2 font-semibold">Totale Imposte</td>
                <td className="border border-black p-2 text-right font-bold">{quadroC.totaleImposte.toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border border-black p-2 font-bold">INCASSO NETTO</td>
                <td className="border border-black p-2 text-right font-bold text-lg">{quadroC.incassoNetto.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {quadroB.totaleBigliettiAnnullati > 0 && (
          <div className="border border-black mb-4" data-testid="quadro-annullamenti">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
              QUADRO D - ANNULLAMENTI
            </div>
            <table className="w-full text-xs">
              <tbody>
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-black p-1">TOTALE BIGLIETTI ANNULLATI</td>
                  <td className="border border-black p-1 text-right">{quadroB.totaleBigliettiAnnullati}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between mt-8 text-xs">
          <div className="w-1/3">
            <div className="border border-black p-2 mb-2 flex items-center gap-2">
              <div className="w-12 h-12 border border-black flex items-center justify-center text-[8px]">
                SIAE<br/>Timbro
              </div>
              <div>
                <div className="font-semibold">SIAE DI</div>
                <div className="border-b border-black w-32 mt-4"></div>
              </div>
            </div>
          </div>
          <div className="w-1/3 text-center">
            <div className="font-semibold mb-2">TITOLARE SISTEMA DI EMISSIONE</div>
            <div className="font-semibold mb-2">ORGANIZZATORE</div>
            <div className="border-b border-black w-48 mx-auto mt-8"></div>
            <div className="text-[10px] mt-1">FIRMA</div>
          </div>
        </div>

        <div className="mt-6 text-[8px] border-t border-black pt-2">
          <p>(1) Prov. AE 23/7/2001 all. A tab. 1</p>
          <p>(2) Prov. AE 23/7/2001 all. A tab. 2</p>
          <p>(3) Prov. AE 23/7/2001 all. A tab. 3</p>
          <p>(4) TOTALE IVA da assolvere: riepilogo I titoli, a pagamento od omaggio, per i quali l'IVA viene liquidata con riferimento alla data di inizio della manifestazione.</p>
          <p>(5) TOTALE IVA già assolta: riepilogo i titoli degli abbonamenti, i titoli il cui corrispettivo è stato certificato con precedente fattura.</p>
        </div>
      </div>
    </>
  );
}
