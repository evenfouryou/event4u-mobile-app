import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  RefreshControl, 
  FlatList,
  Animated,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { 
  AccountingStats, 
  Transaction, 
  FixedCost, 
  ExtraCost, 
  Maintenance, 
  AccountingDocument,
  GestoreLocation,
} from '@/lib/api';

type TabType = 'overview' | 'fixed-costs' | 'extra-costs' | 'maintenances' | 'documents';

interface Tab {
  id: TabType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Panoramica', icon: 'pie-chart', color: '#10B981' },
  { id: 'fixed-costs', label: 'Costi Fissi', icon: 'receipt', color: '#3B82F6' },
  { id: 'extra-costs', label: 'Costi Extra', icon: 'cash', color: '#F59E0B' },
  { id: 'maintenances', label: 'Manutenzioni', icon: 'construct', color: '#8B5CF6' },
  { id: 'documents', label: 'Documenti', icon: 'document-text', color: '#EC4899' },
];

interface GestoreAccountingScreenProps {
  onBack: () => void;
}

export function GestoreAccountingScreen({ onBack }: GestoreAccountingScreenProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTabChange = (newTab: TabType) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setActiveTab(newTab);
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-accounting" />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => { triggerHaptic('selection'); animateTabChange(tab.id); }}
            style={[
              styles.tabPill,
              activeTab === tab.id && { backgroundColor: tab.color },
            ]}
            testID={`tab-${tab.id}`}
          >
            <Ionicons 
              name={tab.icon} 
              size={18} 
              color={activeTab === tab.id ? '#FFF' : colors.mutedForeground} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? '#FFF' : colors.mutedForeground },
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'fixed-costs' && <FixedCostsTab />}
        {activeTab === 'extra-costs' && <ExtraCostsTab />}
        {activeTab === 'maintenances' && <MaintenancesTab />}
        {activeTab === 'documents' && <DocumentsTab />}
      </Animated.View>
    </SafeArea>
  );
}

