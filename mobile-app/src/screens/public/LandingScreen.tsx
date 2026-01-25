import { View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge, LiveBadge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { triggerHaptic } from '@/lib/haptics';

const { width } = Dimensions.get('window');

interface LandingScreenProps {
  onNavigateEvents: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateVenues: () => void;
  onNavigateResales: () => void;
}

export function LandingScreen({
  onNavigateEvents,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateVenues,
  onNavigateResales,
}: LandingScreenProps) {
  const upcomingEvents = [
    {
      id: '1',
      name: 'Saturday Night Party',
      venue: 'Club Paradise',
      date: 'Sab 25 Gen',
      time: '23:00',
      price: '15',
      image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e8?w=400',
    },
    {
      id: '2',
      name: 'Deep House Session',
      venue: 'Warehouse Milano',
      date: 'Dom 26 Gen',
      time: '22:00',
      price: '20',
      image: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=400',
    },
    {
      id: '3',
      name: 'Reggaeton Fever',
      venue: 'Latino Club',
      date: 'Ven 31 Gen',
      time: '23:30',
      price: '12',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    },
  ];

  const categories = [
    { id: '1', name: 'Club', icon: 'musical-notes' as const, color: colors.primary },
    { id: '2', name: 'Concerti', icon: 'mic' as const, color: colors.teal },
    { id: '3', name: 'Festival', icon: 'people' as const, color: '#E91E63' },
    { id: '4', name: 'Aperitivi', icon: 'wine' as const, color: '#FF9800' },
  ];

  return (
    <SafeArea style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.glowContainer}>
          <View style={styles.glowGolden} />
          <View style={styles.glowTeal} />
        </View>

        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerButtons}>
            <Button
              variant="outline"
              size="sm"
              onPress={onNavigateLogin}
              testID="button-login"
            >
              Accedi
            </Button>
          </View>
        </View>

        <View style={styles.hero}>
          <LiveBadge testID="badge-live" />
          <Text style={styles.heroTitle}>
            Trova il tuo{'\n'}
            <Text style={styles.heroTitleGold}>evento</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            I migliori eventi della tua città, biglietti sicuri con garanzia SIAE
          </Text>
          
          <View style={styles.heroButtons}>
            <Button
              variant="golden"
              size="lg"
              onPress={() => {
                triggerHaptic('light');
                onNavigateEvents();
              }}
              style={styles.heroButton}
              testID="button-explore-events"
            >
              <Ionicons name="search" size={20} color="#000" />
              <Text style={styles.heroButtonText}>Esplora Eventi</Text>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onPress={() => {
                triggerHaptic('light');
                onNavigateRegister();
              }}
              style={styles.heroButton}
              testID="button-register"
            >
              Registrati Gratis
            </Button>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorie</Text>
          <View style={styles.categoriesRow}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryItem}
                onPress={() => {
                  triggerHaptic('light');
                  onNavigateEvents();
                }}
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}20` }]}>
                  <Ionicons name={cat.icon} size={24} color={cat.color} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Eventi in Arrivo</Text>
            <Pressable onPress={onNavigateEvents}>
              <Text style={styles.seeAll}>Vedi tutti</Text>
            </Pressable>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsScroll}
          >
            {upcomingEvents.map((event) => (
              <Pressable
                key={event.id}
                style={styles.eventCard}
                onPress={() => {
                  triggerHaptic('light');
                  onNavigateEvents();
                }}
              >
                <Image
                  source={{ uri: event.image }}
                  style={styles.eventImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.9)']}
                  style={styles.eventGradient}
                >
                  <Badge variant="golden" size="sm">{event.date}</Badge>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <View style={styles.eventInfo}>
                    <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                    <Text style={styles.eventVenue}>{event.venue}</Text>
                  </View>
                  <View style={styles.eventFooter}>
                    <Text style={styles.eventTime}>{event.time}</Text>
                    <Text style={styles.eventPrice}>da {event.price}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servizi</Text>
          <View style={styles.servicesGrid}>
            <Pressable style={styles.serviceCard} onPress={onNavigateVenues}>
              <View style={[styles.serviceIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="business-outline" size={28} color={colors.teal} />
              </View>
              <Text style={styles.serviceTitle}>Venues</Text>
              <Text style={styles.serviceDesc}>Scopri i locali</Text>
            </Pressable>
            
            <Pressable style={styles.serviceCard} onPress={onNavigateResales}>
              <View style={[styles.serviceIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="swap-horizontal-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.serviceTitle}>Rivendita</Text>
              <Text style={styles.serviceDesc}>Compra e vendi</Text>
            </Pressable>
            
            <Pressable style={styles.serviceCard} onPress={onNavigateEvents}>
              <View style={[styles.serviceIcon, { backgroundColor: '#E91E6320' }]}>
                <Ionicons name="heart-outline" size={28} color="#E91E63" />
              </View>
              <Text style={styles.serviceTitle}>Liste</Text>
              <Text style={styles.serviceDesc}>VIP & Guest list</Text>
            </Pressable>
            
            <Pressable style={styles.serviceCard} onPress={onNavigateEvents}>
              <View style={[styles.serviceIcon, { backgroundColor: '#9C27B020' }]}>
                <Ionicons name="calendar-outline" size={28} color="#9C27B0" />
              </View>
              <Text style={styles.serviceTitle}>Prenotazioni</Text>
              <Text style={styles.serviceDesc}>Tavoli e aree VIP</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'rgba(0, 206, 209, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaCard}
          >
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.ctaLogo}
              resizeMode="contain"
            />
            <Text style={styles.ctaTitle}>Pronto per la notte?</Text>
            <Text style={styles.ctaText}>
              Crea un account gratuito e scopri tutti gli eventi esclusivi della tua zona
            </Text>
            <Button
              variant="golden"
              size="lg"
              onPress={onNavigateRegister}
              style={styles.ctaButton}
              testID="button-cta-register"
            >
              Inizia Ora
            </Button>
          </LinearGradient>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Event4U - La tua app per eventi</Text>
          <Text style={styles.footerCopyright}>2026 Event4U. Tutti i diritti riservati.</Text>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    overflow: 'hidden',
  },
  glowGolden: {
    position: 'absolute',
    top: -150,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  glowTeal: {
    position: 'absolute',
    top: 200,
    left: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.teal,
    opacity: 0.08,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  logo: {
    width: 140,
    height: 50,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.foreground,
    lineHeight: 50,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  heroTitleGold: {
    color: colors.primary,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.mutedForeground,
    lineHeight: 26,
    marginBottom: spacing.xl,
  },
  heroButtons: {
    gap: spacing.md,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  heroButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAll: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categoryItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
  },
  eventsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  eventCard: {
    width: width * 0.7,
    height: 220,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingTop: spacing.xl,
  },
  eventName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  eventVenue: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  eventPrice: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.primary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  serviceCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  serviceTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  ctaSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  ctaCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  ctaLogo: {
    width: 100,
    height: 50,
    marginBottom: spacing.md,
  },
  ctaTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  ctaButton: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  footerCopyright: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});

export default LandingScreen;
