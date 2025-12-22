import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MobileAppLayout, 
  MobileHeader, 
  HapticButton, 
  FloatingActionButton,
  BottomSheet,
  triggerHaptic
} from "@/components/mobile-primitives";
import { 
  Users, 
  Calendar, 
  Wallet, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Phone,
  Mail,
  Euro,
  User,
  UserCheck,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Staff, StaffAssignment, StaffPayment, Event } from "@shared/schema";

const springConfig = { type: "spring", stiffness: 400, damping: 30 };

function StatsCard({
  title,
  value,
  icon: Icon,
  gradient,
  testId,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  testId: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springConfig, delay }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xl font-bold" data-testid={testId}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StaffCard({
  staff,
  isAdmin,
  onEdit,
  onDelete,
  delay = 0,
}: {
  staff: Staff;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  delay?: number;
}) {
  const roleLabels: Record<string, string> = {
    pr: "PR",
    barista: "Barista",
    sicurezza: "Sicurezza",
    fotografo: "Fotografo",
    dj: "DJ",
    tecnico: "Tecnico",
    altro: "Altro",
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springConfig, delay }}
      className="glass-card p-4"
      data-testid={`card-staff-${staff.id}`}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 border-2 border-primary/20">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-semibold">
            {getInitials(staff.firstName, staff.lastName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-base">
                {staff.firstName} {staff.lastName}
              </h3>
              <Badge variant="outline" className="mt-1 border-primary/30">
                {roleLabels[staff.role] || staff.role}
              </Badge>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              staff.active 
                ? 'bg-teal-500/20 text-teal-400' 
                : 'bg-muted/50 text-muted-foreground'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${staff.active ? 'bg-teal-500' : 'bg-muted-foreground'}`} />
              {staff.active ? 'Attivo' : 'Inattivo'}
            </span>
          </div>
          
          <div className="mt-3 space-y-1.5">
            {staff.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{staff.phone}</span>
              </div>
            )}
            {staff.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{staff.email}</span>
              </div>
            )}
          </div>

          {(staff.hourlyRate || staff.fixedRate) && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              <Euro className="h-4 w-4 text-primary" />
              {staff.hourlyRate && <span>{parseFloat(staff.hourlyRate).toFixed(2)}/h</span>}
              {staff.fixedRate && <span>{parseFloat(staff.fixedRate).toFixed(2)} fisso</span>}
            </div>
          )}
        </div>
      </div>
      
      {isAdmin && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
          <HapticButton
            variant="ghost"
            size="default"
            className="flex-1 min-h-[48px]"
            onClick={onEdit}
            hapticType="light"
            data-testid={`button-edit-staff-${staff.id}`}
          >
            <Pencil className="h-5 w-5 mr-2" />
            Modifica
          </HapticButton>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <HapticButton 
                variant="ghost" 
                size="icon" 
                className="min-h-[48px] min-w-[48px]"
                hapticType="medium"
                data-testid={`button-delete-staff-${staff.id}`}
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </HapticButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare {staff.firstName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Questa azione non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="min-h-[48px]">Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="min-h-[48px]">
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </motion.div>
  );
}

export default function Personnel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("staff");
  const isAdmin = user?.role === "super_admin" || user?.role === "gestore";

  const { data: staffList = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: assignments = [] } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/staff-assignments"],
  });

  const { data: payments = [] } = useQuery<StaffPayment[]>({
    queryKey: ["/api/staff-payments"],
  });

  const activeStaffCount = staffList.filter(s => s.active).length;
  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

  const header = (
    <MobileHeader
      title="Personale"
      subtitle="Gestione staff"
      showBackButton showMenuButton
    />
  );

  return (
    <MobileAppLayout header={header} contentClassName="pb-24">
      <div className="py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {staffLoading ? (
            <>
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </>
          ) : (
            <>
              <StatsCard
                icon={Users}
                title="Totale"
                value={staffList.length}
                gradient="from-blue-500 to-indigo-600"
                testId="stat-total-staff"
                delay={0}
              />
              <StatsCard
                icon={UserCheck}
                title="Attivi"
                value={activeStaffCount}
                gradient="from-teal-500 to-cyan-600"
                testId="stat-active-staff"
                delay={0.05}
              />
              <StatsCard
                icon={Calendar}
                title="Assegnazioni"
                value={assignments.length}
                gradient="from-violet-500 to-purple-600"
                testId="stat-assignments"
                delay={0.1}
              />
              <StatsCard
                icon={Euro}
                title="Pagamenti"
                value={`€${totalPayments.toFixed(0)}`}
                gradient="from-amber-500 to-orange-600"
                testId="stat-total-payments"
                delay={0.15}
              />
            </>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={(val) => {
            triggerHaptic('light');
            setActiveTab(val);
          }}>
            <TabsList className="grid w-full grid-cols-3 h-14 glass-card p-1">
              <TabsTrigger 
                value="staff" 
                className="flex items-center gap-2 h-12 rounded-xl data-[state=active]:bg-primary/20" 
                data-testid="tab-staff"
              >
                <Users className="h-5 w-5" />
                <span>Staff</span>
              </TabsTrigger>
              <TabsTrigger 
                value="assignments" 
                className="flex items-center gap-2 h-12 rounded-xl data-[state=active]:bg-primary/20" 
                data-testid="tab-assignments"
              >
                <Calendar className="h-5 w-5" />
                <span>Presenze</span>
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="flex items-center gap-2 h-12 rounded-xl data-[state=active]:bg-primary/20" 
                data-testid="tab-payments"
              >
                <Wallet className="h-5 w-5" />
                <span>Pagam.</span>
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="staff" className="mt-4">
                <StaffSection isAdmin={isAdmin} />
              </TabsContent>

              <TabsContent value="assignments" className="mt-4">
                <AssignmentsSection isAdmin={isAdmin} />
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                <PaymentsSection isAdmin={isAdmin} />
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>
    </MobileAppLayout>
  );
}

function StaffSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: staffList = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Personale creato con successo" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setEditingStaff(null);
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Personale aggiornato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      triggerHaptic('success');
      toast({ title: "Personale eliminato" });
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
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      fiscalCode: formData.get("fiscalCode") as string || null,
      email: formData.get("email") as string || null,
      phone: formData.get("phone") as string || null,
      role: formData.get("role") as string,
      hourlyRate: formData.get("hourlyRate") as string || null,
      fixedRate: formData.get("fixedRate") as string || null,
      bankIban: formData.get("bankIban") as string || null,
      address: formData.get("address") as string || null,
      notes: formData.get("notes") as string || null,
      active: formData.get("active") === "on",
    };

    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredStaff = staffList.filter(s =>
    s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Cerca personale..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12 rounded-xl text-base"
          data-testid="input-search-staff"
        />
      </div>

      {filteredStaff.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 text-muted-foreground"
        >
          <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">{searchTerm ? "Nessun risultato" : "Nessun personale"}</p>
          <p className="text-sm mt-1">Tocca + per aggiungere</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredStaff.map((s, index) => (
            <StaffCard
              key={s.id}
              staff={s}
              isAdmin={isAdmin}
              onEdit={() => {
                setEditingStaff(s);
                setIsDialogOpen(true);
              }}
              onDelete={() => deleteMutation.mutate(s.id)}
              delay={index * 0.05}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <>
          <FloatingActionButton
            onClick={() => {
              setEditingStaff(null);
              setIsDialogOpen(true);
            }}
            className="gradient-golden"
            data-testid="fab-add-staff"
          >
            <Plus className="h-6 w-6 text-black" />
          </FloatingActionButton>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingStaff(null);
          }}>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {editingStaff ? "Modifica Personale" : "Nuovo Personale"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      defaultValue={editingStaff?.firstName || ""}
                      required
                      className="h-12"
                      data-testid="input-staff-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Cognome *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      defaultValue={editingStaff?.lastName || ""}
                      required
                      className="h-12"
                      data-testid="input-staff-last-name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="role">Ruolo *</Label>
                    <Select name="role" defaultValue={editingStaff?.role || "altro"}>
                      <SelectTrigger className="h-12" data-testid="select-staff-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pr">PR</SelectItem>
                        <SelectItem value="barista">Barista</SelectItem>
                        <SelectItem value="sicurezza">Sicurezza</SelectItem>
                        <SelectItem value="fotografo">Fotografo</SelectItem>
                        <SelectItem value="dj">DJ</SelectItem>
                        <SelectItem value="tecnico">Tecnico</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fiscalCode">Cod. Fiscale</Label>
                    <Input
                      id="fiscalCode"
                      name="fiscalCode"
                      defaultValue={editingStaff?.fiscalCode || ""}
                      maxLength={16}
                      className="h-12"
                      data-testid="input-staff-fiscal-code"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingStaff?.email || ""}
                    className="h-12"
                    data-testid="input-staff-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={editingStaff?.phone || ""}
                    className="h-12"
                    data-testid="input-staff-phone"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Tariffa/h (€)</Label>
                    <Input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      step="0.01"
                      defaultValue={editingStaff?.hourlyRate || ""}
                      placeholder="0.00"
                      className="h-12"
                      data-testid="input-staff-hourly-rate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fixedRate">Fisso (€)</Label>
                    <Input
                      id="fixedRate"
                      name="fixedRate"
                      type="number"
                      step="0.01"
                      defaultValue={editingStaff?.fixedRate || ""}
                      placeholder="0.00"
                      className="h-12"
                      data-testid="input-staff-fixed-rate"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankIban">IBAN</Label>
                  <Input
                    id="bankIban"
                    name="bankIban"
                    defaultValue={editingStaff?.bankIban || ""}
                    maxLength={34}
                    className="h-12"
                    data-testid="input-staff-iban"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Indirizzo</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={editingStaff?.address || ""}
                    className="h-12"
                    data-testid="input-staff-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingStaff?.notes || ""}
                    className="min-h-[80px]"
                    data-testid="input-staff-notes"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <Switch 
                    id="active" 
                    name="active" 
                    defaultChecked={editingStaff?.active !== false}
                    data-testid="switch-staff-active"
                  />
                  <Label htmlFor="active" className="text-base">Personale attivo</Label>
                </div>
                <DialogFooter>
                  <HapticButton 
                    type="submit" 
                    className="w-full gradient-golden text-black font-semibold min-h-[52px]" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    hapticType="medium"
                    data-testid="button-save-staff"
                  >
                    {editingStaff ? "Salva Modifiche" : "Aggiungi Personale"}
                  </HapticButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </motion.div>
  );
}

function AssignmentsSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StaffAssignment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: assignments = [], isLoading } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/staff-assignments"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/staff-assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Assegnazione creata" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/staff-assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      setEditingAssignment(null);
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Assegnazione aggiornata" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/staff-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      triggerHaptic('success');
      toast({ title: "Assegnazione eliminata" });
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
      staffId: formData.get("staffId") as string,
      eventId: formData.get("eventId") as string,
      role: formData.get("role") as string || null,
      status: formData.get("status") as string,
      checkIn: formData.get("checkIn") as string || null,
      checkOut: formData.get("checkOut") as string || null,
      hoursWorked: formData.get("hoursWorked") as string || null,
      compensationAmount: formData.get("compensationAmount") as string || null,
      bonus: formData.get("bonus") as string || null,
      notes: formData.get("notes") as string || null,
    };

    if (editingAssignment) {
      updateMutation.mutate({ id: editingAssignment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStaffName = (staffId: string) => {
    const s = staffList.find(x => x.id === staffId);
    return s ? `${s.firstName} ${s.lastName}` : "N/D";
  };

  const getStaffInitials = (staffId: string) => {
    const s = staffList.find(x => x.id === staffId);
    if (!s) return "??";
    return `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase();
  };

  const getEventName = (eventId: string) => {
    const e = events.find(x => x.id === eventId);
    return e?.name || "N/D";
  };

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    scheduled: { label: "Programmato", color: "text-blue-400", bgColor: "bg-blue-500/20" },
    confirmed: { label: "Confermato", color: "text-teal-400", bgColor: "bg-teal-500/20" },
    checked_in: { label: "Check-in", color: "text-violet-400", bgColor: "bg-violet-500/20" },
    checked_out: { label: "Check-out", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
    cancelled: { label: "Annullato", color: "text-rose-400", bgColor: "bg-rose-500/20" },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Cerca assegnazioni..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12 rounded-xl text-base"
          data-testid="input-search-assignments"
        />
      </div>

      {assignments.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 text-muted-foreground"
        >
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">{searchTerm ? "Nessun risultato" : "Nessuna assegnazione"}</p>
          <p className="text-sm mt-1">Tocca + per aggiungere</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a, index) => {
            const status = statusConfig[a.status] || statusConfig.scheduled;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig, delay: index * 0.05 }}
                className="glass-card p-4"
                data-testid={`card-assignment-${a.id}`}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-violet-500/30">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
                      {getStaffInitials(a.staffId)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{getStaffName(a.staffId)}</h3>
                        {a.role && (
                          <p className="text-sm text-muted-foreground">{a.role}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="truncate">{getEventName(a.eventId)}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <div className="text-sm">
                        {a.compensationAmount && (
                          <span className="text-primary font-medium">€{parseFloat(a.compensationAmount).toFixed(2)}</span>
                        )}
                        {a.bonus && (
                          <span className="text-teal-400 ml-2">+€{parseFloat(a.bonus).toFixed(2)}</span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <HapticButton
                            size="icon"
                            variant="ghost"
                            className="min-h-[44px] min-w-[44px]"
                            onClick={() => {
                              setEditingAssignment(a);
                              setIsDialogOpen(true);
                            }}
                            hapticType="light"
                            data-testid={`button-edit-assignment-${a.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </HapticButton>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <HapticButton 
                                size="icon" 
                                variant="ghost" 
                                className="min-h-[44px] min-w-[44px]"
                                hapticType="medium"
                                data-testid={`button-delete-assignment-${a.id}`}
                              >
                                <Trash2 className="h-5 w-5 text-destructive" />
                              </HapticButton>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminare assegnazione?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="min-h-[48px]">Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(a.id)} className="min-h-[48px]">
                                  Elimina
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <>
          <FloatingActionButton
            onClick={() => {
              setEditingAssignment(null);
              setIsDialogOpen(true);
            }}
            className="gradient-golden"
            data-testid="fab-add-assignment"
          >
            <Plus className="h-6 w-6 text-black" />
          </FloatingActionButton>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingAssignment(null);
          }}>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {editingAssignment ? "Modifica Assegnazione" : "Nuova Assegnazione"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staffId">Personale *</Label>
                  <Select name="staffId" defaultValue={editingAssignment?.staffId || ""}>
                    <SelectTrigger className="h-12" data-testid="select-assignment-staff">
                      <SelectValue placeholder="Seleziona personale" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventId">Evento *</Label>
                  <Select name="eventId" defaultValue={editingAssignment?.eventId || ""}>
                    <SelectTrigger className="h-12" data-testid="select-assignment-event">
                      <SelectValue placeholder="Seleziona evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="role">Ruolo</Label>
                    <Input
                      id="role"
                      name="role"
                      defaultValue={editingAssignment?.role || ""}
                      className="h-12"
                      data-testid="input-assignment-role"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Stato *</Label>
                    <Select name="status" defaultValue={editingAssignment?.status || "scheduled"}>
                      <SelectTrigger className="h-12" data-testid="select-assignment-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Programmato</SelectItem>
                        <SelectItem value="confirmed">Confermato</SelectItem>
                        <SelectItem value="checked_in">Check-in</SelectItem>
                        <SelectItem value="checked_out">Check-out</SelectItem>
                        <SelectItem value="cancelled">Annullato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="compensationAmount">Compenso (€)</Label>
                    <Input
                      id="compensationAmount"
                      name="compensationAmount"
                      type="number"
                      step="0.01"
                      defaultValue={editingAssignment?.compensationAmount || ""}
                      placeholder="0.00"
                      className="h-12"
                      data-testid="input-assignment-compensation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonus">Bonus (€)</Label>
                    <Input
                      id="bonus"
                      name="bonus"
                      type="number"
                      step="0.01"
                      defaultValue={editingAssignment?.bonus || ""}
                      placeholder="0.00"
                      className="h-12"
                      data-testid="input-assignment-bonus"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingAssignment?.notes || ""}
                    className="min-h-[80px]"
                    data-testid="input-assignment-notes"
                  />
                </div>
                <DialogFooter>
                  <HapticButton 
                    type="submit" 
                    className="w-full gradient-golden text-black font-semibold min-h-[52px]" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    hapticType="medium"
                    data-testid="button-save-assignment"
                  >
                    {editingAssignment ? "Salva Modifiche" : "Aggiungi Assegnazione"}
                  </HapticButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </motion.div>
  );
}

function PaymentsSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<StaffPayment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: payments = [], isLoading } = useQuery<StaffPayment[]>({
    queryKey: ["/api/staff-payments"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/staff-payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-payments"] });
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Pagamento creato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/staff-payments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-payments"] });
      setEditingPayment(null);
      setIsDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Pagamento aggiornato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/staff-payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-payments"] });
      triggerHaptic('success');
      toast({ title: "Pagamento eliminato" });
    },
    onError: (err: any) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const eventIdValue = formData.get("eventId") as string;
    const data = {
      staffId: formData.get("staffId") as string,
      eventId: eventIdValue === "_none" ? null : eventIdValue || null,
      amount: formData.get("amount") as string,
      paymentDate: formData.get("paymentDate") as string || null,
      paymentMethod: formData.get("paymentMethod") as string || null,
      status: formData.get("status") as string,
      notes: formData.get("notes") as string || null,
    };

    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStaffName = (staffId: string) => {
    const s = staffList.find(x => x.id === staffId);
    return s ? `${s.firstName} ${s.lastName}` : "N/D";
  };

  const getStaffInitials = (staffId: string) => {
    const s = staffList.find(x => x.id === staffId);
    if (!s) return "??";
    return `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase();
  };

  const getEventName = (eventId: string | null) => {
    if (!eventId) return "Non associato";
    const e = events.find(x => x.id === eventId);
    return e?.name || "N/D";
  };

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: "In attesa", color: "text-amber-400", bgColor: "bg-amber-500/20" },
    paid: { label: "Pagato", color: "text-teal-400", bgColor: "bg-teal-500/20" },
    cancelled: { label: "Annullato", color: "text-rose-400", bgColor: "bg-rose-500/20" },
  };

  const methodLabels: Record<string, string> = {
    cash: "Contanti",
    bank_transfer: "Bonifico",
    other: "Altro",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Cerca pagamenti..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12 rounded-xl text-base"
          data-testid="input-search-payments"
        />
      </div>

      {payments.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 text-muted-foreground"
        >
          <Wallet className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">{searchTerm ? "Nessun risultato" : "Nessun pagamento"}</p>
          <p className="text-sm mt-1">Tocca + per aggiungere</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {payments.map((p, index) => {
            const status = statusConfig[p.status] || statusConfig.pending;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig, delay: index * 0.05 }}
                className="glass-card p-4"
                data-testid={`card-payment-${p.id}`}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-amber-500/30">
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-semibold">
                      {getStaffInitials(p.staffId)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{getStaffName(p.staffId)}</h3>
                        <p className="text-2xl font-bold text-primary mt-1">
                          €{parseFloat(p.amount).toFixed(2)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span className="truncate">{getEventName(p.eventId)}</span>
                      </div>
                      {p.paymentMethod && (
                        <Badge variant="outline" className="border-white/10 text-xs">
                          {methodLabels[p.paymentMethod] || p.paymentMethod}
                        </Badge>
                      )}
                    </div>

                    {p.paymentDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(p.paymentDate), "d MMMM yyyy", { locale: it })}
                      </p>
                    )}

                    {isAdmin && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                        <HapticButton
                          size="icon"
                          variant="ghost"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => {
                            setEditingPayment(p);
                            setIsDialogOpen(true);
                          }}
                          hapticType="light"
                          data-testid={`button-edit-payment-${p.id}`}
                        >
                          <Pencil className="h-5 w-5" />
                        </HapticButton>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <HapticButton 
                              size="icon" 
                              variant="ghost" 
                              className="min-h-[44px] min-w-[44px]"
                              hapticType="medium"
                              data-testid={`button-delete-payment-${p.id}`}
                            >
                              <Trash2 className="h-5 w-5 text-destructive" />
                            </HapticButton>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare pagamento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione non può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="min-h-[48px]">Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)} className="min-h-[48px]">
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <>
          <FloatingActionButton
            onClick={() => {
              setEditingPayment(null);
              setIsDialogOpen(true);
            }}
            className="gradient-golden"
            data-testid="fab-add-payment"
          >
            <Plus className="h-6 w-6 text-black" />
          </FloatingActionButton>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingPayment(null);
          }}>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {editingPayment ? "Modifica Pagamento" : "Nuovo Pagamento"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staffId">Personale *</Label>
                  <Select name="staffId" defaultValue={editingPayment?.staffId || ""}>
                    <SelectTrigger className="h-12" data-testid="select-payment-staff">
                      <SelectValue placeholder="Seleziona personale" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventId">Evento</Label>
                  <Select name="eventId" defaultValue={editingPayment?.eventId || ""}>
                    <SelectTrigger className="h-12" data-testid="select-payment-event">
                      <SelectValue placeholder="Seleziona evento (opzionale)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Non associato</SelectItem>
                      {events.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Importo (€) *</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      defaultValue={editingPayment?.amount || ""}
                      placeholder="0.00"
                      required
                      className="h-12"
                      data-testid="input-payment-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Stato *</Label>
                    <Select name="status" defaultValue={editingPayment?.status || "pending"}>
                      <SelectTrigger className="h-12" data-testid="select-payment-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">In attesa</SelectItem>
                        <SelectItem value="paid">Pagato</SelectItem>
                        <SelectItem value="cancelled">Annullato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Metodo</Label>
                    <Select name="paymentMethod" defaultValue={editingPayment?.paymentMethod || ""}>
                      <SelectTrigger className="h-12" data-testid="select-payment-method">
                        <SelectValue placeholder="Metodo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Non specificato</SelectItem>
                        <SelectItem value="cash">Contanti</SelectItem>
                        <SelectItem value="bank_transfer">Bonifico</SelectItem>
                        <SelectItem value="other">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Data</Label>
                    <Input
                      id="paymentDate"
                      name="paymentDate"
                      type="date"
                      defaultValue={editingPayment?.paymentDate ? format(new Date(editingPayment.paymentDate), "yyyy-MM-dd") : ""}
                      className="h-12"
                      data-testid="input-payment-date"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingPayment?.notes || ""}
                    className="min-h-[80px]"
                    data-testid="input-payment-notes"
                  />
                </div>
                <DialogFooter>
                  <HapticButton 
                    type="submit" 
                    className="w-full gradient-golden text-black font-semibold min-h-[52px]" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    hapticType="medium"
                    data-testid="button-save-payment"
                  >
                    {editingPayment ? "Salva Modifiche" : "Aggiungi Pagamento"}
                  </HapticButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </motion.div>
  );
}
