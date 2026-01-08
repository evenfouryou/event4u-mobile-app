import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Users,
  Calendar,
  Building2,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Stamp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
} from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";

interface NameChangeData {
  id: string;
  originalTicketId: string;
  newTicketId: string | null;
  newFirstName: string;
  newLastName: string;
  newEmail: string | null;
  fee: string | null;
  paymentStatus: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
  sigilloFiscaleOriginale: string | null; // SIAE Compliance
  ticket: {
    id: string;
    ticketCode: string;
    participantFirstName: string | null;
    participantLastName: string | null;
    ticketedEventId: string;
    sigilloFiscale: string | null; // SIAE Compliance
  };
  ticketedEvent: {
    id: string;
    eventId: string;
    companyId: string;
    nameChangeFee: string | null;
  };
  event: {
    id: string;
    name: string;
    startDatetime: string;
  };
  company: {
    id: string;
    name: string;
  };
}

// Biglietti annullati in attesa di riemissione (anomalia fiscale)
interface PendingReissueData {
  cancelledAwaitingReissue: Array<{
    id: string;
    ticketCode: string;
    sigilloFiscale: string | null;
    participantFirstName: string | null;
    participantLastName: string | null;
    cancellationDate: string | null;
    event: { id: string; name: string };
    company: { id: string; name: string };
  }>;
  pendingRequests: NameChangeData[];
  summary: {
    cancelledAwaitingReissueCount: number;
    pendingRequestsCount: number;
    totalPendingReissue: number;
  };
}

interface FiltersData {
  companies: { id: string; name: string }[];
  events: { id: string; name: string; companyId: string }[];
  statuses: string[];
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.08,
    },
  }),
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "In Attesa", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  completed: { label: "Completato", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "Rifiutato", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

const paymentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_required: { label: "Non richiesto", variant: "outline" },
  pending: { label: "In attesa", variant: "secondary" },
  paid: { label: "Pagato", variant: "default" },
  refunded: { label: "Rimborsato", variant: "destructive" },
};

