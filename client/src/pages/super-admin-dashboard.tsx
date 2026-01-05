import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Calendar, TrendingUp, Package, Settings, UserPlus, Ticket, ChevronLeft, CreditCard, FileText, Send, ClipboardList, Shield, Clock, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { useLocation } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springTransition,
  },
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  testId: string;
  index: number;
}

function StatCard({ title, value, subtitle, icon: Icon, testId, index }: StatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
      onTapStart={() => triggerHaptic('light')}
    >
      <Card className="glass-card h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
              <p className="text-3xl font-bold" data-testid={testId}>
                {value}
              </p>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
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
      triggerHaptic('success');
      toast({
        title: "Impostazione aggiornata",
        description: "L'impostazione è stata salvata correttamente.",
      });
    },
    onError: () => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'impostazione.",
        variant: "destructive",
      });
    },
  });

  const registrationEnabled = systemSettings?.find(s => s.key === 'registration_enabled')?.value !== 'false';
  const customerRegistrationEnabled = systemSettings?.find(s => s.key === 'customer_registration_enabled')?.value !== 'false';

  const handleRegistrationToggle = (enabled: boolean) => {
    triggerHaptic('medium');
    updateSettingMutation.mutate({
      key: 'registration_enabled',
      value: enabled ? 'true' : 'false',
    });
  };

  const handleCustomerRegistrationToggle = (enabled: boolean) => {
    triggerHaptic('medium');
    updateSettingMutation.mutate({
      key: 'customer_registration_enabled',
      value: enabled ? 'true' : 'false',
    });
  };

  if (isLoading) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Dashboard Super Admin"
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/')}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="flex items-center justify-center h-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <p className="text-muted-foreground text-base">Caricamento analytics...</p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  if (!analytics) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Dashboard Super Admin"
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/')}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="flex items-center justify-center h-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <p className="text-muted-foreground text-base">Nessun dato disponibile</p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  const totalCompanies = analytics.companyMetrics.length;
  const totalRevenue = analytics.companyMetrics.reduce((sum, c) => sum + c.totalRevenue, 0);

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-super-admin-dashboard">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Super Admin</h1>
            <p className="text-muted-foreground">Metriche cross-company</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-companies">{totalCompanies}</p>
                  <p className="text-sm text-muted-foreground">Aziende</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-events">{analytics.eventStatistics.total}</p>
                  <p className="text-sm text-muted-foreground">Eventi ({analytics.eventStatistics.active} attivi)</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-revenue">€{totalRevenue.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Ricavi Totali</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-chart-1" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-top-products-count">{analytics.topProducts.length}</p>
                  <p className="text-sm text-muted-foreground">Top Prodotti</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Impostazioni Sistema</CardTitle>
                  <CardDescription>Impostazioni globali piattaforma</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="desktop-registration-toggle">Registrazione Organizzatori</Label>
                    <p className="text-sm text-muted-foreground">
                      {registrationEnabled ? "Attiva" : "Disabilitata"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="desktop-registration-toggle"
                  checked={registrationEnabled}
                  onCheckedChange={handleRegistrationToggle}
                  disabled={updateSettingMutation.isPending}
                  data-testid="switch-registration-enabled"
                />
              </div>
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <Label htmlFor="desktop-customer-registration-toggle">Registrazione Clienti</Label>
                    <p className="text-sm text-muted-foreground">
                      {customerRegistrationEnabled ? "Attiva" : "Disabilitata"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="desktop-customer-registration-toggle"
                  checked={customerRegistrationEnabled}
                  onCheckedChange={handleCustomerRegistrationToggle}
                  disabled={updateSettingMutation.isPending}
                  data-testid="switch-customer-registration-enabled"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <CardTitle>Gestione SIAE</CardTitle>
                  <CardDescription>Biglietteria fiscale e trasmissioni</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setLocation('/siae-approvals')}
                  data-testid="link-siae-approvals"
                >
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-xs">Approvazioni</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setLocation('/siae/system-config')}
                  data-testid="link-siae-config"
                >
                  <Settings className="w-5 h-5 text-primary" />
                  <span className="text-xs">Configurazione</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setLocation('/siae-tables')}
                  data-testid="link-siae-tables"
                >
                  <ClipboardList className="w-5 h-5 text-accent" />
                  <span className="text-xs">Tabelle Codificate</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setLocation('/siae-activation-cards')}
                  data-testid="link-siae-cards"
                >
                  <CreditCard className="w-5 h-5 text-chart-1" />
                  <span className="text-xs">Carte Attivazione</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setLocation('/siae-transmissions')}
                  data-testid="link-siae-transmissions"
                >
                  <Send className="w-5 h-5 text-chart-2" />
                  <span className="text-xs">Trasmissioni</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setLocation('/siae-report-c1')}
                  data-testid="link-siae-report-c1"
                >
                  <FileText className="w-5 h-5 text-chart-3" />
                  <span className="text-xs">Report C1/C2</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setLocation('/siae-audit-logs')}
                  data-testid="link-siae-audit"
                >
                  <Shield className="w-5 h-5 text-chart-4" />
                  <span className="text-xs">Audit Logs</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ricavi per Azienda</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.companyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="companyName" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" name="Ricavi (€)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eventi per Azienda</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.companyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="companyName" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="eventCount" fill="hsl(var(--accent))" name="N° Eventi" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Prodotti per Consumo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    dataKey="productName" 
                    type="category" 
                    width={120} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="totalConsumed" fill="hsl(var(--chart-2))" name="Quantità" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuzione Stati Eventi</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
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
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    innerRadius={50}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {[0, 1, 2].map((index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Metriche Aziende</CardTitle>
            <CardDescription>Dettaglio ricavi e eventi per azienda</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Azienda</TableHead>
                  <TableHead className="text-right">Eventi</TableHead>
                  <TableHead className="text-right">Ricavi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.companyMetrics.map((company) => (
                  <TableRow key={company.companyId} data-testid={`row-company-${company.companyId}`}>
                    <TableCell className="font-medium">{company.companyName}</TableCell>
                    <TableCell className="text-right">{company.eventCount}</TableCell>
                    <TableCell className="text-right">€{company.totalRevenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title="Dashboard Super Admin"
          subtitle="Metriche cross-company"
          leftAction={
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </HapticButton>
          }
        />
      }
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-5 py-4 pb-24"
      >
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Aziende"
            value={totalCompanies}
            icon={Building2}
            testId="text-total-companies"
            index={0}
          />
          <StatCard
            title="Eventi"
            value={analytics.eventStatistics.total}
            subtitle={`${analytics.eventStatistics.active} attivi`}
            icon={Calendar}
            testId="text-total-events"
            index={1}
          />
          <StatCard
            title="Ricavi"
            value={`€${totalRevenue.toFixed(0)}`}
            icon={TrendingUp}
            testId="text-total-revenue"
            index={2}
          />
          <StatCard
            title="Top Prodotti"
            value={analytics.topProducts.length}
            icon={Package}
            testId="text-top-products-count"
            index={3}
          />
        </div>

        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Impostazioni Sistema</CardTitle>
                  <CardDescription className="text-sm">
                    Impostazioni globali piattaforma
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <motion.div
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30 min-h-[72px]"
                whileTap={{ scale: 0.98 }}
                transition={springTransition}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="registration-toggle" className="text-sm font-medium">
                      Registrazione Organizzatori
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {registrationEnabled 
                        ? "Attiva"
                        : "Disabilitata"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="registration-toggle"
                  checked={registrationEnabled}
                  onCheckedChange={handleRegistrationToggle}
                  disabled={updateSettingMutation.isPending}
                  className="min-w-[44px] min-h-[44px]"
                  data-testid="switch-registration-enabled"
                />
              </motion.div>

              <motion.div
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30 min-h-[72px]"
                whileTap={{ scale: 0.98 }}
                transition={springTransition}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Ticket className="w-5 h-5 text-accent" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="customer-registration-toggle" className="text-sm font-medium">
                      Registrazione Clienti
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {customerRegistrationEnabled 
                        ? "Attiva"
                        : "Disabilitata"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="customer-registration-toggle"
                  checked={customerRegistrationEnabled}
                  onCheckedChange={handleCustomerRegistrationToggle}
                  disabled={updateSettingMutation.isPending}
                  className="min-w-[44px] min-h-[44px]"
                  data-testid="switch-customer-registration-enabled"
                />
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* === NUOVA SEZIONE GESTIONE SIAE === */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <CardTitle className="text-base">Gestione SIAE</CardTitle>
                  <CardDescription className="text-sm">
                    Biglietteria fiscale e trasmissioni
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover-elevate"
                  whileTap={{ scale: 0.96 }}
                  transition={springTransition}
                  onClick={() => { triggerHaptic('light'); setLocation('/siae/system-config'); }}
                  data-testid="link-siae-config"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-center">Configurazione</span>
                </motion.button>

                <motion.button
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover-elevate"
                  whileTap={{ scale: 0.96 }}
                  transition={springTransition}
                  onClick={() => { triggerHaptic('light'); setLocation('/siae-tables'); }}
                  data-testid="link-siae-tables"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-xs font-medium text-center">Tabelle Codificate</span>
                </motion.button>

                <motion.button
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover-elevate"
                  whileTap={{ scale: 0.96 }}
                  transition={springTransition}
                  onClick={() => { triggerHaptic('light'); setLocation('/siae-activation-cards'); }}
                  data-testid="link-siae-cards"
                >
                  <div className="w-10 h-10 rounded-xl bg-chart-1/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-chart-1" />
                  </div>
                  <span className="text-xs font-medium text-center">Carte Attivazione</span>
                </motion.button>

                <motion.button
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover-elevate"
                  whileTap={{ scale: 0.96 }}
                  transition={springTransition}
                  onClick={() => { triggerHaptic('light'); setLocation('/siae-transmissions'); }}
                  data-testid="link-siae-transmissions"
                >
                  <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
                    <Send className="w-5 h-5 text-chart-2" />
                  </div>
                  <span className="text-xs font-medium text-center">Trasmissioni</span>
                </motion.button>

                <motion.button
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover-elevate"
                  whileTap={{ scale: 0.96 }}
                  transition={springTransition}
                  onClick={() => { triggerHaptic('light'); setLocation('/siae-report-c1'); }}
                  data-testid="link-siae-report-c1"
                >
                  <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-chart-3" />
                  </div>
                  <span className="text-xs font-medium text-center">Report C1/C2</span>
                </motion.button>

                <motion.button
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover-elevate"
                  whileTap={{ scale: 0.96 }}
                  transition={springTransition}
                  onClick={() => { triggerHaptic('light'); setLocation('/siae-audit-logs'); }}
                  data-testid="link-siae-audit"
                >
                  <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-chart-4" />
                  </div>
                  <span className="text-xs font-medium text-center">Audit Logs</span>
                </motion.button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Ricavi per Azienda</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.companyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="companyName" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" name="Ricavi (€)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Eventi per Azienda</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.companyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="companyName" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar dataKey="eventCount" fill="hsl(var(--accent))" name="N° Eventi" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Top Prodotti per Consumo</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    dataKey="productName" 
                    type="category" 
                    width={100} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar dataKey="totalConsumed" fill="hsl(var(--chart-2))" name="Quantità" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Distribuzione Stati Eventi</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <ResponsiveContainer width="100%" height={240}>
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
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    innerRadius={40}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {[0, 1, 2].map((index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Metriche Riepilogo</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-5">
              <motion.div 
                className="p-4 rounded-2xl bg-muted/30"
                whileTap={{ scale: 0.98 }}
                transition={springTransition}
                onTapStart={() => triggerHaptic('light')}
              >
                <p className="text-sm text-muted-foreground mb-1">Media eventi/azienda</p>
                <p className="text-2xl font-bold" data-testid="text-avg-events-per-company">
                  {totalCompanies > 0 ? (analytics.eventStatistics.total / totalCompanies).toFixed(1) : '0'}
                </p>
              </motion.div>
              <motion.div 
                className="p-4 rounded-2xl bg-muted/30"
                whileTap={{ scale: 0.98 }}
                transition={springTransition}
                onTapStart={() => triggerHaptic('light')}
              >
                <p className="text-sm text-muted-foreground mb-1">Media ricavi/azienda</p>
                <p className="text-2xl font-bold" data-testid="text-avg-revenue-per-company">
                  €{totalCompanies > 0 ? (totalRevenue / totalCompanies).toFixed(0) : '0'}
                </p>
              </motion.div>
              <motion.div 
                className="p-4 rounded-2xl bg-muted/30"
                whileTap={{ scale: 0.98 }}
                transition={springTransition}
                onTapStart={() => triggerHaptic('light')}
              >
                <p className="text-sm text-muted-foreground mb-1">Media ricavi/evento</p>
                <p className="text-2xl font-bold" data-testid="text-avg-revenue-per-event">
                  €{analytics.eventStatistics.total > 0 ? (totalRevenue / analytics.eventStatistics.total).toFixed(0) : '0'}
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </MobileAppLayout>
  );
}
