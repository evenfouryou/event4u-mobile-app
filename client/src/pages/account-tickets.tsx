import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isPast, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  Ticket,
  Calendar,
  MapPin,
  ChevronRight,
  Loader2,
  TicketX,
} from "lucide-react";

interface TicketItem {
  id: number;
  eventName: string;
  eventDate: string;
  sector: string;
  status: string;
  qrCode?: string;
  isListed?: boolean;
}

function TicketCard({ ticket }: { ticket: TicketItem }) {
  const eventDate = parseISO(ticket.eventDate);
  const isExpired = isPast(eventDate);

  const statusVariant = () => {
    if (ticket.isListed) return "secondary";
    switch (ticket.status) {
      case "valid":
        return "default";
      case "used":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const statusLabel = () => {
    if (ticket.isListed) return "In Vendita";
    switch (ticket.status) {
      case "valid":
        return "Valido";
      case "used":
        return "Usato";
      case "cancelled":
        return "Annullato";
      default:
        return ticket.status;
    }
  };

  return (
    <Link href={`/account/tickets/${ticket.id}`}>
      <Card
        className={`bg-[#151922] border-white/10 hover:border-yellow-500/30 transition-all cursor-pointer ${
          isExpired ? "opacity-70" : ""
        }`}
        data-testid={`card-ticket-${ticket.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={statusVariant()} className="text-xs">
                  {statusLabel()}
                </Badge>
              </div>
              <h3 className="font-semibold text-white truncate" data-testid="text-event-name">
                {ticket.eventName}
              </h3>
              <div className="flex flex-col gap-1 mt-2 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span data-testid="text-event-date">
                    {format(eventDate, "EEEE d MMMM yyyy, HH:mm", { locale: it })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  <span data-testid="text-sector">{ticket.sector}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AccountTickets() {
  const { data: tickets, isLoading } = useQuery<TicketItem[]>({
    queryKey: ["/api/public/account/tickets"],
  });

  const upcomingTickets = tickets?.filter(
    (t) => !isPast(parseISO(t.eventDate)) && t.status !== "cancelled"
  ) || [];
  
  const pastTickets = tickets?.filter(
    (t) => isPast(parseISO(t.eventDate)) || t.status === "cancelled"
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">I Miei Biglietti</h1>
        <p className="text-slate-400 mt-2">Visualizza e gestisci i tuoi biglietti</p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="w-full bg-white/5 border border-white/10 rounded-lg h-12 mb-6">
          <TabsTrigger
            value="upcoming"
            className="flex-1 h-full text-white data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
            data-testid="tab-upcoming"
          >
            Prossimi ({upcomingTickets.length})
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="flex-1 h-full text-white data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
            data-testid="tab-past"
          >
            Passati ({pastTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-0">
          {upcomingTickets.length === 0 ? (
            <EmptyState message="Nessun biglietto per eventi futuri" />
          ) : (
            <div className="space-y-4">
              {upcomingTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-0">
          {pastTickets.length === 0 ? (
            <EmptyState message="Nessun biglietto passato" />
          ) : (
            <div className="space-y-4">
              {pastTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <TicketX className="w-8 h-8 text-slate-500" />
      </div>
      <p className="text-slate-400">{message}</p>
      <Link href="/acquista">
        <span className="text-yellow-400 hover:underline mt-2 inline-block cursor-pointer">
          Scopri gli eventi
        </span>
      </Link>
    </div>
  );
}
