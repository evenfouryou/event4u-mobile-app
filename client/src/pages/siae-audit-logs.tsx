import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { type SiaeAuditLog } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardList,
  Search,
  Eye,
  User,
  Calendar,
  Activity,
  FileText,
  Tag,
  Shield,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Pencil,
  Trash2,
  Send,
  Ban,
  Globe,
} from "lucide-react";

export default function SiaeAuditLogsPage() {
  const { user } = useAuth();
  const [selectedLog, setSelectedLog] = useState<SiaeAuditLog | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const companyId = user?.companyId;

  const { data: auditLogs, isLoading } = useQuery<SiaeAuditLog[]>({
    queryKey: ['/api/siae/companies', companyId, 'audit-logs'],
    enabled: !!companyId,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <PlusCircle className="h-4 w-4 text-emerald-400" />;
      case "update":
        return <Pencil className="h-4 w-4 text-blue-400" />;
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-400" />;
      case "cancel":
        return <Ban className="h-4 w-4 text-orange-400" />;
      case "emit":
        return <FileText className="h-4 w-4 text-purple-400" />;
      case "validate":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "transmit":
        return <Send className="h-4 w-4 text-cyan-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Creazione</Badge>;
      case "update":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Modifica</Badge>;
      case "delete":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Eliminazione</Badge>;
      case "cancel":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Annullamento</Badge>;
      case "emit":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Emissione</Badge>;
      case "validate":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Validazione</Badge>;
      case "transmit":
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Trasmissione</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getEntityBadge = (entityType: string) => {
    switch (entityType) {
      case "ticket":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Biglietto</Badge>;
      case "transaction":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Transazione</Badge>;
      case "customer":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Cliente</Badge>;
      case "event":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Evento</Badge>;
      case "sector":
        return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">Settore</Badge>;
      case "subscription":
        return <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Abbonamento</Badge>;
      case "name_change":
        return <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">Cambio Nome</Badge>;
      case "resale":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Rivendita</Badge>;
      default:
        return <Badge variant="secondary">{entityType}</Badge>;
    }
  };

  const filteredLogs = auditLogs?.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.fiscalSealCode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const stats = {
    total: auditLogs?.length || 0,
    creates: auditLogs?.filter(l => l.action === "create").length || 0,
    updates: auditLogs?.filter(l => l.action === "update").length || 0,
    deletes: auditLogs?.filter(l => l.action === "delete").length || 0,
    transmits: auditLogs?.filter(l => l.action === "transmit").length || 0,
  };

  const uniqueActions = Array.from(new Set(auditLogs?.map(l => l.action) || []));
  const uniqueEntities = Array.from(new Set(auditLogs?.map(l => l.entityType) || []));

  const handleViewDetails = (log: SiaeAuditLog) => {
    setSelectedLog(log);
    setIsDetailDialogOpen(true);
  };

  const parseJsonSafely = (jsonString: string | null) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Log Audit SIAE</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3">
          <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 flex-shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Log Audit SIAE</h1>
            <p className="text-xs sm:text-sm text-gray-400">Registro delle operazioni fiscali</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
        <Card className="bg-[#151922] border-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-gray-400">Totale Log</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151922] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <PlusCircle className="h-8 w-8 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.creates}</p>
                <p className="text-xs text-gray-400">Creazioni</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151922] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Pencil className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.updates}</p>
                <p className="text-xs text-gray-400">Modifiche</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151922] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trash2 className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.deletes}</p>
                <p className="text-xs text-gray-400">Eliminazioni</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151922] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Send className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.transmits}</p>
                <p className="text-xs text-gray-400">Trasmissioni</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#151922] border-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca per descrizione, ID entità, sigillo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0a0e17] border-gray-700"
                data-testid="input-search-logs"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[160px] bg-[#0a0e17] border-gray-700" data-testid="select-action-filter">
                  <SelectValue placeholder="Azione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le azioni</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action === "create" ? "Creazione" :
                       action === "update" ? "Modifica" :
                       action === "delete" ? "Eliminazione" :
                       action === "cancel" ? "Annullamento" :
                       action === "emit" ? "Emissione" :
                       action === "validate" ? "Validazione" :
                       action === "transmit" ? "Trasmissione" : action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[160px] bg-[#0a0e17] border-gray-700" data-testid="select-entity-filter">
                  <SelectValue placeholder="Entità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le entità</SelectItem>
                  {uniqueEntities.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity === "ticket" ? "Biglietto" :
                       entity === "transaction" ? "Transazione" :
                       entity === "customer" ? "Cliente" :
                       entity === "event" ? "Evento" :
                       entity === "sector" ? "Settore" :
                       entity === "subscription" ? "Abbonamento" :
                       entity === "name_change" ? "Cambio Nome" :
                       entity === "resale" ? "Rivendita" : entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#151922] border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="text-gray-400">Data/Ora</TableHead>
                <TableHead className="text-gray-400">Azione</TableHead>
                <TableHead className="text-gray-400">Entità</TableHead>
                <TableHead className="text-gray-400">Descrizione</TableHead>
                <TableHead className="text-gray-400">Sigillo Fiscale</TableHead>
                <TableHead className="text-gray-400">IP</TableHead>
                <TableHead className="text-gray-400 text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow 
                    key={log.id} 
                    className="border-gray-800 hover:bg-gray-800/50"
                    data-testid={`row-audit-log-${log.id}`}
                  >
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {log.createdAt ? format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: it }) : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getEntityBadge(log.entityType)}
                        {log.entityId && (
                          <span className="text-xs text-gray-500 font-mono">
                            {log.entityId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300 max-w-xs truncate">
                      {log.description || "-"}
                    </TableCell>
                    <TableCell>
                      {log.fiscalSealCode ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {log.fiscalSealCode}
                        </Badge>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.ipAddress ? (
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Globe className="h-3 w-3" />
                          {log.ipAddress}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(log)}
                        data-testid={`button-view-log-${log.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-12 w-12 text-gray-600" />
                      <p className="text-gray-400">Nessun log trovato</p>
                      <p className="text-sm text-gray-500">
                        I log delle operazioni appariranno qui
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#151922] border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ClipboardList className="h-5 w-5 text-amber-400" />
              Dettaglio Log Audit
            </DialogTitle>
            <DialogDescription>
              Informazioni complete dell'operazione registrata
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Data/Ora</label>
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="h-4 w-4 text-amber-400" />
                    {selectedLog.createdAt ? format(new Date(selectedLog.createdAt), "dd MMMM yyyy, HH:mm:ss", { locale: it }) : "-"}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Azione</label>
                  <div className="flex items-center gap-2">
                    {getActionIcon(selectedLog.action)}
                    {getActionBadge(selectedLog.action)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Tipo Entità</label>
                  {getEntityBadge(selectedLog.entityType)}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">ID Entità</label>
                  <code className="text-sm text-amber-400 bg-gray-900 px-2 py-1 rounded">
                    {selectedLog.entityId || "-"}
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Descrizione</label>
                <p className="text-white bg-gray-900 p-3 rounded">
                  {selectedLog.description || "Nessuna descrizione"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Sigillo Fiscale</label>
                  {selectedLog.fiscalSealCode ? (
                    <Badge variant="outline" className="font-mono">
                      <Shield className="h-3 w-3 mr-1" />
                      {selectedLog.fiscalSealCode}
                    </Badge>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Codice Carta</label>
                  {selectedLog.cardCode ? (
                    <code className="text-sm text-blue-400 bg-gray-900 px-2 py-1 rounded">
                      {selectedLog.cardCode}
                    </code>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Indirizzo IP</label>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Globe className="h-4 w-4" />
                    {selectedLog.ipAddress || "-"}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">User Agent</label>
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">
                    {selectedLog.userAgent || "-"}
                  </p>
                </div>
              </div>

              {(selectedLog.oldData || selectedLog.newData) && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Modifiche Dati</label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.oldData && (
                      <div className="space-y-1">
                        <p className="text-xs text-red-400">Dati Precedenti</p>
                        <ScrollArea className="h-32 bg-gray-900 rounded p-2">
                          <pre className="text-xs text-gray-300">
                            {JSON.stringify(parseJsonSafely(selectedLog.oldData), null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                    {selectedLog.newData && (
                      <div className="space-y-1">
                        <p className="text-xs text-green-400">Dati Nuovi</p>
                        <ScrollArea className="h-32 bg-gray-900 rounded p-2">
                          <pre className="text-xs text-gray-300">
                            {JSON.stringify(parseJsonSafely(selectedLog.newData), null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
