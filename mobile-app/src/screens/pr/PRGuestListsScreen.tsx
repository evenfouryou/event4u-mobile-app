import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button, Input } from '../../components';

interface Guest {
  id: number;
  name: string;
  phone: string;
  email?: string;
  status: 'pending' | 'confirmed' | 'checkedIn' | 'noShow';
  plusOne: number;
  notes?: string;
  addedAt: string;
}

const mockGuests: Guest[] = [
  { id: 1, name: 'Marco Rossi', phone: '+39 333 1234567', email: 'marco@email.com', status: 'confirmed', plusOne: 2, addedAt: '12 Gen' },
  { id: 2, name: 'Giulia Bianchi', phone: '+39 340 9876543', status: 'checkedIn', plusOne: 1, addedAt: '13 Gen' },
  { id: 3, name: 'Luca Verdi', phone: '+39 328 5555555', status: 'pending', plusOne: 0, notes: 'VIP', addedAt: '14 Gen' },
  { id: 4, name: 'Sara Neri', phone: '+39 335 4444444', status: 'noShow', plusOne: 3, addedAt: '10 Gen' },
  { id: 5, name: 'Andrea Ferrari', phone: '+39 347 2222222', status: 'confirmed', plusOne: 1, addedAt: '15 Gen' },
];

export function PRGuestListsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const [guests, setGuests] = useState(mockGuests);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newGuest, setNewGuest] = useState({ name: '', phone: '', plusOne: '0', notes: '' });

  const eventName = route.params?.eventName || 'Evento';
  const numColumns = isTablet || isLandscape ? 2 : 1;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const getStatusColor = (status: Guest['status']) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.purple;
      case 'checkedIn': return colors.success;
      case 'noShow': return colors.destructive;
    }
  };

  const getStatusLabel = (status: Guest['status']) => {
    switch (status) {
      case 'pending': return 'In Attesa';
      case 'confirmed': return 'Confermato';
      case 'checkedIn': return 'Entrato';
      case 'noShow': return 'No Show';
    }
  };

  const getStatusIcon = (status: Guest['status']): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'checkedIn': return 'checkmark-done-circle';
      case 'noShow': return 'close-circle-outline';
    }
  };

  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guest.phone.includes(searchQuery)
  );

  const totalGuests = guests.reduce((acc, g) => acc + 1 + g.plusOne, 0);
  const checkedInCount = guests.filter(g => g.status === 'checkedIn').reduce((acc, g) => acc + 1 + g.plusOne, 0);

  const handleAddGuest = () => {
    if (!newGuest.name || !newGuest.phone) {
      Alert.alert('Errore', 'Nome e telefono sono obbligatori');
      return;
    }
    const guest: Guest = {
      id: Date.now(),
      name: newGuest.name,
      phone: newGuest.phone,
      status: 'pending',
      plusOne: parseInt(newGuest.plusOne) || 0,
      notes: newGuest.notes,
      addedAt: 'Oggi',
    };
    setGuests([guest, ...guests]);
    setNewGuest({ name: '', phone: '', plusOne: '0', notes: '' });
    setShowAddModal(false);
  };

  const renderGuest = ({ item, index }: { item: Guest; index: number }) => (
    <View style={[
      numColumns === 2 && { width: '50%', paddingHorizontal: spacing.xs },
      numColumns === 2 && index % 2 === 0 && { paddingLeft: 0 },
      numColumns === 2 && index % 2 === 1 && { paddingRight: 0 },
    ]}>
      <Card style={styles.guestCard} testID={`card-guest-${item.id}`}>
        <View style={styles.guestHeader}>
          <View style={styles.guestAvatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.guestInfo}>
            <View style={styles.guestNameRow}>
              <Text style={styles.guestName}>{item.name}</Text>
              {item.notes && (
                <View style={styles.noteBadge}>
                  <Text style={styles.noteText}>{item.notes}</Text>
                </View>
              )}
            </View>
            <Text style={styles.guestPhone}>{item.phone}</Text>
            {item.plusOne > 0 && (
              <Text style={styles.plusOneText}>+{item.plusOne} accompagnator{item.plusOne > 1 ? 'i' : 'e'}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Ionicons name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.guestActions}>
          <TouchableOpacity style={styles.guestAction} testID={`button-call-${item.id}`}>
            <Ionicons name="call-outline" size={18} color={colors.purple} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestAction} testID={`button-message-${item.id}`}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.purple} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestAction} testID={`button-edit-${item.id}`}>
            <Ionicons name="create-outline" size={18} color={colors.purple} />
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header 
        title="Lista Ospiti" 
        showBack 
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => setShowAddModal(true)} testID="button-add-guest">
            <Ionicons name="add-circle" size={28} color={colors.purple} />
          </TouchableOpacity>
        }
      />

      <View style={styles.summaryBar}>
        <Text style={styles.eventTitle}>{eventName}</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Ionicons name="people" size={16} color={colors.success} />
            <Text style={styles.summaryValue}>{checkedInCount}/{totalGuests}</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Cerca ospite..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search" size={20} color={colors.mutedForeground} />}
          containerStyle={styles.searchInput}
          testID="input-search-guest"
        />
      </View>

      <FlatList
        key={numColumns}
        data={filteredGuests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGuest}
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
            <Ionicons name="people-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun ospite trovato</Text>
            <Text style={styles.emptySubtitle}>Aggiungi il tuo primo ospite</Text>
          </View>
        }
        testID="guests-list"
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
              <Text style={styles.modalTitle}>Nuovo Ospite</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} testID="button-close-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            
            <Input
              label="Nome e Cognome"
              placeholder="Mario Rossi"
              value={newGuest.name}
              onChangeText={(text) => setNewGuest({ ...newGuest, name: text })}
              testID="input-guest-name"
            />
            <Input
              label="Telefono"
              placeholder="+39 333 1234567"
              value={newGuest.phone}
              onChangeText={(text) => setNewGuest({ ...newGuest, phone: text })}
              keyboardType="phone-pad"
              testID="input-guest-phone"
            />
            <Input
              label="Accompagnatori"
              placeholder="0"
              value={newGuest.plusOne}
              onChangeText={(text) => setNewGuest({ ...newGuest, plusOne: text })}
              keyboardType="number-pad"
              testID="input-guest-plusone"
            />
            <Input
              label="Note (opzionale)"
              placeholder="VIP, Compleanno, etc."
              value={newGuest.notes}
              onChangeText={(text) => setNewGuest({ ...newGuest, notes: text })}
              testID="input-guest-notes"
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
                title="Aggiungi"
                variant="primary"
                onPress={handleAddGuest}
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
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  guestCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  guestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  guestInfo: {
    flex: 1,
  },
  guestNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  guestName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  noteBadge: {
    backgroundColor: colors.purpleLight + '30',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  noteText: {
    color: colors.purpleLight,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  guestPhone: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  plusOneText: {
    color: colors.purple,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  guestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  guestAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.purple + '15',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
