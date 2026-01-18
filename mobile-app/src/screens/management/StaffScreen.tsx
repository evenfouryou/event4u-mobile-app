import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

type ViewMode = 'schedule' | 'assignments';

interface StaffAssignment {
  id: string;
  personnelId: string;
  personnelName: string;
  role: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  shiftStart: string;
  shiftEnd: string;
  stationId: string | null;
  stationName: string | null;
  status: 'scheduled' | 'confirmed' | 'active' | 'completed' | 'no-show';
}

interface ScheduleDay {
  date: string;
  dateLabel: string;
  assignments: StaffAssignment[];
}

const statusColors: Record<string, string> = {
  scheduled: colors.mutedForeground,
  confirmed: colors.teal,
  active: colors.success,
  completed: colors.primary,
  'no-show': colors.destructive,
};

const statusLabels: Record<string, string> = {
  scheduled: 'Programmato',
  confirmed: 'Confermato',
  active: 'In corso',
  completed: 'Completato',
  'no-show': 'Assente',
};

export function StaffScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const eventId = route.params?.eventId;
  const [viewMode, setViewMode] = useState<ViewMode>(eventId ? 'assignments' : 'schedule');
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAssignments();
  }, [eventId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = eventId 
        ? `/api/events/${eventId}/staff`
        : '/api/staff/assignments';
      const data = await api.get<any[]>(endpoint);
      setAssignments(data.map((a: any) => ({
        id: a.id?.toString() || '',
        personnelId: a.personnelId?.toString() || a.userId?.toString() || '',
        personnelName: a.personnelName || a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim(),
        role: a.role || 'Staff',
        eventId: a.eventId?.toString() || '',
        eventName: a.eventName || '',
        eventDate: a.eventDate ? new Date(a.eventDate).toLocaleDateString('it-IT') : '',
        shiftStart: a.shiftStart || '',
        shiftEnd: a.shiftEnd || '',
        stationId: a.stationId?.toString() || null,
        stationName: a.stationName || null,
        status: a.status || 'scheduled',
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (): ScheduleDay[] => {
    const grouped = new Map<string, StaffAssignment[]>();
    assignments.forEach((a) => {
      const key = a.eventDate;
      const existing = grouped.get(key) || [];
      grouped.set(key, [...existing, a]);
    });
    return Array.from(grouped.entries()).map(([date, items]) => ({
      date,
      dateLabel: date,
      assignments: items,
    }));
  };

  const filteredAssignments = assignments.filter((a) =>
    a.personnelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateStatus = (assignment: StaffAssignment) => {
    const options = ['confirmed', 'active', 'completed', 'no-show'];
    Alert.alert(
      'Aggiorna Stato',
      `Stato di ${assignment.personnelName}`,
      [
        ...options.map((status) => ({
          text: statusLabels[status],
          onPress: async () => {
            try {
              await api.patch(`/api/staff/assignments/${assignment.id}`, { status });
              loadAssignments();
            } catch (e) {
              Alert.alert('Errore', 'Impossibile aggiornare lo stato');
            }
          },
        })),
        { text: 'Annulla', style: 'cancel' },
      ]
    );
  };

  const renderAssignment = ({ item }: { item: StaffAssignment }) => (
    <TouchableOpacity
      onPress={() => handleUpdateStatus(item)}
      activeOpacity={0.8}
      data-testid={`assignment-${item.id}`}
    >
      <Card style={styles.assignmentCard} variant="elevated">
        <View style={styles.assignmentHeader}>
          <View style={[styles.avatar, { borderColor: statusColors[item.status] }]}>
            <Text style={styles.avatarText}>{item.personnelName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.assignmentInfo}>
            <Text style={styles.personnelName}>{item.personnelName}</Text>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColors[item.status]}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] }]} />
            <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
              {statusLabels[item.status]}
            </Text>
          </View>
        </View>

        {!eventId && (
          <View style={styles.eventInfo}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.eventText}>{item.eventName}</Text>
            <Text style={styles.dateText}>{item.eventDate}</Text>
          </View>
        )}

        <View style={styles.shiftInfo}>
          <View style={styles.shiftItem}>
            <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.shiftText}>
              {item.shiftStart || '-'} - {item.shiftEnd || '-'}
            </Text>
          </View>
          {item.stationName && (
            <View style={styles.shiftItem}>
              <Ionicons name="beer-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.shiftText}>{item.stationName}</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderScheduleDay = ({ item }: { item: ScheduleDay }) => (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayDate}>{item.dateLabel}</Text>
        <Text style={styles.dayCount}>{item.assignments.length} assegnazioni</Text>
      </View>
      {item.assignments.map((a) => renderAssignment({ item: a }))}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={eventId ? 'Staff Evento' : 'Staff & Turni'}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AssignStaff', { eventId })}
            data-testid="button-add-staff"
          >
            <Ionicons name="person-add" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca staff..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search"
          />
        </View>
      </View>

      {!eventId && (
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'schedule' && styles.toggleButtonActive]}
            onPress={() => setViewMode('schedule')}
            data-testid="toggle-schedule"
          >
            <Ionicons
              name="calendar"
              size={18}
              color={viewMode === 'schedule' ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.toggleText, viewMode === 'schedule' && styles.toggleTextActive]}>
              Calendario
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'assignments' && styles.toggleButtonActive]}
            onPress={() => setViewMode('assignments')}
            data-testid="toggle-assignments"
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'assignments' ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.toggleText, viewMode === 'assignments' && styles.toggleTextActive]}>
              Lista
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Riprova" onPress={loadAssignments} style={styles.retryButton} />
        </View>
      ) : filteredAssignments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna assegnazione trovata</Text>
          <Button
            title="Assegna Staff"
            onPress={() => navigation.navigate('AssignStaff', { eventId })}
            style={styles.assignButton}
          />
        </View>
      ) : viewMode === 'schedule' && !eventId ? (
        <FlatList
          data={groupByDate()}
          renderItem={renderScheduleDay}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredAssignments}
          renderItem={renderAssignment}
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
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xs,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 10,
    gap: spacing.xs,
  },
  toggleButtonActive: {
    backgroundColor: colors.glass.background,
  },
  toggleText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  toggleTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  daySection: {
    marginBottom: spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dayDate: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  dayCount: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  assignmentCard: {
    marginBottom: spacing.md,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  assignmentInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  personnelName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  roleText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
    gap: spacing.xxs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  eventText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  shiftInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.lg,
  },
  shiftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shiftText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
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
  retryButton: {
    marginTop: spacing.lg,
  },
  assignButton: {
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
