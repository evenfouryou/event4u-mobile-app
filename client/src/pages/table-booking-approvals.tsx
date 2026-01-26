import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { 
  ChevronLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Users, 
  Table2,
  User,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface TableBookingParticipant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  isBooker: boolean;
}

interface PendingBooking {
  id: string;
  tableId: string;
  tableName: string;
  tableCapacity: number;
  eventId: string;
  eventName: string;
  eventDate: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  guestCount: number;
  notes: string | null;
  approvalStatus: string;
  createdAt: string;
  prName: string | null;
  participants: TableBookingParticipant[];
}

export default function TableBookingApprovalsPage() {
  const { eventId } = useParams();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PendingBooking | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const { user } = useAuth();

  const { data: bookings, isLoading } = useQuery<PendingBooking[]>({
    queryKey: ['/api/pr/bookings/pending-approval', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/pr/bookings/pending-approval${eventId ? `?eventId=${eventId}` : ''}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Errore nel caricamento');
      return response.json();
    },
    enabled: user?.role === 'gestore' || user?.role === 'super_admin',
  });

  const approveMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("POST", `/api/pr/bookings/${bookingId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Prenotazione approvata",
        description: "La prenotazione è stata approvata. I QR code sono stati inviati ai partecipanti.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pr/bookings/pending-approval'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile approvare la prenotazione",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      return apiRequest("POST", `/api/pr/bookings/${bookingId}/reject`, { reason: reason || "Rifiutato" });
    },
    onSuccess: () => {
      toast({
        title: "Prenotazione rifiutata",
        description: "La prenotazione è stata rifiutata.",
      });
      setRejectDialogOpen(false);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ['/api/pr/bookings/pending-approval'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile rifiutare la prenotazione",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (booking: PendingBooking) => {
    approveMutation.mutate(booking.id);
  };

  const handleRejectClick = (booking: PendingBooking) => {
    setSelectedBooking(booking);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedBooking) {
      rejectMutation.mutate({ 
        bookingId: selectedBooking.id, 
        reason: rejectReason 
      });
    }
  };

  const handleViewDetails = (booking: PendingBooking) => {
    setSelectedBooking(booking);
    setDetailsDialogOpen(true);
  };

  const pendingBookings = bookings?.filter(b => b.approvalStatus === 'pending_approval') || [];
  const approvedBookings = bookings?.filter(b => b.approvalStatus === 'approved') || [];
  const rejectedBookings = bookings?.filter(b => b.approvalStatus === 'rejected') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />In attesa</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approvata</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rifiutata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/events')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approvazioni Prenotazioni Tavoli</h1>
          <p className="text-muted-foreground">Gestisci le richieste di prenotazione tavoli</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5" />
            Prenotazioni
          </CardTitle>
          <CardDescription>
            {pendingBookings.length} prenotazioni in attesa di approvazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                In Attesa ({pendingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Approvate ({approvedBookings.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                Rifiutate ({rejectedBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna prenotazione in attesa</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Tavolo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Ospiti</TableHead>
                      <TableHead>PR</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.eventName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{booking.tableName}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{booking.customerName}</span>
                            {booking.customerPhone && (
                              <span className="text-xs text-muted-foreground">{booking.customerPhone}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {booking.guestCount}/{booking.tableCapacity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {booking.prName || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(booking.createdAt), "dd MMM HH:mm", { locale: it })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(booking)}
                              data-testid={`button-view-booking-${booking.id}`}
                            >
                              Dettagli
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(booking)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-booking-${booking.id}`}
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectClick(booking)}
                              data-testid={`button-reject-booking-${booking.id}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="approved">
              {approvedBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna prenotazione approvata</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Tavolo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Ospiti</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.eventName}</TableCell>
                        <TableCell><Badge variant="secondary">{booking.tableName}</Badge></TableCell>
                        <TableCell>{booking.customerName}</TableCell>
                        <TableCell>{booking.guestCount}</TableCell>
                        <TableCell>{getStatusBadge(booking.approvalStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="rejected">
              {rejectedBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna prenotazione rifiutata</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Tavolo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.eventName}</TableCell>
                        <TableCell><Badge variant="secondary">{booking.tableName}</Badge></TableCell>
                        <TableCell>{booking.customerName}</TableCell>
                        <TableCell>{getStatusBadge(booking.approvalStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Prenotazione</DialogTitle>
            <DialogDescription>
              Stai per rifiutare la prenotazione di {selectedBooking?.customerName} per il tavolo {selectedBooking?.tableName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo del rifiuto (opzionale)</label>
              <Textarea
                placeholder="Inserisci il motivo del rifiuto..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                data-testid="textarea-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Rifiuta Prenotazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Dettagli Prenotazione
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Evento</p>
                  <p className="font-medium">{selectedBooking.eventName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tavolo</p>
                  <p className="font-medium">{selectedBooking.tableName} ({selectedBooking.tableCapacity} posti)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedBooking.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ospiti</p>
                  <p className="font-medium flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedBooking.guestCount}
                  </p>
                </div>
              </div>

              {(selectedBooking.customerPhone || selectedBooking.customerEmail) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedBooking.customerPhone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telefono</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {selectedBooking.customerPhone}
                      </p>
                    </div>
                  )}
                  {selectedBooking.customerEmail && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {selectedBooking.customerEmail}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedBooking.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Note</p>
                  <p className="text-sm bg-muted/50 p-2 rounded">{selectedBooking.notes}</p>
                </div>
              )}

              {selectedBooking.participants && selectedBooking.participants.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Partecipanti ({selectedBooking.participants.length})</p>
                  <div className="space-y-2">
                    {selectedBooking.participants.map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between bg-muted/30 p-2 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={p.isBooker ? "default" : "secondary"} className="text-xs">
                            {p.isBooker ? "Intestatario" : `#${idx + 1}`}
                          </Badge>
                          <span className="font-medium">{p.firstName} {p.lastName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{p.gender}</Badge>
                          <span>{p.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Chiudi
            </Button>
            {selectedBooking?.approvalStatus === 'pending_approval' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    handleRejectClick(selectedBooking);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rifiuta
                </Button>
                <Button
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    handleApprove(selectedBooking);
                  }}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approva
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
