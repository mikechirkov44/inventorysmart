import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { companyAPI } from '../services/api';
import { useToast } from './Toast';
import { applyThemeColor, applyThemeMode } from '../utils/theme';

const PRESET_COLORS = [
  { id: 'indigo', value: '#4f46e5', label: 'Индиго' },
  { id: 'blue', value: '#2563eb', label: 'Синий' },
  { id: 'violet', value: '#7c3aed', label: 'Фиолетовый' },
  { id: 'teal', value: '#0d9488', label: 'Бирюзовый' },
  { id: 'emerald', value: '#059669', label: 'Изумруд' },
  { id: 'rose', value: '#e11d48', label: 'Розовый' },
  { id: 'orange', value: '#ea580c', label: 'Оранжевый' },
  { id: 'slate', value: '#475569', label: 'Серый' },
];

/**
 * Вкладка настройки цвета бренда компании.
 */
export default function AppearanceTab({ readOnly }) {
  const toast = useToast();
  const [color, setColor] = useState('#4f46e5');
  const [mode, setMode] = useState('light');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyAPI.get().then((res) => {
      const c = res.data.themeColor || '#4f46e5';
      setColor(c);
      setMode(res.data.themeMode || 'light');
      applyThemeColor(c);
      applyThemeMode(res.data.themeMode || 'light');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelect = async (newColor) => {
    if (readOnly) return;
    setColor(newColor);
    applyThemeColor(newColor);
    setSaving(true);
    try {
      await companyAPI.updateTheme({ themeColor: newColor });
      toast.success('Цвет бренда сохранён');
    } catch {
      toast.error('Не удалось сохранить цвет');
    } finally {
      setSaving(false);
    }
  };

  const handleMode = async (newMode) => {
    if (readOnly) return;
    setMode(newMode); applyThemeMode(newMode); setSaving(true);
    try { await companyAPI.updateTheme({ themeColor: color, themeMode: newMode }); toast.success('Тема сохранена'); }
    catch { toast.error('Не удалось сохранить тему'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="settings-section">
      <h2 className="settings-section-title"><Palette size={20} /> Оформление</h2>
      <p className="settings-hint" style={{ marginBottom: 16 }}>
        Выберите основной цвет интерфейса для вашей компании. Изменения применяются сразу.
      </p>

      <div className="theme-mode-grid">
        {[['light','Светлая','Светлый фон и панели'],['dark','Тёмная','Тёмный фон и панели'],['hybrid','Гибрид','Тёмная навигация, светлый контент']].map(([id,label,desc]) => (
          <button key={id} type="button" disabled={readOnly || saving} className={`theme-mode-card ${mode === id ? 'active' : ''}`} onClick={() => handleMode(id)}>
            <span className={`theme-mode-preview ${id}`}><i /><i /></span><strong>{label}</strong><small>{desc}</small>
          </button>
        ))}
      </div>

      <div className="appearance-colors">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`appearance-swatch ${color === preset.value ? 'active' : ''}`}
            style={{ background: preset.value }}
            title={preset.label}
            disabled={readOnly || saving}
            onClick={() => handleSelect(preset.value)}
            aria-label={preset.label}
          />
        ))}
      </div>

      {!readOnly && (
        <div className="appearance-custom">
          <label>Свой цвет:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={saving}
          />
          <span className="settings-hint">{color}</span>
        </div>
      )}

      <div className="appearance-preview">
        <div className="appearance-preview-title">Предпросмотр</div>
        <div className="appearance-preview-row">
          <span className="appearance-preview-btn">Кнопка</span>
          <span className="appearance-preview-badge">Бейдж</span>
          <span className="appearance-preview-nav">● Пункт меню</span>
          <div className="appearance-preview-kpi">
            <div className="appearance-preview-kpi-value">24</div>
            <div className="appearance-preview-kpi-label">KPI</div>
          </div>
        </div>
      </div>
    </div>
  );
}
