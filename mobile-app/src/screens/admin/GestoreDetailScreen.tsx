import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface GestoreForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  role: 'gestore' | 'admin';
  siaeEnabled: boolean;
  permissions: {
    manageEvents: boolean;
    manageTickets: boolean;
    managePR: boolean;
    manageInventory: boolean;
    viewReports: boolean;
    manageStaff: boolean;
  };
  status: 'active' | 'inactive' | 'pending';
}

interface Company {
  id: string;
  name: string;
}

export function GestoreDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  
  const gestoreId = route.params?.gestoreId;
  const isCreateMode = route.params?.mode === 'create' || !gestoreId;
  
  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<GestoreForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyId: '',
    role: 'gestore',
    siaeEnabled: false,
    permissions: {
      manageEvents: true,
      manageTickets: true,
      managePR: false,
      manageInventory: false,
      viewReports: true,
      manageStaff: false,
    },
    status: 'active',
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const companiesRes = await api.get<any[]>('/api/admin/companies').catch(() => []);
      setCompanies(Array.isArray(companiesRes) ? companiesRes.map((c: any) => ({
        id: c.id?.toString() || '',
        name: c.name || '',
      })) : []);

      if (!isCreateMode && gestoreId) {
        const gestore = await api.get<any>(`/api/admin/gestori/${gestoreId}`);
        setForm({
          firstName: gestore.firstName || '',
          lastName: gestore.lastName || '',
          email: gestore.email || '',
          phone: gestore.phone || '',
          companyId: gestore.companyId?.toString() || '',
          role: gestore.role || 'gestore',
          siaeEnabled: gestore.siaeEnabled ?? false,
          permissions: gestore.permissions || {
            manageEvents: true,
            manageTickets: true,
            managePR: false,
            manageInventory: false,
            viewReports: true,
            manageStaff: false,
          },
          status: gestore.status || 'active',
        });
        setAvatarUrl(gestore.avatarUrl || null);
      }
    } catch (error) {
      console.error('Error loading gestore:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [gestoreId]);

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }

    setSaving(true);
    try {
      if (isCreateMode) {
        await api.post('/api/admin/gestori', form);
      } else {
        await api.put(`/api/admin/gestori/${gestoreId}`, form);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare il gestore');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Conferma Eliminazione',
      'Sei sicuro di voler eliminare questo gestore? Questa azione non può essere annullata.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/gestori/${gestoreId}`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare il gestore');
            }
          },
        },
      ]
    );
  };

  const updatePermission = (key: keyof typeof form.permissions, value: boolean) => {
    setForm({
      ...form,
      permissions: {
        ...form.permissions,
        [key]: value,
      },
    });
  };

  const renderAvatar = () => {
    if (avatarUrl) {
      return (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      );
    }
    const initials = `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase() || 'NU';
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Text style={styles.avatarText}>{initials || 'NU'}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={isCreateMode ? 'Nuovo Gestore' : 'Modifica Gestore'} showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={isCreateMode ? 'Nuovo Gestore' : 'Modifica Gestore'} showBack />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          {renderAvatar()}
          <TouchableOpacity style={styles.changeAvatarButton} data-testid="button-change-avatar">
            <Ionicons name="camera-outline" size={16} color={colors.primary} />
            <Text style={styles.changeAvatarText}>Cambia foto</Text>
          </TouchableOpacity>
        </View>

        <Card variant="glass" style={styles.formCard}>
          <Text style={styles.formTitle}>Informazioni Personali</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor={colors.mutedForeground}
              value={form.firstName}
              onChangeText={(text) => setForm({ ...form, firstName: text })}
              data-testid="input-first-name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cognome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Cognome"
              placeholderTextColor={colors.mutedForeground}
              value={form.lastName}
              onChangeText={(text) => setForm({ ...form, lastName: text })}
              data-testid="input-last-name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="email@esempio.it"
              placeholderTextColor={colors.mutedForeground}
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              data-testid="input-email"
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
              data-testid="input-phone"
            />
          </View>
        </Card>

        <Card variant="glass" style={styles.formCard}>
          <Text style={styles.formTitle}>Azienda e Ruolo</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Azienda</Text>
            <View style={styles.selectContainer}>
              <TouchableOpacity
                style={styles.selectButton}
                data-testid="button-select-company"
              >
                <Text style={[
                  styles.selectButtonText,
                  !form.companyId && styles.selectPlaceholder
                ]}>
                  {companies.find(c => c.id === form.companyId)?.name || 'Seleziona azienda'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ruolo</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  form.role === 'gestore' && styles.roleOptionActive
                ]}
                onPress={() => setForm({ ...form, role: 'gestore' })}
                data-testid="button-role-gestore"
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={form.role === 'gestore' ? colors.primaryForeground : colors.foreground}
                />
                <Text style={[
                  styles.roleOptionText,
                  form.role === 'gestore' && styles.roleOptionTextActive
                ]}>
                  Gestore
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  form.role === 'admin' && styles.roleOptionActive
                ]}
                onPress={() => setForm({ ...form, role: 'admin' })}
                data-testid="button-role-admin"
              >
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={form.role === 'admin' ? colors.primaryForeground : colors.foreground}
                />
                <Text style={[
                  styles.roleOptionText,
                  form.role === 'admin' && styles.roleOptionTextActive
                ]}>
                  Admin
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Stato</Text>
            <View style={styles.roleSelector}>
              {['active', 'inactive', 'pending'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    form.status === status && styles.statusOptionActive
                  ]}
                  onPress={() => setForm({ ...form, status: status as any })}
                  data-testid={`button-status-${status}`}
                >
                  <Text style={[
                    styles.statusOptionText,
                    form.status === status && styles.statusOptionTextActive
                  ]}>
                    {status === 'active' ? 'Attivo' : status === 'inactive' ? 'Inattivo' : 'In Attesa'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        <Card variant="glass" style={styles.formCard}>
          <View style={styles.siaeHeader}>
            <View>
              <Text style={styles.formTitle}>Modulo SIAE</Text>
              <Text style={styles.siaeDesc}>
                Abilita la gestione biglietteria SIAE
              </Text>
            </View>
            <Switch
              value={form.siaeEnabled}
              onValueChange={(value) => setForm({ ...form, siaeEnabled: value })}
              trackColor={{ false: colors.muted, true: `${colors.accent}50` }}
              thumbColor={form.siaeEnabled ? colors.accent : colors.mutedForeground}
              data-testid="switch-siae-enabled"
            />
          </View>
        </Card>

        <Card variant="glass" style={styles.formCard}>
          <Text style={styles.formTitle}>Permessi</Text>
          
          {[
            { key: 'manageEvents', label: 'Gestione Eventi', icon: 'calendar-outline' },
            { key: 'manageTickets', label: 'Gestione Biglietti', icon: 'ticket-outline' },
            { key: 'managePR', label: 'Gestione PR', icon: 'people-outline' },
            { key: 'manageInventory', label: 'Gestione Inventario', icon: 'cube-outline' },
            { key: 'viewReports', label: 'Visualizza Report', icon: 'bar-chart-outline' },
            { key: 'manageStaff', label: 'Gestione Staff', icon: 'person-add-outline' },
          ].map((permission) => (
            <TouchableOpacity
              key={permission.key}
              style={styles.permissionRow}
              onPress={() => updatePermission(
                permission.key as keyof typeof form.permissions,
                !form.permissions[permission.key as keyof typeof form.permissions]
              )}
              activeOpacity={0.7}
              data-testid={`permission-${permission.key}`}
            >
              <View style={styles.permissionInfo}>
                <Ionicons
                  name={permission.icon as any}
                  size={20}
                  color={colors.mutedForeground}
                />
                <Text style={styles.permissionLabel}>{permission.label}</Text>
              </View>
              <View style={[
                styles.checkbox,
                form.permissions[permission.key as keyof typeof form.permissions] && styles.checkboxChecked
              ]}>
                {form.permissions[permission.key as keyof typeof form.permissions] && (
                  <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title={saving ? 'Salvataggio...' : 'Salva'}
            onPress={handleSave}
            variant="primary"
            disabled={saving}
            data-testid="button-save"
          />
          
          {!isCreateMode && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              data-testid="button-delete"
            >
              <Ionicons name="trash-outline" size={20} color={colors.destructive} />
              <Text style={styles.deleteButtonText}>Elimina Gestore</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  changeAvatarText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  formCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  formTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.lg,
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
  selectContainer: {
    position: 'relative',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  selectButtonText: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  selectPlaceholder: {
    color: colors.mutedForeground,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingVertical: spacing.md,
  },
  roleOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleOptionText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  roleOptionTextActive: {
    color: colors.primaryForeground,
  },
  statusOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingVertical: spacing.sm,
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusOptionText: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statusOptionTextActive: {
    color: colors.primaryForeground,
  },
  siaeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siaeDesc: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  permissionLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  deleteButtonText: {
    color: colors.destructive,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});

export default GestoreDetailScreen;
