import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Printer, Eye, FileText, Euro, Users, Calendar, RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface SubscriptionData {
  id: string;
  subscriptionCode: string;
  turnType: string;
  eventsCount: number;
  eventsUsed: number;
  totalAmount: number;
  holderName: string;
  status: string;
  validFrom: string;
  validTo: string;
}

interface SubscriptionSummary {
  turnType: string;
  eventsCount: number;
  count: number;
  totalAmount: number;
  cancelled: number;
  tipoTitolo?: string;
  tipoSpettacolo?: string;
}

interface C2ReportData {
  reportType: string;
  reportName: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventGenre: string;
  eventLocation: string;
  generatedAt: string;
  
  quadroA?: {
    denominazioneOrganizzatore: string;
    codiceFiscaleOrganizzatore: string;
    partitaIvaOrganizzatore: string;
    indirizzoOrganizzatore: string;
    comuneOrganizzatore: string;
    provinciaOrganizzatore: string;
    capOrganizzatore: string;
    
    titolareSistemaEmissione: string;
    codiceFiscaleTitolareSistema: string;
    partitaIvaTitolareSistema: string;
    indirizzoTitolareSistema: string;
    comuneTitolareSistema: string;
    provinciaTitolareSistema: string;
    capTitolareSistema: string;
    codiceSistemaEmissione: string;
    
    codiceLocale: string;
    denominazioneLocale: string;
    indirizzoLocale: string;
    comuneLocale: string;
    provinciaLocale: string;
    capLocale: string;
    capienza: number;
    
    periodoRiferimento: string;
    dataRiferimento: string | null;
  };
  
  quadroB?: {
    righeDettaglio: Array<{
      tipoTitolo: string;
      tipoTitoloDescrizione: string;
      codiceAbbonamento: string;
      tipoSpettacolo: string;
      turnoAbbonamento: string;
      numeroVenduti: number;
      importoLordoIncassato: number;
      numeroAnnullati: number;
      numeroEventi: number;
    }>;
    
    totaleAbbonamenti: number;
    totaleAnnullati: number;
    totaleImportoLordo: number;
  };
  
  summary: {
    totalCapacity: number;
    ticketsSold: number;
    ticketsCancelled: number;
    occupancyRate: number;
    subscriptionsSold: number;
    subscriptionsCancelled: number;
    subscriptionRevenue: number;
  };
  financials: {
    grossRevenue: number;
    vatRate: number;
    vatAmount: number;
    netRevenue: number;
    transactionCount: number;
  };
  paymentBreakdown: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  sectorBreakdown: Array<{
    id: string;
    name: string;
    sectorCode: string;
    ticketTypeCode: string;
    capacity: number;
    ticketsSold: number;
    availableSeats: number;
    priceIntero: number;
    grossRevenue: number;
    vatAmount: number;
    netRevenue: number;
  }>;
  subscriptions: SubscriptionData[];
  subscriptionSummary: SubscriptionSummary[];
}

