import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

interface EventFormat {
  id: string;
  name: string;
  description: string;
  defaultDuration: number;
  category: string;
  ticketTypes: number;
  isActive: boolean;
  createdAt: string;
  usageCount: number;
}

interface GestoreEventFormatsScreenProps {
  onBack: () => void;
  onCreateFormat?: () => void;
  onEditFormat?: (formatId: string) => void;
}

const mockFormats: EventFormat[] = [
  {
    id: '1',
    name: 'Serata Club Standard',
    description: 'Format standard per serate in discoteca con tavoli e liste',
    defaultDuration: 360,
    category: 'Discoteca',
    ticketTypes: 3,
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    usageCount: 45,
  },
  {
    id: '2',
    name: 'Aperitivo Lounge',
    description: 'Evento aperitivo serale con DJ set e drink',
    defaultDuration: 240,
    category: 'Aperitivo',
    ticketTypes: 2,
    isActive: true,
    createdAt: '2024-02-10T14:00:00Z',
    usageCount: 28,
  },
  {
    id: '3',
    name: 'Concerto Live',
    description: 'Format per concerti con biglietteria numerata',
    defaultDuration: 180,
    category: 'Concerti',
    ticketTypes: 4,
    isActive: true,
    createdAt: '2024-03-05T09:00:00Z',
    usageCount: 12,
  },
  {
    id: '4',
    name: 'Festival Estivo',
    description: 'Grande evento estivo multi-day con più palchi',
    defaultDuration: 720,
    category: 'Festival',
    ticketTypes: 6,
    isActive: false,
    createdAt: '2024-04-20T11:00:00Z',
    usageCount: 5,
  },
];

