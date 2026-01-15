import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { type SiaeAuditLog, type Company } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  MobileAppLayout,
  MobileHeader,
  BottomSheet,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  ClipboardList,
  Search,
  Eye,
  Calendar,
  Activity,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Pencil,
  Trash2,
  Send,
  Ban,
  Globe,
  Filter,
  ChevronRight,
  ArrowLeft,
  Building2,
  User,
  Monitor,
} from "lucide-react";
const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export default function SiaeAuditLogsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedLog, setSelectedLog] = useState<SiaeAuditLog | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const companyId = isSuperAdmin ? selectedCompanyId : user?.companyId;

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: isSuperAdmin,
  });

  const { data: auditLogs, isLoading } = useQuery<SiaeAuditLog[]>({
    queryKey: ['/api/siae/companies', companyId, 'audit-logs'],
    enabled: !!companyId,
  });

  const getActionIcon = (action: string, size: string = "h-5 w-5") => {
    switch (action) {
      case "create":
        return <PlusCircle className={`${size} text-emerald-400`} />;
      case "update":
        return <Pencil className={`${size} text-blue-400`} />;
      case "delete":
        return <Trash2 className={`${size} text-red-400`} />;
      case "cancel":
        return <Ban className={`${size} text-orange-400`} />;
      case "emit":
        return <FileText className={`${size} text-purple-400`} />;
      case "validate":
        return <CheckCircle2 className={`${size} text-green-400`} />;
      case "transmit":
        return <Send className={`${size} text-cyan-400`} />;
      default:
        return <Activity className={`${size} text-gray-400`} />;
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

  const getActionLabel = (action: string): string => {
    switch (action) {
      case "create": return "Creazione";
      case "update": return "Modifica";
      case "delete": return "Eliminazione";
      case "cancel": return "Annullamento";
      case "emit": return "Emissione";
      case "validate": return "Validazione";
      case "transmit": return "Trasmissione";
      default: return action;
    }
  };

  const getEntityLabel = (entity: string): string => {
    switch (entity) {
      case "ticket": return "Biglietto";
      case "transaction": return "Transazione";
      case "customer": return "Cliente";
      case "event": return "Evento";
      case "sector": return "Settore";
      case "subscription": return "Abbonamento";
      case "name_change": return "Cambio Nome";
      case "resale": return "Rivendita";
      default: return entity;
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
    const matchesOrigin = originFilter === "all" || 
      (originFilter === "system" && !log.userId) ||
      (originFilter === "user" && log.userId);

    return matchesSearch && matchesAction && matchesEntity && matchesOrigin;
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
  const activeFiltersCount = (actionFilter !== "all" ? 1 : 0) + (entityFilter !== "all" ? 1 : 0) + (originFilter !== "all" ? 1 : 0);

  const handleViewDetails = (log: SiaeAuditLog) => {
    triggerHaptic('medium');
    setSelectedLog(log);
    setIsDetailSheetOpen(true);
  };

  const parseJsonSafely = (jsonString: string | null) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };

  const handleClearFilters = () => {
    triggerHaptic('light');
    setActionFilter("all");
    setEntityFilter("all");
    setOriginFilter("all");
  };

  if (isLoading) {
    if (!isMobile) {
      return (
        <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-audit-logs-loading">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Log Audit SIAE"
            showBackButton
            showUserMenu
          />
        }
      >
        <div className="space-y-4 py-4 pb-24">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </MobileAppLayout>
    );
  }

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-audit-logs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Log Audit SIAE</h1>
            <p className="text-muted-foreground">Registro operazioni fiscali</p>
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Label htmlFor="company-select" className="text-sm text-muted-foreground whitespace-nowrap">
                <Building2 className="h-4 w-4 inline-block mr-1" />
                Azienda:
              </Label>
              <Select
                value={selectedCompanyId || ""}
                onValueChange={(value) => setSelectedCompanyId(value)}
              >
                <SelectTrigger className="w-[250px]" data-testid="select-company">
                  <SelectValue placeholder="Seleziona azienda" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {!companyId && isSuperAdmin && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Seleziona un'azienda</h3>
              <p className="text-muted-foreground">
                Scegli un'azienda dal menu sopra per visualizzare i log audit SIAE
              </p>
            </CardContent>
          </Card>
        )}

        {companyId && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">Totale Log</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-emerald-500">{stats.creates}</div>
                  <p className="text-sm text-muted-foreground">Creazioni</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-500">{stats.updates}</div>
                  <p className="text-sm text-muted-foreground">Modifiche</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-cyan-500">{stats.transmits}</div>
                  <p className="text-sm text-muted-foreground">Trasmissioni</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca log..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-logs-desktop"
                    />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-action-filter-desktop">
                      <SelectValue placeholder="Azione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le azioni</SelectItem>
                      {uniqueActions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {getActionLabel(action)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-entity-filter-desktop">
                      <SelectValue placeholder="Entità" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le entità</SelectItem>
                      {uniqueEntities.map((entity) => (
                        <SelectItem key={entity} value={entity}>
                          {getEntityLabel(entity)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={originFilter} onValueChange={setOriginFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-origin-filter-desktop">
                      <Globe className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Origine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le origini</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                      <SelectItem value="user">Utente</SelectItem>
                    </SelectContent>
                  </Select>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                      Resetta filtri
                    </Button>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Azione</TableHead>
                      <TableHead>Entità</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Sigillo Fiscale</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-[100px]">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs && filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-audit-log-${log.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionBadge(log.action)}
                              {!log.userId && (
                                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30" data-testid={`badge-system-${log.id}`}>
                                  <Monitor className="h-3 w-3 mr-1" />
                                  Sistema
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getEntityBadge(log.entityType)}</TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {log.description || "Operazione registrata"}
                          </TableCell>
                          <TableCell>
                            {log.fiscalSealCode ? (
                              <code className="text-xs bg-muted px-2 py-1 rounded">{log.fiscalSealCode}</code>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.createdAt ? format(new Date(log.createdAt), "dd/MM/yy HH:mm", { locale: it }) : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLog(log);
                                setIsDetailDialogOpen(true);
                              }}
                              data-testid={`button-view-log-${log.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nessun log trovato
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLog && getActionIcon(selectedLog.action, "h-5 w-5")}
                Dettaglio Log
              </DialogTitle>
              <DialogDescription>
                {selectedLog?.createdAt ? format(new Date(selectedLog.createdAt), "dd MMMM yyyy, HH:mm:ss", { locale: it }) : "-"}
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  {getActionBadge(selectedLog.action)}
                  {getEntityBadge(selectedLog.entityType)}
                  {!selectedLog.userId && (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                      <Monitor className="h-3 w-3 mr-1" />
                      Sistema
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">ID Entità</p>
                    <code className="text-sm bg-muted px-2 py-1 rounded block truncate">
                      {selectedLog.entityId || "-"}
                    </code>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Sigillo Fiscale</p>
                    {selectedLog.fiscalSealCode ? (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-500" />
                        <span className="font-mono text-sm">{selectedLog.fiscalSealCode}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Descrizione</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm">
                      {selectedLog.description || "Nessuna descrizione"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Codice Carta</p>
                    {selectedLog.cardCode ? (
                      <span className="text-blue-500 font-mono text-sm">{selectedLog.cardCode}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Indirizzo IP</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      {selectedLog.ipAddress || "-"}
                    </div>
                  </div>
                </div>

                {selectedLog.userAgent && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">User Agent</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {selectedLog.userAgent}
                    </p>
                  </div>
                )}

                {(selectedLog.oldData || selectedLog.newData) && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Modifiche Dati</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedLog.oldData && (
                        <div className="space-y-2">
                          <p className="text-xs text-red-500 font-medium">Dati Precedenti</p>
                          <ScrollArea className="h-32 rounded border p-2">
                            <pre className="text-xs">
                              {JSON.stringify(parseJsonSafely(selectedLog.oldData), null, 2)}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}
                      {selectedLog.newData && (
                        <div className="space-y-2">
                          <p className="text-xs text-green-500 font-medium">Dati Nuovi</p>
                          <ScrollArea className="h-32 rounded border p-2">
                            <pre className="text-xs">
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

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title="Log Audit SIAE"
          subtitle="Registro operazioni fiscali"
          showBackButton
          showUserMenu
          rightAction={
            <div className="relative">
              <HapticButton 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsFilterSheetOpen(true)}
              >
                <Filter className="h-5 w-5" />
              </HapticButton>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </div>
          }
        />
      }
    >
      <div className="space-y-4 py-4 pb-24">
        {isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springTransition}
          >
            <Card className="bg-[#151922] border-gray-800 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  <Label className="text-sm text-gray-400">Seleziona Azienda</Label>
                </div>
                <Select
                  value={selectedCompanyId || ""}
                  onValueChange={(value) => setSelectedCompanyId(value)}
                >
                  <SelectTrigger className="w-full h-12 bg-[#0c0f16] border-gray-700 rounded-xl" data-testid="select-company-mobile">
                    <SelectValue placeholder="Seleziona un'azienda..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!companyId && isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <Card className="bg-[#151922] border-dashed border-gray-700 rounded-2xl">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">Seleziona un'azienda</h3>
                <p className="text-sm text-gray-500">
                  Scegli un'azienda dal menu sopra per visualizzare i log
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {companyId && (
        <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Cerca log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-[#151922] border-gray-800 rounded-2xl text-base"
            data-testid="input-search-logs"
          />
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springTransition, delay: 0.05 }}
          >
            <Card className="bg-[#151922] border-gray-800 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-gray-400">Totale Log</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springTransition, delay: 0.1 }}
          >
            <Card className="bg-[#151922] border-gray-800 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <PlusCircle className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.creates}</p>
                    <p className="text-xs text-gray-400">Creazioni</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springTransition, delay: 0.15 }}
          >
            <Card className="bg-[#151922] border-gray-800 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Pencil className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.updates}</p>
                    <p className="text-xs text-gray-400">Modifiche</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springTransition, delay: 0.2 }}
          >
            <Card className="bg-[#151922] border-gray-800 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Send className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.transmits}</p>
                    <p className="text-xs text-gray-400">Trasmissioni</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredLogs && filteredLogs.length > 0 ? (
              filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ ...springTransition, delay: index * 0.03 }}
                  layout
                >
                  <Card 
                    className="bg-[#151922] border-gray-800 rounded-2xl active:scale-[0.98] transition-transform"
                    onClick={() => handleViewDetails(log)}
                    data-testid={`card-audit-log-${log.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                          {getActionIcon(log.action, "h-6 w-6")}
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getActionBadge(log.action)}
                            {getEntityBadge(log.entityType)}
                            {!log.userId && (
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                                <Monitor className="h-3 w-3 mr-1" />
                                Sistema
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-white text-sm line-clamp-2">
                            {log.description || "Operazione registrata"}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {log.createdAt ? format(new Date(log.createdAt), "dd/MM/yy HH:mm", { locale: it }) : "-"}
                            </div>
                            {log.fiscalSealCode && (
                              <div className="flex items-center gap-1">
                                <Shield className="h-3.5 w-3.5 text-amber-400" />
                                <span className="font-mono">{log.fiscalSealCode}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0 mt-3" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springTransition}
                className="py-16 flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center">
                  <AlertTriangle className="h-10 w-10 text-gray-600" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-gray-400 font-medium">Nessun log trovato</p>
                  <p className="text-sm text-gray-500">
                    I log delle operazioni appariranno qui
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </>
        )}
      </div>

      <BottomSheet
        open={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filtri"
      >
        <div className="p-4 space-y-6 pb-8">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400">Tipo Azione</label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-12 bg-[#0a0e17] border-gray-700 rounded-xl" data-testid="select-action-filter">
                <SelectValue placeholder="Tutte le azioni" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le azioni</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {getActionLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400">Tipo Entità</label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-12 bg-[#0a0e17] border-gray-700 rounded-xl" data-testid="select-entity-filter">
                <SelectValue placeholder="Tutte le entità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le entità</SelectItem>
                {uniqueEntities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {getEntityLabel(entity)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400">Origine</label>
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="h-12 bg-[#0a0e17] border-gray-700 rounded-xl" data-testid="select-origin-filter">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tutte le origini" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le origini</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
                <SelectItem value="user">Utente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <HapticButton
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={handleClearFilters}
            >
              Resetta
            </HapticButton>
            <HapticButton
              className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                triggerHaptic('light');
                setIsFilterSheetOpen(false);
              }}
            >
              Applica
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isDetailSheetOpen}
        onClose={() => setIsDetailSheetOpen(false)}
        title="Dettaglio Log"
      >
        {selectedLog && (
          <div className="p-4 space-y-6 pb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                {getActionIcon(selectedLog.action, "h-7 w-7")}
              </div>
              <div className="space-y-1">
                {getActionBadge(selectedLog.action)}
                <p className="text-sm text-gray-400">
                  {selectedLog.createdAt ? format(new Date(selectedLog.createdAt), "dd MMMM yyyy, HH:mm:ss", { locale: it }) : "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo Entità</p>
                <div className="flex items-center gap-2">
                  {getEntityBadge(selectedLog.entityType)}
                  {!selectedLog.userId && (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                      <Monitor className="h-3 w-3 mr-1" />
                      Sistema
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">ID Entità</p>
                <code className="text-xs text-amber-400 bg-gray-900 px-2 py-1 rounded block truncate">
                  {selectedLog.entityId || "-"}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Descrizione</p>
              <div className="bg-gray-900 p-4 rounded-xl">
                <p className="text-white text-sm">
                  {selectedLog.description || "Nessuna descrizione"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Sigillo Fiscale</p>
                {selectedLog.fiscalSealCode ? (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-400" />
                    <span className="text-white font-mono text-sm">{selectedLog.fiscalSealCode}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">-</span>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Codice Carta</p>
                {selectedLog.cardCode ? (
                  <span className="text-blue-400 font-mono text-sm">{selectedLog.cardCode}</span>
                ) : (
                  <span className="text-gray-500 text-sm">-</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Indirizzo IP</p>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Globe className="h-4 w-4" />
                  {selectedLog.ipAddress || "-"}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">User Agent</p>
                <p className="text-xs text-gray-400 truncate">
                  {selectedLog.userAgent || "-"}
                </p>
              </div>
            </div>

            {(selectedLog.oldData || selectedLog.newData) && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Modifiche Dati</p>
                <div className="space-y-3">
                  {selectedLog.oldData && (
                    <div className="space-y-2">
                      <p className="text-xs text-red-400 font-medium">Dati Precedenti</p>
                      <ScrollArea className="h-32 bg-gray-900 rounded-xl p-3">
                        <pre className="text-xs text-gray-300">
                          {JSON.stringify(parseJsonSafely(selectedLog.oldData), null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                  {selectedLog.newData && (
                    <div className="space-y-2">
                      <p className="text-xs text-green-400 font-medium">Dati Nuovi</p>
                      <ScrollArea className="h-32 bg-gray-900 rounded-xl p-3">
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
      </BottomSheet>
    </MobileAppLayout>
  );
}
