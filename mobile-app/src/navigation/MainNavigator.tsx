import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';
import { colors } from '../lib/theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Public Screens
import HomeScreen from '../screens/public/HomeScreen';
import EventsScreen from '../screens/public/EventsScreen';
import EventDetailScreen from '../screens/public/EventDetailScreen';
import VenuesScreen from '../screens/public/VenuesScreen';
import VenueDetailScreen from '../screens/public/VenueDetailScreen';
import ResalesScreen from '../screens/public/ResalesScreen';
import ResaleCheckoutScreen from '../screens/public/ResaleCheckoutScreen';
import CartScreen from '../screens/public/CartScreen';
import CheckoutScreen from '../screens/public/CheckoutScreen';
import CheckoutSuccessScreen from '../screens/public/CheckoutSuccessScreen';
import { LandingScreen } from '../screens/public/LandingScreen';
import { TicketVerifyScreen } from '../screens/public/TicketVerifyScreen';
import { EventShortLinkScreen } from '../screens/public/EventShortLinkScreen';

// Account Screens
import AccountHomeScreen from '../screens/account/AccountHomeScreen';
import MyTicketsScreen from '../screens/account/MyTicketsScreen';
import TicketDetailScreen from '../screens/account/TicketDetailScreen';
import ProfileScreen from '../screens/account/ProfileScreen';
import WalletScreen from '../screens/account/WalletScreen';
import NameChangeScreen from '../screens/account/NameChangeScreen';
import ResaleListingScreen from '../screens/account/ResaleListingScreen';
import MyResalesScreen from '../screens/account/MyResalesScreen';
import { AccountResaleSuccessScreen } from '../screens/account/AccountResaleSuccessScreen';
import { AccountSubscriptionsScreen } from '../screens/account/AccountSubscriptionsScreen';
import { ClientWalletScreen } from '../screens/account/ClientWalletScreen';

// Scanner Screens
import ScannerHomeScreen from '../screens/scanner/ScannerHomeScreen';
import ScannerScanScreen from '../screens/scanner/ScannerScanScreen';
import ScannerHistoryScreen from '../screens/scanner/ScannerHistoryScreen';
import ScannerStatsScreen from '../screens/scanner/ScannerStatsScreen';
import { ScannerOperatorsScreen } from '../screens/scanner/ScannerOperatorsScreen';
import { OperatorDetailScreen } from '../screens/scanner/OperatorDetailScreen';
import { ScanActivityScreen } from '../screens/scanner/ScanActivityScreen';
import { LiveScanningScreen } from '../screens/scanner/LiveScanningScreen';
import ScannerScannedScreen from '../screens/scanner/ScannerScannedScreen';
import ScannerTicketsScreen from '../screens/scanner/ScannerTicketsScreen';
import ScannerManagementScreen from '../screens/scanner/ScannerManagementScreen';

// PR Screens
import PRHomeScreen from '../screens/pr/PRHomeScreen';
import PREventsScreen from '../screens/pr/PREventsScreen';
import PRGuestListsScreen from '../screens/pr/PRGuestListsScreen';
import PRTablesScreen from '../screens/pr/PRTablesScreen';
import PRWalletScreen from '../screens/pr/PRWalletScreen';
import { PRDashboardScreen } from '../screens/pr/PRDashboardScreen';
import { PRStaffScreen } from '../screens/pr/PRStaffScreen';
import { PRMyEventsScreen } from '../screens/pr/PRMyEventsScreen';
import { PRManagementScreen } from '../screens/pr/PRManagementScreen';
import { StaffPrHomeScreen } from '../screens/pr/StaffPrHomeScreen';
import { StaffPrEventPanelScreen } from '../screens/pr/StaffPrEventPanelScreen';
import { PRScannerScreen } from '../screens/pr/PRScannerScreen';

// Cashier Screens
import CashierHomeScreen from '../screens/cashier/CashierHomeScreen';
import CashierTicketScreen from '../screens/cashier/CashierTicketScreen';
import { CassaBigliettiScreen } from '../screens/cashier/CassaBigliettiScreen';
import { CashierManagementScreen } from '../screens/cashier/CashierManagementScreen';
import { CashierDashboardScreen } from '../screens/cashier/CashierDashboardScreen';
import { EventCashierAllocationsScreen } from '../screens/cashier/EventCashierAllocationsScreen';

// Management Screens
import DashboardScreen from '../screens/management/DashboardScreen';
import ManageEventsScreen from '../screens/management/ManageEventsScreen';
import EventHubScreen from '../screens/management/EventHubScreen';
import { LocationsScreen } from '../screens/management/LocationsScreen';
import { LocationDetailScreen } from '../screens/management/LocationDetailScreen';
import { StationsScreen } from '../screens/management/StationsScreen';
import { StationDetailScreen } from '../screens/management/StationDetailScreen';
import { EventWizardScreen } from '../screens/management/EventWizardScreen';
import { EventDirectStockScreen } from '../screens/management/EventDirectStockScreen';
import { BartenderDirectStockScreen } from '../screens/management/BartenderDirectStockScreen';
import { EventFormatsScreen } from '../screens/management/EventFormatsScreen';
import { NightFileScreen } from '../screens/management/NightFileScreen';
import { PersonnelScreen } from '../screens/management/PersonnelScreen';
import { StaffScreen } from '../screens/management/StaffScreen';
import { ReportsScreen } from '../screens/management/ReportsScreen';
import { EventPageEditorScreen } from '../screens/management/EventPageEditorScreen';

// SIAE Screens
import SIAEHomeScreen from '../screens/siae/SIAEHomeScreen';
import SIAETransmissionsScreen from '../screens/siae/SIAETransmissionsScreen';
import SIAETransmissionDetailScreen from '../screens/siae/SIAETransmissionDetailScreen';
import SIAEReportsScreen from '../screens/siae/SIAEReportsScreen';
import SIAESystemConfigScreen from '../screens/siae/SIAESystemConfigScreen';
import SIAEActivationCardsScreen from '../screens/siae/SIAEActivationCardsScreen';
import SIAECustomersScreen from '../screens/siae/SIAECustomersScreen';
import SIAETicketedEventsScreen from '../screens/siae/SIAETicketedEventsScreen';
import SIAETicketsScreen from '../screens/siae/SIAETicketsScreen';
import SIAETicketTypesScreen from '../screens/siae/SIAETicketTypesScreen';
import SIAENameChangesScreen from '../screens/siae/SIAENameChangesScreen';
import SIAEResalesScreen from '../screens/siae/SIAEResalesScreen';
import SIAETransactionsScreen from '../screens/siae/SIAETransactionsScreen';
import SIAEBoxOfficeScreen from '../screens/siae/SIAEBoxOfficeScreen';
import SIAESubscriptionsScreen from '../screens/siae/SIAESubscriptionsScreen';
import SIAENumberedSeatsScreen from '../screens/siae/SIAENumberedSeatsScreen';
import SIAEAuditLogsScreen from '../screens/siae/SIAEAuditLogsScreen';
import SIAEApprovalsScreen from '../screens/siae/SIAEApprovalsScreen';
import SIAETablesScreen from '../screens/siae/SIAETablesScreen';
import SIAETicketingConsoleScreen from '../screens/siae/SIAETicketingConsoleScreen';
import SIAEReportC1Screen from '../screens/siae/SIAEReportC1Screen';
import SIAEReportC2Screen from '../screens/siae/SIAEReportC2Screen';

// Inventory Screens
import InventoryHomeScreen from '../screens/inventory/InventoryHomeScreen';
import ProductListScreen from '../screens/inventory/ProductListScreen';
import ProductDetailScreen from '../screens/inventory/ProductDetailScreen';
import StockAdjustmentScreen from '../screens/inventory/StockAdjustmentScreen';
import ConsumptionScreen from '../screens/inventory/ConsumptionScreen';
import WarehouseScreen from '../screens/inventory/WarehouseScreen';
import SuppliersScreen from '../screens/inventory/SuppliersScreen';
import ReturnToWarehouseScreen from '../screens/inventory/ReturnToWarehouseScreen';
import PurchaseOrdersScreen from '../screens/inventory/PurchaseOrdersScreen';

