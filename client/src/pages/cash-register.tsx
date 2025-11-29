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
  Landmark, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Euro,
  Calendar,
  Layers,
  LayoutGrid,
  Receipt,
  Wallet,
  CreditCard,
  Banknote,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { CashSector, CashPosition, CashEntry, CashFund, Event, Staff, Product } from "@shared/schema";

export default function CashRegister() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("sectors");
  const isAdmin = user?.role === "super_admin" || user?.role === "gestore";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-cash-register-title">
          Cassa
        </h1>
        <p className="text-muted-foreground">
          Gestione settori, postazioni, incassi e fondi cassa
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
          <TabsTrigger value="sectors" className="flex items-center gap-2 py-3" data-testid="tab-sectors">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Settori</span>
            <span className="sm:hidden">Sett.</span>
          </TabsTrigger>
          <TabsTrigger value="positions" className="flex items-center gap-2 py-3" data-testid="tab-positions">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Postazioni</span>
            <span className="sm:hidden">Post.</span>
          </TabsTrigger>
          <TabsTrigger value="entries" className="flex items-center gap-2 py-3" data-testid="tab-entries">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Incassi</span>
            <span className="sm:hidden">Inc.</span>
          </TabsTrigger>
          <TabsTrigger value="funds" className="flex items-center gap-2 py-3" data-testid="tab-funds">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Fondi</span>
            <span className="sm:hidden">Fondi</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sectors" className="mt-6">
          <SectorsSection isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="positions" className="mt-6">
          <PositionsSection isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="entries" className="mt-6">
          <EntriesSection isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="funds" className="mt-6">
          <FundsSection isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectorsSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<CashSector | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: sectors = [], isLoading } = useQuery<CashSector[]>({
    queryKey: ["/api/cash-sectors"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-sectors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-sectors"] });
      setIsDialogOpen(false);
      toast({ title: "Settore creato con successo" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/cash-sectors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-sectors"] });
      setEditingSector(null);
      setIsDialogOpen(false);
      toast({ title: "Settore aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cash-sectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-sectors"] });
      toast({ title: "Settore eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
      sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
      active: formData.get("active") === "on",
    };

    if (editingSector) {
      updateMutation.mutate({ id: editingSector.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredSectors = sectors.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Settori Cassa
            </CardTitle>
            <CardDescription>
              Configurazione dei settori (Ingressi, Beverage, Guardaroba, ecc.)
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingSector(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-sector">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Settore
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingSector ? "Modifica Settore" : "Nuovo Settore"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingSector?.name || ""}
                      placeholder="es. Beverage"
                      required
                      data-testid="input-sector-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrizione</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingSector?.description || ""}
                      placeholder="Descrizione del settore"
                      data-testid="input-sector-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Ordine</Label>
                    <Input
                      id="sortOrder"
                      name="sortOrder"
                      type="number"
                      defaultValue={editingSector?.sortOrder || 0}
                      data-testid="input-sector-sort-order"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="active" 
                      name="active" 
                      defaultChecked={editingSector?.active !== false}
                      data-testid="switch-sector-active"
                    />
                    <Label htmlFor="active">Attivo</Label>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-sector">
                      {editingSector ? "Aggiorna" : "Crea"}
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
              placeholder="Cerca settori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-sectors"
            />
          </div>
        </div>

        {filteredSectors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessun settore registrato"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead className="text-center">Ordine</TableHead>
                  <TableHead>Stato</TableHead>
                  {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSectors.map((sector) => (
                  <TableRow key={sector.id} data-testid={`row-sector-${sector.id}`}>
                    <TableCell className="font-medium">{sector.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sector.description || "-"}
                    </TableCell>
                    <TableCell className="text-center">{sector.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={sector.active ? "default" : "secondary"}>
                        {sector.active ? "Attivo" : "Inattivo"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingSector(sector);
                              setIsDialogOpen(true);
                            }}
                            data-testid={`button-edit-sector-${sector.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-sector-${sector.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminare questo settore?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(sector.id)}>
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

function PositionsSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<CashPosition | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: positions = [], isLoading } = useQuery<CashPosition[]>({
    queryKey: ["/api/cash-positions"],
  });

  const { data: sectors = [] } = useQuery<CashSector[]>({
    queryKey: ["/api/cash-sectors"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-positions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-positions"] });
      setIsDialogOpen(false);
      toast({ title: "Postazione creata con successo" });
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
    const data = {
      name: formData.get("name") as string,
      eventId: formData.get("eventId") as string,
      sectorId: formData.get("sectorId") as string,
      operatorId: formData.get("operatorId") as string || null,
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

  const getEventName = (eventId: string) => {
    const e = events.find(x => x.id === eventId);
    return e?.name || "N/D";
  };

  const getStaffName = (operatorId: string | null) => {
    if (!operatorId) return "-";
    const s = staffList.find(x => x.id === operatorId);
    return s ? `${s.firstName} ${s.lastName}` : "N/D";
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
              <LayoutGrid className="h-5 w-5" />
              Postazioni Cassa
            </CardTitle>
            <CardDescription>
              Postazioni cassa per evento (Bar 1, Biglietteria, VIP Bar, ecc.)
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
                    <Label htmlFor="eventId">Evento *</Label>
                    <Select name="eventId" defaultValue={editingPosition?.eventId || ""}>
                      <SelectTrigger data-testid="select-position-event">
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
                    <Select name="operatorId" defaultValue={editingPosition?.operatorId || ""}>
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
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca postazioni..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-positions"
            />
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessuna postazione registrata"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Settore</TableHead>
                  <TableHead>Operatore</TableHead>
                  {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow key={pos.id} data-testid={`row-position-${pos.id}`}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {getEventName(pos.eventId)}
                      </div>
                    </TableCell>
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

function EntriesSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: entries = [], isLoading } = useQuery<CashEntry[]>({
    queryKey: ["/api/cash-entries"],
  });

  const { data: positions = [] } = useQuery<CashPosition[]>({
    queryKey: ["/api/cash-positions"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-entries"] });
      setIsDialogOpen(false);
      toast({ title: "Incasso registrato con successo" });
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
    const position = positions.find(p => p.id === formData.get("positionId"));
    const data = {
      eventId: position?.eventId || "",
      positionId: formData.get("positionId") as string,
      entryType: formData.get("entryType") as string,
      productId: formData.get("productId") as string || null,
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

  const getEventName = (eventId: string) => {
    const e = events.find(x => x.id === eventId);
    return e?.name || "N/D";
  };

  const paymentMethodLabels: Record<string, { label: string; icon: typeof CreditCard }> = {
    cash: { label: "Contanti", icon: Banknote },
    card: { label: "Carta", icon: CreditCard },
    online: { label: "Online", icon: Landmark },
    credits: { label: "Crediti", icon: Wallet },
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
              <Receipt className="h-5 w-5" />
              Registrazioni Incassi
            </CardTitle>
            <CardDescription>
              Registrazione degli incassi per postazione
            </CardDescription>
          </div>
          {isAdmin && (
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
                        {positions.map((p) => (
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
                    <Select name="productId" defaultValue={editingEntry?.productId || ""}>
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
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca incassi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-entries"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessun incasso registrato"}
          </div>
        ) : (
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
                {entries.map((entry) => (
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
        )}

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Totale incassi:</span>
            <span className="text-lg font-bold">
              €{entries.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FundsSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<CashFund | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: funds = [], isLoading } = useQuery<CashFund[]>({
    queryKey: ["/api/cash-funds"],
  });

  const { data: positions = [] } = useQuery<CashPosition[]>({
    queryKey: ["/api/cash-positions"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-funds", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-funds"] });
      setIsDialogOpen(false);
      toast({ title: "Fondo registrato con successo" });
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
    const position = positions.find(p => p.id === formData.get("positionId"));
    const data = {
      eventId: position?.eventId || "",
      positionId: formData.get("positionId") as string,
      type: formData.get("type") as string,
      amount: formData.get("amount") as string,
      expectedAmount: formData.get("expectedAmount") as string || null,
      operatorId: formData.get("operatorId") as string || null,
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
    return <div className="text-center py-8">Caricamento...</div>;
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
          {isAdmin && (
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
                        {positions.map((p) => (
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
                    <Select name="operatorId" defaultValue={editingFund?.operatorId || ""}>
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
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca fondi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-funds"
            />
          </div>
        </div>

        {funds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessun fondo registrato"}
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
                {funds.map((fund) => (
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
