import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { colors as staticColors, spacing, borderRadius, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

interface QRCodeProps {
  value: string | null | undefined;
  size?: number;
  backgroundColor?: string;
  color?: string;
  testID?: string;
}

export function QRCode({
  value,
  size = 200,
  backgroundColor = '#FFFFFF',
  color = '#000000',
  testID = 'qr-code',
}: QRCodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!value || value === 'N/A' || value.trim() === '') {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]} testID={`${testID}-placeholder`}>
        <Ionicons name="qr-code-outline" size={size * 0.4} color={staticColors.mutedForeground} />
        <Text style={styles.placeholderText}>QR Code non disponibile</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]} testID={`${testID}-error`}>
        <Ionicons name="alert-circle-outline" size={size * 0.3} color={staticColors.destructive} />
        <Text style={styles.errorText}>Errore caricamento QR</Text>
        <Text style={styles.codeText} numberOfLines={1}>{value}</Text>
      </View>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=${backgroundColor.replace('#', '')}&color=${color.replace('#', '')}&margin=10`;

  return (
    <View style={[styles.container, { width: size, height: size }]} testID={testID}>
      {isLoading && (
        <View style={[styles.loadingOverlay, { width: size, height: size }]}>
          <ActivityIndicator size="large" color={staticColors.primary} />
        </View>
      )}
      <Image
        source={{ uri: qrUrl }}
        style={[styles.qrImage, { width: size, height: size }]}
        resizeMode="contain"
        onLoadStart={() => {
          setIsLoading(true);
          setHasError(false);
        }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        testID={`${testID}-image`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  qrImage: {
    borderRadius: borderRadius.md,
  },
  loadingOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
    borderRadius: borderRadius.lg,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: staticColors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
  },
  placeholderText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: staticColors.destructive,
    textAlign: 'center',
  },
  codeText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    fontFamily: 'monospace',
    maxWidth: '90%',
  },
});
