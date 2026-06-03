/**
 * @module EquipmentPassport
 * @description Компонент паспорта оборудования.
 * Формирует и отображает полную информацию об оборудовании:
 * основные данные, плановые работы, инциденты, историю ремонтов.
 * Поддерживает печать и экспорт в PDF.
 */

import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/** Соответствие кодов состояния русским названиям */
const STATUS_MAP = {
  working: 'Работает',
  under_repair: 'В ремонте',
  needs_repair: 'Требует ремонта',
};

/** Варианты периодичности плановых работ */
const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Ежедневно' },
  { value: 7, label: '1 раз в неделю' },
  { value: 10, label: '1 раз в 10 дней' },
  { value: 14, label: '1 раз в 2 недели' },
  { value: 30, label: '1 раз в месяц' },
  { value: 60, label: '1 раз в 2 месяца' },
  { value: 90, label: '1 раз в 3 месяца' },
  { value: 180, label: '1 раз в 6 месяцев' },
  { value: 365, label: '1 раз в год' },
];

/** Возвращает текстовое описание периодичности по количеству дней */
function getFrequencyLabel(days) {
  const opt = FREQUENCY_OPTIONS.find(o => o.value === days);
  return opt ? opt.label : `каждые ${days} дн.`;
}

/** Форматирует ISO-дату в формат dd.mm.yyyy */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

/**
 * Паспорт оборудования.
 * @param {Object} props
 * @param {Object} props.equipment - Данные оборудования
 * @param {Object} [props.room] - Помещение, где находится оборудование
 * @param {Array} [props.assignedWorks] - Назначенные плановые работы
 * @param {Array} [props.spareParts] - Запасные части
 * @param {Array} [props.workOrders] - Наряд-заказы (история ремонтов)
 * @param {Array} [props.incidents] - Инциденты
 * @param {Object} [props.qrData] - Данные QR-кода
 */