// Analytics Screens
import AnalyticsHomeScreen from '../screens/analytics/AnalyticsHomeScreen';
import InsightsScreen from '../screens/analytics/InsightsScreen';
import TrendsScreen from '../screens/analytics/TrendsScreen';
import PredictionsScreen from '../screens/analytics/PredictionsScreen';
import RecommendationsScreen from '../screens/analytics/RecommendationsScreen';

// Accounting Screens
import AccountingHomeScreen from '../screens/accounting/AccountingHomeScreen';
import InvoicesScreen from '../screens/accounting/InvoicesScreen';
import InvoiceDetailScreen from '../screens/accounting/InvoiceDetailScreen';
import FinancialReportsScreen from '../screens/accounting/FinancialReportsScreen';
import TransactionsScreen from '../screens/accounting/TransactionsScreen';

// Admin Screens
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import GestoriListScreen from '../screens/admin/GestoriListScreen';
import GestoreDetailScreen from '../screens/admin/GestoreDetailScreen';
import CompaniesScreen from '../screens/admin/CompaniesScreen';
import SystemSettingsScreen from '../screens/admin/SystemSettingsScreen';
import { SuperAdminDashboardScreen } from '../screens/admin/SuperAdminDashboardScreen';
import { UsersScreen } from '../screens/admin/UsersScreen';
import { AdminSiteSettingsScreen } from '../screens/admin/AdminSiteSettingsScreen';
import { AdminBillingPlansScreen } from '../screens/admin/AdminBillingPlansScreen';
import { AdminBillingOrganizersScreen } from '../screens/admin/AdminBillingOrganizersScreen';
import { AdminBillingOrganizerDetailScreen } from '../screens/admin/AdminBillingOrganizerDetailScreen';
import { AdminBillingInvoicesScreen } from '../screens/admin/AdminBillingInvoicesScreen';
import { AdminBillingReportsScreen } from '../screens/admin/AdminBillingReportsScreen';
import { AdminGestoreCompaniesScreen } from '../screens/admin/AdminGestoreCompaniesScreen';
import { AdminGestoreEventsScreen } from '../screens/admin/AdminGestoreEventsScreen';
import { AdminGestoreUsersScreen } from '../screens/admin/AdminGestoreUsersScreen';
import { AdminEventDetailScreen } from '../screens/admin/AdminEventDetailScreen';
import { AdminNameChangesScreen } from '../screens/admin/AdminNameChangesScreen';
import { StripeAdminScreen } from '../screens/admin/StripeAdminScreen';

// Floor Plan Screens
import { FloorPlanHomeScreen } from '../screens/floorplan/FloorPlanHomeScreen';
import { FloorPlanViewerScreen } from '../screens/floorplan/FloorPlanViewerScreen';
import { ZoneDetailScreen } from '../screens/floorplan/ZoneDetailScreen';
import { FloorPlanEditorScreen } from '../screens/floorplan/FloorPlanEditorScreen';

// Marketing Screens
import MarketingDashboardScreen from '../screens/marketing/MarketingDashboardScreen';
import MarketingEmailScreen from '../screens/marketing/MarketingEmailScreen';
import LoyaltyAdminScreen from '../screens/marketing/LoyaltyAdminScreen';
import ReferralAdminScreen from '../screens/marketing/ReferralAdminScreen';
import BundlesAdminScreen from '../screens/marketing/BundlesAdminScreen';

// School Badges Screens
import { SchoolBadgeManagerScreen } from '../screens/schoolbadges/SchoolBadgeManagerScreen';
import { SchoolBadgeLandingScreen } from '../screens/schoolbadges/SchoolBadgeLandingScreen';
import { SchoolBadgeVerifyScreen } from '../screens/schoolbadges/SchoolBadgeVerifyScreen';
import { SchoolBadgeViewScreen } from '../screens/schoolbadges/SchoolBadgeViewScreen';
import { SchoolBadgeErrorScreen } from '../screens/schoolbadges/SchoolBadgeErrorScreen';
import { SchoolBadgeScannerScreen } from '../screens/schoolbadges/SchoolBadgeScannerScreen';

// Settings Screens
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { PrinterSettingsScreen } from '../screens/settings/PrinterSettingsScreen';
import { TemplateBuilderScreen } from '../screens/settings/TemplateBuilderScreen';
import { DigitalTemplateBuilderScreen } from '../screens/settings/DigitalTemplateBuilderScreen';
import { DownloadSmartCardAppScreen } from '../screens/settings/DownloadSmartCardAppScreen';
import { ImportScreen } from '../screens/settings/ImportScreen';
import { PriceListsScreen } from '../screens/settings/PriceListsScreen';
import { BeverageScreen } from '../screens/settings/BeverageScreen';

