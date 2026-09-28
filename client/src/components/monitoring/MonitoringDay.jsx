import { useState } from 'react';
import { MONITORING_STATES, loadLabel, minutesLabel, timeLabel } from '../../services/monitoring/model';

export function MonitoringLegend() {
  return <div className="monitor-legend">{Object.entries(MONITORING_STATES).map(([state, item]) => <span key={state}><i className={item.className} />{item.label}</span>)}</div>;
}

export default function MonitoringDay({ day }) {
  const [selected, setSelected] = useState(null);
  const interval = selected == null ? null : day.intervals[selected];
  return <div className="monitor-day">
    <div className="monitor-metrics">
      <div className="monitor-metric"><span>Загрузка</span><strong className="monitor-day-load" data-utilization={day.utilization ?? ''}>{loadLabel(day.utilization)}</strong><small>Доля времени работы</small></div>
      <div className="monitor-metric"><span>В работе</span><strong>{minutesLabel(day.minutes.working)}</strong><small>Выполнение операций</small></div>
      <div className="monitor-metric"><span>Простой</span><strong>{minutesLabel(day.minutes.idle)}</strong><small>Включено, без работы</small></div>
      <div className="monitor-metric"><span>Аварии</span><strong>{minutesLabel(day.minutes.fault)}</strong><small>Остановки по ошибке</small></div>
    </div>
    <div className="monitor-chart-grid">
      <section className="monitor-chart-card">
        <h3>Распределение времени</h3>
        <div className="monitor-distribution" aria-label="Распределение состояний оборудования">
          {Object.entries(day.minutes).filter(([, value]) => value > 0).map(([state, value]) => <div key={state} className={MONITORING_STATES[state].className} style={{ width: `${value / day.elapsedMinutes * 100}%` }} title={`${MONITORING_STATES[state].label}: ${minutesLabel(value)}`} />)}
        </div>
        <dl className="monitor-breakdown">{Object.entries(MONITORING_STATES).map(([state, item]) => <div key={state}><dt><i className={item.className} />{item.label}</dt><dd>{minutesLabel(day.minutes[state])}<span>{day.elapsedMinutes ? Math.round(day.minutes[state] / day.elapsedMinutes * 100) : 0}%</span></dd></div>)}</dl>
      </section>
      <section className="monitor-chart-card monitor-timeline-card">
        <h3>{day.mode === 'shift' ? `Работа в смене ${day.shiftStart}–${day.shiftEnd}` : 'Работа за сутки'}</h3>
        <p className="monitor-muted">Нажмите цветной участок, чтобы посмотреть интервал.</p>
        <div className="monitor-timeline" aria-label="Состояния с 00:00 до 24:00">
          {day.intervals.map((item, i) => <button key={item.startMinute} type="button" className={`${MONITORING_STATES[item.state].className} ${selected === i ? 'is-selected' : ''}`} style={{ left: `${item.startMinute / 1440 * 100}%`, width: `${(item.endMinute - item.startMinute) / 1440 * 100}%` }} onClick={() => setSelected(i)} title={`${timeLabel(item.startMinute)}–${timeLabel(item.endMinute)} · ${MONITORING_STATES[item.state].label}`} aria-label={`${timeLabel(item.startMinute)}–${timeLabel(item.endMinute)}: ${MONITORING_STATES[item.state].label}`} />)}
        </div>
        <div className="monitor-axis">{['00:00', '06:00', '12:00', '18:00', '24:00'].map(time => <span key={time}>{time}</span>)}</div>
        <MonitoringLegend />
        <div className="monitor-interval-info" aria-live="polite">{interval ? <><strong>{MONITORING_STATES[interval.state].label}</strong><span>{timeLabel(interval.startMinute)}–{timeLabel(interval.endMinute)} · {minutesLabel(interval.endMinute - interval.startMinute)}</span></> : <span>{day.elapsedMinutes ? `Показано ${minutesLabel(day.elapsedMinutes)}. Светлый фон после последнего участка — ещё не наступившее время.` : 'За эту дату данных пока нет.'}</span>}</div>
        <details className="monitor-interval-list"><summary>Все интервалы ({day.intervals.length})</summary><div><table><thead><tr><th>Начало</th><th>Конец</th><th>Состояние</th><th>Длительность</th></tr></thead><tbody>{day.intervals.map(item => <tr key={item.startMinute}><td>{timeLabel(item.startMinute)}</td><td>{timeLabel(item.endMinute)}</td><td>{MONITORING_STATES[item.state].label}</td><td>{minutesLabel(item.endMinute - item.startMinute)}</td></tr>)}</tbody></table></div></details>
      </section>
    </div>
    <p className="monitor-footnote">{day.mode === 'shift' ? `Загрузка = время работы / прошедшее время смены ${day.shiftStart}–${day.shiftEnd}.` : 'Загрузка = время работы / прошедшее время суток. Полные сутки — 24 часа.'} «Нет данных» не считается работой и не означает, что станок выключен. Время: Москва (UTC+3).</p>
  </div>;
}
