import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Star, Gift, Settings, Plus, Trash2, Edit, 
  Award, TrendingUp, Coins
} from "lucide-react";

interface LoyaltyProgram {
  id: string;
  companyId: string;
  name: string;
  pointsPerEuro: string;
  isActive: boolean;
  createdAt: string | null;
}

interface LoyaltyTier {
  id: string;
  programId: string;
  name: string;
  minPoints: number;
  discountPercent: string | null;
  benefits: string | null;
  color: string | null;
  sortOrder: number | null;
}

interface LoyaltyReward {
  id: string;
  programId: string;
  name: string;
  description: string | null;
  pointsCost: number;
  type: string;
  value: string | null;
  imageUrl: string | null;
  availableQuantity: number | null;
  isActive: boolean;
  createdAt: string | null;
}

interface LoyaltyStats {
  totalCustomers: number;
  totalPoints: number;
  lifetimePoints: number;
  totalRedeemed: number;
  tierDistribution: {
    tierId: string;
    tierName: string;
    tierColor: string | null;
    customerCount: number;
  }[];
}

interface LoyaltyCustomer {
  customerId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  totalPoints: number;
  lifetimePoints: number;
  tierId: string | null;
  tierName: string | null;
  tierColor: string | null;
}

export default function LoyaltyAdminPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);

  const [programForm, setProgramForm] = useState({
    name: "Programma Fedeltà",
    pointsPerEuro: "1",
  });

  const [tierForm, setTierForm] = useState({
    name: "",
    minPoints: 0,
    discountPercent: "0",
    benefits: "",
    color: "#CD7F32",
  });

  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    pointsCost: 100,
    type: "discount",
    value: "",
    availableQuantity: null as number | null,
  });

  const { data: program, isLoading: loadingProgram } = useQuery<LoyaltyProgram | null>({
    queryKey: ["/api/loyalty/program"],
  });

  const { data: stats } = useQuery<LoyaltyStats>({
    queryKey: ["/api/loyalty/stats"],
  });

  const { data: tiers = [] } = useQuery<LoyaltyTier[]>({
    queryKey: ["/api/loyalty/tiers"],
  });

  const { data: rewards = [] } = useQuery<LoyaltyReward[]>({
    queryKey: ["/api/loyalty/rewards"],
  });

  const { data: customers = [] } = useQuery<LoyaltyCustomer[]>({
    queryKey: ["/api/loyalty/customers"],
  });

  const saveProgramMutation = useMutation({
    mutationFn: (data: typeof programForm) =>
      apiRequest("/api/loyalty/program", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      toast({ title: "Programma salvato con successo" });
    },
    onError: () => {
      toast({ title: "Errore nel salvataggio", variant: "destructive" });
    },
  });

  const toggleProgramMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/loyalty/program/toggle", { method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      toast({ title: "Stato programma aggiornato" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    },
  });

  const createTierMutation = useMutation({
    mutationFn: (data: typeof tierForm) =>
      apiRequest("/api/loyalty/tiers", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/tiers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/stats"] });
      setShowTierDialog(false);
      resetTierForm();
      toast({ title: "Livello creato con successo" });
    },
    onError: () => {
      toast({ title: "Errore nella creazione", variant: "destructive" });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof tierForm }) =>
      apiRequest(`/api/loyalty/tiers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/tiers"] });
      setShowTierDialog(false);
      setEditingTier(null);
      resetTierForm();
      toast({ title: "Livello aggiornato" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    },
  });

  const deleteTierMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/loyalty/tiers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/tiers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/stats"] });
      toast({ title: "Livello eliminato" });
    },
    onError: () => {
      toast({ title: "Errore nell'eliminazione", variant: "destructive" });
    },
  });

  const createRewardMutation = useMutation({
    mutationFn: (data: typeof rewardForm) =>
      apiRequest("/api/loyalty/rewards", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/rewards"] });
      setShowRewardDialog(false);
      resetRewardForm();
      toast({ title: "Premio creato con successo" });
    },
    onError: () => {
      toast({ title: "Errore nella creazione", variant: "destructive" });
    },
  });

  const updateRewardMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof rewardForm }) =>
      apiRequest(`/api/loyalty/rewards/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/rewards"] });
      setShowRewardDialog(false);
      setEditingReward(null);
      resetRewardForm();
      toast({ title: "Premio aggiornato" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    },
  });

  const deleteRewardMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/loyalty/rewards/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/rewards"] });
      toast({ title: "Premio eliminato" });
    },
    onError: () => {
      toast({ title: "Errore nell'eliminazione", variant: "destructive" });
    },
  });

  const resetTierForm = () => {
    setTierForm({
      name: "",
      minPoints: 0,
      discountPercent: "0",
      benefits: "",
      color: "#CD7F32",
    });
  };

  const resetRewardForm = () => {
    setRewardForm({
      name: "",
      description: "",
      pointsCost: 100,
      type: "discount",
      value: "",
      availableQuantity: null,
    });
  };

  const handleEditTier = (tier: LoyaltyTier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      minPoints: tier.minPoints,
      discountPercent: tier.discountPercent || "0",
      benefits: tier.benefits || "",
      color: tier.color || "#CD7F32",
    });
    setShowTierDialog(true);
  };

  const handleEditReward = (reward: LoyaltyReward) => {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name,
      description: reward.description || "",
      pointsCost: reward.pointsCost,
      type: reward.type,
      value: reward.value || "",
      availableQuantity: reward.availableQuantity,
    });
    setShowRewardDialog(true);
  };

  const handleSaveTier = () => {
    if (editingTier) {
      updateTierMutation.mutate({ id: editingTier.id, data: tierForm });
    } else {
      createTierMutation.mutate(tierForm);
    }
  };

  const handleSaveReward = () => {
    if (editingReward) {
      updateRewardMutation.mutate({ id: editingReward.id, data: rewardForm });
    } else {
      createRewardMutation.mutate(rewardForm);
    }
  };

  if (loadingProgram) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="loyalty-admin-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Programma Fedeltà</h1>
          <p className="text-muted-foreground">Gestisci il programma fedeltà per i tuoi clienti</p>
        </div>
        {program && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Programma attivo</span>
            <Switch
              checked={program.isActive}
              onCheckedChange={() => toggleProgramMutation.mutate()}
              data-testid="switch-program-active"
            />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-loyalty">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />
            Impostazioni
          </TabsTrigger>
          <TabsTrigger value="tiers" data-testid="tab-tiers">
            <Award className="h-4 w-4 mr-2" />
            Livelli
          </TabsTrigger>
          <TabsTrigger value="rewards" data-testid="tab-rewards">
            <Gift className="h-4 w-4 mr-2" />
            Premi
          </TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Users className="h-4 w-4 mr-2" />
            Clienti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6" data-testid="content-overview">
          <div className="grid gap-4 md:grid-cols-4">
            <Card data-testid="card-total-customers">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clienti Iscritti</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-customers">
                  {stats?.totalCustomers || 0}
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-total-points">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Punti Attivi</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-points">
                  {stats?.totalPoints?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-lifetime-points">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Punti Totali Emessi</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-lifetime-points">
                  {stats?.lifetimePoints?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-redeemed-points">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Punti Riscattati</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-redeemed-points">
                  {stats?.totalRedeemed?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {stats?.tierDistribution && stats.tierDistribution.length > 0 && (
            <Card data-testid="card-tier-distribution">
              <CardHeader>
                <CardTitle>Distribuzione per Livello</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.tierDistribution.map((tier) => (
                    <div key={tier.tierId} className="flex items-center gap-4" data-testid={`tier-dist-${tier.tierId}`}>
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: tier.tierColor || "#888" }}
                      />
                      <span className="flex-1 font-medium">{tier.tierName}</span>
                      <span className="text-muted-foreground">{tier.customerCount} clienti</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6" data-testid="content-settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurazione Programma</CardTitle>
              <CardDescription>Imposta i parametri base del programma fedeltà</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="programName">Nome Programma</Label>
                  <Input
                    id="programName"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                    placeholder="Es. Club VIP Rewards"
                    data-testid="input-program-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pointsPerEuro">Punti per Euro</Label>
                  <Input
                    id="pointsPerEuro"
                    type="number"
                    step="0.1"
                    value={programForm.pointsPerEuro}
                    onChange={(e) => setProgramForm({ ...programForm, pointsPerEuro: e.target.value })}
                    placeholder="1"
                    data-testid="input-points-per-euro"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ogni euro speso genera questo numero di punti
                  </p>
                </div>
              </div>
              <Button
                onClick={() => saveProgramMutation.mutate(programForm)}
                disabled={saveProgramMutation.isPending}
                data-testid="button-save-program"
              >
                {saveProgramMutation.isPending ? "Salvataggio..." : "Salva Impostazioni"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-6" data-testid="content-tiers">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Livelli VIP</h2>
              <p className="text-muted-foreground">Definisci i livelli con soglie e benefici</p>
            </div>
            <Button onClick={() => { resetTierForm(); setEditingTier(null); setShowTierDialog(true); }} data-testid="button-add-tier">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Livello
            </Button>
          </div>

          {tiers.length === 0 ? (
            <Card className="p-8 text-center" data-testid="empty-tiers">
              <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Nessun livello configurato</h3>
              <p className="text-muted-foreground mb-4">
                Crea livelli come Bronze, Silver, Gold per premiare i clienti più fedeli
              </p>
              <Button onClick={() => setShowTierDialog(true)} data-testid="button-create-first-tier">
                Crea primo livello
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tiers.map((tier) => (
                <Card key={tier.id} data-testid={`tier-card-${tier.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: tier.color || "#CD7F32" }}
                      />
                      <div>
                        <CardTitle className="text-lg">{tier.name}</CardTitle>
                        <CardDescription>{tier.minPoints.toLocaleString()} punti</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleEditTier(tier)}
                        data-testid={`button-edit-tier-${tier.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => deleteTierMutation.mutate(tier.id)}
                        data-testid={`button-delete-tier-${tier.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tier.discountPercent && parseFloat(tier.discountPercent) > 0 && (
                      <Badge variant="secondary" className="mb-2">
                        {tier.discountPercent}% sconto
                      </Badge>
                    )}
                    {tier.benefits && (
                      <p className="text-sm text-muted-foreground">{tier.benefits}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6" data-testid="content-rewards">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Catalogo Premi</h2>
              <p className="text-muted-foreground">Premi che i clienti possono riscattare con i punti</p>
            </div>
            <Button onClick={() => { resetRewardForm(); setEditingReward(null); setShowRewardDialog(true); }} data-testid="button-add-reward">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Premio
            </Button>
          </div>

          {rewards.length === 0 ? (
            <Card className="p-8 text-center" data-testid="empty-rewards">
              <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Nessun premio configurato</h3>
              <p className="text-muted-foreground mb-4">
                Crea premi come sconti, drink gratis, accesso VIP
              </p>
              <Button onClick={() => setShowRewardDialog(true)} data-testid="button-create-first-reward">
                Crea primo premio
              </Button>
            </Card>
          ) : (
            <Table data-testid="rewards-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Premio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Costo Punti</TableHead>
                  <TableHead>Valore</TableHead>
                  <TableHead>Disponibilità</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id} data-testid={`reward-row-${reward.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{reward.name}</div>
                        {reward.description && (
                          <div className="text-sm text-muted-foreground">{reward.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{reward.type}</Badge>
                    </TableCell>
                    <TableCell>{reward.pointsCost.toLocaleString()}</TableCell>
                    <TableCell>{reward.value || "-"}</TableCell>
                    <TableCell>
                      {reward.availableQuantity !== null ? reward.availableQuantity : "Illimitato"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reward.isActive ? "default" : "secondary"}>
                        {reward.isActive ? "Attivo" : "Disattivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleEditReward(reward)}
                          data-testid={`button-edit-reward-${reward.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => deleteRewardMutation.mutate(reward.id)}
                          data-testid={`button-delete-reward-${reward.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-6" data-testid="content-customers">
          <div>
            <h2 className="text-xl font-semibold">Clienti Fedeltà</h2>
            <p className="text-muted-foreground">Clienti iscritti al programma con punti e livello</p>
          </div>

          {customers.length === 0 ? (
            <Card className="p-8 text-center" data-testid="empty-customers">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Nessun cliente ancora</h3>
              <p className="text-muted-foreground">
                I clienti verranno aggiunti automaticamente al primo acquisto
              </p>
            </Card>
          ) : (
            <Table data-testid="customers-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Livello</TableHead>
                  <TableHead>Punti Disponibili</TableHead>
                  <TableHead>Punti Totali</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.customerId} data-testid={`customer-row-${customer.customerId}`}>
                    <TableCell className="font-medium">
                      {customer.firstName} {customer.lastName}
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>
                      {customer.tierName ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: customer.tierColor || "#888" }}
                          />
                          <span>{customer.tierName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{customer.totalPoints?.toLocaleString() || 0}</TableCell>
                    <TableCell>{customer.lifetimePoints?.toLocaleString() || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent data-testid="dialog-tier">
          <DialogHeader>
            <DialogTitle>{editingTier ? "Modifica Livello" : "Nuovo Livello"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tierName">Nome Livello</Label>
              <Input
                id="tierName"
                value={tierForm.name}
                onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                placeholder="Es. Gold"
                data-testid="input-tier-name"
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minPoints">Punti Minimi</Label>
                <Input
                  id="minPoints"
                  type="number"
                  value={tierForm.minPoints}
                  onChange={(e) => setTierForm({ ...tierForm, minPoints: parseInt(e.target.value) || 0 })}
                  data-testid="input-tier-min-points"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercent">Sconto %</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  step="0.5"
                  value={tierForm.discountPercent}
                  onChange={(e) => setTierForm({ ...tierForm, discountPercent: e.target.value })}
                  data-testid="input-tier-discount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tierColor">Colore</Label>
              <Input
                id="tierColor"
                type="color"
                value={tierForm.color}
                onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}
                className="h-10 w-20"
                data-testid="input-tier-color"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefits">Benefici</Label>
              <Textarea
                id="benefits"
                value={tierForm.benefits}
                onChange={(e) => setTierForm({ ...tierForm, benefits: e.target.value })}
                placeholder="Es. Accesso prioritario, drink omaggio..."
                data-testid="input-tier-benefits"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierDialog(false)} data-testid="button-cancel-tier">
              Annulla
            </Button>
            <Button 
              onClick={handleSaveTier}
              disabled={createTierMutation.isPending || updateTierMutation.isPending}
              data-testid="button-save-tier"
            >
              {(createTierMutation.isPending || updateTierMutation.isPending) ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
        <DialogContent data-testid="dialog-reward">
          <DialogHeader>
            <DialogTitle>{editingReward ? "Modifica Premio" : "Nuovo Premio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rewardName">Nome Premio</Label>
              <Input
                id="rewardName"
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="Es. Drink Gratis"
                data-testid="input-reward-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rewardDesc">Descrizione</Label>
              <Textarea
                id="rewardDesc"
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Descrizione del premio..."
                data-testid="input-reward-description"
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pointsCost">Costo in Punti</Label>
                <Input
                  id="pointsCost"
                  type="number"
                  value={rewardForm.pointsCost}
                  onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: parseInt(e.target.value) || 0 })}
                  data-testid="input-reward-cost"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rewardValue">Valore</Label>
                <Input
                  id="rewardValue"
                  value={rewardForm.value}
                  onChange={(e) => setRewardForm({ ...rewardForm, value: e.target.value })}
                  placeholder="Es. 10 (per 10€ sconto)"
                  data-testid="input-reward-value"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantità Disponibile (vuoto = illimitato)</Label>
              <Input
                id="quantity"
                type="number"
                value={rewardForm.availableQuantity ?? ""}
                onChange={(e) => setRewardForm({ ...rewardForm, availableQuantity: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Illimitato"
                data-testid="input-reward-quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRewardDialog(false)} data-testid="button-cancel-reward">
              Annulla
            </Button>
            <Button 
              onClick={handleSaveReward}
              disabled={createRewardMutation.isPending || updateRewardMutation.isPending}
              data-testid="button-save-reward"
            >
              {(createRewardMutation.isPending || updateRewardMutation.isPending) ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
