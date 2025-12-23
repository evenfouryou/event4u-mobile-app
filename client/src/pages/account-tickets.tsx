import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  QrCode,
  Eye,
  Euro,
} from "lucide-react";
import { triggerHaptic } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";

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
  cancelled: TicketItem[];
  total: number;
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  tap: { scale: 0.98 },
};

function getStatusVariant(status: string) {
  switch (status) {
    case "emitted":
      return "default";
    case "validated":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "emitted":
      return "Valido";
    case "validated":
      return "Usato";
    case "cancelled":
      return "Annullato";
    default:
      return status;
  }
}

function MobileTicketCard({ ticket, index }: { ticket: TicketItem; index: number }) {
  const eventDate = new Date(ticket.eventStart);
  const isExpired = isPast(eventDate);

  return (
    <Link href={`/account/tickets/${ticket.id}`}>
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        whileTap="tap"
        transition={{ ...springTransition, delay: index * 0.05 }}
        onClick={() => triggerHaptic('light')}
        className={`min-h-[120px] bg-card border border-border rounded-2xl p-4 active:bg-card/80 ${
          isExpired ? "opacity-60" : ""
        }`}
        data-testid={`card-ticket-${ticket.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant={getStatusVariant(ticket.status)} className="text-sm">
                {getStatusLabel(ticket.status)}
              </Badge>
              {ticket.qrCode && (
                <div className="flex items-center gap-1 text-primary">
                  <QrCode className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <h3 className="font-semibold text-foreground text-lg leading-tight mb-3" data-testid="text-event-name">
              {ticket.eventName}
            </h3>
            
            <div className="flex flex-col gap-2 text-base text-muted-foreground">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span data-testid="text-event-date">
                  {format(eventDate, "EEE d MMM, HH:mm", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Ticket className="w-5 h-5 flex-shrink-0" />
                <span data-testid="text-sector" className="truncate">{ticket.sectorName}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{ticket.locationName}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/50">
            <ChevronRight className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function EmptyState({ type }: { type: 'upcoming' | 'past' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springTransition}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-6"
      >
        <TicketX className="w-12 h-12 text-muted-foreground" />
      </motion.div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {type === 'upcoming' ? 'Nessun biglietto' : 'Nessun evento passato'}
      </h3>
      <p className="text-base text-muted-foreground text-center mb-6">
        {type === 'upcoming' 
          ? 'Non hai biglietti per eventi futuri'
          : 'Non hai ancora partecipato a nessun evento'
        }
      </p>
      
      {type === 'upcoming' && (
        <Link href="/acquista">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerHaptic('medium')}
            className="min-h-[48px] px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-base"
          >
            Scopri gli eventi
          </motion.button>
        </Link>
      )}
    </motion.div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  children,
  count,
  testId,
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  count: number;
  testId: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      className={`flex-1 min-h-[52px] rounded-xl font-semibold text-lg transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted/50 text-muted-foreground'
      }`}
      data-testid={testId}
    >
      {children} ({count})
    </motion.button>
  );
}

export default function AccountTickets() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const { data: ticketsData, isLoading } = useQuery<TicketsResponse>({
    queryKey: ["/api/public/account/tickets"],
  });

  const upcomingTickets = ticketsData?.upcoming || [];
  const pastTickets = ticketsData?.past || [];
  
  const displayedTickets = activeTab === 'upcoming' ? upcomingTickets : pastTickets;

  const stats = {
    total: (upcomingTickets.length || 0) + (pastTickets.length || 0),
    upcoming: upcomingTickets.length || 0,
    past: pastTickets.length || 0,
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-account-tickets">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">I Miei Biglietti</h1>
            <p className="text-muted-foreground">Gestisci i tuoi biglietti acquistati</p>
          </div>
          <Link href="/acquista">
            <Button data-testid="button-discover-events">
              <Ticket className="w-4 h-4 mr-2" />
              Scopri gli eventi
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">Totale Biglietti</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">{stats.upcoming}</div>
                  <p className="text-sm text-muted-foreground">Prossimi Eventi</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-muted-foreground">{stats.past}</div>
                  <p className="text-sm text-muted-foreground">Eventi Passati</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Elenco Biglietti</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upcoming' | 'past')}>
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming" data-testid="tab-upcoming-desktop">
                  Prossimi ({upcomingTickets.length})
                </TabsTrigger>
                <TabsTrigger value="past" data-testid="tab-past-desktop">
                  Passati ({pastTickets.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : upcomingTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <TicketX className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nessun biglietto</h3>
                    <p className="text-muted-foreground mb-4">Non hai biglietti per eventi futuri</p>
                    <Link href="/acquista">
                      <Button>Scopri gli eventi</Button>
                    </Link>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Luogo</TableHead>
                        <TableHead>Settore</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Prezzo</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingTickets.map((ticket) => (
                        <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                          <TableCell className="font-medium">{ticket.eventName}</TableCell>
                          <TableCell>
                            {format(new Date(ticket.eventStart), "dd/MM/yyyy HH:mm", { locale: it })}
                          </TableCell>
                          <TableCell>{ticket.locationName}</TableCell>
                          <TableCell>{ticket.sectorName}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(ticket.status)}>
                              {getStatusLabel(ticket.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>€{Number(ticket.ticketPrice || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setIsDetailDialogOpen(true);
                                }}
                                data-testid={`button-view-${ticket.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Link href={`/account/tickets/${ticket.id}`}>
                                <Button variant="ghost" size="icon" data-testid={`button-details-${ticket.id}`}>
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="past">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : pastTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <TicketX className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nessun evento passato</h3>
                    <p className="text-muted-foreground">Non hai ancora partecipato a nessun evento</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Luogo</TableHead>
                        <TableHead>Settore</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Prezzo</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="opacity-70" data-testid={`row-ticket-${ticket.id}`}>
                          <TableCell className="font-medium">{ticket.eventName}</TableCell>
                          <TableCell>
                            {format(new Date(ticket.eventStart), "dd/MM/yyyy HH:mm", { locale: it })}
                          </TableCell>
                          <TableCell>{ticket.locationName}</TableCell>
                          <TableCell>{ticket.sectorName}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(ticket.status)}>
                              {getStatusLabel(ticket.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>€{Number(ticket.ticketPrice || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setIsDetailDialogOpen(true);
                                }}
                                data-testid={`button-view-${ticket.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Link href={`/account/tickets/${ticket.id}`}>
                                <Button variant="ghost" size="icon" data-testid={`button-details-${ticket.id}`}>
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dettagli Biglietto</DialogTitle>
              <DialogDescription>
                Informazioni sul biglietto selezionato
              </DialogDescription>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Evento</span>
                  <span className="font-medium">{selectedTicket.eventName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">
                    {format(new Date(selectedTicket.eventStart), "dd MMMM yyyy, HH:mm", { locale: it })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Luogo</span>
                  <span className="font-medium">{selectedTicket.locationName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Settore</span>
                  <span className="font-medium">{selectedTicket.sectorName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium">{selectedTicket.ticketType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Codice</span>
                  <span className="font-mono text-sm">{selectedTicket.ticketCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stato</span>
                  <Badge variant={getStatusVariant(selectedTicket.status)}>
                    {getStatusLabel(selectedTicket.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Prezzo</span>
                  <span className="font-medium text-lg">€{Number(selectedTicket.ticketPrice || 0).toFixed(2)}</span>
                </div>
                {selectedTicket.participantFirstName && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Partecipante</span>
                    <span className="font-medium">
                      {selectedTicket.participantFirstName} {selectedTicket.participantLastName}
                    </span>
                  </div>
                )}
                <div className="pt-4 flex gap-2">
                  <Link href={`/account/tickets/${selectedTicket.id}`} className="flex-1">
                    <Button className="w-full" data-testid="button-view-full-details">
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizza Biglietto
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        className="fixed inset-0 flex flex-col bg-background"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-10 h-10 text-primary" />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background pb-24"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="px-4 pt-4 pb-2"
      >
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          I Miei Biglietti
        </h1>
      </motion.header>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className="px-4 py-4"
      >
        <div className="flex gap-3 p-1.5 bg-muted/30 rounded-2xl">
          <TabButton 
            active={activeTab === 'upcoming'} 
            onClick={() => setActiveTab('upcoming')}
            count={upcomingTickets.length}
            testId="tab-upcoming"
          >
            Prossimi
          </TabButton>
          <TabButton 
            active={activeTab === 'past'} 
            onClick={() => setActiveTab('past')}
            count={pastTickets.length}
            testId="tab-past"
          >
            Passati
          </TabButton>
        </div>
      </motion.div>

      <div className="px-4">
        <AnimatePresence mode="wait">
          {displayedTickets.length === 0 ? (
            <EmptyState key={activeTab} type={activeTab} />
          ) : (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {displayedTickets.map((ticket, index) => (
                <MobileTicketCard key={ticket.id} ticket={ticket} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
