import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
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
  TrendingUp,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Staff, StaffAssignment, StaffPayment, Event } from "@shared/schema";

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold mb-1" data-testid={testId}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{title}</p>
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
  const pendingPayments = payments.filter(p => p.status === "pending").length;

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation("/")}
          className="rounded-xl"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold" data-testid="text-personnel-title">
            Personale
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Gestione anagrafica, presenze e pagamenti
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
        {staffLoading ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        ) : (
          <>
            <StatsCard
              icon={Users}
              title="Totale Personale"
              value={staffList.length}
              gradient="from-blue-500 to-indigo-600"
              testId="stat-total-staff"
              delay={0}
            />
            <StatsCard
              icon={UserCheck}
              title="Personale Attivo"
              value={activeStaffCount}
              gradient="from-teal-500 to-cyan-600"
              testId="stat-active-staff"
              delay={0.1}
            />
            <StatsCard
              icon={Calendar}
              title="Assegnazioni"
              value={assignments.length}
              gradient="from-violet-500 to-purple-600"
              testId="stat-assignments"
              delay={0.2}
            />
            <StatsCard
              icon={Euro}
              title="Totale Pagamenti"
              value={`€${totalPayments.toFixed(0)}`}
              gradient="from-amber-500 to-orange-600"
              testId="stat-total-payments"
              delay={0.3}
            />
          </>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-auto glass-card mb-6">
            <TabsTrigger value="staff" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/20" data-testid="tab-staff">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Anagrafica</span>
              <span className="sm:hidden">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/20" data-testid="tab-assignments">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Presenze</span>
              <span className="sm:hidden">Pres.</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/20" data-testid="tab-payments">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Pagamenti</span>
              <span className="sm:hidden">Pag.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="mt-0">
            <StaffSection isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="assignments" className="mt-0">
            <AssignmentsSection isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <PaymentsSection isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
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
      toast({ title: "Personale creato con successo" });
    },
    onError: (err: any) => {
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
      toast({ title: "Personale aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Personale eliminato" });
    },
    onError: (err: any) => {
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

  const roleLabels: Record<string, string> = {
    pr: "PR",
    barista: "Barista",
    sicurezza: "Sicurezza",
    fotografo: "Fotografo",
    dj: "DJ",
    tecnico: "Tecnico",
    altro: "Altro",
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Anagrafica Personale</h2>
              <p className="text-sm text-muted-foreground">
                Gestione del registro del personale
              </p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingStaff(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-golden text-black font-semibold" data-testid="button-add-staff">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingStaff ? "Modifica Personale" : "Nuovo Personale"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nome *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        defaultValue={editingStaff?.firstName || ""}
                        required
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
                        data-testid="input-staff-last-name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Ruolo *</Label>
                      <Select name="role" defaultValue={editingStaff?.role || "altro"}>
                        <SelectTrigger data-testid="select-staff-role">
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
                      <Label htmlFor="fiscalCode">Codice Fiscale</Label>
                      <Input
                        id="fiscalCode"
                        name="fiscalCode"
                        defaultValue={editingStaff?.fiscalCode || ""}
                        maxLength={16}
                        data-testid="input-staff-fiscal-code"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={editingStaff?.email || ""}
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
                        data-testid="input-staff-phone"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Tariffa Oraria (€)</Label>
                      <Input
                        id="hourlyRate"
                        name="hourlyRate"
                        type="number"
                        step="0.01"
                        defaultValue={editingStaff?.hourlyRate || ""}
                        placeholder="0.00"
                        data-testid="input-staff-hourly-rate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fixedRate">Tariffa Fissa (€)</Label>
                      <Input
                        id="fixedRate"
                        name="fixedRate"
                        type="number"
                        step="0.01"
                        defaultValue={editingStaff?.fixedRate || ""}
                        placeholder="0.00"
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
                      data-testid="input-staff-iban"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Indirizzo</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={editingStaff?.address || ""}
                      data-testid="input-staff-address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingStaff?.notes || ""}
                      data-testid="input-staff-notes"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="active" 
                      name="active" 
                      defaultChecked={editingStaff?.active !== false}
                      data-testid="switch-staff-active"
                    />
                    <Label htmlFor="active">Attivo</Label>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-staff">
                      {editingStaff ? "Aggiorna" : "Crea"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca personale..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-staff"
            />
          </div>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{searchTerm ? "Nessun risultato trovato" : "Nessun personale registrato"}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>Nome</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Contatti</TableHead>
                    <TableHead className="text-right">Tariffe</TableHead>
                    <TableHead>Stato</TableHead>
                    {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((s) => (
                    <TableRow key={s.id} className="border-white/10" data-testid={`row-staff-${s.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="font-medium">{s.firstName} {s.lastName}</div>
                            {s.fiscalCode && (
                              <div className="text-xs text-muted-foreground">{s.fiscalCode}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30">
                          {roleLabels[s.role] || s.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {s.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {s.phone}
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {s.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1 text-sm">
                          {s.hourlyRate && <div>€{parseFloat(s.hourlyRate).toFixed(2)}/h</div>}
                          {s.fixedRate && <div>€{parseFloat(s.fixedRate).toFixed(2)} fisso</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.active 
                            ? 'bg-teal-500/20 text-teal' 
                            : 'bg-muted/50 text-muted-foreground'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-teal-500' : 'bg-muted-foreground'}`} />
                          {s.active ? "Attivo" : "Inattivo"}
                        </span>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingStaff(s);
                                setIsDialogOpen(true);
                              }}
                              data-testid={`button-edit-staff-${s.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-staff-${s.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questo personale?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(s.id)}>
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredStaff.map((s) => (
                <div key={s.id} className="glass-card p-4" data-testid={`card-staff-${s.id}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{s.firstName} {s.lastName}</div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.active 
                            ? 'bg-teal-500/20 text-teal' 
                            : 'bg-muted/50 text-muted-foreground'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-teal-500' : 'bg-muted-foreground'}`} />
                          {s.active ? "Attivo" : "Inattivo"}
                        </span>
                      </div>
                      {s.fiscalCode && (
                        <div className="text-xs text-muted-foreground mt-1">{s.fiscalCode}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="border-primary/30">
                      {roleLabels[s.role] || s.role}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground mb-3">
                    {s.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {s.phone}
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{s.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="text-sm">
                      {s.hourlyRate && <span className="text-primary font-medium">€{parseFloat(s.hourlyRate).toFixed(2)}/h</span>}
                      {s.hourlyRate && s.fixedRate && <span className="text-muted-foreground mx-2">|</span>}
                      {s.fixedRate && <span className="text-primary font-medium">€{parseFloat(s.fixedRate).toFixed(2)} fisso</span>}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="min-h-[48px] min-w-[48px]"
                          onClick={() => {
                            setEditingStaff(s);
                            setIsDialogOpen(true);
                          }}
                          data-testid={`button-edit-staff-mobile-${s.id}`}
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="min-h-[48px] min-w-[48px]" data-testid={`button-delete-staff-mobile-${s.id}`}>
                              <Trash2 className="h-5 w-5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[95vw] max-w-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare questo personale?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione non può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(s.id)}>
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
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
      toast({ title: "Assegnazione creata con successo" });
    },
    onError: (err: any) => {
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
      toast({ title: "Assegnazione aggiornata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/staff-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      toast({ title: "Assegnazione eliminata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      eventId: formData.get("eventId") as string,
      staffId: formData.get("staffId") as string,
      role: formData.get("role") as string || null,
      status: formData.get("status") as string,
      compensationType: formData.get("compensationType") as string,
      compensationAmount: formData.get("compensationAmount") as string || null,
      bonus: formData.get("bonus") as string || null,
      scheduledStart: formData.get("scheduledStart") as string || null,
      scheduledEnd: formData.get("scheduledEnd") as string || null,
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

  const getEventName = (eventId: string) => {
    const e = events.find(x => x.id === eventId);
    return e?.name || "N/D";
  };

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    scheduled: { label: "Programmato", color: "text-blue-400", bgColor: "bg-blue-500/20" },
    confirmed: { label: "Confermato", color: "text-violet-400", bgColor: "bg-violet-500/20" },
    present: { label: "Presente", color: "text-teal", bgColor: "bg-teal-500/20" },
    absent: { label: "Assente", color: "text-rose-400", bgColor: "bg-rose-500/20" },
    replaced: { label: "Sostituito", color: "text-muted-foreground", bgColor: "bg-muted/50" },
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Presenze e Assegnazioni</h2>
              <p className="text-sm text-muted-foreground">
                Gestione delle presenze del personale agli eventi
              </p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingAssignment(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-golden text-black font-semibold" data-testid="button-add-assignment">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Assegnazione
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAssignment ? "Modifica Assegnazione" : "Nuova Assegnazione"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventId">Evento *</Label>
                    <Select name="eventId" defaultValue={editingAssignment?.eventId || ""}>
                      <SelectTrigger data-testid="select-assignment-event">
                        <SelectValue placeholder="Seleziona evento" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staffId">Personale *</Label>
                    <Select name="staffId" defaultValue={editingAssignment?.staffId || ""}>
                      <SelectTrigger data-testid="select-assignment-staff">
                        <SelectValue placeholder="Seleziona personale" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList.filter(s => s.active).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Ruolo Evento</Label>
                      <Input
                        id="role"
                        name="role"
                        defaultValue={editingAssignment?.role || ""}
                        placeholder="es. Barista principale"
                        data-testid="input-assignment-role"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Stato *</Label>
                      <Select name="status" defaultValue={editingAssignment?.status || "scheduled"}>
                        <SelectTrigger data-testid="select-assignment-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Programmato</SelectItem>
                          <SelectItem value="confirmed">Confermato</SelectItem>
                          <SelectItem value="present">Presente</SelectItem>
                          <SelectItem value="absent">Assente</SelectItem>
                          <SelectItem value="replaced">Sostituito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="compensationType">Tipo Compenso</Label>
                      <Select name="compensationType" defaultValue={editingAssignment?.compensationType || "fixed"}>
                        <SelectTrigger data-testid="select-assignment-compensation-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fisso</SelectItem>
                          <SelectItem value="hourly">Orario</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="compensationAmount">Importo (€)</Label>
                      <Input
                        id="compensationAmount"
                        name="compensationAmount"
                        type="number"
                        step="0.01"
                        defaultValue={editingAssignment?.compensationAmount || ""}
                        placeholder="0.00"
                        data-testid="input-assignment-compensation"
                      />
                    </div>
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
                      data-testid="input-assignment-bonus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingAssignment?.notes || ""}
                      data-testid="input-assignment-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-assignment">
                      {editingAssignment ? "Aggiorna" : "Crea"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca assegnazioni..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-assignments"
            />
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{searchTerm ? "Nessun risultato trovato" : "Nessuna assegnazione registrata"}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>Personale</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Compenso</TableHead>
                    {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => {
                    const status = statusConfig[a.status] || statusConfig.scheduled;
                    return (
                      <TableRow key={a.id} className="border-white/10" data-testid={`row-assignment-${a.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                              <UserCheck className="h-4 w-4 text-violet-400" />
                            </div>
                            {getStaffName(a.staffId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {getEventName(a.eventId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {a.role || "-"}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1 text-sm">
                            {a.compensationAmount && (
                              <div>€{parseFloat(a.compensationAmount).toFixed(2)}</div>
                            )}
                            {a.bonus && (
                              <div className="text-teal">+€{parseFloat(a.bonus).toFixed(2)}</div>
                            )}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingAssignment(a);
                                  setIsDialogOpen(true);
                                }}
                                data-testid={`button-edit-assignment-${a.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`button-delete-assignment-${a.id}`}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminare questa assegnazione?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Questa azione non può essere annullata.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(a.id)}>
                                      Elimina
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {assignments.map((a) => {
                const status = statusConfig[a.status] || statusConfig.scheduled;
                return (
                  <div key={a.id} className="glass-card p-4" data-testid={`card-assignment-${a.id}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="h-5 w-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium truncate">{getStaffName(a.staffId)}</div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        {a.role && (
                          <div className="text-sm text-muted-foreground mt-1">{a.role}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <Calendar className="h-3 w-3" />
                      {getEventName(a.eventId)}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="text-sm">
                        {a.compensationAmount && (
                          <span className="text-primary font-medium">€{parseFloat(a.compensationAmount).toFixed(2)}</span>
                        )}
                        {a.bonus && (
                          <span className="text-teal ml-2">+€{parseFloat(a.bonus).toFixed(2)}</span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="min-h-[48px] min-w-[48px]"
                            onClick={() => {
                              setEditingAssignment(a);
                              setIsDialogOpen(true);
                            }}
                            data-testid={`button-edit-assignment-mobile-${a.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="min-h-[48px] min-w-[48px]" data-testid={`button-delete-assignment-mobile-${a.id}`}>
                                <Trash2 className="h-5 w-5 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] max-w-lg">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminare questa assegnazione?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(a.id)}>
                                  Elimina
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
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
      toast({ title: "Pagamento creato con successo" });
    },
    onError: (err: any) => {
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
      toast({ title: "Pagamento aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/staff-payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-payments"] });
      toast({ title: "Pagamento eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      staffId: formData.get("staffId") as string,
      eventId: formData.get("eventId") as string || null,
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

  const getEventName = (eventId: string | null) => {
    if (!eventId) return "Non associato";
    const e = events.find(x => x.id === eventId);
    return e?.name || "N/D";
  };

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: "In attesa", color: "text-amber-400", bgColor: "bg-amber-500/20" },
    paid: { label: "Pagato", color: "text-teal", bgColor: "bg-teal-500/20" },
    cancelled: { label: "Annullato", color: "text-rose-400", bgColor: "bg-rose-500/20" },
  };

  const methodLabels: Record<string, string> = {
    cash: "Contanti",
    bank_transfer: "Bonifico",
    other: "Altro",
  };

  const totalPaid = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Pagamenti Personale</h2>
              <p className="text-sm text-muted-foreground">
                Gestione dei pagamenti e compensi
              </p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingPayment(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-golden text-black font-semibold" data-testid="button-add-payment">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Pagamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPayment ? "Modifica Pagamento" : "Nuovo Pagamento"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="staffId">Personale *</Label>
                    <Select name="staffId" defaultValue={editingPayment?.staffId || ""}>
                      <SelectTrigger data-testid="select-payment-staff">
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
                      <SelectTrigger data-testid="select-payment-event">
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
                  <div className="grid grid-cols-2 gap-4">
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
                        data-testid="input-payment-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Stato *</Label>
                      <Select name="status" defaultValue={editingPayment?.status || "pending"}>
                        <SelectTrigger data-testid="select-payment-status">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Metodo</Label>
                      <Select name="paymentMethod" defaultValue={editingPayment?.paymentMethod || ""}>
                        <SelectTrigger data-testid="select-payment-method">
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
                      <Label htmlFor="paymentDate">Data Pagamento</Label>
                      <Input
                        id="paymentDate"
                        name="paymentDate"
                        type="date"
                        defaultValue={editingPayment?.paymentDate ? format(new Date(editingPayment.paymentDate), "yyyy-MM-dd") : ""}
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
                      data-testid="input-payment-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-payment">
                      {editingPayment ? "Aggiorna" : "Crea"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca pagamenti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-payments"
            />
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{searchTerm ? "Nessun risultato trovato" : "Nessun pagamento registrato"}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>Personale</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data</TableHead>
                    {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const status = statusConfig[p.status] || statusConfig.pending;
                    return (
                      <TableRow key={p.id} className="border-white/10" data-testid={`row-payment-${p.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
                              <User className="h-4 w-4 text-amber-400" />
                            </div>
                            {getStaffName(p.staffId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {getEventName(p.eventId)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          €{parseFloat(p.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {p.paymentMethod ? (
                            <Badge variant="outline" className="border-white/10">{methodLabels[p.paymentMethod] || p.paymentMethod}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {p.paymentDate ? (
                            format(new Date(p.paymentDate), "dd/MM/yyyy", { locale: it })
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPayment(p);
                                  setIsDialogOpen(true);
                                }}
                                data-testid={`button-edit-payment-${p.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`button-delete-payment-${p.id}`}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminare questo pagamento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Questa azione non può essere annullata.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)}>
                                      Elimina
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {payments.map((p) => {
                const status = statusConfig[p.status] || statusConfig.pending;
                return (
                  <div key={p.id} className="glass-card p-4" data-testid={`card-payment-${p.id}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium truncate">{getStaffName(p.staffId)}</div>
                          <div className="text-lg font-bold text-primary">€{parseFloat(p.amount).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {p.paymentMethod && (
                        <Badge variant="outline" className="border-white/10">{methodLabels[p.paymentMethod] || p.paymentMethod}</Badge>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {getEventName(p.eventId)}
                      </div>
                      {p.paymentDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(p.paymentDate), "dd/MM/yyyy", { locale: it })}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="min-h-[48px] min-w-[48px]"
                          onClick={() => {
                            setEditingPayment(p);
                            setIsDialogOpen(true);
                          }}
                          data-testid={`button-edit-payment-mobile-${p.id}`}
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="min-h-[48px] min-w-[48px]" data-testid={`button-delete-payment-mobile-${p.id}`}>
                              <Trash2 className="h-5 w-5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[95vw] max-w-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare questo pagamento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione non può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)}>
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Totale Pagato</p>
                  <p className="text-xl font-bold text-teal" data-testid="text-total-paid">€{totalPaid.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Euro className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Attesa</p>
                  <p className="text-xl font-bold text-amber-400" data-testid="text-total-pending">€{totalPending.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
