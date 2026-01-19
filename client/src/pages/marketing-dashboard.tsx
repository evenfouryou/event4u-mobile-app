import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Mail, 
  Gift, 
  Share2, 
  Package, 
  Euro,
  Target,
  Award,
  UserPlus,
  ShoppingBag
} from "lucide-react";
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
  LineChart,
  Line,
  Legend,
} from "recharts";

interface LoyaltyStats {
  totalMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  tierDistribution: { tier: string; count: number }[];
}

interface ReferralStats {
  totalReferrals: number;
  conversionRate: number;
  totalRewardsGiven: number;
  topReferrers: { userId: string; name: string; conversions: number }[];
}

interface BundleStats {
  totalBundles: number;
  activeBundles: number;
  totalSold: number;
  totalRevenue: string;
  purchasesByBundle: { bundleId: string; bundleName: string; soldCount: number; revenue: number }[];
}

interface EmailStats {
  totalSent: number;
  openRate: number;
  clickRate: number;
  campaigns: { name: string; sent: number; opened: number }[];
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe"];

export default function MarketingDashboard() {
  const { t } = useTranslation();
  const { data: loyaltyStats, isLoading: loyaltyLoading } = useQuery<LoyaltyStats>({
    queryKey: ["/api/loyalty/stats"],
  });

  const { data: referralStats, isLoading: referralLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referral/stats"],
  });

  const { data: bundleStats, isLoading: bundleLoading } = useQuery<BundleStats>({
    queryKey: ["/api/bundles/stats"],
  });

  const { data: emailCampaigns = [], isLoading: emailLoading } = useQuery<any[]>({
    queryKey: ["/api/marketing/campaigns"],
  });

  const isLoading = loyaltyLoading || referralLoading || bundleLoading || emailLoading;

