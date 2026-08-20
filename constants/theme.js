// MediAI Unified Design System & Theme Tokens

export const colors = {
  // Brand Default (Fallback)
  primary: '#0D9488',      // Emerald Teal
  primaryDark: '#047857',
  primaryLight: '#14B8A6',
  primaryGlow: 'rgba(13, 148, 136, 0.12)',
  primarySurface: '#F0FDF4',

  // Role-Specific Theme Palettes
  user: {
    primary: '#0D9488',    // Medical Teal/Emerald
    primaryDark: '#047857',
    primaryLight: '#14B8A6',
    primaryGlow: 'rgba(13, 148, 136, 0.12)',
    primarySurface: '#F0FDF4',
    gradient: ['#0D9488', '#059669'],
  },
  doctor: {
    primary: '#4F46E5',    // Professional Indigo
    primaryDark: '#3730A3',
    primaryLight: '#818CF8',
    primaryGlow: 'rgba(79, 70, 229, 0.12)',
    primarySurface: '#EEF2FF',
    gradient: ['#4F46E5', '#3B82F6'],
  },
  admin: {
    primary: '#7C3AED',    // Purple Management
    primaryDark: '#5B21B6',
    primaryLight: '#A78BFA',
    primaryGlow: 'rgba(124, 58, 237, 0.12)',
    primarySurface: '#F5F3FF',
    gradient: ['#7C3AED', '#8B5CF6'],
  },
  superAdmin: {
    primary: '#0F172A',    // Platform Slate Navy
    primaryDark: '#020617',
    primaryLight: '#334155',
    primaryGlow: 'rgba(15, 23, 42, 0.12)',
    primarySurface: '#F8FAFC',
    gradient: ['#0F172A', '#1E293B'],
  },

  // Semantic Alert Colors
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.10)',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.10)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.10)',
  info: '#0284C7',
  infoLight: 'rgba(2, 132, 199, 0.10)',

  // Neutral Colors
  background: '#F8FAFC',
  backgroundSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  overlay: 'rgba(15, 23, 42, 0.55)',

  // Text Contrast
  text: '#0F172A',           // Primary text (slate-900)
  textSecondary: '#334155',  // Secondary text (slate-700)
  textMuted: '#64748B',      // Hint/disabled text (slate-500)
  textInverse: '#FFFFFF',

  // Basic Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const gradients = {
  primary: ['#0D9488', '#059669'],
  hero: ['#ECFDF5', '#F0FDF4', '#F8FAFC'],
  card: ['#FFFFFF', '#F8FAFC'],
  danger: ['#EF4444', '#DC2626'],
  success: ['#10B981', '#059669'],
  accent: ['#0284C7', '#0369A1'],
  gold: ['#F59E0B', '#D97706'],
  glass: ['rgba(255, 255, 255, 0.95)', 'rgba(248, 250, 252, 0.92)'],
};

// Typography Scale
export const typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 32,
    '4xl': 38,
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  // Typography mapping for layout components
  presets: {
    heading1: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 30,
    },
    heading2: {
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 26,
    },
    heading3: {
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 22,
    },
    body: {
      fontSize: 15,
      fontWeight: '400',
      lineHeight: 22,
    },
    caption: {
      fontSize: 11,
      fontWeight: '400',
      lineHeight: 16,
    },
    buttonLabel: {
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
  },
};

// Spacing Scale (4px base)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// Border Radius Scale
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

// Elevation & Shadows
export const shadows = {
  sm: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  primary: {
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  danger: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};
