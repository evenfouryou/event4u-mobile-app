import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Calendar, TrendingUp, Package, Settings, UserPlus, Ticket, ChevronLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
