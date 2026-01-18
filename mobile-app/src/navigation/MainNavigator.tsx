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

// Account Screens
import AccountHomeScreen from '../screens/account/AccountHomeScreen';
import MyTicketsScreen from '../screens/account/MyTicketsScreen';
import TicketDetailScreen from '../screens/account/TicketDetailScreen';
import ProfileScreen from '../screens/account/ProfileScreen';
import WalletScreen from '../screens/account/WalletScreen';
import NameChangeScreen from '../screens/account/NameChangeScreen';
import ResaleListingScreen from '../screens/account/ResaleListingScreen';
import MyResalesScreen from '../screens/account/MyResalesScreen';

// Scanner Screens
import ScannerHomeScreen from '../screens/scanner/ScannerHomeScreen';
import ScannerScanScreen from '../screens/scanner/ScannerScanScreen';
import ScannerHistoryScreen from '../screens/scanner/ScannerHistoryScreen';
import ScannerStatsScreen from '../screens/scanner/ScannerStatsScreen';
import { ScannerOperatorsScreen } from '../screens/scanner/ScannerOperatorsScreen';
import { OperatorDetailScreen } from '../screens/scanner/OperatorDetailScreen';
import { ScanActivityScreen } from '../screens/scanner/ScanActivityScreen';
import { LiveScanningScreen } from '../screens/scanner/LiveScanningScreen';

// PR Screens
import PRHomeScreen from '../screens/pr/PRHomeScreen';
import PREventsScreen from '../screens/pr/PREventsScreen';
import PRGuestListsScreen from '../screens/pr/PRGuestListsScreen';
import PRTablesScreen from '../screens/pr/PRTablesScreen';
import PRWalletScreen from '../screens/pr/PRWalletScreen';

// Cashier Screens
import CashierHomeScreen from '../screens/cashier/CashierHomeScreen';
import CashierTicketScreen from '../screens/cashier/CashierTicketScreen';

// Management Screens
import DashboardScreen from '../screens/management/DashboardScreen';
import ManageEventsScreen from '../screens/management/ManageEventsScreen';
import EventHubScreen from '../screens/management/EventHubScreen';

// SIAE Screens
import SIAEHomeScreen from '../screens/siae/SIAEHomeScreen';
import SIAETransmissionsScreen from '../screens/siae/SIAETransmissionsScreen';
import SIAETransmissionDetailScreen from '../screens/siae/SIAETransmissionDetailScreen';
import SIAEReportsScreen from '../screens/siae/SIAEReportsScreen';

// Inventory Screens
import InventoryHomeScreen from '../screens/inventory/InventoryHomeScreen';
import ProductListScreen from '../screens/inventory/ProductListScreen';
import ProductDetailScreen from '../screens/inventory/ProductDetailScreen';
import StockAdjustmentScreen from '../screens/inventory/StockAdjustmentScreen';
import ConsumptionScreen from '../screens/inventory/ConsumptionScreen';

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

// Floor Plan Screens
import { FloorPlanHomeScreen } from '../screens/floorplan/FloorPlanHomeScreen';
import { FloorPlanViewerScreen } from '../screens/floorplan/FloorPlanViewerScreen';
import { ZoneDetailScreen } from '../screens/floorplan/ZoneDetailScreen';
import { FloorPlanEditorScreen } from '../screens/floorplan/FloorPlanEditorScreen';

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
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  GestoriList: undefined;
  GestoreDetail: { gestoreId?: string; mode?: 'create' | 'edit' };
  Companies: undefined;
  SystemSettings: undefined;
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
};

export type CashierTabParamList = {
  CashierHome: undefined;
  CashierTicket: undefined;
};

export type ManagementTabParamList = {
  Dashboard: undefined;
  ManageEvents: undefined;
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
};

export type PRStackParamList = {
  PRDashboard: undefined;
  PREventsList: undefined;
  PRGuestLists: { eventId: string };
  PRTables: { eventId: string };
  PRWalletScreen: undefined;
};

export type ManagementStackParamList = {
  ManagementDashboard: undefined;
  ManagementEvents: undefined;
  EventHub: { eventId: string };
};

export type SIAETabParamList = {
  SIAEHome: undefined;
  SIAETransmissions: undefined;
  SIAEReports: undefined;
};

export type SIAEStackParamList = {
  SIAEDashboard: undefined;
  SIAETransmissions: undefined;
  SIAETransmissionDetail: { transmissionId: number };
  SIAEReports: { defaultType?: string };
};

export type InventoryTabParamList = {
  InventoryHome: undefined;
  Products: undefined;
  Consumption: undefined;
};

export type InventoryStackParamList = {
  InventoryDashboard: undefined;
  ProductList: undefined;
  ProductDetail: { productId: string };
  StockAdjustment: { productId?: string; type?: 'add' | 'remove' | 'set' };
  Consumption: undefined;
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

// Cashier tabs
const CashierTab = createBottomTabNavigator<CashierTabParamList>();

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
    </PRTab.Navigator>
  );
}

// ============= Cashier Tabs =============
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
            default:
              iconName = 'home-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <CashierTab.Screen name="CashierHome" component={CashierHomeScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <CashierTab.Screen name="CashierTicket" component={CashierTicketScreen} options={{ tabBarLabel: 'Emetti Biglietto' }} />
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
            default:
              iconName = 'home-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <ManagementTab.Screen name="Dashboard" component={ManagementHomeStack} options={{ tabBarLabel: 'Dashboard' }} />
      <ManagementTab.Screen name="ManageEvents" component={ManagementEventsStack} options={{ tabBarLabel: 'Eventi' }} />
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
      <AdminStack.Screen name="GestoriList" component={GestoriListScreen} />
      <AdminStack.Screen name="GestoreDetail" component={GestoreDetailScreen} />
      <AdminStack.Screen name="Companies" component={CompaniesScreen} />
      <AdminStack.Screen name="SystemSettings" component={SystemSettingsScreen} />
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
            default:
              iconName = 'shield-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <AdminTab.Screen name="AdminHome" component={AdminHomeStack} options={{ tabBarLabel: 'Dashboard' }} />
      <AdminTab.Screen name="Gestori" component={AdminGestoriStack} options={{ tabBarLabel: 'Gestori' }} />
      <AdminTab.Screen name="Companies" component={AdminCompaniesStack} options={{ tabBarLabel: 'Aziende' }} />
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
    return null; // Could show splash screen
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
