import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreLocation } from '@/lib/api';

interface LocationFormData {
  name: string;
  address: string;
  city: string;
  capacity: string;
  notes: string;
  siaeLocationCode: string;
}

type FilterType = 'all' | 'active' | 'inactive';

interface GestoreLocationsScreenProps {
  onBack: () => void;
  onLocationPress?: (location: GestoreLocation) => void;
  onAddLocation?: () => void;
}

const initialFormData: LocationFormData = {
  name: '',
  address: '',
  city: '',
  capacity: '',
  notes: '',
  siaeLocationCode: '',
};

export function GestoreLocationsScreen({ onBack, onLocationPress, onAddLocation }: GestoreLocationsScreenProps) {
  const { colors, gradients } = useTheme();
  const [locations, setLocations] = useState<GestoreLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<GestoreLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<LocationFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLocation, setEditingLocation] = useState<GestoreLocation | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    filterLocations();
  }, [locations, activeFilter, searchQuery]);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getGestoreLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLocations = () => {
    let filtered = [...locations];

    if (activeFilter === 'active') {
      filtered = filtered.filter(location => location.status === 'active');
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(location => location.status === 'inactive');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(location =>
        location.name.toLowerCase().includes(query) ||
        location.address.toLowerCase().includes(query) ||
        location.city.toLowerCase().includes(query)
      );
    }

    setFilteredLocations(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocations();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attiva</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattiva</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'active', label: 'Attivi' },
    { id: 'inactive', label: 'Inattivi' },
  ];

  const handleLocationPress = (location: GestoreLocation) => {
    triggerHaptic('light');
    onLocationPress?.(location);
  };

  const handleAddLocation = () => {
    triggerHaptic('light');
    setEditingLocation(null);
    setFormData(initialFormData);
    setShowCreateModal(true);
  };

  const handleEditLocation = (location: GestoreLocation) => {
    triggerHaptic('light');
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      city: location.city,
      capacity: location.capacity?.toString() || '',
      notes: location.notes || '',
      siaeLocationCode: location.siaeLocationCode || '',
    });
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingLocation(null);
    setFormData(initialFormData);
  };

  const handleSaveLocation = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Errore', 'Inserisci il nome della location');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Errore', 'Inserisci l\'indirizzo');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Errore', 'Inserisci la città');
      return;
    }

    try {
      setIsSaving(true);
      triggerHaptic('medium');
      
      const locationData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
        notes: formData.notes.trim() || undefined,
        siaeLocationCode: formData.siaeLocationCode.trim() || undefined,
      };

      if (editingLocation) {
        await api.updateLocation(editingLocation.id, locationData);
      } else {
        await api.createLocation(locationData);
      }

      triggerHaptic('success');
      handleCloseModal();
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      triggerHaptic('error');
      Alert.alert('Errore', editingLocation ? 'Impossibile aggiornare la location' : 'Impossibile creare la location');
    } finally {
      setIsSaving(false);
    }
  };

  const renderLocation = ({ item }: { item: GestoreLocation }) => (
    <Card style={styles.locationCard} testID={`location-card-${item.id}`}>
      <View style={styles.locationContent}>
        <Pressable
          onPress={() => handleLocationPress(item)}
          testID={`location-item-${item.id}`}
          style={styles.locationMainArea}
        >
          <View style={[styles.locationIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="location-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={[styles.locationName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.locationAddress, { color: colors.mutedForeground }]}>
              {item.address}, {item.city}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  Capacità: {item.capacity}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  {item.eventsCount} eventi
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
        <View style={styles.locationActions}>
          {getStatusBadge(item.status)}
          <Pressable
            onPress={() => handleEditLocation(item)}
            style={[styles.editButton, { backgroundColor: colors.secondary }]}
            testID={`button-edit-location-${item.id}`}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-locations"
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca sede..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-location"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(item.id);
              }}
              style={[
                styles.filterChip,
                { backgroundColor: colors.secondary },
                activeFilter === item.id && styles.filterChipActive,
              ]}
              testID={`filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.mutedForeground },
                  activeFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {showLoader ? (
        <Loading text="Caricamento sedi..." />
      ) : hasError ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Errore di caricamento</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Impossibile caricare le location
          </Text>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              loadLocations();
            }}
            style={[styles.retryButton, { borderColor: colors.border }]}
            testID="button-retry"
          >
            <Text style={[styles.retryButtonText, { color: colors.foreground }]}>Riprova</Text>
          </Pressable>
        </View>
      ) : filteredLocations.length > 0 ? (
        <FlatList
          data={filteredLocations}
          renderItem={renderLocation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna sede trovata</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'Aggiungi sedi per gestire le tue location'}
          </Text>
        </View>
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddLocation}
        testID="button-add-location"
      >
        <Ionicons name="add" size={28} color={staticColors.primaryForeground} />
      </Pressable>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <LinearGradient
                  colors={gradients.primary as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalHeaderGradient}
                >
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="location" size={28} color="#FFF" />
                  </View>
                  <Text style={styles.modalTitle}>{editingLocation ? 'Modifica Location' : 'Nuova Location'}</Text>
                  <Text style={styles.modalSubtitle}>{editingLocation ? 'Aggiorna i dettagli della sede' : 'Aggiungi una nuova sede per i tuoi eventi'}</Text>
                </LinearGradient>
                <Pressable
                  onPress={handleCloseModal}
                  style={styles.modalCloseButton}
                  testID="button-close-modal"
                >
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Nome Location *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="es. Club Milano"
                    placeholderTextColor={colors.mutedForeground}
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    testID="input-location-name"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Indirizzo *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="es. Via Roma 123"
                    placeholderTextColor={colors.mutedForeground}
                    value={formData.address}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                    testID="input-location-address"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Città *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="es. Milano"
                    placeholderTextColor={colors.mutedForeground}
                    value={formData.city}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                    testID="input-location-city"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Capacità</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="es. 500"
                    placeholderTextColor={colors.mutedForeground}
                    value={formData.capacity}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, capacity: text.replace(/[^0-9]/g, '') }))}
                    keyboardType="number-pad"
                    testID="input-location-capacity"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Codice SIAE Location</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="es. ABC123"
                    placeholderTextColor={colors.mutedForeground}
                    value={formData.siaeLocationCode}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, siaeLocationCode: text }))}
                    testID="input-location-siae-code"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Note</Text>
                  <TextInput
                    style={[styles.formTextArea, { backgroundColor: colors.secondary, color: colors.foreground }]}
                    placeholder="Note aggiuntive..."
                    placeholderTextColor={colors.mutedForeground}
                    value={formData.notes}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    testID="input-location-notes"
                  />
                </View>

                <View style={styles.formSpacer} />
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <Button
                  variant="outline"
                  onPress={handleCloseModal}
                  style={styles.modalButton}
                  disabled={isSaving}
                  testID="button-cancel-create"
                >
                  <Text style={[styles.modalButtonText, { color: colors.foreground }]}>Annulla</Text>
                </Button>
                <Button
                  onPress={handleSaveLocation}
                  style={styles.modalButtonPrimary}
                  disabled={isSaving || !formData.name.trim() || !formData.address.trim() || !formData.city.trim()}
                  testID="button-save-location"
                >
                  {isSaving ? (
                    <Loading text="" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color={staticColors.primaryForeground} />
                      <Text style={styles.modalButtonTextPrimary}>Salva</Text>
                    </>
                  )}
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  filtersContainer: {
    paddingBottom: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  locationCard: {
    padding: spacing.md,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locationMainArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: typography.fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.fontSize.xs,
  },
  locationActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    position: 'relative',
  },
  modalHeaderGradient: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  modalCloseButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  formInput: {
    height: 48,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
  },
  formTextArea: {
    height: 100,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  formSpacer: {
    height: spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
  },
  modalButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  modalButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalButtonTextPrimary: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
});

export default GestoreLocationsScreen;
