import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

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
