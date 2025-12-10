import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Calendar, TrendingUp, Package, Settings, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type AnalyticsData = {
  companyMetrics: Array<{
    companyId: string;
    companyName: string;
    eventCount: number;
    totalRevenue: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalConsumed: number;
  }>;
  eventStatistics: {
    total: number;
    active: number;
    completed: number;
  };
};

type SystemSetting = {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/super-admin/analytics'],
  });

  const { data: systemSettings } = useQuery<SystemSetting[]>({
    queryKey: ['/api/system-settings'],
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest('PUT', `/api/system-settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
      toast({
        title: "Impostazione aggiornata",
        description: "L'impostazione è stata salvata correttamente.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'impostazione.",
        variant: "destructive",
      });
    },
  });

  const registrationEnabled = systemSettings?.find(s => s.key === 'registration_enabled')?.value !== 'false';

  const handleRegistrationToggle = (enabled: boolean) => {
    updateSettingMutation.mutate({
      key: 'registration_enabled',
      value: enabled ? 'true' : 'false',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Caricamento analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Nessun dato disponibile</p>
      </div>
    );
  }

  const totalCompanies = analytics.companyMetrics.length;
  const totalRevenue = analytics.companyMetrics.reduce((sum, c) => sum + c.totalRevenue, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">Dashboard Super Admin</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Panoramica completa delle metriche cross-company
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Aziende</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-semibold" data-testid="text-total-companies">
              {totalCompanies}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Eventi</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-semibold" data-testid="text-total-events">
              {analytics.eventStatistics.total}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              {analytics.eventStatistics.active} attivi
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Ricavi</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-semibold" data-testid="text-total-revenue">
              €{totalRevenue.toFixed(0)}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Top Prodotti</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-semibold" data-testid="text-top-products-count">
              {analytics.topProducts.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Settings Section */}
      <Card className="glass-card">
        <CardHeader className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-sm md:text-base">Impostazioni di Sistema</CardTitle>
          </div>
          <CardDescription className="text-xs md:text-sm">
            Gestisci le impostazioni globali della piattaforma
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0 space-y-4">
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <UserPlus className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="registration-toggle" className="text-sm font-medium">
                  Registrazione Nuovi Organizzatori
                </Label>
                <p className="text-xs text-muted-foreground">
                  {registrationEnabled 
                    ? "La registrazione è attiva. Nuovi organizzatori possono registrarsi."
                    : "La registrazione è disabilitata. I nuovi organizzatori non possono registrarsi."}
                </p>
              </div>
            </div>
            <Switch
              id="registration-toggle"
              checked={registrationEnabled}
              onCheckedChange={handleRegistrationToggle}
              disabled={updateSettingMutation.isPending}
              data-testid="switch-registration-enabled"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="glass-card">
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-sm md:text-base">Ricavi per Azienda</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <ResponsiveContainer width="100%" height={200} className="md:h-[300px]">
              <BarChart data={analytics.companyMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="companyName" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" name="Ricavi (€)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-sm md:text-base">Eventi per Azienda</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <ResponsiveContainer width="100%" height={200} className="md:h-[300px]">
              <BarChart data={analytics.companyMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="companyName" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="eventCount" fill="hsl(var(--accent))" name="N° Eventi" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="p-3 md:p-4">
          <CardTitle className="text-sm md:text-base">Top Prodotti per Consumo</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          <ResponsiveContainer width="100%" height={250} className="md:h-[400px]">
            <BarChart data={analytics.topProducts} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="productName" type="category" width={80} tick={{ fontSize: 9 }} className="md:w-[150px]" />
              <Tooltip />
              <Bar dataKey="totalConsumed" fill="hsl(var(--chart-2))" name="Quantità" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="glass-card">
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-sm md:text-base">Distribuzione Stati Eventi</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <ResponsiveContainer width="100%" height={200} className="md:h-[300px]">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pianificato', value: analytics.eventStatistics.total - analytics.eventStatistics.active - analytics.eventStatistics.completed },
                    { name: 'Attivo', value: analytics.eventStatistics.active },
                    { name: 'Completato', value: analytics.eventStatistics.completed },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={60}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {[0, 1, 2].map((index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-sm md:text-base">Metriche Riepilogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Media eventi/azienda</p>
              <p className="text-lg md:text-2xl font-semibold" data-testid="text-avg-events-per-company">
                {totalCompanies > 0 ? (analytics.eventStatistics.total / totalCompanies).toFixed(1) : '0'}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Media ricavi/azienda</p>
              <p className="text-lg md:text-2xl font-semibold" data-testid="text-avg-revenue-per-company">
                €{totalCompanies > 0 ? (totalRevenue / totalCompanies).toFixed(0) : '0'}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Media ricavi/evento</p>
              <p className="text-lg md:text-2xl font-semibold" data-testid="text-avg-revenue-per-event">
                €{analytics.eventStatistics.total > 0 ? (totalRevenue / analytics.eventStatistics.total).toFixed(0) : '0'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
