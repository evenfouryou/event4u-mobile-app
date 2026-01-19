import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

type ReportType = 'RCA' | 'RMG' | 'RPM';

interface Event {
  id: number;
  name: string;
  date: string;
}

type RouteParams = {
  SIAEReports: {
    defaultType?: ReportType;
  };
};

export function SIAEReportsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'SIAEReports'>>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const defaultType = route.params?.defaultType || 'RCA';
  
  const [selectedType, setSelectedType] = useState<ReportType>(defaultType);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);

  const reportTypes: { type: ReportType; label: string; description: string; icon: string }[] = [
    {
      type: 'RCA',
      label: 'RCA',
      description: 'Riepilogo Controllo Accessi',
      icon: 'document-text-outline',
    },
    {
      type: 'RMG',
      label: 'RMG',
      description: 'Report Mensile Giornaliero',
      icon: 'calendar-outline',
    },
    {
      type: 'RPM',
      label: 'RPM',
      description: 'Report Periodo Mensile',
      icon: 'stats-chart-outline',
    },
  ];

  const loadEvents = async () => {
    try {
      const response = await api.get<any[]>('/api/events');
      setEvents(
        (response || []).map((e: any) => ({
          id: e.id,
          name: e.name || e.title,
          date: e.date,
        }))
      );
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleValidate = async () => {
    if (!selectedEvent && selectedType === 'RCA') {
      Alert.alert('Attenzione', 'Seleziona un evento per il report RCA');
      return;
    }

    try {
      setValidating(true);
      const response = await api.post<any>('/api/siae/validate', {
        type: selectedType,
        eventId: selectedEvent?.id,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      });
      
      setPreviewData(response);
      setShowPreview(true);
    } catch (error: any) {
      Alert.alert('Errore Validazione', error.message || 'Impossibile validare il report');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEvent && selectedType === 'RCA') {
      Alert.alert('Attenzione', 'Seleziona un evento per il report RCA');
      return;
    }

    Alert.alert(
      'Conferma Trasmissione',
      'Vuoi trasmettere questo report alla SIAE?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Trasmetti',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const response = await api.post<any>('/api/siae/transmit', {
                type: selectedType,
                eventId: selectedEvent?.id,
                dateFrom: dateFrom.toISOString(),
                dateTo: dateTo.toISOString(),
              });
              
              Alert.alert(
                'Successo',
                'Report trasmesso con successo',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setShowPreview(false);
                      navigation.navigate('SIAETransmissionDetail', {
                        transmissionId: response.transmissionId || response.id,
                      });
                    },
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Errore Trasmissione', error.message || 'Impossibile trasmettere il report');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const renderReportTypeCard = (type: typeof reportTypes[0]) => {
    const isSelected = selectedType === type.type;
    return (
      <TouchableOpacity
        key={type.type}
        style={[
          styles.typeCard,
          isSelected && styles.typeCardSelected,
          (isTablet || isLandscape) && styles.typeCardLandscape,
        ]}
        onPress={() => setSelectedType(type.type)}
        activeOpacity={0.8}
        testID={`select-type-${type.type}`}
      >
        <View style={[
          styles.typeIcon,
          { backgroundColor: isSelected ? colors.primary : `${colors.primary}20` }
        ]}>
          <Ionicons
            name={type.icon as any}
            size={24}
            color={isSelected ? colors.primaryForeground : colors.primary}
          />
        </View>
        <View style={styles.typeInfo}>
          <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
            {type.label}
          </Text>
          <Text style={styles.typeDescription}>{type.description}</Text>
        </View>
        <View style={[
          styles.radioOuter,
          isSelected && styles.radioOuterSelected
        ]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Genera Report SIAE"
        showBack
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isTablet || isLandscape) && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        testID="scroll-view-reports"
      >
        <View style={[
          styles.mainContent,
          (isTablet || isLandscape) && styles.mainContentLandscape,
        ]}>
          <View style={[
            styles.leftColumn,
            (isTablet || isLandscape) && styles.leftColumnLandscape,
          ]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo Report</Text>
              <View style={[
                styles.typeCardsContainer,
                (isTablet || isLandscape) && styles.typeCardsContainerLandscape,
              ]}>
                {reportTypes.map(renderReportTypeCard)}
              </View>
            </View>
          </View>

          <View style={[
            styles.rightColumn,
            (isTablet || isLandscape) && styles.rightColumnLandscape,
          ]}>
            {selectedType === 'RCA' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Evento</Text>
                <TouchableOpacity
                  style={styles.eventSelector}
                  onPress={() => setShowEventPicker(true)}
                  activeOpacity={0.8}
                  testID="button-select-event"
                >
                  <Card variant="glass">
                    <View style={styles.eventSelectorContent}>
                      <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                      <Text style={styles.eventSelectorText}>
                        {selectedEvent ? selectedEvent.name : 'Seleziona evento'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                    </View>
                  </Card>
                </TouchableOpacity>
              </View>
            )}

            {(selectedType === 'RMG' || selectedType === 'RPM') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Periodo</Text>
                <Card variant="glass">
                  <View style={styles.dateRow}>
                    <View style={styles.dateField}>
                      <Text style={styles.dateLabel}>Da</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(dateFrom);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setDateFrom(newDate);
                        }}
                        testID="button-date-from"
                      >
                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                        <Text style={styles.dateValue}>{formatDate(dateFrom)}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.dateField}>
                      <Text style={styles.dateLabel}>A</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          setDateTo(new Date());
                        }}
                        testID="button-date-to"
                      >
                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                        <Text style={styles.dateValue}>{formatDate(dateTo)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </View>
            )}

            <View style={[styles.section, styles.actionsSection]}>
              <Button
                title={validating ? 'Validazione...' : 'Anteprima'}
                onPress={handleValidate}
                variant="secondary"
                loading={validating}
                disabled={validating || (selectedType === 'RCA' && !selectedEvent)}
                testID="button-preview"
              />
              <Button
                title={submitting ? 'Trasmissione...' : 'Trasmetti a SIAE'}
                onPress={handleSubmit}
                variant="primary"
                loading={submitting}
                disabled={submitting || (selectedType === 'RCA' && !selectedEvent)}
                icon={<Ionicons name="send-outline" size={20} color={colors.primaryForeground} />}
                testID="button-submit"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showEventPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEventPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            (isTablet || isLandscape) && styles.modalContentLandscape,
          ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Evento</Text>
              <TouchableOpacity
                onPress={() => setShowEventPicker(false)}
                testID="button-close-event-picker"
              >
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            {loadingEvents ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.eventList}>
                <View style={[
                  styles.eventsGrid,
                  (isTablet || isLandscape) && styles.eventsGridLandscape,
                ]}>
                  {events.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.eventItem,
                        selectedEvent?.id === event.id && styles.eventItemSelected,
                        (isTablet || isLandscape) && styles.eventItemLandscape,
                      ]}
                      onPress={() => {
                        setSelectedEvent(event);
                        setShowEventPicker(false);
                      }}
                      testID={`event-item-${event.id}`}
                    >
                      <Text style={styles.eventName}>{event.name}</Text>
                      <Text style={styles.eventDate}>
                        {new Date(event.date).toLocaleDateString('it-IT')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPreview}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            styles.previewModal,
            (isTablet || isLandscape) && styles.modalContentLandscape,
          ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Anteprima Report</Text>
              <TouchableOpacity
                onPress={() => setShowPreview(false)}
                testID="button-close-preview"
              >
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.previewContent}>
              {previewData && (
                <>
                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Tipo Report</Text>
                    <Text style={styles.previewValue} testID="preview-type">{selectedType}</Text>
                  </View>
                  {selectedEvent && (
                    <View style={styles.previewSection}>
                      <Text style={styles.previewLabel}>Evento</Text>
                      <Text style={styles.previewValue} testID="preview-event">{selectedEvent.name}</Text>
                    </View>
                  )}
                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Stato Validazione</Text>
                    <View style={[
                      styles.validationBadge,
                      { backgroundColor: previewData.valid ? `${colors.success}20` : `${colors.destructive}20` }
                    ]}>
                      <Ionicons
                        name={previewData.valid ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={previewData.valid ? colors.success : colors.destructive}
                      />
                      <Text style={[
                        styles.validationText,
                        { color: previewData.valid ? colors.success : colors.destructive }
                      ]} testID="preview-validation-status">
                        {previewData.valid ? 'Valido' : 'Non valido'}
                      </Text>
                    </View>
                  </View>
                  {previewData.summary && (
                    <View style={styles.previewSection}>
                      <Text style={styles.previewLabel}>Riepilogo</Text>
                      <Text style={styles.previewValue} testID="preview-summary">
                        {JSON.stringify(previewData.summary, null, 2)}
                      </Text>
                    </View>
                  )}
                  {previewData.errors && previewData.errors.length > 0 && (
                    <View style={styles.previewSection}>
                      <Text style={[styles.previewLabel, { color: colors.destructive }]}>Errori</Text>
                      {previewData.errors.map((error: string, index: number) => (
                        <Text key={index} style={styles.errorItem} testID={`preview-error-${index}`}>{error}</Text>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            <View style={styles.previewActions}>
              <Button
                title="Annulla"
                onPress={() => setShowPreview(false)}
                variant="secondary"
                style={{ flex: 1 }}
                testID="button-cancel-preview"
              />
              <Button
                title="Trasmetti"
                onPress={handleSubmit}
                variant="primary"
                loading={submitting}
                disabled={submitting || !previewData?.valid}
                style={{ flex: 1 }}
                icon={<Ionicons name="send-outline" size={20} color={colors.primaryForeground} />}
                testID="button-transmit-preview"
              />
            </View>
          </View>
        </View>
      </Modal>
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
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentLandscape: {
    paddingBottom: 40,
  },
  mainContent: {
    flex: 1,
  },
  mainContentLandscape: {
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 1,
  },
  leftColumnLandscape: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rightColumn: {
    flex: 1,
  },
  rightColumnLandscape: {
    flex: 1,
    paddingLeft: spacing.md,
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
  typeCardsContainer: {
    gap: spacing.md,
  },
  typeCardsContainerLandscape: {
    gap: spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  typeCardLandscape: {
    padding: spacing.md,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  typeLabelSelected: {
    color: colors.primary,
  },
  typeDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  eventSelector: {
    marginBottom: spacing.md,
  },
  eventSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventSelectorText: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  actionsSection: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '70%',
  },
  modalContentLandscape: {
    maxHeight: '85%',
  },
  previewModal: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  modalLoading: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  eventList: {
    padding: spacing.lg,
  },
  eventsGrid: {
    gap: spacing.md,
  },
  eventsGridLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  eventItem: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventItemLandscape: {
    width: '48%',
  },
  eventItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  eventDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  previewContent: {
    padding: spacing.lg,
  },
  previewSection: {
    marginBottom: spacing.lg,
  },
  previewLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  previewValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  validationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  validationText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  errorItem: {
    color: colors.destructive,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default SIAEReportsScreen;
