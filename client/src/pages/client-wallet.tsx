import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  Ticket,
  Users,
  Armchair,
  QrCode,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PartyPopper,
} from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";

interface E4UWalletData {
  listEntries: Array<{
    entry: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      qrCode: string | null;
      status: string;
      checkedInAt: string | null;
    };
    list: {
      id: string;
      name: string;
      price: string | null;
    };
    event: {
      id: string;
      name: string;
      startDatetime: string;
      imageUrl: string | null;
    };
  }>;
  tableGuests: Array<{
    guest: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      qrCode: string | null;
      status: string;
      checkedInAt: string | null;
    };
    reservation: {
      id: string;
      reservationName: string;
      status: string;
    };
    tableType: {
      id: string;
      name: string;
      price: string;
    };
    event: {
      id: string;
      name: string;
      startDatetime: string;
      imageUrl: string | null;
    };
  }>;
}

interface SiaeTicketData {
  ticket: {
    id: string;
    qrCode: string | null;
    status: string;
    grossAmount: string;
    ticketTypeCode: string;
    participantFirstName: string | null;
    participantLastName: string | null;
    usedAt: string | null;
  };
  event: {
    id: string;
    eventName: string;
    eventDate: string;
    eventTime: string | null;
    locationName: string | null;
  };
  sector: {
    id: string;
    name: string;
    price: string;
  };
}

function getStatusBadge(status: string, type: 'ticket' | 'list' | 'table') {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    valid: { label: 'Valido', variant: 'default' },
    used: { label: 'Usato', variant: 'secondary' },
    cancelled: { label: 'Annullato', variant: 'destructive' },
    confirmed: { label: 'Confermato', variant: 'default' },
    checked_in: { label: 'Check-in', variant: 'default' },
    pending: { label: 'In Attesa', variant: 'outline' },
    approved: { label: 'Approvato', variant: 'default' },
    rejected: { label: 'Rifiutato', variant: 'destructive' },
  };
  
  const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
  return (
    <Badge variant={statusInfo.variant} data-testid={`badge-status-${status}`}>
      {status === 'valid' || status === 'confirmed' || status === 'approved' || status === 'checked_in' ? (
        <CheckCircle2 className="h-3 w-3 mr-1" />
      ) : status === 'pending' ? (
        <Clock className="h-3 w-3 mr-1" />
      ) : status === 'cancelled' || status === 'rejected' ? (
        <XCircle className="h-3 w-3 mr-1" />
      ) : (
        <AlertCircle className="h-3 w-3 mr-1" />
      )}
      {statusInfo.label}
    </Badge>
  );
}

