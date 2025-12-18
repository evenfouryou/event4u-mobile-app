import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { type SiaeTransmission } from "@shared/schema";
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
import {
  Send,
  FileText,
  Calendar,
  Euro,
  Ticket,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  RefreshCw,
  Loader2,
  Upload,
} from "lucide-react";

export default function SiaeTransmissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTransmission, setSelectedTransmission] = useState<SiaeTransmission | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [transmissionType, setTransmissionType] = useState<string>("daily");
  const [periodDate, setPeriodDate] = useState<string>("");

  const companyId = user?.companyId;

  const { data: transmissions, isLoading } = useQuery<SiaeTransmission[]>({
    queryKey: ['/api/siae/companies', companyId, 'transmissions'],
    enabled: !!companyId,
  });

  const createTransmissionMutation = useMutation({
    mutationFn: async (data: { transmissionType: string; periodDate: string }) => {
      const response = await apiRequest("POST", `/api/siae/transmissions`, {
        ...data,
        companyId,
        periodDate: new Date(data.periodDate).toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('transmissions') || false });
      setIsCreateDialogOpen(false);
      setPeriodDate("");
      toast({
        title: "Trasmissione Creata",
        description: "Il file XML è stato generato. Procedi con l'invio.",
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

  const retryTransmissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/siae/transmissions/${id}`, {
        status: "pending",
        retryCount: (selectedTransmission?.retryCount || 0) + 1,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('transmissions') || false });
      toast({
        title: "Riprova Invio",
        description: "La trasmissione è stata rimessa in coda.",
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
      case "sent":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Inviata</Badge>;
      case "received":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ricevuta</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Attesa</Badge>;
      case "error":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Errore</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "daily":
        return <Badge variant="outline">Giornaliera</Badge>;
      case "monthly":
        return <Badge variant="outline">Mensile</Badge>;
      case "corrective":
        return <Badge variant="outline">Correttiva</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredTransmissions = transmissions?.filter((trans) => {
    const matchesStatus = statusFilter === "all" || trans.status === statusFilter;
    const matchesType = typeFilter === "all" || trans.transmissionType === typeFilter;
    return matchesStatus && matchesType;
  });

  const stats = {
    total: transmissions?.length || 0,
    pending: transmissions?.filter(t => t.status === "pending").length || 0,
    sent: transmissions?.filter(t => t.status === "sent").length || 0,
    received: transmissions?.filter(t => t.status === "received").length || 0,
    error: transmissions?.filter(t => t.status === "error").length || 0,
    totalTickets: transmissions?.reduce((sum, t) => sum + (t.ticketsCount || 0), 0) || 0,
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-siae-transmissions">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3" data-testid="page-title">
            <Send className="w-6 h-6 sm:w-8 sm:h-8 text-[#FFD700] flex-shrink-0" />
            Trasmissioni XML SIAE
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestisci l'invio dei dati a SIAE via PEC
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create">
          <Upload className="w-4 h-4 mr-2" />
          Genera Trasmissione
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground mb-1">Totale</div>
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
              <Send className="w-3 h-3" /> Inviate
            </div>
            <div className="text-2xl font-bold text-blue-400" data-testid="stat-sent">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ricevute
            </div>
            <div className="text-2xl font-bold text-emerald-400" data-testid="stat-received">{stats.received}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Errori
            </div>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-error">{stats.error}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Ticket className="w-3 h-3" /> Biglietti
            </div>
            <div className="text-2xl font-bold" data-testid="stat-tickets">{stats.totalTickets}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="pending">In Attesa</SelectItem>
                  <SelectItem value="sent">Inviate</SelectItem>
                  <SelectItem value="received">Ricevute</SelectItem>
                  <SelectItem value="error">Errori</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="daily">Giornaliera</SelectItem>
                  <SelectItem value="monthly">Mensile</SelectItem>
                  <SelectItem value="corrective">Correttiva</SelectItem>
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
      ) : filteredTransmissions?.length === 0 ? (
        <Card className="glass-card" data-testid="card-empty-state">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Send className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessuna Trasmissione</h3>
            <p className="text-muted-foreground mb-4">
              Non ci sono trasmissioni XML registrate
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Genera Prima Trasmissione
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card" data-testid="card-transmissions-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>File</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Biglietti</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Invio</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransmissions?.map((transmission) => (
                    <TableRow key={transmission.id} data-testid={`row-transmission-${transmission.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`cell-file-${transmission.id}`}>
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {transmission.fileName || `${transmission.id.slice(0, 8)}${transmission.fileExtension}`}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-type-${transmission.id}`}>
                        {getTypeBadge(transmission.transmissionType)}
                      </TableCell>
                      <TableCell data-testid={`cell-period-${transmission.id}`}>
                        {transmission.periodDate && format(new Date(transmission.periodDate), "dd/MM/yyyy", { locale: it })}
                      </TableCell>
                      <TableCell data-testid={`cell-tickets-${transmission.id}`}>
                        <span className="flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          {transmission.ticketsCount}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-amount-${transmission.id}`}>
                        <span className="flex items-center gap-1 text-[#FFD700]">
                          <Euro className="w-3 h-3" />
                          {Number(transmission.totalAmount || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-status-${transmission.id}`}>
                        {getStatusBadge(transmission.status)}
                      </TableCell>
                      <TableCell data-testid={`cell-sent-${transmission.id}`}>
                        {transmission.sentAt ? format(new Date(transmission.sentAt), "dd/MM HH:mm", { locale: it }) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTransmission(transmission);
                              setIsDetailDialogOpen(true);
                            }}
                            data-testid={`button-view-${transmission.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {transmission.fileContent && (
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-download-${transmission.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          {transmission.status === "error" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTransmission(transmission);
                                retryTransmissionMutation.mutate(transmission.id);
                              }}
                              data-testid={`button-retry-${transmission.id}`}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#FFD700]" />
              Genera Trasmissione XML
            </DialogTitle>
            <DialogDescription>
              Crea un nuovo file XML da inviare a SIAE
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo Trasmissione</Label>
              <Select value={transmissionType} onValueChange={setTransmissionType}>
                <SelectTrigger data-testid="select-transmission-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Giornaliera</SelectItem>
                  <SelectItem value="monthly">Mensile</SelectItem>
                  <SelectItem value="corrective">Correttiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Periodo</Label>
              <Input
                type="date"
                value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)}
                data-testid="input-period-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => {
                createTransmissionMutation.mutate({
                  transmissionType,
                  periodDate,
                });
              }}
              disabled={!periodDate || createTransmissionMutation.isPending}
              data-testid="button-generate"
            >
              {createTransmissionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Genera XML
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FFD700]" />
              Dettaglio Trasmissione
            </DialogTitle>
          </DialogHeader>
          {selectedTransmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Stato</div>
                  {getStatusBadge(selectedTransmission.status)}
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Biglietti</div>
                  <div className="text-xl font-bold">{selectedTransmission.ticketsCount}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tipo</span>
                  <span>{selectedTransmission.transmissionType === "daily" ? "Giornaliera" : 
                         selectedTransmission.transmissionType === "monthly" ? "Mensile" : "Correttiva"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Periodo</span>
                  <span>
                    {selectedTransmission.periodDate && format(new Date(selectedTransmission.periodDate), "dd/MM/yyyy", { locale: it })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Importo Totale</span>
                  <span className="text-[#FFD700] font-bold">€{Number(selectedTransmission.totalAmount || 0).toFixed(2)}</span>
                </div>
                {selectedTransmission.fileName && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">File</span>
                    <span className="font-mono text-xs">{selectedTransmission.fileName}</span>
                  </div>
                )}
                {selectedTransmission.sentAt && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Data Invio</span>
                    <span>
                      {format(new Date(selectedTransmission.sentAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                )}
                {selectedTransmission.sentToPec && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">PEC Destinatario</span>
                    <span className="text-sm">{selectedTransmission.sentToPec}</span>
                  </div>
                )}
                {selectedTransmission.receivedAt && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Data Ricezione</span>
                    <span>
                      {format(new Date(selectedTransmission.receivedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                )}
                {selectedTransmission.errorMessage && (
                  <div className="py-2">
                    <span className="text-muted-foreground block mb-1">Errore</span>
                    <p className="text-sm text-destructive">{selectedTransmission.errorMessage}</p>
                  </div>
                )}
                {selectedTransmission.retryCount > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Tentativi</span>
                    <span>{selectedTransmission.retryCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
