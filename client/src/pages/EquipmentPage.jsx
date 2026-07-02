/**
 * @module EquipmentPage
 * @description Единая страница оборудования с переключением между видом карточек и таблицы.
 * Выбор вида сохраняется в localStorage.
 */
import { useState } from 'react';
import { LayoutGrid, Table } from 'lucide-react';
import EquipmentList from './EquipmentList';
import EquipmentTable from './EquipmentTable';

const VIEW_KEY = 'equipment-view';

function EquipmentPage() {
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'cards');

  const switchView = (newView) => {
    setView(newView);
    localStorage.setItem(VIEW_KEY, newView);
  };

  return (
    <div>
      <div className="equipment-view-toggle">
        <button
          className={`btn btn-small ${view === 'cards' ? 'btn-primary' : ''}`}
          onClick={() => switchView('cards')}
          title="Карточки"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          className={`btn btn-small ${view === 'table' ? 'btn-primary' : ''}`}
          onClick={() => switchView('table')}
          title="Таблица"
        >
          <Table size={16} />
        </button>
      </div>
      {view === 'cards' ? <EquipmentList embedded /> : <EquipmentTable embedded />}
    </div>
  );
}

export default EquipmentPage;
