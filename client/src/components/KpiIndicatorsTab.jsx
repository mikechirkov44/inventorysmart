import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { kpiIndicatorsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export default function KpiIndicatorsTab() {
  const { user } = useAuth(); const toast = useToast();
  const admin = user?.role === 'admin' || user?.role === 'superadmin' || user?.positionName === 'Администратор';
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name:'', code:'', unit:'%', higherIsBetter:true });
  const load = async () => setItems((await kpiIndicatorsAPI.getAll(month)).data);
  useEffect(() => { load().catch(() => toast.error('Не удалось загрузить показатели')); }, [month]);
  const create = async (e) => { e.preventDefault(); try { await kpiIndicatorsAPI.create(form); setForm({name:'',code:'',unit:'%',higherIsBetter:true}); await load(); toast.success('Показатель создан'); } catch (err) { toast.error(err.response?.data?.error || 'Ошибка создания'); } };
  const patch = (id, key, value) => setItems((prev) => prev.map((item) => item.id === id ? {...item,[key]:value} : item));
  const save = async (item) => { await kpiIndicatorsAPI.setValue(item.id,{month,planValue:item.planValue,actualValue:item.actualValue}); toast.success('План и факт сохранены'); };
  return <div className="settings-section">
    <h2 className="settings-section-title">Показатели KPI</h2><p className="settings-section-desc">Создавайте собственные показатели и вводите плановые и фактические значения по месяцам.</p>
    {admin && <form className="indicator-create" onSubmit={create}>
      <input required placeholder="Название показателя" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <input required placeholder="Код латиницей" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')})}/>
      <input placeholder="Единица" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/>
      <label className="indicator-direction"><input type="checkbox" checked={form.higherIsBetter} onChange={e=>setForm({...form,higherIsBetter:e.target.checked})}/> Больше — лучше</label>
      <button className="btn btn-primary"><Plus size={15}/> Создать</button>
    </form>}
    <div className="indicator-toolbar"><label>Период <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label></div>
    <div className="table-container"><div className="table-scroll"><table className="data-table"><thead><tr><th>Показатель</th><th>Ед.</th><th>План</th><th>Факт</th><th>Выполнение</th>{admin&&<th>Действия</th>}</tr></thead><tbody>
      {items.map(item=><tr key={item.id}><td><strong>{item.name}</strong><small className="indicator-code">{item.code}</small></td><td>{item.unit}</td>
        <td><input disabled={!admin} className="indicator-value" type="number" step="0.01" value={item.planValue} onChange={e=>patch(item.id,'planValue',e.target.value)}/></td>
        <td><input disabled={!admin} className="indicator-value" type="number" step="0.01" value={item.actualValue} onChange={e=>patch(item.id,'actualValue',e.target.value)}/></td>
        <td><span className={`rate-value ${item.performance>=100?'good':item.performance>=80?'warn':'bad'}`}>{item.performance}%</span></td>
        {admin&&<td><div className="indicator-actions"><button title="Сохранить" onClick={()=>save(item)} className="kpi-icon-action"><Save size={16}/></button><button title="Удалить" onClick={async()=>{await kpiIndicatorsAPI.delete(item.id);load()}} className="kpi-icon-action danger"><Trash2 size={16}/></button></div></td>}</tr>)}
    </tbody></table></div></div>
  </div>;
}
