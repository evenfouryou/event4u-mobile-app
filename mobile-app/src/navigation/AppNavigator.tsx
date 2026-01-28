import { useState, createContext, useContext } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { colors } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

import { SplashScreen } from '@/screens/auth/SplashScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';

import { AccountDashboard } from '@/screens/account/AccountDashboard';
import { TicketsScreen } from '@/screens/account/TicketsScreen';
import { TicketDetailScreen } from '@/screens/account/TicketDetailScreen';
import { WalletScreen } from '@/screens/account/WalletScreen';
import { WalletTopUpScreen } from '@/screens/account/WalletTopUpScreen';
import { NameChangeScreen } from '@/screens/account/NameChangeScreen';
import { SubscriptionsScreen } from '@/screens/account/SubscriptionsScreen';
import { SettingsScreen } from '@/screens/account/SettingsScreen';
import { ProfileScreen } from '@/screens/account/ProfileScreen';

import { LandingScreen } from '@/screens/public/LandingScreen';
import { EventsListScreen } from '@/screens/public/EventsListScreen';
import { EventDetailScreen } from '@/screens/public/EventDetailScreen';
import { CartScreen } from '@/screens/public/CartScreen';
import { CheckoutScreen, CartItem } from '@/screens/public/CheckoutScreen';
import { VenuesScreen } from '@/screens/public/VenuesScreen';
import { VenueDetailScreen } from '@/screens/public/VenueDetailScreen';
import { ResalesScreen } from '@/screens/public/ResalesScreen';

import { PRDashboard } from '@/screens/pr/PRDashboard';
import { PREventsScreen } from '@/screens/pr/PREventsScreen';
import { PREventDashboard } from '@/screens/pr/PREventDashboard';
import { PRWalletScreen } from '@/screens/pr/PRWalletScreen';
import { PRProfileScreen } from '@/screens/pr/PRProfileScreen';

import { ScannerDashboard, ScannerEventsScreen, ScannerScanScreen, ScannerProfileScreen } from '@/screens/scanner';

import {
  GestoreDashboard,
  GestoreEventsScreen,
  GestoreEventDetailScreen,
  GestoreInventoryScreen,
  GestoreProductsScreen,
  GestorePriceListsScreen,
  GestoreStaffScreen,
  GestoreScannerScreen,
  GestoreMarketingScreen,
  GestoreAccountingScreen,
  GestoreProfileScreen,
  GestoreSettingsScreen,
  GestoreCreateEventScreen,
  GestorePRManagementScreen,
  GestoreCompaniesScreen,
  GestoreStationsScreen,
  GestoreWarehouseScreen,
  GestoreSuppliersScreen,
  GestorePersonnelScreen,
  GestoreReportsScreen,
  GestoreCashierScreen,
  GestoreUsersScreen,
  GestoreSIAEDashboardScreen,
  GestoreSIAEEventsScreen,
  GestoreSIAEReportsScreen,
  GestoreSIAECustomersScreen,
  GestoreSIAECardsScreen,
  GestoreFloorPlanViewerScreen,
  GestoreTableManagementScreen,
  GestoreGuestListScreen,
  GestoreLocationsScreen,
  GestoreLocationDetailScreen,
  GestoreStationDetailScreen,
  GestorePurchaseOrdersScreen,
  GestoreConsumptionTrackingScreen,
  GestoreNightFileScreen,
  GestoreBeverageScreen,
  GestorePRWalletScreen,
  GestorePRListsScreen,
  GestorePRRewardsScreen,
  GestoreFloorPlanEditorScreen,
  GestoreScannerHistoryScreen,
  GestoreScannerStatsScreen,
  GestoreSIAETicketingConsoleScreen,
  GestoreSIAEBoxOfficeScreen,
  GestoreSIAETransactionsScreen,
  GestoreSIAENameChangesScreen,
  GestoreSIAENumberedSeatsScreen,
  GestoreSIAETicketTypesScreen,
  GestoreSIAESubscriptionsScreen,
  GestoreSIAEResalesScreen,
  GestoreSIAETransmissionsScreen,
  GestoreSIAEAuditLogScreen,
  GestoreSIAEConfigScreen,
  GestoreSIAEReportC1Screen,
  GestoreSIAEReportC2Screen,
  GestoreImportScreen,
  GestorePrinterSettingsScreen,
  GestoreBillingScreen,
  GestoreEventPageEditorScreen,
} from '@/screens/gestore';

import {
  AdminDashboard,
  AdminGestoriScreen,
  AdminGestoreDetailScreen,
  AdminEventsScreen,
  AdminBillingScreen,
  AdminSettingsScreen,
  AdminCompaniesScreen,
  AdminUsersScreen,
  AdminEventDetailScreen,
  AdminNameChangesScreen,
  AdminSIAEMonitorScreen,
  AdminSiteSettingsScreen,
  AdminSIAETablesScreen,
  AdminSIAECardsScreen,
  AdminSIAEConfigScreen,
  AdminSIAEApprovalsScreen,
  AdminSIAECustomersScreen,
  AdminCompanyDetailScreen,
  AdminUserDetailScreen,
  AdminSIAEConsoleScreen,
  AdminSIAETransactionsScreen,
  AdminSIAEBoxOfficeScreen,
  AdminSIAETransmissionsScreen,
  AdminSIAETicketTypesScreen,
  AdminSIAEResalesScreen,
  AdminSIAESubscriptionsScreen,
  AdminSIAEAuditLogsScreen,
  AdminStripeScreen,
  AdminPrinterSettingsScreen,
  AdminDigitalTemplatesScreen,
  AdminBillingReportsScreen,
} from '@/screens/admin';

