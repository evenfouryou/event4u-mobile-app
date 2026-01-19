import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    valid: 'default',
    used: 'secondary',
    cancelled: 'destructive',
    confirmed: 'default',
    checked_in: 'default',
    pending: 'outline',
    approved: 'default',
    rejected: 'destructive',
  };
  
  const statusKeys: Record<string, string> = {
    valid: 'account.status.valid',
    used: 'account.status.used',
    cancelled: 'account.status.cancelled',
    confirmed: 'account.status.confirmed',
    checked_in: 'account.status.checkedIn',
    pending: 'account.status.pending',
    approved: 'account.status.approved',
    rejected: 'account.status.rejected',
  };
  
  const variant = statusVariants[status] || 'outline';
  const label = statusKeys[status] ? t(statusKeys[status]) : status;
  
  return (
    <Badge variant={variant} data-testid={`badge-status-${status}`}>
      {status === 'valid' || status === 'confirmed' || status === 'approved' || status === 'checked_in' ? (
        <CheckCircle2 className="h-3 w-3 mr-1" />
      ) : status === 'pending' ? (
        <Clock className="h-3 w-3 mr-1" />
      ) : status === 'cancelled' || status === 'rejected' ? (
        <XCircle className="h-3 w-3 mr-1" />
      ) : (
        <AlertCircle className="h-3 w-3 mr-1" />
      )}
      {label}
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

function TicketCard({ ticket, event, sector, t }: SiaeTicketData & { t: (key: string) => string }) {
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
          <StatusBadge status={ticket.status} t={t} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{event.locationName || t('account.wallet.eventVenue')}</span>
          </div>
          <span className="font-semibold text-primary">€{parseFloat(ticket.grossAmount).toFixed(2)}</span>
        </div>
        
        <div className="text-sm">
          <span className="text-muted-foreground">{t('account.wallet.sector')}: </span>
          <span>{sector.name}</span>
        </div>
        
        {ticket.participantFirstName && ticket.participantLastName && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t('account.wallet.holder')}: </span>
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

function ListEntryCard({ entry, list, event, t }: E4UWalletData['listEntries'][0] & { t: (key: string) => string }) {
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
          <StatusBadge status={entry.status} t={t} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(event.startDatetime), "d MMMM yyyy - HH:mm", { locale: it })}</span>
        </div>
        
        <div className="text-sm">
          <span className="text-muted-foreground">{t('account.wallet.name')}: </span>
          <span>{entry.firstName} {entry.lastName}</span>
        </div>
        
        {list.price && parseFloat(list.price) > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t('account.wallet.price')}: </span>
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

function TableGuestCard({ guest, reservation, tableType, event, t }: E4UWalletData['tableGuests'][0] & { t: (key: string) => string }) {
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
          <StatusBadge status={guest.status === 'pending' ? reservation.status : guest.status} t={t} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(event.startDatetime), "d MMMM yyyy - HH:mm", { locale: it })}</span>
        </div>
        
        <div className="text-sm">
          <span className="text-muted-foreground">{t('account.wallet.name')}: </span>
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

function EmptyState({ type, t }: { type: 'tickets' | 'e4u'; t: (key: string) => string }) {
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
        {type === 'tickets' ? t('account.wallet.noTickets') : t('account.wallet.noSubscription')}
      </h3>
      <p className="text-muted-foreground max-w-sm">
        {type === 'tickets' 
          ? t('account.wallet.noTicketsDescription')
          : t('account.wallet.noSubscriptionDescription')
        }
      </p>
    </div>
  );
}