// ============ OVERVIEW TAB ============
function OverviewTab() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<AccountingStats>({
    totalRevenue: 0, ticketRevenue: 0, tableRevenue: 0, consumptionRevenue: 0, expenses: 0, profit: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const [statsData, txData] = await Promise.all([
        api.getGestoreAccountingStats(period),
        api.getGestoreTransactions(period),
      ]);
      setStats(statsData);
      setTransactions(txData);
    } catch (error) {
      console.error('Error loading overview:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

  const periods = [
    { id: 'today' as const, label: 'Oggi' },
    { id: 'week' as const, label: 'Settimana' },
    { id: 'month' as const, label: 'Mese' },
    { id: 'year' as const, label: 'Anno' },
  ];

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadData}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) return <Loading text="Caricamento dati..." />;

  return (
    <ScrollView 
      style={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodRow}>
        {periods.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.periodChip, period === p.id && { backgroundColor: staticColors.primary }]}
            onPress={() => { triggerHaptic('selection'); setPeriod(p.id); }}
            testID={`period-${p.id}`}
          >
            <Text style={[styles.periodText, { color: period === p.id ? '#000' : colors.foreground }]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Card style={styles.mainStatCard}>
        <Text style={[styles.mainStatLabel, { color: colors.mutedForeground }]}>Fatturato Totale</Text>
        <Text style={[styles.mainStatValue, { color: '#10B981' }]}>{formatCurrency(stats.totalRevenue)}</Text>
        <View style={styles.profitRow}>
          <Text style={[styles.profitLabel, { color: colors.mutedForeground }]}>Profitto Netto:</Text>
          <Text style={[styles.profitValue, { color: stats.profit >= 0 ? '#10B981' : '#EF4444' }]}>
            {formatCurrency(stats.profit)}
          </Text>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="ticket" size={20} color={staticColors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCurrency(stats.ticketRevenue)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Biglietti</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="grid" size={20} color={staticColors.golden} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCurrency(stats.tableRevenue)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Tavoli</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="wine" size={20} color={staticColors.teal} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCurrency(stats.consumptionRevenue)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Consumazioni</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EF444420' }]}>
            <Ionicons name="trending-down" size={20} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCurrency(stats.expenses)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Spese</Text>
        </GlassCard>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ultime Transazioni</Text>
      {transactions.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna transazione</Text>
        </Card>
      ) : (
        transactions.slice(0, 10).map((tx) => (
          <Card key={tx.id} style={styles.transactionCard} testID={`transaction-${tx.id}`}>
            <View style={[styles.txIcon, { backgroundColor: tx.amount >= 0 ? '#10B98120' : '#EF444420' }]}>
              <Ionicons name={tx.amount >= 0 ? 'arrow-down' : 'arrow-up'} size={20} color={tx.amount >= 0 ? '#10B981' : '#EF4444'} />
            </View>
            <View style={styles.txInfo}>
              <Text style={[styles.txDescription, { color: colors.foreground }]}>{tx.description}</Text>
              <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                {new Date(tx.createdAt).toLocaleDateString('it-IT')}
              </Text>
            </View>
            <Text style={[styles.txAmount, { color: tx.amount >= 0 ? '#10B981' : '#EF4444' }]}>
              {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
            </Text>
          </Card>
        ))
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============ FIXED COSTS TAB ============
function FixedCostsTab() {
  const { colors } = useTheme();
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedCost | null>(null);
  const [formData, setFormData] = useState({ name: '', category: 'affitto', amount: '', frequency: 'monthly' as const, notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getFixedCosts();
      setCosts(data);
    } catch (error) {
      console.error('Error loading fixed costs:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const formatCurrency = (amount: string) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(parseFloat(amount) || 0);

  const handleSave = async () => {
    try {
      if (editingItem) {
        await api.updateFixedCost(editingItem.id, formData);
      } else {
        await api.createFixedCost(formData);
      }
      triggerHaptic('success');
      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', category: 'affitto', amount: '', frequency: 'monthly', notes: '' });
      loadData();
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile salvare');
    }
  };

  const handleDelete = (item: FixedCost) => {
    Alert.alert('Elimina', `Eliminare "${item.name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try {
          await api.deleteFixedCost(item.id);
          triggerHaptic('success');
          loadData();
        } catch { triggerHaptic('error'); Alert.alert('Errore', 'Impossibile eliminare'); }
      }},
    ]);
  };

  const openEdit = (item: FixedCost) => {
    setEditingItem(item);
    setFormData({ name: item.name, category: item.category, amount: item.amount, frequency: item.frequency, notes: item.notes || '' });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', category: 'affitto', amount: '', frequency: 'monthly', notes: '' });
    setShowModal(true);
  };

  const filteredCosts = costs.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryLabels: Record<string, string> = {
    affitto: 'Affitto', service: 'Servizi', permessi: 'Permessi', sicurezza: 'Sicurezza',
    amministrativi: 'Amministrativi', utenze: 'Utenze', altro: 'Altro',
  };

  const frequencyLabels: Record<string, string> = {
    monthly: 'Mensile', quarterly: 'Trimestrale', yearly: 'Annuale', per_event: 'Per Evento',
  };

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadData}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) return <Loading text="Caricamento costi fissi..." />;

  return (
    <View style={styles.tabContent}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchText, { color: colors.foreground }]}
            placeholder="Cerca costi fissi..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-fixed-costs"
          />
        </View>
      </View>

      {filteredCosts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun costo fisso</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            Aggiungi affitti, utenze e altri costi ricorrenti
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCosts}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Card style={styles.itemCard} testID={`fixed-cost-${item.id}`}>
              <View style={[styles.itemIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="receipt" size={24} color="#3B82F6" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                <View style={styles.badgeRow}>
                  <Badge variant="secondary" size="sm">{categoryLabels[item.category] || item.category}</Badge>
                  <Badge variant="default" size="sm">{frequencyLabels[item.frequency]}</Badge>
                </View>
                {item.notes && <Text style={[styles.itemNotes, { color: colors.mutedForeground }]} numberOfLines={1}>{item.notes}</Text>}
              </View>
              <View style={styles.itemActions}>
                <Text style={[styles.itemAmount, { color: staticColors.primary }]}>{formatCurrency(item.amount)}</Text>
                <View style={styles.actionButtons}>
                  <Pressable onPress={() => openEdit(item)} style={styles.actionBtn} testID={`edit-fixed-${item.id}`}>
                    <Ionicons name="pencil" size={18} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item)} style={styles.actionBtn} testID={`delete-fixed-${item.id}`}>
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: '#3B82F6' }]}
        onPress={openCreate}
        testID="button-add-fixed-cost"
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingItem ? 'Modifica Costo Fisso' : 'Nuovo Costo Fisso'}
              </Text>
              <Pressable onPress={() => setShowModal(false)} testID="close-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Nome *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Es. Affitto locale"
                placeholderTextColor={colors.mutedForeground}
                testID="input-name"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Importo *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                testID="input-amount"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <Pressable
                    key={key}
                    style={[styles.chip, formData.category === key && { backgroundColor: staticColors.primary }]}
                    onPress={() => setFormData({ ...formData, category: key })}
                  >
                    <Text style={[styles.chipText, { color: formData.category === key ? '#000' : colors.foreground }]}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Frequenza</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {Object.entries(frequencyLabels).map(([key, label]) => (
                  <Pressable
                    key={key}
                    style={[styles.chip, formData.frequency === key && { backgroundColor: staticColors.primary }]}
                    onPress={() => setFormData({ ...formData, frequency: key as any })}
                  >
                    <Text style={[styles.chipText, { color: formData.frequency === key ? '#000' : colors.foreground }]}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Note</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Note opzionali..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                testID="input-notes"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annulla</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, { backgroundColor: staticColors.primary }]} 
                onPress={handleSave}
                testID="button-save"
              >
                <Text style={[styles.modalBtnText, { color: '#000' }]}>Salva</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============ EXTRA COSTS TAB ============
function ExtraCostsTab() {
  const { colors } = useTheme();
  const [costs, setCosts] = useState<ExtraCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtraCost | null>(null);
  const [formData, setFormData] = useState({ name: '', category: 'fornitore', amount: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getExtraCosts();
      setCosts(data);
    } catch (error) {
      console.error('Error loading extra costs:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const formatCurrency = (amount: string) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(parseFloat(amount) || 0);

  const handleSave = async () => {
    try {
      if (editingItem) {
        await api.updateExtraCost(editingItem.id, formData);
      } else {
        await api.createExtraCost(formData);
      }
      triggerHaptic('success');
      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', category: 'fornitore', amount: '', notes: '' });
      loadData();
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile salvare');
    }
  };

  const handleDelete = (item: ExtraCost) => {
    Alert.alert('Elimina', `Eliminare "${item.name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try {
          await api.deleteExtraCost(item.id);
          triggerHaptic('success');
          loadData();
        } catch { triggerHaptic('error'); Alert.alert('Errore', 'Impossibile eliminare'); }
      }},
    ]);
  };

  const openEdit = (item: ExtraCost) => {
    setEditingItem(item);
    setFormData({ name: item.name, category: item.category, amount: item.amount, notes: item.notes || '' });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', category: 'fornitore', amount: '', notes: '' });
    setShowModal(true);
  };

  const categoryLabels: Record<string, string> = {
    fornitore: 'Fornitore', artista: 'Artista', marketing: 'Marketing', 
    staff: 'Staff Extra', trasporto: 'Trasporto', altro: 'Altro',
  };

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadData}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) return <Loading text="Caricamento costi extra..." />;

  const filteredCosts = costs.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchText, { color: colors.foreground }]}
            placeholder="Cerca costi extra..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-extra-costs"
          />
        </View>
      </View>

      {filteredCosts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cash-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun costo extra</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            Aggiungi spese per eventi, artisti, fornitori
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCosts}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Card style={styles.itemCard} testID={`extra-cost-${item.id}`}>
              <View style={[styles.itemIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="cash" size={24} color="#F59E0B" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                <View style={styles.badgeRow}>
                  <Badge variant="warning" size="sm">{categoryLabels[item.category] || item.category}</Badge>
                  {item.eventName && <Badge variant="secondary" size="sm">{item.eventName}</Badge>}
                </View>
                {item.date && <Text style={[styles.itemNotes, { color: colors.mutedForeground }]}>{new Date(item.date).toLocaleDateString('it-IT')}</Text>}
              </View>
              <View style={styles.itemActions}>
                <Text style={[styles.itemAmount, { color: '#F59E0B' }]}>{formatCurrency(item.amount)}</Text>
                <View style={styles.actionButtons}>
                  <Pressable onPress={() => openEdit(item)} style={styles.actionBtn} testID={`edit-extra-${item.id}`}>
                    <Ionicons name="pencil" size={18} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item)} style={styles.actionBtn} testID={`delete-extra-${item.id}`}>
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable style={[styles.fab, { backgroundColor: '#F59E0B' }]} onPress={openCreate} testID="button-add-extra-cost">
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingItem ? 'Modifica Costo Extra' : 'Nuovo Costo Extra'}
              </Text>
              <Pressable onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={colors.foreground} /></Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Nome *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Es. DJ Set"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Importo *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <Pressable
                    key={key}
                    style={[styles.chip, formData.category === key && { backgroundColor: '#F59E0B' }]}
                    onPress={() => setFormData({ ...formData, category: key })}
                  >
                    <Text style={[styles.chipText, { color: formData.category === key ? '#000' : colors.foreground }]}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Note</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Note opzionali..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annulla</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#F59E0B' }]} onPress={handleSave}>
                <Text style={[styles.modalBtnText, { color: '#000' }]}>Salva</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============ MAINTENANCES TAB ============
