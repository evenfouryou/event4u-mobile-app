import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, checkAuth } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileData) => api.patch('/api/public/account/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/public/customers/me'] });
      checkAuth();
      Alert.alert('Successo', 'Profilo aggiornato con successo');
    },
    onError: (error: Error) => {
      Alert.alert('Errore', error.message || 'Impossibile aggiornare il profilo');
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: PasswordData) => api.patch('/api/public/account/password', data),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      Alert.alert('Successo', 'Password aggiornata con successo');
    },
    onError: (error: Error) => {
      Alert.alert('Errore', error.message || 'Impossibile aggiornare la password');
    },
  });

  const handleUpdateProfile = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi');
      return;
    }
    updateProfileMutation.mutate({ firstName, lastName, email });
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Errore', 'Compila tutti i campi password');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Errore', 'Le password non coincidono');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Errore', 'La password deve essere di almeno 8 caratteri');
      return;
    }
    updatePasswordMutation.mutate({ currentPassword, newPassword, confirmPassword });
  };

  const initials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase()
    : '?';

  return (
    <View style={styles.container}>
      <Header 
        title="Profilo" 
        showBack 
        onBack={() => navigation.goBack()} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <TouchableOpacity style={styles.avatarButton}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.avatarButtonText}>Cambia foto</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Informazioni personali</Text>
            
            <Input
              label="Nome"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Inserisci il tuo nome"
              autoCapitalize="words"
            />
            
            <Input
              label="Cognome"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Inserisci il tuo cognome"
              autoCapitalize="words"
            />
            
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Inserisci la tua email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Button
              title="Salva modifiche"
              onPress={handleUpdateProfile}
              loading={updateProfileMutation.isPending}
            />
          </Card>

          <Card style={styles.formCard}>
            <TouchableOpacity 
              style={styles.passwordHeader}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
            >
              <View style={styles.passwordHeaderContent}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.foreground} />
                <Text style={styles.sectionTitle}>Cambia password</Text>
              </View>
              <Ionicons 
                name={showPasswordSection ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.mutedForeground} 
              />
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={styles.passwordForm}>
                <Input
                  label="Password attuale"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Inserisci la password attuale"
                  secureTextEntry
                />
                
                <Input
                  label="Nuova password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Inserisci la nuova password"
                  secureTextEntry
                />
                
                <Input
                  label="Conferma password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Conferma la nuova password"
                  secureTextEntry
                />

                <Button
                  title="Aggiorna password"
                  onPress={handleUpdatePassword}
                  loading={updatePasswordMutation.isPending}
                  variant="secondary"
                />
              </View>
            )}
          </Card>

          <Card style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Zona pericolosa</Text>
            <Text style={styles.dangerText}>
              Eliminando il tuo account perderai tutti i dati associati, inclusi i biglietti acquistati.
            </Text>
            <Button
              title="Elimina account"
              variant="destructive"
              onPress={() => {
                Alert.alert(
                  'Elimina account',
                  'Sei sicuro di voler eliminare il tuo account? Questa azione non può essere annullata.',
                  [
                    { text: 'Annulla', style: 'cancel' },
                    { text: 'Elimina', style: 'destructive', onPress: () => {} },
                  ]
                );
              }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  avatarButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  formCard: {
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  passwordForm: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dangerCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.destructive + '30',
  },
  dangerTitle: {
    color: colors.destructive,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  dangerText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
});
