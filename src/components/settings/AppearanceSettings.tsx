"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import styles from './SettingsDialog.module.css';

const THEMES = [
  { id: 'light', name: 'Light', icon: Sun, colors: ['#f5f5f4', '#ffffff', '#171717'] },
  { id: 'dark', name: 'Dark', icon: Moon, colors: ['#030303', '#0a0a0a', '#e5e5e5'] },
  { id: 'system', name: 'System', icon: Monitor, colors: ['#030303', '#f5f5f4', '#737373'] },
  { id: 'gruvbox', name: 'Gruvbox', icon: Moon, colors: ['#282828', '#3c3836', '#ebdbb2'] },
  { id: 'catppuccin', name: 'Catppuccin', icon: Moon, colors: ['#1e1e2e', '#313244', '#cdd6f4'] },
  { id: 'nord', name: 'Nord', icon: Moon, colors: ['#2e3440', '#3b4252', '#eceff4'] },
  { id: 'tokyo-night', name: 'Tokyo Night', icon: Moon, colors: ['#1a1b26', '#24283b', '#c0caf5'] },
  { id: 'rose-pine', name: 'Rosé Pine', icon: Moon, colors: ['#191724', '#1f1d2e', '#e0def4'] },
  { id: 'everforest', name: 'Everforest', icon: Moon, colors: ['#272E33', '#374145', '#D3C6AA'] },
];

export const AppearanceSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Theme</div>
      <div className={styles.themeGrid}>
        {THEMES.map(t => (
          <button
            key={t.id}
            className={`${styles.themeCard} ${theme === t.id ? styles.active : ''}`}
            onClick={() => setTheme(t.id)}
          >
            <div className={styles.themePreview}>
              {t.colors.map((color, i) => (
                <div 
                  key={i} 
                  className={styles.themePreviewSwatch}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className={styles.themeName}>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
