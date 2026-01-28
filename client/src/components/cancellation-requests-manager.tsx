import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Check,
  X,
  Clock,
  Users,
  Armchair,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CancellationRequest {
  id: string;
  eventId: string;
  reservationType: 'list_entry' | 'table_reservation';
  listEntryId?: string;
  tableReservationId?: string;
  requestReason?: string;
  status: 'pending' | 'approved' | 'rejected';
  autoApproved: boolean;
  createdAt: string;
  processedAt?: string;
  processedNote?: string;
  reservationDetails?: {
    guestName?: string;
    reservationName?: string;
    phone?: string;
    email?: string;
    listName?: string;
  };
  requesterName?: string;
}

interface CancellationRequestsManagerProps {
  eventId?: string;
  companyId?: string;
}

export function CancellationRequestsManager({ eventId }: CancellationRequestsManagerProps) {
  const { toast } = useToast();
  const [processDialog, setProcessDialog] = useState<{
    request: CancellationRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [processNote, setProcessNote] = useState("");

  const { data: requests = [], isLoading, refetch } = useQuery<CancellationRequest[]>({
    queryKey: ['/api/gestore/cancellation-requests', eventId],
    queryFn: async () => {
      const url = eventId 
        ? `/api/gestore/cancellation-requests?eventId=${eventId}` 
        : '/api/gestore/cancellation-requests';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, action, processedNote }: { id: string; action: 'approve' | 'reject'; processedNote?: string }) => {
      return apiRequest('POST', `/api/gestore/cancellation-requests/${id}/process`, { action, processedNote });
    },
    onSuccess: () => {
      toast({
        title: processDialog?.action === 'approve' ? "Richiesta approvata" : "Richiesta rifiutata",
        description: processDialog?.action === 'approve' 
          ? "La prenotazione è stata cancellata." 
          : "La richiesta di cancellazione è stata rifiutata."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/gestore/cancellation-requests', eventId] });
      refetch();
      setProcessDialog(null);
      setProcessNote("");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile elaborare la richiesta.",
        variant: "destructive",
      });
    },
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const handleProcess = () => {
    if (!processDialog) return;
    processMutation.mutate({
      id: processDialog.request.id,
      action: processDialog.action,
      processedNote: processNote || undefined,
    });
  };

  const getStatusBadge = (status: string, autoApproved: boolean) => {
    if (status === 'approved') {
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
          {autoApproved ? 'Auto-approvato' : 'Approvato'}
        </Badge>
      );
    }
    if (status === 'rejected') {
      return <Badge variant="destructive">Rifiutato</Badge>;
    }
    return (
      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        <Clock className="h-3 w-3 mr-1" />
        In attesa
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Richieste di Cancellazione</h3>
          <p className="text-sm text-muted-foreground">
            {pendingRequests.length} richieste in attesa
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="btn-refresh-cancellations">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">In Attesa</h4>
          {pendingRequests.map((request) => (
            <Card key={request.id} className="border-yellow-500/30" data-testid={`card-cancellation-${request.id}`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {request.reservationType === 'list_entry' ? (
                        <Users className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Armchair className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">
                        {request.reservationDetails?.guestName || request.reservationDetails?.reservationName || 'N/A'}
                      </span>
                      {getStatusBadge(request.status, request.autoApproved)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {request.reservationDetails?.listName && (
                        <p>Lista: {request.reservationDetails.listName}</p>
                      )}
                      {request.requesterName && (
                        <p>Richiesto da: {request.requesterName}</p>
                      )}
                      {request.requestReason && (
                        <p className="italic">"{request.requestReason}"</p>
                      )}
                      <p>
                        {format(new Date(request.createdAt), "dd MMM yyyy HH:mm", { locale: it })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => setProcessDialog({ request, action: 'approve' })}
                      data-testid={`btn-approve-${request.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approva
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => setProcessDialog({ request, action: 'reject' })}
                      data-testid={`btn-reject-${request.id}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rifiuta
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pendingRequests.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <h4 className="font-medium">Nessuna richiesta in attesa</h4>
            <p className="text-sm text-muted-foreground">
              Le richieste di cancellazione appariranno qui
            </p>
          </CardContent>
        </Card>
      )}

      {processedRequests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Storico</h4>
          {processedRequests.slice(0, 5).map((request) => (
            <Card key={request.id} className="opacity-75">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {request.reservationType === 'list_entry' ? (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Armchair className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {request.reservationDetails?.guestName || request.reservationDetails?.reservationName || 'N/A'}
                    </span>
                    {getStatusBadge(request.status, request.autoApproved)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(request.processedAt || request.createdAt), "dd MMM HH:mm", { locale: it })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!processDialog} onOpenChange={(open) => !open && setProcessDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processDialog?.action === 'approve' ? 'Approva Cancellazione' : 'Rifiuta Cancellazione'}
            </DialogTitle>
            <DialogDescription>
              {processDialog?.action === 'approve' 
                ? `Stai per approvare la cancellazione di "${processDialog?.request.reservationDetails?.guestName || processDialog?.request.reservationDetails?.reservationName}". La prenotazione verrà eliminata.`
                : `Stai per rifiutare la richiesta di cancellazione. La prenotazione rimarrà attiva.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Nota (opzionale)</label>
              <Input
                placeholder="Aggiungi una nota..."
                value={processNote}
                onChange={(e) => setProcessNote(e.target.value)}
                data-testid="input-process-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog(null)}>
              Annulla
            </Button>
            <Button
              variant={processDialog?.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleProcess}
              disabled={processMutation.isPending}
              data-testid="btn-confirm-process"
            >
              {processMutation.isPending ? 'Elaborazione...' : (
                processDialog?.action === 'approve' ? 'Conferma Approvazione' : 'Conferma Rifiuto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CancellationRequestsCount({ eventId }: { eventId?: string }) {
  const { data } = useQuery<{ count: number }>({
    queryKey: ['/api/gestore/cancellation-requests/count', eventId],
    queryFn: async () => {
      const url = eventId 
        ? `/api/gestore/cancellation-requests/count?eventId=${eventId}` 
        : '/api/gestore/cancellation-requests/count';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (!data?.count) return null;

  return (
    <Badge variant="destructive" className="ml-2">
      {data.count}
    </Badge>
  );
}
