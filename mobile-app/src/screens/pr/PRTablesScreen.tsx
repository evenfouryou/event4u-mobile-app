import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button, Input } from '../../components';

interface TableReservation {
  id: number;
  tableName: string;
  clientName: string;
  clientPhone: string;
  guests: number;
  minSpend: string;
  status: 'pending' | 'confirmed' | 'seated' | 'cancelled';
  time: string;
  commission: string;
  notes?: string;
}

const mockTables: TableReservation[] = [
  { id: 1, tableName: 'Tavolo VIP 1', clientName: 'Marco Rossi', clientPhone: '+39 333 1234567', guests: 8, minSpend: '€500', status: 'confirmed', time: '23:00', commission: '€50' },
  { id: 2, tableName: 'Tavolo Gold 3', clientName: 'Luca Bianchi', clientPhone: '+39 340 9876543', guests: 6, minSpend: '€350', status: 'seated', time: '22:30', commission: '€35' },
  { id: 3, tableName: 'Tavolo Standard 5', clientName: 'Andrea Ferrari', clientPhone: '+39 328 5555555', guests: 4, minSpend: '€200', status: 'pending', time: '23:30', commission: '€20' },
  { id: 4, tableName: 'Tavolo VIP 2', clientName: 'Sara Neri', clientPhone: '+39 335 4444444', guests: 10, minSpend: '€800', status: 'cancelled', time: '22:00', commission: '€0', notes: 'Cancellato dal cliente' },
];