  // Derived email stats
  const emailStats: EmailStats = {
    totalSent: emailCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0),
    openRate: emailCampaigns.length > 0 
      ? emailCampaigns.reduce((sum, c) => sum + (c.openedCount || 0), 0) / 
        Math.max(emailCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0), 1) * 100
      : 0,
    clickRate: emailCampaigns.length > 0
      ? emailCampaigns.reduce((sum, c) => sum + (c.clickedCount || 0), 0) /
        Math.max(emailCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0), 1) * 100
      : 0,
    campaigns: emailCampaigns.slice(0, 5).map(c => ({
      name: c.name || "Campaign",
      sent: c.sentCount || 0,
      opened: c.openedCount || 0,
    })),
  };

  // Tier distribution for pie chart
  const tierData = loyaltyStats?.tierDistribution || [
    { tier: "Bronze", count: 0 },
    { tier: "Silver", count: 0 },
    { tier: "Gold", count: 0 },
  ];

  // Bundle sales for bar chart
  const bundleSalesData = bundleStats?.purchasesByBundle?.slice(0, 5) || [];

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
            <BarChart3 className="h-8 w-8" />
            {t('marketing.dashboard.title')}
          </h1>
          <p className="text-muted-foreground">{t('marketing.dashboard.subtitle')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('marketing.dashboard.loyaltyMembers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-loyalty-members">
              {loyaltyStats?.totalMembers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {loyaltyStats?.totalPointsIssued || 0} {t('marketing.dashboard.pointsIssued')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('marketing.dashboard.activeReferrals')}</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-referrals">
              {referralStats?.totalReferrals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(referralStats?.conversionRate || 0).toFixed(1)}% {t('marketing.dashboard.conversionRate')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('marketing.dashboard.bundlesSold')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-bundles-sold">
              {bundleStats?.totalSold || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              €{bundleStats?.totalRevenue || "0.00"} {t('marketing.dashboard.revenue')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('marketing.dashboard.emailsSent')}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-emails-sent">
              {emailStats.totalSent}
            </div>
            <p className="text-xs text-muted-foreground">
              {emailStats.openRate.toFixed(1)}% {t('marketing.dashboard.openRate')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">{t('marketing.dashboard.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="loyalty" data-testid="tab-loyalty">{t('marketing.dashboard.tabs.loyalty')}</TabsTrigger>
          <TabsTrigger value="referral" data-testid="tab-referral">{t('marketing.dashboard.tabs.referral')}</TabsTrigger>
          <TabsTrigger value="bundles" data-testid="tab-bundles">{t('marketing.dashboard.tabs.bundles')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bundle Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('marketing.dashboard.bundleSales')}</CardTitle>
                <CardDescription>{t('marketing.dashboard.bundlePerformance')}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {bundleSalesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bundleSalesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bundleName" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="soldCount" fill="#8884d8" name={t('marketing.dashboard.sold')} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {t('marketing.dashboard.noDataAvailable')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tier Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('marketing.dashboard.tierDistribution')}</CardTitle>
                <CardDescription>{t('marketing.dashboard.membersByTier')}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {tierData.some(td => td.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tierData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ tier, count }) => `${tier}: ${count}`}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="tier"
                      >
                        {tierData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {t('marketing.dashboard.noMembersInProgram')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Award className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('marketing.dashboard.pointsRedeemed')}</p>
                    <p className="text-2xl font-bold">{loyaltyStats?.totalPointsRedeemed || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <UserPlus className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('marketing.dashboard.referralRewards')}</p>
                    <p className="text-2xl font-bold">{referralStats?.totalRewardsGiven || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <ShoppingBag className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('marketing.dashboard.activeBundles')}</p>
                    <p className="text-2xl font-bold">{bundleStats?.activeBundles || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.totalMembers')}</CardDescription>
                <CardTitle className="text-3xl">{loyaltyStats?.totalMembers || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.pointsIssuedLabel')}</CardDescription>
                <CardTitle className="text-3xl">{loyaltyStats?.totalPointsIssued || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.pointsRedeemed')}</CardDescription>
                <CardTitle className="text-3xl">{loyaltyStats?.totalPointsRedeemed || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <Award className="h-4 w-4 text-amber-500" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('marketing.dashboard.distributionByTier')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {tierData.map((tier, i) => (
                  <div key={tier.tier} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-medium">{tier.tier}:</span>
                    <Badge variant="secondary">{tier.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referral" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.totalReferrals')}</CardDescription>
                <CardTitle className="text-3xl">{referralStats?.totalReferrals || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <Share2 className="h-4 w-4 text-blue-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.conversionRateLabel')}</CardDescription>
                <CardTitle className="text-3xl">{(referralStats?.conversionRate || 0).toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <Target className="h-4 w-4 text-green-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.rewardsGiven')}</CardDescription>
                <CardTitle className="text-3xl">{referralStats?.totalRewardsGiven || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <Gift className="h-4 w-4 text-purple-500" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('marketing.dashboard.topReferrers')}</CardTitle>
              <CardDescription>{t('marketing.dashboard.bestPromoters')}</CardDescription>
            </CardHeader>
            <CardContent>
              {referralStats?.topReferrers && referralStats.topReferrers.length > 0 ? (
                <div className="space-y-3">
                  {referralStats.topReferrers.map((referrer, i) => (
                    <div key={referrer.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={i === 0 ? "default" : "secondary"}>#{i + 1}</Badge>
                        <span>{referrer.name}</span>
                      </div>
                      <Badge variant="outline">{referrer.conversions} {t('marketing.dashboard.conversions')}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">{t('marketing.dashboard.noReferralsRegistered')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bundles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.totalBundles')}</CardDescription>
                <CardTitle className="text-3xl">{bundleStats?.totalBundles || 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.activeBundles')}</CardDescription>
                <CardTitle className="text-3xl">{bundleStats?.activeBundles || 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.totalSales')}</CardDescription>
                <CardTitle className="text-3xl">{bundleStats?.totalSold || 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('marketing.dashboard.totalRevenue')}</CardDescription>
                <CardTitle className="text-3xl">€{bundleStats?.totalRevenue || "0.00"}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('marketing.dashboard.performanceByBundle')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {bundleSalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bundleSalesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="bundleName" type="category" width={120} fontSize={12} />
                    <Tooltip formatter={(value: number, name: string) => 
                      name === "revenue" ? `€${value.toFixed(2)}` : value
                    } />
                    <Bar dataKey="soldCount" fill="#8884d8" name={t('marketing.dashboard.sold')} />
                    <Bar dataKey="revenue" fill="#82ca9d" name={t('marketing.dashboard.revenueLabel')} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t('marketing.dashboard.noBundlesCreated')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
