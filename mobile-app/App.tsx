import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = 'https://manage.eventfouryou.com';

const colors = {
  background: '#0a0e17',
  foreground: '#f8fafc',
  card: '#111827',
  primary: '#FFD700',
  teal: '#00CED1',
  border: '#1e293b',
  muted: '#94a3b8',
  error: '#ef4444',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

type Screen = 'landing' | 'login' | 'register' | 'events' | 'account';

function LandingScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 215, 0, 0.15)', 'transparent']}
        style={styles.heroGradient}
      />
      <View style={styles.header}>
        <Text style={styles.logo}>Event4U</Text>
        <Pressable style={styles.loginButton} onPress={() => onNavigate('login')}>
          <Text style={styles.loginText}>Accedi</Text>
        </Pressable>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Scopri gli eventi</Text>
          <Text style={styles.heroSubtitle}>Trova i migliori eventi nella tua zona</Text>
          <Pressable style={styles.ctaButton} onPress={() => onNavigate('events')}>
            <LinearGradient
              colors={[colors.primary, '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Esplora Eventi</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Concerti', 'Club', 'Festival', 'Teatro'].map((cat, i) => (
              <Pressable key={i} style={styles.categoryCard} onPress={() => onNavigate('events')}>
                <LinearGradient
                  colors={['rgba(17, 24, 39, 0.9)', 'rgba(17, 24, 39, 0.7)']}
                  style={styles.categoryGradient}
                >
                  <Ionicons 
                    name={['musical-notes', 'wine', 'flame', 'ticket'][i] as any} 
                    size={28} 
                    color={colors.primary} 
                  />
                  <Text style={styles.categoryText}>{cat}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Eventi in evidenza</Text>
            <Pressable onPress={() => onNavigate('events')}>
              <Text style={styles.seeAll}>Vedi tutti</Text>
            </Pressable>
          </View>
          {[1, 2, 3].map((_, i) => (
            <Pressable key={i} style={styles.eventCard} onPress={() => onNavigate('events')}>
              <View style={styles.eventImage}>
                <LinearGradient
                  colors={[colors.teal, colors.primary]}
                  style={styles.eventPlaceholder}
                >
                  <Ionicons name="calendar" size={40} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>Evento #{i + 1}</Text>
                <Text style={styles.eventDate}>Sab 25 Gen 2026</Text>
                <View style={styles.eventMeta}>
                  <Ionicons name="location" size={14} color={colors.muted} />
                  <Text style={styles.eventLocation}>Milano</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.registerBanner} onPress={() => onNavigate('register')}>
          <LinearGradient
            colors={['rgba(0, 206, 209, 0.2)', 'rgba(255, 215, 0, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.registerGradient}
          >
            <Ionicons name="person-add" size={24} color={colors.teal} />
            <View style={styles.registerText}>
              <Text style={styles.registerTitle}>Non hai un account?</Text>
              <Text style={styles.registerSubtitle}>Registrati ora per accedere a tutti gli eventi</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.muted} />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function LoginScreen({ onNavigate, onLogin }: { onNavigate: (screen: Screen) => void; onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/api/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login fallito');
      }
      
      Alert.alert('Successo', 'Login effettuato!');
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.authHeader}>
        <Pressable onPress={() => onNavigate('landing')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.authTitle}>Accedi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.authContent}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.1)', 'transparent']}
          style={styles.authGradient}
        />
        
        <View style={styles.authForm}>
          <Text style={styles.authSubtitle}>Bentornato su Event4U</Text>
          
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="esempio@email.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="La tua password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            <LinearGradient
              colors={loading ? [colors.muted, colors.muted] : [colors.primary, '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Accedi</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => onNavigate('register')} style={styles.linkButton}>
            <Text style={styles.linkText}>Non hai un account? </Text>
            <Text style={[styles.linkText, { color: colors.primary }]}>Registrati</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function RegisterScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      setError('Compila tutti i campi');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/api/customer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registrazione fallita');
      }
      
      Alert.alert('Successo', 'Registrazione completata! Ora puoi accedere.');
      onNavigate('login');
    } catch (err: any) {
      setError(err.message || 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.authHeader}>
        <Pressable onPress={() => onNavigate('landing')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.authTitle}>Registrati</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.authContent}>
        <View style={styles.authForm}>
          <Text style={styles.authSubtitle}>Crea il tuo account Event4U</Text>
          
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Mario"
                placeholderTextColor={colors.muted}
                value={form.firstName}
                onChangeText={(v) => setForm({ ...form, firstName: v })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Cognome</Text>
              <TextInput
                style={styles.input}
                placeholder="Rossi"
                placeholderTextColor={colors.muted}
                value={form.lastName}
                onChangeText={(v) => setForm({ ...form, lastName: v })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="esempio@email.com"
              placeholderTextColor={colors.muted}
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimo 8 caratteri"
              placeholderTextColor={colors.muted}
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
              secureTextEntry
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
            <LinearGradient
              colors={loading ? [colors.muted, colors.muted] : [colors.teal, '#008B8B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Crea Account</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => onNavigate('login')} style={styles.linkButton}>
            <Text style={styles.linkText}>Hai già un account? </Text>
            <Text style={[styles.linkText, { color: colors.primary }]}>Accedi</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function EventsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.authHeader}>
        <Pressable onPress={() => onNavigate('landing')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.authTitle}>Eventi</Text>
        <Pressable onPress={() => onNavigate('login')}>
          <Ionicons name="person-circle" size={28} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca eventi..."
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.section}>
          {[1, 2, 3, 4, 5].map((_, i) => (
            <Pressable key={i} style={styles.eventCard}>
              <View style={styles.eventImage}>
                <LinearGradient
                  colors={i % 2 === 0 ? [colors.teal, colors.primary] : [colors.primary, '#FF6B6B']}
                  style={styles.eventPlaceholder}
                >
                  <Ionicons name="calendar" size={40} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>Evento #{i + 1}</Text>
                <Text style={styles.eventDate}>{25 + i} Gen 2026</Text>
                <View style={styles.eventMeta}>
                  <Ionicons name="location" size={14} color={colors.muted} />
                  <Text style={styles.eventLocation}>{['Milano', 'Roma', 'Napoli', 'Torino', 'Firenze'][i]}</Text>
                </View>
              </View>
              <View style={styles.eventPrice}>
                <Text style={styles.priceText}>€{15 + i * 5}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function AccountScreen({ onNavigate, onLogout }: { onNavigate: (screen: Screen) => void; onLogout: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.authHeader}>
        <Pressable onPress={() => onNavigate('landing')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.authTitle}>Il mio Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <Text style={styles.profileName}>Utente</Text>
          <Text style={styles.profileEmail}>utente@email.com</Text>
        </View>

        <View style={styles.menuSection}>
          {[
            { icon: 'ticket', label: 'I miei biglietti' },
            { icon: 'wallet', label: 'Portafoglio' },
            { icon: 'heart', label: 'Preferiti' },
            { icon: 'settings', label: 'Impostazioni' },
          ].map((item, i) => (
            <Pressable key={i} style={styles.menuItem}>
              <Ionicons name={item.icon as any} size={24} color={colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out" size={24} color={colors.error} />
          <Text style={styles.logoutText}>Esci</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navigate = (screen: Screen) => setCurrentScreen(screen);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentScreen('account');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('landing');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen onNavigate={navigate} onLogin={handleLogin} />;
      case 'register':
        return <RegisterScreen onNavigate={navigate} />;
      case 'events':
        return <EventsScreen onNavigate={navigate} />;
      case 'account':
        return <AccountScreen onNavigate={navigate} onLogout={handleLogout} />;
      default:
        return <LandingScreen onNavigate={navigate} />;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor={colors.background} />
          {renderScreen()}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16 },
  logo: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  loginButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
  loginText: { color: colors.primary, fontWeight: '600' },
  content: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingVertical: 40 },
  heroTitle: { fontSize: 36, fontWeight: 'bold', color: colors.foreground, marginBottom: 8 },
  heroSubtitle: { fontSize: 18, color: colors.muted, marginBottom: 24 },
  ctaButton: { borderRadius: 12, overflow: 'hidden', alignSelf: 'flex-start' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  ctaText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  section: { paddingHorizontal: 20, marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.foreground },
  seeAll: { color: colors.primary, fontSize: 14 },
  categoryCard: { marginRight: 12, borderRadius: 12, overflow: 'hidden' },
  categoryGradient: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  categoryText: { color: colors.foreground, marginTop: 8, fontSize: 14 },
  eventCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  eventImage: { width: 100, height: 100 },
  eventPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eventInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  eventTitle: { fontSize: 16, fontWeight: 'bold', color: colors.foreground, marginBottom: 4 },
  eventDate: { fontSize: 14, color: colors.primary, marginBottom: 4 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLocation: { fontSize: 12, color: colors.muted },
  eventPrice: { justifyContent: 'center', paddingRight: 16 },
  priceText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  registerBanner: { marginHorizontal: 20, marginBottom: 40, borderRadius: 12, overflow: 'hidden' },
  registerGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  registerText: { flex: 1 },
  registerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.foreground },
  registerSubtitle: { fontSize: 13, color: colors.muted },
  authHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  authTitle: { fontSize: 18, fontWeight: 'bold', color: colors.foreground },
  backButton: { padding: 8 },
  authContent: { flex: 1 },
  authGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  authForm: { padding: 20, paddingTop: 40 },
  authSubtitle: { fontSize: 24, fontWeight: 'bold', color: colors.foreground, marginBottom: 24, textAlign: 'center' },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: colors.error, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: colors.error, textAlign: 'center' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, color: colors.muted, marginBottom: 8 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 14, color: colors.foreground, fontSize: 16 },
  rowInputs: { flexDirection: 'row' },
  primaryButton: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  linkButton: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  linkText: { color: colors.muted, fontSize: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, margin: 20, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, marginLeft: 12, color: colors.foreground, fontSize: 16 },
  profileCard: { alignItems: 'center', padding: 32, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: colors.primary },
  profileName: { fontSize: 20, fontWeight: 'bold', color: colors.foreground },
  profileEmail: { fontSize: 14, color: colors.muted, marginTop: 4 },
  menuSection: { padding: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  menuLabel: { flex: 1, marginLeft: 16, fontSize: 16, color: colors.foreground },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 20, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.error },
  logoutText: { marginLeft: 12, fontSize: 16, color: colors.error, fontWeight: '600' },
});
