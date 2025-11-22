import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, TrendingUp, Package } from "lucide-react";
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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function SuperAdminDashboard() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/super-admin/analytics'],
  });

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
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Dashboard Super Admin</h1>
        <p className="text-muted-foreground">
          Panoramica completa delle metriche cross-company
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aziende Totali</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-companies">
              {totalCompanies}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventi Totali</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-events">
              {analytics.eventStatistics.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.eventStatistics.active} attivi, {analytics.eventStatistics.completed} completati
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-revenue">
              €{totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prodotti Top</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-top-products-count">
              {analytics.topProducts.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ricavi per Azienda</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.companyMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="companyName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" name="Ricavi (€)" />
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="companyName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="eventCount" fill="hsl(var(--accent))" name="N° Eventi" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Prodotti per Consumo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.topProducts} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="productName" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalConsumed" fill="hsl(var(--chart-2))" name="Quantità Consumata" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
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

        <Card>
          <CardHeader>
            <CardTitle>Metriche Riepilogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Media eventi per azienda</p>
              <p className="text-2xl font-semibold" data-testid="text-avg-events-per-company">
                {totalCompanies > 0 ? (analytics.eventStatistics.total / totalCompanies).toFixed(1) : '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Media ricavi per azienda</p>
              <p className="text-2xl font-semibold" data-testid="text-avg-revenue-per-company">
                €{totalCompanies > 0 ? (totalRevenue / totalCompanies).toFixed(2) : '0.00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Media ricavi per evento</p>
              <p className="text-2xl font-semibold" data-testid="text-avg-revenue-per-event">
                €{analytics.eventStatistics.total > 0 ? (totalRevenue / analytics.eventStatistics.total).toFixed(2) : '0.00'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
