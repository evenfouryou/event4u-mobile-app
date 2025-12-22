import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic, BottomSheet } from "@/components/mobile-primitives";
import { 
  Receipt, 
  Wrench, 
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar,
  Euro,
  MapPin,
  Search,
  ArrowLeft,
  Calculator,
  TrendingUp,
  Clock,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { FixedCost, ExtraCost, Maintenance, AccountingDocument, Location, Event } from "@shared/schema";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

type TabType = "fixed-costs" | "extra-costs" | "maintenances" | "documents";

const tabs: { id: TabType; label: string; icon: React.ElementType; gradient: string }[] = [
  { id: "fixed-costs", label: "Costi Fissi", icon: Receipt, gradient: "from-blue-500 to-indigo-600" },
  { id: "extra-costs", label: "Extra", icon: Euro, gradient: "from-amber-500 to-orange-600" },
  { id: "maintenances", label: "Manutenzioni", icon: Wrench, gradient: "from-violet-500 to-purple-600" },
  { id: "documents", label: "Documenti", icon: FileText, gradient: "from-rose-500 to-pink-600" },
];

function MobileStatsCard({
  title,
  value,
  icon: Icon,
  trend,
  gradient,
  testId,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  gradient: string;
  testId: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springConfig, delay }}
      className="glass-card p-4 flex-1 min-w-0"
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold truncate" data-testid={testId}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground truncate">{title}</p>
        </div>
        {trend && (
          <span className="text-xs text-teal flex items-center gap-0.5 shrink-0">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function MobileTabPill({
  tab,
  isActive,
  onSelect,
}: {
  tab: typeof tabs[0];
  isActive: boolean;
  onSelect: () => void;
}) {
  const Icon = tab.icon;
  
  return (
    <motion.button
      onClick={() => {
        triggerHaptic('light');
        onSelect();
      }}
      className={`flex items-center gap-2 px-4 py-3 rounded-2xl whitespace-nowrap min-h-[48px] transition-colors ${
        isActive 
          ? "bg-primary text-black font-semibold" 
          : "bg-white/5 text-muted-foreground"
      }`}
      whileTap={{ scale: 0.97 }}
      transition={springConfig}
      data-testid={`tab-${tab.id}`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm">{tab.label}</span>
    </motion.button>
  );
}

export default function Accounting() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("fixed-costs");
  const isAdmin = user?.role === "super_admin" || user?.role === "gestore";

  const { data: fixedCosts = [] } = useQuery<FixedCost[]>({
    queryKey: ["/api/fixed-costs"],
  });

  const { data: extraCosts = [] } = useQuery<ExtraCost[]>({
    queryKey: ["/api/extra-costs"],
  });

  const { data: maintenances = [] } = useQuery<Maintenance[]>({
    queryKey: ["/api/maintenances"],
  });

  const { data: documents = [] } = useQuery<AccountingDocument[]>({
    queryKey: ["/api/accounting-documents"],
  });

  const totalFixedCosts = fixedCosts.reduce((sum, cost) => {
    const amount = parseFloat(cost.amount);
    if (cost.frequency === "monthly") return sum + amount;
    if (cost.frequency === "quarterly") return sum + (amount / 3);
    if (cost.frequency === "yearly") return sum + (amount / 12);
    return sum;
  }, 0);

  const totalExtraCosts = extraCosts.reduce((sum, cost) => sum + parseFloat(cost.amount || "0"), 0);
  const pendingMaintenances = maintenances.filter(m => m.status === "pending" || m.status === "scheduled").length;
  const pendingDocuments = documents.filter(d => d.status === "pending").length;

  const header = (
    <MobileHeader
      title="Contabilità"
      subtitle="Gestione costi e documenti"
      showBackButton showMenuButton
      rightAction={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-white" />
        </div>
      }
    />
  );

  return (
    <MobileAppLayout header={header} noPadding>
      <div className="px-4 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="grid grid-cols-2 gap-3 py-4"
        >
          <MobileStatsCard
            title="Costi Fissi/Mese"
            value={`€${totalFixedCosts.toFixed(0)}`}
            icon={Receipt}
            gradient="from-blue-500 to-indigo-600"
            testId="stat-fixed-costs"
            delay={0.05}
          />
          <MobileStatsCard
            title="Costi Extra"
            value={`€${totalExtraCosts.toFixed(0)}`}
            icon={Euro}
            gradient="from-amber-500 to-orange-600"
            testId="stat-extra-costs"
            delay={0.1}
          />
          <MobileStatsCard
            title="Manutenzioni"
            value={pendingMaintenances}
            icon={Wrench}
            gradient="from-violet-500 to-purple-600"
            testId="stat-maintenances"
            delay={0.15}
          />
          <MobileStatsCard
            title="Doc. in Attesa"
            value={pendingDocuments}
            icon={FileText}
            gradient="from-rose-500 to-pink-600"
            testId="stat-documents"
            delay={0.2}
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.15 }}
          className="overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4"
        >
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <MobileTabPill
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onSelect={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={springConfig}
          >
            {activeTab === "fixed-costs" && <FixedCostsSection isAdmin={isAdmin} />}
            {activeTab === "extra-costs" && <ExtraCostsSection isAdmin={isAdmin} />}
            {activeTab === "maintenances" && <MaintenancesSection isAdmin={isAdmin} />}
            {activeTab === "documents" && <DocumentsSection isAdmin={isAdmin} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </MobileAppLayout>
  );
}

function MobileTransactionCard({
  title,
  subtitle,
  amount,
  icon: Icon,
  iconGradient,
  badges,
  metadata,
  onEdit,
  onDelete,
  isAdmin,
  testId,
}: {
  title: string;
  subtitle?: string | null;
  amount?: string;
  icon: React.ElementType;
  iconGradient: string;
  badges?: { label: string; variant?: "default" | "secondary" | "destructive" | "outline" }[];
  metadata?: { icon: React.ElementType; label: string }[];
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin: boolean;
  testId: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
      className="glass-card p-4"
      data-testid={testId}
    >
      <div className="flex gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{title}</h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{subtitle}</p>
              )}
            </div>
            {amount && (
              <span className="text-lg font-bold text-primary shrink-0">{amount}</span>
            )}
          </div>
          
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {badges.map((badge, idx) => (
                <Badge key={idx} variant={badge.variant || "outline"} className="text-xs">
                  {badge.label}
                </Badge>
              ))}
            </div>
          )}
          
          {metadata && metadata.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {metadata.map((item, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  <item.icon className="h-3 w-3" />
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {isAdmin && (onEdit || onDelete) && (
        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">
          {onEdit && (
            <HapticButton
              size="icon"
              variant="ghost"
              className="h-11 w-11 rounded-xl"
              onClick={onEdit}
              data-testid={`${testId}-edit`}
            >
              <Pencil className="h-5 w-5" />
            </HapticButton>
          )}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <HapticButton 
                  size="icon" 
                  variant="ghost" 
                  className="h-11 w-11 rounded-xl"
                  hapticType="medium"
                  data-testid={`${testId}-delete`}
                >
                  <Trash2 className="h-5 w-5 text-destructive" />
                </HapticButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[90vw] rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2">
                  <AlertDialogCancel className="flex-1 min-h-[48px] rounded-xl">Annulla</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={onDelete}
                    className="flex-1 min-h-[48px] rounded-xl bg-destructive"
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </motion.div>
  );
}

function MobileSectionHeader({
  icon: Icon,
  iconGradient,
  title,
  subtitle,
  onAdd,
  addLabel,
  isAdmin,
  testId,
}: {
  icon: React.ElementType;
  iconGradient: string;
  title: string;
  subtitle: string;
  onAdd?: () => void;
  addLabel?: string;
  isAdmin: boolean;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {isAdmin && onAdd && (
        <HapticButton
          className="gradient-golden text-black font-semibold min-h-[44px] rounded-xl"
          onClick={onAdd}
          hapticType="medium"
          data-testid={testId}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {addLabel || "Nuovo"}
        </HapticButton>
      )}
    </div>
  );
}

function MobileSearchBar({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
}) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl"
        data-testid={testId}
      />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  iconBg,
  message,
}: {
  icon: React.ElementType;
  iconBg: string;
  message: string;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springConfig}
      className="text-center py-12"
    >
      <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-4`}>
        <Icon className="h-8 w-8" />
      </div>
      <p className="text-muted-foreground">{message}</p>
    </motion.div>
  );
}

function FixedCostsSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: fixedCosts = [], isLoading } = useQuery<FixedCost[]>({
    queryKey: ["/api/fixed-costs"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/fixed-costs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-costs"] });
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Costo fisso creato con successo" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/fixed-costs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-costs"] });
      setEditingCost(null);
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Costo fisso aggiornato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/fixed-costs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-costs"] });
      triggerHaptic('success');
      toast({ title: "Costo fisso eliminato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const locationValue = formData.get("locationId") as string;
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      amount: formData.get("amount") as string,
      frequency: formData.get("frequency") as string,
      locationId: locationValue && locationValue !== "_none" ? locationValue : null,
      validFrom: formData.get("validFrom") as string || null,
      validTo: formData.get("validTo") as string || null,
      notes: formData.get("notes") as string || null,
    };

    if (editingCost) {
      updateMutation.mutate({ id: editingCost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCosts = fixedCosts.filter(cost =>
    cost.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cost.notes?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return "Generale";
    const location = locations.find(l => l.id === locationId);
    return location?.name || "N/D";
  };

  const frequencyLabels: Record<string, string> = {
    monthly: "Mensile",
    quarterly: "Trimestrale",
    yearly: "Annuale",
    per_event: "Per evento",
  };

  const categoryLabels: Record<string, string> = {
    affitto: "Affitto",
    service: "Servizi",
    permessi: "Permessi",
    sicurezza: "Sicurezza",
    amministrativi: "Amministrativi",
    utenze: "Utenze",
    altro: "Altro",
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <MobileSectionHeader
        icon={Receipt}
        iconGradient="from-blue-500 to-indigo-600"
        title="Costi Fissi"
        subtitle="Costi ricorrenti"
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Nuovo"
        isAdmin={isAdmin}
        testId="button-add-fixed-cost"
      />

      <MobileSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Cerca costi fissi..."
        testId="input-search-fixed-costs"
      />

      {filteredCosts.length === 0 ? (
        <EmptyState
          icon={Receipt}
          iconBg="bg-blue-500/20 text-blue-400"
          message={searchTerm ? "Nessun risultato trovato" : "Nessun costo fisso registrato"}
        />
      ) : (
        <div className="space-y-3">
          {filteredCosts.map((cost, index) => (
            <motion.div
              key={cost.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: index * 0.05 }}
            >
              <MobileTransactionCard
                title={cost.name}
                subtitle={cost.notes}
                amount={`€${parseFloat(cost.amount).toFixed(2)}`}
                icon={Receipt}
                iconGradient="from-blue-500 to-indigo-600"
                badges={[
                  { label: categoryLabels[cost.category] || cost.category },
                  { label: frequencyLabels[cost.frequency] || cost.frequency, variant: "secondary" },
                ]}
                metadata={[
                  { icon: MapPin, label: getLocationName(cost.locationId) },
                ]}
                onEdit={() => {
                  setEditingCost(cost);
                  setIsDialogOpen(true);
                }}
                onDelete={() => deleteMutation.mutate(cost.id)}
                isAdmin={isAdmin}
                testId={`card-fixed-cost-${cost.id}`}
              />
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingCost(null);
      }}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingCost ? "Modifica Costo Fisso" : "Nuovo Costo Fisso"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingCost?.name || ""}
                placeholder="es. Affitto locale"
                required
                className="h-12 rounded-xl"
                data-testid="input-fixed-cost-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select name="category" defaultValue={editingCost?.category || "altro"}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="select-fixed-cost-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="affitto">Affitto</SelectItem>
                    <SelectItem value="service">Servizi</SelectItem>
                    <SelectItem value="permessi">Permessi</SelectItem>
                    <SelectItem value="sicurezza">Sicurezza</SelectItem>
                    <SelectItem value="amministrativi">Amministrativi</SelectItem>
                    <SelectItem value="utenze">Utenze</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Importo (€) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingCost?.amount || ""}
                  placeholder="0.00"
                  required
                  className="h-12 rounded-xl"
                  data-testid="input-fixed-cost-amount"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequenza *</Label>
                <Select name="frequency" defaultValue={editingCost?.frequency || "monthly"}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="select-fixed-cost-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensile</SelectItem>
                    <SelectItem value="quarterly">Trimestrale</SelectItem>
                    <SelectItem value="yearly">Annuale</SelectItem>
                    <SelectItem value="per_event">Per evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationId">Location</Label>
                <Select name="locationId" defaultValue={editingCost?.locationId || "_none"}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="select-fixed-cost-location">
                    <SelectValue placeholder="Generale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Generale</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valido Da</Label>
                <Input
                  id="validFrom"
                  name="validFrom"
                  type="date"
                  defaultValue={editingCost?.validFrom ? format(new Date(editingCost.validFrom), "yyyy-MM-dd") : ""}
                  className="h-12 rounded-xl"
                  data-testid="input-fixed-cost-valid-from"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validTo">Valido Fino</Label>
                <Input
                  id="validTo"
                  name="validTo"
                  type="date"
                  defaultValue={editingCost?.validTo ? format(new Date(editingCost.validTo), "yyyy-MM-dd") : ""}
                  className="h-12 rounded-xl"
                  data-testid="input-fixed-cost-valid-to"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingCost?.notes || ""}
                placeholder="Note aggiuntive"
                className="rounded-xl"
                data-testid="input-fixed-cost-notes"
              />
            </div>
            <DialogFooter>
              <HapticButton 
                type="submit" 
                className="w-full gradient-golden text-black min-h-[48px] rounded-xl" 
                disabled={createMutation.isPending || updateMutation.isPending} 
                hapticType="success"
                data-testid="button-save-fixed-cost"
              >
                {editingCost ? "Aggiorna" : "Crea"}
              </HapticButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExtraCostsSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<ExtraCost | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: extraCosts = [], isLoading } = useQuery<ExtraCost[]>({
    queryKey: ["/api/extra-costs"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/extra-costs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-costs"] });
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Costo extra creato con successo" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/extra-costs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-costs"] });
      setEditingCost(null);
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Costo extra aggiornato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/extra-costs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-costs"] });
      triggerHaptic('success');
      toast({ title: "Costo extra eliminato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const eventValue = formData.get("eventId") as string;
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      amount: formData.get("amount") as string,
      eventId: eventValue && eventValue !== "_none" ? eventValue : null,
      invoiceNumber: formData.get("invoiceNumber") as string || null,
      notes: formData.get("notes") as string || null,
    };

    if (editingCost) {
      updateMutation.mutate({ id: editingCost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCosts = extraCosts.filter(cost =>
    cost.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cost.notes?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getEventName = (eventId: string | null) => {
    if (!eventId) return "Nessun evento";
    const event = events.find(e => e.id === eventId);
    return event?.name || "N/D";
  };

  const categoryLabels: Record<string, string> = {
    artisti: "Artisti",
    promozione: "Promozione",
    materiali: "Materiali",
    personale: "Personale",
    affitto: "Affitto",
    catering: "Catering",
    altro: "Altro",
  };

  const totalExtra = filteredCosts.reduce((sum, cost) => sum + parseFloat(cost.amount || "0"), 0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <MobileSectionHeader
        icon={Euro}
        iconGradient="from-amber-500 to-orange-600"
        title="Costi Extra"
        subtitle="Spese per evento"
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Nuovo"
        isAdmin={isAdmin}
        testId="button-add-extra-cost"
      />

      <MobileSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Cerca costi extra..."
        testId="input-search-extra-costs"
      />

      {filteredCosts.length === 0 ? (
        <EmptyState
          icon={Euro}
          iconBg="bg-amber-500/20 text-amber-400"
          message={searchTerm ? "Nessun risultato trovato" : "Nessun costo extra registrato"}
        />
      ) : (
        <>
          <div className="space-y-3">
            {filteredCosts.map((cost, index) => (
              <motion.div
                key={cost.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig, delay: index * 0.05 }}
              >
                <MobileTransactionCard
                  title={cost.name}
                  subtitle={cost.notes}
                  amount={`€${parseFloat(cost.amount || "0").toFixed(2)}`}
                  icon={Euro}
                  iconGradient="from-amber-500 to-orange-600"
                  badges={[
                    { label: categoryLabels[cost.category] || cost.category },
                  ]}
                  metadata={[
                    { icon: Calendar, label: getEventName(cost.eventId) },
                    ...(cost.invoiceNumber ? [{ icon: FileText, label: `Fatt. ${cost.invoiceNumber}` }] : []),
                  ]}
                  onEdit={() => {
                    setEditingCost(cost);
                    setIsDialogOpen(true);
                  }}
                  onDelete={() => deleteMutation.mutate(cost.id)}
                  isAdmin={isAdmin}
                  testId={`card-extra-cost-${cost.id}`}
                />
              </motion.div>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfig, delay: 0.2 }}
            className="mt-4 p-4 rounded-2xl bg-amber-500/10 flex items-center justify-between"
          >
            <span className="text-muted-foreground font-medium">Totale:</span>
            <span className="text-2xl font-bold text-amber-400">€{totalExtra.toFixed(2)}</span>
          </motion.div>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingCost(null);
      }}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingCost ? "Modifica Costo Extra" : "Nuovo Costo Extra"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingCost?.name || ""}
                placeholder="es. DJ Fee"
                required
                className="h-12 rounded-xl"
                data-testid="input-extra-cost-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select name="category" defaultValue={editingCost?.category || "altro"}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="select-extra-cost-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="artisti">Artisti</SelectItem>
                    <SelectItem value="promozione">Promozione</SelectItem>
                    <SelectItem value="materiali">Materiali</SelectItem>
                    <SelectItem value="personale">Personale</SelectItem>
                    <SelectItem value="affitto">Affitto</SelectItem>
                    <SelectItem value="catering">Catering</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Importo (€) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingCost?.amount || ""}
                  placeholder="0.00"
                  required
                  className="h-12 rounded-xl"
                  data-testid="input-extra-cost-amount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventId">Evento</Label>
              <Select name="eventId" defaultValue={editingCost?.eventId || "_none"}>
                <SelectTrigger className="h-12 rounded-xl" data-testid="select-extra-cost-event">
                  <SelectValue placeholder="Seleziona evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nessun evento</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">N. Fattura</Label>
              <Input
                id="invoiceNumber"
                name="invoiceNumber"
                defaultValue={editingCost?.invoiceNumber || ""}
                placeholder="es. FT-2024-001"
                className="h-12 rounded-xl"
                data-testid="input-extra-cost-invoice"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingCost?.notes || ""}
                placeholder="Note aggiuntive"
                className="rounded-xl"
                data-testid="input-extra-cost-notes"
              />
            </div>
            <DialogFooter>
              <HapticButton 
                type="submit" 
                className="w-full gradient-golden text-black min-h-[48px] rounded-xl" 
                disabled={createMutation.isPending || updateMutation.isPending} 
                hapticType="success"
                data-testid="button-save-extra-cost"
              >
                {editingCost ? "Aggiorna" : "Crea"}
              </HapticButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaintenancesSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: maintenances = [], isLoading } = useQuery<Maintenance[]>({
    queryKey: ["/api/maintenances"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/maintenances", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Manutenzione creata con successo" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/maintenances/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      setEditingMaintenance(null);
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Manutenzione aggiornata" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/maintenances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      triggerHaptic('success');
      toast({ title: "Manutenzione eliminata" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const locationValue = formData.get("locationId") as string;
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
      type: formData.get("type") as string,
      status: formData.get("status") as string,
      locationId: locationValue && locationValue !== "_none" ? locationValue : null,
      amount: formData.get("amount") as string || null,
      scheduledDate: formData.get("scheduledDate") as string || null,
      completedDate: formData.get("completedDate") as string || null,
      notes: formData.get("notes") as string || null,
    };

    if (editingMaintenance) {
      updateMutation.mutate({ id: editingMaintenance.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredMaintenances = maintenances.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return "Generale";
    const location = locations.find(l => l.id === locationId);
    return location?.name || "N/D";
  };

  const typeLabels: Record<string, string> = {
    ordinaria: "Ordinaria",
    straordinaria: "Straordinaria",
    urgente: "Urgente",
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    pending: { label: "In attesa", variant: "secondary" },
    scheduled: { label: "Programmata", variant: "outline" },
    completed: { label: "Completata", variant: "default", className: "bg-teal-500/20 text-teal border-teal-500/30" },
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <MobileSectionHeader
        icon={Wrench}
        iconGradient="from-violet-500 to-purple-600"
        title="Manutenzioni"
        subtitle="Interventi programmati"
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Nuova"
        isAdmin={isAdmin}
        testId="button-add-maintenance"
      />

      <MobileSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Cerca manutenzioni..."
        testId="input-search-maintenances"
      />

      {filteredMaintenances.length === 0 ? (
        <EmptyState
          icon={Wrench}
          iconBg="bg-violet-500/20 text-violet-400"
          message={searchTerm ? "Nessun risultato trovato" : "Nessuna manutenzione registrata"}
        />
      ) : (
        <div className="space-y-3">
          {filteredMaintenances.map((maintenance, index) => {
            const statusInfo = statusConfig[maintenance.status] || statusConfig.pending;
            return (
              <motion.div
                key={maintenance.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig, delay: index * 0.05 }}
              >
                <MobileTransactionCard
                  title={maintenance.name}
                  subtitle={maintenance.description}
                  amount={maintenance.amount ? `€${parseFloat(maintenance.amount).toFixed(2)}` : undefined}
                  icon={Wrench}
                  iconGradient="from-violet-500 to-purple-600"
                  badges={[
                    { label: typeLabels[maintenance.type] || maintenance.type },
                    { label: statusInfo.label, variant: statusInfo.variant },
                  ]}
                  metadata={[
                    { icon: MapPin, label: getLocationName(maintenance.locationId) },
                    ...(maintenance.scheduledDate ? [{ icon: Clock, label: format(new Date(maintenance.scheduledDate), "dd/MM/yy", { locale: it }) }] : []),
                  ]}
                  onEdit={() => {
                    setEditingMaintenance(maintenance);
                    setIsDialogOpen(true);
                  }}
                  onDelete={() => deleteMutation.mutate(maintenance.id)}
                  isAdmin={isAdmin}
                  testId={`card-maintenance-${maintenance.id}`}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingMaintenance(null);
      }}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingMaintenance ? "Modifica Manutenzione" : "Nuova Manutenzione"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingMaintenance?.name || ""}
                placeholder="es. Revisione impianto"
                required
                className="h-12 rounded-xl"
                data-testid="input-maintenance-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingMaintenance?.description || ""}
                placeholder="Descrizione intervento"
                className="rounded-xl"
                data-testid="input-maintenance-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select name="type" defaultValue={editingMaintenance?.type || "ordinaria"}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="select-maintenance-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinaria">Ordinaria</SelectItem>
                    <SelectItem value="straordinaria">Straordinaria</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Stato *</Label>
                <Select name="status" defaultValue={editingMaintenance?.status || "pending"}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="select-maintenance-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">In attesa</SelectItem>
                    <SelectItem value="scheduled">Programmata</SelectItem>
                    <SelectItem value="completed">Completata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="locationId">Location</Label>
                <Select name="locationId" defaultValue={editingMaintenance?.locationId || "_none"}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="select-maintenance-location">
                    <SelectValue placeholder="Generale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Generale</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Costo (€)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingMaintenance?.amount || ""}
                  placeholder="0.00"
                  className="h-12 rounded-xl"
                  data-testid="input-maintenance-amount"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Data Prevista</Label>
                <Input
                  id="scheduledDate"
                  name="scheduledDate"
                  type="date"
                  defaultValue={editingMaintenance?.scheduledDate ? format(new Date(editingMaintenance.scheduledDate), "yyyy-MM-dd") : ""}
                  className="h-12 rounded-xl"
                  data-testid="input-maintenance-scheduled-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completedDate">Completata il</Label>
                <Input
                  id="completedDate"
                  name="completedDate"
                  type="date"
                  defaultValue={editingMaintenance?.completedDate ? format(new Date(editingMaintenance.completedDate), "yyyy-MM-dd") : ""}
                  className="h-12 rounded-xl"
                  data-testid="input-maintenance-completed-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingMaintenance?.notes || ""}
                placeholder="Note aggiuntive"
                className="rounded-xl"
                data-testid="input-maintenance-notes"
              />
            </div>
            <DialogFooter>
              <HapticButton 
                type="submit" 
                className="w-full gradient-golden text-black min-h-[48px] rounded-xl" 
                disabled={createMutation.isPending || updateMutation.isPending} 
                hapticType="success"
                data-testid="button-save-maintenance"
              >
                {editingMaintenance ? "Aggiorna" : "Crea"}
              </HapticButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentsSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<AccountingDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: documents = [], isLoading } = useQuery<AccountingDocument[]>({
    queryKey: ["/api/accounting-documents"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/accounting-documents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting-documents"] });
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Documento creato con successo" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/accounting-documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting-documents"] });
      setEditingDocument(null);
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Documento aggiornato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/accounting-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting-documents"] });
      triggerHaptic('success');
      toast({ title: "Documento eliminato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get("type") as string,
      status: formData.get("status") as string,
      documentNumber: formData.get("documentNumber") as string || null,
      amount: formData.get("amount") as string || null,
      issueDate: formData.get("issueDate") as string || null,
      dueDate: formData.get("dueDate") as string || null,
      notes: formData.get("notes") as string || null,
    };

    if (editingDocument) {
      updateMutation.mutate({ id: editingDocument.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.notes?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const typeLabels: Record<string, string> = {
    fattura: "Fattura",
    preventivo: "Preventivo",
    contratto: "Contratto",
    ricevuta: "Ricevuta",
    altro: "Altro",
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    pending: { label: "In attesa", variant: "secondary" },
    paid: { label: "Pagato", variant: "default", className: "bg-teal-500/20 text-teal border-teal-500/30" },
    overdue: { label: "Scaduto", variant: "destructive" },
    cancelled: { label: "Annullato", variant: "outline" },
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <MobileSectionHeader
        icon={FileText}
        iconGradient="from-rose-500 to-pink-600"
        title="Documenti"
        subtitle="Fatture e contratti"
        onAdd={() => setIsDialogOpen(true)}
        addLabel="Nuovo"
        isAdmin={isAdmin}
        testId="button-add-document"
      />

      <MobileSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Cerca documenti..."
        testId="input-search-documents"
      />

      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          iconBg="bg-rose-500/20 text-rose-400"
          message={searchTerm ? "Nessun risultato trovato" : "Nessun documento registrato"}
        />
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc, index) => {
            const statusInfo = statusConfig[doc.status] || statusConfig.pending;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig, delay: index * 0.05 }}
              >
                <MobileTransactionCard
                  title={typeLabels[doc.type] || doc.type}
                  subtitle={doc.documentNumber ? `N. ${doc.documentNumber}` : undefined}
                  amount={doc.amount ? `€${parseFloat(doc.amount).toFixed(2)}` : undefined}
                  icon={FileText}
                  iconGradient="from-rose-500 to-pink-600"
                  badges={[
                    { label: typeLabels[doc.type] || doc.type },
                    { label: statusInfo.label, variant: statusInfo.variant },
                  ]}
                  metadata={[
                    ...(doc.issueDate ? [{ icon: Calendar, label: format(new Date(doc.issueDate), "dd/MM/yy", { locale: it }) }] : []),
                    ...(doc.dueDate ? [{ icon: Clock, label: `Scade: ${format(new Date(doc.dueDate), "dd/MM/yy", { locale: it })}` }] : []),
                  ]}
                  onEdit={() => {
                    setEditingDocument(doc);
                    setIsDialogOpen(true);
                  }}
                  onDelete={() => deleteMutation.mutate(doc.id)}
                  isAdmin={isAdmin}
                  testId={`card-document-${doc.id}`}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingDocument(null);
      }}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingDocument ? "Modifica Documento" : "Nuovo Documento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select name="type" defaultValue={editingDocument?.type || "fattura"}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="select-document-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fattura">Fattura</SelectItem>
                    <SelectItem value="preventivo">Preventivo</SelectItem>
                    <SelectItem value="contratto">Contratto</SelectItem>
                    <SelectItem value="ricevuta">Ricevuta</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Stato *</Label>
                <Select name="status" defaultValue={editingDocument?.status || "pending"}>
                  <SelectTrigger className="h-12 rounded-xl" data-testid="select-document-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">In attesa</SelectItem>
                    <SelectItem value="paid">Pagato</SelectItem>
                    <SelectItem value="overdue">Scaduto</SelectItem>
                    <SelectItem value="cancelled">Annullato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="documentNumber">N. Documento</Label>
                <Input
                  id="documentNumber"
                  name="documentNumber"
                  defaultValue={editingDocument?.documentNumber || ""}
                  placeholder="es. FT-001"
                  className="h-12 rounded-xl"
                  data-testid="input-document-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Importo (€)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingDocument?.amount || ""}
                  placeholder="0.00"
                  className="h-12 rounded-xl"
                  data-testid="input-document-amount"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Data Emissione</Label>
                <Input
                  id="issueDate"
                  name="issueDate"
                  type="date"
                  defaultValue={editingDocument?.issueDate ? format(new Date(editingDocument.issueDate), "yyyy-MM-dd") : ""}
                  className="h-12 rounded-xl"
                  data-testid="input-document-issue-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Data Scadenza</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={editingDocument?.dueDate ? format(new Date(editingDocument.dueDate), "yyyy-MM-dd") : ""}
                  className="h-12 rounded-xl"
                  data-testid="input-document-due-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingDocument?.notes || ""}
                placeholder="Note aggiuntive"
                className="rounded-xl"
                data-testid="input-document-notes"
              />
            </div>
            <DialogFooter>
              <HapticButton 
                type="submit" 
                className="w-full gradient-golden text-black min-h-[48px] rounded-xl" 
                disabled={createMutation.isPending || updateMutation.isPending} 
                hapticType="success"
                data-testid="button-save-document"
              >
                {editingDocument ? "Aggiorna" : "Crea"}
              </HapticButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