// Type definitions
export type RootStackParamList = {
  Auth: undefined;
  AppDrawer: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type DrawerParamList = {
  CustomerTabs: undefined;
  ScannerTabs: undefined;
  PRTabs: undefined;
  CashierTabs: undefined;
  ManagementTabs: undefined;
  SIAETabs: undefined;
  InventoryTabs: undefined;
  AnalyticsTabs: undefined;
  AccountingTabs: undefined;
  AdminTabs: undefined;
  FloorPlanTabs: undefined;
  MarketingTabs: undefined;
  SchoolBadgesTabs: undefined;
  SettingsTabs: undefined;
};

export type FloorPlanTabParamList = {
  FloorPlanHome: undefined;
  FloorPlanViewer: undefined;
  FloorPlanEditor: undefined;
};

export type FloorPlanStackParamList = {
  FloorPlanList: undefined;
  FloorPlanViewer: { venueId: string; venueName?: string };
  ZoneDetail: { zoneId: string; zoneName?: string };
  FloorPlanEditor: { venueId?: string; zoneId?: string; mode?: 'create' | 'edit' };
};

export type AdminTabParamList = {
  AdminHome: undefined;
  Gestori: undefined;
  Companies: undefined;
  Settings: undefined;
  Users: undefined;
  Billing: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  SuperAdminDashboard: undefined;
  GestoriList: undefined;
  GestoreDetail: { gestoreId?: string; mode?: 'create' | 'edit' };
  Companies: undefined;
  SystemSettings: undefined;
  Users: undefined;
  AdminSiteSettings: undefined;
  AdminBillingPlans: undefined;
  AdminBillingOrganizers: undefined;
  AdminBillingOrganizerDetail: { organizerId: string };
  AdminBillingInvoices: undefined;
  AdminBillingReports: undefined;
  AdminGestoreCompanies: { gestoreId: string };
  AdminGestoreEvents: { gestoreId: string };
  AdminGestoreUsers: { gestoreId: string };
  AdminEventDetail: { eventId: string };
  AdminNameChanges: undefined;
  StripeAdmin: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  Events: undefined;
  Tickets: undefined;
  Account: undefined;
};

export type ScannerTabParamList = {
  ScannerHome: undefined;
  Scan: undefined;
  History: undefined;
  Stats: undefined;
};

export type PRTabParamList = {
  PRHome: undefined;
  PREvents: undefined;
  PRWallet: undefined;
  PRManagement: undefined;
};

export type CashierTabParamList = {
  CashierHome: undefined;
  CashierTicket: undefined;
  CassaBiglietti: undefined;
};

export type ManagementTabParamList = {
  Dashboard: undefined;
  ManageEvents: undefined;
  Locations: undefined;
  Personnel: undefined;
};

export type PublicStackParamList = {
  EventsList: undefined;
  EventDetail: { eventId: string };
  VenuesList: undefined;
  VenueDetail: { venueId: string };
  Resales: undefined;
  ResaleCheckout: { resaleId: string };
  Cart: undefined;
  Checkout: undefined;
  CheckoutSuccess: { transactionId: string };
  Landing: undefined;
  TicketVerify: { ticketCode: string };
  EventShortLink: { shortCode: string };
};

export type AccountStackParamList = {
  AccountHome: undefined;
  MyTickets: undefined;
  TicketDetail: { ticketId: string };
  Profile: undefined;
  Wallet: undefined;
  NameChange: { ticketId: string };
  ResaleListing: { ticketId: string };
  MyResales: undefined;
  AccountResaleSuccess: { resaleId: string };
  AccountSubscriptions: undefined;
  ClientWallet: undefined;
};

export type ScannerStackParamList = {
  ScannerDashboard: undefined;
  ScannerScan: { eventId?: string; eventTitle?: string };
  ScannerHistory: { eventId?: string };
  ScannerStats: { eventId?: string };
  ScannerOperators: undefined;
  OperatorDetail: { operatorId?: string; mode: 'create' | 'edit' };
  ScanActivity: undefined;
  LiveScanning: { eventId?: string; eventTitle?: string };
  ScannerScanned: { eventId?: string };
  ScannerTickets: { eventId?: string };
  ScannerManagement: undefined;
};

export type PRStackParamList = {
  PRDashboard: undefined;
  PREventsList: undefined;
  PRGuestLists: { eventId: string };
  PRTables: { eventId: string };
  PRWalletScreen: undefined;
  PRStaff: undefined;
  PRMyEvents: undefined;
  PRManagement: undefined;
  StaffPrHome: undefined;
  StaffPrEventPanel: { eventId: string };
  PRScanner: { eventId?: string };
};

export type CashierStackParamList = {
  CashierDashboard: undefined;
  CashierTicket: undefined;
  CassaBiglietti: { eventId?: string };
  CashierManagement: undefined;
  EventCashierAllocations: { eventId: string };
};

export type ManagementStackParamList = {
  ManagementDashboard: undefined;
  ManagementEvents: undefined;
  EventHub: { eventId: string };
  Locations: undefined;
  LocationDetail: { locationId?: string; mode?: 'create' | 'edit' };
  Stations: undefined;
  StationDetail: { stationId?: string; mode?: 'create' | 'edit' };
  EventWizard: { eventId?: string; step?: number };
  EventDirectStock: { eventId: string };
  BartenderDirectStock: { eventId: string; bartenderId?: string };
  EventFormats: undefined;
  NightFile: { eventId: string };
  Personnel: undefined;
  Staff: undefined;
  Reports: undefined;
  EventPageEditor: { eventId: string };
};

export type SIAETabParamList = {
  SIAEHome: undefined;
  SIAETransmissions: undefined;
  SIAEReports: undefined;
  SIAEConfig: undefined;
};

export type SIAEStackParamList = {
  SIAEDashboard: undefined;
  SIAETransmissions: undefined;
  SIAETransmissionDetail: { transmissionId: number };
  SIAEReports: { defaultType?: string };
  SIAESystemConfig: undefined;
  SIAEActivationCards: undefined;
  SIAECustomers: undefined;
  SIAETicketedEvents: undefined;
  SIAETickets: { eventId?: string };
  SIAETicketTypes: undefined;
  SIAENameChanges: undefined;
  SIAEResales: undefined;
  SIAETransactions: undefined;
  SIAEBoxOffice: { eventId?: string };
  SIAESubscriptions: undefined;
  SIAENumberedSeats: { eventId?: string };
  SIAEAuditLogs: undefined;
  SIAEApprovals: undefined;
  SIAETables: undefined;
  SIAETicketingConsole: { eventId?: string };
  SIAEReportC1: { eventId?: string };
  SIAEReportC2: { eventId?: string };
};

export type InventoryTabParamList = {
  InventoryHome: undefined;
  Products: undefined;
  Consumption: undefined;
  Warehouse: undefined;
};

export type InventoryStackParamList = {
  InventoryDashboard: undefined;
  ProductList: undefined;
  ProductDetail: { productId: string };
  StockAdjustment: { productId?: string; type?: 'add' | 'remove' | 'set' };
  Consumption: undefined;
  Warehouse: undefined;
  Suppliers: undefined;
  ReturnToWarehouse: { eventId?: string };
  PurchaseOrders: undefined;
};

export type AnalyticsTabParamList = {
  AnalyticsHome: undefined;
  Insights: undefined;
  Trends: undefined;
  Predictions: undefined;
  Recommendations: undefined;
};

export type AnalyticsStackParamList = {
  AnalyticsDashboard: undefined;
  Insights: undefined;
  Trends: undefined;
  Predictions: undefined;
  Recommendations: undefined;
};

export type AccountingTabParamList = {
  AccountingHome: undefined;
  Invoices: undefined;
  Transactions: undefined;
  FinancialReports: undefined;
};

export type AccountingStackParamList = {
  AccountingDashboard: undefined;
  Invoices: undefined;
  InvoiceDetail: { invoiceId: string };
  Transactions: undefined;
  FinancialReports: { export?: boolean };
};

export type MarketingTabParamList = {
  MarketingHome: undefined;
  Email: undefined;
  Loyalty: undefined;
  Referrals: undefined;
};

export type MarketingStackParamList = {
  MarketingDashboard: undefined;
  MarketingEmail: undefined;
  LoyaltyAdmin: undefined;
  ReferralAdmin: undefined;
  BundlesAdmin: undefined;
};

export type SchoolBadgesTabParamList = {
  SchoolBadgesHome: undefined;
  SchoolBadgesScanner: undefined;
};

export type SchoolBadgesStackParamList = {
  SchoolBadgeManager: undefined;
  SchoolBadgeLanding: { badgeId?: string };
  SchoolBadgeVerify: { badgeCode: string };
  SchoolBadgeView: { badgeId: string };
  SchoolBadgeError: { errorCode?: string };
  SchoolBadgeScanner: undefined;
};

export type SettingsTabParamList = {
  SettingsHome: undefined;
  Printers: undefined;
  Templates: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  PrinterSettings: undefined;
  TemplateBuilder: { templateId?: string };
  DigitalTemplateBuilder: { templateId?: string };
  DownloadSmartCardApp: undefined;
  Import: undefined;
  PriceLists: undefined;
  Beverage: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// Customer tabs and stacks
const CustomerTab = createBottomTabNavigator<CustomerTabParamList>();
const PublicStack = createNativeStackNavigator<PublicStackParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();

// Scanner tabs and stacks
const ScannerTab = createBottomTabNavigator<ScannerTabParamList>();
const ScannerStack = createNativeStackNavigator<ScannerStackParamList>();

// PR tabs and stacks
const PRTab = createBottomTabNavigator<PRTabParamList>();
const PRStack = createNativeStackNavigator<PRStackParamList>();

// Cashier tabs and stacks
const CashierTab = createBottomTabNavigator<CashierTabParamList>();
const CashierStack = createNativeStackNavigator<CashierStackParamList>();

// Management tabs and stacks
const ManagementTab = createBottomTabNavigator<ManagementTabParamList>();
const ManagementStack = createNativeStackNavigator<ManagementStackParamList>();

// SIAE tabs and stacks
const SIAETab = createBottomTabNavigator<SIAETabParamList>();
const SIAEStack = createNativeStackNavigator<SIAEStackParamList>();

// Inventory tabs and stacks
const InventoryTab = createBottomTabNavigator<InventoryTabParamList>();
const InventoryStack = createNativeStackNavigator<InventoryStackParamList>();

// Analytics tabs and stacks
const AnalyticsTab = createBottomTabNavigator<AnalyticsTabParamList>();
const AnalyticsStack = createNativeStackNavigator<AnalyticsStackParamList>();

// Accounting tabs and stacks
const AccountingTab = createBottomTabNavigator<AccountingTabParamList>();
const AccountingStack = createNativeStackNavigator<AccountingStackParamList>();

// Admin tabs and stacks
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

// Floor Plan tabs and stacks
const FloorPlanTab = createBottomTabNavigator<FloorPlanTabParamList>();
const FloorPlanStack = createNativeStackNavigator<FloorPlanStackParamList>();

// Marketing tabs and stacks
const MarketingTab = createBottomTabNavigator<MarketingTabParamList>();
const MarketingStack = createNativeStackNavigator<MarketingStackParamList>();

// School Badges tabs and stacks
const SchoolBadgesTab = createBottomTabNavigator<SchoolBadgesTabParamList>();
const SchoolBadgesStack = createNativeStackNavigator<SchoolBadgesStackParamList>();

// Settings tabs and stacks
const SettingsTab = createBottomTabNavigator<SettingsTabParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

// ============= Auth Navigator =============
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// ============= Customer Stacks =============
function HomeStack() {
  return (
    <PublicStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <PublicStack.Screen name="EventsList" component={HomeScreen} />
      <PublicStack.Screen name="EventDetail" component={EventDetailScreen} />
      <PublicStack.Screen name="VenuesList" component={VenuesScreen} />
      <PublicStack.Screen name="VenueDetail" component={VenueDetailScreen} />
      <PublicStack.Screen name="Resales" component={ResalesScreen} />
      <PublicStack.Screen name="ResaleCheckout" component={ResaleCheckoutScreen} />
      <PublicStack.Screen name="Cart" component={CartScreen} />
      <PublicStack.Screen name="Checkout" component={CheckoutScreen} />
      <PublicStack.Screen name="CheckoutSuccess" component={CheckoutSuccessScreen} />
      <PublicStack.Screen name="Landing" component={LandingScreen} />
      <PublicStack.Screen name="TicketVerify" component={TicketVerifyScreen} />
      <PublicStack.Screen name="EventShortLink" component={EventShortLinkScreen} />
    </PublicStack.Navigator>
  );
}

function EventsStack() {
  return (
    <PublicStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <PublicStack.Screen name="EventsList" component={EventsScreen} />
      <PublicStack.Screen name="EventDetail" component={EventDetailScreen} />
    </PublicStack.Navigator>
  );
}

function TicketsStack() {
  return (
    <AccountStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AccountStack.Screen name="MyTickets" component={MyTicketsScreen} />
      <AccountStack.Screen name="TicketDetail" component={TicketDetailScreen} />
      <AccountStack.Screen name="NameChange" component={NameChangeScreen} />
      <AccountStack.Screen name="ResaleListing" component={ResaleListingScreen} />
      <AccountStack.Screen name="MyResales" component={MyResalesScreen} />
      <AccountStack.Screen name="AccountResaleSuccess" component={AccountResaleSuccessScreen} />
    </AccountStack.Navigator>
  );
}

function AccountNavigator() {
  return (
    <AccountStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AccountStack.Screen name="AccountHome" component={AccountHomeScreen} />
      <AccountStack.Screen name="Profile" component={ProfileScreen} />
      <AccountStack.Screen name="Wallet" component={WalletScreen} />
      <AccountStack.Screen name="MyResales" component={MyResalesScreen} />
      <AccountStack.Screen name="AccountSubscriptions" component={AccountSubscriptionsScreen} />
      <AccountStack.Screen name="ClientWallet" component={ClientWalletScreen} />
    </AccountStack.Navigator>
  );
}

function CustomerTabs() {
  return (
    <CustomerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Tickets':
              iconName = focused ? 'ticket' : 'ticket-outline';
              break;
            case 'Account':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'home-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <CustomerTab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Home' }} />
      <CustomerTab.Screen name="Events" component={EventsStack} options={{ tabBarLabel: 'Eventi' }} />
      <CustomerTab.Screen name="Tickets" component={TicketsStack} options={{ tabBarLabel: 'Biglietti' }} />
      <CustomerTab.Screen name="Account" component={AccountNavigator} options={{ tabBarLabel: 'Account' }} />
    </CustomerTab.Navigator>
  );
}