export default function SiaeReportC2() {
  const { id } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionData | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const defaultType = urlParams.get('type') || 'giornaliero';
  const defaultDate = urlParams.get('date') || new Date().toISOString().split('T')[0];
  const [reportType, setReportType] = useState<'giornaliero' | 'mensile'>(defaultType as 'giornaliero' | 'mensile');
  const [reportDate, setReportDate] = useState<string>(defaultDate);
  const isMonthly = reportType === 'mensile';

  useEffect(() => {
    const newUrl = `${window.location.pathname}?type=${reportType}&date=${reportDate}`;
    window.history.replaceState({}, '', newUrl);
  }, [reportType, reportDate]);

  const { data: report, isLoading, error, isFetching } = useQuery<C2ReportData>({
    queryKey: ['/api/siae/ticketed-events', id, 'reports', 'c2', reportType, reportDate],
    queryFn: async () => {
      const res = await fetch(`/api/siae/ticketed-events/${id}/reports/c2?type=${reportType}&date=${reportDate}`, {
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

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['/api/siae/ticketed-events', id, 'reports', 'c2', reportType] 
    });
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
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Torna indietro
        </Button>
      </div>
    );
  }

  const transmissionDate = new Date().toLocaleDateString('it-IT');
  const eventDate = report.eventDate ? new Date(report.eventDate) : new Date();
  const reportDisplayDate = report.quadroA?.dataRiferimento ? new Date(report.quadroA.dataRiferimento) : eventDate;
  const formattedDate = reportDisplayDate.toLocaleDateString('it-IT');
  const monthName = eventDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  const quadroA = report.quadroA || {
    denominazioneOrganizzatore: 'N/D',
    codiceFiscaleOrganizzatore: 'N/D',
    partitaIvaOrganizzatore: 'N/D',
    indirizzoOrganizzatore: 'N/D',
    comuneOrganizzatore: 'N/D',
    provinciaOrganizzatore: '',
    capOrganizzatore: '',
    titolareSistemaEmissione: 'N/D',
    codiceFiscaleTitolareSistema: 'N/D',
    partitaIvaTitolareSistema: 'N/D',
    indirizzoTitolareSistema: 'N/D',
    comuneTitolareSistema: 'N/D',
    provinciaTitolareSistema: '',
    capTitolareSistema: '',
    codiceSistemaEmissione: `E4U-${report.eventId?.substring(0, 8).toUpperCase()}`,
    codiceLocale: 'N/D',
    denominazioneLocale: 'N/D',
    indirizzoLocale: 'N/D',
    comuneLocale: 'N/D',
    provinciaLocale: '',
    capLocale: '',
    capienza: 0,
    periodoRiferimento: 'Mensile',
    dataRiferimento: null,
  };

  const PrintableQuadroA = () => (
    <div className="border border-black mb-4">
      <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
        QUADRO A - Dati anagrafici
      </div>
      <table className="w-full text-xs">
        <tbody>
          <tr>
            <td className="border border-black p-2 w-1/4 font-semibold">ORGANIZZATORE</td>
            <td className="border border-black p-2">{quadroA.denominazioneOrganizzatore}</td>
            <td className="border border-black p-2 w-1/4 font-semibold">COD.FISCALE/PARTITA IVA</td>
            <td className="border border-black p-2">{quadroA.codiceFiscaleOrganizzatore || quadroA.partitaIvaOrganizzatore}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">TITOLARE SISTEMA DI EMISSIONE</td>
            <td className="border border-black p-2">{quadroA.titolareSistemaEmissione || quadroA.denominazioneOrganizzatore}</td>
            <td className="border border-black p-2 font-semibold">COD.FISCALE/PARTITA IVA</td>
            <td className="border border-black p-2">{quadroA.codiceFiscaleTitolareSistema || quadroA.partitaIvaTitolareSistema}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-semibold">CODICE SISTEMA DI EMISSIONE</td>
            <td className="border border-black p-2" colSpan={3}>{quadroA.codiceSistemaEmissione || 'E4U-SYS'}</td>
          </tr>
        </tbody>
      </table>
      <div className="text-right text-xs p-1 border-t border-black">
        Gli importi sono espressi in Euro
      </div>
    </div>
  );

  const PrintableQuadroB = () => (
    <>
      <div className="border border-black mb-4">
        <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
          QUADRO B - Abbonamenti
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-black p-2 text-left" rowSpan={2}>TIPO TITOLO (1)</th>
              <th className="border border-black p-2 text-center" rowSpan={2}>CODICE ABBONAMENTO</th>
              <th className="border border-black p-2 text-center">INTRATTENIMENTI</th>
              <th className="border border-black p-2 text-center">FISSO</th>
              <th className="border border-black p-2 text-right" rowSpan={2}>NUMERO VENDUTI</th>
              <th className="border border-black p-2 text-right" rowSpan={2}>IMPORTO LORDO INCASSATO</th>
              <th className="border border-black p-2 text-center" rowSpan={2}>ABBONAMENTI ANNULLATI</th>
              <th className="border border-black p-2 text-center" rowSpan={2}>NUMERO EVENTI</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border border-black p-2 text-center">SPETTACOLO</th>
              <th className="border border-black p-2 text-center">LIBERO</th>
            </tr>
          </thead>
          <tbody>
            {report.quadroB?.righeDettaglio && report.quadroB.righeDettaglio.length > 0 ? (
              report.quadroB.righeDettaglio.map((riga, index) => (
                <tr key={`riga-${index}`}>
                  <td className="border border-black p-2" title={riga.tipoTitoloDescrizione}>{riga.tipoTitolo}</td>
                  <td className="border border-black p-2 text-center font-mono">{riga.codiceAbbonamento}</td>
                  <td className="border border-black p-2 text-center">{riga.tipoSpettacolo === 'I' ? 'Intrattenimenti' : 'Spettacolo'}</td>
                  <td className="border border-black p-2 text-center">{riga.turnoAbbonamento}</td>
                  <td className="border border-black p-2 text-right">{riga.numeroVenduti}</td>
                  <td className="border border-black p-2 text-right">{riga.importoLordoIncassato.toFixed(2)}</td>
                  <td className="border border-black p-2 text-center">{riga.numeroAnnullati > 0 ? riga.numeroAnnullati : 0}</td>
                  <td className="border border-black p-2 text-center">{riga.numeroEventi}</td>
                </tr>
              ))
            ) : report.subscriptions && report.subscriptions.length > 0 ? (
              report.subscriptions.map((sub, index) => (
                <tr key={sub.id || index}>
                  <td className="border border-black p-2">A1</td>
                  <td className="border border-black p-2 text-center font-mono">{sub.subscriptionCode}</td>
                  <td className="border border-black p-2 text-center">Spettacolo</td>
                  <td className="border border-black p-2 text-center">{sub.turnType || 'F'}</td>
                  <td className="border border-black p-2 text-right">{sub.status !== 'cancelled' ? 1 : 0}</td>
                  <td className="border border-black p-2 text-right">{sub.totalAmount.toFixed(2)}</td>
                  <td className="border border-black p-2 text-center">{sub.status === 'cancelled' ? 1 : 0}</td>
                  <td className="border border-black p-2 text-center">{sub.eventsCount}</td>
                </tr>
              ))
            ) : (
              <>
                <tr>
                  <td className="border border-black p-2 h-8" colSpan={8}></td>
                </tr>
                <tr>
                  <td className="border border-black p-2 h-8" colSpan={8}></td>
                </tr>
                <tr>
                  <td className="border border-black p-1 h-6" colSpan={8}></td>
                </tr>
              </>
            )}
            <tr className="bg-gray-100 font-bold">
              <td className="border border-black p-1 text-center" colSpan={4}>TOTALE</td>
              <td className="border border-black p-1 text-right">{report.quadroB?.totaleAbbonamenti || report.summary.subscriptionsSold || 0}</td>
              <td className="border border-black p-1 text-right">{(report.quadroB?.totaleImportoLordo || report.summary.subscriptionRevenue || 0).toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{report.quadroB?.totaleAnnullati || report.summary.subscriptionsCancelled || 0}</td>
              <td className="border border-black p-1 text-center">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-report-c2-desktop">
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
              <h1 className="text-3xl font-bold">Report C2 - Riepilogo Abbonamenti</h1>
              <p className="text-muted-foreground">
                {report.eventName} - {formattedDate}
              </p>
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
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{report.summary.subscriptionsSold || 0}</div>
                  <p className="text-sm text-muted-foreground">Abbonamenti Venduti</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">€{(report.summary.subscriptionRevenue || 0).toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground">Incasso Totale</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="text-2xl font-bold">{report.summary.subscriptionsCancelled || 0}</div>
                  <p className="text-sm text-muted-foreground">Annullati</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{report.subscriptions?.length || 0}</div>
                  <p className="text-sm text-muted-foreground">Totale Abbonamenti</p>
                </div>
              </div>
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
            <CardHeader>
              <CardTitle className="text-base">Dati Locale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Codice BA:</span>
                  <span className="ml-2 font-medium">{quadroA.codiceLocale}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Capienza:</span>
                  <span className="ml-2 font-medium">{quadroA.capienza}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Locale:</span>
                  <span className="ml-2 font-medium">{quadroA.denominazioneLocale}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="no-print">
          <CardHeader>
            <CardTitle>Dati Anagrafici - Quadro A (Allegato 4 G.U. n.188 12/08/2004)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium w-1/4">Organizzatore</TableCell>
                  <TableCell>{quadroA.denominazioneOrganizzatore}</TableCell>
                  <TableCell className="font-medium w-1/4">Codice Fiscale</TableCell>
                  <TableCell>{quadroA.codiceFiscaleOrganizzatore}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Indirizzo</TableCell>
                  <TableCell>{quadroA.indirizzoOrganizzatore}</TableCell>
                  <TableCell className="font-medium">Comune</TableCell>
                  <TableCell>{quadroA.comuneOrganizzatore} ({quadroA.provinciaOrganizzatore}) - {quadroA.capOrganizzatore}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableCell className="font-medium">Titolare Sistema di Emissione</TableCell>
                  <TableCell>{quadroA.titolareSistemaEmissione}</TableCell>
                  <TableCell className="font-medium">Codice Fiscale Titolare</TableCell>
                  <TableCell>{quadroA.codiceFiscaleTitolareSistema}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">P.IVA Titolare Sistema</TableCell>
                  <TableCell>{quadroA.partitaIvaTitolareSistema}</TableCell>
                  <TableCell className="font-medium">Indirizzo Titolare</TableCell>
                  <TableCell>{quadroA.indirizzoTitolareSistema}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Comune Titolare</TableCell>
                  <TableCell>{quadroA.comuneTitolareSistema} ({quadroA.provinciaTitolareSistema}) - {quadroA.capTitolareSistema}</TableCell>
                  <TableCell className="font-medium">Codice Sistema di Emissione</TableCell>
                  <TableCell>{quadroA.codiceSistemaEmissione}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Codice Locale (BA)</TableCell>
                  <TableCell>{quadroA.codiceLocale}</TableCell>
                  <TableCell className="font-medium">Denominazione Locale</TableCell>
                  <TableCell>{quadroA.denominazioneLocale}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Indirizzo Locale</TableCell>
                  <TableCell>{quadroA.indirizzoLocale}</TableCell>
                  <TableCell className="font-medium">Capienza</TableCell>
                  <TableCell>{quadroA.capienza}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Periodo Riferimento</TableCell>
                  <TableCell colSpan={3}>{isMonthly ? 'Mensile' : 'Giornaliero'} - {formattedDate}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="no-print">
          <CardHeader>
            <CardTitle>Abbonamenti - Quadro B (Allegato 4 G.U. n.188 12/08/2004)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Colonne: Tipo Titolo (TAB.3), Codice, I/S (Intrattenimento/Spettacolo), F/L (Fisso/Libero)
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo Titolo<br/><span className="text-xs font-normal">(TAB.3)</span></TableHead>
                  <TableHead>Codice Abb.</TableHead>
                  <TableHead className="text-center">I/S</TableHead>
                  <TableHead className="text-center">F/L</TableHead>
                  <TableHead className="text-right">Venduti</TableHead>
                  <TableHead className="text-right">Importo Lordo</TableHead>
                  <TableHead className="text-center">Annullati</TableHead>
                  <TableHead className="text-center">N. Eventi</TableHead>
                  <TableHead className="text-center">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.quadroB?.righeDettaglio && report.quadroB.righeDettaglio.length > 0 ? (
                  report.quadroB.righeDettaglio.map((riga, index) => (
                    <TableRow key={`riga-${index}`}>
                      <TableCell>
                        <Badge variant="outline" title={riga.tipoTitoloDescrizione}>{riga.tipoTitolo}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{riga.codiceAbbonamento}</TableCell>
                      <TableCell className="text-center" title={riga.tipoSpettacolo === 'I' ? 'Intrattenimento' : 'Spettacolo'}>
                        <Badge variant={riga.tipoSpettacolo === 'I' ? 'secondary' : 'outline'}>{riga.tipoSpettacolo}</Badge>
                      </TableCell>
                      <TableCell className="text-center" title={riga.turnoAbbonamento === 'F' ? 'Fisso' : 'Libero'}>
                        <Badge variant="outline">{riga.turnoAbbonamento}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{riga.numeroVenduti}</TableCell>
                      <TableCell className="text-right font-medium">€{riga.importoLordoIncassato.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {riga.numeroAnnullati > 0 ? (
                          <Badge variant="destructive">{riga.numeroAnnullati}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">{riga.numeroEventi}</TableCell>
                      <TableCell className="text-center">-</TableCell>
                    </TableRow>
                  ))
                ) : report.subscriptions && report.subscriptions.length > 0 ? (
                  report.subscriptions.map((sub, index) => (
                    <TableRow key={sub.id || index}>
                      <TableCell>
                        <Badge variant="outline">A1</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{sub.subscriptionCode}</TableCell>
                      <TableCell className="text-center">S</TableCell>
                      <TableCell className="text-center">{sub.turnType || 'F'}</TableCell>
                      <TableCell className="text-right">{sub.status !== 'cancelled' ? 1 : '-'}</TableCell>
                      <TableCell className="text-right">€{sub.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {sub.status === 'cancelled' ? (
                          <Badge variant="destructive">1</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">{sub.eventsCount}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedSubscription(sub);
                            setIsDetailDialogOpen(true);
                          }}
                          data-testid={`button-view-subscription-${sub.id || index}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nessun abbonamento registrato
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="no-print">
          <CardContent className="pt-6">
            <Table>
              <TableBody>
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={4} className="text-center">TOTALE</TableCell>
                  <TableCell className="text-right">{report.quadroB?.totaleAbbonamenti || report.summary.subscriptionsSold || 0}</TableCell>
                  <TableCell className="text-right">€{(report.quadroB?.totaleImportoLordo || report.summary.subscriptionRevenue || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">{report.quadroB?.totaleAnnullati || report.summary.subscriptionsCancelled || 0}</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-4 p-3 bg-muted/30 rounded text-sm">
              <strong>Legenda TAB.3:</strong> A1 = Abbonamento generico • 
              <strong> I/S:</strong> I = Intrattenimento, S = Spettacolo • 
              <strong> F/L:</strong> F = Turno Fisso, L = Turno Libero
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dettaglio Abbonamento</DialogTitle>
            </DialogHeader>
            {selectedSubscription && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Codice</p>
                    <p className="font-mono font-medium">{selectedSubscription.subscriptionCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Intestatario</p>
                    <p className="font-medium">{selectedSubscription.holderName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo Turno</p>
                    <p className="font-medium">{selectedSubscription.turnType || 'F'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stato</p>
                    <Badge variant={selectedSubscription.status === 'cancelled' ? 'destructive' : 'default'}>
                      {selectedSubscription.status === 'cancelled' ? 'Annullato' : 'Attivo'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">N. Eventi</p>
                    <p className="font-medium">{selectedSubscription.eventsCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Eventi Utilizzati</p>
                    <p className="font-medium">{selectedSubscription.eventsUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Importo</p>
                    <p className="font-medium text-lg">€{selectedSubscription.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Validità</p>
                    <p className="font-medium text-sm">
                      {selectedSubscription.validFrom ? new Date(selectedSubscription.validFrom).toLocaleDateString('it-IT') : 'N/A'} - {selectedSubscription.validTo ? new Date(selectedSubscription.validTo).toLocaleDateString('it-IT') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div ref={printRef} className="print-area bg-white text-black p-8 max-w-[210mm] mx-auto font-serif text-sm rounded-lg border">
          <h1 className="text-center font-bold text-lg mb-6 uppercase tracking-wide">
            RIEPILOGO ABBONAMENTI
          </h1>

          <div className="flex justify-between items-center mb-6 text-xs">
            <div className="flex gap-6">
              <span>
                Riepilogo giornaliero del <span className="border-b border-black px-2 min-w-[60px] inline-block">{!isMonthly ? formattedDate : ''}</span>
              </span>
              <span>
                Riepilogo mensile del <span className="border-b border-black px-2 min-w-[60px] inline-block font-semibold">{isMonthly ? monthName : ''}</span>
              </span>
              <span>
                Trasmesso in data <span className="border-b border-black px-2 min-w-[60px] inline-block">{transmissionDate}</span>
              </span>
            </div>
            <div className="text-right font-semibold">
              Modello C2
            </div>
          </div>

          <PrintableQuadroA />
          <PrintableQuadroB />

          <div className="flex justify-between mt-8 text-xs">
            <div className="w-1/4">
              <div className="flex items-center gap-2">
                <div className="w-14 h-14 border border-black flex items-center justify-center text-[8px] text-center">
                  SIAE<br/>Timbro e firma
                </div>
                <div>
                  <div className="font-semibold">SIAE DI</div>
                  <div className="border-b border-black w-32 mt-4"></div>
                </div>
              </div>
            </div>
            <div className="w-1/4 text-right">
              <div className="font-semibold mb-2">FIRMA</div>
              <div className="mt-8">
                <div className="text-[10px]">TITOLARE SISTEMA DI EMISSIONE</div>
                <div className="border-b border-black w-40 ml-auto mt-2"></div>
              </div>
              <div className="mt-6">
                <div className="text-[10px]">ORGANIZZATORE</div>
                <div className="border-b border-black w-40 ml-auto mt-2"></div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-[8px] border-t border-black pt-2">
            <p>(1) Tab.3 all. Provv. 23/07/2001</p>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="no-print p-4 bg-background border-b flex items-center justify-between sticky top-0 z-50">
        <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" /> Aggiorna
          </Button>
          <Button variant="outline" onClick={handlePrint} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" /> Stampa
          </Button>
        </div>
      </div>

      <div className="no-print p-4 space-y-4">
        <Card>
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
          </CardContent>
        </Card>
      </div>

      <div ref={printRef} className="print-area bg-white text-black p-6 max-w-[210mm] mx-auto font-serif text-sm" data-testid="report-c2">
        <h1 className="text-center font-bold text-lg mb-4 uppercase tracking-wide">
          RIEPILOGO ABBONAMENTI
        </h1>

        <div className="flex flex-col gap-2 mb-4 text-xs">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <span>
              Riepilogo giornaliero del <span className="border-b border-black px-2 min-w-[50px] inline-block">{!isMonthly ? formattedDate : ''}</span>
            </span>
            <span>
              Riepilogo mensile del <span className="border-b border-black px-2 min-w-[50px] inline-block font-semibold">{isMonthly ? monthName : ''}</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>
              Trasmesso in data <span className="border-b border-black px-2 min-w-[50px] inline-block">{transmissionDate}</span>
            </span>
            <span className="font-semibold">Modello C2</span>
          </div>
        </div>

        <PrintableQuadroA />
        <PrintableQuadroB />

        <div className="flex flex-col gap-4 mt-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 border border-black flex items-center justify-center text-[7px]">
              SIAE<br/>Timbro
            </div>
            <div>
              <div className="font-semibold">SIAE DI</div>
              <div className="border-b border-black w-24 mt-2"></div>
            </div>
          </div>
          <div className="flex justify-between">
            <div>
              <div className="font-semibold">TITOLARE SISTEMA DI EMISSIONE</div>
              <div className="border-b border-black w-40 mt-4"></div>
              <div className="text-[9px] mt-1">FIRMA</div>
            </div>
            <div>
              <div className="font-semibold">ORGANIZZATORE</div>
              <div className="border-b border-black w-40 mt-4"></div>
              <div className="text-[9px] mt-1">FIRMA</div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-[8px] border-t border-black pt-2">
          <p>(1) Tab.3 all. Provv. 23/07/2001</p>
        </div>
      </div>
    </>
  );
}
