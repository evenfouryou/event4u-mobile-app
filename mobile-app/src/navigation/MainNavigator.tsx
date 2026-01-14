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
  ScannerScan: undefined;
  ScannerHistory: undefined;
  ScannerStats: undefined;
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
