import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, RefreshCw, Send, CheckCircle, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface C1ReportData {
  reportType: string;
  reportName: string;
  reportDate: string | null;
  eventId: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  generatedAt: string;
  totalTicketsSold: number;
  totalRevenue: number;
  vatRate: number;
  vatAmount: number;
  netRevenue: number;
  cancelledTicketsCount: number;
  dailySales: Array<{
    date: string;
    ticketsSold: number;
    totalAmount: number;
  }>;
  sectors: Array<{
    id: string;
    name: string;
    sectorCode: string;
    capacity: number;
    availableSeats: number;
    soldCount: number;
    priceIntero: number;
    priceRidotto: number;
    revenue: number;
    cancelledCount: number;
  }>;
  ticketTypes: {
    intero: { count: number; amount: number };
    ridotto: { count: number; amount: number };
    omaggio: { count: number; amount: number };
  };
  // === NUOVI CAMPI NORMATIVI 2025 ===
  cfOrganizzatore?: string; // Codice fiscale organizzatore
  cfTitolare?: string; // Codice fiscale titolare sistema emissione
  ragioneSocialeOrganizzatore?: string;
  ragioneSocialeTitolare?: string;
  matricolaMisuratoreFiscale?: string; // Matricola dispositivo fiscale
  progressivoFiscale?: number; // Progressivo fiscale giornaliero
  impostaIntrattenimento?: number; // Imposta intrattenimento totale
  corrispettiviEsenti?: number; // Corrispettivi esenti IVA
  corrispettiviSoggetti?: number; // Corrispettivi soggetti IVA
  provincia?: string;
  comune?: string;
  // Dettaglio annullamenti per causale - Allegato B
  annullamentiPerCausale?: Array<{
    causale: string; // ANN=Annullamento, ERR=Errore, RIM=Rimborso, DUP=Duplicato
    causaleDescrizione: string;
    count: number;
    importoTotale: number;
  }>;
  // Rivendite secondary ticketing
  rivenditeCount?: number;
  rivenditeImporto?: number;
  // Cambi nominativo
  cambiNominativoCount?: number;
}