function MaintenancesTab() {
  const { colors } = useTheme();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'scheduled' | 'completed'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Maintenance | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'riparazione', priority: 'medium' as const, status: 'pending' as const, estimatedCost: '', actualCost: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getMaintenances();
      setMaintenances(data);
    } catch (error) {
      console.error('Error loading maintenances:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleSave = async () => {
    try {
      if (editingItem) {
        await api.updateMaintenance(editingItem.id, formData);
      } else {
        await api.createMaintenance(formData);
      }
      triggerHaptic('success');
      setShowModal(false);
      setEditingItem(null);
      setFormData({ title: '', description: '', category: 'riparazione', priority: 'medium', status: 'pending', estimatedCost: '', actualCost: '' });
      loadData();
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile salvare');
    }
  };

  const handleDelete = (item: Maintenance) => {
    Alert.alert('Elimina', `Eliminare "${item.title}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try {
          await api.deleteMaintenance(item.id);
          triggerHaptic('success');
          loadData();
        } catch { triggerHaptic('error'); Alert.alert('Errore', 'Impossibile eliminare'); }
      }},
    ]);
  };

  const openEdit = (item: Maintenance) => {
    setEditingItem(item);
    setFormData({ title: item.title, description: item.description || '', category: item.category, priority: item.priority, status: item.status, estimatedCost: item.estimatedCost || '', actualCost: item.actualCost || '' });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ title: '', description: '', category: 'riparazione', priority: 'medium', status: 'pending', estimatedCost: '', actualCost: '' });
    setShowModal(true);
  };

  const filteredMaintenance = maintenances.filter(m => filterStatus === 'all' || m.status === filterStatus);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning" size="sm">In Attesa</Badge>;
      case 'scheduled': return <Badge variant="default" size="sm">Programmata</Badge>;
      case 'in_progress': return <Badge variant="teal" size="sm">In Corso</Badge>;
      case 'completed': return <Badge variant="success" size="sm">Completata</Badge>;
      case 'cancelled': return <Badge variant="destructive" size="sm">Annullata</Badge>;
      default: return <Badge variant="secondary" size="sm">{status}</Badge>;
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#10B981';
      default: return colors.mutedForeground;
    }
  };

  const filterChips = [
    { id: 'all' as const, label: 'Tutte', count: maintenances.length },
    { id: 'pending' as const, label: 'In Attesa', count: maintenances.filter(m => m.status === 'pending').length },
    { id: 'scheduled' as const, label: 'Programmate', count: maintenances.filter(m => m.status === 'scheduled').length },
    { id: 'completed' as const, label: 'Completate', count: maintenances.filter(m => m.status === 'completed').length },
  ];

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadData}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) return <Loading text="Caricamento manutenzioni..." />;

  return (
    <View style={styles.tabContent}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {filterChips.map(chip => (
          <Pressable
            key={chip.id}
            style={[styles.filterChip, { backgroundColor: filterStatus === chip.id ? '#8B5CF6' : colors.card }]}
            onPress={() => { triggerHaptic('selection'); setFilterStatus(chip.id); }}
            testID={`filter-${chip.id}`}
          >
            <Text style={[styles.filterChipText, { color: filterStatus === chip.id ? '#FFF' : colors.foreground }]}>
              {chip.label} ({chip.count})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {filteredMaintenance.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna manutenzione</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            Gestisci riparazioni e manutenzioni programmate
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMaintenance}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Card style={styles.itemCard} testID={`maintenance-${item.id}`}>
              <View style={[styles.itemIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="construct" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.title}</Text>
                <View style={styles.badgeRow}>
                  {statusBadge(item.status)}
                  <View style={[styles.priorityDot, { backgroundColor: priorityColor(item.priority) }]} />
                </View>
                {item.locationName && <Text style={[styles.itemNotes, { color: colors.mutedForeground }]}>{item.locationName}</Text>}
              </View>
              <View style={styles.itemActions}>
                {item.estimatedCost && (
                  <Text style={[styles.itemAmount, { color: '#8B5CF6' }]}>
                    €{parseFloat(item.estimatedCost).toFixed(0)}
                  </Text>
                )}
                <View style={styles.actionButtons}>
                  <Pressable onPress={() => openEdit(item)} style={styles.actionBtn} testID={`edit-maintenance-${item.id}`}>
                    <Ionicons name="pencil" size={18} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item)} style={styles.actionBtn} testID={`delete-maintenance-${item.id}`}>
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable style={[styles.fab, { backgroundColor: '#8B5CF6' }]} onPress={openCreate} testID="button-add-maintenance">
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingItem ? 'Modifica Manutenzione' : 'Nuova Manutenzione'}
              </Text>
              <Pressable onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={colors.foreground} /></Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Titolo *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Es. Riparazione impianto audio"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Descrizione</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descrizione dettagliata..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Priorità</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {[{ id: 'low', label: 'Bassa' }, { id: 'medium', label: 'Media' }, { id: 'high', label: 'Alta' }, { id: 'urgent', label: 'Urgente' }].map(p => (
                  <Pressable
                    key={p.id}
                    style={[styles.chip, formData.priority === p.id && { backgroundColor: priorityColor(p.id) }]}
                    onPress={() => setFormData({ ...formData, priority: p.id as any })}
                  >
                    <Text style={[styles.chipText, { color: formData.priority === p.id ? '#FFF' : colors.foreground }]}>{p.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Stato</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {[{ id: 'pending', label: 'In Attesa' }, { id: 'scheduled', label: 'Programmata' }, { id: 'in_progress', label: 'In Corso' }, { id: 'completed', label: 'Completata' }].map(s => (
                  <Pressable
                    key={s.id}
                    style={[styles.chip, formData.status === s.id && { backgroundColor: '#8B5CF6' }]}
                    onPress={() => setFormData({ ...formData, status: s.id as any })}
                  >
                    <Text style={[styles.chipText, { color: formData.status === s.id ? '#FFF' : colors.foreground }]}>{s.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Costo Stimato</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.estimatedCost}
                onChangeText={(text) => setFormData({ ...formData, estimatedCost: text })}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Costo Effettivo</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.actualCost}
                onChangeText={(text) => setFormData({ ...formData, actualCost: text })}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annulla</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#8B5CF6' }]} onPress={handleSave}>
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Salva</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============ DOCUMENTS TAB ============
function DocumentsTab() {
  const { colors } = useTheme();
  const [documents, setDocuments] = useState<AccountingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountingDocument | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'invoice' as const, status: 'pending' as const, amount: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getAccountingDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleSave = async () => {
    try {
      if (editingItem) {
        await api.updateAccountingDocument(editingItem.id, formData);
      } else {
        await api.createAccountingDocument(formData);
      }
      triggerHaptic('success');
      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', type: 'invoice', status: 'pending', amount: '', notes: '' });
      loadData();
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile salvare');
    }
  };

  const handleDelete = (item: AccountingDocument) => {
    Alert.alert('Elimina', `Eliminare "${item.name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try {
          await api.deleteAccountingDocument(item.id);
          triggerHaptic('success');
          loadData();
        } catch { triggerHaptic('error'); Alert.alert('Errore', 'Impossibile eliminare'); }
      }},
    ]);
  };

  const openEdit = (item: AccountingDocument) => {
    setEditingItem(item);
    setFormData({ name: item.name, type: item.type, status: item.status, amount: item.amount || '', notes: item.notes || '' });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', type: 'invoice', status: 'pending', amount: '', notes: '' });
    setShowModal(true);
  };

  const typeLabels: Record<string, string> = {
    invoice: 'Fattura', receipt: 'Ricevuta', contract: 'Contratto', permit: 'Permesso', other: 'Altro',
  };

  const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    invoice: 'document-text', receipt: 'receipt', contract: 'clipboard', permit: 'ribbon', other: 'document',
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning" size="sm">In Attesa</Badge>;
      case 'active': return <Badge variant="success" size="sm">Attivo</Badge>;
      case 'expired': return <Badge variant="destructive" size="sm">Scaduto</Badge>;
      case 'archived': return <Badge variant="secondary" size="sm">Archiviato</Badge>;
      default: return <Badge variant="secondary" size="sm">{status}</Badge>;
    }
  };

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadData}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) return <Loading text="Caricamento documenti..." />;

  const filteredDocuments = documents.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchText, { color: colors.foreground }]}
            placeholder="Cerca documenti..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-documents"
          />
        </View>
      </View>

      {filteredDocuments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun documento</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            Carica fatture, contratti e permessi
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocuments}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Card style={styles.itemCard} testID={`document-${item.id}`}>
              <View style={[styles.itemIcon, { backgroundColor: '#EC489920' }]}>
                <Ionicons name={typeIcons[item.type] || 'document'} size={24} color="#EC4899" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                <View style={styles.badgeRow}>
                  <Badge variant="secondary" size="sm">{typeLabels[item.type] || item.type}</Badge>
                  {statusBadge(item.status)}
                </View>
                {item.expiryDate && (
                  <Text style={[styles.itemNotes, { color: colors.mutedForeground }]}>
                    Scade: {new Date(item.expiryDate).toLocaleDateString('it-IT')}
                  </Text>
                )}
              </View>
              <View style={styles.itemActions}>
                {item.amount && (
                  <Text style={[styles.itemAmount, { color: '#EC4899' }]}>
                    €{parseFloat(item.amount).toFixed(0)}
                  </Text>
                )}
                <View style={styles.actionButtons}>
                  <Pressable onPress={() => openEdit(item)} style={styles.actionBtn} testID={`edit-doc-${item.id}`}>
                    <Ionicons name="pencil" size={18} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item)} style={styles.actionBtn} testID={`delete-doc-${item.id}`}>
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable style={[styles.fab, { backgroundColor: '#EC4899' }]} onPress={openCreate} testID="button-add-document">
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingItem ? 'Modifica Documento' : 'Nuovo Documento'}
              </Text>
              <Pressable onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={colors.foreground} /></Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Nome *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Es. Fattura Fornitore X"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <Pressable
                    key={key}
                    style={[styles.chip, formData.type === key && { backgroundColor: '#EC4899' }]}
                    onPress={() => setFormData({ ...formData, type: key as any })}
                  >
                    <Text style={[styles.chipText, { color: formData.type === key ? '#FFF' : colors.foreground }]}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Stato</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {[{ id: 'pending', label: 'In Attesa' }, { id: 'active', label: 'Attivo' }, { id: 'expired', label: 'Scaduto' }, { id: 'archived', label: 'Archiviato' }].map(s => (
                  <Pressable
                    key={s.id}
                    style={[styles.chip, formData.status === s.id && { backgroundColor: '#EC4899' }]}
                    onPress={() => setFormData({ ...formData, status: s.id as any })}
                  >
                    <Text style={[styles.chipText, { color: formData.status === s.id ? '#FFF' : colors.foreground }]}>{s.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Importo</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Note</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Note opzionali..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annulla</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#EC4899' }]} onPress={handleSave}>
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Salva</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: staticColors.background },
  tabsContainer: { maxHeight: 60, marginBottom: spacing.sm },
  tabsContent: { paddingHorizontal: spacing.md, gap: spacing.sm, flexDirection: 'row' },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabText: { fontSize: typography.fontSize.sm, fontWeight: '500' },
  contentContainer: { flex: 1 },
  tabContent: { flex: 1, paddingHorizontal: spacing.md },
  
  // Overview styles
  periodRow: { marginBottom: spacing.md },
  periodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  periodText: { fontSize: typography.fontSize.sm, fontWeight: '500' },
  mainStatCard: { padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center' },
  mainStatLabel: { fontSize: typography.fontSize.sm, marginBottom: spacing.xs },
  mainStatValue: { fontSize: 36, fontWeight: '700' },
  profitRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  profitLabel: { fontSize: typography.fontSize.sm },
  profitValue: { fontSize: typography.fontSize.lg, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { width: '48%', padding: spacing.md, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontSize: typography.fontSize.lg, fontWeight: '600' },
  statLabel: { fontSize: typography.fontSize.xs, marginTop: spacing.xs },
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', marginBottom: spacing.md },
  transactionCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, marginLeft: spacing.md },
  txDescription: { fontSize: typography.fontSize.sm, fontWeight: '500' },
  txDate: { fontSize: typography.fontSize.xs, marginTop: 2 },
  txAmount: { fontSize: typography.fontSize.md, fontWeight: '600' },
  emptyCard: { padding: spacing.xl, alignItems: 'center' },
  
  // List styles
  searchRow: { marginBottom: spacing.md },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchText: { flex: 1, fontSize: typography.fontSize.md },
  filterRow: { marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  filterChipText: { fontSize: typography.fontSize.sm, fontWeight: '500' },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  itemIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemName: { fontSize: typography.fontSize.md, fontWeight: '600', marginBottom: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  itemNotes: { fontSize: typography.fontSize.xs, marginTop: 4 },
  itemActions: { alignItems: 'flex-end' },
  itemAmount: { fontSize: typography.fontSize.md, fontWeight: '600', marginBottom: spacing.xs },
  actionButtons: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  
  // Empty/Error states
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', marginTop: spacing.md },
  emptyMessage: { fontSize: typography.fontSize.sm, marginTop: spacing.xs, textAlign: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', marginTop: spacing.md },
  retryButton: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  retryText: { color: '#000', fontWeight: '600' },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { fontSize: typography.fontSize.lg, fontWeight: '600' },
  modalForm: { padding: spacing.lg },
  formLabel: { fontSize: typography.fontSize.sm, fontWeight: '500', marginBottom: spacing.xs, marginTop: spacing.md },
  formInput: { padding: spacing.md, borderRadius: borderRadius.md, fontSize: typography.fontSize.md },
  formTextArea: { height: 80, textAlignVertical: 'top' },
  chipRow: { marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chipText: { fontSize: typography.fontSize.sm, fontWeight: '500' },
  modalFooter: { flexDirection: 'row', padding: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  modalBtnText: { fontSize: typography.fontSize.md, fontWeight: '600' },
});
