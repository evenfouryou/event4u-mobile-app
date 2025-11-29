import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  Euro,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Layers,
  LayoutGrid,
  Receipt,
  CreditCard,
  Banknote,
  Landmark,
  Search,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Event, CashSector, CashPosition, CashEntry, CashFund, Staff, Product, ExtraCost, StaffAssignment, Location } from "@shared/schema";

export default function NightFilePage() {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("cassa");
  const isAdmin = user?.role === "super_admin" || user?.role === "gestore";

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const eventLocation = locations.find(l => l.id === selectedEvent?.locationId);

  const activeEvents = events.filter(e => 
    e.status === 'ongoing' || e.status === 'scheduled' || e.status === 'closed'
  ).sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());

  if (eventsLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  if (selectedEventId && selectedEvent) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedEventId(null)}
            data-testid="button-back-events"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" data-testid="text-event-file-title">
              <FileText className="h-7 w-7 text-primary" />
              {selectedEvent.name}
            </h1>
            <div className="flex items-center gap-4 text-muted-foreground mt-1">
              {selectedEvent.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedEvent.startDate), "dd MMMM yyyy", { locale: it })}
                </span>
              )}
              {eventLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {eventLocation.name}
                </span>
              )}
              <Badge variant={selectedEvent.status === 'ongoing' ? 'default' : selectedEvent.status === 'closed' ? 'secondary' : 'outline'}>
                {selectedEvent.status === 'ongoing' ? 'In Corso' : selectedEvent.status === 'closed' ? 'Chiuso' : 'Programmato'}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto">
            <TabsTrigger value="cassa" className="flex items-center gap-2 py-3" data-testid="tab-cassa">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Cassa</span>
            </TabsTrigger>
            <TabsTrigger value="incassi" className="flex items-center gap-2 py-3" data-testid="tab-incassi">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Incassi</span>
            </TabsTrigger>
            <TabsTrigger value="personale" className="flex items-center gap-2 py-3" data-testid="tab-personale">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Personale</span>
            </TabsTrigger>
            <TabsTrigger value="costi" className="flex items-center gap-2 py-3" data-testid="tab-costi">
              <TrendingDown className="h-4 w-4" />
              <span className="hidden sm:inline">Costi</span>
            </TabsTrigger>
            <TabsTrigger value="riepilogo" className="flex items-center gap-2 py-3" data-testid="tab-riepilogo">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Riepilogo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cassa" className="mt-6 space-y-6">
            <CashPositionsSection eventId={selectedEventId} isAdmin={isAdmin} />
            <CashFundsSection eventId={selectedEventId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="incassi" className="mt-6">
            <CashEntriesSection eventId={selectedEventId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="personale" className="mt-6">
            <PersonnelSection eventId={selectedEventId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="costi" className="mt-6">
            <CostsSection eventId={selectedEventId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="riepilogo" className="mt-6">
            <SummarySection eventId={selectedEventId} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" data-testid="text-night-file-title">
          <FileText className="h-8 w-8 text-primary" />
          File della Serata
        </h1>
        <p className="text-muted-foreground">
          Seleziona un evento per compilare il documento con cassa, incassi, personale e costi
        </p>
      </div>

      {activeEvents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun Evento</h3>
            <p className="text-muted-foreground">
              Crea prima un evento dalla sezione Eventi per poter compilare il file della serata
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeEvents.map((event) => {
            const location = locations.find(l => l.id === event.locationId);
            return (
              <Card 
                key={event.id} 
                className="hover-elevate cursor-pointer" 
                onClick={() => setSelectedEventId(event.id)}
                data-testid={`card-event-${event.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <Badge variant={event.status === 'ongoing' ? 'default' : event.status === 'closed' ? 'secondary' : 'outline'}>
                      {event.status === 'ongoing' ? 'In Corso' : event.status === 'closed' ? 'Chiuso' : 'Programmato'}
                    </Badge>
                  </div>
                  {event.startDate && (
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.startDate), "dd MMMM yyyy", { locale: it })}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-3">
                  {location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {location.name}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="outline" size="sm" className="w-full" data-testid={`button-open-file-${event.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Apri File Serata
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CashPositionsSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<CashPosition | null>(null);

  const { data: positions = [], isLoading } = useQuery<CashPosition[]>({
    queryKey: ["/api/cash-positions"],
  });

  const { data: sectors = [] } = useQuery<CashSector[]>({
    queryKey: ["/api/cash-sectors"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const eventPositions = positions.filter(p => p.eventId === eventId);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-positions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-positions"] });
      setIsDialogOpen(false);
      toast({ title: "Postazione creata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/cash-positions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-positions"] });
      setEditingPosition(null);
      setIsDialogOpen(false);
      toast({ title: "Postazione aggiornata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cash-positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-positions"] });
      toast({ title: "Postazione eliminata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const operatorValue = formData.get("operatorId") as string;
    const data = {
      name: formData.get("name") as string,
      eventId: eventId,
      sectorId: formData.get("sectorId") as string,
      operatorId: operatorValue === "_none" ? null : operatorValue || null,
      notes: formData.get("notes") as string || null,
    };

    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSectorName = (sectorId: string) => {
    const s = sectors.find(x => x.id === sectorId);
    return s?.name || "N/D";
  };

  const getStaffName = (operatorId: string | null) => {
    if (!operatorId) return "-";
    const s = staffList.find(x => x.id === operatorId);
    return s ? `${s.firstName} ${s.lastName}` : "N/D";
  };

  if (isLoading) {
    return <div className="text-center py-4">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Postazioni Cassa
            </CardTitle>
            <CardDescription>
              Postazioni cassa dell'evento (Bar, Biglietteria, VIP, ecc.)
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingPosition(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-position">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Postazione
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingPosition ? "Modifica Postazione" : "Nuova Postazione"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingPosition?.name || ""}
                      placeholder="es. Bar 1"
                      required
                      data-testid="input-position-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sectorId">Settore *</Label>
                    <Select name="sectorId" defaultValue={editingPosition?.sectorId || ""}>
                      <SelectTrigger data-testid="select-position-sector">
                        <SelectValue placeholder="Seleziona settore" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.filter(s => s.active).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operatorId">Operatore</Label>
                    <Select name="operatorId" defaultValue={editingPosition?.operatorId || "_none"}>
                      <SelectTrigger data-testid="select-position-operator">
                        <SelectValue placeholder="Seleziona operatore" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Non assegnato</SelectItem>
                        {staffList.filter(s => s.active).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingPosition?.notes || ""}
                      data-testid="input-position-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-position">
                      {editingPosition ? "Aggiorna" : "Crea"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {eventPositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna postazione cassa per questo evento
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Settore</TableHead>
                  <TableHead>Operatore</TableHead>
                  {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventPositions.map((pos) => (
                  <TableRow key={pos.id} data-testid={`row-position-${pos.id}`}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getSectorName(pos.sectorId)}</Badge>
                    </TableCell>
                    <TableCell>{getStaffName(pos.operatorId)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingPosition(pos);
                              setIsDialogOpen(true);
                            }}
                            data-testid={`button-edit-position-${pos.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-position-${pos.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminare questa postazione?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(pos.id)}>
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

function CashFundsSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<CashFund | null>(null);

  const { data: funds = [], isLoading } = useQuery<CashFund[]>({
    queryKey: ["/api/cash-funds"],
  });

  const { data: positions = [] } = useQuery<CashPosition[]>({
    queryKey: ["/api/cash-positions"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const eventPositions = positions.filter(p => p.eventId === eventId);
  const eventFunds = funds.filter(f => f.eventId === eventId);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-funds", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-funds"] });
      setIsDialogOpen(false);
      toast({ title: "Fondo registrato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/cash-funds/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-funds"] });
      setEditingFund(null);
      setIsDialogOpen(false);
      toast({ title: "Fondo aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cash-funds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-funds"] });
      toast({ title: "Fondo eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const operatorValue = formData.get("operatorId") as string;
    const data = {
      eventId: eventId,
      positionId: formData.get("positionId") as string,
      type: formData.get("type") as string,
      amount: formData.get("amount") as string,
      expectedAmount: formData.get("expectedAmount") as string || null,
      operatorId: operatorValue === "_none" ? null : operatorValue || null,
      notes: formData.get("notes") as string || null,
    };

    if (editingFund) {
      updateMutation.mutate({ id: editingFund.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getPositionName = (positionId: string) => {
    const p = positions.find(x => x.id === positionId);
    return p?.name || "N/D";
  };

  const getStaffName = (operatorId: string | null) => {
    if (!operatorId) return "-";
    const s = staffList.find(x => x.id === operatorId);
    return s ? `${s.firstName} ${s.lastName}` : "N/D";
  };

  const typeLabels: Record<string, { label: string; variant: "default" | "secondary" }> = {
    opening: { label: "Apertura", variant: "secondary" },
    closing: { label: "Chiusura", variant: "default" },
  };

  if (isLoading) {
    return <div className="text-center py-4">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Fondi Cassa
            </CardTitle>
            <CardDescription>
              Apertura e chiusura dei fondi cassa
            </CardDescription>
          </div>
          {isAdmin && eventPositions.length > 0 && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingFund(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-fund">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Fondo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingFund ? "Modifica Fondo" : "Nuovo Fondo"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="positionId">Postazione *</Label>
                    <Select name="positionId" defaultValue={editingFund?.positionId || ""}>
                      <SelectTrigger data-testid="select-fund-position">
                        <SelectValue placeholder="Seleziona postazione" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventPositions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo *</Label>
                      <Select name="type" defaultValue={editingFund?.type || "opening"}>
                        <SelectTrigger data-testid="select-fund-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="opening">Apertura</SelectItem>
                          <SelectItem value="closing">Chiusura</SelectItem>
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
                        defaultValue={editingFund?.amount || ""}
                        required
                        data-testid="input-fund-amount"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedAmount">Importo Atteso (€)</Label>
                    <Input
                      id="expectedAmount"
                      name="expectedAmount"
                      type="number"
                      step="0.01"
                      defaultValue={editingFund?.expectedAmount || ""}
                      placeholder="Solo per chiusura"
                      data-testid="input-fund-expected"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operatorId">Operatore</Label>
                    <Select name="operatorId" defaultValue={editingFund?.operatorId || "_none"}>
                      <SelectTrigger data-testid="select-fund-operator">
                        <SelectValue placeholder="Seleziona operatore" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Non specificato</SelectItem>
                        {staffList.filter(s => s.active).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingFund?.notes || ""}
                      data-testid="input-fund-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-fund">
                      {editingFund ? "Aggiorna" : "Registra"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {eventPositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Crea prima delle postazioni cassa per registrare i fondi
          </div>
        ) : eventFunds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun fondo cassa registrato per questo evento
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Postazione</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead className="text-right">Atteso</TableHead>
                  <TableHead className="text-right">Differenza</TableHead>
                  <TableHead>Operatore</TableHead>
                  {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventFunds.map((fund) => (
                  <TableRow key={fund.id} data-testid={`row-fund-${fund.id}`}>
                    <TableCell className="font-medium">{getPositionName(fund.positionId)}</TableCell>
                    <TableCell>
                      <Badge variant={typeLabels[fund.type]?.variant || "secondary"}>
                        {typeLabels[fund.type]?.label || fund.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{parseFloat(fund.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fund.expectedAmount ? `€${parseFloat(fund.expectedAmount).toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {fund.difference ? (
                        <span className={parseFloat(fund.difference) >= 0 ? "text-green-600" : "text-destructive"}>
                          {parseFloat(fund.difference) >= 0 ? "+" : ""}€{parseFloat(fund.difference).toFixed(2)}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{getStaffName(fund.operatorId)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingFund(fund);
                              setIsDialogOpen(true);
                            }}
                            data-testid={`button-edit-fund-${fund.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-fund-${fund.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminare questo fondo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(fund.id)}>
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

function CashEntriesSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery<CashEntry[]>({
    queryKey: ["/api/cash-entries"],
  });

  const { data: positions = [] } = useQuery<CashPosition[]>({
    queryKey: ["/api/cash-positions"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const eventPositions = positions.filter(p => p.eventId === eventId);
  const eventEntries = entries.filter(e => e.eventId === eventId);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-entries"] });
      setIsDialogOpen(false);
      toast({ title: "Incasso registrato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/cash-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-entries"] });
      setEditingEntry(null);
      setIsDialogOpen(false);
      toast({ title: "Incasso aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cash-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-entries"] });
      toast({ title: "Incasso eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productValue = formData.get("productId") as string;
    const data = {
      eventId: eventId,
      positionId: formData.get("positionId") as string,
      entryType: formData.get("entryType") as string,
      productId: productValue === "_none" ? null : productValue || null,
      description: formData.get("description") as string || null,
      quantity: formData.get("quantity") as string || null,
      unitPrice: formData.get("unitPrice") as string || null,
      totalAmount: formData.get("totalAmount") as string,
      paymentMethod: formData.get("paymentMethod") as string,
      notes: formData.get("notes") as string || null,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getPositionName = (positionId: string) => {
    const p = positions.find(x => x.id === positionId);
    return p?.name || "N/D";
  };

  const paymentMethodLabels: Record<string, { label: string; icon: typeof CreditCard }> = {
    cash: { label: "Contanti", icon: Banknote },
    card: { label: "Carta", icon: CreditCard },
    online: { label: "Online", icon: Landmark },
    credits: { label: "Crediti", icon: Wallet },
  };

  const totalEntries = eventEntries.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cashTotal = eventEntries.filter(e => e.paymentMethod === 'cash').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cardTotal = eventEntries.filter(e => e.paymentMethod === 'card').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Registrazione Incassi
            </CardTitle>
            <CardDescription>
              Registra gli incassi per postazione
            </CardDescription>
          </div>
          {isAdmin && eventPositions.length > 0 && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingEntry(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-entry">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Incasso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingEntry ? "Modifica Incasso" : "Nuovo Incasso"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="positionId">Postazione *</Label>
                    <Select name="positionId" defaultValue={editingEntry?.positionId || ""}>
                      <SelectTrigger data-testid="select-entry-position">
                        <SelectValue placeholder="Seleziona postazione" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventPositions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entryType">Tipo *</Label>
                      <Select name="entryType" defaultValue={editingEntry?.entryType || "monetary"}>
                        <SelectTrigger data-testid="select-entry-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monetary">Monetario</SelectItem>
                          <SelectItem value="quantity">Quantità</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Metodo Pagamento *</Label>
                      <Select name="paymentMethod" defaultValue={editingEntry?.paymentMethod || "cash"}>
                        <SelectTrigger data-testid="select-entry-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Contanti</SelectItem>
                          <SelectItem value="card">Carta</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="credits">Crediti</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productId">Prodotto</Label>
                    <Select name="productId" defaultValue={editingEntry?.productId || "_none"}>
                      <SelectTrigger data-testid="select-entry-product">
                        <SelectValue placeholder="Seleziona prodotto (opzionale)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Nessuno</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrizione</Label>
                    <Input
                      id="description"
                      name="description"
                      defaultValue={editingEntry?.description || ""}
                      placeholder="es. Ingresso VIP"
                      data-testid="input-entry-description"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantità</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        step="0.01"
                        defaultValue={editingEntry?.quantity || ""}
                        data-testid="input-entry-quantity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">Prezzo Unit.</Label>
                      <Input
                        id="unitPrice"
                        name="unitPrice"
                        type="number"
                        step="0.01"
                        defaultValue={editingEntry?.unitPrice || ""}
                        data-testid="input-entry-unit-price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">Totale (€) *</Label>
                      <Input
                        id="totalAmount"
                        name="totalAmount"
                        type="number"
                        step="0.01"
                        defaultValue={editingEntry?.totalAmount || ""}
                        required
                        data-testid="input-entry-total"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingEntry?.notes || ""}
                      data-testid="input-entry-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-entry">
                      {editingEntry ? "Aggiorna" : "Registra"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {eventPositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Crea prima delle postazioni cassa per registrare gli incassi
          </div>
        ) : eventEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun incasso registrato per questo evento
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Postazione</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead>Data</TableHead>
                    {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventEntries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <TableCell className="font-medium">{getPositionName(entry.positionId)}</TableCell>
                      <TableCell>{entry.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentMethodLabels[entry.paymentMethod]?.label || entry.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{parseFloat(entry.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {entry.entryTime && format(new Date(entry.entryTime), "dd/MM HH:mm", { locale: it })}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingEntry(entry);
                                setIsDialogOpen(true);
                              }}
                              data-testid={`button-edit-entry-${entry.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-entry-${entry.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questo incasso?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(entry.id)}>
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

            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Contanti</p>
                <p className="text-lg font-bold text-green-600">€{cashTotal.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Carta</p>
                <p className="text-lg font-bold text-blue-600">€{cardTotal.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Totale</p>
                <p className="text-xl font-bold">€{totalEntries.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PersonnelSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { data: assignments = [], isLoading } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/staff-assignments"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const eventAssignments = assignments.filter(a => a.eventId === eventId);

  const getStaffName = (staffId: string) => {
    const s = staffList.find(x => x.id === staffId);
    return s ? `${s.firstName} ${s.lastName}` : "N/D";
  };

  const getStaffRole = (staffId: string) => {
    const s = staffList.find(x => x.id === staffId);
    return s?.role || "-";
  };

  const totalCost = eventAssignments.reduce((sum, a) => sum + parseFloat(a.paymentAmount || '0'), 0);

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Personale Assegnato
        </CardTitle>
        <CardDescription>
          Staff assegnato all'evento e relativi pagamenti
        </CardDescription>
      </CardHeader>
      <CardContent>
        {eventAssignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun personale assegnato a questo evento.
            <br />
            <span className="text-sm">Vai alla sezione Personale per assegnare lo staff.</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Mansione Evento</TableHead>
                    <TableHead className="text-right">Compenso</TableHead>
                    <TableHead>Stato Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventAssignments.map((assignment) => (
                    <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                      <TableCell className="font-medium">{getStaffName(assignment.staffId)}</TableCell>
                      <TableCell>{getStaffRole(assignment.staffId)}</TableCell>
                      <TableCell>{assignment.role || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        €{parseFloat(assignment.paymentAmount || '0').toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={assignment.paid ? "default" : "outline"}>
                          {assignment.paid ? "Pagato" : "Da Pagare"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-muted-foreground">Totale costo personale:</span>
              <span className="text-xl font-bold">€{totalCost.toFixed(2)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CostsSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<ExtraCost | null>(null);

  const { data: extraCosts = [], isLoading } = useQuery<ExtraCost[]>({
    queryKey: ["/api/extra-costs"],
  });

  const eventCosts = extraCosts.filter(c => c.eventId === eventId);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/extra-costs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-costs"] });
      setIsDialogOpen(false);
      toast({ title: "Costo registrato" });
    },
    onError: (err: any) => {
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
      toast({ title: "Costo aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/extra-costs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-costs"] });
      toast({ title: "Costo eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      eventId: eventId,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      amount: formData.get("amount") as string,
      date: formData.get("date") as string || null,
      notes: formData.get("notes") as string || null,
    };

    if (editingCost) {
      updateMutation.mutate({ id: editingCost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const totalCosts = eventCosts.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Costi Extra Evento
            </CardTitle>
            <CardDescription>
              Spese aggiuntive specifiche per questo evento
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingCost(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-cost">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Costo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingCost ? "Modifica Costo" : "Nuovo Costo"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrizione *</Label>
                    <Input
                      id="description"
                      name="description"
                      defaultValue={editingCost?.description || ""}
                      placeholder="es. Noleggio luci extra"
                      required
                      data-testid="input-cost-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria *</Label>
                      <Select name="category" defaultValue={editingCost?.category || "other"}>
                        <SelectTrigger data-testid="select-cost-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equipment">Attrezzature</SelectItem>
                          <SelectItem value="staff">Personale Extra</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="transport">Trasporto</SelectItem>
                          <SelectItem value="other">Altro</SelectItem>
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
                        required
                        data-testid="input-cost-amount"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      defaultValue={editingCost?.date ? format(new Date(editingCost.date), "yyyy-MM-dd") : ""}
                      data-testid="input-cost-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingCost?.notes || ""}
                      data-testid="input-cost-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-cost">
                      {editingCost ? "Aggiorna" : "Registra"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {eventCosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun costo extra registrato per questo evento
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventCosts.map((cost) => (
                    <TableRow key={cost.id} data-testid={`row-cost-${cost.id}`}>
                      <TableCell className="font-medium">{cost.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cost.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {cost.date ? format(new Date(cost.date), "dd/MM/yyyy", { locale: it }) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        €{parseFloat(cost.amount).toFixed(2)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingCost(cost);
                                setIsDialogOpen(true);
                              }}
                              data-testid={`button-edit-cost-${cost.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-cost-${cost.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questo costo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(cost.id)}>
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

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-muted-foreground">Totale costi extra:</span>
              <span className="text-xl font-bold text-red-600">€{totalCosts.toFixed(2)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SummarySection({ eventId }: { eventId: string }) {
  const { data: entries = [] } = useQuery<CashEntry[]>({
    queryKey: ["/api/cash-entries"],
  });

  const { data: extraCosts = [] } = useQuery<ExtraCost[]>({
    queryKey: ["/api/extra-costs"],
  });

  const { data: assignments = [] } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/staff-assignments"],
  });

  const { data: funds = [] } = useQuery<CashFund[]>({
    queryKey: ["/api/cash-funds"],
  });

  const eventEntries = entries.filter(e => e.eventId === eventId);
  const eventCosts = extraCosts.filter(c => c.eventId === eventId);
  const eventAssignments = assignments.filter(a => a.eventId === eventId);
  const eventFunds = funds.filter(f => f.eventId === eventId);

  const totalRevenue = eventEntries.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cashRevenue = eventEntries.filter(e => e.paymentMethod === 'cash').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cardRevenue = eventEntries.filter(e => e.paymentMethod === 'card').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const onlineRevenue = eventEntries.filter(e => e.paymentMethod === 'online').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const creditsRevenue = eventEntries.filter(e => e.paymentMethod === 'credits').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

  const totalExtraCosts = eventCosts.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const totalStaffCosts = eventAssignments.reduce((sum, a) => sum + parseFloat(a.paymentAmount || '0'), 0);
  const totalCosts = totalExtraCosts + totalStaffCosts;

  const netResult = totalRevenue - totalCosts;

  const openingFunds = eventFunds.filter(f => f.type === 'opening').reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const closingFunds = eventFunds.filter(f => f.type === 'closing').reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const fundsDifference = closingFunds - openingFunds;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ricavi Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">€{totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Costi Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">€{totalCosts.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Risultato Netto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{netResult.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Dettaglio Ricavi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    Contanti
                  </TableCell>
                  <TableCell className="text-right font-medium">€{cashRevenue.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Carta
                  </TableCell>
                  <TableCell className="text-right font-medium">€{cardRevenue.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                    Online
                  </TableCell>
                  <TableCell className="text-right font-medium">€{onlineRevenue.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Crediti
                  </TableCell>
                  <TableCell className="text-right font-medium">€{creditsRevenue.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Dettaglio Costi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Personale
                  </TableCell>
                  <TableCell className="text-right font-medium">€{totalStaffCosts.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    Costi Extra
                  </TableCell>
                  <TableCell className="text-right font-medium">€{totalExtraCosts.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {eventFunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Quadratura Cassa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Apertura</p>
                <p className="text-xl font-bold">€{openingFunds.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chiusura</p>
                <p className="text-xl font-bold">€{closingFunds.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Differenza</p>
                <p className={`text-xl font-bold ${fundsDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fundsDifference >= 0 ? '+' : ''}€{fundsDifference.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
