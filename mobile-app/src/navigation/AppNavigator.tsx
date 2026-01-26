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

import { ScannerDashboard, ScannerEventsScreen, ScannerScanScreen } from '@/screens/scanner';

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
  | { name: 'scannerScan'; params: { eventId: string } };

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
  const { isAuthenticated } = useAuth();
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
    if (authenticated) {
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
            onNavigateProfile={() => navigate({ name: 'profile' })}
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