// ============= Scanner Stacks =============
function ScannerHomeStack() {
  return (
    <ScannerStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ScannerStack.Screen name="ScannerDashboard" component={ScannerHomeScreen} />
      <ScannerStack.Screen name="ScannerOperators" component={ScannerOperatorsScreen} />
      <ScannerStack.Screen name="OperatorDetail" component={OperatorDetailScreen} />
      <ScannerStack.Screen name="ScanActivity" component={ScanActivityScreen} />
      <ScannerStack.Screen name="LiveScanning" component={LiveScanningScreen} />
      <ScannerStack.Screen name="ScannerScanned" component={ScannerScannedScreen} />
      <ScannerStack.Screen name="ScannerTickets" component={ScannerTicketsScreen} />
      <ScannerStack.Screen name="ScannerManagement" component={ScannerManagementScreen} />
    </ScannerStack.Navigator>
  );
}

function ScannerScanStack() {
  return (
    <ScannerStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ScannerStack.Screen name="ScannerScan" component={ScannerScanScreen} />
    </ScannerStack.Navigator>
  );
}

function ScannerHistoryStack() {
  return (
    <ScannerStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ScannerStack.Screen name="ScannerHistory" component={ScannerHistoryScreen} />
    </ScannerStack.Navigator>
  );
}

function ScannerStatsStack() {
  return (
    <ScannerStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ScannerStack.Screen name="ScannerStats" component={ScannerStatsScreen} />
    </ScannerStack.Navigator>
  );
}

function ScannerTabs() {
  return (
    <ScannerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'ScannerHome':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Scan':
              iconName = focused ? 'scan' : 'scan-outline';
              break;
            case 'History':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Stats':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            default:
              iconName = 'home-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <ScannerTab.Screen name="ScannerHome" component={ScannerHomeStack} options={{ tabBarLabel: 'Home' }} />
      <ScannerTab.Screen name="Scan" component={ScannerScanStack} options={{ tabBarLabel: 'Scansiona' }} />
      <ScannerTab.Screen name="History" component={ScannerHistoryStack} options={{ tabBarLabel: 'Storico' }} />
      <ScannerTab.Screen name="Stats" component={ScannerStatsStack} options={{ tabBarLabel: 'Statistiche' }} />
    </ScannerTab.Navigator>
  );
}

// ============= PR Stacks =============
function PRHomeStack() {
  return (
    <PRStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <PRStack.Screen name="PRDashboard" component={PRHomeScreen} />
      <PRStack.Screen name="PRGuestLists" component={PRGuestListsScreen} />
      <PRStack.Screen name="PRTables" component={PRTablesScreen} />
      <PRStack.Screen name="PRStaff" component={PRStaffScreen} />
      <PRStack.Screen name="PRMyEvents" component={PRMyEventsScreen} />
      <PRStack.Screen name="StaffPrHome" component={StaffPrHomeScreen} />
      <PRStack.Screen name="StaffPrEventPanel" component={StaffPrEventPanelScreen} />
      <PRStack.Screen name="PRScanner" component={PRScannerScreen} />
    </PRStack.Navigator>
  );
}

function PREventsStack() {
  return (
    <PRStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <PRStack.Screen name="PREventsList" component={PREventsScreen} />
      <PRStack.Screen name="PRGuestLists" component={PRGuestListsScreen} />
      <PRStack.Screen name="PRTables" component={PRTablesScreen} />
    </PRStack.Navigator>
  );
}

function PRManagementStack() {
  return (
    <PRStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <PRStack.Screen name="PRManagement" component={PRManagementScreen} />
      <PRStack.Screen name="PRStaff" component={PRStaffScreen} />
    </PRStack.Navigator>
  );
}

function PRTabs() {
  return (
    <PRTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'PRHome':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'PREvents':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'PRWallet':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'PRManagement':
              iconName = focused ? 'people' : 'people-outline';
              break;
            default:
              iconName = 'home-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <PRTab.Screen name="PRHome" component={PRHomeStack} options={{ tabBarLabel: 'Home' }} />
      <PRTab.Screen name="PREvents" component={PREventsStack} options={{ tabBarLabel: 'Eventi' }} />
      <PRTab.Screen name="PRWallet" component={PRWalletScreen} options={{ tabBarLabel: 'Wallet' }} />
      <PRTab.Screen name="PRManagement" component={PRManagementStack} options={{ tabBarLabel: 'Gestione' }} />
    </PRTab.Navigator>
  );
}

