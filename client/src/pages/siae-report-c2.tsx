import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Printer, Eye, FileText, Euro, Users } from "lucide-react";

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

// Interfaccia conforme Allegato 4 G.U. n.188 12/08/2004
interface SubscriptionSummary {
  turnType: string;      // F = Fisso, L = Libero
  eventsCount: number;   // Numero eventi inclusi
  count: number;         // Numero abbonamenti venduti
  totalAmount: number;   // Importo lordo incassato
  cancelled: number;     // Abbonamenti annullati
  tipoTitolo?: string;   // Codice TAB.3: A1, AX, etc.
  tipoSpettacolo?: string; // I = Intrattenimento, S = Spettacolo
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
  
  // QUADRO A - Dati Identificativi (conforme Allegato 4)
  quadroA?: {
    // Dati Organizzatore
    denominazioneOrganizzatore: string;
    codiceFiscaleOrganizzatore: string;
    partitaIvaOrganizzatore: string;
    indirizzoOrganizzatore: string;
    comuneOrganizzatore: string;
    provinciaOrganizzatore: string;
    capOrganizzatore: string;
    
    // Titolare Sistema di Emissione
    titolareSistemaEmissione: string;
    codiceFiscaleTitolareSistema: string;
    partitaIvaTitolareSistema: string;
    indirizzoTitolareSistema: string;
    comuneTitolareSistema: string;
    provinciaTitolareSistema: string;
    capTitolareSistema: string;
    codiceSistemaEmissione: string;
    
    // Dati Locale
    codiceLocale: string;
    denominazioneLocale: string;
    indirizzoLocale: string;
    comuneLocale: string;
    provinciaLocale: string;
    capLocale: string;
    capienza: number;
    
    // Periodo riferimento
    periodoRiferimento: string;
    dataRiferimento: string | null;
  };
  
