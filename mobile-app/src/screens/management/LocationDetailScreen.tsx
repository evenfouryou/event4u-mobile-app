import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface LocationDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  capacity: number;
  phone: string;
  email: string;
  website: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  notes: string;
}

interface EventSummary {
  id: string;
  name: string;
  date: string;
  status: string;
}

export function LocationDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const locationId = route.params?.locationId;

  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLocationDetail();
  }, [locationId]);

  const loadLocationDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const [locationData, eventsData] = await Promise.all([
        api.get<any>(`/api/locations/${locationId}`),
        api.get<any[]>(`/api/locations/${locationId}/events`).catch(() => []),
      ]);
      setLocation({
        id: locationData.id?.toString() || '',
        name: locationData.name || '',
        address: locationData.address || '',
        city: locationData.city || '',
        province: locationData.province || '',
        postalCode: locationData.postalCode || '',
        country: locationData.country || 'Italia',
        capacity: locationData.capacity || 0,
        phone: locationData.phone || '',
        email: locationData.email || '',
        website: locationData.website || '',
        latitude: locationData.latitude || null,
        longitude: locationData.longitude || null,
        isActive: locationData.isActive ?? true,
        notes: locationData.notes || '',
      });
      setEvents(eventsData.map((e: any) => ({
        id: e.id?.toString() || '',
        name: e.name || '',
        date: e.eventDate ? new Date(e.eventDate).toLocaleDateString('it-IT') : '',
        status: e.status || 'upcoming',
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const openMap = () => {
    if (location?.latitude && location?.longitude) {
      const url = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      Linking.openURL(url);
    } else if (location?.address) {
      const query = encodeURIComponent(`${location.address}, ${location.city}`);
      Linking.openURL(`https://maps.google.com/?q=${query}`);
    }
  };

  const callPhone = () => {
    if (location?.phone) {
      Linking.openURL(`tel:${location.phone}`);
    }
  };

  const sendEmail = () => {
    if (location?.email) {
      Linking.openURL(`mailto:${location.email}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Dettaglio Location" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer} testID="loading-indicator">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !location) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Dettaglio Location" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer} testID="error-state">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error || 'Location non trovata'}</Text>
          <Button title="Riprova" onPress={loadLocationDetail} style={styles.retryButton} testID="button-retry" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title={location.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditLocation', { locationId })}
            testID="button-edit-location"
          >
            <Ionicons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={(isTablet || isLandscape) ? styles.contentResponsive : undefined}
        testID="scroll-view-location-detail"
      >
        <View style={(isTablet || isLandscape) ? styles.columnLeft : undefined}>
          <Card style={styles.heroCard} variant="elevated" testID="hero-card">
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Ionicons name="location" size={32} color={colors.primary} />
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroName}>{location.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: location.isActive ? `${colors.success}20` : `${colors.mutedForeground}20` }]}>
                  <Text style={[styles.statusText, { color: location.isActive ? colors.success : colors.mutedForeground }]}>
                    {location.isActive ? 'Attivo' : 'Inattivo'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.capacityRow}>
              <Ionicons name="people" size={20} color={colors.teal} />
              <Text style={styles.capacityText}>Capacità: {location.capacity} persone</Text>
            </View>
          </Card>

          <Card style={styles.section} variant="elevated" testID="address-card">
            <Text style={styles.sectionTitle}>Indirizzo</Text>
            <TouchableOpacity style={styles.addressRow} onPress={openMap} testID="button-open-map">
              <View style={styles.addressIcon}>
                <Ionicons name="map" size={20} color={colors.primary} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressText}>{location.address}</Text>
                <Text style={styles.addressSubtext}>
                  {location.postalCode} {location.city} ({location.province})
                </Text>
                <Text style={styles.addressSubtext}>{location.country}</Text>
              </View>
              <Ionicons name="open-outline" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </Card>

          <Card style={styles.section} variant="elevated" testID="contacts-card">
            <Text style={styles.sectionTitle}>Contatti</Text>
            {location.phone && (
              <TouchableOpacity style={styles.contactRow} onPress={callPhone} testID="button-call">
                <View style={styles.contactIcon}>
                  <Ionicons name="call" size={18} color={colors.success} />
                </View>
                <Text style={styles.contactText}>{location.phone}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
            {location.email && (
              <TouchableOpacity style={styles.contactRow} onPress={sendEmail} testID="button-email">
                <View style={styles.contactIcon}>
                  <Ionicons name="mail" size={18} color={colors.teal} />
                </View>
                <Text style={styles.contactText}>{location.email}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
            {location.website && (
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(location.website)} testID="button-website">
                <View style={styles.contactIcon}>
                  <Ionicons name="globe" size={18} color={colors.primary} />
                </View>
                <Text style={styles.contactText}>{location.website}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
            {!location.phone && !location.email && !location.website && (
              <Text style={styles.emptyText}>Nessun contatto disponibile</Text>
            )}
          </Card>
        </View>

        <View style={(isTablet || isLandscape) ? styles.columnRight : undefined}>
          <Card style={styles.section} variant="elevated" testID="events-card">
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Eventi in questa location</Text>
              <Text style={styles.eventCount}>{events.length}</Text>
            </View>
            {events.length === 0 ? (
              <Text style={styles.emptyText}>Nessun evento associato</Text>
            ) : (
              events.slice(0, 5).map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventRow}
                  onPress={() => navigation.navigate('EventHub', { eventId: event.id })}
                  testID={`card-event-${event.id}`}
                >
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <Text style={styles.eventDate}>{event.date}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))
            )}
          </Card>

          {location.notes && (
            <Card style={styles.section} variant="elevated" testID="notes-card">
              <Text style={styles.sectionTitle}>Note</Text>
              <Text style={styles.notesText}>{location.notes}</Text>
            </Card>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  contentResponsive: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  columnLeft: {
    flex: 1,
    minWidth: 300,
  },
  columnRight: {
    flex: 1,
    minWidth: 300,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.destructive,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  heroCard: {
    marginTop: spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  heroName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  capacityText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  eventCount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  addressText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  addressSubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  eventDate: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  notesText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: spacing['3xl'],
  },
});
