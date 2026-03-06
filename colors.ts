export const DARK = {
  bg: '#0B0B12',
  bgSecondary: '#141420',
  card: '#1A1A28',
  cardHover: '#1E1E2E',
  border: '#252535',
  borderLight: '#2E2E42',
  textPrimary: '#F0F0FF',
  textSecondary: '#9090B8',
  textMuted: '#454565',
  shadow: 'rgba(0,0,0,0.6)',
  overlay: 'rgba(11,11,18,0.85)',
  danger: '#FF4D6A',
  success: '#10B981',
  warning: '#F59E0B',
};

export const ACCENT_COLORS = {
  cyan: {
    primary: '#00D4FF',
    secondary: '#0070FF',
    glow: 'rgba(0,212,255,0.2)',
    bubble: 'rgba(0,212,255,0.15)',
    name: 'Голубой',
  },
  purple: {
    primary: '#A855F7',
    secondary: '#7C3AED',
    glow: 'rgba(168,85,247,0.2)',
    bubble: 'rgba(168,85,247,0.15)',
    name: 'Фиолетовый',
  },
  emerald: {
    primary: '#10B981',
    secondary: '#059669',
    glow: 'rgba(16,185,129,0.2)',
    bubble: 'rgba(16,185,129,0.15)',
    name: 'Изумрудный',
  },
  orange: {
    primary: '#F97316',
    secondary: '#EA580C',
    glow: 'rgba(249,115,22,0.2)',
    bubble: 'rgba(249,115,22,0.15)',
    name: 'Оранжевый',
  },
  pink: {
    primary: '#EC4899',
    secondary: '#DB2777',
    glow: 'rgba(236,72,153,0.2)',
    bubble: 'rgba(236,72,153,0.15)',
    name: 'Розовый',
  },
  blue: {
    primary: '#3B82F6',
    secondary: '#2563EB',
    glow: 'rgba(59,130,246,0.2)',
    bubble: 'rgba(59,130,246,0.15)',
    name: 'Синий',
  },
};

export type AccentKey = keyof typeof ACCENT_COLORS;

export default {
  light: {
    text: '#F0F0FF',
    background: '#0B0B12',
    tint: '#00D4FF',
    tabIconDefault: '#454565',
    tabIconSelected: '#00D4FF',
  },
  dark: DARK,
  accents: ACCENT_COLORS,
};