// ============= Cashier Stacks =============
function CashierHomeStack() {
  return (
    <CashierStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <CashierStack.Screen name="CashierDashboard" component={CashierHomeScreen} />
      <CashierStack.Screen name="CashierManagement" component={CashierManagementScreen} />
      <CashierStack.Screen name="EventCashierAllocations" component={EventCashierAllocationsScreen} />
    </CashierStack.Navigator>
  );
}

function CashierTicketStack() {
  return (
    <CashierStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <CashierStack.Screen name="CashierTicket" component={CashierTicketScreen} />
    </CashierStack.Navigator>
  );
}

function CassaBigliettiStackNav() {
  return (
    <CashierStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <CashierStack.Screen name="CassaBiglietti" component={CassaBigliettiScreen} />
    </CashierStack.Navigator>
  );
}

function CashierTabs() {
  return (
    <CashierTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'CashierHome':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'CashierTicket':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'CassaBiglietti':
              iconName = focused ? 'ticket' : 'ticket-outline';
              break;
            default:
              iconName = 'home-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <CashierTab.Screen name="CashierHome" component={CashierHomeStack} options={{ tabBarLabel: 'Dashboard' }} />
      <CashierTab.Screen name="CashierTicket" component={CashierTicketStack} options={{ tabBarLabel: 'Emetti Biglietto' }} />
      <CashierTab.Screen name="CassaBiglietti" component={CassaBigliettiStackNav} options={{ tabBarLabel: 'Cassa Biglietti' }} />
    </CashierTab.Navigator>
  );
}

// ============= Management Stacks =============
function ManagementHomeStack() {
  return (
    <ManagementStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ManagementStack.Screen name="ManagementDashboard" component={DashboardScreen} />
      <ManagementStack.Screen name="EventHub" component={EventHubScreen} />
      <ManagementStack.Screen name="EventWizard" component={EventWizardScreen} />
      <ManagementStack.Screen name="EventDirectStock" component={EventDirectStockScreen} />
      <ManagementStack.Screen name="BartenderDirectStock" component={BartenderDirectStockScreen} />
      <ManagementStack.Screen name="NightFile" component={NightFileScreen} />
      <ManagementStack.Screen name="Reports" component={ReportsScreen} />
      <ManagementStack.Screen name="EventPageEditor" component={EventPageEditorScreen} />
    </ManagementStack.Navigator>
  );
}

function ManagementEventsStack() {
  return (
    <ManagementStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ManagementStack.Screen name="ManagementEvents" component={ManageEventsScreen} />
      <ManagementStack.Screen name="EventHub" component={EventHubScreen} />
      <ManagementStack.Screen name="EventWizard" component={EventWizardScreen} />
      <ManagementStack.Screen name="EventFormats" component={EventFormatsScreen} />
    </ManagementStack.Navigator>
  );
}

function ManagementLocationsStack() {
  return (
    <ManagementStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ManagementStack.Screen name="Locations" component={LocationsScreen} />
      <ManagementStack.Screen name="LocationDetail" component={LocationDetailScreen} />
      <ManagementStack.Screen name="Stations" component={StationsScreen} />
      <ManagementStack.Screen name="StationDetail" component={StationDetailScreen} />
    </ManagementStack.Navigator>
  );
}

function ManagementPersonnelStack() {
  return (
    <ManagementStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ManagementStack.Screen name="Personnel" component={PersonnelScreen} />
      <ManagementStack.Screen name="Staff" component={StaffScreen} />
    </ManagementStack.Navigator>
  );
}

function ManagementTabs() {
  return (
    <ManagementTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'ManageEvents':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Locations':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'Personnel':
              iconName = focused ? 'people' : 'people-outline';
              break;
            default:
              iconName = 'home-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <ManagementTab.Screen name="Dashboard" component={ManagementHomeStack} options={{ tabBarLabel: 'Dashboard' }} />
      <ManagementTab.Screen name="ManageEvents" component={ManagementEventsStack} options={{ tabBarLabel: 'Eventi' }} />
      <ManagementTab.Screen name="Locations" component={ManagementLocationsStack} options={{ tabBarLabel: 'Location' }} />
      <ManagementTab.Screen name="Personnel" component={ManagementPersonnelStack} options={{ tabBarLabel: 'Personale' }} />
    </ManagementTab.Navigator>
  );
}

// ============= SIAE Stacks =============
function SIAEHomeStack() {
  return (
    <SIAEStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SIAEStack.Screen name="SIAEDashboard" component={SIAEHomeScreen} />
      <SIAEStack.Screen name="SIAETransmissions" component={SIAETransmissionsScreen} />
      <SIAEStack.Screen name="SIAETransmissionDetail" component={SIAETransmissionDetailScreen} />
      <SIAEStack.Screen name="SIAEReports" component={SIAEReportsScreen} />
      <SIAEStack.Screen name="SIAEActivationCards" component={SIAEActivationCardsScreen} />
      <SIAEStack.Screen name="SIAECustomers" component={SIAECustomersScreen} />
      <SIAEStack.Screen name="SIAETicketedEvents" component={SIAETicketedEventsScreen} />
      <SIAEStack.Screen name="SIAETickets" component={SIAETicketsScreen} />
      <SIAEStack.Screen name="SIAETicketTypes" component={SIAETicketTypesScreen} />
      <SIAEStack.Screen name="SIAENameChanges" component={SIAENameChangesScreen} />
      <SIAEStack.Screen name="SIAEResales" component={SIAEResalesScreen} />
      <SIAEStack.Screen name="SIAETransactions" component={SIAETransactionsScreen} />
      <SIAEStack.Screen name="SIAEBoxOffice" component={SIAEBoxOfficeScreen} />
      <SIAEStack.Screen name="SIAESubscriptions" component={SIAESubscriptionsScreen} />
      <SIAEStack.Screen name="SIAENumberedSeats" component={SIAENumberedSeatsScreen} />
      <SIAEStack.Screen name="SIAEAuditLogs" component={SIAEAuditLogsScreen} />
      <SIAEStack.Screen name="SIAEApprovals" component={SIAEApprovalsScreen} />
      <SIAEStack.Screen name="SIAETables" component={SIAETablesScreen} />
      <SIAEStack.Screen name="SIAETicketingConsole" component={SIAETicketingConsoleScreen} />
      <SIAEStack.Screen name="SIAEReportC1" component={SIAEReportC1Screen} />
      <SIAEStack.Screen name="SIAEReportC2" component={SIAEReportC2Screen} />
    </SIAEStack.Navigator>
  );
}

function SIAETransmissionsStack() {
  return (
    <SIAEStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SIAEStack.Screen name="SIAETransmissions" component={SIAETransmissionsScreen} />
      <SIAEStack.Screen name="SIAETransmissionDetail" component={SIAETransmissionDetailScreen} />
    </SIAEStack.Navigator>
  );
}

function SIAEReportsStack() {
  return (
    <SIAEStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SIAEStack.Screen name="SIAEReports" component={SIAEReportsScreen} />
      <SIAEStack.Screen name="SIAETransmissionDetail" component={SIAETransmissionDetailScreen} />
      <SIAEStack.Screen name="SIAEReportC1" component={SIAEReportC1Screen} />
      <SIAEStack.Screen name="SIAEReportC2" component={SIAEReportC2Screen} />
    </SIAEStack.Navigator>
  );
}

function SIAEConfigStack() {
  return (
    <SIAEStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SIAEStack.Screen name="SIAESystemConfig" component={SIAESystemConfigScreen} />
      <SIAEStack.Screen name="SIAEActivationCards" component={SIAEActivationCardsScreen} />
    </SIAEStack.Navigator>
  );
}