function EquipmentPassport({ equipment, room, assignedWorks, spareParts, workOrders, incidents, qrData }) {
  const passportRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  /** Открывает окно печати паспорта оборудования */
  const handlePrint = () => {
    const content = passportRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Паспорт — ${equipment.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.5; padding: 30px; }
          .passport { max-width: 800px; margin: 0 auto; }
          .passport-header { text-align: center; margin-bottom: 28px; border-bottom: 3px solid #1f2937; padding-bottom: 16px; }
          .passport-header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
          .passport-header .subtitle { font-size: 13px; color: #6b7280; }
          .passport-header .inv-num { font-size: 15px; font-weight: 600; color: #4f46e5; margin-top: 6px; }
          .passport-body { display: flex; gap: 24px; margin-bottom: 24px; }
          .passport-photo { width: 200px; flex-shrink: 0; }
          .passport-photo img { width: 100%; height: 200px; object-fit: cover; border: 1px solid #e5e7eb; border-radius: 6px; }
          .passport-photo .no-photo { width: 100%; height: 200px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #9ca3af; border-radius: 6px; font-size: 13px; }
          .passport-qr { text-align: center; margin-top: 10px; }
          .passport-qr img { width: 120px; height: 120px; display: block; margin: 0 auto; image-rendering: pixelated; border: 1px solid #e5e7eb; border-radius: 4px; }
          .passport-info { flex: 1; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table tr { border-bottom: 1px solid #f3f4f6; }
          .info-table td { padding: 8px 0; font-size: 13px; vertical-align: top; }
          .info-table td:first-child { font-weight: 600; color: #6b7280; width: 160px; }
          .passport-section { margin-bottom: 20px; }
          .passport-section h3 { font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
          .works-list, .spare-parts-list, .history-list { list-style: none; font-size: 12px; }
          .works-list li, .spare-parts-list li { padding: 6px 0; border-bottom: 1px solid #f9fafb; display: flex; justify-content: space-between; }
          .works-list .work-name, .spare-parts-list .sp-name { font-weight: 500; }
          .works-list .work-freq, .spare-parts-list .sp-qty { color: #6b7280; }
          .history-list li { padding: 5px 0; border-bottom: 1px solid #f9fafb; display: flex; gap: 12px; }
          .history-list .h-date { color: #6b7280; min-width: 80px; }
          .history-list .h-task { flex: 1; }
          .history-list .h-master { color: #6b7280; }
          .passport-footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
          .no-data { color: #9ca3af; font-style: italic; font-size: 12px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="passport">
          ${content.innerHTML}
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  /** Генерирует и скачивает паспорт в формате PDF */
  const handleDownloadPDF = async () => {
    const element = passportRef.current;
    if (!element) return;

    setGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = -(pdfHeight - 20) + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      pdf.save(`passport-${equipment.inventoryNumber || equipment.name}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="passport-wrapper">
      <div className="passport-actions no-print">
        <button onClick={handlePrint} className="btn btn-secondary">
          🖨 Печать
        </button>
        <button onClick={handleDownloadPDF} className="btn btn-primary" disabled={generating}>
          {generating ? 'Генерация...' : '📥 Скачать PDF'}
        </button>
      </div>

      <div className="passport-container" ref={passportRef}>
        <div className="passport-header">
          <h1>Паспорт оборудования</h1>
          <div className="subtitle">InventorySmart — Система учёта оборудования</div>
          {equipment.inventoryNumber && (
            <div className="inv-num">Инв. номер: {equipment.inventoryNumber}</div>
          )}
        </div>

        <div className="passport-body">
          <div className="passport-photo">
            {equipment.photo ? (
              <img src={`/uploads/${equipment.photo}`} alt={equipment.name} />
            ) : (
              <div className="no-photo">Нет фото</div>
            )}
            {qrData && (
              <div className="passport-qr">
                <img src={qrData.qrImage} alt="QR" />
              </div>
            )}
          </div>

          <div className="passport-info">
            <table className="info-table">
              <tbody>
                <tr><td>Наименование</td><td><strong>{equipment.name}</strong></td></tr>
                <tr><td>Инвентарный номер</td><td>{equipment.inventoryNumber || '—'}</td></tr>
                <tr><td>Состояние</td><td>{STATUS_MAP[equipment.status] || equipment.status}</td></tr>
                <tr><td>Категория</td><td>{equipment.category || '—'}</td></tr>
                <tr>
                  <td>Помещение</td>
                  <td>{room ? `${room.name}${room.building ? ` (${room.building})` : ''}` : '—'}</td>
                </tr>
                {equipment.description && (
                  <tr><td>Описание</td><td>{equipment.description}</td></tr>
                )}
                <tr><td>Дата создания</td><td>{formatDate(equipment.createdAt)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {assignedWorks && assignedWorks.length > 0 && (
          <div className="passport-section">
            <h3>Плановые работы</h3>
            <ul className="works-list">
              {assignedWorks.map(w => (
                <li key={w.id}>
                  <span className="work-name">{w.name}</span>
                  <span className="work-freq">{getFrequencyLabel(w.frequencyDays)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {incidents && incidents.length > 0 && (
          <div className="passport-section">
            <h3>Инциденты</h3>
            <ul className="history-list">
              {incidents.slice(0, 20).map(inc => (
                <li key={inc.id}>
                  <span className="h-date">{formatDate(inc.createdAt)}</span>
                  <span className="h-task">{inc.description || 'Инцидент'}</span>
                  <span className="h-master">{inc.employeeName || inc.adminNotes || ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {workOrders && workOrders.length > 0 && (
          <div className="passport-section">
            <h3>История ремонтов</h3>
            <ul className="history-list">
              {workOrders.slice(0, 20).map(wo => (
                <li key={wo.id}>
                  <span className="h-date">{formatDate(wo.completedAt || wo.createdAt)}</span>
                  <span className="h-task">{wo.taskName}</span>
                  <span className="h-master">{wo.masterName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="passport-footer">
          <span>Паспорт сформирован: {new Date().toLocaleDateString('ru-RU')}</span>
          <span>InventorySmart</span>
        </div>
      </div>
    </div>
  );
}

export default EquipmentPassport;
