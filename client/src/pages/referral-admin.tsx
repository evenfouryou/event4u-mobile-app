import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Gift, Settings, TrendingUp, Share2, Award, Percent, Coins
} from "lucide-react";

interface ReferralSettings {
  id: string;
  companyId: string;
  isActive: boolean;
  referrerRewardPoints: number;
  referredDiscountPercent: string;
  minPurchaseAmount: string | null;
  createdAt: string | null;
}

interface ReferralStats {
  totalReferrals: number;
  conversions: number;
  conversionRate: number;
  totalCodes: number;
}

interface LeaderboardEntry {
  customerId: string;
  code: string;
  usageCount: number;
  totalEarnings: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export default function ReferralAdminPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const [settingsForm, setSettingsForm] = useState({
    referrerRewardPoints: 100,
    referredDiscountPercent: "10",
    minPurchaseAmount: "0",
    isActive: true,
  });

  const { data: settings, isLoading: loadingSettings } = useQuery<ReferralSettings | null>({
    queryKey: ["/api/referral/settings"],
  });

  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["/api/referral/stats"],
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/referral/leaderboard"],
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (data: typeof settingsForm) =>
      apiRequest("/api/referral/settings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/settings"] });
      toast({ title: "Impostazioni salvate con successo" });
    },
    onError: () => {
      toast({ title: "Errore nel salvataggio", variant: "destructive" });
    },
  });

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settingsForm);
  };

  useState(() => {
    if (settings) {
      setSettingsForm({
        referrerRewardPoints: settings.referrerRewardPoints,
        referredDiscountPercent: settings.referredDiscountPercent,
        minPurchaseAmount: settings.minPurchaseAmount || "0",
        isActive: settings.isActive,
      });
    }
  });

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Programma Referral</h1>
          <p className="text-muted-foreground">Gestisci il programma di invito amici</p>
        </div>
        <Badge variant={settings?.isActive ? "default" : "secondary"} data-testid="badge-program-status">
          {settings?.isActive ? "Attivo" : "Disattivato"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-referrals">{stats?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground">Inviti effettuati</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversioni</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversions">{stats?.conversions || 0}</div>
            <p className="text-xs text-muted-foreground">Acquisti completati</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasso Conversione</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversion-rate">{stats?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Referral convertiti</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Codici Attivi</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-codes">{stats?.totalCodes || 0}</div>
            <p className="text-xs text-muted-foreground">Clienti con codice</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />
            Impostazioni
          </TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
            <Award className="h-4 w-4 mr-2" />
            Classifica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Come Funziona</CardTitle>
              <CardDescription>Il programma referral permette ai clienti di invitare amici</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Share2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">1. Condividi</h4>
                    <p className="text-sm text-muted-foreground">Il cliente condivide il suo codice unico con gli amici</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">2. Sconto</h4>
                    <p className="text-sm text-muted-foreground">L'amico riceve uno sconto sul primo acquisto</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">3. Punti</h4>
                    <p className="text-sm text-muted-foreground">Quando l'amico acquista, il referrer riceve punti fedeltà</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Programma</CardTitle>
              <CardDescription>Configura i premi e gli sconti del programma referral</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is-active">Programma Attivo</Label>
                  <p className="text-sm text-muted-foreground">Abilita o disabilita il programma referral</p>
                </div>
                <Switch
                  id="is-active"
                  checked={settingsForm.isActive}
                  onCheckedChange={(checked) => setSettingsForm(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-is-active"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="referrer-points">Punti per il Referrer</Label>
                  <Input
                    id="referrer-points"
                    type="number"
                    min="0"
                    value={settingsForm.referrerRewardPoints}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, referrerRewardPoints: parseInt(e.target.value) || 0 }))}
                    data-testid="input-referrer-points"
                  />
                  <p className="text-sm text-muted-foreground">Punti fedeltà accreditati quando l'invitato effettua il primo acquisto</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referred-discount">Sconto per l'Invitato (%)</Label>
                  <Input
                    id="referred-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={settingsForm.referredDiscountPercent}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, referredDiscountPercent: e.target.value }))}
                    data-testid="input-referred-discount"
                  />
                  <p className="text-sm text-muted-foreground">Sconto percentuale sul primo acquisto dell'invitato</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-purchase">Importo Minimo Acquisto (€)</Label>
                  <Input
                    id="min-purchase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={settingsForm.minPurchaseAmount}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, minPurchaseAmount: e.target.value }))}
                    data-testid="input-min-purchase"
                  />
                  <p className="text-sm text-muted-foreground">Importo minimo per attivare la conversione (0 = nessun minimo)</p>
                </div>
              </div>

              <Button 
                onClick={handleSaveSettings} 
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {saveSettingsMutation.isPending ? "Salvataggio..." : "Salva Impostazioni"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Referrer</CardTitle>
              <CardDescription>I clienti che hanno invitato più amici</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun referral ancora registrato</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Codice</TableHead>
                      <TableHead className="text-right">Inviti</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry, index) => (
                      <TableRow key={entry.customerId} data-testid={`row-leaderboard-${index}`}>
                        <TableCell>
                          {index < 3 ? (
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                              index === 1 ? "bg-gray-400/20 text-gray-400" :
                              "bg-amber-600/20 text-amber-600"
                            }`}>
                              {index + 1}
                            </div>
                          ) : (
                            <span className="pl-2">{index + 1}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {entry.firstName || ""} {entry.lastName || ""}
                            </div>
                            <div className="text-sm text-muted-foreground">{entry.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.code}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.usageCount}
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
