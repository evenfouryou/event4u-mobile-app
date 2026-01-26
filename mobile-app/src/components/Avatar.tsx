import { View, Text, Image, StyleSheet } from 'react-native';
import { typography } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  testID?: string;
}

export function Avatar({ source, name, size = 'md', testID }: AvatarProps) {
  const { colors } = useTheme();
  
  const sizeValues = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  const fontSizes = {
    sm: typography.fontSize.xs,
    md: typography.fontSize.sm,
    lg: typography.fontSize.xl,
    xl: typography.fontSize['3xl'],
  };

  const dimension = sizeValues[size];
  const fontSize = fontSizes[size];

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: `${colors.primary}20`,
          borderColor: `${colors.primary}40`,
        },
      ]}
      testID={testID}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={[styles.image, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}
        />
      ) : (
        <Text style={[styles.initials, { fontSize, color: colors.primary }]}>{getInitials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    fontWeight: '600',
  },
});

export default Avatar;
