import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/hooks/use-theme";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { SmartCardStatus } from "@/components/smart-card-status";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Beverage from "@/pages/beverage";
import Companies from "@/pages/companies";
import Users from "@/pages/users";
import Locations from "@/pages/locations";
import LocationDetail from "@/pages/location-detail";
import Products from "@/pages/products";
import Suppliers from "@/pages/suppliers";
import PurchaseOrders from "@/pages/purchase-orders";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import EventHub from "@/pages/event-hub";
import EventDirectStock from "@/pages/event-direct-stock";
import BartenderDirectStock from "@/pages/bartender-direct-stock";
import StationDetail from "@/pages/station-detail";
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
import SiaeTables from "@/pages/siae-tables";
import SiaeActivationCards from "@/pages/siae-activation-cards";
import SiaeSystemConfig from "@/pages/siae-system-config";
import SiaeCustomers from "@/pages/siae-customers";
import SiaeTicketedEvents from "@/pages/siae-ticketed-events";
import SiaeTickets from "@/pages/siae-tickets";
import SiaeTransactions from "@/pages/siae-transactions";
import SiaeNameChanges from "@/pages/siae-name-changes";
import SiaeResales from "@/pages/siae-resales";
import SiaeBoxOffice from "@/pages/siae-box-office";
import SiaeSubscriptions from "@/pages/siae-subscriptions";
import SiaeTransmissions from "@/pages/siae-transmissions";
import SiaeAuditLogs from "@/pages/siae-audit-logs";
import SiaeNumberedSeats from "@/pages/siae-numbered-seats";
import SiaeReportC1 from "@/pages/siae-report-c1";
import SiaeReportC2 from "@/pages/siae-report-c2";
// siae-card-reader merged into siae-activation-cards
import PublicEvents from "@/pages/public-events";
import PublicEventDetail from "@/pages/public-event-detail";
import PublicLogin from "@/pages/public-login";
import PublicForgotPassword from "@/pages/public-forgot-password";
import PublicResetPassword from "@/pages/public-reset-password";
import PublicCart from "@/pages/public-cart";
import PublicCheckout from "@/pages/public-checkout";
import PublicCheckoutSuccess from "@/pages/public-checkout-success";
import PublicVenues from "@/pages/public-venues";
import PublicVenueDetail from "@/pages/public-venue-detail";
import AccountPage from "@/pages/account";
import PrGuestLists from "@/pages/pr-guest-lists";
import PrTables from "@/pages/pr-tables";
import PrScanner from "@/pages/pr-scanner";
import PrStaff from "@/pages/pr-staff";
import PrMyEvents from "@/pages/pr-my-events";
import DownloadSmartCardApp from "@/pages/download-smart-card-app";
import SchoolBadgeManager from "@/pages/school-badge-manager";
import SchoolBadgeLanding from "@/pages/school-badge-landing";
import SchoolBadgeVerify from "@/pages/school-badge-verify";
import SchoolBadgeView from "@/pages/school-badge-view";
import SchoolBadgeError from "@/pages/school-badge-error";
import SchoolBadgeScanner from "@/pages/school-badge-scanner";
import PrinterSettings from "@/pages/printer-settings";
import TemplateBuilder from "@/pages/template-builder";
import StripeAdmin from "@/pages/stripe-admin";
import E4uScanner from "@/pages/e4u-scanner";
import ClientWallet from "@/pages/client-wallet";
import StaffPrHome from "@/pages/staff-pr-home";
import StaffPrEventPanel from "@/pages/staff-pr-event-panel";
import CassaBiglietti from "@/pages/cassa-biglietti";
import CashierManagement from "@/pages/cashier-management";
import CashierDashboard from "@/pages/cashier-dashboard";
import EventShortLink from "@/pages/event-short-link";
import AdminSiteSettings from "@/pages/admin-site-settings";
import AdminBillingPlans from "@/pages/admin-billing-plans";
import AdminBillingOrganizers from "@/pages/admin-billing-organizers";
import AdminBillingOrganizerDetail from "@/pages/admin-billing-organizer-detail";
import AdminBillingInvoices from "@/pages/admin-billing-invoices";
import AdminBillingReports from "@/pages/admin-billing-reports";
import OrganizerBilling from "@/pages/organizer-billing";
import { CookieConsent } from "@/components/cookie-consent";

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
        <Route path="/e/:shortId" component={EventShortLink} />
        <Route path="/acquista/:id" component={PublicEventDetail} />
        <Route path="/acquista" component={PublicEvents} />
        <Route path="/carrello" component={PublicCart} />
        <Route path="/accedi" component={PublicLogin} />
        <Route path="/public/forgot-password" component={PublicForgotPassword} />
        <Route path="/public/reset-password" component={PublicResetPassword} />
        <Route path="/checkout/success" component={PublicCheckoutSuccess} />
        <Route path="/checkout" component={PublicCheckout} />
        <Route path="/locali/:id" component={PublicVenueDetail} />
        <Route path="/locali" component={PublicVenues} />
        <Route path="/download-smart-card" component={DownloadSmartCardApp} />
        <Route path="/badge-error" component={SchoolBadgeError} />
        <Route path="/badge/verify" component={SchoolBadgeVerify} />
        <Route path="/badge/view/:code" component={SchoolBadgeView} />
        <Route path="/badge/:slug" component={SchoolBadgeLanding} />
        <Route path="/account/:rest*" component={AccountPage} />
        <Route path="/account" component={AccountPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b gap-2">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-3">
              <SmartCardStatus data-testid="smart-card-status" />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/beverage" component={Beverage} />
              <Route path="/companies" component={Companies} />
              <Route path="/users" component={Users} />
              <Route path="/locations/:id" component={LocationDetail} />
              <Route path="/locations" component={Locations} />
              <Route path="/products" component={Products} />
              <Route path="/suppliers" component={Suppliers} />
              <Route path="/purchase-orders" component={PurchaseOrders} />
              <Route path="/events/new" component={EventWizard} />
              <Route path="/events/wizard/:id?" component={EventWizard} />
              <Route path="/events/:id/hub" component={EventHub} />
              <Route path="/events/:eventId/stations/:stationId" component={StationDetail} />
              <Route path="/events/:id/direct-stock" component={EventDirectStock} />
              <Route path="/bartender/events/:id/direct-stock" component={BartenderDirectStock} />
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
              <Route path="/siae/tables" component={SiaeTables} />
              <Route path="/siae/activation-cards" component={SiaeActivationCards} />
              <Route path="/siae/system-config" component={SiaeSystemConfig} />
              <Route path="/siae/customers" component={SiaeCustomers} />
              <Route path="/siae/ticketed-events" component={SiaeTicketedEvents} />
              <Route path="/siae/tickets" component={SiaeTickets} />
              <Route path="/siae/transactions" component={SiaeTransactions} />
              <Route path="/siae/name-changes" component={SiaeNameChanges} />
              <Route path="/siae/resales" component={SiaeResales} />
              <Route path="/siae/box-office" component={SiaeBoxOffice} />
              <Route path="/siae/subscriptions" component={SiaeSubscriptions} />
              <Route path="/siae/transmissions" component={SiaeTransmissions} />
              <Route path="/siae/audit-logs" component={SiaeAuditLogs} />
              <Route path="/siae/numbered-seats" component={SiaeNumberedSeats} />
              <Route path="/siae/card-reader" component={SiaeActivationCards} />
              <Route path="/siae/reports/c1/:id" component={SiaeReportC1} />
              <Route path="/siae/reports/c2/:id" component={SiaeReportC2} />
              <Route path="/pr/guest-lists" component={PrGuestLists} />
              <Route path="/pr/tables" component={PrTables} />
              <Route path="/pr/scanner" component={PrScanner} />
              <Route path="/pr/staff" component={PrStaff} />
              <Route path="/pr/my-events" component={PrMyEvents} />
              <Route path="/school-badges" component={SchoolBadgeManager} />
              <Route path="/school-badges/scanner" component={SchoolBadgeScanner} />
              <Route path="/badge-error" component={SchoolBadgeError} />
              <Route path="/badge/verify" component={SchoolBadgeVerify} />
              <Route path="/badge/view/:code" component={SchoolBadgeView} />
              <Route path="/badge/:slug" component={SchoolBadgeLanding} />
              <Route path="/printer-settings" component={PrinterSettings} />
              <Route path="/template-builder" component={TemplateBuilder} />
              <Route path="/template-builder/:id" component={TemplateBuilder} />
              <Route path="/stripe-admin" component={StripeAdmin} />
              <Route path="/admin/site-settings" component={AdminSiteSettings} />
              <Route path="/admin/billing/plans" component={AdminBillingPlans} />
              <Route path="/admin/billing/organizers/:companyId" component={AdminBillingOrganizerDetail} />
              <Route path="/admin/billing/organizers" component={AdminBillingOrganizers} />
              <Route path="/admin/billing/invoices" component={AdminBillingInvoices} />
              <Route path="/admin/billing/reports" component={AdminBillingReports} />
              <Route path="/organizer/billing" component={OrganizerBilling} />
              <Route path="/billing" component={OrganizerBilling} />
              <Route path="/scanner/:eventId?" component={E4uScanner} />
              <Route path="/wallet" component={ClientWallet} />
              <Route path="/staff-pr-home" component={StaffPrHome} />
              <Route path="/events/:id/panel" component={StaffPrEventPanel} />
              <Route path="/cassa-biglietti" component={CassaBiglietti} />
              <Route path="/cashier/management" component={CashierManagement} />
              <Route path="/cashier/dashboard" component={CashierDashboard} />
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
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
          <InstallPrompt />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
