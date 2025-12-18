import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isPast } from "date-fns";
import { it } from "date-fns/locale";
import {
  Ticket,
  Calendar,
  ChevronRight,
  Loader2,
  TicketX,
  MapPin,
} from "lucide-react";

interface TicketItem {
  id: string;
  ticketCode: string;
  ticketType: string;
  ticketPrice: string;
  participantFirstName: string | null;
  participantLastName: string | null;
  status: string;
  emittedAt: string;
  qrCode: string | null;
  sectorName: string;
  eventName: string;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  ticketedEventId: string;
}

interface TicketsResponse {
  upcoming: TicketItem[];
  past: TicketItem[];
  total: number;
}

function TicketCard({ ticket }: { ticket: TicketItem }) {
  const eventDate = new Date(ticket.eventStart);
  const isExpired = isPast(eventDate);

  const statusVariant = () => {
    switch (ticket.status) {
      case "emitted":
        return "default";
      case "validated":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const statusLabel = () => {
    switch (ticket.status) {
      case "emitted":
        return "Valido";
      case "validated":
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
                  <span data-testid="text-sector">{ticket.sectorName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{ticket.locationName}</span>
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
  const { data, isLoading } = useQuery<TicketsResponse>({
    queryKey: ["/api/public/account/tickets"],
  });

  const upcomingTickets = data?.upcoming || [];
  const pastTickets = data?.past || [];

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

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="bg-[#151922] border border-white/10">
          <TabsTrigger
            value="upcoming"
            className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
            data-testid="tab-upcoming"
          >
            Prossimi ({upcomingTickets.length})
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
            data-testid="tab-past"
          >
            Passati ({pastTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingTickets.length === 0 ? (
            <Card className="bg-[#151922] border-white/10">
              <CardContent className="py-12 text-center">
                <TicketX className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Non hai biglietti per eventi futuri</p>
                <Link href="/acquista">
                  <span className="text-yellow-400 hover:text-yellow-300 underline">
                    Scopri gli eventi disponibili
                  </span>
                </Link>
              </CardContent>
            </Card>
          ) : (
            upcomingTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastTickets.length === 0 ? (
            <Card className="bg-[#151922] border-white/10">
              <CardContent className="py-12 text-center">
                <TicketX className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Non hai biglietti passati</p>
              </CardContent>
            </Card>
          ) : (
            pastTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