export default function ClientWalletPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string>("e4u");
  const [selectedItem, setSelectedItem] = useState<{ type: 'list' | 'table' | 'ticket'; data: any } | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const { data: e4uData, isLoading: loadingE4U } = useQuery<E4UWalletData>({
    queryKey: ['/api/e4u/wallet/my'],
  });
  
  const { data: siaeTickets = [], isLoading: loadingSiae } = useQuery<SiaeTicketData[]>({
    queryKey: ['/api/siae/tickets/my'],
  });
  
  const listEntries = e4uData?.listEntries || [];
  const tableGuests = e4uData?.tableGuests || [];
  const totalE4U = listEntries.length + tableGuests.length;

  const handleViewDetails = (type: 'list' | 'table' | 'ticket', data: any) => {
    setSelectedItem({ type, data });
    setIsDetailDialogOpen(true);
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-client-wallet">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('account.wallet.title')}</h1>
            <p className="text-muted-foreground">{t('account.wallet.description')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Users className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{listEntries.length}</div>
                  <p className="text-sm text-muted-foreground">{t('account.wallet.lists')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/20">
                  <Armchair className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{tableGuests.length}</div>
                  <p className="text-sm text-muted-foreground">{t('account.wallet.tables')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Ticket className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{siaeTickets.length}</div>
                  <p className="text-sm text-muted-foreground">{t('account.wallet.tickets')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalE4U + siaeTickets.length}</div>
                  <p className="text-sm text-muted-foreground">{t('account.wallet.total')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList data-testid="tabs-wallet-desktop">
            <TabsTrigger value="e4u" className="gap-2" data-testid="tab-e4u-desktop">
              <Users className="h-4 w-4" />
              {t('account.wallet.listsTables')}
              {totalE4U > 0 && (
                <Badge variant="secondary" className="ml-1">{totalE4U}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2" data-testid="tab-tickets-desktop">
              <Ticket className="h-4 w-4" />
              {t('account.wallet.tickets')}
              {siaeTickets.length > 0 && (
                <Badge variant="secondary" className="ml-1">{siaeTickets.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="e4u" className="mt-6 space-y-6">
            {loadingE4U ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : totalE4U === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState type="e4u" t={t} />
                </CardContent>
              </Card>
            ) : (
              <>
                {listEntries.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-cyan-400" />
                        <CardTitle>{t('account.wallet.lists')} ({listEntries.length})</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('account.wallet.list')}</TableHead>
                            <TableHead>{t('account.wallet.event')}</TableHead>
                            <TableHead>{t('account.wallet.name')}</TableHead>
                            <TableHead>{t('account.wallet.date')}</TableHead>
                            <TableHead>{t('account.wallet.price')}</TableHead>
                            <TableHead>{t('account.wallet.status')}</TableHead>
                            <TableHead className="text-right">{t('account.wallet.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listEntries.map((item) => (
                            <TableRow key={item.entry.id} data-testid={`row-list-${item.entry.id}`}>
                              <TableCell className="font-medium">{item.list.name}</TableCell>
                              <TableCell>{item.event.name}</TableCell>
                              <TableCell>{item.entry.firstName} {item.entry.lastName}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(item.event.startDatetime), "d MMM yyyy - HH:mm", { locale: it })}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.list.price && parseFloat(item.list.price) > 0 
                                  ? `€${parseFloat(item.list.price).toFixed(2)}` 
                                  : t('account.wallet.free')}
                              </TableCell>
                              <TableCell><StatusBadge status={item.entry.status} t={t} /></TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => handleViewDetails('list', item)}
                                  data-testid={`button-view-list-${item.entry.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {tableGuests.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Armchair className="h-5 w-5 text-teal-400" />
                        <CardTitle>{t('account.wallet.tables')} ({tableGuests.length})</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('account.wallet.table')}</TableHead>
                            <TableHead>{t('account.wallet.reservation')}</TableHead>
                            <TableHead>{t('account.wallet.event')}</TableHead>
                            <TableHead>{t('account.wallet.name')}</TableHead>
                            <TableHead>{t('account.wallet.date')}</TableHead>
                            <TableHead>{t('account.wallet.status')}</TableHead>
                            <TableHead className="text-right">{t('account.wallet.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableGuests.map((item) => (
                            <TableRow key={item.guest.id} data-testid={`row-table-${item.guest.id}`}>
                              <TableCell className="font-medium">{item.tableType.name}</TableCell>
                              <TableCell>{item.reservation.reservationName}</TableCell>
                              <TableCell>{item.event.name}</TableCell>
                              <TableCell>{item.guest.firstName} {item.guest.lastName}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(item.event.startDatetime), "d MMM yyyy - HH:mm", { locale: it })}
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={item.guest.status === 'pending' ? item.reservation.status : item.guest.status} t={t} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => handleViewDetails('table', item)}
                                  data-testid={`button-view-table-${item.guest.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
            {loadingSiae ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : siaeTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState type="tickets" t={t} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-purple-400" />
                    <CardTitle>{t('account.wallet.tickets')} ({siaeTickets.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('account.wallet.event')}</TableHead>
                        <TableHead>{t('account.wallet.sector')}</TableHead>
                        <TableHead>{t('account.wallet.holder')}</TableHead>
                        <TableHead>{t('account.wallet.date')}</TableHead>
                        <TableHead>{t('account.wallet.location')}</TableHead>
                        <TableHead>{t('account.wallet.price')}</TableHead>
                        <TableHead>{t('account.wallet.status')}</TableHead>
                        <TableHead className="text-right">{t('account.wallet.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siaeTickets.map((item) => (
                        <TableRow key={item.ticket.id} data-testid={`row-ticket-${item.ticket.id}`}>
                          <TableCell className="font-medium">{item.event.eventName}</TableCell>
                          <TableCell>{item.sector.name}</TableCell>
                          <TableCell>
                            {item.ticket.participantFirstName && item.ticket.participantLastName
                              ? `${item.ticket.participantFirstName} ${item.ticket.participantLastName}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(item.event.eventDate), "d MMM yyyy", { locale: it })}
                              {item.event.eventTime && ` - ${item.event.eventTime}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              {item.event.locationName || t('account.wallet.notAvailable')}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">€{parseFloat(item.ticket.grossAmount).toFixed(2)}</TableCell>
                          <TableCell><StatusBadge status={item.ticket.status} t={t} /></TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => handleViewDetails('ticket', item)}
                              data-testid={`button-view-ticket-${item.ticket.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedItem?.type === 'list' && (
                  <>
                    <Users className="h-5 w-5 text-cyan-400" />
                    {t('account.wallet.listDetailTitle')}
                  </>
                )}
                {selectedItem?.type === 'table' && (
                  <>
                    <Armchair className="h-5 w-5 text-teal-400" />
                    {t('account.wallet.tableDetailTitle')}
                  </>
                )}
                {selectedItem?.type === 'ticket' && (
                  <>
                    <Ticket className="h-5 w-5 text-purple-400" />
                    {t('account.wallet.ticketDetailTitle')}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {t('account.wallet.viewQrCode')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedItem?.type === 'list' && selectedItem.data && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.list')}:</span>
                      <span className="font-medium">{selectedItem.data.list.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.event')}:</span>
                      <span className="font-medium">{selectedItem.data.event.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.name')}:</span>
                      <span className="font-medium">{selectedItem.data.entry.firstName} {selectedItem.data.entry.lastName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.date')}:</span>
                      <span className="font-medium">
                        {format(new Date(selectedItem.data.event.startDatetime), "d MMMM yyyy - HH:mm", { locale: it })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">{t('account.wallet.status')}:</span>
                      <StatusBadge status={selectedItem.data.entry.status} t={t} />
                    </div>
                  </div>
                  {selectedItem.data.entry.qrCode && (
                    <div className="flex justify-center pt-4">
                      <QRCodeDisplay code={selectedItem.data.entry.qrCode} size={180} />
                    </div>
                  )}
                </>
              )}

              {selectedItem?.type === 'table' && selectedItem.data && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.table')}:</span>
                      <span className="font-medium">{selectedItem.data.tableType.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.reservation')}:</span>
                      <span className="font-medium">{selectedItem.data.reservation.reservationName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.event')}:</span>
                      <span className="font-medium">{selectedItem.data.event.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.name')}:</span>
                      <span className="font-medium">{selectedItem.data.guest.firstName} {selectedItem.data.guest.lastName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.date')}:</span>
                      <span className="font-medium">
                        {format(new Date(selectedItem.data.event.startDatetime), "d MMMM yyyy - HH:mm", { locale: it })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">{t('account.wallet.status')}:</span>
                      <StatusBadge 
                        status={selectedItem.data.guest.status === 'pending' 
                          ? selectedItem.data.reservation.status 
                          : selectedItem.data.guest.status} 
                        t={t}
                      />
                    </div>
                  </div>
                  {selectedItem.data.guest.qrCode && (
                    <div className="flex justify-center pt-4">
                      <QRCodeDisplay code={selectedItem.data.guest.qrCode} size={180} />
                    </div>
                  )}
                </>
              )}

              {selectedItem?.type === 'ticket' && selectedItem.data && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.event')}:</span>
                      <span className="font-medium">{selectedItem.data.event.eventName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.sector')}:</span>
                      <span className="font-medium">{selectedItem.data.sector.name}</span>
                    </div>
                    {selectedItem.data.ticket.participantFirstName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('account.wallet.holder')}:</span>
                        <span className="font-medium">
                          {selectedItem.data.ticket.participantFirstName} {selectedItem.data.ticket.participantLastName}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.date')}:</span>
                      <span className="font-medium">
                        {format(new Date(selectedItem.data.event.eventDate), "d MMMM yyyy", { locale: it })}
                        {selectedItem.data.event.eventTime && ` - ${selectedItem.data.event.eventTime}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.location')}:</span>
                      <span className="font-medium">{selectedItem.data.event.locationName || t('account.wallet.notAvailable')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('account.wallet.price')}:</span>
                      <span className="font-semibold text-primary">€{parseFloat(selectedItem.data.ticket.grossAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">{t('account.wallet.status')}:</span>
                      <StatusBadge status={selectedItem.data.ticket.status} t={t} />
                    </div>
                  </div>
                  {selectedItem.data.ticket.qrCode && (
                    <div className="flex justify-center pt-4">
                      <QRCodeDisplay code={selectedItem.data.ticket.qrCode} size={180} />
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  return (
    <MobileAppLayout
      header={<MobileHeader title={t('account.wallet.title')} showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-muted-foreground">{t('account.wallet.description')}</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-wallet">
          <TabsTrigger value="e4u" className="gap-2" data-testid="tab-e4u">
            <Users className="h-4 w-4" />
            {t('account.wallet.listsTables')}
            {totalE4U > 0 && (
              <Badge variant="secondary" className="ml-1">{totalE4U}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2" data-testid="tab-tickets">
            <Ticket className="h-4 w-4" />
            {t('account.wallet.tickets')}
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
              <EmptyState type="e4u" t={t} />
            ) : (
              <div className="space-y-6">
                {listEntries.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-lg font-semibold">{t('account.wallet.lists')} ({listEntries.length})</h2>
                    </div>
                    <div className="grid gap-4">
                      {listEntries.map((item) => (
                        <ListEntryCard key={item.entry.id} {...item} t={t} />
                      ))}
                    </div>
                  </div>
                )}
                
                {tableGuests.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Armchair className="h-5 w-5 text-teal-400" />
                      <h2 className="text-lg font-semibold">{t('account.wallet.tables')} ({tableGuests.length})</h2>
                    </div>
                    <div className="grid gap-4">
                      {tableGuests.map((item) => (
                        <TableGuestCard key={item.guest.id} {...item} t={t} />
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
              <EmptyState type="tickets" t={t} />
            ) : (
              <div className="grid gap-4">
                {siaeTickets.map((item) => (
                  <TicketCard key={item.ticket.id} {...item} t={t} />
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