function SIAETabs() {
  return (
    <SIAETab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'SIAEHome':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'SIAETransmissions':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'SIAEReports':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'SIAEConfig':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'home-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <SIAETab.Screen name="SIAEHome" component={SIAEHomeStack} options={{ tabBarLabel: 'SIAE' }} />
      <SIAETab.Screen name="SIAETransmissions" component={SIAETransmissionsStack} options={{ tabBarLabel: 'Trasmissioni' }} />
      <SIAETab.Screen name="SIAEReports" component={SIAEReportsStack} options={{ tabBarLabel: 'Report' }} />
      <SIAETab.Screen name="SIAEConfig" component={SIAEConfigStack} options={{ tabBarLabel: 'Config' }} />
    </SIAETab.Navigator>
  );
}

// ============= Inventory Stacks =============
function InventoryHomeStack() {
  return (
    <InventoryStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <InventoryStack.Screen name="InventoryDashboard" component={InventoryHomeScreen} />
      <InventoryStack.Screen name="ProductList" component={ProductListScreen} />
      <InventoryStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <InventoryStack.Screen name="StockAdjustment" component={StockAdjustmentScreen} />
      <InventoryStack.Screen name="Consumption" component={ConsumptionScreen} />
      <InventoryStack.Screen name="Suppliers" component={SuppliersScreen} />
      <InventoryStack.Screen name="ReturnToWarehouse" component={ReturnToWarehouseScreen} />
      <InventoryStack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} />
    </InventoryStack.Navigator>
  );
}

function InventoryProductsStack() {
  return (
    <InventoryStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <InventoryStack.Screen name="ProductList" component={ProductListScreen} />
      <InventoryStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <InventoryStack.Screen name="StockAdjustment" component={StockAdjustmentScreen} />
    </InventoryStack.Navigator>
  );
}

function InventoryConsumptionStack() {
  return (
    <InventoryStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <InventoryStack.Screen name="Consumption" component={ConsumptionScreen} />
    </InventoryStack.Navigator>
  );
}

function InventoryWarehouseStack() {
  return (
    <InventoryStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <InventoryStack.Screen name="Warehouse" component={WarehouseScreen} />
      <InventoryStack.Screen name="Suppliers" component={SuppliersScreen} />
      <InventoryStack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} />
      <InventoryStack.Screen name="ReturnToWarehouse" component={ReturnToWarehouseScreen} />
    </InventoryStack.Navigator>
  );
}

function InventoryTabs() {
  return (
    <InventoryTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'InventoryHome':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Products':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'Consumption':
              iconName = focused ? 'remove-circle' : 'remove-circle-outline';
              break;
            case 'Warehouse':
              iconName = focused ? 'business' : 'business-outline';
              break;
            default:
              iconName = 'grid-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <InventoryTab.Screen name="InventoryHome" component={InventoryHomeStack} options={{ tabBarLabel: 'Magazzino' }} />
      <InventoryTab.Screen name="Products" component={InventoryProductsStack} options={{ tabBarLabel: 'Prodotti' }} />
      <InventoryTab.Screen name="Consumption" component={InventoryConsumptionStack} options={{ tabBarLabel: 'Consumo' }} />
      <InventoryTab.Screen name="Warehouse" component={InventoryWarehouseStack} options={{ tabBarLabel: 'Deposito' }} />
    </InventoryTab.Navigator>
  );
}

// ============= Analytics Stacks =============
function AnalyticsHomeStack() {
  return (
    <AnalyticsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AnalyticsStack.Screen name="AnalyticsDashboard" component={AnalyticsHomeScreen} />
      <AnalyticsStack.Screen name="Insights" component={InsightsScreen} />
      <AnalyticsStack.Screen name="Trends" component={TrendsScreen} />
      <AnalyticsStack.Screen name="Predictions" component={PredictionsScreen} />
      <AnalyticsStack.Screen name="Recommendations" component={RecommendationsScreen} />
    </AnalyticsStack.Navigator>
  );
}

function AnalyticsInsightsStack() {
  return (
    <AnalyticsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AnalyticsStack.Screen name="Insights" component={InsightsScreen} />
    </AnalyticsStack.Navigator>
  );
}

function AnalyticsTrendsStack() {
  return (
    <AnalyticsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AnalyticsStack.Screen name="Trends" component={TrendsScreen} />
    </AnalyticsStack.Navigator>
  );
}

function AnalyticsPredictionsStack() {
  return (
    <AnalyticsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AnalyticsStack.Screen name="Predictions" component={PredictionsScreen} />
    </AnalyticsStack.Navigator>
  );
}

function AnalyticsRecommendationsStack() {
  return (
    <AnalyticsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AnalyticsStack.Screen name="Recommendations" component={RecommendationsScreen} />
    </AnalyticsStack.Navigator>
  );
}

function AnalyticsTabs() {
  return (
    <AnalyticsTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'AnalyticsHome':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Insights':
              iconName = focused ? 'bulb' : 'bulb-outline';
              break;
            case 'Trends':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
            case 'Predictions':
              iconName = focused ? 'sparkles' : 'sparkles-outline';
              break;
            case 'Recommendations':
              iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
              break;
            default:
              iconName = 'analytics-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <AnalyticsTab.Screen name="AnalyticsHome" component={AnalyticsHomeStack} options={{ tabBarLabel: 'Home' }} />
      <AnalyticsTab.Screen name="Insights" component={AnalyticsInsightsStack} options={{ tabBarLabel: 'Insights' }} />
      <AnalyticsTab.Screen name="Trends" component={AnalyticsTrendsStack} options={{ tabBarLabel: 'Trend' }} />
      <AnalyticsTab.Screen name="Predictions" component={AnalyticsPredictionsStack} options={{ tabBarLabel: 'Previsioni' }} />
      <AnalyticsTab.Screen name="Recommendations" component={AnalyticsRecommendationsStack} options={{ tabBarLabel: 'Azioni' }} />
    </AnalyticsTab.Navigator>
  );
}

// ============= Accounting Stacks =============
function AccountingHomeStack() {
  return (
    <AccountingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AccountingStack.Screen name="AccountingDashboard" component={AccountingHomeScreen} />
      <AccountingStack.Screen name="Invoices" component={InvoicesScreen} />
      <AccountingStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <AccountingStack.Screen name="Transactions" component={TransactionsScreen} />
      <AccountingStack.Screen name="FinancialReports" component={FinancialReportsScreen} />
    </AccountingStack.Navigator>
  );
}

function AccountingInvoicesStack() {
  return (
    <AccountingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AccountingStack.Screen name="Invoices" component={InvoicesScreen} />
      <AccountingStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
    </AccountingStack.Navigator>
  );
}

function AccountingTransactionsStack() {
  return (
    <AccountingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AccountingStack.Screen name="Transactions" component={TransactionsScreen} />
    </AccountingStack.Navigator>
  );
}

function AccountingReportsStack() {
  return (
    <AccountingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AccountingStack.Screen name="FinancialReports" component={FinancialReportsScreen} />
    </AccountingStack.Navigator>
  );
}

function AccountingTabs() {
  return (
    <AccountingTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'AccountingHome':
              iconName = focused ? 'calculator' : 'calculator-outline';
              break;
            case 'Invoices':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'swap-vertical' : 'swap-vertical-outline';
              break;
            case 'FinancialReports':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            default:
              iconName = 'calculator-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <AccountingTab.Screen name="AccountingHome" component={AccountingHomeStack} options={{ tabBarLabel: 'Home' }} />
      <AccountingTab.Screen name="Invoices" component={AccountingInvoicesStack} options={{ tabBarLabel: 'Fatture' }} />
      <AccountingTab.Screen name="Transactions" component={AccountingTransactionsStack} options={{ tabBarLabel: 'Movimenti' }} />
      <AccountingTab.Screen name="FinancialReports" component={AccountingReportsStack} options={{ tabBarLabel: 'Report' }} />
    </AccountingTab.Navigator>
  );
}

