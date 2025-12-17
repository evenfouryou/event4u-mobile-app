import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";

interface C1ReportData {
  reportType: string;
  reportName: string;
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
  cancelledTickets: number;
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
  }>;
  ticketTypes: {
    intero: { count: number; amount: number };
    ridotto: { count: number; amount: number };
    omaggio: { count: number; amount: number };
  };
}

export default function SiaeReportC1() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading, error } = useQuery<C1ReportData>({
    queryKey: ['/api/siae/ticketed-events', id, 'reports/c1'],
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
        <Button variant="outline" onClick={() => setLocation("/siae/ticketed-events")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Torna indietro
        </Button>
      </div>
    );
  }

  const eventDate = report.eventDate ? new Date(report.eventDate) : new Date();
  const formattedDate = eventDate.toLocaleDateString('it-IT');
  const transmissionDate = new Date().toLocaleDateString('it-IT');

  const totalCapacity = report.sectors.reduce((sum, s) => sum + s.capacity, 0);
  const totalEmessi = report.totalTicketsSold;
  const totalRicavoLordo = report.totalRevenue;
  const impostaIntrattenimento = 0;
  const imponibileIva = report.netRevenue;
  const ivaLorda = report.vatAmount;

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

      <div ref={printRef} className="print-area bg-white text-black p-8 max-w-[210mm] mx-auto font-serif text-sm" data-testid="report-c1">
        <div className="text-right text-xs mb-2">mod. C 1 fronte</div>
        
        <h1 className="text-center font-bold text-lg mb-4 uppercase tracking-wide">
          RIEPILOGO TITOLI D'ACCESSO PER EVENTO
        </h1>

        <div className="flex gap-8 mb-4 text-xs">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked readOnly className="w-3 h-3" />
            Riep. giornaliero del <span className="border-b border-black px-2 min-w-[80px]">{formattedDate}</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" readOnly className="w-3 h-3" />
            Riep. mensile del ............
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
                <td className="border border-black p-1" colSpan={3}>Event4U S.r.l.</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">TITOLARE SISTEMA EMISSIONE</td>
                <td className="border border-black p-1">Event4U S.r.l.</td>
                <td className="border border-black p-1 font-semibold w-1/6">COD. FISCALE / P.IVA</td>
                <td className="border border-black p-1">12345678901</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">CODICE SISTEMA EMISSIONE</td>
                <td className="border border-black p-1">{report.eventCode || 'N/D'}</td>
                <td className="border border-black p-1 font-semibold">PROVINCIA</td>
                <td className="border border-black p-1">MI</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">DENOMINAZIONE</td>
                <td className="border border-black p-1">{report.eventName}</td>
                <td className="border border-black p-1 font-semibold">COMUNE</td>
                <td className="border border-black p-1">{report.venueName || 'Milano'}</td>
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
                <td className="border border-black p-1 font-semibold">TIPO DELL'OPERA (manifestazione)</td>
                <td className="border border-black p-1" colSpan={3}>Evento musicale / Discoteca</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">COMPONENTI ESECUTORI / TITOLO</td>
                <td className="border border-black p-1" colSpan={3}>{report.eventName}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">NUMERO OPERE RAPPRESENTATE</td>
                <td className="border border-black p-1">1</td>
                <td className="border border-black p-1 font-semibold">CODICE LOCALE</td>
                <td className="border border-black p-1">001</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">ORA INIZIO</td>
                <td className="border border-black p-1">{report.eventTime || '21:00'}</td>
                <td className="border border-black p-1 font-semibold">IMPOSTA INTRATTENIMENTO</td>
                <td className="border border-black p-1">0,00</td>
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
                    <td className="border border-black p-1 text-center">0</td>
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
                <td className="border border-black p-1 text-center">{report.cancelledTickets}</td>
                <td className="border border-black p-1 text-right">{ivaLorda.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-black mb-6">
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="border border-black p-2 w-1/2 font-semibold">TOTALE IVA da assolvere</td>
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
