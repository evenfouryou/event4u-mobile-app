import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Pencil, Trash2, Gift, Users, Ticket, ShoppingBag, TrendingUp, Euro, Calendar } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { ProductBundle, ProductBundleItem, BundlePurchase } from "@shared/schema";

type BundleWithItems = ProductBundle & { items?: ProductBundleItem[] };

export default function BundlesAdminPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<BundleWithItems | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "ticket_drink" as string,
    basePrice: "",
    originalPrice: "",
    minGroupSize: "1",
    maxGroupSize: "",
    validFrom: "",
    validTo: "",
    availableQuantity: "",
  });

  const { data: bundles = [], isLoading } = useQuery<BundleWithItems[]>({
    queryKey: ["/api/bundles"],
  });

  const { data: stats } = useQuery<{
    totalBundles: number;
    activeBundles: number;
    totalSales: number;
    totalRevenue: number;
  }>({
    queryKey: ["/api/bundles/stats"],
  });

  const { data: purchases = [] } = useQuery<BundlePurchase[]>({
    queryKey: ["/api/bundles/purchases"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bundles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bundles/stats"] });
      toast({ title: "Bundle creato con successo" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Errore nella creazione", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/bundles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles"] });
      toast({ title: "Bundle aggiornato" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/bundles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bundles/stats"] });
      toast({ title: "Bundle eliminato" });
    },
    onError: () => {
      toast({ title: "Errore nell'eliminazione", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "ticket_drink",
      basePrice: "",
      originalPrice: "",
      minGroupSize: "1",
      maxGroupSize: "",
      validFrom: "",
      validTo: "",
      availableQuantity: "",
    });
    setEditingBundle(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (bundle: BundleWithItems) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name,
      description: bundle.description || "",
      type: bundle.type,
      basePrice: bundle.basePrice,
      originalPrice: bundle.originalPrice || "",
      minGroupSize: bundle.minGroupSize?.toString() || "1",
      maxGroupSize: bundle.maxGroupSize?.toString() || "",
      validFrom: bundle.validFrom ? format(new Date(bundle.validFrom), "yyyy-MM-dd") : "",
      validTo: bundle.validTo ? format(new Date(bundle.validTo), "yyyy-MM-dd") : "",
      availableQuantity: bundle.availableQuantity?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      description: formData.description || null,
      type: formData.type,
      basePrice: parseFloat(formData.basePrice),
      originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
      minGroupSize: parseInt(formData.minGroupSize) || 1,
      maxGroupSize: formData.maxGroupSize ? parseInt(formData.maxGroupSize) : null,
      validFrom: formData.validFrom || null,
      validTo: formData.validTo || null,
      availableQuantity: formData.availableQuantity ? parseInt(formData.availableQuantity) : null,
    };

    if (editingBundle) {
      updateMutation.mutate({ id: editingBundle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getBundleTypeLabel = (type: string) => {
    switch (type) {
      case "ticket_drink": return "Biglietto + Drink";
      case "group_discount": return "Sconto Gruppo";
      case "vip_table": return "Tavolo VIP";
      default: return type;
    }
  };

  const getBundleTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "ticket_drink": return "default";
      case "group_discount": return "secondary";
      case "vip_table": return "outline";
      default: return "default";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Gestione Bundle
          </h1>
          <p className="text-muted-foreground">Crea pacchetti e offerte speciali per i tuoi eventi</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-bundle" onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Bundle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBundle ? "Modifica Bundle" : "Nuovo Bundle"}</DialogTitle>
              <DialogDescription>
                {editingBundle ? "Modifica i dettagli del bundle" : "Crea un nuovo pacchetto o offerta"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    data-testid="input-bundle-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="es. Ingresso + 2 Drink"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger data-testid="select-bundle-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ticket_drink">Biglietto + Drink</SelectItem>
                      <SelectItem value="group_discount">Sconto Gruppo</SelectItem>
                      <SelectItem value="vip_table">Tavolo VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea
                  data-testid="input-bundle-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrivi il contenuto del bundle"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prezzo Bundle (€)</Label>
                  <Input
                    data-testid="input-bundle-price"
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    placeholder="25.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prezzo Originale (€)</Label>
                  <Input
                    data-testid="input-bundle-original-price"
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    placeholder="35.00"
                  />
                </div>
              </div>

              {formData.type === "group_discount" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min. Persone</Label>
                    <Input
                      data-testid="input-min-group"
                      type="number"
                      value={formData.minGroupSize}
                      onChange={(e) => setFormData({ ...formData, minGroupSize: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max. Persone</Label>
                    <Input
                      data-testid="input-max-group"
                      type="number"
                      value={formData.maxGroupSize}
                      onChange={(e) => setFormData({ ...formData, maxGroupSize: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valido dal</Label>
                  <Input
                    data-testid="input-valid-from"
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valido fino al</Label>
                  <Input
                    data-testid="input-valid-to"
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quantità disponibile (lascia vuoto per illimitato)</Label>
                <Input
                  data-testid="input-quantity"
                  type="number"
                  value={formData.availableQuantity}
                  onChange={(e) => setFormData({ ...formData, availableQuantity: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>Annulla</Button>
              <Button
                data-testid="button-save-bundle"
                onClick={handleSubmit}
                disabled={!formData.name || !formData.basePrice || createMutation.isPending || updateMutation.isPending}
              >
                {editingBundle ? "Salva Modifiche" : "Crea Bundle"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Panoramica</TabsTrigger>
          <TabsTrigger value="bundles" data-testid="tab-bundles">Bundle</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales">Vendite</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Bundle Totali</CardDescription>
                <CardTitle className="text-2xl" data-testid="stat-total-bundles">
                  {stats?.totalBundles || bundles.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Bundle Attivi</CardDescription>
                <CardTitle className="text-2xl" data-testid="stat-active-bundles">
                  {stats?.activeBundles || bundles.filter(b => b.isActive).length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Gift className="h-4 w-4 text-green-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Vendite Totali</CardDescription>
                <CardTitle className="text-2xl" data-testid="stat-total-sales">
                  {stats?.totalSales || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ShoppingBag className="h-4 w-4 text-blue-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Ricavo Bundle</CardDescription>
                <CardTitle className="text-2xl" data-testid="stat-revenue">
                  €{(stats?.totalRevenue || 0).toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bundles" className="space-y-4">
          {bundles.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nessun bundle</h3>
              <p className="text-muted-foreground mb-4">Crea il tuo primo bundle per iniziare</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crea Bundle
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bundles.map((bundle) => (
                <Card key={bundle.id} data-testid={`card-bundle-${bundle.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          {bundle.type === "vip_table" ? (
                            <Users className="h-6 w-6 text-primary" />
                          ) : bundle.type === "group_discount" ? (
                            <Users className="h-6 w-6 text-primary" />
                          ) : (
                            <Ticket className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{bundle.name}</h3>
                          <p className="text-sm text-muted-foreground">{bundle.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getBundleTypeBadgeVariant(bundle.type) as any}>
                              {getBundleTypeLabel(bundle.type)}
                            </Badge>
                            {!bundle.isActive && <Badge variant="outline">Disattivo</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg">€{parseFloat(bundle.basePrice).toFixed(2)}</div>
                          {bundle.originalPrice && (
                            <div className="text-sm text-muted-foreground line-through">
                              €{parseFloat(bundle.originalPrice).toFixed(2)}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Venduti: {bundle.soldCount || 0}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(bundle)}
                            data-testid={`button-edit-bundle-${bundle.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteMutation.mutate(bundle.id)}
                            data-testid={`button-delete-bundle-${bundle.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Storico Vendite</CardTitle>
              <CardDescription>Tutte le vendite di bundle</CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessuna vendita registrata
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Bundle</TableHead>
                      <TableHead>Quantità</TableHead>
                      <TableHead>Importo</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id} data-testid={`row-purchase-${purchase.id}`}>
                        <TableCell>
                          {purchase.createdAt && format(new Date(purchase.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                        </TableCell>
                        <TableCell>{purchase.bundleId}</TableCell>
                        <TableCell>{purchase.groupSize || 1}</TableCell>
                        <TableCell>€{parseFloat(purchase.totalPrice).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={purchase.status === "completed" ? "default" : "secondary"}>
                            {purchase.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
