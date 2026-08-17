import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { kpiIndicatorsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import Toggle from './Toggle';
import CustomMonthPicker from './CustomMonthPicker';

const EMPTY_FORM = { name: '', code: '', unit: '%', higherIsBetter: true, active: true };

export default function KpiIndicatorsTab({ embedded = false, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const admin = user?.role === 'admin' || user?.role === 'superadmin' || user?.positionName === 'Администратор';
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await kpiIndicatorsAPI.getAll(month);
    setItems(response.data);
  }, [month]);

  useEffect(() => { load().catch(() => toast.error('Не удалось загрузить показатели')); }, [load]);

  const closeForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); };
  const startEdit = (item) => {
    setForm({ name: item.name, code: item.code, unit: item.unit, higherIsBetter: item.higherIsBetter, active: item.active });
    setEditId(item.id);
    setShowForm(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editId) await kpiIndicatorsAPI.update(editId, form);
      else await kpiIndicatorsAPI.create(form);
      await load();
      await onChanged?.();
      toast.success(editId ? 'Показатель обновлён' : 'Показатель создан и доступен в формуле');
      closeForm();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Не удалось сохранить показатель');
    } finally { setSaving(false); }
  };
  const patch = (id, key, value) => setItems((prev) => prev.map((item) => item.id === id ? { ...item, [key]: value } : item));
  const saveValues = async (item) => {
    await kpiIndicatorsAPI.setValue(item.id, { month, planValue: item.planValue, actualValue: item.actualValue });
    await load();
    toast.success('План и факт сохранены');
  };
  const remove = async (item) => {
    if (!await confirm(`Удалить показатель «${item.name}»?`)) return;
    await kpiIndicatorsAPI.delete(item.id);
    await load();
    await onChanged?.();
    toast.success('Показатель удалён');
  };

  return <section className={`kpi-indicators ${embedded ? 'embedded' : 'settings-section'}`}>
    <div className="settings-card-header kpi-indicators-header">
      <div>
        <h3 className={embedded ? 'settings-card-title' : 'settings-section-title'}>Показатели KPI</h3>
        <p className="settings-section-desc">Создавайте показатели и задавайте план/факт по месяцам. Созданные показатели сразу появляются в конструкторе формулы.</p>
      </div>
      {admin && <button type="button" className="btn btn-primary btn-small" onClick={() => { closeForm(); setShowForm(true); }}><Plus size={15}/> Добавить показатель</button>}
    </div>

    {showForm && admin && <form className="settings-user-form indicator-editor" onSubmit={submit}>
      <div className="settings-card-header"><h4>{editId ? 'Изменение показателя' : 'Новый показатель'}</h4><button type="button" className="kpi-icon-action" onClick={closeForm} aria-label="Закрыть"><X size={17}/></button></div>
      <div className="form-row">
        <div className="form-group"><label>Название *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></div>
        <div className="form-group"><label>Код латиницей *</label><input required disabled={Boolean(editId)} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}/><span className="form-hint">Используется внутри формулы</span></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Единица измерения</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}/></div>
        <div className="indicator-toggles"><Toggle checked={form.higherIsBetter} onChange={(higherIsBetter) => setForm({ ...form, higherIsBetter })} label="Больше — лучше"/>{editId && <Toggle checked={form.active} onChange={(active) => setForm({ ...form, active })} label="Активен"/>}</div>
      </div>
      <div className="form-actions-inline"><button className="btn btn-primary" disabled={saving}><Save size={15}/>{saving ? 'Сохранение...' : 'Сохранить'}</button><button type="button" className="btn" onClick={closeForm}>Отмена</button></div>
    </form>}

    <div className="indicator-toolbar"><label>Плановый период <CustomMonthPicker value={month} onChange={setMonth}/></label></div>
    <div className="table-container"><div className="table-scroll"><table className="data-table"><thead><tr><th>Показатель</th><th>Ед.</th><th>План</th><th>Факт</th><th>Выполнение</th>{admin && <th>Действия</th>}</tr></thead><tbody>
      {items.length === 0 && <tr><td colSpan={admin ? 6 : 5} className="text-muted indicator-empty">Показатели ещё не созданы</td></tr>}
      {items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small className="indicator-code">{item.code}{!item.active ? ' · неактивен' : ''}</small></td><td>{item.unit}</td>
        <td><input disabled={!admin} className="indicator-value" type="number" step="0.01" value={item.planValue} onChange={(e) => patch(item.id, 'planValue', e.target.value)}/></td>
        <td><input disabled={!admin} className="indicator-value" type="number" step="0.01" value={item.actualValue} onChange={(e) => patch(item.id, 'actualValue', e.target.value)}/></td>
        <td><span className={`rate-value ${item.performance >= 100 ? 'good' : item.performance >= 80 ? 'warn' : 'bad'}`}>{item.performance}%</span></td>
        {admin && <td><div className="indicator-actions"><button type="button" title="Сохранить план и факт" onClick={() => saveValues(item)} className="kpi-icon-action"><Save size={16}/></button><button type="button" title="Изменить показатель" onClick={() => startEdit(item)} className="kpi-icon-action"><Pencil size={16}/></button><button type="button" title="Удалить" onClick={() => remove(item)} className="kpi-icon-action danger"><Trash2 size={16}/></button></div></td>}
      </tr>)}
    </tbody></table></div></div>
  </section>;
}
