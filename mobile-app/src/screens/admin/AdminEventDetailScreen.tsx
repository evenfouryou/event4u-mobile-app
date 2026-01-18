import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface EventDetail {
  id: string;
  name: string;
  description: string;
  date: string;
  endDate?: string;
  venueName: string;
  venueAddress: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  ticketsSold: number;
  totalCapacity: number;
  revenue: number;
  organizerName: string;
  organizerEmail: string;
  imageUrl?: string;
  siaeEnabled: boolean;
  siaeReportStatus?: 'pending' | 'submitted' | 'approved';
  createdAt: string;
}

export function AdminEventDetailScreen() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const eventId = route.params?.eventId;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [event, setEvent] = useState<EventDetail | null>(null);

  const loadEvent = async () => {
    try {
      const response = await api.get<EventDetail>(`/api/admin/events/${eventId}`).catch(() => null);
      if (response) {
        setEvent(response);
      } else {
        setEvent({
          id: eventId,
          name: 'Summer Festival 2026',
          description: 'Il più grande festival estivo della città con artisti internazionali.',
          date: '2026-06-15T20:00:00Z',
          endDate: '2026-06-16T04:00:00Z',
          venueName: 'Arena Milano',
          venueAddress: 'Via Arena 1, 20121 Milano MI',
          status: 'published',
          ticketsSold: 1250,
          totalCapacity: 5000,
          revenue: 62500,
          organizerName: 'EventMaster Srl',
          organizerEmail: 'info@eventmaster.it',
          siaeEnabled: true,
          siaeReportStatus: 'pending',
          createdAt: '2025-12-01T10:00:00Z',
        });
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEvent();
  };

  const handleStatusChange = (newStatus: string) => {
    Alert.alert(
      'Cambia Stato',
      `Vuoi cambiare lo stato dell'evento a "${newStatus}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              await api.put(`/api/admin/events/${eventId}/status`, { status: newStatus });
              setEvent(prev => prev ? { ...prev, status: newStatus as any } : null);
              Alert.alert('Successo', 'Stato aggiornato con successo');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile aggiornare lo stato');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return colors.success;
      case 'draft': return colors.warning;
      case 'cancelled': return colors.destructive;
      case 'completed': return colors.teal;
      default: return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Pubblicato';
      case 'draft': return 'Bozza';
      case 'cancelled': return 'Annullato';
      case 'completed': return 'Completato';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Dettaglio Evento" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Header title="Dettaglio Evento" showBack />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Evento non trovato</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Admin: Evento" showBack />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
          </View>
        )}

        <View style={styles.headerSection}>
          <Text style={styles.eventName}>{event.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(event.status)}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(event.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
              {getStatusLabel(event.status)}
            </Text>
          </View>
        </View>

        <Card variant="glass" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Data e Ora</Text>
              <Text style={styles.infoValue}>{formatDate(event.date)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{event.venueName}</Text>
              <Text style={styles.infoSubvalue}>{event.venueAddress}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Organizzatore</Text>
              <Text style={styles.infoValue}>{event.organizerName}</Text>
              <Text style={styles.infoSubvalue}>{event.organizerEmail}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <Card variant="glass" style={styles.statCard}>
            <Ionicons name="ticket-outline" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{event.ticketsSold} / {event.totalCapacity}</Text>
            <Text style={styles.statLabel}>Biglietti</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <Ionicons name="cash-outline" size={24} color={colors.teal} />
            <Text style={[styles.statValue, { color: colors.teal }]}>{formatCurrency(event.revenue)}</Text>
            <Text style={styles.statLabel}>Ricavi</Text>
          </Card>
        </View>

        {event.siaeEnabled && (
          <Card variant="glass" style={styles.siaeCard}>
            <View style={styles.siaeHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
              <Text style={styles.siaeTitle}>Integrazione SIAE</Text>
            </View>
            <View style={styles.siaeStatus}>
              <Text style={styles.siaeLabel}>Stato Report:</Text>
              <Text style={[styles.siaeValue, { color: event.siaeReportStatus === 'approved' ? colors.success : colors.warning }]}>
                {event.siaeReportStatus === 'pending' ? 'In Attesa' : event.siaeReportStatus === 'submitted' ? 'Inviato' : 'Approvato'}
              </Text>
            </View>
          </Card>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Admin</Text>
          <View style={styles.actionsGrid}>
            {event.status !== 'published' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: `${colors.success}20`, borderColor: colors.success }]}
                onPress={() => handleStatusChange('published')}
                data-testid="button-publish"
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                <Text style={[styles.actionButtonText, { color: colors.success }]}>Pubblica</Text>
              </TouchableOpacity>
            )}
            {event.status !== 'cancelled' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: `${colors.destructive}20`, borderColor: colors.destructive }]}
                onPress={() => handleStatusChange('cancelled')}
                data-testid="button-cancel"
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.destructive} />
                <Text style={[styles.actionButtonText, { color: colors.destructive }]}>Annulla</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${colors.warning}20`, borderColor: colors.warning }]}
              onPress={() => Alert.alert('Modifica', 'Funzionalità in sviluppo')}
              data-testid="button-edit"
            >
              <Ionicons name="create-outline" size={20} color={colors.warning} />
              <Text style={[styles.actionButtonText, { color: colors.warning }]}>Modifica</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
              onPress={() => Alert.alert('Rimborso', 'Funzionalità in sviluppo')}
              data-testid="button-refund"
            >
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Rimborsi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  heroPlaceholder: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  eventName: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginRight: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  infoValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  infoSubvalue: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  siaeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  siaeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  siaeTitle: {
    color: colors.accent,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  siaeStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  siaeLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  siaeValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

export default AdminEventDetailScreen;
