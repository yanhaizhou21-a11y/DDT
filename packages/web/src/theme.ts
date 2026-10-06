import type { LucideIcon } from 'lucide-react';
import {
  Sun,
  Moon,
  Zap,
  Leaf,
  BookOpen,
  Snowflake,
  Flame,
  Grid,
  Terminal,
  Contrast,
} from 'lucide-react';

export type ThemeMode =
  | 'ledger'
  | 'brutalism'
  | 'swiss'
  | 'terminal'
  | 'monochrome'
  | 'kinetic'
  | 'cyberpunk'
  | 'matcha'
  | 'nord'
  | 'sepia';

export interface ThemeColorTokens {
  paper: string;
  paperTint: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  accent: string;
  accentForeground: string;
  ledgerBlue: string;
  ledgerHover: string;
  ledgerLight: string;
  stampRed: string;
  stampLight: string;
  rule: string;
  ruleLight: string;
  card: string;
  cardSurface: string;
  gold: string;
  goldLight: string;
}

export interface ThemeConfig {
  id: ThemeMode;
  label: string;
  shortLabel: string;
  description: string;
  category: 'light' | 'dark';
  isDark: boolean;
  icon: LucideIcon;
  dotColor: string;
  fontFamily: {
    sans: string;
    serif: string;
    mono: string;
  };
  borderRadius: string;
  shadowStyle: 'soft' | 'hard' | 'flat' | 'none';
  colors: ThemeColorTokens;
}