type Screen =
  | { name: 'splash' }
  | { name: 'landing' }
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'forgotPassword' }
  | { name: 'events' }
  | { name: 'eventDetail'; params: { eventId: string } }
  | { name: 'cart' }
  | { name: 'checkout'; params?: { cartItems: CartItem[] } }
  | { name: 'venues' }
  | { name: 'venueDetail'; params: { venueId: string } }
  | { name: 'resales' }
  | { name: 'accountDashboard' }
  | { name: 'tickets' }
  | { name: 'ticketDetail'; params: { ticketId: string } }
  | { name: 'wallet' }
  | { name: 'walletTopUp' }
  | { name: 'nameChange'; params: { ticketId: string } }
  | { name: 'subscriptions' }
  | { name: 'settings' }
  | { name: 'profile' }
  | { name: 'prDashboard' }
  | { name: 'prEvents' }
  | { name: 'prEventDetail'; params: { eventId: string } }
  | { name: 'prWallet' }
  | { name: 'prProfile' }
  | { name: 'scannerDashboard' }
  | { name: 'scannerEvents' }
  | { name: 'scannerScan'; params: { eventId: string } }
  | { name: 'scannerProfile' }
  // Gestore screens
  | { name: 'gestoreDashboard' }
  | { name: 'gestoreEvents' }
  | { name: 'gestoreEventDetail'; params: { eventId: string } }
  | { name: 'gestoreCreateEvent' }
  | { name: 'gestoreInventory' }
  | { name: 'gestoreStaff' }
  | { name: 'gestoreScanner' }
  | { name: 'gestoreMarketing' }
  | { name: 'gestoreAccounting' }
  | { name: 'gestoreProfile' }
  | { name: 'gestoreSettings' }
  // Gestore additional screens
  | { name: 'gestoreProducts' }
  | { name: 'gestorePriceLists' }
  | { name: 'gestorePRManagement' }
  | { name: 'gestoreCompanies' }
  | { name: 'gestoreStations' }
  | { name: 'gestoreWarehouse' }
  | { name: 'gestoreSuppliers' }
  | { name: 'gestorePersonnel' }
  | { name: 'gestoreReports' }
  | { name: 'gestoreCashier' }
  | { name: 'gestoreUsers' }
  // SIAE screens
  | { name: 'gestoreSIAEDashboard' }
  | { name: 'gestoreSIAEEvents' }
  | { name: 'gestoreSIAEReports' }
  | { name: 'gestoreSIAECustomers' }
  | { name: 'gestoreSIAECards' }
  | { name: 'gestoreFloorPlan'; params: { eventId: string } }
  | { name: 'gestoreTableManagement'; params: { eventId: string } }
  | { name: 'gestoreGuestList'; params: { eventId: string } }
  // Phase 4 screens
  | { name: 'gestoreLocations' }
  | { name: 'gestoreLocationDetail'; params: { locationId: string } }
  | { name: 'gestoreStationDetail'; params: { stationId: string } }
  | { name: 'gestorePurchaseOrders' }
  | { name: 'gestoreConsumptionTracking' }
  | { name: 'gestoreNightFile' }
  | { name: 'gestoreBeverage' }
  | { name: 'gestorePRWallet' }
  | { name: 'gestorePRLists' }
  | { name: 'gestorePRRewards' }
  | { name: 'gestoreFloorPlanEditor'; params: { locationId: string } }
  | { name: 'gestoreScannerHistory' }
  | { name: 'gestoreScannerStats' }
  | { name: 'gestoreSIAETicketingConsole' }
  | { name: 'gestoreSIAEBoxOffice' }
  | { name: 'gestoreSIAETransactions' }
  | { name: 'gestoreSIAENameChanges' }
  | { name: 'gestoreSIAENumberedSeats' }
  | { name: 'gestoreSIAETicketTypes' }
  | { name: 'gestoreSIAESubscriptions' }
  | { name: 'gestoreSIAEResales' }
  | { name: 'gestoreSIAETransmissions' }
  | { name: 'gestoreSIAEAuditLog' }
  | { name: 'gestoreSIAEConfig' }
  | { name: 'gestoreSIAEReportC1' }
  | { name: 'gestoreSIAEReportC2' }
  | { name: 'gestoreImport' }
  | { name: 'gestorePrinterSettings' }
  | { name: 'gestoreBilling' }
  | { name: 'gestoreEventPageEditor'; params: { eventId: string } }
  // Admin screens
  | { name: 'adminDashboard' }
  | { name: 'adminGestori' }
  | { name: 'adminGestoreDetail'; params: { gestoreId: string } }
  | { name: 'adminEvents' }
  | { name: 'adminBilling' }
  | { name: 'adminSettings' }
  | { name: 'adminCompanies' }
  | { name: 'adminUsers' }
  | { name: 'adminEventDetail'; params: { eventId: string } }
  | { name: 'adminCompanyDetail'; params: { companyId: string } }
  | { name: 'adminUserDetail'; params: { userId: string } }
  | { name: 'adminNameChanges' }
  | { name: 'adminSIAEMonitor' }
  | { name: 'adminSiteSettings' }
  | { name: 'adminSIAETables' }
  | { name: 'adminSIAECards' }
  | { name: 'adminSIAEConfig' }
  | { name: 'adminSIAEApprovals' }
  | { name: 'adminSIAECustomers' }
  | { name: 'adminSIAEConsole' }
  | { name: 'adminSIAETransactions' }
  | { name: 'adminSIAEBoxOffice' }
  | { name: 'adminSIAETransmissions' }
  | { name: 'adminSIAETicketTypes' }
  | { name: 'adminSIAEResales' }
  | { name: 'adminSIAESubscriptions' }
  | { name: 'adminSIAEAuditLogs' }
  | { name: 'adminStripe' }
  | { name: 'adminPrinter' }
  | { name: 'adminDigitalTemplates' }
  | { name: 'adminBillingReports' }
  | { name: 'adminBillingPlans' }
  | { name: 'adminBillingOrganizers' }
  | { name: 'adminBillingInvoices' };

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, delta: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within AppNavigator');
  }
  return context;
}

