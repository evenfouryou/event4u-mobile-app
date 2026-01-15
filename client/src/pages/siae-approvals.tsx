import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ChevronLeft, CheckCircle, XCircle, Clock, Building2, Calendar, Users, Ticket, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

type PendingEvent = {
  id: string;
  eventId: string;
  companyId: string;
  genreCode: string;
  totalCapacity: number;
  ticketingStatus: string;
  approvalStatus: string;
  createdAt: string;
  eventName: string | null;
  eventDate: string | null;
  companyName: string | null;
};

export default function SiaeApprovalsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PendingEvent | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { user, isLoading: authLoading } = useAuth();

  // Redirect non-super_admin users
  useEffect(() => {
    if (!authLoading && user && user.role !== 'super_admin') {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const { data: pendingEvents, isLoading } = useQuery<PendingEvent[]>({
    queryKey: ['/api/siae/admin/pending-approvals'],
    enabled: user?.role === 'super_admin',
  });

  // Show access denied if not super_admin
  if (!authLoading && user && user.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Accesso non consentito</h2>
            <p className="text-muted-foreground">
              Solo gli amministratori possono accedere a questa pagina.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const approveMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest('POST', `/api/siae/admin/approve/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/admin/pending-approvals'] });
      toast({
        title: "Evento approvato",
        description: "L'evento SIAE è stato approvato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile approvare l'evento.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ eventId, reason }: { eventId: string; reason: string }) => {
      return apiRequest('POST', `/api/siae/admin/reject/${eventId}`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/admin/pending-approvals'] });
      setRejectDialogOpen(false);
      setSelectedEvent(null);
      setRejectReason("");
      toast({
        title: "Evento rifiutato",
        description: "L'evento SIAE è stato rifiutato.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile rifiutare l'evento.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (eventId: string) => {
    approveMutation.mutate(eventId);
  };

  const handleRejectClick = (event: PendingEvent) => {
    setSelectedEvent(event);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedEvent || !rejectReason.trim()) {
      toast({
        title: "Errore",
        description: "È richiesta una motivazione per il rifiuto.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ eventId: selectedEvent.id, reason: rejectReason });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" data-testid="page-siae-approvals">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-approvals">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/super-admin')}
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Approvazioni Eventi SIAE</h1>
          <p className="text-muted-foreground">Gestisci le richieste di approvazione per eventi con biglietteria fiscale</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-2xl font-bold" data-testid="text-pending-count">
                  {pendingEvents?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">In Attesa</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-2xl font-bold text-green-500" data-testid="text-approved-label">
                  Approvati
                </p>
                <p className="text-sm text-muted-foreground">Eventi attivi</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-2xl font-bold text-red-500" data-testid="text-rejected-label">
                  Rifiutati
                </p>
                <p className="text-sm text-muted-foreground">Da rivedere</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Eventi in Attesa di Approvazione
          </CardTitle>
          <CardDescription>
            Verifica e approva gli eventi prima che possano vendere biglietti
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!pendingEvents || pendingEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">Nessun evento in attesa</p>
              <p className="text-sm">Tutti gli eventi sono stati revisionati</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Azienda</TableHead>
                  <TableHead>Data Evento</TableHead>
                  <TableHead>Capienza</TableHead>
                  <TableHead>Stato Ticketing</TableHead>
                  <TableHead>Richiesta</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingEvents.map((event) => (
                  <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-primary" />
                        <span className="font-medium">{event.eventName || 'N/D'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{event.companyName || 'N/D'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.eventDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{format(new Date(event.eventDate), 'dd MMM yyyy', { locale: it })}</span>
                        </div>
                      ) : 'N/D'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{event.totalCapacity}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.ticketingStatus === 'active' ? 'default' : 'secondary'}>
                        {event.ticketingStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.createdAt && format(new Date(event.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(event.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          data-testid={`button-approve-${event.id}`}
                        >
                          {approveMutation.isPending ? (
                            <span className="animate-spin mr-1">...</span>
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Approva
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectClick(event)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          data-testid={`button-reject-${event.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rifiuta
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Evento</DialogTitle>
            <DialogDescription>
              Stai per rifiutare l'evento "{selectedEvent?.eventName}". Fornisci una motivazione per il rifiuto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motivazione del rifiuto</Label>
              <Textarea
                id="reject-reason"
                placeholder="Descrivi il motivo per cui l'evento non può essere approvato..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              data-testid="button-cancel-reject"
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              data-testid="button-confirm-reject"
            >
              Conferma Rifiuto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