export function GestoreEventFormatsScreen({ onBack, onCreateFormat, onEditFormat }: GestoreEventFormatsScreenProps) {
  const { colors, gradients } = useTheme();
  const [formats, setFormats] = useState<EventFormat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFormats();
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

  const loadFormats = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setFormats(mockFormats);
    } catch (error) {
      console.error('Error loading formats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFormats();
    setRefreshing(false);
  };

  const filteredFormats = useMemo(() => {
    if (!searchQuery.trim()) return formats;
    const query = searchQuery.toLowerCase();
    return formats.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.description.toLowerCase().includes(query) ||
      f.category.toLowerCase().includes(query)
    );
  }, [formats, searchQuery]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleDuplicate = (format: EventFormat) => {
    triggerHaptic('medium');
    Alert.alert(
      'Duplica Format',
      `Vuoi duplicare "${format.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Duplica',
          onPress: () => {
            const newFormat: EventFormat = {
              ...format,
              id: Date.now().toString(),
              name: `${format.name} (Copia)`,
              usageCount: 0,
              createdAt: new Date().toISOString(),
            };
            setFormats([newFormat, ...formats]);
            triggerHaptic('success');
          },
        },
      ]
    );
  };

  const handleDelete = (format: EventFormat) => {
    triggerHaptic('medium');
    Alert.alert(
      'Elimina Format',
      `Sei sicuro di voler eliminare "${format.name}"? Questa azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            setFormats(formats.filter(f => f.id !== format.id));
            triggerHaptic('success');
          },
        },
      ]
    );
  };

  const handleToggleActive = (format: EventFormat) => {
    triggerHaptic('medium');
    setFormats(formats.map(f =>
      f.id === format.id ? { ...f, isActive: !f.isActive } : f
    ));
  };

  const renderFormat = ({ item }: { item: EventFormat }) => (
    <Card style={styles.formatCard} testID={`format-${item.id}`}>
      <View style={styles.formatHeader}>
        <View style={[styles.formatIcon, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
        </View>
        <View style={styles.formatInfo}>
          <Text style={[styles.formatName, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.formatMeta}>
            <Badge variant={item.isActive ? 'success' : 'secondary'}>
              {item.isActive ? 'Attivo' : 'Inattivo'}
            </Badge>
            <Text style={[styles.formatCategory, { color: colors.mutedForeground }]}>
              {item.category}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.formatDescription, { color: colors.mutedForeground }]} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={[styles.formatDivider, { backgroundColor: colors.border }]} />

      <View style={styles.formatStats}>
        <View style={styles.formatStat}>
          <Ionicons name="time-outline" size={16} color={staticColors.primary} />
          <Text style={[styles.formatStatValue, { color: colors.foreground }]}>
            {formatDuration(item.defaultDuration)}
          </Text>
          <Text style={[styles.formatStatLabel, { color: colors.mutedForeground }]}>Durata</Text>
        </View>
        <View style={styles.formatStat}>
          <Ionicons name="ticket-outline" size={16} color={staticColors.teal} />
          <Text style={[styles.formatStatValue, { color: colors.foreground }]}>
            {item.ticketTypes}
          </Text>
          <Text style={[styles.formatStatLabel, { color: colors.mutedForeground }]}>Tipi Ticket</Text>
        </View>
        <View style={styles.formatStat}>
          <Ionicons name="repeat-outline" size={16} color={staticColors.purple} />
          <Text style={[styles.formatStatValue, { color: colors.foreground }]}>
            {item.usageCount}
          </Text>
          <Text style={[styles.formatStatLabel, { color: colors.mutedForeground }]}>Utilizzi</Text>
        </View>
      </View>

      <View style={[styles.formatDivider, { backgroundColor: colors.border }]} />

      <View style={styles.formatActions}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}
          onPress={() => {
            triggerHaptic('light');
            onEditFormat?.(item.id);
          }}
          testID={`button-edit-${item.id}`}
        >
          <Ionicons name="pencil" size={18} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>Modifica</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, { backgroundColor: `${staticColors.teal}15` }]}
          onPress={() => handleDuplicate(item)}
          testID={`button-duplicate-${item.id}`}
        >
          <Ionicons name="copy" size={18} color={staticColors.teal} />
          <Text style={[styles.actionButtonText, { color: staticColors.teal }]}>Duplica</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, { backgroundColor: item.isActive ? `${colors.mutedForeground}15` : `${staticColors.success}15` }]}
          onPress={() => handleToggleActive(item)}
          testID={`button-toggle-${item.id}`}
        >
          <Ionicons
            name={item.isActive ? 'pause' : 'play'}
            size={18}
            color={item.isActive ? colors.mutedForeground : staticColors.success}
          />
        </Pressable>

        <Pressable
          style={[styles.actionButton, { backgroundColor: `${colors.destructive}15` }]}
          onPress={() => handleDelete(item)}
          testID={`button-delete-${item.id}`}
        >
          <Ionicons name="trash" size={18} color={colors.destructive} />
        </Pressable>
      </View>
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={{...styles.container, backgroundColor: colors.background}}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-event-formats"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Format Eventi</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {formats.length} modelli • {formats.filter(f => f.isActive).length} attivi
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca format..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-formats"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {showLoader ? (
        <Loading text="Caricamento format..." />
      ) : filteredFormats.length > 0 ? (
        <FlatList
          data={filteredFormats}
          renderItem={renderFormat}
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
          <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {searchQuery ? 'Nessun format trovato' : 'Nessun format disponibile'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'Crea il tuo primo format per iniziare'}
          </Text>
        </View>
      )}

      <View style={styles.fabContainer}>
        <Pressable
          onPress={() => {
            triggerHaptic('medium');
            onCreateFormat?.();
          }}
          testID="button-create-format"
        >
          <LinearGradient
            colors={gradients.golden}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color={staticColors.primaryForeground} />
          </LinearGradient>
        </Pressable>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  screenTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
    paddingBottom: 100,
  },
  formatCard: {
    padding: spacing.md,
  },
  formatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  formatIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatInfo: {
    flex: 1,
    gap: 4,
  },
  formatName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  formatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  formatCategory: {
    fontSize: typography.fontSize.sm,
  },
  formatDescription: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  formatDivider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  formatStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  formatStat: {
    alignItems: 'center',
    gap: 4,
  },
  formatStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  formatStatLabel: {
    fontSize: typography.fontSize.xs,
  },
  formatActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
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
  fabContainer: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default GestoreEventFormatsScreen;