export const THEME_REGISTRY: Record<ThemeMode, ThemeConfig> = {
  ledger: {
    id: 'ledger',
    label: 'Field Ledger',
    shortLabel: 'Ledger',
    description: 'Warm paper & ink field notebook with classic editorial typography',
    category: 'light',
    isDark: false,
    icon: Sun,
    dotColor: '#C28B38',
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      serif: 'Fraunces, Georgia, serif',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '6px',
    shadowStyle: 'soft',
    colors: {
      paper: '#F6F4EE',
      paperTint: '#ECE7DA',
      ink: '#232019',
      inkSoft: '#6B6455',
      inkMuted: '#8E8675',
      accent: '#2F4858',
      accentForeground: '#FFFFFF',
      ledgerBlue: '#2F4858',
      ledgerHover: '#233744',
      ledgerLight: '#E5EBF0',
      stampRed: '#A83A34',
      stampLight: '#F8EAE9',
      rule: '#DDD7C7',
      ruleLight: '#EBE6DA',
      card: '#FFFDF8',
      cardSurface: '#FCFAF4',
      gold: '#C28B38',
      goldLight: '#FDF6E8',
    },
  },

  brutalism: {
    id: 'brutalism',
    label: 'Neo-Brutalism',
    shortLabel: 'Brutal',
    description: 'Vibrant pop art, 4px solid black strokes, 0px corners & hard ink shadows',
    category: 'light',
    isDark: false,
    icon: Flame,
    dotColor: '#FF6B6B',
    fontFamily: {
      sans: '"Space Grotesk", Inter, system-ui, sans-serif',
      serif: '"Space Grotesk", sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '0px',
    shadowStyle: 'hard',
    colors: {
      paper: '#FFFDF5',
      paperTint: '#F8F4E6',
      ink: '#000000',
      inkSoft: '#1C1917',
      inkMuted: '#44403C',
      accent: '#FF6B6B',
      accentForeground: '#000000',
      ledgerBlue: '#FF6B6B',
      ledgerHover: '#EE5A5A',
      ledgerLight: '#FFD93D',
      stampRed: '#FF6B6B',
      stampLight: 'rgba(255, 107, 107, 0.2)',
      rule: '#000000',
      ruleLight: '#000000',
      card: '#FFFFFF',
      cardSurface: '#FFFDF5',
      gold: '#FFD93D',
      goldLight: 'rgba(255, 217, 61, 0.3)',
    },
  },

  swiss: {
    id: 'swiss',
    label: 'Swiss International',
    shortLabel: 'Swiss',
    description: 'Universal clarity, mathematical grid, monochrome calm & Swiss Red signal',
    category: 'light',
    isDark: false,
    icon: Grid,
    dotColor: '#FF3000',
    fontFamily: {
      sans: 'Inter, Helvetica, Arial, sans-serif',
      serif: 'Inter, Helvetica, Arial, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '0px',
    shadowStyle: 'flat',
    colors: {
      paper: '#FFFFFF',
      paperTint: '#F2F2F2',
      ink: '#000000',
      inkSoft: '#27272A',
      inkMuted: '#52525B',
      accent: '#FF3000',
      accentForeground: '#FFFFFF',
      ledgerBlue: '#FF3000',
      ledgerHover: '#D62700',
      ledgerLight: 'rgba(255, 48, 0, 0.1)',
      stampRed: '#FF3000',
      stampLight: 'rgba(255, 48, 0, 0.12)',
      rule: '#000000',
      ruleLight: '#D4D4D8',
      card: '#FFFFFF',
      cardSurface: '#F2F2F2',
      gold: '#FF3000',
      goldLight: 'rgba(255, 48, 0, 0.1)',
    },
  },

  terminal: {
    id: 'terminal',
    label: 'Terminal CLI',
    shortLabel: 'Terminal',
    description: 'Cyber-industrial shell, pure phosphor green, 0px radius & CRT glow',
    category: 'dark',
    isDark: true,
    icon: Terminal,
    dotColor: '#33ff00',
    fontFamily: {
      sans: 'JetBrains Mono, monospace',
      serif: 'JetBrains Mono, monospace',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '0px',
    shadowStyle: 'none',
    colors: {
      paper: '#0A0A0A',
      paperTint: '#0F150F',
      ink: '#33FF00',
      inkSoft: '#22B300',
      inkMuted: '#1F521F',
      accent: '#33FF00',
      accentForeground: '#0A0A0A',
      ledgerBlue: '#33FF00',
      ledgerHover: '#2BD900',
      ledgerLight: 'rgba(51, 255, 0, 0.15)',
      stampRed: '#FF3333',
      stampLight: 'rgba(255, 51, 51, 0.15)',
      rule: '#1F521F',
      ruleLight: '#2C6E2C',
      card: '#0D110D',
      cardSurface: '#080C08',
      gold: '#FFB000',
      goldLight: 'rgba(255, 176, 0, 0.15)',
    },
  },

  monochrome: {
    id: 'monochrome',
    label: 'Minimalist Monochrome',
    shortLabel: 'Mono',
    description: 'Inverted stark black & pure white ink, hairline borders, zero gray surfaces',
    category: 'dark',
    isDark: true,
    icon: Contrast,
    dotColor: '#FFFFFF',
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      serif: 'Inter, system-ui, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '0px',
    shadowStyle: 'none',
    colors: {
      paper: '#000000',
      paperTint: '#080808',
      ink: '#FFFFFF',
      inkSoft: '#A3A3A3',
      inkMuted: '#737373',
      accent: '#FFFFFF',
      accentForeground: '#000000',
      ledgerBlue: '#FFFFFF',
      ledgerHover: '#E5E5E5',
      ledgerLight: 'rgba(255, 255, 255, 0.12)',
      stampRed: '#FFFFFF',
      stampLight: 'rgba(255, 255, 255, 0.12)',
      rule: '#262626',
      ruleLight: '#404040',
      card: '#000000',
      cardSurface: '#050505',
      gold: '#FFFFFF',
      goldLight: 'rgba(255, 255, 255, 0.12)',
    },
  },

  kinetic: {
    id: 'kinetic',
    label: 'Kinetic Dark',
    shortLabel: 'Dark',
    description: 'High-contrast brutalist obsidian & vivid acid yellow',
    category: 'dark',
    isDark: true,
    icon: Moon,
    dotColor: '#DFE104',
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      serif: 'Fraunces, Georgia, serif',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '6px',
    shadowStyle: 'soft',
    colors: {
      paper: '#09090B',
      paperTint: '#121215',
      ink: '#FAFAFA',
      inkSoft: '#A1A1AA',
      inkMuted: '#71717A',
      accent: '#DFE104',
      accentForeground: '#000000',
      ledgerBlue: '#DFE104',
      ledgerHover: '#C8CA03',
      ledgerLight: 'rgba(223, 225, 4, 0.15)',
      stampRed: '#EF4444',
      stampLight: 'rgba(239, 68, 68, 0.15)',
      rule: '#27272A',
      ruleLight: '#3F3F46',
      card: '#18181B',
      cardSurface: '#141416',
      gold: '#EAB308',
      goldLight: 'rgba(234, 179, 8, 0.15)',
    },
  },

  cyberpunk: {
    id: 'cyberpunk',
    label: 'Cyberpunk Night',
    shortLabel: 'Cyber',
    description: 'Deep midnight blue with neon cyan & hot magenta signals',
    category: 'dark',
    isDark: true,
    icon: Zap,
    dotColor: '#00F0FF',
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      serif: 'Fraunces, Georgia, serif',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '6px',
    shadowStyle: 'soft',
    colors: {
      paper: '#07070E',
      paperTint: '#0D0D1A',
      ink: '#F0F6FC',
      inkSoft: '#94A3B8',
      inkMuted: '#64748B',
      accent: '#00F0FF',
      accentForeground: '#000000',
      ledgerBlue: '#00F0FF',
      ledgerHover: '#00D4E0',
      ledgerLight: 'rgba(0, 240, 255, 0.15)',
      stampRed: '#FF007F',
      stampLight: 'rgba(255, 0, 127, 0.15)',
      rule: '#1E1E38',
      ruleLight: '#2D2D4D',
      card: '#0F0F1E',
      cardSurface: '#141428',
      gold: '#FFE600',
      goldLight: 'rgba(255, 230, 0, 0.15)',
    },
  },

  matcha: {
    id: 'matcha',
    label: 'Matcha Forest',
    shortLabel: 'Matcha',
    description: 'Earthy botanical green & soft matcha sage tone',
    category: 'dark',
    isDark: true,
    icon: Leaf,
    dotColor: '#4ADE80',
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      serif: 'Fraunces, Georgia, serif',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '6px',
    shadowStyle: 'soft',
    colors: {
      paper: '#111915',
      paperTint: '#17221C',
      ink: '#ECF5EE',
      inkSoft: '#94A89C',
      inkMuted: '#64786C',
      accent: '#4ADE80',
      accentForeground: '#000000',
      ledgerBlue: '#4ADE80',
      ledgerHover: '#22C55E',
      ledgerLight: 'rgba(74, 222, 128, 0.15)',
      stampRed: '#F87171',
      stampLight: 'rgba(248, 113, 113, 0.15)',
      rule: '#23352B',
      ruleLight: '#2F473A',
      card: '#18241E',
      cardSurface: '#1E2E26',
      gold: '#FBBF24',
      goldLight: 'rgba(251, 191, 36, 0.15)',
    },
  },

  nord: {
    id: 'nord',
    label: 'Nordic Frost',
    shortLabel: 'Nord',
    description: 'Arctic slate chill with cool polar cyan accents',
    category: 'dark',
    isDark: true,
    icon: Snowflake,
    dotColor: '#88C0D0',
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      serif: 'Fraunces, Georgia, serif',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '6px',
    shadowStyle: 'soft',
    colors: {
      paper: '#1E222A',
      paperTint: '#242933',
      ink: '#ECEFF4',
      inkSoft: '#9AA5B8',
      inkMuted: '#6B778D',
      accent: '#88C0D0',
      accentForeground: '#000000',
      ledgerBlue: '#88C0D0',
      ledgerHover: '#81A1C1',
      ledgerLight: 'rgba(136, 192, 208, 0.15)',
      stampRed: '#BF616A',
      stampLight: 'rgba(191, 97, 106, 0.15)',
      rule: '#2E3440',
      ruleLight: '#3B4252',
      card: '#282E39',
      cardSurface: '#2E3542',
      gold: '#EBCB8B',
      goldLight: 'rgba(235, 203, 139, 0.15)',
    },
  },

  sepia: {
    id: 'sepia',
    label: 'Vintage Sepia',
    shortLabel: 'Sepia',
    description: 'Antique warm parchment with rich leather binding tones',
    category: 'light',
    isDark: false,
    icon: BookOpen,
    dotColor: '#8C4A2F',
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      serif: 'Fraunces, Georgia, serif',
      mono: 'JetBrains Mono, monospace',
    },
    borderRadius: '6px',
    shadowStyle: 'soft',
    colors: {
      paper: '#F4EEDA',
      paperTint: '#E8DECA',
      ink: '#2C2114',
      inkSoft: '#7A6953',
      inkMuted: '#9C8A73',
      accent: '#8C4A2F',
      accentForeground: '#FFFFFF',
      ledgerBlue: '#8C4A2F',
      ledgerHover: '#753B23',
      ledgerLight: 'rgba(140, 74, 47, 0.12)',
      stampRed: '#B91C1C',
      stampLight: 'rgba(185, 28, 28, 0.12)',
      rule: '#D8CBB6',
      ruleLight: '#E8DECA',
      card: '#FCF8EE',
      cardSurface: '#FFFFFF',
      gold: '#C27803',
      goldLight: 'rgba(194, 120, 3, 0.12)',
    },
  },
};

export const THEME_LIST = Object.values(THEME_REGISTRY);

export function getActiveTheme(): ThemeConfig {
  if (typeof window === 'undefined') return THEME_REGISTRY.ledger;
  const stored = localStorage.getItem('ddt-theme') as ThemeMode;
  return stored && THEME_REGISTRY[stored] ? THEME_REGISTRY[stored] : THEME_REGISTRY.ledger;
}

export function applyTheme(themeId: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const config = THEME_REGISTRY[themeId] || THEME_REGISTRY.ledger;
  document.documentElement.setAttribute('data-theme', config.id);
  if (config.isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('ddt-theme', config.id);
}
