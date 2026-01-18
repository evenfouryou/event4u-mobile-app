import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface TransmissionDetail {
  id: number;
  type: string;
  status: 'pending' | 'success' | 'error';
  eventId?: number;
  eventName: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  xmlContent?: string;
  errorMessage?: string;
  responseCode?: string;
  attempts?: number;
  fileName?: string;
}

type RouteParams = {
  SIAETransmissionDetail: {
    transmissionId: number;
  };
};

export function SIAETransmissionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'SIAETransmissionDetail'>>();
  const insets = useSafeAreaInsets();
  const { transmissionId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [transmission, setTransmission] = useState<TransmissionDetail | null>(null);
  const [xmlExpanded, setXmlExpanded] = useState(false);

  const loadTransmission = async () => {
    try {
      const response = await api.get<any>(`/api/siae/transmissions/${transmissionId}`);
      const t = response.transmission || response;
      
      setTransmission({
        id: t.id,
        type: t.type || t.reportType || 'RCA',
        status: t.status === 'completed' ? 'success' : t.status === 'failed' ? 'error' : t.status,
        eventId: t.eventId,
        eventName: t.eventName || t.event?.name || 'Evento',
        createdAt: t.createdAt,
        sentAt: t.sentAt,
        completedAt: t.completedAt,
        xmlContent: t.xmlContent || t.content,
        errorMessage: t.errorMessage,
        responseCode: t.responseCode,
        attempts: t.attempts || 1,
        fileName: t.fileName,
      });
    } catch (error) {
      console.error('Error loading transmission:', error);
      Alert.alert('Errore', 'Impossibile caricare i dettagli della trasmissione');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransmission();
  }, [transmissionId]);

  const handleResend = async () => {
    if (!transmission) return;
    
    Alert.alert(
      'Ritrasmetti',
      'Vuoi ritrasmettere questo report alla SIAE?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Ritrasmetti',
          style: 'default',
          onPress: async () => {
            try {
              setResending(true);
              await api.post(`/api/siae/transmissions/${transmissionId}/resend`);
              Alert.alert('Successo', 'Trasmissione reinviata con successo');
              loadTransmission();
            } catch (error: any) {
              Alert.alert('Errore', error.message || 'Impossibile ritrasmettere');
            } finally {
              setResending(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.destructive;
      case 'pending':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Completato';
      case 'error':
        return 'Errore';
      case 'pending':
        return 'In Attesa';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title="Dettaglio Trasmissione"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  if (!transmission) {
    return (
      <View style={styles.container}>
        <Header
          title="Dettaglio Trasmissione"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>Trasmissione non trovata</Text>
          <Button
            title="Torna indietro"
            onPress={() => navigation.goBack()}
            variant="primary"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Dettaglio Trasmissione"
        showBack
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusSection}>
          <View style={[
            styles.statusBanner,
            { backgroundColor: `${getStatusColor(transmission.status)}15` }
          ]}>
            <Ionicons
              name={getStatusIcon(transmission.status) as any}
              size={32}
              color={getStatusColor(transmission.status)}
            />
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: getStatusColor(transmission.status) }]}>
                {getStatusLabel(transmission.status)}
              </Text>
              <Text style={styles.statusSubtext}>
                ID: #{transmission.id}
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.typeText, { color: colors.primary }]}>
                {transmission.type}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informazioni</Text>
          <Card variant="glass">
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Evento</Text>
              <Text style={styles.infoValue}>{transmission.eventName}</Text>
            </View>
            <View style={styles.infoDivider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Creato il</Text>
              <Text style={styles.infoValue}>{formatDate(transmission.createdAt)}</Text>
            </View>
            <View style={styles.infoDivider} />
            
            {transmission.sentAt && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Inviato il</Text>
                  <Text style={styles.infoValue}>{formatDate(transmission.sentAt)}</Text>
                </View>
                <View style={styles.infoDivider} />
              </>
            )}
            
            {transmission.completedAt && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Completato il</Text>
                  <Text style={styles.infoValue}>{formatDate(transmission.completedAt)}</Text>
                </View>
                <View style={styles.infoDivider} />
              </>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tentativi</Text>
              <Text style={styles.infoValue}>{transmission.attempts || 1}</Text>
            </View>
            
            {transmission.fileName && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>File</Text>
                  <Text style={styles.infoValueSmall} numberOfLines={1}>
                    {transmission.fileName}
                  </Text>
                </View>
              </>
            )}
            
            {transmission.responseCode && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Codice Risposta</Text>
                  <Text style={styles.infoValue}>{transmission.responseCode}</Text>
                </View>
              </>
            )}
          </Card>
        </View>

        {transmission.status === 'error' && transmission.errorMessage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dettagli Errore</Text>
            <Card variant="glass" style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Ionicons name="warning-outline" size={20} color={colors.destructive} />
                <Text style={styles.errorTitle}>Messaggio di Errore</Text>
              </View>
              <Text style={styles.errorMessage}>{transmission.errorMessage}</Text>
            </Card>
          </View>
        )}

        {transmission.xmlContent && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.xmlHeader}
              onPress={() => setXmlExpanded(!xmlExpanded)}
              activeOpacity={0.8}
              data-testid="button-toggle-xml"
            >
              <Text style={styles.sectionTitle}>Contenuto XML</Text>
              <Ionicons
                name={xmlExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            
            {xmlExpanded && (
              <Card variant="glass" style={styles.xmlCard}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  style={styles.xmlScrollView}
                >
                  <Text style={styles.xmlContent} selectable>
                    {transmission.xmlContent}
                  </Text>
                </ScrollView>
              </Card>
            )}
          </View>
        )}

        {transmission.status === 'error' && (
          <View style={[styles.section, styles.actionsSection]}>
            <Button
              title={resending ? 'Reinvio in corso...' : 'Ritrasmetti'}
              onPress={handleResend}
              variant="primary"
              loading={resending}
              disabled={resending}
              icon={<Ionicons name="refresh-outline" size={20} color={colors.primaryForeground} />}
            />
          </View>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  errorText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  statusSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statusSubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  typeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  infoLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  infoValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  infoValueSmall: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },
  errorCard: {
    borderWidth: 1,
    borderColor: `${colors.destructive}30`,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorTitle: {
    color: colors.destructive,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  errorMessage: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  xmlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xmlCard: {
    maxHeight: 300,
  },
  xmlScrollView: {
    maxHeight: 260,
  },
  xmlContent: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  actionsSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});

export default SIAETransmissionDetailScreen;
