import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { type SiaeNameChange } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  UserCog,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Check,
  X,
  Search,
  Loader2,
  Stamp,
} from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SiaeNameChangesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedRequest, setSelectedRequest] = useState<SiaeNameChange | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [processNotes, setProcessNotes] = useState("");
  const [processAction, setProcessAction] = useState<"approve" | "reject">("approve");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");

  const isSuperAdmin = user?.role === 'super_admin';
  const companyId = user?.companyId;

  // Load companies for selector (super_admin only)
  const { data: companiesData } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    enabled: isSuperAdmin,
  });

  // Determine which API to use based on selected company
  const apiUrl = selectedCompanyId === "all" 
    ? '/api/siae/name-changes/all'
    : `/api/siae/companies/${selectedCompanyId}/name-changes`;

  const { data: nameChanges, isLoading } = useQuery<any[]>({
    queryKey: selectedCompanyId === "all" 
      ? ['/api/siae/name-changes/all']
      : ['/api/siae/companies', selectedCompanyId, 'name-changes'],
    enabled: isSuperAdmin ? true : !!companyId,
  });

  // For non-super_admin, always use their company
  const { data: myCompanyChanges, isLoading: isLoadingMy } = useQuery<any[]>({
    queryKey: ['/api/siae/companies', companyId, 'name-changes'],
    enabled: !isSuperAdmin && !!companyId,
  });

  const effectiveNameChanges = isSuperAdmin ? nameChanges : myCompanyChanges;
  const effectiveLoading = isSuperAdmin ? isLoading : isLoadingMy;

  const processRequestMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      // Usa l'endpoint /process che gestisce il workflow completo:
      // - Annulla biglietto originale
      // - Richiede nuovo sigillo fiscale
      // - Crea nuovo biglietto con i dati del nuovo titolare
      // - Invia email con nuovo biglietto
      const action = status === 'completed' ? 'approve' : 'reject';
      const response = await apiRequest("POST", `/api/siae/name-changes/${id}/process`, {
        action,
        rejectionReason: action === 'reject' ? notes : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (q) => (q.queryKey[0] as string)?.includes('name-changes') || false
      });
      setIsProcessDialogOpen(false);
      setSelectedRequest(null);
      setProcessNotes("");
      toast({
        title: processAction === "approve" ? "Richiesta Approvata" : "Richiesta Rifiutata",
        description: "La richiesta di cambio nominativo è stata elaborata.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completata</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Attesa</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rifiutata</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRequests = effectiveNameChanges?.filter((request) => {
    const matchesSearch =
      searchQuery === "" ||
      request.newFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.newLastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.originalTicketId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request as any).companyName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: effectiveNameChanges?.length || 0,
    pending: effectiveNameChanges?.filter(r => r.status === "pending").length || 0,
    completed: effectiveNameChanges?.filter(r => r.status === "completed").length || 0,
    rejected: effectiveNameChanges?.filter(r => r.status === "rejected").length || 0,
  };

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-name-changes">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cambio Nominativo</h1>
            <p className="text-muted-foreground">Gestisci le richieste di cambio nominativo sui biglietti</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Totale Richieste</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-500" data-testid="stat-pending">{stats.pending}</div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> In Attesa
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500" data-testid="stat-completed">{stats.completed}</div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completate
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500" data-testid="stat-rejected">{stats.rejected}</div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Rifiutate
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {isSuperAdmin && (
                <div className="w-56">
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger data-testid="select-company-filter">
                      <SelectValue placeholder="Organizzatore" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli organizzatori</SelectItem>
                      {companiesData?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Cerca per nome, codice o organizzatore..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="pending">In Attesa</SelectItem>
                    <SelectItem value="completed">Completate</SelectItem>
                    <SelectItem value="rejected">Rifiutate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {effectiveLoading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : filteredRequests?.length === 0 ? (
          <Card data-testid="card-empty-state">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <UserCog className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nessuna Richiesta</h3>
              <p className="text-muted-foreground">
                Non ci sono richieste di cambio nominativo
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card data-testid="card-requests-table">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Biglietto</TableHead>
                    <TableHead>Sigillo Fiscale</TableHead>
                    {isSuperAdmin && <TableHead>Organizzatore</TableHead>}
                    <TableHead>Nuovo Nome</TableHead>
                    <TableHead>Nuovo Cognome</TableHead>
                    <TableHead>Tipo Richiedente</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests?.map((request) => (
                    <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`cell-ticket-${request.id}`}>
                        {request.originalTicketId?.slice(0, 8)}...
                      </TableCell>
                      <TableCell data-testid={`cell-sigillo-${request.id}`}>
                        <div className="flex items-center gap-1">
                          <Stamp className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-xs">{(request as any).sigilloFiscaleOriginale || 'N/A'}</span>
                        </div>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell data-testid={`cell-company-${request.id}`}>
                          <span className="text-sm">{(request as any).companyName || '-'}</span>
                        </TableCell>
                      )}
                      <TableCell data-testid={`cell-firstname-${request.id}`}>
                        {request.newFirstName}
                      </TableCell>
                      <TableCell data-testid={`cell-lastname-${request.id}`}>
                        {request.newLastName}
                      </TableCell>
                      <TableCell data-testid={`cell-type-${request.id}`}>
                        {request.requestedByType === "customer" ? "Cliente" : "Operatore"}
                      </TableCell>
                      <TableCell data-testid={`cell-status-${request.id}`}>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell data-testid={`cell-date-${request.id}`}>
                        {request.createdAt && format(new Date(request.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsDetailDialogOpen(true);
                            }}
                            data-testid={`button-view-${request.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {request.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-emerald-500 hover:text-emerald-400"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setProcessAction("approve");
                                  setIsProcessDialogOpen(true);
                                }}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive/80"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setProcessAction("reject");
                                  setIsProcessDialogOpen(true);
                                }}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-lg" data-testid="dialog-detail">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-[#FFD700]" />
                Dettaglio Richiesta
              </DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Stato</div>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Biglietto</div>
                    <div className="font-mono text-sm">{selectedRequest.originalTicketId?.slice(0, 12)}...</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Nuovo Nome</span>
                    <span>{selectedRequest.newFirstName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Nuovo Cognome</span>
                    <span>{selectedRequest.newLastName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Tipo Richiedente</span>
                    <span>{selectedRequest.requestedByType === "customer" ? "Cliente" : "Operatore"}</span>
                  </div>
                  {selectedRequest.fee && Number(selectedRequest.fee) > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Commissione</span>
                      <span>€{Number(selectedRequest.fee).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Data Richiesta</span>
                    <span>
                      {selectedRequest.createdAt && format(new Date(selectedRequest.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                  {selectedRequest.processedAt && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Data Elaborazione</span>
                      <span>
                        {format(new Date(selectedRequest.processedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                      </span>
                    </div>
                  )}
                  {selectedRequest.notes && (
                    <div className="py-2">
                      <span className="text-muted-foreground block mb-1">Note</span>
                      <p className="text-sm">{selectedRequest.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
          <DialogContent data-testid="dialog-process">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {processAction === "approve" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                {processAction === "approve" ? "Approva Richiesta" : "Rifiuta Richiesta"}
              </DialogTitle>
              <DialogDescription>
                {processAction === "approve"
                  ? "Conferma l'approvazione del cambio nominativo"
                  : "Inserisci il motivo del rifiuto"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Note (opzionale)</Label>
                <Textarea
                  placeholder="Inserisci eventuali note..."
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  data-testid="input-process-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={() => {
                  if (selectedRequest) {
                    processRequestMutation.mutate({
                      id: selectedRequest.id,
                      status: processAction === "approve" ? "completed" : "rejected",
                      notes: processNotes,
                    });
                  }
                }}
                disabled={processRequestMutation.isPending}
                className={processAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                variant={processAction === "reject" ? "destructive" : "default"}
                data-testid="button-confirm-process"
              >
                {processRequestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {processAction === "approve" ? "Approva" : "Rifiuta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Mobile version
  return (
    <MobileAppLayout
      header={<MobileHeader title="Cambio Nominativo" showBackButton showMenuButton showUserMenu />}
      contentClassName="pb-24"
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-siae-name-changes">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground mt-1">
              Gestisci le richieste di cambio nominativo sui biglietti
            </p>
          </div>
        </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground mb-1">Totale Richieste</div>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> In Attesa
            </div>
            <div className="text-2xl font-bold text-amber-400" data-testid="stat-pending">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completate
            </div>
            <div className="text-2xl font-bold text-emerald-400" data-testid="stat-completed">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Rifiutate
            </div>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-rejected">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cerca per nome o codice biglietto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="pending">In Attesa</SelectItem>
                  <SelectItem value="completed">Completate</SelectItem>
                  <SelectItem value="rejected">Rifiutate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="glass-card">
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredRequests?.length === 0 ? (
        <Card className="glass-card" data-testid="card-empty-state">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <UserCog className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessuna Richiesta</h3>
            <p className="text-muted-foreground">
              Non ci sono richieste di cambio nominativo
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card" data-testid="card-requests-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Biglietto</TableHead>
                    <TableHead>Nuovo Nome</TableHead>
                    <TableHead>Nuovo Cognome</TableHead>
                    <TableHead>Tipo Richiedente</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests?.map((request) => (
                    <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`cell-ticket-${request.id}`}>
                        {request.originalTicketId?.slice(0, 8)}...
                      </TableCell>
                      <TableCell data-testid={`cell-firstname-${request.id}`}>
                        {request.newFirstName}
                      </TableCell>
                      <TableCell data-testid={`cell-lastname-${request.id}`}>
                        {request.newLastName}
                      </TableCell>
                      <TableCell data-testid={`cell-type-${request.id}`}>
                        {request.requestedByType === "customer" ? "Cliente" : "Operatore"}
                      </TableCell>
                      <TableCell data-testid={`cell-status-${request.id}`}>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell data-testid={`cell-date-${request.id}`}>
                        {request.createdAt && format(new Date(request.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsDetailDialogOpen(true);
                            }}
                            data-testid={`button-view-${request.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {request.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-emerald-500 hover:text-emerald-400"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setProcessAction("approve");
                                  setIsProcessDialogOpen(true);
                                }}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive/80"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setProcessAction("reject");
                                  setIsProcessDialogOpen(true);
                                }}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-[#FFD700]" />
              Dettaglio Richiesta
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Stato</div>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Biglietto</div>
                  <div className="font-mono text-sm">{selectedRequest.originalTicketId?.slice(0, 12)}...</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Nuovo Nome</span>
                  <span>{selectedRequest.newFirstName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Nuovo Cognome</span>
                  <span>{selectedRequest.newLastName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tipo Richiedente</span>
                  <span>{selectedRequest.requestedByType === "customer" ? "Cliente" : "Operatore"}</span>
                </div>
                {selectedRequest.fee && Number(selectedRequest.fee) > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Commissione</span>
                    <span>€{Number(selectedRequest.fee).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Data Richiesta</span>
                  <span>
                    {selectedRequest.createdAt && format(new Date(selectedRequest.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </span>
                </div>
                {selectedRequest.processedAt && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Data Elaborazione</span>
                    <span>
                      {format(new Date(selectedRequest.processedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                )}
                {selectedRequest.notes && (
                  <div className="py-2">
                    <span className="text-muted-foreground block mb-1">Note</span>
                    <p className="text-sm">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent data-testid="dialog-process">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {processAction === "approve" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              {processAction === "approve" ? "Approva Richiesta" : "Rifiuta Richiesta"}
            </DialogTitle>
            <DialogDescription>
              {processAction === "approve"
                ? "Conferma l'approvazione del cambio nominativo"
                : "Inserisci il motivo del rifiuto"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Note (opzionale)</Label>
              <Textarea
                placeholder="Inserisci eventuali note..."
                value={processNotes}
                onChange={(e) => setProcessNotes(e.target.value)}
                data-testid="input-process-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => {
                if (selectedRequest) {
                  processRequestMutation.mutate({
                    id: selectedRequest.id,
                    status: processAction === "approve" ? "completed" : "rejected",
                    notes: processNotes,
                  });
                }
              }}
              disabled={processRequestMutation.isPending}
              className={processAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              variant={processAction === "reject" ? "destructive" : "default"}
              data-testid="button-confirm-process"
            >
              {processRequestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {processAction === "approve" ? "Approva" : "Rifiuta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MobileAppLayout>
  );
}