export default function AdminNameChanges() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Fetch filters data
  const { data: filtersData } = useQuery<FiltersData>({
    queryKey: ["/api/siae/admin/name-changes/filters"],
  });

  // SIAE Compliance: Fetch pending reissue data (annullati senza nuovo titolo)
  const { data: pendingReissueData } = useQuery<PendingReissueData>({
    queryKey: ["/api/siae/admin/name-changes/pending-reissue"],
  });

  // Build query string for name changes
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCompanyId) params.append('companyId', selectedCompanyId);
    if (selectedEventId) params.append('eventId', selectedEventId);
    if (selectedStatus) params.append('status', selectedStatus);
    params.append('page', String(page));
    return params.toString();
  }, [selectedCompanyId, selectedEventId, selectedStatus, page]);

  // Fetch name changes with filters
  const { data: nameChangesData, isLoading, refetch } = useQuery<{ nameChanges: NameChangeData[]; pagination: PaginationData }>({
    queryKey: ["/api/siae/admin/name-changes", selectedCompanyId, selectedEventId, selectedStatus, page],
    queryFn: async () => {
      const response = await fetch(`/api/siae/admin/name-changes?${queryParams}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch name changes");
      }
      return response.json();
    },
  });

  // Filter events by selected company
  const filteredEvents = useMemo(() => {
    if (!filtersData?.events) return [];
    if (!selectedCompanyId) return filtersData.events;
    return filtersData.events.filter(e => e.companyId === selectedCompanyId);
  }, [filtersData?.events, selectedCompanyId]);

  // Stats
  const stats = useMemo(() => {
    const nameChanges = nameChangesData?.nameChanges || [];
    return {
      total: nameChangesData?.pagination?.total || 0,
      pending: nameChanges.filter(nc => nc.status === 'pending').length,
      completed: nameChanges.filter(nc => nc.status === 'completed').length,
      rejected: nameChanges.filter(nc => nc.status === 'rejected').length,
    };
  }, [nameChangesData]);

  // Mutation for processing name changes
  const processMutation = useMutation({
    mutationFn: async ({ id, action, rejectionReason }: { id: string; action: 'approve' | 'reject'; rejectionReason?: string }) => {
      const response = await apiRequest("POST", `/api/siae/admin/name-changes/${id}/process`, { action, rejectionReason });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all name-changes queries using predicate to match any filter combinations
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === "/api/siae/admin/name-changes";
        }
      });
      toast({
        title: variables.action === 'approve' ? "Cambio approvato" : "Cambio rifiutato",
        description: data.message,
      });
      setProcessingId(null);
      setShowRejectDialog(false);
      setRejectingId(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Si è verificato un errore";
      const errorCode = error.code;
      
      let description = errorMessage;
      if (errorCode === "PAYMENT_REQUIRED") {
        description = "Impossibile approvare: il pagamento della commissione non è ancora stato completato.";
      }
      
      toast({
        title: "Errore",
        description,
        variant: "destructive",
      });
      setProcessingId(null);
    },
  });

  const handleApprove = (id: string) => {
    setProcessingId(id);
    processMutation.mutate({ id, action: 'approve' });
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = () => {
    if (rejectingId) {
      setProcessingId(rejectingId);
      processMutation.mutate({ id: rejectingId, action: 'reject', rejectionReason });
    }
  };

  const handleCompanyChange = (value: string) => {
    setSelectedCompanyId(value === "all" ? "" : value);
    setSelectedEventId(""); // Reset event when company changes
    setPage(1);
  };

  const handleEventChange = (value: string) => {
    setSelectedEventId(value === "all" ? "" : value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value === "all" ? "" : value);
    setPage(1);
  };

  const handleRefresh = () => {
    refetch();
  };

  const content = (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HapticButton
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </HapticButton>
          <div>
            <h1 className="text-2xl font-bold">Cambi Nominativo</h1>
            <p className="text-muted-foreground text-sm">Gestione richieste cambio nominativo SIAE</p>
          </div>
        </div>
        <HapticButton
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </HapticButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Totale</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">In Attesa</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-yellow-500">{stats.pending}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Completati</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-500">{stats.completed}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Rifiutati</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-red-500">{stats.rejected}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* SIAE Compliance Alert: Biglietti in attesa di riemissione */}
      {pendingReissueData && pendingReissueData.summary?.totalPendingReissue > 0 && (
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base text-amber-600 dark:text-amber-400">
                  Attenzione: Biglietti in Attesa di Riemissione
                </CardTitle>
              </div>
              <CardDescription className="text-amber-600/80 dark:text-amber-400/80">
                {pendingReissueData.summary.cancelledAwaitingReissueCount > 0 && (
                  <span className="block">
                    {pendingReissueData.summary.cancelledAwaitingReissueCount} biglietti annullati senza nuovo titolo emesso (anomalia fiscale)
                  </span>
                )}
                {pendingReissueData.summary.pendingRequestsCount > 0 && (
                  <span className="block">
                    {pendingReissueData.summary.pendingRequestsCount} richieste di cambio nominativo in attesa di elaborazione
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            {pendingReissueData.cancelledAwaitingReissue.length > 0 && (
              <CardContent className="pt-0">
                <div className="text-sm space-y-2">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Biglietti con annullamento non completato:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {pendingReissueData.cancelledAwaitingReissue.slice(0, 5).map((ticket) => (
                      <div key={ticket.id} className="flex items-center gap-2 text-xs bg-amber-500/10 p-2 rounded">
                        <Stamp className="h-3 w-3 text-amber-500" />
                        <span className="font-mono">{ticket.sigilloFiscale || 'N/A'}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{ticket.ticketCode}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{ticket.participantFirstName} {ticket.participantLastName}</span>
                      </div>
                    ))}
                    {pendingReissueData.cancelledAwaitingReissue.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        ... e altri {pendingReissueData.cancelledAwaitingReissue.length - 5} biglietti
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filtri</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gestore</label>
              <Select value={selectedCompanyId || "all"} onValueChange={handleCompanyChange}>
                <SelectTrigger data-testid="select-company">
                  <SelectValue placeholder="Tutti i gestori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i gestori</SelectItem>
                  {filtersData?.companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Evento</label>
              <Select value={selectedEventId || "all"} onValueChange={handleEventChange}>
                <SelectTrigger data-testid="select-event">
                  <SelectValue placeholder="Tutti gli eventi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli eventi</SelectItem>
                  {filteredEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stato</label>
              <Select value={selectedStatus || "all"} onValueChange={handleStatusChange}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="pending">In Attesa</SelectItem>
                  <SelectItem value="completed">Completato</SelectItem>
                  <SelectItem value="rejected">Rifiutato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Richieste Cambio Nominativo</CardTitle>
          <CardDescription>
            {nameChangesData?.pagination?.total || 0} richieste trovate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : nameChangesData?.nameChanges?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nessuna richiesta di cambio nominativo trovata</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nominativo Originale</TableHead>
                      <TableHead>Sigillo Fiscale</TableHead>
                      <TableHead>Nuovo Nominativo</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Gestore</TableHead>
                      <TableHead>Commissione</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nameChangesData?.nameChanges?.map((nc) => (
                      <TableRow key={nc.id} data-testid={`row-name-change-${nc.id}`}>
                        <TableCell>
                          <div className="font-medium">
                            {nc.ticket.participantFirstName} {nc.ticket.participantLastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{nc.ticket.ticketCode}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Stamp className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-xs">{nc.sigilloFiscaleOriginale || nc.ticket.sigilloFiscale || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {nc.newFirstName} {nc.newLastName}
                          </div>
                          {nc.newEmail && (
                            <div className="text-xs text-muted-foreground">{nc.newEmail}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{nc.event.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(nc.event.startDatetime), "dd MMM yyyy", { locale: it })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{nc.company.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {parseFloat(nc.fee || '0') > 0 ? (
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-4 w-4 text-green-500" />
                              <span className="font-medium">€{parseFloat(nc.fee || '0').toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={paymentStatusConfig[nc.paymentStatus]?.variant || "outline"}>
                            {paymentStatusConfig[nc.paymentStatus]?.label || nc.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[nc.status]?.variant || "outline"} className="gap-1">
                            {statusConfig[nc.status]?.icon}
                            {statusConfig[nc.status]?.label || nc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(nc.createdAt), "dd/MM/yyyy", { locale: it })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(nc.createdAt), "HH:mm", { locale: it })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {nc.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(nc.id)}
                                disabled={processingId === nc.id}
                                data-testid={`button-approve-${nc.id}`}
                              >
                                {processingId === nc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                <span className="ml-1 hidden md:inline">Approva</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectClick(nc.id)}
                                disabled={processingId === nc.id}
                                data-testid={`button-reject-${nc.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                                <span className="ml-1 hidden md:inline">Rifiuta</span>
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {nameChangesData?.pagination && nameChangesData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Pagina {nameChangesData.pagination.page} di {nameChangesData.pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      data-testid="button-prev-page"
                    >
                      Precedente
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= nameChangesData.pagination.totalPages}
                      data-testid="button-next-page"
                    >
                      Successivo
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (isMobile) {
    return (
      <MobileAppLayout>
        <MobileHeader title="Cambi Nominativo" showBack onBack={() => setLocation("/admin")} />
        {content}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rifiuta cambio nominativo</DialogTitle>
              <DialogDescription>
                Inserisci una motivazione per il rifiuto della richiesta.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Motivazione rifiuto (opzionale)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              data-testid="input-rejection-reason"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Annulla
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejectConfirm}
                disabled={processMutation.isPending}
                data-testid="button-confirm-reject"
              >
                {processMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Conferma rifiuto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MobileAppLayout>
    );
  }

  return (
    <>
      {content}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta cambio nominativo</DialogTitle>
            <DialogDescription>
              Inserisci una motivazione per il rifiuto della richiesta.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivazione rifiuto (opzionale)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            data-testid="input-rejection-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={processMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {processMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Conferma rifiuto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
