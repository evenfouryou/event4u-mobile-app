import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vatNumber?: string;
  logoUrl?: string;
  gestoreCount: number;
  eventCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface CompanyForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  vatNumber: string;
}

export function CompaniesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    vatNumber: '',
  });

  const loadCompanies = async () => {
    try {
      const response = await api.get<any[]>('/api/admin/companies');
      const data = Array.isArray(response) ? response : [];
      setCompanies(data.map((c: any) => ({
        id: c.id?.toString() || '',
        name: c.name || '',
        email: c.email,
        phone: c.phone,
        address: c.address,
        vatNumber: c.vatNumber,
        logoUrl: c.logoUrl || c.logo,
        gestoreCount: c.gestoreCount || c.gestori?.length || 0,
        eventCount: c.eventCount || c.events?.length || 0,
        status: c.status || 'active',
        createdAt: c.createdAt,
      })));
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCompanies();
  };

  const filteredCompanies = companies.filter((c) => {
    const search = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(search) ||
      (c.email?.toLowerCase().includes(search) ?? false)
    );
  });

  const openModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setForm({
        name: company.name,
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        vatNumber: company.vatNumber || '',
      });
    } else {
      setEditingCompany(null);
      setForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        vatNumber: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      Alert.alert('Errore', 'Il nome è obbligatorio');
      return;
    }

    setSaving(true);
    try {
      if (editingCompany) {
        await api.put(`/api/admin/companies/${editingCompany.id}`, form);
      } else {
        await api.post('/api/admin/companies', form);
      }
      setShowModal(false);
      loadCompanies();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare l\'azienda');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (company: Company) => {
    Alert.alert(
      'Conferma Eliminazione',
      `Sei sicuro di voler eliminare "${company.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/companies/${company.id}`);
              loadCompanies();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare l\'azienda');
            }
          },
        },
      ]
    );
  };

  const renderLogo = (company: Company) => {
    if (company.logoUrl) {
      return (
        <Image source={{ uri: company.logoUrl }} style={styles.logo} />
      );
    }
    const initials = company.name.substring(0, 2).toUpperCase();
    return (
      <View style={[styles.logo, styles.logoPlaceholder]}>
        <Text style={styles.logoText}>{initials}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Aziende" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Aziende" showBack />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca aziende..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search-companies"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} data-testid="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((company) => (
            <TouchableOpacity
              key={company.id}
              style={styles.companyCard}
              onPress={() => openModal(company)}
              activeOpacity={0.8}
              data-testid={`card-company-${company.id}`}
            >
              <Card variant="glass">
                <View style={styles.companyRow}>
                  {renderLogo(company)}
                  <View style={styles.companyInfo}>
                    <View style={styles.companyHeader}>
                      <Text style={styles.companyName}>{company.name}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: company.status === 'active' ? `${colors.success}20` : `${colors.destructive}20` }
                      ]}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: company.status === 'active' ? colors.success : colors.destructive }
                        ]} />
                        <Text style={[
                          styles.statusText,
                          { color: company.status === 'active' ? colors.success : colors.destructive }
                        ]}>
                          {company.status === 'active' ? 'Attiva' : 'Inattiva'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statsRow}>
                      <View style={styles.stat}>
                        <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                        <Text style={styles.statText}>{company.gestoreCount} gestori</Text>
                      </View>
                      <View style={styles.stat}>
                        <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                        <Text style={styles.statText}>{company.eventCount} eventi</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(company)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    data-testid={`button-delete-company-${company.id}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <Card variant="glass" style={styles.emptyCard}>
            <Ionicons name="business-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Nessuna azienda trovata' : 'Nessuna azienda registrata'}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => openModal()}
              data-testid="button-add-first-company"
            >
              <Ionicons name="add" size={20} color={colors.primaryForeground} />
              <Text style={styles.emptyButtonText}>Aggiungi Azienda</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => openModal()}
        activeOpacity={0.8}
        data-testid="button-fab-add-company"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCompany ? 'Modifica Azienda' : 'Nuova Azienda'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)} data-testid="button-close-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome Azienda *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome azienda"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                  data-testid="input-company-name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@azienda.it"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  data-testid="input-company-email"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefono</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+39 000 000 0000"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  keyboardType="phone-pad"
                  data-testid="input-company-phone"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Indirizzo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Via, Città, CAP"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.address}
                  onChangeText={(text) => setForm({ ...form, address: text })}
                  data-testid="input-company-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Partita IVA</Text>
                <TextInput
                  style={styles.input}
                  placeholder="IT00000000000"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.vatNumber}
                  onChangeText={(text) => setForm({ ...form, vatNumber: text })}
                  autoCapitalize="characters"
                  data-testid="input-company-vat"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={saving ? 'Salvataggio...' : 'Salva'}
                onPress={handleSave}
                variant="primary"
                disabled={saving}
                data-testid="button-save-company"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  companyCard: {
    marginBottom: spacing.md,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  logoPlaceholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.accentForeground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  companyInfo: {
    flex: 1,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  companyName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  emptyButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    height: 48,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
});

export default CompaniesScreen;
