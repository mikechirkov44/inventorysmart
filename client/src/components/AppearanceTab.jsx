import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { companyAPI } from '../services/api';
import { useToast } from './Toast';
import { applyThemeColor } from '../utils/theme';

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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyAPI.get().then((res) => {
      const c = res.data.themeColor || '#4f46e5';
      setColor(c);
      applyThemeColor(c);
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

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="settings-section">
      <h2 className="settings-section-title"><Palette size={20} /> Оформление</h2>
      <p className="settings-hint" style={{ marginBottom: 16 }}>
        Выберите основной цвет интерфейса для вашей компании. Изменения применяются сразу.
      </p>

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
    </div>
  );
}
