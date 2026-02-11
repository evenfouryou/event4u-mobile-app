import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface GestoreSIAEConfigScreenProps {
  onBack: () => void;
}

type SectionType = 'menu' | 'azienda' | 'captcha' | 'otp' | 'policy' | 'system';

interface SIAEFullConfig {
  businessName: string;
  businessAddress: string;
  businessCity: string;
  businessProvince: string;
  businessPostalCode: string;
  systemCode: string;
  taxId: string;
  vatNumber: string;
  pecEmail: string;
  siaeEmail: string;
  captchaEnabled: boolean;
  captchaMinChars: number;
  captchaImageWidth: number;
  captchaImageHeight: number;
  captchaDistortion: string;
  captchaAudioEnabled: boolean;
  otpEnabled: boolean;
  otpDigits: number;
  otpTimeoutSeconds: number;
  otpMaxAttempts: number;
  otpCooldownSeconds: number;
  otpProvider: string;
  otpVoiceEnabled: boolean;
  spidEnabled: boolean;
  spidLevel: number;
  maxTicketsPerEvent: number;
  capacityThreshold: number;
  nominativeTicketsEnabled: boolean;
  changeNameEnabled: boolean;
  resaleEnabled: boolean;
  smartCardConnected: boolean;
  printerConfigured: boolean;
  printerName: string;
}

const defaultConfig: SIAEFullConfig = {
  businessName: '',
  businessAddress: '',
  businessCity: '',
  businessProvince: '',
  businessPostalCode: '',
  systemCode: '',
  taxId: '',
  vatNumber: '',
  pecEmail: '',
  siaeEmail: '',
  captchaEnabled: true,
  captchaMinChars: 5,
  captchaImageWidth: 400,
  captchaImageHeight: 200,
  captchaDistortion: 'medium',
  captchaAudioEnabled: true,
  otpEnabled: true,
  otpDigits: 6,
  otpTimeoutSeconds: 300,
  otpMaxAttempts: 3,
  otpCooldownSeconds: 60,
  otpProvider: 'twilio',
  otpVoiceEnabled: true,
  spidEnabled: false,
  spidLevel: 2,
  maxTicketsPerEvent: 10,
  capacityThreshold: 5000,
  nominativeTicketsEnabled: true,
  changeNameEnabled: true,
  resaleEnabled: true,
  smartCardConnected: false,
  printerConfigured: false,
  printerName: '',
};