// ============= Admin Stacks =============
function AdminHomeStack() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AdminStack.Screen name="AdminDashboard" component={AdminHomeScreen} />
      <AdminStack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} />
      <AdminStack.Screen name="GestoriList" component={GestoriListScreen} />
      <AdminStack.Screen name="GestoreDetail" component={GestoreDetailScreen} />
      <AdminStack.Screen name="Companies" component={CompaniesScreen} />
      <AdminStack.Screen name="SystemSettings" component={SystemSettingsScreen} />
      <AdminStack.Screen name="AdminSiteSettings" component={AdminSiteSettingsScreen} />
      <AdminStack.Screen name="AdminNameChanges" component={AdminNameChangesScreen} />
      <AdminStack.Screen name="StripeAdmin" component={StripeAdminScreen} />
      <AdminStack.Screen name="AdminGestoreCompanies" component={AdminGestoreCompaniesScreen} />
      <AdminStack.Screen name="AdminGestoreEvents" component={AdminGestoreEventsScreen} />
      <AdminStack.Screen name="AdminGestoreUsers" component={AdminGestoreUsersScreen} />
      <AdminStack.Screen name="AdminEventDetail" component={AdminEventDetailScreen} />
    </AdminStack.Navigator>
  );
}

function AdminGestoriStack() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AdminStack.Screen name="GestoriList" component={GestoriListScreen} />
      <AdminStack.Screen name="GestoreDetail" component={GestoreDetailScreen} />
      <AdminStack.Screen name="AdminGestoreCompanies" component={AdminGestoreCompaniesScreen} />
      <AdminStack.Screen name="AdminGestoreEvents" component={AdminGestoreEventsScreen} />
      <AdminStack.Screen name="AdminGestoreUsers" component={AdminGestoreUsersScreen} />
    </AdminStack.Navigator>
  );
}

function AdminCompaniesStack() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AdminStack.Screen name="Companies" component={CompaniesScreen} />
    </AdminStack.Navigator>
  );
}

function AdminSettingsStack() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AdminStack.Screen name="SystemSettings" component={SystemSettingsScreen} />
      <AdminStack.Screen name="AdminSiteSettings" component={AdminSiteSettingsScreen} />
      <AdminStack.Screen name="StripeAdmin" component={StripeAdminScreen} />
    </AdminStack.Navigator>
  );
}

function AdminUsersStack() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AdminStack.Screen name="Users" component={UsersScreen} />
      <AdminStack.Screen name="AdminNameChanges" component={AdminNameChangesScreen} />
    </AdminStack.Navigator>
  );
}

function AdminBillingStack() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AdminStack.Screen name="AdminBillingPlans" component={AdminBillingPlansScreen} />
      <AdminStack.Screen name="AdminBillingOrganizers" component={AdminBillingOrganizersScreen} />
      <AdminStack.Screen name="AdminBillingOrganizerDetail" component={AdminBillingOrganizerDetailScreen} />
      <AdminStack.Screen name="AdminBillingInvoices" component={AdminBillingInvoicesScreen} />
      <AdminStack.Screen name="AdminBillingReports" component={AdminBillingReportsScreen} />
    </AdminStack.Navigator>
  );
}

function AdminTabs() {
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'AdminHome':
              iconName = focused ? 'shield' : 'shield-outline';
              break;
            case 'Gestori':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Companies':
              iconName = focused ? 'business' : 'business-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            case 'Users':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Billing':
              iconName = focused ? 'card' : 'card-outline';
              break;
            default:
              iconName = 'shield-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <AdminTab.Screen name="AdminHome" component={AdminHomeStack} options={{ tabBarLabel: 'Dashboard' }} />
      <AdminTab.Screen name="Gestori" component={AdminGestoriStack} options={{ tabBarLabel: 'Gestori' }} />
      <AdminTab.Screen name="Users" component={AdminUsersStack} options={{ tabBarLabel: 'Utenti' }} />
      <AdminTab.Screen name="Billing" component={AdminBillingStack} options={{ tabBarLabel: 'Billing' }} />
      <AdminTab.Screen name="Settings" component={AdminSettingsStack} options={{ tabBarLabel: 'Sistema' }} />
    </AdminTab.Navigator>
  );
}

// ============= Floor Plan Stacks =============
function FloorPlanHomeStack() {
  return (
    <FloorPlanStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <FloorPlanStack.Screen name="FloorPlanList" component={FloorPlanHomeScreen} />
      <FloorPlanStack.Screen name="FloorPlanViewer" component={FloorPlanViewerScreen} />
      <FloorPlanStack.Screen name="ZoneDetail" component={ZoneDetailScreen} />
      <FloorPlanStack.Screen name="FloorPlanEditor" component={FloorPlanEditorScreen} />
    </FloorPlanStack.Navigator>
  );
}

function FloorPlanViewerStack() {
  return (
    <FloorPlanStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <FloorPlanStack.Screen name="FloorPlanList" component={FloorPlanHomeScreen} />
      <FloorPlanStack.Screen name="FloorPlanViewer" component={FloorPlanViewerScreen} />
      <FloorPlanStack.Screen name="ZoneDetail" component={ZoneDetailScreen} />
    </FloorPlanStack.Navigator>
  );
}

function FloorPlanEditorStack() {
  return (
    <FloorPlanStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <FloorPlanStack.Screen name="FloorPlanEditor" component={FloorPlanEditorScreen} />
      <FloorPlanStack.Screen name="FloorPlanViewer" component={FloorPlanViewerScreen} />
      <FloorPlanStack.Screen name="ZoneDetail" component={ZoneDetailScreen} />
    </FloorPlanStack.Navigator>
  );
}

function FloorPlanTabs() {
  return (
    <FloorPlanTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'FloorPlanHome':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'FloorPlanViewer':
              iconName = focused ? 'eye' : 'eye-outline';
              break;
            case 'FloorPlanEditor':
              iconName = focused ? 'create' : 'create-outline';
              break;
            default:
              iconName = 'map-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <FloorPlanTab.Screen name="FloorPlanHome" component={FloorPlanHomeStack} options={{ tabBarLabel: 'Planimetrie' }} />
      <FloorPlanTab.Screen name="FloorPlanViewer" component={FloorPlanViewerStack} options={{ tabBarLabel: 'Visualizza' }} />
      <FloorPlanTab.Screen name="FloorPlanEditor" component={FloorPlanEditorStack} options={{ tabBarLabel: 'Modifica' }} />
    </FloorPlanTab.Navigator>
  );
}

// ============= Marketing Stacks =============
function MarketingHomeStack() {
  return (
    <MarketingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MarketingStack.Screen name="MarketingDashboard" component={MarketingDashboardScreen} />
      <MarketingStack.Screen name="MarketingEmail" component={MarketingEmailScreen} />
      <MarketingStack.Screen name="LoyaltyAdmin" component={LoyaltyAdminScreen} />
      <MarketingStack.Screen name="ReferralAdmin" component={ReferralAdminScreen} />
      <MarketingStack.Screen name="BundlesAdmin" component={BundlesAdminScreen} />
    </MarketingStack.Navigator>
  );
}

function MarketingEmailStack() {
  return (
    <MarketingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MarketingStack.Screen name="MarketingEmail" component={MarketingEmailScreen} />
    </MarketingStack.Navigator>
  );
}

function MarketingLoyaltyStack() {
  return (
    <MarketingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MarketingStack.Screen name="LoyaltyAdmin" component={LoyaltyAdminScreen} />
      <MarketingStack.Screen name="BundlesAdmin" component={BundlesAdminScreen} />
    </MarketingStack.Navigator>
  );
}

function MarketingReferralsStack() {
  return (
    <MarketingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MarketingStack.Screen name="ReferralAdmin" component={ReferralAdminScreen} />
    </MarketingStack.Navigator>
  );
}

