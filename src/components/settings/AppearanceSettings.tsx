"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  DEFAULT_GRID_COLUMN_WIDTH,
  GRID_COLUMN_WIDTH_STORAGE_KEY,
  MAX_GRID_COLUMN_WIDTH,
  MIN_GRID_COLUMN_WIDTH,
} from "@/constants/grid";
import { Slider, Switch } from "../primitives";
import styles from "./SettingsDialog.module.css";

const THEMES = [
  {
    id: "light",
    name: "Light",
    icon: Sun,
    colors: ["#f5f5f4", "#ffffff", "#171717"],
  },
  {
    id: "dark",
    name: "Dark",
    icon: Moon,
    colors: ["#030303", "#0a0a0a", "#e5e5e5"],
  },
  {
    id: "system",
    name: "System",
    icon: Monitor,
    colors: ["#030303", "#f5f5f4", "#737373"],
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    icon: Moon,
    colors: ["#282828", "#3c3836", "#ebdbb2"],
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    icon: Moon,
    colors: ["#1e1e2e", "#313244", "#cdd6f4"],
  },
  {
    id: "nord",
    name: "Nord",
    icon: Moon,
    colors: ["#2e3440", "#3b4252", "#eceff4"],
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    icon: Moon,
    colors: ["#1a1b26", "#24283b", "#c0caf5"],
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    icon: Moon,
    colors: ["#191724", "#1f1d2e", "#e0def4"],
  },
  {
    id: "everforest",
    name: "Everforest",
    icon: Moon,
    colors: ["#272E33", "#374145", "#D3C6AA"],
  },
];

const LS_ROW_HEIGHT = "grid-row-height";
const LS_GAP_SIZE = "grid-gap-size";
const LS_BORDER_RADIUS = "grid-border-radius";
const LS_SHOW_WIDGET_NAMES = "show-widget-names";
const DEFAULT_ROW_HEIGHT = 100;
const DEFAULT_GAP_SIZE = 4;
const DEFAULT_BORDER_RADIUS = 8;
const DEFAULT_SHOW_WIDGET_NAMES = true;

export const AppearanceSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);
  const [columnWidth, setColumnWidth] = useState(DEFAULT_GRID_COLUMN_WIDTH);
  const [gapSize, setGapSize] = useState(DEFAULT_GAP_SIZE);
  const [borderRadius, setBorderRadius] = useState(DEFAULT_BORDER_RADIUS);
  const [showWidgetNames, setShowWidgetNames] = useState(
    DEFAULT_SHOW_WIDGET_NAMES,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Needed for SSR hydration detection
    setMounted(true);

    const storedRowHeight = localStorage.getItem(LS_ROW_HEIGHT);
    const storedColumnWidth = localStorage.getItem(
      GRID_COLUMN_WIDTH_STORAGE_KEY,
    );
    const storedGapSize = localStorage.getItem(LS_GAP_SIZE);
    const storedBorderRadius = localStorage.getItem(LS_BORDER_RADIUS);
    const storedShowWidgetNames = localStorage.getItem(LS_SHOW_WIDGET_NAMES);

    if (storedRowHeight) setRowHeight(parseInt(storedRowHeight));
    if (storedColumnWidth) setColumnWidth(parseInt(storedColumnWidth));
    if (storedGapSize) setGapSize(parseInt(storedGapSize));
    if (storedBorderRadius) setBorderRadius(parseInt(storedBorderRadius));
    if (storedShowWidgetNames !== null)
      setShowWidgetNames(storedShowWidgetNames === "true");
  }, []);

  const updateRowHeight = (value: number) => {
    setRowHeight(value);
    localStorage.setItem(LS_ROW_HEIGHT, value.toString());
    window.dispatchEvent(
      new CustomEvent("grid-appearance-change", {
        detail: { rowHeight: value },
      }),
    );
  };

  const updateColumnWidth = (value: number) => {
    setColumnWidth(value);
    localStorage.setItem(GRID_COLUMN_WIDTH_STORAGE_KEY, value.toString());
    window.dispatchEvent(
      new CustomEvent("grid-appearance-change", {
        detail: { columnWidth: value },
      }),
    );
  };

  const updateGapSize = (value: number) => {
    setGapSize(value);
    localStorage.setItem(LS_GAP_SIZE, value.toString());
    window.dispatchEvent(
      new CustomEvent("grid-appearance-change", { detail: { gapSize: value } }),
    );
  };

  const updateBorderRadius = (value: number) => {
    setBorderRadius(value);
    localStorage.setItem(LS_BORDER_RADIUS, value.toString());
    window.dispatchEvent(
      new CustomEvent("grid-appearance-change", {
        detail: { borderRadius: value },
      }),
    );
  };

  const updateShowWidgetNames = (value: boolean) => {
    setShowWidgetNames(value);
    localStorage.setItem(LS_SHOW_WIDGET_NAMES, value.toString());
    window.dispatchEvent(
      new CustomEvent("grid-appearance-change", {
        detail: { showWidgetNames: value },
      }),
    );
  };

  if (!mounted) return null;

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Theme</div>
        <div className={styles.themeGrid}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`${styles.themeCard} ${theme === t.id ? styles.active : ""}`}
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

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Grid Layout</div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Row Height</span>
            <span className={styles.settingDesc}>
              Grid vertical spacing ({rowHeight}px)
            </span>
          </div>
          <div className={styles.controlMd}>
            <Slider
              min={50}
              max={200}
              step={2}
              value={rowHeight}
              onChange={(e) => updateRowHeight(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Column Width</span>
            <span className={styles.settingDesc}>
              Width of the centered grid columns across all layouts (
              {columnWidth}px)
            </span>
          </div>
          <div className={styles.controlMd}>
            <Slider
              min={MIN_GRID_COLUMN_WIDTH}
              max={MAX_GRID_COLUMN_WIDTH}
              step={4}
              value={columnWidth}
              onChange={(e) => updateColumnWidth(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Gap Size</span>
            <span className={styles.settingDesc}>
              Spacing between widgets ({gapSize}px)
            </span>
          </div>
          <div className={styles.controlMd}>
            <Slider
              min={0}
              max={32}
              step={2}
              value={gapSize}
              onChange={(e) => updateGapSize(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Border Radius</span>
            <span className={styles.settingDesc}>
              Widget corner roundness ({borderRadius}px)
            </span>
          </div>
          <div className={styles.controlMd}>
            <Slider
              min={0}
              max={48}
              step={4}
              value={borderRadius}
              onChange={(e) => updateBorderRadius(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Show Widget Names</span>
            <span className={styles.settingDesc}>
              Display widget type names above widgets
            </span>
          </div>
          <Switch
            checked={showWidgetNames}
            onCheckedChange={updateShowWidgetNames}
          />
        </div>
      </div>
    </>
  );
};