export function GestoreSIAEConfigScreen({ onBack }: GestoreSIAEConfigScreenProps) {
  const { colors } = useTheme();
  const [config, setConfig] = useState<SIAEFullConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionType>('menu');

  useEffect(() => {
    loadConfig();
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

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAESystemConfig();
      if (data) {
        setConfig((prev) => ({ ...prev, ...data }));
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading SIAE config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConfig();
    setRefreshing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      triggerHaptic('medium');
      await api.updateSIAESystemConfig(config);
      setHasChanges(false);
      Alert.alert('Successo', 'Configurazione salvata con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare la configurazione');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = <K extends keyof SIAEFullConfig>(key: K, value: SIAEFullConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const sections = [
    { id: 'azienda' as SectionType, icon: 'business-outline', title: 'Dati Azienda', description: 'Ragione sociale, indirizzo e dati fiscali' },
    { id: 'captcha' as SectionType, icon: 'shield-checkmark-outline', title: 'CAPTCHA', description: 'Impostazioni verifica umana', enabled: config.captchaEnabled },
    { id: 'otp' as SectionType, icon: 'phone-portrait-outline', title: 'OTP / SMS', description: 'Verifica via codice SMS', enabled: config.otpEnabled },
    { id: 'policy' as SectionType, icon: 'document-text-outline', title: 'Policy Biglietti', description: 'Limiti e regole emissione' },
    { id: 'system' as SectionType, icon: 'settings-outline', title: 'Sistema', description: 'Smart Card e stampante' },
  ];

  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <Text style={styles.title}>Configurazione SIAE</Text>
      <Text style={styles.subtitle}>Gestisci le impostazioni del modulo SIAE</Text>
      
      <View style={styles.sectionsGrid}>
        {sections.map((section) => (
          <Pressable
            key={section.id}
            style={styles.sectionCard}
            onPress={() => {
              triggerHaptic('light');
              setActiveSection(section.id);
            }}
            testID={`card-section-${section.id}`}
          >
            <View style={styles.sectionCardContent}>
              <View style={[styles.sectionIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                <Ionicons name={section.icon as any} size={24} color={staticColors.primary} />
              </View>
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionDescription}>{section.description}</Text>
              </View>
              <View style={styles.sectionRight}>
                {section.enabled !== undefined && (
                  <View style={[styles.statusDot, { backgroundColor: section.enabled ? staticColors.success : `${staticColors.mutedForeground}30` }]} />
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderAzienda = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={() => setActiveSection('menu')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.sectionHeaderTitle}>Dati Azienda</Text>
      </View>

      <Card style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Ragione Sociale</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Nome azienda"
            placeholderTextColor={colors.mutedForeground}
            value={config.businessName}
            onChangeText={(text) => updateConfig('businessName', text)}
            testID="input-business-name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Indirizzo</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Via, numero civico"
            placeholderTextColor={colors.mutedForeground}
            value={config.businessAddress}
            onChangeText={(text) => updateConfig('businessAddress', text)}
            testID="input-business-address"
          />
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.inputLabel}>Città</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Città"
              placeholderTextColor={colors.mutedForeground}
              value={config.businessCity}
              onChangeText={(text) => updateConfig('businessCity', text)}
              testID="input-business-city"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Prov.</Text>
            <TextInput
              style={styles.textInput}
              placeholder="RM"
              placeholderTextColor={colors.mutedForeground}
              value={config.businessProvince}
              onChangeText={(text) => updateConfig('businessProvince', text.toUpperCase())}
              maxLength={2}
              testID="input-business-province"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>CAP</Text>
            <TextInput
              style={styles.textInput}
              placeholder="00100"
              placeholderTextColor={colors.mutedForeground}
              value={config.businessPostalCode}
              onChangeText={(text) => updateConfig('businessPostalCode', text)}
              keyboardType="numeric"
              maxLength={5}
              testID="input-business-postal"
            />
          </View>
        </View>
      </Card>

      <Card style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Dati Fiscali</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Codice Fiscale Titolare (CFTitolareCA)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="RSSMRA80A01H501U"
            placeholderTextColor={colors.mutedForeground}
            value={config.taxId}
            onChangeText={(text) => updateConfig('taxId', text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={16}
            testID="input-tax-id"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Partita IVA</Text>
          <TextInput
            style={styles.textInput}
            placeholder="12345678901"
            placeholderTextColor={colors.mutedForeground}
            value={config.vatNumber}
            onChangeText={(text) => updateConfig('vatNumber', text)}
            keyboardType="numeric"
            maxLength={11}
            testID="input-vat-number"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Codice Sistema SIAE</Text>
          <TextInput
            style={styles.textInput}
            placeholder="EVENT4U1"
            placeholderTextColor={colors.mutedForeground}
            value={config.systemCode}
            onChangeText={(text) => updateConfig('systemCode', text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
            testID="input-system-code"
          />
        </View>
      </Card>

      <Card style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Email</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email PEC</Text>
          <TextInput
            style={styles.textInput}
            placeholder="azienda@pec.it"
            placeholderTextColor={colors.mutedForeground}
            value={config.pecEmail}
            onChangeText={(text) => updateConfig('pecEmail', text.toLowerCase())}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="input-pec-email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Server SIAE</Text>
          <TextInput
            style={styles.textInput}
            placeholder="email@siae.it"
            placeholderTextColor={colors.mutedForeground}
            value={config.siaeEmail}
            onChangeText={(text) => updateConfig('siaeEmail', text.toLowerCase())}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="input-siae-email"
          />
        </View>
      </Card>
    </View>
  );

  const renderCaptcha = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={() => setActiveSection('menu')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.sectionHeaderTitle}>CAPTCHA</Text>
      </View>

      <Card style={styles.formSection}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="shield-checkmark-outline" size={20} color={staticColors.primary} />
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>CAPTCHA Abilitato</Text>
              <Text style={styles.toggleDescription}>Verifica umana durante la registrazione</Text>
            </View>
          </View>
          <Switch
            value={config.captchaEnabled}
            onValueChange={(value) => updateConfig('captchaEnabled', value)}
            trackColor={{ false: staticColors.border, true: `${staticColors.primary}80` }}
            thumbColor={config.captchaEnabled ? staticColors.primary : staticColors.mutedForeground}
            testID="switch-captcha-enabled"
          />
        </View>
      </Card>

      {config.captchaEnabled && (
        <>
          <Card style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Impostazioni Immagine</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Caratteri Minimi</Text>
              <TextInput
                style={styles.textInput}
                placeholder="5"
                placeholderTextColor={colors.mutedForeground}
                value={String(config.captchaMinChars)}
                onChangeText={(text) => updateConfig('captchaMinChars', parseInt(text) || 5)}
                keyboardType="numeric"
                testID="input-captcha-chars"
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Larghezza (px)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="400"
                  placeholderTextColor={colors.mutedForeground}
                  value={String(config.captchaImageWidth)}
                  onChangeText={(text) => updateConfig('captchaImageWidth', parseInt(text) || 400)}
                  keyboardType="numeric"
                  testID="input-captcha-width"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Altezza (px)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="200"
                  placeholderTextColor={colors.mutedForeground}
                  value={String(config.captchaImageHeight)}
                  onChangeText={(text) => updateConfig('captchaImageHeight', parseInt(text) || 200)}
                  keyboardType="numeric"
                  testID="input-captcha-height"
                />
              </View>
            </View>
          </Card>

          <Card style={styles.formSection}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="volume-high-outline" size={20} color={staticColors.teal} />
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>Audio CAPTCHA</Text>
                  <Text style={styles.toggleDescription}>Alternativa audio per accessibilità</Text>
                </View>
              </View>
              <Switch
                value={config.captchaAudioEnabled}
                onValueChange={(value) => updateConfig('captchaAudioEnabled', value)}
                trackColor={{ false: staticColors.border, true: `${staticColors.teal}80` }}
                thumbColor={config.captchaAudioEnabled ? staticColors.teal : staticColors.mutedForeground}
                testID="switch-captcha-audio"
              />
            </View>
          </Card>
        </>
      )}
    </View>
  );

  const renderOTP = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={() => setActiveSection('menu')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.sectionHeaderTitle}>OTP / SMS</Text>
      </View>

      <Card style={styles.formSection}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="phone-portrait-outline" size={20} color={staticColors.primary} />
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>OTP Abilitato</Text>
              <Text style={styles.toggleDescription}>Verifica via codice SMS</Text>
            </View>
          </View>
          <Switch
            value={config.otpEnabled}
            onValueChange={(value) => updateConfig('otpEnabled', value)}
            trackColor={{ false: staticColors.border, true: `${staticColors.primary}80` }}
            thumbColor={config.otpEnabled ? staticColors.primary : staticColors.mutedForeground}
            testID="switch-otp-enabled"
          />
        </View>
      </Card>

      {config.otpEnabled && (
        <>
          <Card style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Parametri OTP</Text>
            
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Cifre</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="6"
                  placeholderTextColor={colors.mutedForeground}
                  value={String(config.otpDigits)}
                  onChangeText={(text) => updateConfig('otpDigits', parseInt(text) || 6)}
                  keyboardType="numeric"
                  testID="input-otp-digits"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Timeout (sec)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="300"
                  placeholderTextColor={colors.mutedForeground}
                  value={String(config.otpTimeoutSeconds)}
                  onChangeText={(text) => updateConfig('otpTimeoutSeconds', parseInt(text) || 300)}
                  keyboardType="numeric"
                  testID="input-otp-timeout"
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Max Tentativi</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="3"
                  placeholderTextColor={colors.mutedForeground}
                  value={String(config.otpMaxAttempts)}
                  onChangeText={(text) => updateConfig('otpMaxAttempts', parseInt(text) || 3)}
                  keyboardType="numeric"
                  testID="input-otp-attempts"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Cooldown (sec)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="60"
                  placeholderTextColor={colors.mutedForeground}
                  value={String(config.otpCooldownSeconds)}
                  onChangeText={(text) => updateConfig('otpCooldownSeconds', parseInt(text) || 60)}
                  keyboardType="numeric"
                  testID="input-otp-cooldown"
                />
              </View>
            </View>
          </Card>

          <Card style={styles.formSection}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="call-outline" size={20} color={staticColors.teal} />
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>OTP Vocale</Text>
                  <Text style={styles.toggleDescription}>Chiamata vocale come alternativa</Text>
                </View>
              </View>
              <Switch
                value={config.otpVoiceEnabled}
                onValueChange={(value) => updateConfig('otpVoiceEnabled', value)}
                trackColor={{ false: staticColors.border, true: `${staticColors.teal}80` }}
                thumbColor={config.otpVoiceEnabled ? staticColors.teal : staticColors.mutedForeground}
                testID="switch-otp-voice"
              />
            </View>
          </Card>
        </>
      )}
    </View>
  );

  const renderPolicy = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={() => setActiveSection('menu')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.sectionHeaderTitle}>Policy Biglietti</Text>
      </View>

      <Card style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Limiti</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Max biglietti per evento (per cliente)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="10"
            placeholderTextColor={colors.mutedForeground}
            value={String(config.maxTicketsPerEvent)}
            onChangeText={(text) => updateConfig('maxTicketsPerEvent', parseInt(text) || 10)}
            keyboardType="numeric"
            testID="input-max-tickets"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Soglia capienza (attiva controlli extra)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="5000"
            placeholderTextColor={colors.mutedForeground}
            value={String(config.capacityThreshold)}
            onChangeText={(text) => updateConfig('capacityThreshold', parseInt(text) || 5000)}
            keyboardType="numeric"
            testID="input-capacity-threshold"
          />
        </View>
      </Card>

      <Card style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Opzioni Biglietto</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="person-outline" size={20} color={staticColors.primary} />
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Biglietti Nominativi</Text>
              <Text style={styles.toggleDescription}>Richiedi nome su biglietto</Text>
            </View>
          </View>
          <Switch
            value={config.nominativeTicketsEnabled}
            onValueChange={(value) => updateConfig('nominativeTicketsEnabled', value)}
            trackColor={{ false: staticColors.border, true: `${staticColors.primary}80` }}
            thumbColor={config.nominativeTicketsEnabled ? staticColors.primary : staticColors.mutedForeground}
            testID="switch-nominative"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="swap-horizontal-outline" size={20} color={staticColors.teal} />
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Cambio Nome</Text>
              <Text style={styles.toggleDescription}>Consenti cambio nominativo</Text>
            </View>
          </View>
          <Switch
            value={config.changeNameEnabled}
            onValueChange={(value) => updateConfig('changeNameEnabled', value)}
            trackColor={{ false: staticColors.border, true: `${staticColors.teal}80` }}
            thumbColor={config.changeNameEnabled ? staticColors.teal : staticColors.mutedForeground}
            testID="switch-change-name"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="storefront-outline" size={20} color={staticColors.golden} />
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Rivendita</Text>
              <Text style={styles.toggleDescription}>Abilita marketplace rivendita</Text>
            </View>
          </View>
          <Switch
            value={config.resaleEnabled}
            onValueChange={(value) => updateConfig('resaleEnabled', value)}
            trackColor={{ false: staticColors.border, true: `${staticColors.golden}80` }}
            thumbColor={config.resaleEnabled ? staticColors.golden : staticColors.mutedForeground}
            testID="switch-resale"
          />
        </View>
      </Card>
    </View>
  );

  const renderSystem = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={() => setActiveSection('menu')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.sectionHeaderTitle}>Sistema</Text>
      </View>

      <Card style={styles.formSection}>
        <View style={styles.systemItem}>
          <View style={[styles.systemIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="card-outline" size={24} color={staticColors.teal} />
          </View>
          <View style={styles.systemInfo}>
            <Text style={styles.systemLabel}>Lettore Smart Card</Text>
            <Text style={styles.systemDescription}>Stato connessione lettore SIAE</Text>
          </View>
          <Badge variant={config.smartCardConnected ? 'success' : 'destructive'}>
            {config.smartCardConnected ? 'Connesso' : 'Disconnesso'}
          </Badge>
        </View>

        {!config.smartCardConnected && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={16} color={staticColors.warning} />
            <Text style={styles.warningText}>
              Collega il lettore smart card per abilitare le funzioni SIAE
            </Text>
          </View>
        )}
      </Card>

      <Card style={styles.formSection}>
        <View style={styles.systemItem}>
          <View style={[styles.systemIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="print-outline" size={24} color={staticColors.golden} />
          </View>
          <View style={styles.systemInfo}>
            <Text style={styles.systemLabel}>Stampante</Text>
            <Text style={styles.systemDescription}>
              {config.printerName || 'Nessuna stampante selezionata'}
            </Text>
          </View>
          <Badge variant={config.printerConfigured ? 'success' : 'secondary'}>
            {config.printerConfigured ? 'Configurata' : 'Non configurata'}
          </Badge>
        </View>

        {config.printerConfigured && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome stampante</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nome stampante"
              placeholderTextColor={colors.mutedForeground}
              value={config.printerName}
              onChangeText={(text) => updateConfig('printerName', text)}
              testID="input-printer-name"
            />
          </View>
        )}
      </Card>

      <Card style={styles.formSection}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="id-card-outline" size={20} color={staticColors.purple} />
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>SPID</Text>
              <Text style={styles.toggleDescription}>Autenticazione tramite SPID</Text>
            </View>
          </View>
          <Switch
            value={config.spidEnabled}
            onValueChange={(value) => updateConfig('spidEnabled', value)}
            trackColor={{ false: staticColors.border, true: `${staticColors.purple}80` }}
            thumbColor={config.spidEnabled ? staticColors.purple : staticColors.mutedForeground}
            testID="switch-spid-enabled"
          />
        </View>

        {config.spidEnabled && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Livello SPID (1-3)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2"
              placeholderTextColor={colors.mutedForeground}
              value={String(config.spidLevel)}
              onChangeText={(text) => {
                const level = parseInt(text);
                if (level >= 1 && level <= 3) {
                  updateConfig('spidLevel', level);
                }
              }}
              keyboardType="numeric"
              maxLength={1}
              testID="input-spid-level"
            />
          </View>
        )}
      </Card>
    </View>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'menu':
        return renderMenu();
      case 'azienda':
        return renderAzienda();
      case 'captcha':
        return renderCaptcha();
      case 'otp':
        return renderOTP();
      case 'policy':
        return renderPolicy();
      case 'system':
        return renderSystem();
      default:
        return renderMenu();
    }
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={activeSection === 'menu' ? onBack : () => setActiveSection('menu')}
        testID="header-siae-config"
      />

      {showLoader ? (
        <Loading text="Caricamento configurazione..." />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {renderContent()}

          {activeSection !== 'menu' && (
            <Pressable
              style={[styles.saveButton, (!hasChanges || saving) && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!hasChanges || saving}
              testID="button-save-config"
            >
              {saving ? (
                <Loading size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Salva Configurazione</Text>
                </>
              )}
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  menuContainer: {
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  sectionsGrid: {
    gap: spacing.sm,
  },
  sectionCard: {
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
    overflow: 'hidden',
  },
  sectionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionContent: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  formSection: {
    padding: spacing.md,
  },
  formSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  toggleDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.sm,
  },
  systemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  systemIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemInfo: {
    flex: 1,
  },
  systemLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  systemDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: `${staticColors.warning}10`,
    borderRadius: borderRadius.md,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.warning,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.primary,
    marginTop: spacing.lg,
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#000000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default GestoreSIAEConfigScreen;
