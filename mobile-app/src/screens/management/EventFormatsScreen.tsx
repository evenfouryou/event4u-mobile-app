import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface EventFormat {
  id: string;
  name: string;
  description: string;
  defaultCapacity: number;
  defaultPrice: number;
  ticketTypes: number;
  color: string;
  icon: string;
  usageCount: number;
}

const formatIcons: Record<string, string> = {
  music: 'musical-notes',
  party: 'sparkles',
  corporate: 'briefcase',
  wedding: 'heart',
  concert: 'mic',
  festival: 'sunny',
  private: 'lock-closed',
  default: 'calendar',
};

const formatColors: string[] = [
  colors.primary,
  colors.teal,
  colors.success,
  colors.warning,
  '#9333EA',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

export function EventFormatsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [formats, setFormats] = useState<EventFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFormats();
  }, []);

  const loadFormats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<any[]>('/api/event-formats');
      setFormats(data.map((f: any, index: number) => ({
        id: f.id?.toString() || index.toString(),
        name: f.name || '',
        description: f.description || '',
        defaultCapacity: f.defaultCapacity || 0,
        defaultPrice: f.defaultPrice || 0,
        ticketTypes: f.ticketTypes?.length || f.ticketTypesCount || 0,
        color: f.color || formatColors[index % formatColors.length],
        icon: f.icon || 'calendar',
        usageCount: f.usageCount || 0,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleUseFormat = (format: EventFormat) => {
    navigation.navigate('EventWizard', { formatId: format.id, formatName: format.name });
  };

  const handleEditFormat = (formatId: string) => {
    navigation.navigate('EditEventFormat', { formatId });
  };

  const handleDeleteFormat = (format: EventFormat) => {
    Alert.alert(
      'Elimina Formato',
      `Sei sicuro di voler eliminare "${format.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/event-formats/${format.id}`);
              loadFormats();
            } catch (e) {
              Alert.alert('Errore', 'Impossibile eliminare il formato');
            }
          },
        },
      ]
    );
  };

  const filteredFormats = formats.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFormatCard = ({ item }: { item: EventFormat }) => {
    const iconName = formatIcons[item.icon] || formatIcons.default;

    return (
      <Card style={styles.formatCard} variant="elevated" data-testid={`format-${item.id}`}>
        <View style={styles.formatHeader}>
          <View style={[styles.formatIcon, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={iconName as any} size={24} color={item.color} />
          </View>
          <View style={styles.formatInfo}>
            <Text style={styles.formatName}>{item.name}</Text>
            <Text style={styles.formatDescription} numberOfLines={2}>
              {item.description || 'Nessuna descrizione'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {
              Alert.alert(item.name, '', [
                { text: 'Modifica', onPress: () => handleEditFormat(item.id) },
                { text: 'Elimina', style: 'destructive', onPress: () => handleDeleteFormat(item) },
                { text: 'Annulla', style: 'cancel' },
              ]);
            }}
            data-testid={`button-more-${item.id}`}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.formatStats}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.statText}>{item.defaultCapacity} cap.</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="pricetag-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.statText}>€ {item.defaultPrice}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="ticket-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.statText}>{item.ticketTypes} tipi</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="repeat-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.statText}>{item.usageCount}x usato</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.useButton, { backgroundColor: item.color }]}
          onPress={() => handleUseFormat(item)}
          data-testid={`button-use-${item.id}`}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primaryForeground} />
          <Text style={styles.useButtonText}>Usa questo formato</Text>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Formati Evento"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateEventFormat')}
            data-testid="button-add-format"
          >
            <Ionicons name="add" size={24} color={colors.primaryForeground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca formati..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Riprova" onPress={loadFormats} style={styles.retryButton} />
        </View>
      ) : filteredFormats.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="layers-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun formato trovato</Text>
          <Text style={styles.emptySubtext}>
            Crea un formato per velocizzare la creazione degli eventi
          </Text>
          <Button
            title="Crea Formato"
            onPress={() => navigation.navigate('CreateEventFormat')}
            style={styles.createButton}
          />
        </View>
      ) : (
        <FlatList
          data={filteredFormats}
          renderItem={renderFormatCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  formatCard: {
    marginBottom: spacing.md,
  },
  formatHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  formatIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  formatName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  formatDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xxs,
  },
  moreButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 10,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  useButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primaryForeground,
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
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  emptySubtext: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  createButton: {
    marginTop: spacing.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