export function PRTablesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const [tables, setTables] = useState(mockTables);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReservation, setNewReservation] = useState({ 
    tableName: '', 
    clientName: '', 
    clientPhone: '', 
    guests: '',
    time: '',
    notes: '' 
  });

  const eventName = route.params?.eventName || 'Evento';
  const numColumns = isTablet || isLandscape ? 2 : 1;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const getStatusColor = (status: TableReservation['status']) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.purple;
      case 'seated': return colors.success;
      case 'cancelled': return colors.destructive;
    }
  };

  const getStatusLabel = (status: TableReservation['status']) => {
    switch (status) {
      case 'pending': return 'In Attesa';
      case 'confirmed': return 'Confermato';
      case 'seated': return 'Seduti';
      case 'cancelled': return 'Cancellato';
    }
  };

  const activeReservations = tables.filter(t => t.status !== 'cancelled');
  const totalCommission = activeReservations.reduce((acc, t) => acc + parseFloat(t.commission.replace('€', '')), 0);
  const totalGuests = activeReservations.reduce((acc, t) => acc + t.guests, 0);

  const handleAddReservation = () => {
    if (!newReservation.clientName || !newReservation.clientPhone || !newReservation.tableName) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }
    const reservation: TableReservation = {
      id: Date.now(),
      tableName: newReservation.tableName,
      clientName: newReservation.clientName,
      clientPhone: newReservation.clientPhone,
      guests: parseInt(newReservation.guests) || 4,
      minSpend: '€250',
      status: 'pending',
      time: newReservation.time || '23:00',
      commission: '€25',
      notes: newReservation.notes,
    };
    setTables([reservation, ...tables]);
    setNewReservation({ tableName: '', clientName: '', clientPhone: '', guests: '', time: '', notes: '' });
    setShowAddModal(false);
  };

  const renderTable = ({ item, index }: { item: TableReservation; index: number }) => (
    <View style={[
      numColumns === 2 && { width: '50%', paddingHorizontal: spacing.xs },
      numColumns === 2 && index % 2 === 0 && { paddingLeft: 0 },
      numColumns === 2 && index % 2 === 1 && { paddingRight: 0 },
    ]}>
      <Card style={styles.tableCard} testID={`card-table-${item.id}`}>
        <View style={styles.tableHeader}>
          <View style={styles.tableIconContainer}>
            <Ionicons name="grid" size={24} color={colors.purple} />
          </View>
          <View style={styles.tableMainInfo}>
            <Text style={styles.tableName}>{item.tableName}</Text>
            <View style={styles.tableTimeRow}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.tableTime}>{item.time}</Text>
              <Text style={styles.tableDot}>•</Text>
              <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.tableGuests}>{item.guests} ospiti</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.clientSection}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>{item.clientName.charAt(0)}</Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{item.clientName}</Text>
            <Text style={styles.clientPhone}>{item.clientPhone}</Text>
          </View>
          <View style={styles.clientActions}>
            <TouchableOpacity style={styles.clientAction} testID={`button-call-${item.id}`}>
              <Ionicons name="call-outline" size={18} color={colors.purple} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.clientAction} testID={`button-message-${item.id}`}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.purple} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tableFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Min. Spesa</Text>
            <Text style={styles.footerValue}>{item.minSpend}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Commissione</Text>
            <Text style={[styles.footerValue, { color: colors.success }]}>{item.commission}</Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesSection}>
            <Ionicons name="document-text-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header 
        title="Prenotazioni Tavoli" 
        showBack 
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => setShowAddModal(true)} testID="button-add-table">
            <Ionicons name="add-circle" size={28} color={colors.purple} />
          </TouchableOpacity>
        }
      />

      <View style={styles.summaryBar}>
        <Text style={styles.eventTitle}>{eventName}</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Ionicons name="grid" size={16} color={colors.purple} />
            <Text style={styles.summaryValue}>{activeReservations.length}</Text>
          </View>
          <View style={styles.summaryStat}>
            <Ionicons name="people" size={16} color={colors.purpleLight} />
            <Text style={styles.summaryValue}>{totalGuests}</Text>
          </View>
          <View style={styles.summaryStat}>
            <Ionicons name="cash" size={16} color={colors.success} />
            <Text style={[styles.summaryValue, { color: colors.success }]}>€{totalCommission}</Text>
          </View>
        </View>
      </View>

      <FlatList
        key={numColumns}
        data={tables}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTable}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.purple}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessuna prenotazione</Text>
            <Text style={styles.emptySubtitle}>Prenota il tuo primo tavolo</Text>
          </View>
        }
        testID="tables-list"
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuova Prenotazione</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} testID="button-close-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            
            <Input
              label="Tavolo"
              placeholder="es. Tavolo VIP 1"
              value={newReservation.tableName}
              onChangeText={(text) => setNewReservation({ ...newReservation, tableName: text })}
              testID="input-table-name"
            />
            <Input
              label="Nome Cliente"
              placeholder="Mario Rossi"
              value={newReservation.clientName}
              onChangeText={(text) => setNewReservation({ ...newReservation, clientName: text })}
              testID="input-client-name"
            />
            <Input
              label="Telefono"
              placeholder="+39 333 1234567"
              value={newReservation.clientPhone}
              onChangeText={(text) => setNewReservation({ ...newReservation, clientPhone: text })}
              keyboardType="phone-pad"
              testID="input-client-phone"
            />
            <View style={styles.inputRow}>
              <Input
                label="N. Ospiti"
                placeholder="4"
                value={newReservation.guests}
                onChangeText={(text) => setNewReservation({ ...newReservation, guests: text })}
                keyboardType="number-pad"
                containerStyle={{ flex: 1 }}
                testID="input-guests-count"
              />
              <Input
                label="Orario"
                placeholder="23:00"
                value={newReservation.time}
                onChangeText={(text) => setNewReservation({ ...newReservation, time: text })}
                containerStyle={{ flex: 1 }}
                testID="input-time"
              />
            </View>
            <Input
              label="Note (opzionale)"
              placeholder="Richieste speciali..."
              value={newReservation.notes}
              onChangeText={(text) => setNewReservation({ ...newReservation, notes: text })}
              testID="input-notes"
            />

            <View style={styles.modalActions}>
              <Button
                title="Annulla"
                variant="outline"
                onPress={() => setShowAddModal(false)}
                style={{ flex: 1 }}
                testID="button-cancel-add"
              />
              <Button
                title="Prenota"
                variant="primary"
                onPress={handleAddReservation}
                style={{ flex: 1 }}
                testID="button-confirm-add"
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
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  tableCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  tableIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.purple + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableMainInfo: {
    flex: 1,
  },
  tableName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  tableTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  tableTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  tableDot: {
    color: colors.mutedForeground,
    marginHorizontal: 4,
  },
  tableGuests: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.purpleLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    color: colors.purpleLight,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  clientPhone: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  clientActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  clientAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.purple + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerItem: {},
  footerLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  footerValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.sm,
  },
  notesText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
