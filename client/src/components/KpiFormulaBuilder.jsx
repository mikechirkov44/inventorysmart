import { useState } from 'react';
import { GripVertical, Plus, RotateCcw, Trash2, WandSparkles } from 'lucide-react';
import Toggle from './Toggle';

const OPERATIONS = [
  { type: 'operator', value: '+', label: '+' }, { type: 'operator', value: '-', label: '−' },
  { type: 'operator', value: '*', label: '×' }, { type: 'operator', value: '/', label: '÷' },
  { type: 'paren', value: '(', label: '(' }, { type: 'paren', value: ')', label: ')' },
  { type: 'number', value: 100, label: '100' },
];

const DEFAULT_THRESHOLDS = [
  { from: 98, payout: 100 }, { from: 95, payout: 80 },
  { from: 90, payout: 50 }, { from: 0, payout: 0 },
];

function tokenLabel(token, metrics) {
  if (token.type === 'metric') return metrics.find((item) => item.id === token.value)?.label || token.value;
  if (token.value === '*') return '×';
  if (token.value === '/') return '÷';
  return String(token.value);
}

export default function KpiFormulaBuilder({ value, onChange, metrics = [], readOnly = false }) {
  const config = value || { enabled: false, tokens: [], thresholds: [] };
  const [dragItem, setDragItem] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const tokens = config.tokens || [];
  const thresholds = config.thresholds || [];
  const update = (patch) => onChange({ ...config, ...patch });
  const addToken = (token) => update({ tokens: [...tokens, { ...token }] });
  const removeToken = (index) => update({ tokens: tokens.filter((_, i) => i !== index) });
  const insertAt = (to) => {
    if (!dragItem) return;
    const next = [...tokens];
    let target = to;
    let item = dragItem.token;
    if (dragItem.source === 'canvas') {
      [item] = next.splice(dragItem.index, 1);
      if (dragItem.index < target) target -= 1;
    }
    next.splice(target, 0, { ...item });
    update({ tokens: next });
    setDragItem(null);
    setDropIndex(null);
  };
  const formulaText = tokens.map((token) => tokenLabel(token, metrics)).join(' ');

  const applyMaintenanceTemplate = () => update({
    enabled: true,
    tokens: [
      { type: 'metric', value: 'onTime' }, { type: 'operator', value: '/' },
      { type: 'metric', value: 'duePassed' }, { type: 'operator', value: '*' },
      { type: 'number', value: 100 },
    ],
    thresholds: DEFAULT_THRESHOLDS,
  });

  return (
    <div className="kpi-builder">
      <div className="kpi-builder-heading">
        <div><strong>Формула KPI</strong><span>Расчёт применяется ко всем сотрудникам этой должности</span></div>
        <Toggle checked={config.enabled === true} onChange={(enabled) => update({ enabled })} label="" disabled={readOnly} />
      </div>

      {!readOnly && <div className="kpi-builder-actions">
        <button type="button" className="btn btn-small" onClick={applyMaintenanceTemplate}>
          <WandSparkles size={15} /> Пример
        </button>
        <button type="button" className="btn btn-small kpi-clear-button" disabled={tokens.length === 0}
          onClick={() => update({ tokens: [] })} title="Удалить все элементы формулы">
          <RotateCcw size={15} /> Очистить формулу
        </button>
      </div>}

      <div className="kpi-palette">
        <div>
          <span className="kpi-palette-label">Показатели</span>
          <div className="kpi-chip-list">
            {metrics.map((metric) => <button type="button" className="kpi-chip metric" key={metric.id} disabled={readOnly} draggable={!readOnly}
              onDragStart={() => setDragItem({ source: 'palette', token: { type: 'metric', value: metric.id } })}
              onClick={() => addToken({ type: 'metric', value: metric.id })}>{metric.label}</button>)}
          </div>
        </div>
        <div>
          <span className="kpi-palette-label">Операции</span>
          <div className="kpi-chip-list">
            {OPERATIONS.map((operation, index) => <button type="button" className="kpi-chip operation" key={`${operation.value}-${index}`} disabled={readOnly} draggable={!readOnly}
              onDragStart={() => setDragItem({ source: 'palette', token: operation })}
              onClick={() => addToken(operation)}>{operation.label}</button>)}
          </div>
        </div>
      </div>

      <div className={`kpi-canvas ${tokens.length ? '' : 'empty'}`}
        onDragOver={(event) => { if (!readOnly && tokens.length === 0) { event.preventDefault(); setDropIndex(0); } }}
        onDrop={() => { if (tokens.length === 0) insertAt(0); }}>
        {tokens.length === 0 && <span>Добавьте показатели и операции — их можно затем перетаскивать</span>}
        {tokens.map((token, index) => <div className="kpi-token-group" key={`${token.type}-${token.value}-${index}`}>
          {!readOnly && <div className={`kpi-drop-zone ${dropIndex === index ? 'active' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDropIndex(index); }} onDrop={() => insertAt(index)} />}
          <div className={`kpi-token ${token.type}`} draggable={!readOnly}
            onDragStart={() => setDragItem({ source: 'canvas', index, token })}>
            <GripVertical size={14} /><span>{tokenLabel(token, metrics)}</span>
            {!readOnly && <button type="button" aria-label="Удалить" onClick={() => removeToken(index)}>×</button>}
          </div>
        </div>)}
        {!readOnly && tokens.length > 0 && <div className={`kpi-drop-zone trailing ${dropIndex === tokens.length ? 'active' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDropIndex(tokens.length); }} onDrop={() => insertAt(tokens.length)} />}
      </div>
      {formulaText && <div className="kpi-formula-preview"><span>Формула:</span> {formulaText}</div>}

      <div className="kpi-thresholds">
        <div className="kpi-thresholds-header"><strong>Шкала премии</strong>{!readOnly && <button type="button" className="btn btn-small" onClick={() => update({ thresholds: [...thresholds, { from: 0, payout: 0 }] })}><Plus size={14} /> Порог</button>}</div>
        {thresholds.length === 0 && <p className="text-muted">Добавьте пороги, например: от 98% результата — 100% премии.</p>}
        {thresholds.map((item, index) => (
          <div className="kpi-threshold-row" key={index}>
            <label><span>Результат KPI от</span><span className="kpi-number-field"><input disabled={readOnly} type="number" step="0.1" value={item.from} onChange={(event) => { const next = [...thresholds]; next[index] = { ...item, from: Number(event.target.value) }; update({ thresholds: next }); }} /><b>%</b></span></label>
            <label><span>Размер премии</span><span className="kpi-number-field"><input disabled={readOnly} type="number" step="0.1" value={item.payout} onChange={(event) => { const next = [...thresholds]; next[index] = { ...item, payout: Number(event.target.value) }; update({ thresholds: next }); }} /><b>%</b></span></label>
            {!readOnly && <button type="button" className="kpi-icon-action danger" aria-label="Удалить порог" title="Удалить порог" onClick={() => update({ thresholds: thresholds.filter((_, i) => i !== index) })}><Trash2 size={16} strokeWidth={1.8} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}
