export { colors } from './colors';
export { spacing, borderRadius } from './spacing';
export { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from './typography';

export type { ColorKeys } from './colors';
export type { SpacingKeys, BorderRadiusKeys } from './spacing';
export type { FontSizeKeys, FontWeightKeys } from './typography';

import { colors } from './colors';
import { spacing, borderRadius } from './spacing';
import { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from './typography';

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
} as const;

export default theme;
