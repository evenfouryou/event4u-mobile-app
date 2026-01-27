import { View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge, LiveBadge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { SkeletonEventCard } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PublicEvent } from '@/lib/api';

const { width } = Dimensions.get('window');

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

interface LandingScreenProps {
  onNavigateEvents: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateVenues: () => void;
  onNavigateResales: () => void;
  onNavigateAccount: () => void;
  isAuthenticated: boolean;
}

export function LandingScreen({
  onNavigateEvents,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateVenues,
  onNavigateResales,
  onNavigateAccount,
  isAuthenticated,
}: LandingScreenProps) {
  const { colors, gradients } = useTheme();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      setShowSkeleton(false);
    }
  }, [events]);

  const loadEvents = async () => {
    try {
      const data = await api.getPublicEvents({ limit: 6 });
      setEvents(data);
      setShowSkeleton(false);
    } catch (error) {
      console.error('Error loading events:', error);
      setShowSkeleton(false);
    }
  };

  const categories = [
    { id: '1', name: 'Club', icon: 'musical-notes' as const, color: staticColors.primary },
    { id: '2', name: 'Concerti', icon: 'mic' as const, color: staticColors.teal },
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
            style={[styles.logo, { tintColor: '#FFFFFF' }]}
            resizeMode="contain"
          />
          <View style={styles.headerButtons}>
            {isAuthenticated ? (
              <Button
                variant="golden"
                size="sm"
                onPress={onNavigateAccount}
                testID="button-account"
              >
                <Ionicons name="person" size={16} color="#000" />
                <Text style={{ color: '#000', marginLeft: 4 }}>Profilo</Text>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onPress={onNavigateLogin}
                testID="button-login"
              >
                Accedi
              </Button>
            )}
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
          
          {showSkeleton ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
              {[1, 2, 3].map((i) => <SkeletonEventCard key={i} />)}
            </ScrollView>
          ) : events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={staticColors.mutedForeground} />
              <Text style={styles.emptyText}>Nessun evento disponibile</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsScroll}
            >
              {events.map((event) => (
                <Pressable
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateEvents();
                  }}
                  testID={`event-card-${event.id}`}
                >
                  <Image
                    source={{ uri: event.eventImageUrl || 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e8?w=400' }}
                    style={styles.eventImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.eventGradient}
                  >
                    <Badge variant="golden" size="sm">{formatEventDate(event.eventStart)}</Badge>
                    <Text style={styles.eventName} numberOfLines={2}>{event.eventName}</Text>
                    <View style={styles.eventInfo}>
                      <Ionicons name="location-outline" size={14} color={staticColors.mutedForeground} />
                      <Text style={styles.eventVenue} numberOfLines={1}>{event.locationName}</Text>
                    </View>
                    <View style={styles.eventFooter}>
                      <Text style={styles.eventTime}>{formatEventTime(event.eventStart)}</Text>
                      <Text style={styles.eventPrice}>
                        {event.minPrice ? `da €${event.minPrice}` : 'Gratuito'}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {!isAuthenticated && (
          <View style={styles.ctaSection}>
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.1)', 'rgba(0, 206, 209, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaCard}
            >
              <Image
                source={require('../../../assets/logo.png')}
                style={[styles.ctaLogo, { tintColor: '#FFFFFF' }]}
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
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Event Four You - La tua app per eventi</Text>
          <Text style={styles.footerCopyright}>2026 Event Four You. Tutti i diritti riservati.</Text>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
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
    backgroundColor: staticColors.primary,
    opacity: 0.12,
  },
  glowTeal: {
    position: 'absolute',
    top: 200,
    left: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: staticColors.teal,
    opacity: 0.08,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
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
    color: staticColors.foreground,
    lineHeight: 50,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  heroTitleGold: {
    color: staticColors.primary,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.lg,
    color: staticColors.mutedForeground,
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
    color: staticColors.foreground,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAll: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
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
    color: staticColors.foreground,
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
    color: staticColors.foreground,
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
    color: staticColors.mutedForeground,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  eventPrice: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.primary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  serviceCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: staticColors.border,
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
    color: staticColors.foreground,
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
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
    borderColor: `${staticColors.primary}30`,
  },
  ctaLogo: {
    width: 100,
    height: 50,
    marginBottom: spacing.md,
  },
  ctaTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  ctaButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  footerCopyright: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
});

export default LandingScreen;
