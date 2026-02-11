import { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  RefreshControl, 
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Switch,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestorePR, CreatePRData, UpdatePRData, SearchedUser } from '@/lib/api';

type FilterType = 'all' | 'active' | 'inactive' | 'top';

interface GestorePRManagementScreenProps {
  onBack: () => void;
}

const PHONE_PREFIXES = [
  { value: '+39', label: 'Italia (+39)' },
  { value: '+1', label: 'USA (+1)' },
  { value: '+44', label: 'UK (+44)' },
  { value: '+33', label: 'Francia (+33)' },
  { value: '+49', label: 'Germania (+49)' },
  { value: '+34', label: 'Spagna (+34)' },
  { value: '+41', label: 'Svizzera (+41)' },
];

export function GestorePRManagementScreen({ onBack }: GestorePRManagementScreenProps) {
  const { colors } = useTheme();
  const [prs, setPrs] = useState<GestorePR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState<GestorePR | null>(null);
  const [createMode, setCreateMode] = useState<'search' | 'manual'>('manual');
  
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    phonePrefix: '+39',
    phone: '',
  });
  
  const [editForm, setEditForm] = useState({
    commissionPercentage: 0,
    commissionFixedPerPerson: 0,
    isStaff: false,
    displayName: '',
    pageEnabled: false,
  });

  useEffect(() => {
    loadPRs();
  }, []);

  useEffect(() => {
    if (phoneSearch.length >= 5) {
      searchUsers();
    } else {
      setSearchedUsers([]);
    }
  }, [phoneSearch]);

  const loadPRs = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getGestorePRs();
      setPrs(data);
    } catch (error) {
      console.error('Error loading PRs:', error);
      setHasError(true);
      setPrs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setIsSearching(true);
      const users = await api.searchUsersForPR(phoneSearch);
      setSearchedUsers(users);
    } catch {
      setSearchedUsers([]);
    } finally {
      setIsSearching(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPRs();
    setRefreshing(false);
  };

  const handleCreatePR = async (existingUserId?: string) => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.phone.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }
    try {
      await api.createPR({
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        phonePrefix: createForm.phonePrefix,
        phone: createForm.phone,
        existingUserId,
      });
      triggerHaptic('success');
      setShowCreateModal(false);
      resetCreateForm();
      loadPRs();
      Alert.alert('Successo', 'PR creato con successo');
    } catch (error: any) {
      triggerHaptic('error');
      Alert.alert('Errore', error.message || 'Impossibile creare il PR');
    }
  };

  const handlePromoteUser = async (user: SearchedUser) => {
    if (user.isAlreadyPr) {
      Alert.alert('Attenzione', 'Questo utente è già un PR');
      return;
    }
    try {
      let phoneNumber = user.phoneWithoutPrefix || '';
      if (!phoneNumber && user.phone) {
        let cleaned = user.phone.replace(/[\s\-\(\)]/g, '');
        if (cleaned.startsWith('+')) cleaned = cleaned.replace(/^\+\d{1,4}/, '');
        else if (cleaned.startsWith('0039')) cleaned = cleaned.slice(4);
        else if (cleaned.startsWith('39') && cleaned.length > 10) cleaned = cleaned.slice(2);
        phoneNumber = cleaned.replace(/\D/g, '');
      }
      await api.createPR({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phonePrefix: user.phonePrefix || '+39',
        phone: phoneNumber,
        existingUserId: user.source === 'user' ? user.id : undefined,
        existingCustomerId: user.source === 'customer' ? (user.customerId || user.id) : undefined,
        identityId: user.identityId,
      });
      triggerHaptic('success');
      setShowCreateModal(false);
      resetCreateForm();
      loadPRs();
      Alert.alert('Successo', `${user.firstName} ${user.lastName} è ora un PR`);
    } catch (error: any) {
      triggerHaptic('error');
      Alert.alert('Errore', error.message || 'Impossibile promuovere utente');
    }
  };

  const handleUpdatePR = async () => {
    if (!selectedPR) return;
    try {
      await api.updatePR(selectedPR.id, editForm);
      triggerHaptic('success');
      setShowEditModal(false);
      setSelectedPR(null);
      loadPRs();
      Alert.alert('Successo', 'PR aggiornato');
    } catch (error: any) {
      triggerHaptic('error');
      Alert.alert('Errore', error.message || 'Impossibile aggiornare');
    }
  };

  const handleDeactivatePR = (pr: GestorePR) => {
    Alert.alert(
      'Disattiva PR',
      `Vuoi disattivare ${pr.name || pr.firstName + ' ' + pr.lastName}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Disattiva', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deactivatePR(pr.id);
              triggerHaptic('success');
              loadPRs();
            } catch {
              triggerHaptic('error');
              Alert.alert('Errore', 'Impossibile disattivare');
            }
          }
        },
      ]
    );
  };

  const handleResendSMS = async (pr: GestorePR) => {
    try {
      await api.resendPRSms(pr.id);
      triggerHaptic('success');
      Alert.alert('Successo', 'SMS con credenziali inviato');
    } catch {
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile inviare SMS');
    }
  };

  const handleToggleStatus = async (pr: GestorePR) => {
    try {
      await api.togglePRStatus(pr.id, !pr.isActive);
      triggerHaptic('success');
      loadPRs();
    } catch {
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile cambiare stato');
    }
  };

  const openEditModal = (pr: GestorePR) => {
    setSelectedPR(pr);
    setEditForm({
      commissionPercentage: pr.commissionPercentage || 0,
      commissionFixedPerPerson: pr.commissionFixedPerPerson || 0,
      isStaff: pr.isStaff || false,
      displayName: pr.displayName || '',
      pageEnabled: pr.pageEnabled || false,
    });
    setShowEditModal(true);
  };

  const showPRActions = (pr: GestorePR) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annulla', 'Modifica Commissioni', 'Reinvia SMS', pr.isActive ? 'Disattiva' : 'Attiva'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openEditModal(pr);
          else if (buttonIndex === 2) handleResendSMS(pr);
          else if (buttonIndex === 3) pr.isActive ? handleDeactivatePR(pr) : handleToggleStatus(pr);
        }
      );
    } else {
      Alert.alert(
        pr.name || `${pr.firstName} ${pr.lastName}`,
        'Seleziona un\'azione',
        [
          { text: 'Modifica Commissioni', onPress: () => openEditModal(pr) },
          { text: 'Reinvia SMS', onPress: () => handleResendSMS(pr) },
          { text: pr.isActive ? 'Disattiva' : 'Attiva', onPress: () => pr.isActive ? handleDeactivatePR(pr) : handleToggleStatus(pr), style: pr.isActive ? 'destructive' : 'default' },
          { text: 'Annulla', style: 'cancel' },
        ]
      );
    }
  };

  const resetCreateForm = () => {
    setCreateForm({ firstName: '', lastName: '', phonePrefix: '+39', phone: '' });
    setPhoneSearch('');
    setSearchedUsers([]);
    setCreateMode('manual');
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

  const filteredPRs = useMemo(() => {
    let filtered = [...prs];
    
    if (activeFilter === 'active') {
      filtered = filtered.filter(pr => pr.isActive);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(pr => !pr.isActive);
    } else if (activeFilter === 'top') {
      filtered = filtered.filter(pr => pr.isActive).sort((a, b) => b.totalEarnings - a.totalEarnings).slice(0, 10);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(pr => 
        (pr.name || '').toLowerCase().includes(q) ||
        (pr.firstName || '').toLowerCase().includes(q) ||
        (pr.lastName || '').toLowerCase().includes(q) ||
        pr.prCode.toLowerCase().includes(q) ||
        (pr.phone || '').includes(q)
      );
    }
    
    return filtered;
  }, [prs, activeFilter, searchQuery]);

  const totalStats = useMemo(() => ({
    total: prs.length,
    active: prs.filter(pr => pr.isActive).length,
    totalEarnings: prs.reduce((sum, pr) => sum + (pr.totalEarnings || 0), 0),
    pendingEarnings: prs.reduce((sum, pr) => sum + (pr.pendingEarnings || 0), 0),
  }), [prs]);

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'active', label: 'Attivi' },
    { id: 'inactive', label: 'Inattivi' },
    { id: 'top', label: 'Top 10' },
  ];

  if (hasError) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-pr-management" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore di caricamento</Text>
          <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadPRs} testID="button-retry">
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  if (isLoading && prs.length === 0) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-pr-management" />
        <Loading text="Caricamento PR..." />
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-pr-management" />
      
      <View style={styles.statsRow}>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: staticColors.primary }]}>{totalStats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Attivi</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: staticColors.golden }]}>{formatCurrency(totalStats.totalEarnings)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Totale Guadagni</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: staticColors.teal }]}>{formatCurrency(totalStats.pendingEarnings)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>In Attesa</Text>
        </GlassCard>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchText, { color: colors.foreground }]}
            placeholder="Cerca PR..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-prs"
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {filters.map(filter => (
          <Pressable
            key={filter.id}
            style={[styles.filterPill, activeFilter === filter.id && { backgroundColor: staticColors.primary }]}
            onPress={() => { triggerHaptic('selection'); setActiveFilter(filter.id); }}
            testID={`filter-${filter.id}`}
          >
            <Text style={[styles.filterText, { color: activeFilter === filter.id ? '#000' : colors.mutedForeground }]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filteredPRs}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable onPress={() => showPRActions(item)} onLongPress={() => openEditModal(item)} testID={`pr-${item.id}`}>
            <Card style={styles.prCard}>
              <View style={styles.prHeader}>
                <Avatar name={item.name || `${item.firstName} ${item.lastName}`} size="md" testID={`avatar-${item.id}`} />
                <View style={styles.prInfo}>
                  <Text style={[styles.prName, { color: colors.foreground }]}>
                    {item.name || `${item.firstName || ''} ${item.lastName || ''}`}
                  </Text>
                  <View style={styles.prMeta}>
                    <Badge variant="secondary" size="sm">{item.prCode}</Badge>
                    {item.isStaff && <Badge variant="teal" size="sm">Staff</Badge>}
                  </View>
                </View>
                <Badge variant={item.isActive ? 'success' : 'secondary'} size="sm">
                  {item.isActive ? 'Attivo' : 'Inattivo'}
                </Badge>
              </View>
              
              <View style={styles.prStats}>
                <View style={styles.prStat}>
                  <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.prStatValue, { color: colors.foreground }]}>{item.invites || 0}</Text>
                  <Text style={[styles.prStatLabel, { color: colors.mutedForeground }]}>Inviti</Text>
                </View>
                <View style={styles.prStat}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.prStatValue, { color: colors.foreground }]}>{item.conversions || 0}</Text>
                  <Text style={[styles.prStatLabel, { color: colors.mutedForeground }]}>Conversioni</Text>
                </View>
                <View style={styles.prStat}>
                  <Ionicons name="wallet-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.prStatValue, { color: staticColors.golden }]}>{formatCurrency(item.totalEarnings || 0)}</Text>
                  <Text style={[styles.prStatLabel, { color: colors.mutedForeground }]}>Guadagni</Text>
                </View>
              </View>

              <View style={styles.prCommissions}>
                <Text style={[styles.commissionText, { color: colors.mutedForeground }]}>
                  Commissioni: {item.commissionPercentage || 0}% + {formatCurrency(item.commissionFixedPerPerson || 0)}/persona
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessun PR trovato</Text>
            <Pressable 
              style={[styles.emptyButton, { backgroundColor: staticColors.primary }]} 
              onPress={() => setShowCreateModal(true)}
              testID="button-empty-add-pr"
            >
              <Text style={styles.emptyButtonText}>Aggiungi PR</Text>
            </Pressable>
          </View>
        }
      />

      <Pressable 
        style={[styles.fab, { backgroundColor: staticColors.primary }]} 
        onPress={() => setShowCreateModal(true)}
        testID="button-add-pr"
      >
        <Ionicons name="person-add" size={24} color="#000" />
      </Pressable>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nuovo PR</Text>
              <Pressable onPress={() => { setShowCreateModal(false); resetCreateForm(); }} testID="close-create-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.modeToggle}>
              <Pressable 
                style={[styles.modeButton, createMode === 'search' && { backgroundColor: staticColors.primary }]} 
                onPress={() => setCreateMode('search')}
                testID="button-mode-search"
              >
                <Text style={[styles.modeButtonText, { color: createMode === 'search' ? '#000' : colors.foreground }]}>
                  Cerca Cliente
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.modeButton, createMode === 'manual' && { backgroundColor: staticColors.primary }]} 
                onPress={() => setCreateMode('manual')}
                testID="button-mode-manual"
              >
                <Text style={[styles.modeButtonText, { color: createMode === 'manual' ? '#000' : colors.foreground }]}>
                  Nuovo Manuale
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              {createMode === 'search' ? (
                <>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Cerca per Telefono</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                    value={phoneSearch}
                    onChangeText={setPhoneSearch}
                    placeholder="Inserisci numero di telefono..."
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                    testID="input-phone-search"
                  />
                  
                  {isSearching && <Text style={[styles.searchingText, { color: colors.mutedForeground }]}>Ricerca...</Text>}
                  
                  {searchedUsers.map(user => (
                    <Pressable 
                      key={user.id} 
                      style={[styles.userResult, { backgroundColor: colors.background }]}
                      onPress={() => handlePromoteUser(user)}
                      disabled={user.isAlreadyPr}
                      testID={`user-result-${user.id}`}
                    >
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.foreground }]}>
                          {user.firstName} {user.lastName}
                        </Text>
                        <Text style={[styles.userPhone, { color: colors.mutedForeground }]}>{user.phone}</Text>
                      </View>
                      {user.isAlreadyPr ? (
                        <Badge variant="secondary" size="sm">Già PR</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Promuovi</Badge>
                      )}
                    </Pressable>
                  ))}
                </>
              ) : (
                <>
                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Nome *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                    value={createForm.firstName}
                    onChangeText={text => setCreateForm({ ...createForm, firstName: text })}
                    placeholder="Nome"
                    placeholderTextColor={colors.mutedForeground}
                    testID="input-first-name"
                  />

                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Cognome *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                    value={createForm.lastName}
                    onChangeText={text => setCreateForm({ ...createForm, lastName: text })}
                    placeholder="Cognome"
                    placeholderTextColor={colors.mutedForeground}
                    testID="input-last-name"
                  />

                  <Text style={[styles.formLabel, { color: colors.foreground }]}>Telefono *</Text>
                  <View style={styles.phoneRow}>
                    <Pressable 
                      style={[styles.prefixPicker, { backgroundColor: colors.background }]}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          ActionSheetIOS.showActionSheetWithOptions(
                            { options: ['Annulla', ...PHONE_PREFIXES.map(p => p.label)], cancelButtonIndex: 0 },
                            (index) => { if (index > 0) setCreateForm({ ...createForm, phonePrefix: PHONE_PREFIXES[index - 1].value }); }
                          );
                        } else {
                          Alert.alert(
                            'Seleziona Prefisso',
                            '',
                            [
                              ...PHONE_PREFIXES.map(p => ({
                                text: p.label,
                                onPress: () => setCreateForm({ ...createForm, phonePrefix: p.value }),
                              })),
                              { text: 'Annulla', style: 'cancel' },
                            ]
                          );
                        }
                      }}
                      testID="button-prefix-picker"
                    >
                      <Text style={[styles.prefixText, { color: colors.foreground }]}>{createForm.phonePrefix}</Text>
                      <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
                    </Pressable>
                    <TextInput
                      style={[styles.phoneInput, { backgroundColor: colors.background, color: colors.foreground }]}
                      value={createForm.phone}
                      onChangeText={text => setCreateForm({ ...createForm, phone: text.replace(/[^\d]/g, '') })}
                      placeholder="123456789"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="phone-pad"
                      testID="input-phone"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            {createMode === 'manual' && (
              <View style={styles.modalFooter}>
                <Pressable style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => { setShowCreateModal(false); resetCreateForm(); }} testID="button-cancel-create">
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annulla</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalBtn, { backgroundColor: staticColors.primary }]} 
                  onPress={() => handleCreatePR()}
                  testID="button-create-pr"
                >
                  <Text style={[styles.modalBtnText, { color: '#000' }]}>Crea PR</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Modifica {selectedPR?.name || `${selectedPR?.firstName} ${selectedPR?.lastName}`}
              </Text>
              <Pressable onPress={() => { setShowEditModal(false); setSelectedPR(null); }} testID="close-edit-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Commissione % per Prenotazione</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={String(editForm.commissionPercentage)}
                onChangeText={text => setEditForm({ ...editForm, commissionPercentage: parseFloat(text) || 0 })}
                keyboardType="decimal-pad"
                testID="input-commission-percent"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Commissione Fissa per Persona (€)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={String(editForm.commissionFixedPerPerson)}
                onChangeText={text => setEditForm({ ...editForm, commissionFixedPerPerson: parseFloat(text) || 0 })}
                keyboardType="decimal-pad"
                testID="input-commission-fixed"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Nome Visualizzato (opzionale)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={editForm.displayName}
                onChangeText={text => setEditForm({ ...editForm, displayName: text })}
                placeholder="Nome da mostrare ai clienti"
                placeholderTextColor={colors.mutedForeground}
                testID="input-display-name"
              />

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>Membro Staff</Text>
                <Switch
                  value={editForm.isStaff}
                  onValueChange={val => setEditForm({ ...editForm, isStaff: val })}
                  trackColor={{ false: colors.mutedForeground, true: staticColors.primary }}
                  testID="switch-is-staff"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>Pagina PR Pubblica</Text>
                <Switch
                  value={editForm.pageEnabled}
                  onValueChange={val => setEditForm({ ...editForm, pageEnabled: val })}
                  trackColor={{ false: colors.mutedForeground, true: staticColors.primary }}
                  testID="switch-page-enabled"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => { setShowEditModal(false); setSelectedPR(null); }}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annulla</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, { backgroundColor: staticColors.primary }]} 
                onPress={handleUpdatePR}
                testID="button-update-pr"
              >
                <Text style={[styles.modalBtnText, { color: '#000' }]}>Salva</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: staticColors.background },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', marginTop: spacing.md },
  retryButton: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  retryText: { color: '#000', fontWeight: '600' },
  
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginTop: spacing.md },
  statCard: { flex: 1, alignItems: 'center', padding: spacing.md },
  statValue: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: typography.fontSize.xs, marginTop: spacing.xs },
  
  searchRow: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  searchInput: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, gap: spacing.sm },
  searchText: { flex: 1, fontSize: typography.fontSize.md },
  
  filtersContainer: { maxHeight: 50, marginTop: spacing.md, paddingHorizontal: spacing.md },
  filterPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, marginRight: spacing.sm, backgroundColor: 'rgba(255,255,255,0.05)' },
  filterText: { fontSize: typography.fontSize.sm, fontWeight: '500' },
  
  listContent: { padding: spacing.md, paddingBottom: 100 },
  prCard: { marginBottom: spacing.md, padding: spacing.md },
  prHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  prInfo: { flex: 1, marginLeft: spacing.md },
  prName: { fontSize: typography.fontSize.md, fontWeight: '600' },
  prMeta: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  
  prStats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  prStat: { alignItems: 'center' },
  prStatValue: { fontSize: typography.fontSize.md, fontWeight: '600', marginTop: spacing.xs },
  prStatLabel: { fontSize: typography.fontSize.xs, marginTop: 2 },
  
  prCommissions: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  commissionText: { fontSize: typography.fontSize.sm },
  
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: typography.fontSize.md, marginTop: spacing.md },
  emptyButton: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  emptyButtonText: { color: '#000', fontWeight: '600' },
  
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: typography.fontSize.lg, fontWeight: '600' },
  
  modeToggle: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  modeButton: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  modeButtonText: { fontSize: typography.fontSize.sm, fontWeight: '500' },
  
  modalForm: { padding: spacing.lg, maxHeight: 400 },
  formLabel: { fontSize: typography.fontSize.sm, fontWeight: '500', marginBottom: spacing.xs, marginTop: spacing.md },
  formInput: { padding: spacing.md, borderRadius: borderRadius.md, fontSize: typography.fontSize.md },
  
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  prefixPicker: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.xs },
  prefixText: { fontSize: typography.fontSize.md },
  phoneInput: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, fontSize: typography.fontSize.md },
  
  searchingText: { fontSize: typography.fontSize.sm, marginTop: spacing.md, textAlign: 'center' },
  userResult: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.sm },
  userInfo: { flex: 1 },
  userName: { fontSize: typography.fontSize.md, fontWeight: '500' },
  userPhone: { fontSize: typography.fontSize.sm, marginTop: 2 },
  
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, paddingVertical: spacing.sm },
  switchLabel: { fontSize: typography.fontSize.md },
  
  modalFooter: { flexDirection: 'row', padding: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  modalBtnText: { fontSize: typography.fontSize.md, fontWeight: '600' },
});
