import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { IdentityDocument, IdentityVerificationStatus } from '@/lib/api';

interface IdentityDocumentScreenProps {
  onBack: () => void;
}

const documentTypeLabels: Record<string, string> = {
  carta_identita: "Carta d'Identità",
  patente: "Patente di Guida",
  passaporto: "Passaporto",
  permesso_soggiorno: "Permesso di Soggiorno",
};

const documentTypes = [
  { value: 'carta_identita', label: "Carta d'Identità", icon: 'card-outline' },
  { value: 'patente', label: 'Patente di Guida', icon: 'car-outline' },
  { value: 'passaporto', label: 'Passaporto', icon: 'airplane-outline' },
  { value: 'permesso_soggiorno', label: 'Permesso di Soggiorno', icon: 'document-text-outline' },
];

const statusConfig: Record<string, { color: string; bgColor: string; icon: string; label: string }> = {
  pending: { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', icon: 'time-outline', label: 'In attesa' },
  under_review: { color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: 'eye-outline', label: 'In revisione' },
  approved: { color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', icon: 'checkmark-circle-outline', label: 'Verificato' },
  rejected: { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: 'close-circle-outline', label: 'Rifiutato' },
  expired: { color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: 'alert-circle-outline', label: 'Scaduto' },
};

export function IdentityDocumentScreen({ onBack }: IdentityDocumentScreenProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<IdentityDocument[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<IdentityVerificationStatus | null>(null);
  const [step, setStep] = useState<'view' | 'select' | 'upload'>('view');
  const [selectedType, setSelectedType] = useState('carta_identita');
  const [frontImage, setFrontImage] = useState<{ uri: string } | null>(null);
  const [backImage, setBackImage] = useState<{ uri: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadDocuments();
    loadVerificationStatus();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.getMyIdentityDocuments();
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVerificationStatus = async () => {
    try {
      const status = await api.getIdentityVerificationStatus();
      setVerificationStatus(status);
    } catch (error) {
      console.error('Error loading verification status:', error);
    }
  };

  const hasApprovedDocument = documents.some(d => d.verificationStatus === 'approved' && !d.isExpired);
  const hasPendingDocument = documents.some(d => d.verificationStatus === 'pending' || d.verificationStatus === 'under_review');
  const rejectedDocument = documents.find(d => d.verificationStatus === 'rejected');

  const pickImage = async (setImage: (img: { uri: string } | null) => void) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Per scattare una foto è necessario il permesso alla fotocamera');
        return;
      }

      Alert.alert(
        'Scegli metodo',
        'Come vuoi caricare la foto?',
        [
          {
            text: 'Fotocamera',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setImage({ uri: result.assets[0].uri });
                triggerHaptic('medium');
              }
            }
          },
          {
            text: 'Galleria',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setImage({ uri: result.assets[0].uri });
                triggerHaptic('medium');
              }
            }
          },
          { text: 'Annulla', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Errore', 'Impossibile selezionare l\'immagine');
    }
  };

  const uploadImage = async (uri: string, signedUrl: string): Promise<void> => {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Impossibile leggere l\'immagine');
    }
    const blob = await response.blob();
    
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => '');
      console.error('Upload failed:', uploadResponse.status, errorText);
      throw new Error(`Upload fallito (${uploadResponse.status})`);
    }
  };

  const handleSubmit = async () => {
    if (!frontImage) {
      Alert.alert('Errore', 'Carica almeno la foto del fronte del documento');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    triggerHaptic('medium');

    try {
      const urls = await api.getIdentityDocumentUploadUrls(selectedType);
      setUploadProgress(20);

      await uploadImage(frontImage.uri, urls.front.uploadUrl);
      setUploadProgress(50);

      let backPath: string | undefined;
      if (backImage && urls.back) {
        await uploadImage(backImage.uri, urls.back.uploadUrl);
        backPath = urls.back.objectPath;
      }
      setUploadProgress(80);

      await api.submitIdentityDocument({
        documentType: selectedType,
        frontImageUrl: urls.front.objectPath,
        backImageUrl: backPath,
        enableOcr: true,
      });
      setUploadProgress(100);

      triggerHaptic('success');
      Alert.alert(
        'Documento caricato',
        'Il tuo documento è stato caricato e verrà verificato a breve.',
        [{ text: 'OK', onPress: () => { resetForm(); loadDocuments(); } }]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Errore', 'Impossibile caricare il documento. Riprova.');
      triggerHaptic('error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setStep('view');
    setSelectedType('carta_identita');
    setFrontImage(null);
    setBackImage(null);
  };

  const needsBackImage = selectedType !== 'passaporto';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.md,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    title: {
      fontSize: typography.fontSize.lg,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.mutedForeground,
      marginBottom: spacing.md,
    },
    statusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
    },
    statusIcon: {
      marginRight: spacing.md,
    },
    statusText: {
      flex: 1,
    },
    statusLabel: {
      fontSize: typography.fontSize.base,
      fontWeight: '600',
      color: colors.foreground,
    },
    statusDescription: {
      fontSize: typography.fontSize.sm,
      color: colors.mutedForeground,
    },
    docTypeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      marginBottom: spacing.sm,
    },
    docTypeButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    docTypeButtonUnselected: {
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    docTypeIcon: {
      marginRight: spacing.md,
    },
    docTypeLabel: {
      fontSize: typography.fontSize.base,
      fontWeight: '500',
      color: colors.foreground,
    },
    imageUploadContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    imageUploadBox: {
      flex: 1,
      aspectRatio: 1.4,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    imageUploadBoxWithImage: {
      borderStyle: 'solid',
      borderColor: colors.primary,
    },
    uploadedImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    uploadPlaceholder: {
      alignItems: 'center',
    },
    uploadLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.mutedForeground,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    removeImageButton: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 12,
      padding: 4,
    },
    progressContainer: {
      marginVertical: spacing.lg,
    },
    progressBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    progressText: {
      textAlign: 'center',
      marginTop: spacing.sm,
      color: colors.mutedForeground,
      fontSize: typography.fontSize.sm,
    },
    errorCard: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    errorText: {
      flex: 1,
      marginLeft: spacing.sm,
      color: colors.foreground,
      fontSize: typography.fontSize.sm,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
  });

  if (loading) {
    return (
      <SafeArea>
        <Header title="Documento d'Identità" onBack={onBack} />
        <Loading />
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <Header title="Documento d'Identità" onBack={step === 'view' ? onBack : resetForm} />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {step === 'view' && (
          <>
            {/* Deadline warning banner */}
            {verificationStatus && !verificationStatus.verified && verificationStatus.daysRemaining !== null && (
              <View style={[
                styles.card,
                { 
                  backgroundColor: verificationStatus.blocked 
                    ? 'rgba(239, 68, 68, 0.15)' 
                    : verificationStatus.daysRemaining <= 5 
                      ? 'rgba(245, 158, 11, 0.15)' 
                      : 'rgba(59, 130, 246, 0.15)',
                  marginBottom: spacing.md,
                }
              ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name={verificationStatus.blocked ? "lock-closed" : "time-outline"} 
                    size={24} 
                    color={verificationStatus.blocked ? '#ef4444' : verificationStatus.daysRemaining <= 5 ? '#f59e0b' : '#3b82f6'} 
                    style={{ marginRight: spacing.sm }}
                  />
                  <View style={{ flex: 1 }}>
                    {verificationStatus.blocked ? (
                      <>
                        <Text style={[styles.statusLabel, { color: '#ef4444' }]}>Account Bloccato</Text>
                        <Text style={styles.statusDescription}>
                          Il termine per la verifica identità è scaduto. Carica un documento per sbloccare il tuo account.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.statusLabel, { color: verificationStatus.daysRemaining <= 5 ? '#f59e0b' : '#3b82f6' }]}>
                          {verificationStatus.daysRemaining <= 1 
                            ? 'Ultimo giorno!' 
                            : `${verificationStatus.daysRemaining} giorni rimanenti`}
                        </Text>
                        <Text style={styles.statusDescription}>
                          {verificationStatus.daysRemaining <= 5 
                            ? 'Completa la verifica prima della scadenza per evitare il blocco del tuo account.'
                            : 'Verifica la tua identità per accedere a tutte le funzionalità.'}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            )}

            {hasApprovedDocument ? (
              <View style={styles.card}>
                <View style={[styles.statusCard, { backgroundColor: statusConfig.approved.bgColor }]}>
                  <Ionicons name={statusConfig.approved.icon as any} size={28} color={statusConfig.approved.color} style={styles.statusIcon} />
                  <View style={styles.statusText}>
                    <Text style={styles.statusLabel}>Documento Verificato</Text>
                    <Text style={styles.statusDescription}>
                      Il tuo documento è stato verificato con successo
                    </Text>
                  </View>
                </View>
                {documents.filter(d => d.verificationStatus === 'approved').map(doc => (
                  <View key={doc.id} style={{ marginTop: spacing.sm }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSize.sm }}>
                      {documentTypeLabels[doc.documentType]} {doc.documentNumber && `• ${doc.documentNumber}`}
                    </Text>
                    {doc.expiryDate && (
                      <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSize.sm }}>
                        Scadenza: {new Date(doc.expiryDate).toLocaleDateString('it-IT')}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ) : hasPendingDocument ? (
              <View style={styles.card}>
                <View style={[styles.statusCard, { backgroundColor: statusConfig.pending.bgColor }]}>
                  <Ionicons name={statusConfig.pending.icon as any} size={28} color={statusConfig.pending.color} style={styles.statusIcon} />
                  <View style={styles.statusText}>
                    <Text style={styles.statusLabel}>Verifica in Corso</Text>
                    <Text style={styles.statusDescription}>
                      Il tuo documento è in fase di verifica. Riceverai una notifica appena completata.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                {rejectedDocument && (
                  <View style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                    <Text style={styles.errorText}>
                      Documento precedente rifiutato: {rejectedDocument.rejectionReason}
                    </Text>
                  </View>
                )}
                
                <View style={styles.card}>
                  <Text style={styles.title}>Carica Documento</Text>
                  <Text style={styles.subtitle}>
                    Per completare la verifica del tuo account, carica un documento d'identità valido.
                  </Text>
                  
                  <Button
                    onPress={() => setStep('select')}
                    testID="button-start-upload"
                  >
                    <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Carica Documento</Text>
                  </Button>
                </View>
              </>
            )}
          </>
        )}

        {step === 'select' && (
          <View style={styles.card}>
            <Text style={styles.title}>Tipo Documento</Text>
            <Text style={styles.subtitle}>
              Seleziona il tipo di documento che vuoi caricare
            </Text>
            
            {documentTypes.map(type => (
              <Pressable
                key={type.value}
                style={[
                  styles.docTypeButton,
                  selectedType === type.value ? styles.docTypeButtonSelected : styles.docTypeButtonUnselected
                ]}
                onPress={() => { setSelectedType(type.value); triggerHaptic('selection'); }}
                testID={`button-doc-type-${type.value}`}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={selectedType === type.value ? colors.primary : colors.mutedForeground}
                  style={styles.docTypeIcon}
                />
                <Text style={styles.docTypeLabel}>{type.label}</Text>
                {selectedType === type.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>
            ))}
            
            <View style={styles.buttonRow}>
              <Button
                onPress={resetForm}
                variant="outline"
                style={{ flex: 1 }}
                testID="button-cancel-type"
              >
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Annulla</Text>
              </Button>
              <Button
                onPress={() => setStep('upload')}
                style={{ flex: 1 }}
                testID="button-continue-upload"
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Continua</Text>
              </Button>
            </View>
          </View>
        )}

        {step === 'upload' && (
          <View style={styles.card}>
            <Text style={styles.title}>Foto Documento</Text>
            <Text style={styles.subtitle}>
              Scatta o carica foto chiare del tuo {documentTypeLabels[selectedType].toLowerCase()}
            </Text>

            <View style={styles.imageUploadContainer}>
              <Pressable
                style={[styles.imageUploadBox, frontImage && styles.imageUploadBoxWithImage]}
                onPress={() => pickImage(setFrontImage)}
                testID="button-upload-front"
              >
                {frontImage ? (
                  <>
                    <Image source={{ uri: frontImage.uri }} style={styles.uploadedImage} />
                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() => setFrontImage(null)}
                      testID="button-remove-front"
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={colors.mutedForeground} />
                    <Text style={styles.uploadLabel}>Fronte *</Text>
                  </View>
                )}
              </Pressable>

              {needsBackImage && (
                <Pressable
                  style={[styles.imageUploadBox, backImage && styles.imageUploadBoxWithImage]}
                  onPress={() => pickImage(setBackImage)}
                  testID="button-upload-back"
                >
                  {backImage ? (
                    <>
                      <Image source={{ uri: backImage.uri }} style={styles.uploadedImage} />
                      <Pressable
                        style={styles.removeImageButton}
                        onPress={() => setBackImage(null)}
                        testID="button-remove-back"
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </Pressable>
                    </>
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="image-outline" size={32} color={colors.mutedForeground} />
                      <Text style={styles.uploadLabel}>Retro</Text>
                    </View>
                  )}
                </Pressable>
              )}
            </View>

            {uploading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>Caricamento in corso... {uploadProgress}%</Text>
              </View>
            )}

            <Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing.md }}>
              I tuoi documenti sono crittografati e trattati secondo la normativa sulla privacy.
            </Text>

            <View style={styles.buttonRow}>
              <Button
                onPress={() => setStep('select')}
                variant="outline"
                disabled={uploading}
                style={{ flex: 1 }}
                testID="button-back-to-select"
              >
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Indietro</Text>
              </Button>
              <Button
                onPress={handleSubmit}
                disabled={!frontImage || uploading}
                loading={uploading}
                style={{ flex: 1 }}
                testID="button-submit-document"
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>
                  {uploading ? 'Caricamento...' : 'Carica Documento'}
                </Text>
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeArea>
  );
}
