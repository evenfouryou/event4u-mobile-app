import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';

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

import { LandingScreen } from '@/screens/public/LandingScreen';
import { EventsListScreen } from '@/screens/public/EventsListScreen';
import { EventDetailScreen } from '@/screens/public/EventDetailScreen';
import { CartScreen } from '@/screens/public/CartScreen';
import { CheckoutScreen } from '@/screens/public/CheckoutScreen';
import { VenuesScreen } from '@/screens/public/VenuesScreen';
import { VenueDetailScreen } from '@/screens/public/VenueDetailScreen';
import { ResalesScreen } from '@/screens/public/ResalesScreen';

type Screen =
  | { name: 'splash' }
  | { name: 'landing' }
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'forgotPassword' }
  | { name: 'events' }
  | { name: 'eventDetail'; params: { eventId: string } }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'venues' }
  | { name: 'venueDetail'; params: { venueId: string } }
  | { name: 'resales' }
  | { name: 'accountDashboard' }
  | { name: 'tickets' }
  | { name: 'ticketDetail'; params: { ticketId: string } }
  | { name: 'wallet' }
  | { name: 'walletTopUp' }
  | { name: 'nameChange'; params: { ticketId: string } }
  | { name: 'subscriptions' };

export function AppNavigator() {
  const { isAuthenticated } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>({ name: 'splash' });
  const [history, setHistory] = useState<Screen[]>([]);

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
            onLoginSuccess={() => resetTo({ name: 'accountDashboard' })}
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
            onSuccess={() => resetTo({ name: 'accountDashboard' })}
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
            onNavigateProfile={() => navigate({ name: 'subscriptions' })}
            onNavigateEvents={() => navigate({ name: 'events' })}
            onNavigateResales={() => navigate({ name: 'resales' })}
            onNavigateSettings={() => navigate({ name: 'tickets' })}
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

      default:
        return (
          <LandingScreen
            onNavigateEvents={() => navigate({ name: 'events' })}
            onNavigateLogin={() => navigate({ name: 'login' })}
            onNavigateRegister={() => navigate({ name: 'register' })}
            onNavigateVenues={() => navigate({ name: 'venues' })}
            onNavigateResales={() => navigate({ name: 'resales' })}
          />
        );
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
