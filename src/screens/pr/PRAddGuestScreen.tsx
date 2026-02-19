import { useState, useEffect, useCallback, Fragment } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

const PHONE_PREFIXES = ['+39', '+41', '+43', '+33', '+49', '+44', '+1'];

interface PRAddGuestScreenProps {
  eventId: string;
  guestLists: Array<{ id: string; name: string }>;
  onGoBack: () => void;
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    phone?: string;
    gender: string;
    listId?: string;
  }) => Promise<void>;
}

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function PRAddGuestScreen({ eventId, guestLists, onGoBack, onSubmit }: PRAddGuestScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+39');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchPhonePrefix, setSearchPhonePrefix] = useState('+39');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (guestLists.length > 0) {
      setSelectedListId(guestLists[0].id);
    }
  }, [guestLists]);

  const cycleSearchPrefix = () => {
    const currentIndex = PHONE_PREFIXES.indexOf(searchPhonePrefix);
    const nextIndex = (currentIndex + 1) % PHONE_PREFIXES.length;
    setSearchPhonePrefix(PHONE_PREFIXES[nextIndex]);
    triggerHaptic('light');
  };

  const cyclePhonePrefix = () => {
    const currentIndex = PHONE_PREFIXES.indexOf(phonePrefix);
    const nextIndex = (currentIndex + 1) % PHONE_PREFIXES.length;
    setPhonePrefix(PHONE_PREFIXES[nextIndex]);
    triggerHaptic('light');
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const isPhoneNumber = /^\d+$/.test(query.replace(/[\s\-()]/g, ''));
      const searchTerm = isPhoneNumber ? `${searchPhonePrefix}${query.replace(/^0+/, '')}` : query;
      const results = await api.searchRegisteredUsers(searchTerm).catch(() => []);
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchPhonePrefix]);

  const selectSearchResult = (result: SearchResult) => {
    setFirstName(result.firstName);
    setLastName(result.lastName);

    let parsedPrefix = '+39';
    let parsedPhone = result.phone || '';

    if (result.phone) {
      for (const prefix of PHONE_PREFIXES) {
        if (result.phone.startsWith(prefix)) {
          parsedPrefix = prefix;
          parsedPhone = result.phone.substring(prefix.length);
          break;
        }
      }
    }

    setPhonePrefix(parsedPrefix);
    setPhone(parsedPhone);
    setSearchQuery('');
    setSearchResults([]);
    triggerHaptic('light');
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      Alert.alert('Errore', 'Il nome è obbligatorio');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Errore', 'Il cognome è obbligatorio');
      return;
    }
    try {
      setSubmitting(true);
      const fullPhone = phone.trim() ? `${phonePrefix}${phone.trim().replace(/^0+/, '')}` : undefined;
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: fullPhone,
        gender,
        listId: selectedListId || undefined,
      });
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile aggiungere ospite');
    } finally {
      setSubmitting(false);
    }
  };

  const showListSelector = guestLists.length > 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="screen-add-guest">
      <View style={styles.header}>
        <Pressable onPress={onGoBack} style={styles.backButton} testID="button-go-back">
          <Ionicons name="arrow-back" size={24} color={staticColors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Aggiungi Ospite</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.stepIndicator}>
        {[1, 2].map((step, index) => (
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
                {['Cerca', 'Dati'][index]}
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
            <>
              {showListSelector && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Seleziona Lista</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.listsRow}
                      testID="scroll-lists"
                    >
                      {guestLists.map((list) => {
                        const isSelected = selectedListId === list.id;
                        return (
                          <Pressable
                            key={list.id}
                            onPress={() => {
                              setSelectedListId(list.id);
                              triggerHaptic('light');
                            }}
                            testID={`list-pill-${list.id}`}
                          >
                            <View
                              style={[
                                styles.listPill,
                                isSelected && styles.listPillSelected,
                              ]}
                            >
                              <Text style={[styles.listPillText, isSelected && styles.listPillTextSelected]}>
                                {list.name}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Cerca Ospite</Text>
                <View style={styles.searchContainer}>
                  <View style={styles.searchBar}>
                    <Pressable onPress={cycleSearchPrefix} style={styles.prefixButton} testID="button-search-prefix">
                      <Text style={styles.prefixText}>{searchPhonePrefix}</Text>
                    </Pressable>
                    <TextInput
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={handleSearch}
                      placeholder="Cerca per nome o telefono..."
                      placeholderTextColor={staticColors.mutedForeground}
                      testID="input-search-guest"
                    />
                    {searching ? (
                      <ActivityIndicator size="small" color={staticColors.primary} />
                    ) : (
                      <Ionicons name="search" size={18} color={staticColors.mutedForeground} />
                    )}
                  </View>
                  {searchResults.length > 0 && (
                    <View style={styles.searchDropdown} testID="search-results-dropdown">
                      {searchResults.map((result) => (
                        <Pressable
                          key={result.id}
                          style={styles.searchResultItem}
                          onPress={() => selectSearchResult(result)}
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
              </View>
            </>
          )}

          {currentStep === 2 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Dati Ospite</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Nome"
                  placeholderTextColor={staticColors.mutedForeground}
                  testID="input-first-name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cognome *</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Cognome"
                  placeholderTextColor={staticColors.mutedForeground}
                  testID="input-last-name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefono (opzionale)</Text>
                <View style={styles.phoneRow}>
                  <Pressable onPress={cyclePhonePrefix} style={styles.phonePrefixButton} testID="button-phone-prefix">
                    <Text style={styles.phonePrefixText}>{phonePrefix}</Text>
                    <Ionicons name="chevron-down" size={14} color={staticColors.mutedForeground} />
                  </Pressable>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Telefono (opzionale)"
                    placeholderTextColor={staticColors.mutedForeground}
                    keyboardType="phone-pad"
                    testID="input-phone"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Genere</Text>
                <View style={styles.genderRow}>
                  <Pressable
                    style={[styles.genderOption, gender === 'M' && styles.genderOptionActive]}
                    onPress={() => { setGender('M'); triggerHaptic('light'); }}
                    testID="button-gender-m"
                  >
                    <Ionicons
                      name="male"
                      size={18}
                      color={gender === 'M' ? staticColors.primary : staticColors.mutedForeground}
                    />
                    <Text style={[styles.genderText, gender === 'M' && styles.genderTextActive]}>M</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.genderOption, gender === 'F' && styles.genderOptionActive]}
                    onPress={() => { setGender('F'); triggerHaptic('light'); }}
                    testID="button-gender-f"
                  >
                    <Ionicons
                      name="female"
                      size={18}
                      color={gender === 'F' ? staticColors.primary : staticColors.mutedForeground}
                    />
                    <Text style={[styles.genderText, gender === 'F' && styles.genderTextActive]}>F</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button
            variant="ghost"
            onPress={currentStep === 1 ? onGoBack : () => setCurrentStep(1)}
            style={styles.footerButton}
            testID="button-back"
          >
            {currentStep === 1 ? 'Annulla' : 'Indietro'}
          </Button>
          {currentStep === 1 ? (
            <Button
              variant="golden"
              onPress={() => { triggerHaptic('light'); setCurrentStep(2); }}
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
              disabled={submitting || !firstName.trim() || !lastName.trim()}
              style={styles.footerButton}
              testID="button-submit"
            >
              Aggiungi
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
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
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
  listsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  listPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: staticColors.border,
    backgroundColor: staticColors.card,
  },
  listPillSelected: {
    borderColor: staticColors.primary,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  listPillText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  listPillTextSelected: {
    color: staticColors.primary,
  },
  searchContainer: {
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  prefixButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRightWidth: 1,
    borderRightColor: staticColors.border,
  },
  prefixText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
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
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  phonePrefixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  phonePrefixText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  phoneInput: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
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
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    backgroundColor: staticColors.background,
  },
  footerButton: {
    flex: 1,
  },
});
