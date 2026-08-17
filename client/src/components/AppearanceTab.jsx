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
        Выберите режим и основной цвет интерфейса. Настройка применяется ко всем страницам компании сразу.
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

      <div className={`appearance-preview appearance-preview-${mode}`}>
        <div className="appearance-preview-title">Предпросмотр темы</div>
        <div className="appearance-demo-shell">
          <aside className="appearance-demo-sidebar">
            <span className="appearance-demo-logo">IS</span>
            <span className="appearance-demo-nav active">Обзор</span>
            <span className="appearance-demo-nav">Аналитика</span>
            <span className="appearance-demo-nav">Настройки</span>
          </aside>
          <div className="appearance-demo-main">
            <div className="appearance-demo-header"><i /><i /><i /></div>
            <div className="appearance-demo-content">
              <div className="appearance-demo-heading"><span>Рабочая панель</span><span className="appearance-preview-btn">Создать</span></div>
              <div className="appearance-demo-cards">
                <div className="appearance-preview-kpi"><div className="appearance-preview-kpi-value">24</div><div className="appearance-preview-kpi-label">Выполнено</div></div>
                <div className="appearance-preview-kpi"><div className="appearance-preview-kpi-value">96%</div><div className="appearance-preview-kpi-label">KPI месяца</div></div>
                <div className="appearance-demo-list"><span /><span /><span /></div>
              </div>
              <div className="appearance-preview-row"><span className="appearance-preview-badge">Выполнено</span><span className="appearance-preview-badge neutral">В работе</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
