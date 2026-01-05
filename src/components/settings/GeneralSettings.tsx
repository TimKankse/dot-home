"use client";

import React from 'react';
import { Layout, Check, Globe, Calendar, RefreshCw, MapPin } from 'lucide-react'; // Added icons
import { useSettingsStore } from '@/store/useSettingsStore';
import { SearchableSelect } from '../ui/SearchableSelect';
import { TIMEZONES, COUNTRIES, LOCALE_TO_COUNTRY, TIMEZONE_TO_COUNTRY } from '@/utils/constants'; // Removed extractCityFromTimezone
import styles from './SettingsDialog.module.css';
import pkg from '../../../package.json';

export const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Location</div>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Auto-Detect Settings</span>
            <span className={styles.settingDesc}>Set time, language, and units based on browser</span>
          </div>
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={settings?.behavior?.autoDetectLocation ?? false}
              onChange={(e) => {
                const checked = e.target.checked;
                updateSettings({ autoDetectLocation: checked }, 'behavior');
                if (checked) {
                  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const locale = navigator.language;
                  const temperatureUnit = locale === 'en-US' ? 'F' : 'C';
                  const is24Hour = !new Date().toLocaleTimeString(locale).match(/AM|PM/i);
                  
                  const country = TIMEZONE_TO_COUNTRY[timeZone] || LOCALE_TO_COUNTRY[locale] || '';
                  const locationName = country;
                  
                  updateSettings({
                    timezone: timeZone,
                    language: locale.split('-')[0],
                    temperatureUnit,
                    is24Hour,
                    location: locationName
                  }, 'display');
                }
              }}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Timezone</span>
            <span className={styles.settingDesc}>System timezone</span>
          </div>
          <div style={{ width: '240px' }}>
             <SearchableSelect
               options={TIMEZONES}
               value={settings?.display?.timezone || ''}
               onChange={(val) => updateSettings({ timezone: val }, 'display')}
               placeholder="Select timezone..."
               icon={<Globe size={14} />}
               disabled={settings?.behavior?.autoDetectLocation}
             />
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Country</span>
            <span className={styles.settingDesc}>Regional settings</span>
          </div>
          <div style={{ width: '240px' }}>
             <SearchableSelect
               options={COUNTRIES}
               value={settings?.display?.location || ''}
               onChange={(val) => updateSettings({ location: val }, 'display')}
               placeholder="Select country..."
               icon={<MapPin size={14} />}
               disabled={settings?.behavior?.autoDetectLocation}
             />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Behavior</div>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Confirm Layout Changes</span>
            <span className={styles.settingDesc}>Prompt before saving layout edits</span>
          </div>
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={settings?.behavior?.confirmEdit ?? false}
              onChange={(e) => updateSettings({ confirmEdit: e.target.checked }, 'behavior')}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Auto-Save Config</span>
            <span className={styles.settingDesc}>Automatically save changes</span>
          </div>
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={settings?.behavior?.autoSave ?? true}
              onChange={(e) => updateSettings({ autoSave: e.target.checked }, 'behavior')}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Refresh Interval</span>
            <span className={styles.settingDesc}>Global widget refresh rate</span>
          </div>
          <div className={styles.selectWrapper}>
            <RefreshCw size={14} className={styles.selectIcon} />
            <select 
              className={styles.smallSelect}
              value={settings?.behavior?.refreshInterval ?? 10}
              onChange={(e) => updateSettings({ refreshInterval: parseInt(e.target.value) }, 'behavior')}
            >
              <option value={5}>5 mins</option>
              <option value={10}>10 mins</option>
              <option value={15}>15 mins</option>
              <option value={30}>30 mins</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Display</div>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Clock Format</span>
            <span className={styles.settingDesc}>12h vs 24h time display</span>
          </div>
          <div className={styles.toggleGroup}>
            <button 
              className={`${styles.toggleBtn} ${!settings?.display?.is24Hour ? styles.active : ''}`}
              onClick={() => updateSettings({ is24Hour: false }, 'display')}
            >12h</button>
            <button 
              className={`${styles.toggleBtn} ${settings?.display?.is24Hour ? styles.active : ''}`}
              onClick={() => updateSettings({ is24Hour: true }, 'display')}
            >24h</button>
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Temperature</span>
            <span className={styles.settingDesc}>Display units</span>
          </div>
          <div className={styles.toggleGroup}>
            <button 
              className={`${styles.toggleBtn} ${settings?.display?.temperatureUnit === 'C' ? styles.active : ''}`}
              onClick={() => updateSettings({ temperatureUnit: 'C' }, 'display')}
            >°C</button>
            <button 
              className={`${styles.toggleBtn} ${settings?.display?.temperatureUnit === 'F' ? styles.active : ''}`}
              onClick={() => updateSettings({ temperatureUnit: 'F' }, 'display')}
            >°F</button>
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Date Format</span>
            <span className={styles.settingDesc}>Regional date preference</span>
          </div>
          <div className={styles.selectWrapper}>
            <Calendar size={14} className={styles.selectIcon} />
            <select 
              className={styles.smallSelect}
              value={settings?.display?.dateFormat ?? 'DD/MM'}
              onChange={(e) => updateSettings({ dateFormat: e.target.value as any }, 'display')}
            >
              <option value="DD/MM">DD/MM</option>
              <option value="MM/DD">MM/DD</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Language</span>
            <span className={styles.settingDesc}>System language</span>
          </div>
          <div className={styles.selectWrapper}>
            <Globe size={14} className={styles.selectIcon} />
            <select 
              className={styles.smallSelect}
              value={settings?.display?.language ?? 'en'}
              onChange={(e) => updateSettings({ language: e.target.value }, 'display')}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>About</div>
        <div className={styles.aboutCard}>
          <div className={styles.aboutHeader}>
            <div className={styles.aboutIcon}>
              <Layout size={24} />
            </div>
            <div className={styles.aboutInfo}>
              <h4 className={styles.aboutTitle}>Editorial OS</h4>
              <p className={styles.aboutVersion}>v{pkg.version}</p>
            </div>
          </div>
          <div className={styles.aboutStatus}>
            <div className={styles.statusBadge}>
              <Check size={12} />
              Up to date
            </div>
            <span className={styles.statusText}>You are running the latest version</span>
          </div>
        </div>
      </div>
    </>
  );
};
