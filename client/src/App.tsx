import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Beverage from "@/pages/beverage";
import Companies from "@/pages/companies";
import Users from "@/pages/users";
import Locations from "@/pages/locations";
import Products from "@/pages/products";
import Suppliers from "@/pages/suppliers";
import PurchaseOrders from "@/pages/purchase-orders";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import EventFormats from "@/pages/event-formats";
import EventWizard from "@/pages/event-wizard";
import Warehouse from "@/pages/warehouse";
import ConsumptionTracking from "@/pages/consumption-tracking";
import Register from "@/pages/register";
import Login from "@/pages/login";
import PriceLists from "@/pages/price-lists";
import ImportPage from "@/pages/import";
import Reports from "@/pages/reports";
import ReturnToWarehouse from "@/pages/return-to-warehouse";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import Stations from "@/pages/stations";
import Settings from "@/pages/settings";
import AIAnalysis from "@/pages/ai-analysis";
import VerifyEmail from "@/pages/verify-email";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Accounting from "@/pages/accounting";
import Personnel from "@/pages/personnel";
import NightFilePage from "@/pages/night-file";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento...</p>
        </div>
      </div>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/beverage" component={Beverage} />
              <Route path="/companies" component={Companies} />
              <Route path="/users" component={Users} />
              <Route path="/locations" component={Locations} />
              <Route path="/products" component={Products} />
              <Route path="/suppliers" component={Suppliers} />
              <Route path="/purchase-orders" component={PurchaseOrders} />
              <Route path="/events/wizard/:id?" component={EventWizard} />
              <Route path="/events/:id" component={EventDetail} />
              <Route path="/events" component={Events} />
              <Route path="/event-formats" component={EventFormats} />
              <Route path="/warehouse" component={Warehouse} />
              <Route path="/consumption" component={ConsumptionTracking} />
              <Route path="/consumption-tracking" component={ConsumptionTracking} />
              <Route path="/price-lists" component={PriceLists} />
              <Route path="/import" component={ImportPage} />
              <Route path="/reports" component={Reports} />
              <Route path="/return-to-warehouse" component={ReturnToWarehouse} />
              <Route path="/super-admin" component={SuperAdminDashboard} />
              <Route path="/stations" component={Stations} />
              <Route path="/settings" component={Settings} />
              <Route path="/ai-analysis" component={AIAnalysis} />
              <Route path="/accounting" component={Accounting} />
              <Route path="/personnel" component={Personnel} />
              <Route path="/night-file" component={NightFilePage} />
              <Route component={NotFound} />
            </Switch>
          </main>
          {isMobile && <MobileBottomNav />}
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
        <InstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
