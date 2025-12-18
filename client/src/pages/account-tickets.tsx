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
  Users,
  QrCode,
  CheckCircle2,
  Clock,
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

interface GuestEntryItem {
  id: string;
  firstName: string;
  lastName: string;
  plusOnes: number;
  qrCode: string | null;
  qrScannedAt: string | null;
  status: string;
  arrivedAt: string | null;
  createdAt: string;
  listName: string;
  listType: string;
  eventId: string;
  eventName: string;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  locationAddress: string | null;
}

interface TableReservationItem {
  id: string;
  customerName: string | null;
  guestsCount: number;
  qrCode: string | null;
  qrScannedAt: string | null;
  status: string;
  arrivedAt: string | null;
  confirmedAt: string | null;
  depositAmount: string | null;
  depositPaid: boolean;
  createdAt: string;
  tableName: string;
  tableType: string;
  tableCapacity: number;
  minSpend: string | null;
  eventId: string;
  eventName: string;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  locationAddress: string | null;
}

interface TicketsResponse {
  upcoming: TicketItem[];
  past: TicketItem[];
  total: number;
}

interface GuestEntriesResponse {
  upcoming: GuestEntryItem[];
  past: GuestEntryItem[];
  total: number;
}

interface TableReservationsResponse {
  upcoming: TableReservationItem[];
  past: TableReservationItem[];
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
        className={`hover:border-primary/30 transition-all cursor-pointer ${
          isExpired ? "opacity-70" : ""
        }`}
        data-testid={`card-ticket-${ticket.id}`}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant={statusVariant()} className="text-xs">
                  {statusLabel()}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground truncate text-sm sm:text-base" data-testid="text-event-name">
                {ticket.eventName}
              </h3>
              <div className="flex flex-col gap-1 mt-2 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
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
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function GuestEntryCard({ entry }: { entry: GuestEntryItem }) {
  const eventDate = new Date(entry.eventStart);
  const isExpired = isPast(eventDate);
  const isCheckedIn = !!entry.qrScannedAt || entry.status === 'arrived';

  const statusVariant = () => {
    switch (entry.status) {
      case "confirmed":
        return "default";
      case "arrived":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const statusLabel = () => {
    switch (entry.status) {
      case "confirmed":
        return "Confermato";
      case "arrived":
        return "Entrato";
      case "cancelled":
        return "Annullato";
      case "pending":
        return "In attesa";
      case "no_show":
        return "Non presentato";
      default:
        return entry.status;
    }
  };

  return (
    <Card
      className={`transition-all ${isExpired ? "opacity-70" : ""}`}
      data-testid={`card-guest-entry-${entry.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={statusVariant()} className="text-xs">
                {statusLabel()}
              </Badge>
              {isCheckedIn && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Check-in effettuato
                </Badge>
              )}
              {entry.qrCode && !isCheckedIn && (
                <Badge variant="outline" className="text-xs">
                  <QrCode className="w-3 h-3 mr-1" />
                  QR disponibile
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground truncate" data-testid="text-event-name">
              {entry.eventName}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Lista: {entry.listName}
            </p>
            <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span data-testid="text-event-date">
                  {format(eventDate, "EEEE d MMMM yyyy, HH:mm", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{entry.locationName}</span>
              </div>
              {entry.plusOnes > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>+{entry.plusOnes} accompagnator{entry.plusOnes > 1 ? 'i' : 'e'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableReservationCard({ reservation }: { reservation: TableReservationItem }) {
  const eventDate = new Date(reservation.eventStart);
  const isExpired = isPast(eventDate);
  const isCheckedIn = !!reservation.qrScannedAt || reservation.status === 'arrived';

  const statusVariant = () => {
    switch (reservation.status) {
      case "confirmed":
        return "default";
      case "arrived":
        return "secondary";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const statusLabel = () => {
    switch (reservation.status) {
      case "confirmed":
        return "Confermato";
      case "arrived":
        return "Arrivato";
      case "completed":
        return "Completato";
      case "cancelled":
        return "Annullato";
      case "pending":
        return "In attesa";
      case "no_show":
        return "Non presentato";
      default:
        return reservation.status;
    }
  };

  const tableTypeLabel = () => {
    switch (reservation.tableType) {
      case "vip":
        return "VIP";
      case "prive":
        return "Privé";
      default:
        return "Standard";
    }
  };

  return (
    <Card
      className={`transition-all ${isExpired ? "opacity-70" : ""}`}
      data-testid={`card-table-reservation-${reservation.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={statusVariant()} className="text-xs">
                {statusLabel()}
              </Badge>
              {reservation.tableType !== 'standard' && (
                <Badge variant="outline" className="text-xs">
                  {tableTypeLabel()}
                </Badge>
              )}
              {isCheckedIn && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Check-in effettuato
                </Badge>
              )}
              {reservation.qrCode && !isCheckedIn && (
                <Badge variant="outline" className="text-xs">
                  <QrCode className="w-3 h-3 mr-1" />
                  QR disponibile
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground truncate" data-testid="text-event-name">
              {reservation.eventName}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {reservation.tableName} - {reservation.guestsCount} ospiti
            </p>
            <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span data-testid="text-event-date">
                  {format(eventDate, "EEEE d MMMM yyyy, HH:mm", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{reservation.locationName}</span>
              </div>
              {reservation.minSpend && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Spesa minima: €{parseFloat(reservation.minSpend).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountTickets() {
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<TicketsResponse>({
    queryKey: ["/api/public/account/tickets"],
  });

  const { data: guestEntriesData, isLoading: guestEntriesLoading } = useQuery<GuestEntriesResponse>({
    queryKey: ["/api/public/account/guest-entries"],
  });

  const { data: tableReservationsData, isLoading: tableReservationsLoading } = useQuery<TableReservationsResponse>({
    queryKey: ["/api/public/account/table-reservations"],
  });

  const upcomingTickets = ticketsData?.upcoming || [];
  const pastTickets = ticketsData?.past || [];
  const upcomingGuestEntries = guestEntriesData?.upcoming || [];
  const pastGuestEntries = guestEntriesData?.past || [];
  const allGuestEntries = [...upcomingGuestEntries, ...pastGuestEntries];
  const upcomingTableReservations = tableReservationsData?.upcoming || [];
  const pastTableReservations = tableReservationsData?.past || [];
  const allTableReservations = [...upcomingTableReservations, ...pastTableReservations];

  const isLoading = ticketsLoading || guestEntriesLoading || tableReservationsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground" data-testid="text-page-title">I Miei Biglietti</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Visualizza e gestisci i tuoi biglietti, liste e prenotazioni</p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4 sm:space-y-6">
        <TabsList className="bg-card border border-border grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger
            value="upcoming"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="tab-upcoming"
          >
            Prossimi ({upcomingTickets.length})
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="tab-past"
          >
            Passati ({pastTickets.length})
          </TabsTrigger>
          <TabsTrigger
            value="lists"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="tab-lists"
          >
            Liste ({allGuestEntries.length})
          </TabsTrigger>
          <TabsTrigger
            value="tables"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="tab-tables"
          >
            Tavoli ({allTableReservations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingTickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TicketX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Non hai biglietti per eventi futuri</p>
                <Link href="/acquista">
                  <span className="text-primary hover:text-primary/80 underline">
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
            <Card>
              <CardContent className="py-12 text-center">
                <TicketX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Non hai biglietti passati</p>
              </CardContent>
            </Card>
          ) : (
            pastTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="lists" className="space-y-4">
          {allGuestEntries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Non sei in nessuna lista ospiti</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {upcomingGuestEntries.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Prossimi eventi
                  </h3>
                  {upcomingGuestEntries.map((entry) => (
                    <GuestEntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
              {pastGuestEntries.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Eventi passati
                  </h3>
                  {pastGuestEntries.map((entry) => (
                    <GuestEntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="tables" className="space-y-4">
          {allTableReservations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Non hai prenotazioni tavoli</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {upcomingTableReservations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Prossimi eventi
                  </h3>
                  {upcomingTableReservations.map((reservation) => (
                    <TableReservationCard key={reservation.id} reservation={reservation} />
                  ))}
                </div>
              )}
              {pastTableReservations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Eventi passati
                  </h3>
                  {pastTableReservations.map((reservation) => (
                    <TableReservationCard key={reservation.id} reservation={reservation} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
