import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  background: '#0a0e17',
  foreground: '#f8fafc',
  card: '#111827',
  primary: '#FFD700',
  teal: '#00CED1',
  border: '#1e293b',
  muted: '#94a3b8',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor={colors.background} />
          <View style={styles.container}>
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.15)', 'transparent']}
              style={styles.heroGradient}
            />
            <View style={styles.header}>
              <Text style={styles.logo}>Event4U</Text>
              <View style={styles.headerButtons}>
                <Pressable style={styles.loginButton}>
                  <Text style={styles.loginText}>Accedi</Text>
                </Pressable>
              </View>
            </View>
            
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.hero}>
                <Text style={styles.heroTitle}>Scopri gli eventi</Text>
                <Text style={styles.heroSubtitle}>
                  Trova i migliori eventi nella tua zona
                </Text>
                <Pressable style={styles.ctaButton}>
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
                    <Pressable key={i} style={styles.categoryCard}>
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
                <Text style={styles.sectionTitle}>Eventi in evidenza</Text>
                {[1, 2, 3].map((_, i) => (
                  <Pressable key={i} style={styles.eventCard}>
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
            </ScrollView>
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loginText: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    color: colors.muted,
    marginBottom: 24,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 16,
  },
  categoryCard: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryGradient: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    color: colors.foreground,
    marginTop: 8,
    fontSize: 14,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventImage: {
    width: 100,
    height: 100,
  },
  eventPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: colors.muted,
  },
});
