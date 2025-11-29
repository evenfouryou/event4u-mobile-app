import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Staff, StaffAssignment, StaffPayment, Event } from "@shared/schema";

export default function Personnel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("staff");
  const isAdmin = user?.role === "super_admin" || user?.role === "gestore";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-personnel-title">
          Personale
        </h1>
        <p className="text-muted-foreground">
          Gestione anagrafica, presenze e pagamenti del personale
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="staff" className="flex items-center gap-2 py-3" data-testid="tab-staff">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Anagrafica</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2 py-3" data-testid="tab-assignments">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Presenze</span>
            <span className="sm:hidden">Pres.</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 py-3" data-testid="tab-payments">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Pagamenti</span>
            <span className="sm:hidden">Pag.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-6">
          <StaffSection isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <AssignmentsSection isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentsSection isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
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
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Anagrafica Personale
            </CardTitle>
            <CardDescription>
              Gestione del registro del personale
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingStaff(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-staff">
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
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-staff">
                      {editingStaff ? "Aggiorna" : "Crea"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
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
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessun personale registrato"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow key={s.id} data-testid={`row-staff-${s.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{s.firstName} {s.lastName}</div>
                          {s.fiscalCode && (
                            <div className="text-xs text-muted-foreground">{s.fiscalCode}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
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
                      <Badge variant={s.active ? "default" : "secondary"}>
                        {s.active ? "Attivo" : "Inattivo"}
                      </Badge>
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
        )}
      </CardContent>
    </Card>
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

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    scheduled: { label: "Programmato", variant: "secondary" },
    confirmed: { label: "Confermato", variant: "outline" },
    present: { label: "Presente", variant: "default" },
    absent: { label: "Assente", variant: "destructive" },
    replaced: { label: "Sostituito", variant: "secondary" },
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Presenze e Assegnazioni
            </CardTitle>
            <CardDescription>
              Gestione delle presenze del personale agli eventi
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingAssignment(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-assignment">
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
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-assignment">
                      {editingAssignment ? "Aggiorna" : "Crea"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
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
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessuna assegnazione registrata"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personale</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Compenso</TableHead>
                  {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id} data-testid={`row-assignment-${a.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
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
                      <Badge variant={statusLabels[a.status]?.variant || "secondary"}>
                        {statusLabels[a.status]?.label || a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1 text-sm">
                        {a.compensationAmount && (
                          <div>€{parseFloat(a.compensationAmount).toFixed(2)}</div>
                        )}
                        {a.bonus && (
                          <div className="text-green-600">+€{parseFloat(a.bonus).toFixed(2)}</div>
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
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

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "In attesa", variant: "secondary" },
    paid: { label: "Pagato", variant: "default" },
    cancelled: { label: "Annullato", variant: "destructive" },
  };

  const methodLabels: Record<string, string> = {
    cash: "Contanti",
    bank_transfer: "Bonifico",
    other: "Altro",
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Pagamenti Personale
            </CardTitle>
            <CardDescription>
              Gestione dei pagamenti e compensi
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingPayment(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-payment">
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
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-payment">
                      {editingPayment ? "Aggiorna" : "Crea"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
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
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessun pagamento registrato"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                {payments.map((p) => (
                  <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {getStaffName(p.staffId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {getEventName(p.eventId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{parseFloat(p.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {p.paymentMethod ? (
                        <Badge variant="outline">{methodLabels[p.paymentMethod] || p.paymentMethod}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[p.status]?.variant || "secondary"}>
                        {statusLabels[p.status]?.label || p.status}
                      </Badge>
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Totale pagamenti:</span>
            <span className="text-lg font-bold">
              €{payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">In attesa:</span>
            <span className="text-orange-600">
              €{payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
