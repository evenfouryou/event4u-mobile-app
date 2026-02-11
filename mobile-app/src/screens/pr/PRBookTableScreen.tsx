import { useState, useCallback, Fragment } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface PRBookTableScreenProps {
  eventId: string;
  availableTables: Array<{ id: string; name: string; maxGuests: number; price?: number; available: number }>;
  onGoBack: () => void;
  onSubmit: (data: {
    tableTypeId: string;
    customerName: string;
    customerPhone?: string;
    notes?: string;
    guests: Array<{ firstName: string; lastName: string; phone?: string; gender: string }>;
  }) => Promise<void>;
}

interface GuestEntry {
  firstName: string;
  lastName: string;
  phone: string;
  gender: 'M' | 'F';
}

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function PRBookTableScreen({ eventId, availableTables, onGoBack, onSubmit }: PRBookTableScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [guests, setGuests] = useState<GuestEntry[]>([{ firstName: '', lastName: '', phone: '', gender: 'M' }]);
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedTableId;
      case 2: return !!customerName.trim();
      case 3: return guests.some(g => g.firstName.trim() && g.lastName.trim());
      default: return false;
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const results = await api.searchRegisteredUsers(query).catch(() => []);
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const addParticipantFromSearch = (result: SearchResult) => {
    const newGuest: GuestEntry = {
      firstName: result.firstName,
      lastName: result.lastName,
      phone: result.phone || '',
      gender: 'M',
    };
    setGuests(prev => {
      const firstEmptyIndex = prev.findIndex(g => !g.firstName.trim() && !g.lastName.trim());
      if (firstEmptyIndex !== -1) {
        const updated = [...prev];
        updated[firstEmptyIndex] = newGuest;
        return updated;
      }
      return [...prev, newGuest];
    });
    setSearchQuery('');
    setSearchResults([]);
    triggerHaptic('light');
  };

  const updateGuest = (index: number, field: keyof GuestEntry, value: string) => {
    setGuests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleGender = (index: number) => {
    setGuests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], gender: updated[index].gender === 'M' ? 'F' : 'M' };
      return updated;
    });
    triggerHaptic('light');
  };

  const removeGuest = (index: number) => {
    if (guests.length <= 1) return;
    setGuests(prev => prev.filter((_, i) => i !== index));
    triggerHaptic('light');
  };

  const addGuest = () => {
    setGuests(prev => [...prev, { firstName: '', lastName: '', phone: '', gender: 'M' }]);
    triggerHaptic('light');
  };

  const handleSubmit = async () => {
    if (!selectedTableId) {
      Alert.alert('Errore', 'Seleziona un tavolo');
      return;
    }
    if (!customerName.trim()) {
      Alert.alert('Errore', 'Il nome prenotazione è obbligatorio');
      return;
    }
    const validGuests = guests.filter(g => g.firstName.trim() && g.lastName.trim());
    if (validGuests.length === 0) {
      Alert.alert('Errore', 'Inserisci almeno un partecipante con nome e cognome');
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit({
        tableTypeId: selectedTableId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        guests: validGuests.map(g => ({
          firstName: g.firstName.trim(),
          lastName: g.lastName.trim(),
          phone: g.phone.trim() || undefined,
          gender: g.gender,
        })),
      });
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile prenotare il tavolo');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="screen-book-table">
      <View style={styles.header}>
        <Pressable onPress={onGoBack} style={styles.backButton} testID="button-go-back">
          <Ionicons name="arrow-back" size={24} color={staticColors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Prenota Tavolo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((step, index) => (
          <Fragment key={step}>
            {index > 0 && <View style={[styles.stepLine, currentStep > index ? styles.stepLineActive : null]} />}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep >= step ? styles.stepCircleActive : null, currentStep > step ? styles.stepCircleCompleted : null]}>
                {currentStep > step ? (
                  <Ionicons name="checkmark" size={14} color={staticColors.primaryForeground} />
                ) : (
                  <Text style={[styles.stepNumber, currentStep >= step ? styles.stepNumberActive : null]}>{step}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, currentStep >= step ? styles.stepLabelActive : null]}>
                {['Tavolo', 'Dati', 'Partecipanti'][index]}
              </Text>
            </View>
          </Fragment>
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID="scroll-content"
        >
          {currentStep === 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Seleziona Tavolo</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tablesRow}
                testID="scroll-tables"
              >
                {availableTables.map((table) => {
                  const isSelected = selectedTableId === table.id;
                  return (
                    <Pressable
                      key={table.id}
                      onPress={() => {
                        setSelectedTableId(table.id);
                        triggerHaptic('light');
                      }}
                      testID={`table-card-${table.id}`}
                    >
                      <View
                        style={[
                          styles.tableCard,
                          isSelected && styles.tableCardSelected,
                        ]}
                      >
                        <Text style={[styles.tableCardName, isSelected && styles.tableCardNameSelected]}>
                          {table.name}
                        </Text>
                        <View style={styles.tableCardInfo}>
                          <Ionicons name="people-outline" size={14} color={isSelected ? staticColors.primaryForeground : staticColors.mutedForeground} />
                          <Text style={[styles.tableCardDetail, isSelected && styles.tableCardDetailSelected]}>
                            Max {table.maxGuests}
                          </Text>
                        </View>
                        {table.price != null && table.price > 0 && (
                          <Text style={[styles.tableCardPrice, isSelected && styles.tableCardPriceSelected]}>
                            {formatPrice(table.price)}
                          </Text>
                        )}
                        <Text style={[styles.tableCardAvail, isSelected && styles.tableCardDetailSelected]}>
                          {table.available} disponibil{table.available === 1 ? 'e' : 'i'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Dati Prenotazione</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome prenotazione *</Text>
                <TextInput
                  style={styles.input}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Es. Mario Rossi"
                  placeholderTextColor={staticColors.mutedForeground}
                  testID="input-customer-name"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefono</Text>
                <TextInput
                  style={styles.input}
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  placeholder="Es. +39 333 1234567"
                  placeholderTextColor={staticColors.mutedForeground}
                  keyboardType="phone-pad"
                  testID="input-customer-phone"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Note (opzionale)</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Richieste speciali, preferenze..."
                  placeholderTextColor={staticColors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  testID="input-notes"
                />
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Partecipanti</Text>
                <Badge variant="golden" size="sm" testID="badge-guest-count">
                  {`${guests.length}`}
                </Badge>
              </View>

              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color={staticColors.mutedForeground} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholder="Cerca partecipante per nome o telefono..."
                    placeholderTextColor={staticColors.mutedForeground}
                    testID="input-search-participant"
                  />
                  {searching && <ActivityIndicator size="small" color={staticColors.primary} />}
                </View>
                {searchResults.length > 0 && (
                  <View style={styles.searchDropdown} testID="search-results-dropdown">
                    {searchResults.map((result) => (
                      <Pressable
                        key={result.id}
                        style={styles.searchResultItem}
                        onPress={() => addParticipantFromSearch(result)}
                        testID={`search-result-${result.id}`}
                      >
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>
                            {result.firstName} {result.lastName}
                          </Text>
                          {result.phone ? (
                            <Text style={styles.searchResultPhone}>{result.phone}</Text>
                          ) : null}
                        </View>
                        <Ionicons name="add-circle" size={22} color={staticColors.primary} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {guests.map((guest, index) => (
                <View key={index} style={styles.guestCard} testID={`guest-card-${index}`}>
                  <View style={styles.guestCardHeader}>
                    <View style={styles.guestNumberBadge}>
                      <Text style={styles.guestNumberText}>#{index + 1}</Text>
                    </View>
                    {guests.length > 1 && (
                      <Pressable
                        onPress={() => removeGuest(index)}
                        style={styles.deleteGuestButton}
                        testID={`button-remove-guest-${index}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={staticColors.destructive} />
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.guestNameRow}>
                    <View style={styles.guestNameField}>
                      <TextInput
                        style={styles.guestInput}
                        value={guest.firstName}
                        onChangeText={(v) => updateGuest(index, 'firstName', v)}
                        placeholder="Nome"
                        placeholderTextColor={staticColors.mutedForeground}
                        testID={`input-guest-firstname-${index}`}
                      />
                    </View>
                    <View style={styles.guestNameField}>
                      <TextInput
                        style={styles.guestInput}
                        value={guest.lastName}
                        onChangeText={(v) => updateGuest(index, 'lastName', v)}
                        placeholder="Cognome"
                        placeholderTextColor={staticColors.mutedForeground}
                        testID={`input-guest-lastname-${index}`}
                      />
                    </View>
                  </View>
                  <TextInput
                    style={styles.guestInput}
                    value={guest.phone}
                    onChangeText={(v) => updateGuest(index, 'phone', v)}
                    placeholder="Telefono"
                    placeholderTextColor={staticColors.mutedForeground}
                    keyboardType="phone-pad"
                    testID={`input-guest-phone-${index}`}
                  />
                  <View style={styles.genderRow}>
                    <Pressable
                      style={[styles.genderOption, guest.gender === 'M' && styles.genderOptionActive]}
                      onPress={() => updateGuest(index, 'gender', 'M')}
                      testID={`button-gender-m-${index}`}
                    >
                      <Text style={[styles.genderText, guest.gender === 'M' && styles.genderTextActive]}>M</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.genderOption, guest.gender === 'F' && styles.genderOptionActive]}
                      onPress={() => updateGuest(index, 'gender', 'F')}
                      testID={`button-gender-f-${index}`}
                    >
                      <Text style={[styles.genderText, guest.gender === 'F' && styles.genderTextActive]}>F</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              <Pressable style={styles.addGuestButton} onPress={addGuest} testID="button-add-guest">
                <Ionicons name="add" size={20} color={staticColors.primary} />
                <Text style={styles.addGuestText}>Aggiungi Partecipante</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button
            variant="ghost"
            onPress={currentStep === 1 ? onGoBack : () => setCurrentStep(prev => prev - 1 as any)}
            style={styles.footerButton}
            testID="button-back"
          >
            {currentStep === 1 ? 'Annulla' : 'Indietro'}
          </Button>
          {currentStep < 3 ? (
            <Button
              variant="golden"
              onPress={() => { triggerHaptic('light'); setCurrentStep(prev => prev + 1 as any); }}
              disabled={!canProceed()}
              style={styles.footerButton}
              testID="button-next"
            >
              Avanti
            </Button>
          ) : (
            <Button
              variant="golden"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting || !canProceed()}
              style={styles.footerButton}
              testID="button-submit"
            >
              Invia per Approvazione
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: staticColors.glass,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginBottom: spacing.lg,
  },
  tablesRow: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  tableCard: {
    width: 150,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: staticColors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tableCardSelected: {
    borderColor: staticColors.primary,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  tableCardName: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  tableCardNameSelected: {
    color: staticColors.primary,
  },
  tableCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tableCardDetail: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  tableCardDetailSelected: {
    color: staticColors.primaryForeground,
  },
  tableCardPrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.golden,
  },
  tableCardPriceSelected: {
    color: staticColors.primaryForeground,
  },
  tableCardAvail: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: spacing.sm + 4,
  },
  searchContainer: {
    marginBottom: spacing.md,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  searchDropdown: {
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
    ...shadows.md,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  searchResultPhone: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  guestCard: {
    backgroundColor: staticColors.glass,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  guestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestNumberBadge: {
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.full,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestNumberText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  deleteGuestButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  guestNameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  guestNameField: {
    flex: 1,
  },
  guestInput: {
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: staticColors.border,
    backgroundColor: staticColors.card,
  },
  genderOptionActive: {
    borderColor: staticColors.primary,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  genderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  genderTextActive: {
    color: staticColors.primary,
  },
  addGuestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: staticColors.primary,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
  },
  addGuestText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    backgroundColor: staticColors.background,
  },
  footerButton: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 0,
  },
  stepItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: staticColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  stepCircleActive: {
    borderColor: staticColors.primary,
    backgroundColor: staticColors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: staticColors.primary,
  },
  stepNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: staticColors.mutedForeground,
  },
  stepNumberActive: {
    color: staticColors.primaryForeground,
  },
  stepLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  stepLabelActive: {
    color: staticColors.primary,
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: staticColors.border,
    marginBottom: spacing.lg,
  },
  stepLineActive: {
    backgroundColor: staticColors.primary,
  },
});