  // QUADRO B - Dettaglio Abbonamenti (conforme Allegato 4)
  quadroB?: {
    // Righe dettaglio conformi al modello ufficiale
    // Colonne: Tipo titolo (2), Codice abb., I/S, F/L, Venduti, Importo lordo, Annullati, N° eventi
    righeDettaglio: Array<{
      tipoTitolo: string;           // Codice TAB.3: A1, AX, etc.
      tipoTitoloDescrizione: string;
      codiceAbbonamento: string;
      tipoSpettacolo: string;       // I = Intrattenimento, S = Spettacolo
      turnoAbbonamento: string;     // F = Fisso, L = Libero
      numeroVenduti: number;
      importoLordoIncassato: number;
      numeroAnnullati: number;
      numeroEventi: number;
    }>;
    
    // Totali
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

  const { data: report, isLoading, error } = useQuery<C2ReportData>({
    queryKey: ['/api/siae/ticketed-events', id, 'reports/c2'],
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
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
  const reportDate = report.eventDate ? new Date(report.eventDate).toLocaleDateString('it-IT') : transmissionDate;

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-report-c2-desktop">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Report C2 - Riepilogo Abbonamenti</h1>
              <p className="text-muted-foreground">
                {report.eventName} - {reportDate}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handlePrint} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" /> Stampa
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
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

        <Card>
          <CardHeader>
            <CardTitle>Dati Anagrafici - Quadro A (Allegato 4 G.U. n.188 12/08/2004)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium w-1/4">Organizzatore</TableCell>
                  <TableCell>{report.quadroA?.denominazioneOrganizzatore || 'N/D'}</TableCell>
                  <TableCell className="font-medium w-1/4">Codice Fiscale</TableCell>
                  <TableCell>{report.quadroA?.codiceFiscaleOrganizzatore || 'N/D'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Indirizzo</TableCell>
                  <TableCell>{report.quadroA?.indirizzoOrganizzatore || 'N/D'}</TableCell>
                  <TableCell className="font-medium">Comune</TableCell>
                  <TableCell>{report.quadroA?.comuneOrganizzatore || 'N/D'} ({report.quadroA?.provinciaOrganizzatore || ''}) - {report.quadroA?.capOrganizzatore || ''}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableCell className="font-medium">Titolare Sistema di Emissione</TableCell>
                  <TableCell>{report.quadroA?.titolareSistemaEmissione || 'N/D'}</TableCell>
                  <TableCell className="font-medium">Codice Fiscale Titolare</TableCell>
                  <TableCell>{report.quadroA?.codiceFiscaleTitolareSistema || 'N/D'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">P.IVA Titolare Sistema</TableCell>
                  <TableCell>{report.quadroA?.partitaIvaTitolareSistema || 'N/D'}</TableCell>
                  <TableCell className="font-medium">Indirizzo Titolare</TableCell>
                  <TableCell>{report.quadroA?.indirizzoTitolareSistema || 'N/D'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Comune Titolare</TableCell>
                  <TableCell>{report.quadroA?.comuneTitolareSistema || 'N/D'} ({report.quadroA?.provinciaTitolareSistema || ''}) - {report.quadroA?.capTitolareSistema || ''}</TableCell>
                  <TableCell className="font-medium">Codice Sistema di Emissione</TableCell>
                  <TableCell>{report.quadroA?.codiceSistemaEmissione || `E4U-${report.eventId?.substring(0, 8).toUpperCase()}`}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Codice Locale (BA)</TableCell>
                  <TableCell>{report.quadroA?.codiceLocale || 'N/D'}</TableCell>
                  <TableCell className="font-medium">Denominazione Locale</TableCell>
                  <TableCell>{report.quadroA?.denominazioneLocale || 'N/D'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Indirizzo Locale</TableCell>
                  <TableCell>{report.quadroA?.indirizzoLocale || 'N/D'}</TableCell>
                  <TableCell className="font-medium">Capienza</TableCell>
                  <TableCell>{report.quadroA?.capienza || 0}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Periodo Riferimento</TableCell>
                  <TableCell colSpan={3}>{report.quadroA?.periodoRiferimento || 'Mensile'} - {report.quadroA?.dataRiferimento || reportDate}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
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

        <Card>
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

        <div ref={printRef} className="print-area hidden print:block bg-white text-black p-8 max-w-[210mm] mx-auto font-serif text-sm">
          <div className="text-right text-xs mb-2">mod. C 2 fronte</div>
          
          <h1 className="text-center font-bold text-lg mb-4 uppercase tracking-wide">
            "RIEPILOGO ABBONAMENTI"
          </h1>

          <div className="flex gap-8 mb-4 text-xs">
            <span>Riepilogo giornaliero del <span className="border-b border-black px-2 min-w-[80px]">{reportDate}</span></span>
            <span>Riepilogo mensile del <span className="border-b border-black px-2 min-w-[80px]">................</span></span>
            <span>Trasmesso in data <span className="border-b border-black px-2 min-w-[60px]">... / ... / ...</span></span>
          </div>

          <div className="border border-black mb-4">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
              QUADRO A - Dati anagrafici
            </div>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="border border-black p-2 w-1/3 font-semibold">Organizzatore</td>
                  <td className="border border-black p-2">Event4U S.r.l.</td>
                  <td className="border border-black p-2 w-1/4 font-semibold">Codice fiscale</td>
                  <td className="border border-black p-2">12345678901</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-semibold">Titolare sistema di emissione</td>
                  <td className="border border-black p-2">Event4U S.r.l.</td>
                  <td className="border border-black p-2 font-semibold">Codice fiscale</td>
                  <td className="border border-black p-2">12345678901</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-semibold">Codice sistema di emissione</td>
                  <td className="border border-black p-2" colSpan={3}>E4U-{report.eventId?.substring(0, 8).toUpperCase()}</td>
                </tr>
              </tbody>
            </table>
            <div className="text-right text-xs p-1 border-t border-black">
              Gli importi sono espressi in €
            </div>
          </div>

          <div className="border border-black mb-4">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
              QUADRO B - Abbonamenti
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-black p-2 text-left">Tipo titolo<br/><span className="font-normal">(2)</span></th>
                  <th className="border border-black p-2 text-center">Codice<br/>abbonamento</th>
                  <th className="border border-black p-2 text-center">Intrattenimenti<br/>Spettacolo</th>
                  <th className="border border-black p-2 text-center">Fisso<br/>Libero</th>
                  <th className="border border-black p-2 text-right">Numero<br/>venduti</th>
                  <th className="border border-black p-2 text-right">Importo lordo<br/>Incassato</th>
                  <th className="border border-black p-2 text-center">Abbonamenti<br/>annullati</th>
                  <th className="border border-black p-2 text-center">Numero<br/>eventi</th>
                </tr>
              </thead>
              <tbody>
                {report.subscriptions && report.subscriptions.length > 0 ? (
                  report.subscriptions.map((sub, index) => (
                    <tr key={sub.id || index}>
                      <td className="border border-black p-2">
                        ABBONAMENTO TURNO {sub.turnType || 'F'}
                      </td>
                      <td className="border border-black p-2 text-center font-mono text-xs">{sub.subscriptionCode}</td>
                      <td className="border border-black p-2 text-center">S</td>
                      <td className="border border-black p-2 text-center">{sub.turnType}</td>
                      <td className="border border-black p-2 text-right">{sub.status !== 'cancelled' ? 1 : '-'}</td>
                      <td className="border border-black p-2 text-right">
                        {sub.totalAmount.toFixed(2)}
                      </td>
                      <td className="border border-black p-2 text-center">{sub.status === 'cancelled' ? 1 : '-'}</td>
                      <td className="border border-black p-2 text-center">{sub.eventsCount}</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr>
                      <td className="border border-black p-2 h-8"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 h-8"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 h-8"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="border border-black mb-6">
            <table className="w-full text-xs">
              <tbody>
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-black p-2 text-center" colSpan={4}>TOTALE</td>
                  <td className="border border-black p-2 text-right">
                    {report.summary.subscriptionsSold || 0}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {(report.summary.subscriptionRevenue || 0).toFixed(2)}
                  </td>
                  <td className="border border-black p-2 text-center">
                    {report.summary.subscriptionsCancelled || 0}
                  </td>
                  <td className="border border-black p-2 text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>

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
              <div className="font-semibold mb-2">L'ORGANIZZATORE</div>
              <div className="text-[10px] mb-2">Titolare del sistema di emissione</div>
              <div className="border-b border-black w-48 mx-auto mt-8"></div>
              <div className="text-[10px] mt-1">FIRMA</div>
            </div>
          </div>

          <div className="mt-6 text-[8px] border-t border-black pt-2">
            <p>(1) tab. 4 all. A provv. 23/7/2003</p>
            <p>(2) tab. 3 all. Provv. 23/7/2003*;</p>
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
          <Button variant="outline" onClick={handlePrint} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" /> Stampa
          </Button>
        </div>
      </div>

      <div ref={printRef} className="print-area bg-white text-black p-8 max-w-[210mm] mx-auto font-serif text-sm" data-testid="report-c2">
        <div className="text-right text-xs mb-2">mod. C 2 fronte</div>
        
        <h1 className="text-center font-bold text-lg mb-4 uppercase tracking-wide">
          "RIEPILOGO ABBONAMENTI"
        </h1>

        <div className="flex gap-8 mb-4 text-xs">
          <span>Riepilogo giornaliero del <span className="border-b border-black px-2 min-w-[80px]">{reportDate}</span></span>
          <span>Riepilogo mensile del <span className="border-b border-black px-2 min-w-[80px]">................</span></span>
          <span>Trasmesso in data <span className="border-b border-black px-2 min-w-[60px]">... / ... / ...</span></span>
        </div>

        <div className="border border-black mb-4">
          <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
            QUADRO A - Dati anagrafici
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="border border-black p-2 w-1/3 font-semibold">Organizzatore</td>
                <td className="border border-black p-2">Event4U S.r.l.</td>
                <td className="border border-black p-2 w-1/4 font-semibold">Codice fiscale</td>
                <td className="border border-black p-2">12345678901</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Titolare sistema di emissione</td>
                <td className="border border-black p-2">Event4U S.r.l.</td>
                <td className="border border-black p-2 font-semibold">Codice fiscale</td>
                <td className="border border-black p-2">12345678901</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Codice sistema di emissione</td>
                <td className="border border-black p-2" colSpan={3}>E4U-{report.eventId?.substring(0, 8).toUpperCase()}</td>
              </tr>
            </tbody>
          </table>
          <div className="text-right text-xs p-1 border-t border-black">
            Gli importi sono espressi in €
          </div>
        </div>

        <div className="border border-black mb-4">
          <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
            QUADRO B - Abbonamenti
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-black p-2 text-left">Tipo titolo<br/><span className="font-normal">(2)</span></th>
                <th className="border border-black p-2 text-center">Codice<br/>abbonamento</th>
                <th className="border border-black p-2 text-center">Intrattenimenti<br/>Spettacolo</th>
                <th className="border border-black p-2 text-center">Fisso<br/>Libero</th>
                <th className="border border-black p-2 text-right">Numero<br/>venduti</th>
                <th className="border border-black p-2 text-right">Importo lordo<br/>Incassato</th>
                <th className="border border-black p-2 text-center">Abbonamenti<br/>annullati</th>
                <th className="border border-black p-2 text-center">Numero<br/>eventi</th>
              </tr>
            </thead>
            <tbody>
              {report.subscriptions && report.subscriptions.length > 0 ? (
                report.subscriptions.map((sub, index) => (
                  <tr key={sub.id || index}>
                    <td className="border border-black p-2">
                      ABBONAMENTO TURNO {sub.turnType || 'F'}
                    </td>
                    <td className="border border-black p-2 text-center font-mono text-xs">{sub.subscriptionCode}</td>
                    <td className="border border-black p-2 text-center">S</td>
                    <td className="border border-black p-2 text-center">{sub.turnType}</td>
                    <td className="border border-black p-2 text-right">{sub.status !== 'cancelled' ? 1 : '-'}</td>
                    <td className="border border-black p-2 text-right">
                      {sub.totalAmount.toFixed(2)}
                    </td>
                    <td className="border border-black p-2 text-center">{sub.status === 'cancelled' ? 1 : '-'}</td>
                    <td className="border border-black p-2 text-center">{sub.eventsCount}</td>
                  </tr>
                ))
              ) : (
                <>
                  <tr>
                    <td className="border border-black p-2 h-8"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 h-8"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 h-8"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="border border-black mb-6">
          <table className="w-full text-xs">
            <tbody>
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black p-2 text-center" colSpan={4}>TOTALE</td>
                <td className="border border-black p-2 text-right">
                  {report.summary.subscriptionsSold || 0}
                </td>
                <td className="border border-black p-2 text-right">
                  {(report.summary.subscriptionRevenue || 0).toFixed(2)}
                </td>
                <td className="border border-black p-2 text-center">
                  {report.summary.subscriptionsCancelled || 0}
                </td>
                <td className="border border-black p-2 text-center">-</td>
              </tr>
            </tbody>
          </table>
        </div>

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
            <div className="font-semibold mb-2">L'ORGANIZZATORE</div>
            <div className="text-[10px] mb-2">Titolare del sistema di emissione</div>
            <div className="border-b border-black w-48 mx-auto mt-8"></div>
            <div className="text-[10px] mt-1">FIRMA</div>
          </div>
        </div>

        <div className="mt-6 text-[8px] border-t border-black pt-2">
          <p>(1) tab. 4 all. A provv. 23/7/2003</p>
          <p>(2) tab. 3 all. Provv. 23/7/2003*;</p>
        </div>
      </div>
    </>
  );
}
