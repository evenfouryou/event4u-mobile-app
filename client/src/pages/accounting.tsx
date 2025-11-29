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
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { FixedCost, ExtraCost, Maintenance, AccountingDocument, Location, Event } from "@shared/schema";

export default function Accounting() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("fixed-costs");
  const isAdmin = user?.role === "super_admin" || user?.role === "gestore";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-accounting-title">
          Contabilità
        </h1>
        <p className="text-muted-foreground">
          Gestione costi fissi, extra, manutenzioni e documenti contabili
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
          <TabsTrigger value="fixed-costs" className="flex items-center gap-2 py-3" data-testid="tab-fixed-costs">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Costi Fissi</span>
            <span className="sm:hidden">Fissi</span>
          </TabsTrigger>
          <TabsTrigger value="extra-costs" className="flex items-center gap-2 py-3" data-testid="tab-extra-costs">
            <Euro className="h-4 w-4" />
            <span className="hidden sm:inline">Costi Extra</span>
            <span className="sm:hidden">Extra</span>
          </TabsTrigger>
          <TabsTrigger value="maintenances" className="flex items-center gap-2 py-3" data-testid="tab-maintenances">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Manutenzioni</span>
            <span className="sm:hidden">Manut.</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2 py-3" data-testid="tab-documents">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documenti</span>
            <span className="sm:hidden">Doc.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fixed-costs" className="mt-6">
          <FixedCostsSection isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="extra-costs" className="mt-6">
          <ExtraCostsSection isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="maintenances" className="mt-6">
          <MaintenancesSection isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsSection isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
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
      toast({ title: "Costo fisso creato con successo" });
    },
    onError: (err: any) => {
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
      toast({ title: "Costo fisso aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/fixed-costs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-costs"] });
      toast({ title: "Costo fisso eliminato" });
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
      category: formData.get("category") as string,
      amount: formData.get("amount") as string,
      frequency: formData.get("frequency") as string,
      locationId: formData.get("locationId") as string || null,
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
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Costi Fissi
            </CardTitle>
            <CardDescription>
              Costi ricorrenti legati alle location (affitto, utenze, ecc.)
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingCost(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-fixed-cost">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Costo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                      data-testid="input-fixed-cost-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria *</Label>
                      <Select name="category" defaultValue={editingCost?.category || "altro"}>
                        <SelectTrigger data-testid="select-fixed-cost-category">
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
                        data-testid="input-fixed-cost-amount"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequenza *</Label>
                      <Select name="frequency" defaultValue={editingCost?.frequency || "monthly"}>
                        <SelectTrigger data-testid="select-fixed-cost-frequency">
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
                      <Select name="locationId" defaultValue={editingCost?.locationId || ""}>
                        <SelectTrigger data-testid="select-fixed-cost-location">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="validFrom">Valido Da</Label>
                      <Input
                        id="validFrom"
                        name="validFrom"
                        type="date"
                        defaultValue={editingCost?.validFrom ? format(new Date(editingCost.validFrom), "yyyy-MM-dd") : ""}
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
                      data-testid="input-fixed-cost-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-fixed-cost">
                      {editingCost ? "Aggiorna" : "Crea"}
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
              placeholder="Cerca costi fissi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-fixed-costs"
            />
          </div>
        </div>

        {filteredCosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessun costo fisso registrato"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead>Frequenza</TableHead>
                  {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.map((cost) => (
                  <TableRow key={cost.id} data-testid={`row-fixed-cost-${cost.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cost.name}</div>
                        {cost.notes && (
                          <div className="text-sm text-muted-foreground line-clamp-1">{cost.notes}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryLabels[cost.category] || cost.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {getLocationName(cost.locationId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{parseFloat(cost.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {frequencyLabels[cost.frequency] || cost.frequency}
                      </Badge>
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
                            data-testid={`button-edit-fixed-cost-${cost.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-fixed-cost-${cost.id}`}>
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
        )}

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">
              Totale mensile stimato:
            </span>
            <span className="text-lg font-bold">
              €{filteredCosts.reduce((sum, cost) => {
                const amount = parseFloat(cost.amount);
                if (cost.frequency === "monthly") return sum + amount;
                if (cost.frequency === "quarterly") return sum + (amount / 3);
                if (cost.frequency === "yearly") return sum + (amount / 12);
                return sum;
              }, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
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
      toast({ title: "Costo extra creato con successo" });
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
      toast({ title: "Costo extra aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/extra-costs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-costs"] });
      toast({ title: "Costo extra eliminato" });
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
      category: formData.get("category") as string,
      amount: formData.get("amount") as string,
      eventId: formData.get("eventId") as string || null,
      invoiceNumber: formData.get("invoiceNumber") as string || null,
      invoiceDate: formData.get("invoiceDate") as string || null,
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
    if (!eventId) return "Non associato";
    const event = events.find(e => e.id === eventId);
    return event?.name || "N/D";
  };

  const categoryLabels: Record<string, string> = {
    personale: "Personale",
    service: "Service",
    noleggi: "Noleggi",
    acquisti: "Acquisti",
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
              <Euro className="h-5 w-5" />
              Costi Extra
            </CardTitle>
            <CardDescription>
              Costi una tantum legati ad eventi specifici
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingCost(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-extra-cost">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Costo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                      placeholder="es. Noleggio tavoli"
                      required
                      data-testid="input-extra-cost-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria *</Label>
                      <Select name="category" defaultValue={editingCost?.category || "altro"}>
                        <SelectTrigger data-testid="select-extra-cost-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personale">Personale</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="noleggi">Noleggi</SelectItem>
                          <SelectItem value="acquisti">Acquisti</SelectItem>
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
                        data-testid="input-extra-cost-amount"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventId">Evento</Label>
                    <Select name="eventId" defaultValue={editingCost?.eventId || ""}>
                      <SelectTrigger data-testid="select-extra-cost-event">
                        <SelectValue placeholder="Seleziona evento (opzionale)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Non associato</SelectItem>
                        {events.map((evt) => (
                          <SelectItem key={evt.id} value={evt.id}>{evt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNumber">N. Fattura</Label>
                      <Input
                        id="invoiceNumber"
                        name="invoiceNumber"
                        defaultValue={editingCost?.invoiceNumber || ""}
                        placeholder="FT-001"
                        data-testid="input-extra-cost-invoice-number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceDate">Data Fattura</Label>
                      <Input
                        id="invoiceDate"
                        name="invoiceDate"
                        type="date"
                        defaultValue={editingCost?.invoiceDate ? format(new Date(editingCost.invoiceDate), "yyyy-MM-dd") : ""}
                        data-testid="input-extra-cost-invoice-date"
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
                      data-testid="input-extra-cost-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-extra-cost">
                      {editingCost ? "Aggiorna" : "Crea"}
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
              placeholder="Cerca costi extra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-extra-costs"
            />
          </div>
        </div>

        {filteredCosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessun costo extra registrato"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead>Fattura</TableHead>
                  {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.map((cost) => (
                  <TableRow key={cost.id} data-testid={`row-extra-cost-${cost.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cost.name}</div>
                        {cost.notes && (
                          <div className="text-sm text-muted-foreground line-clamp-1">{cost.notes}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {getEventName(cost.eventId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryLabels[cost.category] || cost.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{parseFloat(cost.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {cost.invoiceNumber ? (
                        <span className="text-sm">{cost.invoiceNumber}</span>
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
                              setEditingCost(cost);
                              setIsDialogOpen(true);
                            }}
                            data-testid={`button-edit-extra-cost-${cost.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-extra-cost-${cost.id}`}>
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
        )}

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Totale costi extra:</span>
            <span className="text-lg font-bold">
              €{filteredCosts.reduce((sum, cost) => sum + parseFloat(cost.amount), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
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
      toast({ title: "Manutenzione creata con successo" });
    },
    onError: (err: any) => {
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
      toast({ title: "Manutenzione aggiornata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/maintenances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      toast({ title: "Manutenzione eliminata" });
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
      type: formData.get("type") as string,
      status: formData.get("status") as string,
      locationId: formData.get("locationId") as string || null,
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
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "In attesa", variant: "secondary" },
    scheduled: { label: "Programmata", variant: "outline" },
    completed: { label: "Completata", variant: "default" },
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
              <Wrench className="h-5 w-5" />
              Manutenzioni
            </CardTitle>
            <CardDescription>
              Gestione interventi di manutenzione ordinaria e straordinaria
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingMaintenance(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-maintenance">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Manutenzione
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                      placeholder="es. Riparazione impianto elettrico"
                      required
                      data-testid="input-maintenance-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrizione</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingMaintenance?.description || ""}
                      placeholder="Descrizione dell'intervento"
                      data-testid="input-maintenance-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo *</Label>
                      <Select name="type" defaultValue={editingMaintenance?.type || "ordinaria"}>
                        <SelectTrigger data-testid="select-maintenance-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ordinaria">Ordinaria</SelectItem>
                          <SelectItem value="straordinaria">Straordinaria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Stato *</Label>
                      <Select name="status" defaultValue={editingMaintenance?.status || "pending"}>
                        <SelectTrigger data-testid="select-maintenance-status">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="locationId">Location</Label>
                      <Select name="locationId" defaultValue={editingMaintenance?.locationId || ""}>
                        <SelectTrigger data-testid="select-maintenance-location">
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
                        data-testid="input-maintenance-amount"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Data Prevista</Label>
                      <Input
                        id="scheduledDate"
                        name="scheduledDate"
                        type="date"
                        defaultValue={editingMaintenance?.scheduledDate ? format(new Date(editingMaintenance.scheduledDate), "yyyy-MM-dd") : ""}
                        data-testid="input-maintenance-scheduled-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="completedDate">Data Completamento</Label>
                      <Input
                        id="completedDate"
                        name="completedDate"
                        type="date"
                        defaultValue={editingMaintenance?.completedDate ? format(new Date(editingMaintenance.completedDate), "yyyy-MM-dd") : ""}
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
                      data-testid="input-maintenance-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-maintenance">
                      {editingMaintenance ? "Aggiorna" : "Crea"}
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
              placeholder="Cerca manutenzioni..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-maintenances"
            />
          </div>
        </div>

        {filteredMaintenances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessuna manutenzione registrata"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaintenances.map((maintenance) => (
                  <TableRow key={maintenance.id} data-testid={`row-maintenance-${maintenance.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{maintenance.name}</div>
                        {maintenance.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">{maintenance.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {getLocationName(maintenance.locationId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[maintenance.type] || maintenance.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[maintenance.status]?.variant || "secondary"}>
                        {statusLabels[maintenance.status]?.label || maintenance.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {maintenance.amount ? (
                        <span className="font-medium">€{parseFloat(maintenance.amount).toFixed(2)}</span>
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
                              setEditingMaintenance(maintenance);
                              setIsDialogOpen(true);
                            }}
                            data-testid={`button-edit-maintenance-${maintenance.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-maintenance-${maintenance.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminare questa manutenzione?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(maintenance.id)}>
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

function DocumentsSection({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<AccountingDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: documents = [], isLoading } = useQuery<AccountingDocument[]>({
    queryKey: ["/api/accounting-documents"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/accounting-documents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting-documents"] });
      setIsDialogOpen(false);
      toast({ title: "Documento creato con successo" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/accounting-documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting-documents"] });
      setEditingDoc(null);
      setIsDialogOpen(false);
      toast({ title: "Documento aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/accounting-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting-documents"] });
      toast({ title: "Documento eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get("type") as string,
      documentNumber: formData.get("documentNumber") as string || null,
      amount: formData.get("amount") as string || null,
      eventId: formData.get("eventId") as string || null,
      issueDate: formData.get("issueDate") as string || null,
      dueDate: formData.get("dueDate") as string || null,
      status: formData.get("status") as string,
      notes: formData.get("notes") as string || null,
    };

    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredDocs = documents.filter(doc =>
    (doc.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.notes?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getEventName = (eventId: string | null) => {
    if (!eventId) return "Non associato";
    const event = events.find(e => e.id === eventId);
    return event?.name || "N/D";
  };

  const typeLabels: Record<string, string> = {
    fattura: "Fattura",
    preventivo: "Preventivo",
    ricevuta: "Ricevuta",
    contratto: "Contratto",
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "In attesa", variant: "secondary" },
    paid: { label: "Pagato", variant: "default" },
    cancelled: { label: "Annullato", variant: "destructive" },
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
              <FileText className="h-5 w-5" />
              Documenti Contabili
            </CardTitle>
            <CardDescription>
              Fatture, ricevute, preventivi e altri documenti
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingDoc(null);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-document">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Documento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingDoc ? "Modifica Documento" : "Nuovo Documento"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo *</Label>
                      <Select name="type" defaultValue={editingDoc?.type || "fattura"}>
                        <SelectTrigger data-testid="select-document-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fattura">Fattura</SelectItem>
                          <SelectItem value="preventivo">Preventivo</SelectItem>
                          <SelectItem value="ricevuta">Ricevuta</SelectItem>
                          <SelectItem value="contratto">Contratto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="documentNumber">Numero</Label>
                      <Input
                        id="documentNumber"
                        name="documentNumber"
                        defaultValue={editingDoc?.documentNumber || ""}
                        placeholder="es. FT-2024-001"
                        data-testid="input-document-number"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Importo (€)</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        defaultValue={editingDoc?.amount || ""}
                        placeholder="0.00"
                        data-testid="input-document-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Stato *</Label>
                      <Select name="status" defaultValue={editingDoc?.status || "pending"}>
                        <SelectTrigger data-testid="select-document-status">
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
                  <div className="space-y-2">
                    <Label htmlFor="eventId">Evento</Label>
                    <Select name="eventId" defaultValue={editingDoc?.eventId || ""}>
                      <SelectTrigger data-testid="select-document-event">
                        <SelectValue placeholder="Seleziona evento (opzionale)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Non associato</SelectItem>
                        {events.map((evt) => (
                          <SelectItem key={evt.id} value={evt.id}>{evt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issueDate">Data Emissione</Label>
                      <Input
                        id="issueDate"
                        name="issueDate"
                        type="date"
                        defaultValue={editingDoc?.issueDate ? format(new Date(editingDoc.issueDate), "yyyy-MM-dd") : ""}
                        data-testid="input-document-issue-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Data Scadenza</Label>
                      <Input
                        id="dueDate"
                        name="dueDate"
                        type="date"
                        defaultValue={editingDoc?.dueDate ? format(new Date(editingDoc.dueDate), "yyyy-MM-dd") : ""}
                        data-testid="input-document-due-date"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingDoc?.notes || ""}
                      placeholder="Note aggiuntive"
                      data-testid="input-document-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-document">
                      {editingDoc ? "Aggiorna" : "Crea"}
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
              placeholder="Cerca documenti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-documents"
            />
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nessun risultato trovato" : "Nessun documento registrato"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Numero</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Scadenza</TableHead>
                  {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => (
                  <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[doc.type] || doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{doc.documentNumber || "-"}</div>
                        {doc.notes && (
                          <div className="text-sm text-muted-foreground line-clamp-1">{doc.notes}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {getEventName(doc.eventId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {doc.amount ? `€${parseFloat(doc.amount).toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[doc.status]?.variant || "secondary"}>
                        {statusLabels[doc.status]?.label || doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.dueDate && (
                        <span className={`text-sm ${new Date(doc.dueDate) < new Date() && doc.status !== 'paid' ? 'text-destructive' : ''}`}>
                          {format(new Date(doc.dueDate), "dd/MM/yyyy", { locale: it })}
                        </span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingDoc(doc);
                              setIsDialogOpen(true);
                            }}
                            data-testid={`button-edit-document-${doc.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-document-${doc.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminare questo documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(doc.id)}>
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