export default function SiaeReportC1() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);
  
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

  const eventDate = report.eventDate ? new Date(report.eventDate) : new Date();
  // For daily report use today's date (reportDate), for monthly use event date
  const reportDisplayDate = report.reportDate ? new Date(report.reportDate) : eventDate;
  const formattedDate = reportDisplayDate.toLocaleDateString('it-IT');
  const transmissionDate = new Date().toLocaleDateString('it-IT');
  const monthName = eventDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  const totalCapacity = report.sectors.reduce((sum, s) => sum + s.capacity, 0);
  const totalEmessi = report.totalTicketsSold;
  const totalRicavoLordo = report.totalRevenue;
  const impostaIntrattenimento = report.impostaIntrattenimento || 0;
  const imponibileIva = report.netRevenue;
  const ivaLorda = report.vatAmount;
  const corrispettiviEsenti = report.corrispettiviEsenti || 0;
  const corrispettiviSoggetti = report.corrispettiviSoggetti || report.totalRevenue;

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
          <span>alle ore <span className="border-b border-black px-2">{report.eventTime || "21:00"}</span></span>
          <span>al giorno <span className="border-b border-black px-2">{formattedDate}</span></span>
          <span>alle ore <span className="border-b border-black px-2">06:00</span></span>
        </div>

        <div className="text-xs mb-6">
          Trasmesso in data <span className="border-b border-black px-2">{transmissionDate}</span>
        </div>

        <div className="border border-black mb-4">
          <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
            QUADRO A - EVENTO
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="border border-black p-1 w-1/4 font-semibold">ORGANIZZATORE</td>
                <td className="border border-black p-1">{report.ragioneSocialeOrganizzatore || 'Event4U S.r.l.'}</td>
                <td className="border border-black p-1 font-semibold w-1/6">COD. FISCALE</td>
                <td className="border border-black p-1 font-mono" data-testid="cf-organizzatore">{report.cfOrganizzatore || 'N/D'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">TITOLARE SISTEMA EMISSIONE</td>
                <td className="border border-black p-1">{report.ragioneSocialeTitolare || 'Event4U S.r.l.'}</td>
                <td className="border border-black p-1 font-semibold">COD. FISCALE / P.IVA</td>
                <td className="border border-black p-1 font-mono" data-testid="cf-titolare">{report.cfTitolare || 'N/D'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">CODICE SISTEMA EMISSIONE</td>
                <td className="border border-black p-1">{report.eventCode || 'N/D'}</td>
                <td className="border border-black p-1 font-semibold">MATRICOLA MISURATORE</td>
                <td className="border border-black p-1 font-mono" data-testid="matricola-misuratore">{report.matricolaMisuratoreFiscale || 'N/D'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">PROVINCIA</td>
                <td className="border border-black p-1">{report.provincia || 'N/D'}</td>
                <td className="border border-black p-1 font-semibold">COMUNE</td>
                <td className="border border-black p-1">{report.comune || report.venueName || 'N/D'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">DENOMINAZIONE EVENTO</td>
                <td className="border border-black p-1" colSpan={3}>{report.eventName}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">TIPO EVENTO (1)</td>
                <td className="border border-black p-1">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked readOnly className="w-3 h-3" /> spettacolo
                  </label>
                </td>
                <td className="border border-black p-1">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" readOnly className="w-3 h-3" /> intrattenimento
                  </label>
                </td>
                <td className="border border-black p-1">
                  Incidenza intrattenimento _____%
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">ORA INIZIO</td>
                <td className="border border-black p-1">{report.eventTime || '21:00'}</td>
                <td className="border border-black p-1 font-semibold">PROGRESSIVO FISCALE</td>
                <td className="border border-black p-1 font-mono" data-testid="progressivo-fiscale">{report.progressivoFiscale || 1}</td>
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
              {report.sectors.map((sector) => {
                const sectorVat = sector.revenue * (report.vatRate / (100 + report.vatRate));
                const sectorNet = sector.revenue - sectorVat;
                return (
                  <tr key={sector.id}>
                    <td className="border border-black p-1">{sector.name}</td>
                    <td className="border border-black p-1 text-center">{sector.capacity}</td>
                    <td className="border border-black p-1 text-center">{sector.sectorCode || 'INT'}</td>
                    <td className="border border-black p-1 text-right">{sector.priceIntero.toFixed(2)}</td>
                    <td className="border border-black p-1 text-right">{sector.soldCount}</td>
                    <td className="border border-black p-1 text-right">{sector.revenue.toFixed(2)}</td>
                    <td className="border border-black p-1 text-right">0,00</td>
                    <td className="border border-black p-1 text-right">{sectorNet.toFixed(2)}</td>
                    <td className="border border-black p-1 text-center">{sector.cancelledCount || 0}</td>
                    <td className="border border-black p-1 text-right">{sectorVat.toFixed(2)}</td>
                  </tr>
                );
              })}
              {report.ticketTypes.ridotto.count > 0 && (
                <tr>
                  <td className="border border-black p-1">Ridotti</td>
                  <td className="border border-black p-1 text-center">-</td>
                  <td className="border border-black p-1 text-center">RID</td>
                  <td className="border border-black p-1 text-right">-</td>
                  <td className="border border-black p-1 text-right">{report.ticketTypes.ridotto.count}</td>
                  <td className="border border-black p-1 text-right">{report.ticketTypes.ridotto.amount.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                  <td className="border border-black p-1 text-right">-</td>
                  <td className="border border-black p-1 text-center">0</td>
                  <td className="border border-black p-1 text-right">-</td>
                </tr>
              )}
              {report.ticketTypes.omaggio.count > 0 && (
                <tr>
                  <td className="border border-black p-1">Omaggi</td>
                  <td className="border border-black p-1 text-center">-</td>
                  <td className="border border-black p-1 text-center">OMA</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                  <td className="border border-black p-1 text-right">{report.ticketTypes.omaggio.count}</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                  <td className="border border-black p-1 text-center">0</td>
                  <td className="border border-black p-1 text-right">0,00</td>
                </tr>
              )}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black p-1" colSpan={4}>TOTALE</td>
                <td className="border border-black p-1 text-right">{totalEmessi}</td>
                <td className="border border-black p-1 text-right">{totalRicavoLordo.toFixed(2)}</td>
                <td className="border border-black p-1 text-right">{impostaIntrattenimento.toFixed(2)}</td>
                <td className="border border-black p-1 text-right">{imponibileIva.toFixed(2)}</td>
                <td className="border border-black p-1 text-center">{report.cancelledTicketsCount}</td>
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
                <td className="border border-black p-2 w-1/2 font-semibold">Corrispettivi Soggetti IVA</td>
                <td className="border border-black p-2 text-right" data-testid="corrispettivi-soggetti">{corrispettiviSoggetti.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Corrispettivi Esenti IVA</td>
                <td className="border border-black p-2 text-right" data-testid="corrispettivi-esenti">{corrispettiviEsenti.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Imposta Intrattenimento</td>
                <td className="border border-black p-2 text-right" data-testid="imposta-intrattenimento">{impostaIntrattenimento.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">TOTALE IVA da assolvere</td>
                <td className="border border-black p-2 text-right font-bold">{ivaLorda.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">TOTALE IVA già assolta</td>
                <td className="border border-black p-2 text-right">0,00</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border border-black p-2 font-bold">TOTALE GENERALE</td>
                <td className="border border-black p-2 text-right font-bold text-lg">{totalRicavoLordo.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* QUADRO D - Dettaglio Annullamenti per Causale */}
        {report.annullamentiPerCausale && report.annullamentiPerCausale.length > 0 && (
          <div className="border border-black mb-4" data-testid="quadro-annullamenti">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
              QUADRO D - DETTAGLIO ANNULLAMENTI PER CAUSALE
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-black p-1 text-left">CAUSALE</th>
                  <th className="border border-black p-1 text-left">DESCRIZIONE</th>
                  <th className="border border-black p-1 text-right">N° TITOLI</th>
                  <th className="border border-black p-1 text-right">IMPORTO TOTALE</th>
                </tr>
              </thead>
              <tbody>
                {report.annullamentiPerCausale.map((ann, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-1 font-mono">{ann.causale}</td>
                    <td className="border border-black p-1">{ann.causaleDescrizione}</td>
                    <td className="border border-black p-1 text-right">{ann.count}</td>
                    <td className="border border-black p-1 text-right">{ann.importoTotale.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-black p-1" colSpan={2}>TOTALE ANNULLAMENTI</td>
                  <td className="border border-black p-1 text-right">{report.cancelledTicketsCount}</td>
                  <td className="border border-black p-1 text-right">
                    {report.annullamentiPerCausale.reduce((sum, a) => sum + a.importoTotale, 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* QUADRO E - Secondary Ticketing e Cambi Nominativo */}
        {((report.rivenditeCount && report.rivenditeCount > 0) || (report.cambiNominativoCount && report.cambiNominativoCount > 0)) && (
          <div className="border border-black mb-6" data-testid="quadro-secondary">
            <div className="bg-gray-100 px-2 py-1 font-bold border-b border-black">
              QUADRO E - OPERAZIONI SECONDARY TICKETING
            </div>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="border border-black p-2 w-1/2 font-semibold">Rivendite Effettuate</td>
                  <td className="border border-black p-2 text-center">{report.rivenditeCount || 0}</td>
                  <td className="border border-black p-2 text-right font-semibold">Importo Totale</td>
                  <td className="border border-black p-2 text-right">{(report.rivenditeImporto || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-semibold">Cambi Nominativo</td>
                  <td className="border border-black p-2 text-center">{report.cambiNominativoCount || 0}</td>
                  <td className="border border-black p-2" colSpan={2}></td>
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
