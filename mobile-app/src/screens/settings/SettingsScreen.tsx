import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

interface SettingItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  type: 'navigate' | 'toggle' | 'action';
  value?: boolean;
  screen?: string;
  onPress?: () => void;
}

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [biometrics, setBiometrics] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Esci',
      'Sei sicuro di voler uscire dall\'account?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Esci', style: 'destructive', onPress: () => navigation.navigate('Login') },
      ]
    );
  };

  const generalSettings: SettingItem[] = [
    {
      id: 'notifications',
      icon: 'notifications-outline',
      title: 'Notifiche',
      subtitle: 'Gestisci le notifiche push',
      type: 'toggle',
      value: notifications,
    },
    {
      id: 'language',
      icon: 'language-outline',
      title: 'Lingua',
      subtitle: 'Italiano',
      type: 'navigate',
      screen: 'LanguageSettings',
    },
    {
      id: 'theme',
      icon: 'moon-outline',
      title: 'Tema Scuro',
      subtitle: 'Usa il tema scuro',
      type: 'toggle',
      value: darkMode,
    },
  ];

  const securitySettings: SettingItem[] = [
    {
      id: 'biometrics',
      icon: 'finger-print-outline',
      title: 'Autenticazione Biometrica',
      subtitle: 'Usa Face ID o Touch ID',
      type: 'toggle',
      value: biometrics,
    },
    {
      id: 'password',
      icon: 'key-outline',
      title: 'Cambia Password',
      type: 'navigate',
      screen: 'ChangePassword',
    },
  ];

  const toolsSettings: SettingItem[] = [
    {
      id: 'printer',
      icon: 'print-outline',
      title: 'Impostazioni Stampante',
      subtitle: 'Configura stampanti per biglietti',
      type: 'navigate',
      screen: 'PrinterSettings',
    },
    {
      id: 'templates',
      icon: 'document-text-outline',
      title: 'Template Builder',
      subtitle: 'Crea template per biglietti',
      type: 'navigate',
      screen: 'TemplateBuilder',
    },
    {
      id: 'digitalTemplates',
      icon: 'phone-portrait-outline',
      title: 'Template Digitali',
      subtitle: 'Template per biglietti digitali',
      type: 'navigate',
      screen: 'DigitalTemplateBuilder',
    },
    {
      id: 'import',
      icon: 'cloud-upload-outline',
      title: 'Importa Dati',
      subtitle: 'CSV, Excel',
      type: 'navigate',
      screen: 'Import',
    },
    {
      id: 'smartcard',
      icon: 'card-outline',
      title: 'App Smart Card',
      subtitle: 'Scarica app companion',
      type: 'navigate',
      screen: 'DownloadSmartCardApp',
    },
  ];

  const dataSettings: SettingItem[] = [
    {
      id: 'priceLists',
      icon: 'pricetags-outline',
      title: 'Listini Prezzi',
      type: 'navigate',
      screen: 'PriceLists',
    },
    {
      id: 'beverage',
      icon: 'wine-outline',
      title: 'Gestione Beverage',
      type: 'navigate',
      screen: 'Beverage',
    },
  ];

  const handleToggle = (id: string, value: boolean) => {
    switch (id) {
      case 'notifications':
        setNotifications(value);
        break;
      case 'theme':
        setDarkMode(value);
        break;
      case 'biometrics':
        setBiometrics(value);
        break;
    }
  };

  const handleNavigate = (screen?: string) => {
    if (screen) {
      navigation.navigate(screen);
    }
  };

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={() => {
        if (item.type === 'navigate') {
          handleNavigate(item.screen);
        } else if (item.type === 'action' && item.onPress) {
          item.onPress();
        }
      }}
      disabled={item.type === 'toggle'}
      activeOpacity={item.type === 'toggle' ? 1 : 0.7}
      testID={`setting-${item.id}`}
    >
      <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
        <Ionicons name={item.icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        {item.subtitle && <Text style={styles.settingSubtitle}>{item.subtitle}</Text>}
      </View>
      {item.type === 'toggle' ? (
        <Switch
          value={item.value}
          onValueChange={(value) => handleToggle(item.id, value)}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={colors.foreground}
          testID={`switch-${item.id}`}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: SettingItem[]) => (
    <View style={[styles.section, (isTablet || isLandscape) && styles.sectionWide]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {items.map(renderSettingItem)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Impostazioni</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={(isTablet || isLandscape) ? styles.sectionsGrid : undefined}>
          <View style={(isTablet || isLandscape) ? styles.sectionColumn : undefined}>
            {renderSection('Generale', generalSettings)}
            {renderSection('Sicurezza', securitySettings)}
          </View>
          <View style={(isTablet || isLandscape) ? styles.sectionColumn : undefined}>
            {renderSection('Strumenti', toolsSettings)}
            {renderSection('Dati', dataSettings)}
          </View>
        </View>

        <View style={[styles.footerSection, isTablet && styles.footerSectionTablet]}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
            testID="button-logout"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
            <Text style={styles.logoutText}>Esci</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Versione 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLandscape: {
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  scrollContentLandscape: {
    paddingHorizontal: spacing.xl,
  },
  sectionsGrid: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  sectionColumn: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionWide: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  settingTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  settingSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  footerSection: {
    marginTop: spacing.md,
  },
  footerSectionTablet: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  logoutText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.destructive,
  },
  versionText: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xl,
  },
});
