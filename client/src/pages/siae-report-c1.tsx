import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Printer, RefreshCw, Send, CheckCircle, Loader2, FileText, Euro, Ticket, Building2, Calendar } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Interfaccia conforme al modello C1 SIAE con Quadri A, B, C
interface C1ReportData {
  reportType: string;
  reportName: string;
  generatedAt: string;
  eventId: string;
  
  // QUADRO A - Dati Identificativi
  quadroA: {
    denominazioneOrganizzatore: string;
    codiceFiscaleOrganizzatore: string;
    partitaIvaOrganizzatore: string;
    codiceLocale: string;
    denominazioneLocale: string;
    indirizzoLocale: string;
    capienza: number;
    denominazioneEvento: string;
    codiceEvento: string;
    dataEvento: string;
    oraEvento: string;
    tipologiaEvento: string;
    genereEvento: string;
    periodoRiferimento: string;
    dataRiferimento: string | null;
  };
  
  // QUADRO B - Dettaglio Titoli
  quadroB: {
    settori: Array<{
      ordinePosto: number;
      codiceSettore: string;
      denominazione: string;
      capienza: number;
      interi: { quantita: number; prezzoUnitario: number; totale: number };
      ridotti: { quantita: number; prezzoUnitario: number; totale: number };
      omaggi: { quantita: number; totale: number };
      totaleVenduti: number;
      totaleAnnullati: number;
      totaleIncasso: number;
    }>;
    riepilogoTipologie: {
      interi: { quantita: number; totale: number };
      ridotti: { quantita: number; totale: number };
      omaggi: { quantita: number; totale: number };
    };
    totaleBigliettiEmessi: number;
    totaleBigliettiAnnullati: number;
    totaleIncassoLordo: number;
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

export default function SiaeReportC1() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Get report type from query string
  const urlParams = new URLSearchParams(window.location.search);
  const reportType = urlParams.get('type') || 'giornaliero';
  const isMonthly = reportType === 'mensile';

  const { data: report, isLoading, error } = useQuery<C1ReportData>({
    queryKey: ['/api/siae/ticketed-events', id, 'reports', 'c1', reportType],
    queryFn: async () => {
      const res = await fetch(`/api/siae/ticketed-events/${id}/reports/c1?type=${reportType}`, {
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
  });

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['/api/siae/ticketed-events', id, 'reports', 'c1', reportType] 
    });
  };

  const { toast } = useToast();

  const sendToSiaeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/siae/ticketed-events/${id}/reports/c1/send`, {
        method: 'POST',
        body: JSON.stringify({ reportType }),
      });
      return res;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Report inviato",
        description: data.message || "Il report C1 è stato salvato come trasmissione SIAE",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/siae'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'invio del report",
        variant: "destructive",
      });
    },
  });

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
            <Button 
              onClick={() => sendToSiaeMutation.mutate()} 
              disabled={sendToSiaeMutation.isPending}
              data-testid="button-send-siae"
            >
              {sendToSiaeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Invio...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Invia a SIAE</>
              )}
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
                  <td className="border border-black p-1 font-semibold">CODICE LOCALE (BA)</td>
                  <td className="border border-black p-1">{quadroA.codiceLocale}</td>
                  <td className="border border-black p-1 font-semibold">DENOMINAZIONE LOCALE</td>
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
                    <label className="flex items-center gap-1 ml-2">
                      <input type="checkbox" checked={quadroA.tipologiaEvento === 'intrattenimento'} readOnly className="w-3 h-3" /> Intrattenimento
                    </label>
                  </td>
                  <td className="border border-black p-1 font-semibold">CAPIENZA LOCALE</td>
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

      <div className="no-print p-4 bg-background border-b flex flex-col gap-2 sticky top-0 z-50">
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
        <Button 
          className="w-full"
          onClick={() => sendToSiaeMutation.mutate()} 
          disabled={sendToSiaeMutation.isPending}
          data-testid="button-send-siae"
        >
          {sendToSiaeMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Invio in corso...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Invia a SIAE</>
          )}
        </Button>
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