export function AppNavigator() {
  const { isAuthenticated, user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>({ name: 'splash' });
  const [history, setHistory] = useState<Screen[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        i => i.ticketedEventId === item.ticketedEventId && 
             i.sectorId === item.sectorId &&
             i.ticketTypeId === item.ticketTypeId
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity,
        };
        return updated;
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCartItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartContextValue: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity: updateCartQuantity,
    clearCart,
  };

  const navigate = (screen: Screen) => {
    setHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (history.length > 0) {
      const previousScreen = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setCurrentScreen(previousScreen);
    }
  };

  const resetTo = (screen: Screen) => {
    setHistory([]);
    setCurrentScreen(screen);
  };

  const handleSplashReady = (authenticated: boolean) => {
    if (authenticated && user?.role) {
      // Navigate to the appropriate dashboard based on user role
      switch (user.role) {
        case 'scanner':
          resetTo({ name: 'scannerDashboard' });
          break;
        case 'pr':
          resetTo({ name: 'prDashboard' });
          break;
        case 'gestore':
          resetTo({ name: 'gestoreDashboard' });
          break;
        case 'super_admin':
          resetTo({ name: 'adminDashboard' });
          break;
        default:
          resetTo({ name: 'accountDashboard' });
      }
    } else if (authenticated) {
      // User is authenticated but role not yet loaded, default to account
      resetTo({ name: 'accountDashboard' });
    } else {
      resetTo({ name: 'landing' });
    }
  };

  const renderScreen = () => {
    switch (currentScreen.name) {
      case 'splash':
        return <SplashScreen onReady={handleSplashReady} />;

      case 'landing':
        return (
          <LandingScreen
            onNavigateEvents={() => navigate({ name: 'events' })}
            onNavigateLogin={() => navigate({ name: 'login' })}
            onNavigateRegister={() => navigate({ name: 'register' })}
            onNavigateVenues={() => navigate({ name: 'venues' })}
            onNavigateResales={() => navigate({ name: 'resales' })}
            onNavigateAccount={() => navigate({ name: 'accountDashboard' })}
            isAuthenticated={isAuthenticated}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onNavigateRegister={() => navigate({ name: 'register' })}
            onNavigateForgotPassword={() => navigate({ name: 'forgotPassword' })}
            onLoginSuccess={(role: string) => {
              switch (role) {
                case 'scanner':
                  resetTo({ name: 'scannerDashboard' });
                  break;
                case 'pr':
                  resetTo({ name: 'prDashboard' });
                  break;
                case 'gestore':
                  resetTo({ name: 'gestoreDashboard' });
                  break;
                case 'super_admin':
                  resetTo({ name: 'adminDashboard' });
                  break;
                default:
                  resetTo({ name: 'accountDashboard' });
              }
            }}
            onGoBack={goBack}
          />
        );

      case 'register':
        return (
          <RegisterScreen
            onNavigateLogin={() => navigate({ name: 'login' })}
            onRegisterSuccess={() => resetTo({ name: 'accountDashboard' })}
            onGoBack={goBack}
          />
        );

      case 'forgotPassword':
        return (
          <ForgotPasswordScreen
            onBack={goBack}
            onSuccess={() => navigate({ name: 'login' })}
          />
        );

      case 'events':
        return (
          <EventsListScreen
            onBack={goBack}
            onEventPress={(eventId) => navigate({ name: 'eventDetail', params: { eventId } })}
            onCartPress={() => navigate({ name: 'cart' })}
            onLoginPress={() => navigate({ name: 'login' })}
            onProfilePress={() => navigate({ name: 'profile' })}
            isAuthenticated={isAuthenticated}
          />
        );

      case 'eventDetail':
        return (
          <EventDetailScreen
            eventId={currentScreen.params.eventId}
            onBack={goBack}
            onAddToCart={() => navigate({ name: 'cart' })}
            onGoToCart={() => navigate({ name: 'cart' })}
          />
        );

      case 'cart':
        return (
          <CartScreen
            onBack={goBack}
            onCheckout={() => navigate({ name: 'checkout' })}
            onContinueShopping={() => navigate({ name: 'events' })}
          />
        );

      case 'checkout':
        return (
          <CheckoutScreen
            onBack={goBack}
            onSuccess={() => {
              clearCart();
              resetTo({ name: 'tickets' });
            }}
            cartItems={cartItems}
          />
        );

      case 'venues':
        return (
          <VenuesScreen
            onBack={goBack}
            onVenuePress={(venueId) => navigate({ name: 'venueDetail', params: { venueId } })}
          />
        );

      case 'venueDetail':
        return (
          <VenueDetailScreen
            venueId={currentScreen.params.venueId}
            onBack={goBack}
            onEventPress={(eventId) => navigate({ name: 'eventDetail', params: { eventId } })}
          />
        );

      case 'resales':
        return (
          <ResalesScreen
            onBack={goBack}
            onBuyTicket={(ticketId) => navigate({ name: 'cart' })}
            onSellTicket={() => navigate({ name: 'tickets' })}
            isAuthenticated={isAuthenticated}
          />
        );

      case 'accountDashboard':
        return (
          <AccountDashboard
            onNavigateTickets={() => navigate({ name: 'tickets' })}
            onNavigateWallet={() => navigate({ name: 'wallet' })}
            onNavigateProfile={() => navigate({ name: 'profile' })}
            onNavigateEvents={() => navigate({ name: 'events' })}
            onNavigateResales={() => navigate({ name: 'resales' })}
            onNavigateSettings={() => navigate({ name: 'settings' })}
            onNavigatePrDashboard={() => resetTo({ name: 'prDashboard' })}
            onLogout={() => resetTo({ name: 'landing' })}
            onGoBack={() => resetTo({ name: 'landing' })}
          />
        );

      case 'tickets':
        return (
          <TicketsScreen
            onBack={goBack}
            onTicketPress={(ticketId) => navigate({ name: 'ticketDetail', params: { ticketId } })}
          />
        );

      case 'ticketDetail':
        return (
          <TicketDetailScreen
            ticketId={currentScreen.params.ticketId}
            onBack={goBack}
            onResell={() => navigate({ name: 'resales' })}
            onNameChange={() => navigate({ name: 'nameChange', params: { ticketId: currentScreen.params.ticketId } })}
          />
        );

      case 'wallet':
        return (
          <WalletScreen
            onBack={goBack}
            onTopUp={() => navigate({ name: 'walletTopUp' })}
          />
        );

      case 'walletTopUp':
        return (
          <WalletTopUpScreen
            onBack={goBack}
            onSuccess={() => navigate({ name: 'wallet' })}
          />
        );

      case 'nameChange':
        return (
          <NameChangeScreen
            ticketId={currentScreen.params.ticketId}
            onBack={goBack}
            onSuccess={() => resetTo({ name: 'tickets' })}
          />
        );

      case 'subscriptions':
        return (
          <SubscriptionsScreen
            onBack={goBack}
            onExploreSubscriptions={() => navigate({ name: 'venues' })}
          />
        );

      case 'settings':
        return (
          <SettingsScreen
            onBack={goBack}
            onNavigateProfile={() => navigate({ name: 'profile' })}
            onNavigateNameChange={() => navigate({ name: 'tickets' })}
            onLogout={() => resetTo({ name: 'landing' })}
          />
        );

      case 'profile':
        return (
          <ProfileScreen
            onBack={goBack}
          />
        );

      case 'prDashboard':
        return (
          <PRDashboard
            onNavigateEvents={() => navigate({ name: 'prEvents' })}
            onNavigateWallet={() => navigate({ name: 'prWallet' })}
            onNavigateLists={() => navigate({ name: 'prEvents' })}
            onNavigateProfile={() => navigate({ name: 'prProfile' })}
            onSwitchToClient={() => resetTo({ name: 'accountDashboard' })}
            onLogout={() => resetTo({ name: 'landing' })}
          />
        );

      case 'prEvents':
        return (
          <PREventsScreen
            onGoBack={goBack}
            onSelectEvent={(eventId) => navigate({ name: 'prEventDetail', params: { eventId } })}
          />
        );

      case 'prEventDetail':
        return (
          <PREventDashboard
            eventId={currentScreen.params.eventId}
            onGoBack={goBack}
          />
        );

      case 'prWallet':
        return (
          <PRWalletScreen
            onGoBack={goBack}
            onRequestPayout={async () => {
              try {
                const result = await api.requestPrPayout();
                if (result.success) {
                  Alert.alert('Richiesta Inviata', result.message);
                }
              } catch (error: any) {
                Alert.alert('Errore', error.message || 'Errore nella richiesta');
              }
            }}
          />
        );

      case 'prProfile':
        return (
          <PRProfileScreen
            onGoBack={goBack}
            onLogout={() => resetTo({ name: 'landing' })}
          />
        );

      case 'scannerDashboard':
        return (
          <ScannerDashboard
            onNavigateEvents={() => navigate({ name: 'scannerEvents' })}
            onNavigateScan={(eventId) => navigate({ name: 'scannerScan', params: { eventId } })}
            onNavigateProfile={() => navigate({ name: 'scannerProfile' })}
            onLogout={() => resetTo({ name: 'landing' })}
          />
        );

      case 'scannerProfile':
        return (
          <ScannerProfileScreen
            onBack={goBack}
            onLogout={() => resetTo({ name: 'landing' })}
          />
        );

      case 'scannerEvents':
        return (
          <ScannerEventsScreen
            onBack={goBack}
            onEventPress={(eventId) => navigate({ name: 'scannerScan', params: { eventId } })}
          />
        );

      case 'scannerScan':
        return (
          <ScannerScanScreen
            eventId={currentScreen.params.eventId}
            onBack={goBack}
          />
        );

      // ========== GESTORE SCREENS ==========
      case 'gestoreDashboard':
        return (
          <GestoreDashboard
            onNavigateEvents={() => navigate({ name: 'gestoreEvents' })}
            onNavigateInventory={() => navigate({ name: 'gestoreInventory' })}
            onNavigateStaff={() => navigate({ name: 'gestoreStaff' })}
            onNavigateScanner={() => navigate({ name: 'gestoreScanner' })}
            onNavigateMarketing={() => navigate({ name: 'gestoreMarketing' })}
            onNavigateAccounting={() => navigate({ name: 'gestoreAccounting' })}
            onNavigateProfile={() => navigate({ name: 'gestoreProfile' })}
            onNavigateSettings={() => navigate({ name: 'gestoreSettings' })}
            onNavigateProducts={() => navigate({ name: 'gestoreProducts' })}
            onNavigatePriceLists={() => navigate({ name: 'gestorePriceLists' })}
            onNavigatePRManagement={() => navigate({ name: 'gestorePRManagement' })}
            onNavigateCompanies={() => navigate({ name: 'gestoreCompanies' })}
            onNavigateStations={() => navigate({ name: 'gestoreStations' })}
            onNavigateWarehouse={() => navigate({ name: 'gestoreWarehouse' })}
            onNavigateSuppliers={() => navigate({ name: 'gestoreSuppliers' })}
            onNavigatePersonnel={() => navigate({ name: 'gestorePersonnel' })}
            onNavigateReports={() => navigate({ name: 'gestoreReports' })}
            onNavigateCashier={() => navigate({ name: 'gestoreCashier' })}
            onNavigateUsers={() => navigate({ name: 'gestoreUsers' })}
            onNavigateSIAE={() => navigate({ name: 'gestoreSIAEDashboard' })}
            onLogout={() => resetTo({ name: 'landing' })}
          />
        );

      case 'gestoreEvents':
        return (
          <GestoreEventsScreen
            onBack={goBack}
            onEventPress={(eventId) => navigate({ name: 'gestoreEventDetail', params: { eventId } })}
            onCreateEvent={() => navigate({ name: 'gestoreCreateEvent' })}
          />
        );

      case 'gestoreEventDetail':
        return (
          <GestoreEventDetailScreen
            eventId={currentScreen.params.eventId}
            onBack={goBack}
          />
        );

      case 'gestoreCreateEvent':
        return (
          <GestoreCreateEventScreen
            onBack={goBack}
            onEventCreated={(eventId: string) => navigate({ name: 'gestoreEventDetail', params: { eventId } })}
          />
        );

      case 'gestoreInventory':
        return (
          <GestoreInventoryScreen
            onBack={goBack}
          />
        );

      case 'gestoreStaff':
        return (
          <GestoreStaffScreen
            onBack={goBack}
          />
        );

      case 'gestoreScanner':
        return (
          <GestoreScannerScreen
            onBack={goBack}
          />
        );

      case 'gestoreMarketing':
        return (
          <GestoreMarketingScreen
            onBack={goBack}
          />
        );

      case 'gestoreAccounting':
        return (
          <GestoreAccountingScreen
            onBack={goBack}
          />
        );

      case 'gestoreProfile':
        return (
          <GestoreProfileScreen
            onBack={goBack}
          />
        );

      case 'gestoreSettings':
        return (
          <GestoreSettingsScreen
            onBack={goBack}
            onLogout={() => resetTo({ name: 'landing' })}
          />
        );

      case 'gestoreProducts':
        return (
          <GestoreProductsScreen
            onBack={goBack}
          />
        );

      case 'gestorePriceLists':
        return (
          <GestorePriceListsScreen
            onBack={goBack}
          />
        );

      case 'gestorePRManagement':
        return (
          <GestorePRManagementScreen
            onBack={goBack}
          />
        );

      case 'gestoreCompanies':
        return (
          <GestoreCompaniesScreen
            onBack={goBack}
          />
        );

      case 'gestoreStations':
        return (
          <GestoreStationsScreen
            onBack={goBack}
          />
        );

      case 'gestoreWarehouse':
        return (
          <GestoreWarehouseScreen
            onBack={goBack}
          />
        );

      case 'gestoreSuppliers':
        return (
          <GestoreSuppliersScreen
            onBack={goBack}
          />
        );

      case 'gestorePersonnel':
        return (
          <GestorePersonnelScreen
            onBack={goBack}
          />
        );

      case 'gestoreReports':
        return (
          <GestoreReportsScreen
            onBack={goBack}
          />
        );

      case 'gestoreCashier':
        return (
          <GestoreCashierScreen
            onBack={goBack}
          />
        );

      case 'gestoreUsers':
        return (
          <GestoreUsersScreen
            onBack={goBack}
          />
        );

      // ========== SIAE SCREENS ==========
      case 'gestoreSIAEDashboard':
        return (
          <GestoreSIAEDashboardScreen
            onBack={goBack}
            onNavigateEvents={() => navigate({ name: 'gestoreSIAEEvents' })}
            onNavigateReports={() => navigate({ name: 'gestoreSIAEReports' })}
            onNavigateCustomers={() => navigate({ name: 'gestoreSIAECustomers' })}
            onNavigateCards={() => navigate({ name: 'gestoreSIAECards' })}
          />
        );

      case 'gestoreSIAEEvents':
        return (
          <GestoreSIAEEventsScreen
            onBack={goBack}
            onEventPress={(eventId: string) => navigate({ name: 'gestoreEventDetail', params: { eventId } })}
          />
        );

      case 'gestoreSIAEReports':
        return (
          <GestoreSIAEReportsScreen
            onBack={goBack}
          />
        );

      case 'gestoreSIAECustomers':
        return (
          <GestoreSIAECustomersScreen
            onBack={goBack}
          />
        );

      case 'gestoreSIAECards':
        return (
          <GestoreSIAECardsScreen
            onBack={goBack}
          />
        );

      case 'gestoreFloorPlan':
        return (
          <GestoreFloorPlanViewerScreen
            eventId={currentScreen.params.eventId}
            onBack={goBack}
          />
        );

      case 'gestoreTableManagement':
        return (
          <GestoreTableManagementScreen
            eventId={currentScreen.params.eventId}
            onBack={goBack}
          />
        );

      case 'gestoreGuestList':
        return (
          <GestoreGuestListScreen
            eventId={currentScreen.params.eventId}
            onBack={goBack}
          />
        );

      // ========== PHASE 4 GESTORE SCREENS ==========
      case 'gestoreLocations':
        return <GestoreLocationsScreen onBack={goBack} onLocationPress={(location) => navigate({ name: 'gestoreLocationDetail', params: { locationId: location.id } })} />;
      case 'gestoreLocationDetail':
        return <GestoreLocationDetailScreen locationId={currentScreen.params.locationId} onBack={goBack} />;
      case 'gestoreStationDetail':
        return <GestoreStationDetailScreen stationId={currentScreen.params.stationId} onBack={goBack} />;
      case 'gestorePurchaseOrders':
        return <GestorePurchaseOrdersScreen onBack={goBack} />;
      case 'gestoreConsumptionTracking':
        return <GestoreConsumptionTrackingScreen onBack={goBack} />;
      case 'gestoreNightFile':
        return <GestoreNightFileScreen onBack={goBack} />;
      case 'gestoreBeverage':
        return <GestoreBeverageScreen onBack={goBack} />;
      case 'gestorePRWallet':
        return <GestorePRWalletScreen onBack={goBack} />;
      case 'gestorePRLists':
        return <GestorePRListsScreen onBack={goBack} />;
      case 'gestorePRRewards':
        return <GestorePRRewardsScreen onBack={goBack} />;
      case 'gestoreFloorPlanEditor':
        return <GestoreFloorPlanEditorScreen locationId={currentScreen.params.locationId} onBack={goBack} />;
      case 'gestoreScannerHistory':
        return <GestoreScannerHistoryScreen onBack={goBack} />;
      case 'gestoreScannerStats':
        return <GestoreScannerStatsScreen onBack={goBack} />;
      case 'gestoreSIAETicketingConsole':
        return <GestoreSIAETicketingConsoleScreen onBack={goBack} />;
      case 'gestoreSIAEBoxOffice':
        return <GestoreSIAEBoxOfficeScreen onBack={goBack} />;
      case 'gestoreSIAETransactions':
        return <GestoreSIAETransactionsScreen onBack={goBack} />;
      case 'gestoreSIAENameChanges':
        return <GestoreSIAENameChangesScreen onBack={goBack} />;
      case 'gestoreSIAENumberedSeats':
        return <GestoreSIAENumberedSeatsScreen onBack={goBack} />;
      case 'gestoreSIAETicketTypes':
        return <GestoreSIAETicketTypesScreen onBack={goBack} />;
      case 'gestoreSIAESubscriptions':
        return <GestoreSIAESubscriptionsScreen onBack={goBack} />;
      case 'gestoreSIAEResales':
        return <GestoreSIAEResalesScreen onBack={goBack} />;
      case 'gestoreSIAETransmissions':
        return <GestoreSIAETransmissionsScreen onBack={goBack} />;
      case 'gestoreSIAEAuditLog':
        return <GestoreSIAEAuditLogScreen onBack={goBack} />;
      case 'gestoreSIAEConfig':
        return <GestoreSIAEConfigScreen onBack={goBack} />;
      case 'gestoreSIAEReportC1':
        return <GestoreSIAEReportC1Screen onBack={goBack} />;
      case 'gestoreSIAEReportC2':
        return <GestoreSIAEReportC2Screen onBack={goBack} />;
      case 'gestoreImport':
        return <GestoreImportScreen onBack={goBack} />;
      case 'gestorePrinterSettings':
        return <GestorePrinterSettingsScreen onBack={goBack} />;
      case 'gestoreBilling':
        return <GestoreBillingScreen onBack={goBack} />;
      case 'gestoreEventPageEditor':
        return <GestoreEventPageEditorScreen eventId={currentScreen.params.eventId} onBack={goBack} />;

      // ========== ADMIN SCREENS ==========
      case 'adminDashboard':
        return (
          <AdminDashboard
            onNavigateGestori={() => navigate({ name: 'adminGestori' })}
            onNavigateCompanies={() => navigate({ name: 'adminCompanies' })}
            onNavigateEvents={() => navigate({ name: 'adminEvents' })}
            onNavigateUsers={() => navigate({ name: 'adminUsers' })}
            onNavigateBilling={() => navigate({ name: 'adminBilling' })}
            onNavigateSettings={() => navigate({ name: 'adminSiteSettings' })}
            onNavigateProfile={() => navigate({ name: 'adminSettings' })}
            onNavigateNameChanges={() => navigate({ name: 'adminNameChanges' })}
            onNavigateSIAEMonitor={() => navigate({ name: 'adminSIAEMonitor' })}
            onNavigatePrinter={() => navigate({ name: 'adminPrinter' })}
            onNavigateDigitalTemplates={() => navigate({ name: 'adminDigitalTemplates' })}
            onNavigateStripeAdmin={() => navigate({ name: 'adminStripe' })}
            onNavigateSIAEApprovals={() => navigate({ name: 'adminSIAEApprovals' })}
            onNavigateSIAETables={() => navigate({ name: 'adminSIAETables' })}
            onNavigateSIAECards={() => navigate({ name: 'adminSIAECards' })}
            onNavigateSIAEConfig={() => navigate({ name: 'adminSIAEConfig' })}
            onNavigateSIAECustomers={() => navigate({ name: 'adminSIAECustomers' })}
            onNavigateSIAEConsole={() => navigate({ name: 'adminSIAEConsole' })}
            onNavigateSIAETransactions={() => navigate({ name: 'adminSIAETransactions' })}
            onNavigateSIAEBoxOffice={() => navigate({ name: 'adminSIAEBoxOffice' })}
            onNavigateSIAETransmissions={() => navigate({ name: 'adminSIAETransmissions' })}
            onNavigateSIAETicketTypes={() => navigate({ name: 'adminSIAETicketTypes' })}
            onNavigateSIAEResales={() => navigate({ name: 'adminSIAEResales' })}
            onNavigateSIAESubscriptions={() => navigate({ name: 'adminSIAESubscriptions' })}
            onNavigateSIAEAuditLogs={() => navigate({ name: 'adminSIAEAuditLogs' })}
            onNavigateBillingPlans={() => navigate({ name: 'adminBillingPlans' })}
            onNavigateBillingOrganizers={() => navigate({ name: 'adminBillingOrganizers' })}
            onNavigateBillingInvoices={() => navigate({ name: 'adminBillingInvoices' })}
            onNavigateBillingReports={() => navigate({ name: 'adminBillingReports' })}
            onLogout={() => resetTo({ name: 'landing' })}
          />
        );

      case 'adminGestori':
        return (
          <AdminGestoriScreen
            onBack={goBack}
            onGestorePress={(gestoreId: string) => navigate({ name: 'adminGestoreDetail', params: { gestoreId } })}
          />
        );

      case 'adminGestoreDetail':
        return (
          <AdminGestoreDetailScreen
            gestoreId={currentScreen.params.gestoreId}
            onBack={goBack}
            onNavigateCompany={(companyId: string) => navigate({ name: 'adminCompanyDetail', params: { companyId } })}
            onNavigateEvent={(eventId: string) => navigate({ name: 'adminEventDetail', params: { eventId } })}
            onNavigateUser={(userId: string) => navigate({ name: 'adminUserDetail', params: { userId } })}
          />
        );

      case 'adminEvents':
        return (
          <AdminEventsScreen
            onBack={goBack}
            onEventPress={(eventId: string) => navigate({ name: 'adminEventDetail', params: { eventId } })}
          />
        );

      case 'adminBilling':
        return (
          <AdminBillingScreen
            onBack={goBack}
          />
        );

      case 'adminSettings':
        return (
          <AdminSettingsScreen
            onBack={goBack}
            onLogout={() => resetTo({ name: 'landing' })}
          />
        );

      case 'adminCompanies':
        return (
          <AdminCompaniesScreen
            onBack={goBack}
            onItemPress={(companyId: string) => navigate({ name: 'adminCompanyDetail', params: { companyId } })}
          />
        );

      case 'adminUsers':
        return (
          <AdminUsersScreen
            onBack={goBack}
            onItemPress={(userId: string) => navigate({ name: 'adminUserDetail', params: { userId } })}
          />
        );

      case 'adminEventDetail':
        return (
          <AdminEventDetailScreen
            eventId={currentScreen.params.eventId}
            onBack={goBack}
          />
        );

      case 'adminCompanyDetail':
        return (
          <AdminCompanyDetailScreen
            companyId={currentScreen.params.companyId}
            onBack={goBack}
            onNavigateEvent={(eventId: string) => navigate({ name: 'adminEventDetail', params: { eventId } })}
          />
        );

      case 'adminUserDetail':
        return (
          <AdminUserDetailScreen
            userId={currentScreen.params.userId}
            onBack={goBack}
          />
        );

      case 'adminNameChanges':
        return (
          <AdminNameChangesScreen
            onBack={goBack}
          />
        );

      case 'adminSIAEMonitor':
        return (
          <AdminSIAEMonitorScreen
            onBack={goBack}
          />
        );

      case 'adminSiteSettings':
        return (
          <AdminSiteSettingsScreen
            onBack={goBack}
          />
        );

      case 'adminSIAETables':
        return (
          <AdminSIAETablesScreen
            onBack={goBack}
          />
        );

      case 'adminSIAECards':
        return (
          <AdminSIAECardsScreen
            onBack={goBack}
          />
        );

      case 'adminSIAEConfig':
        return (
          <AdminSIAEConfigScreen
            onBack={goBack}
          />
        );

      case 'adminSIAEApprovals':
        return (
          <AdminSIAEApprovalsScreen
            onBack={goBack}
          />
        );

      case 'adminSIAECustomers':
        return (
          <AdminSIAECustomersScreen
            onBack={goBack}
          />
        );

      case 'adminSIAEConsole':
        return (
          <AdminSIAEConsoleScreen
            onBack={goBack}
          />
        );

      case 'adminSIAETransactions':
        return (
          <AdminSIAETransactionsScreen
            onBack={goBack}
          />
        );

      case 'adminSIAEBoxOffice':
        return (
          <AdminSIAEBoxOfficeScreen
            onBack={goBack}
          />
        );

      case 'adminSIAETransmissions':
        return (
          <AdminSIAETransmissionsScreen
            onBack={goBack}
          />
        );

      case 'adminSIAETicketTypes':
        return (
          <AdminSIAETicketTypesScreen
            onBack={goBack}
          />
        );

      case 'adminSIAEResales':
        return (
          <AdminSIAEResalesScreen
            onBack={goBack}
          />
        );

      case 'adminSIAESubscriptions':
        return (
          <AdminSIAESubscriptionsScreen
            onBack={goBack}
          />
        );

      case 'adminSIAEAuditLogs':
        return (
          <AdminSIAEAuditLogsScreen
            onBack={goBack}
          />
        );

      case 'adminStripe':
        return (
          <AdminStripeScreen
            onBack={goBack}
          />
        );

      case 'adminPrinter':
        return (
          <AdminPrinterSettingsScreen
            onBack={goBack}
          />
        );

      case 'adminDigitalTemplates':
        return (
          <AdminDigitalTemplatesScreen
            onBack={goBack}
          />
        );

      case 'adminBillingReports':
        return (
          <AdminBillingReportsScreen
            onBack={goBack}
          />
        );

      case 'adminBillingPlans':
        return (
          <AdminBillingScreen
            onBack={goBack}
          />
        );

      case 'adminBillingOrganizers':
        return (
          <AdminBillingScreen
            onBack={goBack}
          />
        );

      case 'adminBillingInvoices':
        return (
          <AdminBillingScreen
            onBack={goBack}
          />
        );

      default:
        return (
          <LandingScreen
            onNavigateEvents={() => navigate({ name: 'events' })}
            onNavigateLogin={() => navigate({ name: 'login' })}
            onNavigateRegister={() => navigate({ name: 'register' })}
            onNavigateVenues={() => navigate({ name: 'venues' })}
            onNavigateResales={() => navigate({ name: 'resales' })}
            onNavigateAccount={() => navigate({ name: 'accountDashboard' })}
            isAuthenticated={isAuthenticated}
          />
        );
    }
  };

  return (
    <CartContext.Provider value={cartContextValue}>
      <View style={styles.container}>{renderScreen()}</View>
    </CartContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