function QRCodeDisplay({ code, size = 120 }: { code: string; size?: number }) {
  return (
    <div 
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg"
      data-testid="qr-code-display"
    >
      <div 
        className="flex items-center justify-center bg-white p-2 rounded"
        style={{ width: size, height: size }}
      >
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(code)}`}
          alt="QR Code"
          className="w-full h-full"
          loading="lazy"
        />
      </div>
      <span className="text-xs text-muted-foreground font-mono break-all text-center max-w-[150px]">
        {code}
      </span>
    </div>
  );
}

function TicketCard({ ticket, event, sector }: SiaeTicketData) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`ticket-card-${ticket.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Ticket className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-base">{event.eventName}</CardTitle>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(event.eventDate), "d MMMM yyyy", { locale: it })}
                  {event.eventTime && ` - ${event.eventTime}`}
                </span>
              </div>
            </div>
          </div>
          {getStatusBadge(ticket.status, 'ticket')}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{event.locationName || 'Sede evento'}</span>
          </div>
          <span className="font-semibold text-primary">€{parseFloat(ticket.grossAmount).toFixed(2)}</span>
        </div>
        
        <div className="text-sm">
          <span className="text-muted-foreground">Settore: </span>
          <span>{sector.name}</span>
        </div>
        
        {ticket.participantFirstName && ticket.participantLastName && (
          <div className="text-sm">
            <span className="text-muted-foreground">Intestatario: </span>
            <span>{ticket.participantFirstName} {ticket.participantLastName}</span>
          </div>
        )}
        
        {ticket.qrCode && (
          <div className="flex justify-center">
            <QRCodeDisplay code={ticket.qrCode} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListEntryCard({ entry, list, event }: E4UWalletData['listEntries'][0]) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`list-entry-card-${entry.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-base">{list.name}</CardTitle>
              <div className="text-sm text-muted-foreground mt-1">
                {event.name}
              </div>
            </div>
          </div>
          {getStatusBadge(entry.status, 'list')}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(event.startDatetime), "d MMMM yyyy - HH:mm", { locale: it })}</span>
        </div>
        
        <div className="text-sm">
          <span className="text-muted-foreground">Nome: </span>
          <span>{entry.firstName} {entry.lastName}</span>
        </div>
        
        {list.price && parseFloat(list.price) > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Prezzo: </span>
            <span className="text-primary font-semibold">€{parseFloat(list.price).toFixed(2)}</span>
          </div>
        )}
        
        {entry.qrCode && (
          <div className="flex justify-center">
            <QRCodeDisplay code={entry.qrCode} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TableGuestCard({ guest, reservation, tableType, event }: E4UWalletData['tableGuests'][0]) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`table-guest-card-${guest.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-500/20">
              <Armchair className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <CardTitle className="text-base">{tableType.name}</CardTitle>
              <div className="text-sm text-muted-foreground mt-1">
                {reservation.reservationName} - {event.name}
              </div>
            </div>
          </div>
          {getStatusBadge(guest.status === 'pending' ? reservation.status : guest.status, 'table')}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(event.startDatetime), "d MMMM yyyy - HH:mm", { locale: it })}</span>
        </div>
        
        <div className="text-sm">
          <span className="text-muted-foreground">Nome: </span>
          <span>{guest.firstName} {guest.lastName}</span>
        </div>
        
        {guest.qrCode && (
          <div className="flex justify-center">
            <QRCodeDisplay code={guest.qrCode} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-28 w-28 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ type }: { type: 'tickets' | 'e4u' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid={`empty-state-${type}`}>
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        {type === 'tickets' ? (
          <Ticket className="h-8 w-8 text-muted-foreground" />
        ) : (
          <PartyPopper className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {type === 'tickets' ? 'Nessun biglietto' : 'Nessuna iscrizione'}
      </h3>
      <p className="text-muted-foreground max-w-sm">
        {type === 'tickets' 
          ? 'Non hai ancora acquistato biglietti. Scopri gli eventi disponibili!'
          : 'Non sei ancora iscritto a nessuna lista o tavolo. Partecipa agli eventi!'
        }
      </p>
    </div>
  );
}

export default function ClientWalletPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("e4u");
  
  const { data: e4uData, isLoading: loadingE4U } = useQuery<E4UWalletData>({
    queryKey: ['/api/e4u/wallet/my'],
  });
  
  const { data: siaeTickets = [], isLoading: loadingSiae } = useQuery<SiaeTicketData[]>({
    queryKey: ['/api/siae/tickets/my'],
  });
  
  const listEntries = e4uData?.listEntries || [];
  const tableGuests = e4uData?.tableGuests || [];
  const totalE4U = listEntries.length + tableGuests.length;
  
  return (
    <MobileAppLayout
      header={<MobileHeader title="Il Mio Wallet" showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-muted-foreground">I tuoi biglietti e iscrizioni agli eventi</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-wallet">
          <TabsTrigger value="e4u" className="gap-2" data-testid="tab-e4u">
            <Users className="h-4 w-4" />
            Liste & Tavoli
            {totalE4U > 0 && (
              <Badge variant="secondary" className="ml-1">{totalE4U}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2" data-testid="tab-tickets">
            <Ticket className="h-4 w-4" />
            Biglietti
            {siaeTickets.length > 0 && (
              <Badge variant="secondary" className="ml-1">{siaeTickets.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="e4u" className="mt-6">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {loadingE4U ? (
              <LoadingSkeleton />
            ) : totalE4U === 0 ? (
              <EmptyState type="e4u" />
            ) : (
              <div className="space-y-6">
                {listEntries.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-lg font-semibold">Liste ({listEntries.length})</h2>
                    </div>
                    <div className="grid gap-4">
                      {listEntries.map((item) => (
                        <ListEntryCard key={item.entry.id} {...item} />
                      ))}
                    </div>
                  </div>
                )}
                
                {tableGuests.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Armchair className="h-5 w-5 text-teal-400" />
                      <h2 className="text-lg font-semibold">Tavoli ({tableGuests.length})</h2>
                    </div>
                    <div className="grid gap-4">
                      {tableGuests.map((item) => (
                        <TableGuestCard key={item.guest.id} {...item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="tickets" className="mt-6">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {loadingSiae ? (
              <LoadingSkeleton />
            ) : siaeTickets.length === 0 ? (
              <EmptyState type="tickets" />
            ) : (
              <div className="grid gap-4">
                {siaeTickets.map((item) => (
                  <TicketCard key={item.ticket.id} {...item} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
      </div>
    </MobileAppLayout>
  );
}