function MarketingTabs() {
  return (
    <MarketingTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'MarketingHome':
              iconName = focused ? 'megaphone' : 'megaphone-outline';
              break;
            case 'Email':
              iconName = focused ? 'mail' : 'mail-outline';
              break;
            case 'Loyalty':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'Referrals':
              iconName = focused ? 'people' : 'people-outline';
              break;
            default:
              iconName = 'megaphone-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <MarketingTab.Screen name="MarketingHome" component={MarketingHomeStack} options={{ tabBarLabel: 'Marketing' }} />
      <MarketingTab.Screen name="Email" component={MarketingEmailStack} options={{ tabBarLabel: 'Email' }} />
      <MarketingTab.Screen name="Loyalty" component={MarketingLoyaltyStack} options={{ tabBarLabel: 'Fidelity' }} />
      <MarketingTab.Screen name="Referrals" component={MarketingReferralsStack} options={{ tabBarLabel: 'Referral' }} />
    </MarketingTab.Navigator>
  );
}

// ============= School Badges Stacks =============
function SchoolBadgesHomeStack() {
  return (
    <SchoolBadgesStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SchoolBadgesStack.Screen name="SchoolBadgeManager" component={SchoolBadgeManagerScreen} />
      <SchoolBadgesStack.Screen name="SchoolBadgeLanding" component={SchoolBadgeLandingScreen} />
      <SchoolBadgesStack.Screen name="SchoolBadgeVerify" component={SchoolBadgeVerifyScreen} />
      <SchoolBadgesStack.Screen name="SchoolBadgeView" component={SchoolBadgeViewScreen} />
      <SchoolBadgesStack.Screen name="SchoolBadgeError" component={SchoolBadgeErrorScreen} />
    </SchoolBadgesStack.Navigator>
  );
}

function SchoolBadgesScannerStack() {
  return (
    <SchoolBadgesStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SchoolBadgesStack.Screen name="SchoolBadgeScanner" component={SchoolBadgeScannerScreen} />
      <SchoolBadgesStack.Screen name="SchoolBadgeVerify" component={SchoolBadgeVerifyScreen} />
      <SchoolBadgesStack.Screen name="SchoolBadgeView" component={SchoolBadgeViewScreen} />
      <SchoolBadgesStack.Screen name="SchoolBadgeError" component={SchoolBadgeErrorScreen} />
    </SchoolBadgesStack.Navigator>
  );
}

function SchoolBadgesTabs() {
  return (
    <SchoolBadgesTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'SchoolBadgesHome':
              iconName = focused ? 'school' : 'school-outline';
              break;
            case 'SchoolBadgesScanner':
              iconName = focused ? 'scan' : 'scan-outline';
              break;
            default:
              iconName = 'school-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <SchoolBadgesTab.Screen name="SchoolBadgesHome" component={SchoolBadgesHomeStack} options={{ tabBarLabel: 'Tessere' }} />
      <SchoolBadgesTab.Screen name="SchoolBadgesScanner" component={SchoolBadgesScannerStack} options={{ tabBarLabel: 'Scanner' }} />
    </SchoolBadgesTab.Navigator>
  );
}

// ============= Settings Stacks =============
function SettingsHomeStack() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
      <SettingsStack.Screen name="PrinterSettings" component={PrinterSettingsScreen} />
      <SettingsStack.Screen name="TemplateBuilder" component={TemplateBuilderScreen} />
      <SettingsStack.Screen name="DigitalTemplateBuilder" component={DigitalTemplateBuilderScreen} />
      <SettingsStack.Screen name="DownloadSmartCardApp" component={DownloadSmartCardAppScreen} />
      <SettingsStack.Screen name="Import" component={ImportScreen} />
      <SettingsStack.Screen name="PriceLists" component={PriceListsScreen} />
      <SettingsStack.Screen name="Beverage" component={BeverageScreen} />
    </SettingsStack.Navigator>
  );
}

function SettingsPrintersStack() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SettingsStack.Screen name="PrinterSettings" component={PrinterSettingsScreen} />
    </SettingsStack.Navigator>
  );
}

function SettingsTemplatesStack() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SettingsStack.Screen name="TemplateBuilder" component={TemplateBuilderScreen} />
      <SettingsStack.Screen name="DigitalTemplateBuilder" component={DigitalTemplateBuilderScreen} />
    </SettingsStack.Navigator>
  );
}

function SettingsTabs() {
  return (
    <SettingsTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'SettingsHome':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            case 'Printers':
              iconName = focused ? 'print' : 'print-outline';
              break;
            case 'Templates':
              iconName = focused ? 'document' : 'document-outline';
              break;
            default:
              iconName = 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <SettingsTab.Screen name="SettingsHome" component={SettingsHomeStack} options={{ tabBarLabel: 'Impostazioni' }} />
      <SettingsTab.Screen name="Printers" component={SettingsPrintersStack} options={{ tabBarLabel: 'Stampanti' }} />
      <SettingsTab.Screen name="Templates" component={SettingsTemplatesStack} options={{ tabBarLabel: 'Template' }} />
    </SettingsTab.Navigator>
  );
}

// ============= App Drawer =============
function AppDrawer() {
  const { user } = useAuthStore();
  const userRole = user?.role || 'customer';

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.foreground,
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}
    >
      {/* Customer mode - always available */}
      <Drawer.Screen 
        name="CustomerTabs" 
        component={CustomerTabs}
        options={{
          drawerLabel: 'Cliente',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Scanner mode - for scanner role */}
      {(userRole === 'scanner' || userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="ScannerTabs" 
          component={ScannerTabs}
          options={{
            drawerLabel: 'Scanner',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="scan-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* PR mode - for PR role */}
      {(userRole === 'pr' || userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="PRTabs" 
          component={PRTabs}
          options={{
            drawerLabel: 'Promoter',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Cashier mode - for cashier role */}
      {(userRole === 'cashier' || userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="CashierTabs" 
          component={CashierTabs}
          options={{
            drawerLabel: 'Cassa',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Management mode - for gestore/admin */}
      {(userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="ManagementTabs" 
          component={ManagementTabs}
          options={{
            drawerLabel: 'Gestione',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Floor Plan mode - for organizer, gestore, admin */}
      {(userRole === 'organizer' || userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="FloorPlanTabs" 
          component={FloorPlanTabs}
          options={{
            drawerLabel: 'Planimetrie',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="map-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* SIAE mode - for gestore/admin (Italian fiscal compliance) */}
      {(userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="SIAETabs" 
          component={SIAETabs}
          options={{
            drawerLabel: 'SIAE Ticketing',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Inventory mode - for warehouse, organizer, gestore */}
      {(userRole === 'warehouse' || userRole === 'magazziniere' || userRole === 'organizer' || userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="InventoryTabs" 
          component={InventoryTabs}
          options={{
            drawerLabel: 'Magazzino',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Analytics mode - for gestore/admin only */}
      {(userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="AnalyticsTabs" 
          component={AnalyticsTabs}
          options={{
            drawerLabel: 'AI Analytics',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="analytics-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Accounting mode - for gestore/admin only */}
      {(userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="AccountingTabs" 
          component={AccountingTabs}
          options={{
            drawerLabel: 'Contabilità',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="calculator-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Marketing mode - for gestore/admin only */}
      {(userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="MarketingTabs" 
          component={MarketingTabs}
          options={{
            drawerLabel: 'Marketing',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="megaphone-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* School Badges mode - for gestore/admin only */}
      {(userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="SchoolBadgesTabs" 
          component={SchoolBadgesTabs}
          options={{
            drawerLabel: 'Tessere Scuola',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="school-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Settings mode - for gestore/admin */}
      {(userRole === 'gestore' || userRole === 'super_admin') && (
        <Drawer.Screen 
          name="SettingsTabs" 
          component={SettingsTabs}
          options={{
            drawerLabel: 'Impostazioni',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="cog-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Admin mode - for super_admin only */}
      {userRole === 'super_admin' && (
        <Drawer.Screen 
          name="AdminTabs" 
          component={AdminTabs}
          options={{
            drawerLabel: 'Amministrazione',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark-outline" size={size} color={color} />
            ),
          }}
        />
      )}
    </Drawer.Navigator>
  );
}

// ============= Main Navigator =============
export function MainNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <RootStack.Screen name="AppDrawer" component={AppDrawer} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
