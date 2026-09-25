/**
 * @module EquipmentPage
 * @description Единая страница оборудования с переключением между видом карточек и таблицы.
 * Выбор вида сохраняется в localStorage.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Map, Table, Wrench } from 'lucide-react';
import EquipmentList from './EquipmentList';
import EquipmentTable from './EquipmentTable';
import EquipmentMap from './EquipmentMap';

const VIEW_KEY = 'equipment-view';

function EquipmentPage() {
  const [mapUnsaved, setMapUnsaved] = useState(false);
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    return ['cards', 'table', 'map'].includes(saved) ? saved : 'cards';
  });

  const switchView = (newView) => {
    if (mapUnsaved) return;
    setView(newView);
    localStorage.setItem(VIEW_KEY, newView);
  };

  return (
    <div>
      <div className="header">
        <h1><Wrench size={24} />Справочник оборудования</h1>
        <div className="header-actions">
          <div className="equipment-view-toggle">
            <button
              className={`btn btn-small ${view === 'cards' ? 'btn-primary' : ''}`}
              onClick={() => switchView('cards')}
              title="Карточки"
              disabled={mapUnsaved}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`btn btn-small ${view === 'table' ? 'btn-primary' : ''}`}
              onClick={() => switchView('table')}
              title="Таблица"
              disabled={mapUnsaved}
            >
              <Table size={16} />
            </button>
            <button
              className={`btn btn-small ${view === 'map' ? 'btn-primary' : ''}`}
              onClick={() => switchView('map')}
              title="Карта"
              disabled={mapUnsaved}
              aria-label="Карта оборудования"
            >
              <Map size={16} />
            </button>
          </div>
          <Link to="/equipment/new" className="btn btn-small btn-primary">+ Добавить</Link>
        </div>
      </div>
      {view === 'cards' ? <EquipmentList embedded /> : view === 'table' ? <EquipmentTable embedded /> : <EquipmentMap onUnsavedChange={setMapUnsaved} />}
    </div>
  );
}

export default EquipmentPage;
