import { HelpCircle, BookOpen, CheckCircle, AlertCircle, Info } from 'lucide-react';

function HelpPage() {
  return (
    <div className="directory-page">
      <div className="header">
        <h1><HelpCircle size={24} />Справка</h1>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Section 1: Overview */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} />Общее описание
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 12 }}>
            <strong>InventorySmart</strong> — система управления оборудованием, плановых работ и учета запасных частей.
            Позволяет вести журнал технического обслуживания, контролировать сроки работ, отслеживать поломки и анализировать эффективность.
          </p>
        </div>

        {/* Section 2: Directories */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} />Справочники
          </h3>
          <div style={{ color: 'var(--gray-700)', lineHeight: 1.8 }}>
            <p><strong>Оборудование</strong> — добавляйте, редактируйте и удаляйте единицы оборудования. Указывайте помещение, инвентарный номер, статус и фото. Доступны два режима просмотра: карточки и таблица.</p>
            <p><strong>Сотрудники</strong> — управление персоналом, привязка к оборудованию и работам.</p>
            <p><strong>Работы</strong> — справочник плановых работ с периодичностью и привязкой к оборудованию.</p>
            <p><strong>Помещения</strong> — создание и управление производственными помещениями.</p>
            <p><strong>ЗИП</strong> — учет запасных частей с привязкой к оборудованию и работам.</p>
          </div>
        </div>

        {/* Section 3: Work Journal */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={18} />Журнал работ
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6 }}>
            В журнале отображаются запланированные и выполненные работы. Можно отметить выполнение работы, списать использованные ЗИП и удалить запись.
            При включении настройки «Разрешить осмотры без QR-кода» можно добавлять записи вручную.
          </p>
        </div>

        {/* Section 4: QR Scanner */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />QR-сканер
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6 }}>
            Отсканируйте QR-код на оборудовании для быстрого перехода к карточке работ. Поддерживается ручной ввод QR-кода или инвентарного номера.
            Для работы сканера необходим HTTPS (камера не доступна по HTTP).
          </p>
        </div>

        {/* Section 5: Schedule */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} />План-график
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6 }}>
            Визуальное представление запланированных работ в формате Gantt-диаграммы. Можно фильтровать по оборудованию, помещению, работе, статусу и периоду.
            Отображаются запланированные, выполненные и просроченные работы.
          </p>
        </div>

        {/* Section 6: Incidents */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />Инциденты
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6 }}>
            Учет поломок и неисправностей. Создавайте инциденты через QR-сканер или вручную (если включена соответствующая настройка).
            Администратор может менять статус (Новый → В работе → Решен) и добавлять заметки.
          </p>
        </div>

        {/* Section 7: Notifications */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} />Уведомления
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6 }}>
            Система автоматически создает уведомления о приближающихся (≤7 дней) и просроченных работах.
            Уведомления видны администраторам и ответственным сотрудникам.
          </p>
        </div>

        {/* Section 8: Analytics */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={18} />Аналитика
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6 }}>
            Статистика выполнения работ по сотрудникам, эффективность персонала и отчет по остаткам ЗИП.
          </p>
        </div>

        {/* Section 9: Settings */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} />Настройки
          </h3>
          <div style={{ color: 'var(--gray-700)', lineHeight: 1.8 }}>
            <p><strong>Профиль компании</strong> — название, логотип, лицензия, часовой пояс.</p>
            <p><strong>Пользователи</strong> — создание и управление учетными записями.</p>
            <p><strong>Роли</strong> — настройка прав доступа (Администратор, Руководитель, Механик и др.).</p>
            <p><strong>Осмотры без QR</strong> — при включении позволяет создавать инциденты и записи в журнале вручную.</p>
          </div>
        </div>

        {/* Section 10: Tips */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} />Полезные советы
          </h3>
          <ul style={{ color: 'var(--gray-700)', lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Используйте поиск для быстрого нахождения оборудования по наименованию или инвентарному номеру.</li>
            <li>Регулярно проверяйте уведомления, чтобы не пропустить сроки плановых работ.</li>
            <li>Загружайте фото оборудования для удобной визуальной идентификации.</li>
            <li>Настройте роли пользователей для ограничения доступа к разделам системы.</li>
            <li>Для мобильного доступа откройте систему в браузере на смартфоне — интерфейс адаптирован под мобильные устройства.</li>
            <li>При возникновении проблем с QR-сканером убедитесь, что сайт открыт по HTTPS (иначе браузер блокирует доступ к камере).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default HelpPage;
