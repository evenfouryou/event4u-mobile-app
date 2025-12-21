import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { type SiaeAuditLog } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export default function SiaeAuditLogsPage() {
  const { user } = useAuth();
  const [selectedLog, setSelectedLog] = useState<SiaeAuditLog | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const companyId = user?.companyId;

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
  const activeFiltersCount = (actionFilter !== "all" ? 1 : 0) + (entityFilter !== "all" ? 1 : 0);

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
  };

  if (isLoading) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Log Audit SIAE"
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={() => window.history.back()}>
                <ArrowLeft className="h-5 w-5" />
              </HapticButton>
            }
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

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title="Log Audit SIAE"
          subtitle="Registro operazioni fiscali"
          leftAction={
            <HapticButton variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </HapticButton>
          }
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo Entità</p>
                {getEntityBadge(selectedLog.entityType)}
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
