import { HelpCircle, BookOpen, CheckCircle, AlertCircle, Info, Search, Plus, QrCode, Calendar, Settings, Users, FileText, Bell, BarChart3, ClipboardList, Upload, ArrowRight, Camera } from 'lucide-react';

function HelpPage() {
  const Step = ({ number, icon: Icon, title, children }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
      <div style={{ 
        width: 32, 
        height: 32, 
        borderRadius: '50%', 
        background: 'var(--primary-light)', 
        color: 'var(--primary)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 14,
        flexShrink: 0
      }}>
        {Icon ? <Icon size={16} /> : number}
      </div>
      <div style={{ flex: 1 }}>
        <strong style={{ color: 'var(--gray-900)', fontSize: 15 }}>{title}</strong>
        <div style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginTop: 4 }}>{children}</div>
      </div>
    </div>
  );

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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>Справочники</span>
            <span style={{ padding: '4px 12px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>Журнал работ</span>
            <span style={{ padding: '4px 12px', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>QR-сканер</span>
            <span style={{ padding: '4px 12px', background: 'var(--gray-100)', color: 'var(--gray-700)', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>Аналитика</span>
          </div>
        </div>

        {/* Section 2: Directories */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} />Справочники
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Справочники содержат основные данные системы. Рекомендуется начинать работу с заполнения справочников.
          </p>

          <Step number={1} icon={Search} title="Просмотр оборудования">
            Перейдите в раздел <strong>«Справочники → Оборудование»</strong>. Доступны два режима: <strong>карточки</strong> (визуальный) и <strong>таблица</strong> (с фильтрами и сортировкой).
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Используйте поиск по наименованию или инвентарному номеру.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> На карточке оборудования статус и меню действий (⋮) расположены на одной строке.
          </Step>

          <Step number={2} icon={Plus} title="Добавление оборудования">
            Нажмите кнопку <strong>«+ Добавить»</strong> в правом верхнем углу. Заполните форму:
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li>Название и инвентарный номер</li>
              <li>Выбор помещения из справочника</li>
              <li>Статус: Работает / В ремонте / Требует ремонта</li>
              <li>Загрузка фото (до 5 МБ)</li>
              <li>Привязка плановых работ</li>
            </ul>
          </Step>

          <Step number={3} icon={Users} title="Справочник сотрудников">
            В разделе <strong>«Справочники → Сотрудники»</strong> добавляйте персонал с указанием ФИО, должности и контактов.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Сотрудники привязываются к оборудованию как ответственные лица.
          </Step>

          <Step number={4} icon={FileText} title="Помещения и ЗИП">
            <strong>Помещения</strong> — создавайте производственные зоны и цеха.<br/>
            <strong>ЗИП</strong> — учитывайте запасные части с указанием остатков, единиц измерения и привязки к работам.
          </Step>

          <Step number={5} icon={FileText} title="Типовые неисправности">
            В разделе <strong>«Справочники → Типовые неисправности»</strong> создавайте шаблоны поломок для каждого оборудования. 
            При создании инцидента через QR-сканер или вручную можно выбрать типовую неисправность — описание заполнится автоматически.
          </Step>

          <Step number={6} icon={FileText} title="Действия со справочниками">
            Во всех справочниках действия (<strong>Дублировать</strong>, <strong>Изменить</strong>, <strong>Удалить</strong>) доступны через выпадающее меню (⋮) в каждой строке таблицы.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> <strong>Дублировать</strong> — создает копию записи с префиксом «(копия)», удобно для быстрого добавления похожих элементов.
          </Step>
        </div>

        {/* Section 3: Work Journal */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} />Журнал работ
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Журнал отображает все запланированные и выполненные работы по оборудованию.
          </p>

          <Step number={1} icon={CheckCircle} title="Отметка выполнения работы">
            Найдите работу в статусе <strong>«В ожидании»</strong> в таблице и нажмите кнопку <strong>«Выполнено»</strong> в меню действий (⋮). 
            Система предложит списать использованные ЗИП (если они привязаны к работе).
          </Step>

          <Step number={2} icon={Plus} title="Ручное добавление записи">
            Если в настройках компании включена опция <strong>«Разрешить осмотры без QR-кода»</strong>, 
            появится кнопка <strong>«+ Добавить запись»</strong>. Выберите оборудование, работу, статус и дату.
          </Step>

          <Step number={3} icon={FileText} title="Фильтрация и управление">
            Журнал работ отображается в виде таблицы: <strong>Оборудование</strong>, <strong>Работа</strong>, <strong>Статус</strong>, <strong>Дата</strong>, <strong>Мастер</strong>, <strong>ЗИП</strong>.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Используйте кнопки фильтров вверху: <strong>Все</strong>, <strong>В ожидании</strong>, <strong>Выполнены</strong>.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Действия доступны через выпадающее меню (⋮) в каждой строке.
          </Step>
        </div>

        {/* Section 4: QR Scanner */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={18} />QR-сканер
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Быстрый доступ к карточке оборудования через сканирование QR-кода.
          </p>

          <Step number={1} icon={Camera} title="Сканирование">
            Перейдите в раздел <strong>«QR-сканер»</strong>. Нажмите <strong>«Начать сканирование»</strong> и наведите камеру на QR-код наклейки на оборудовании.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Система автоматически распознает код и откроет карточку работ.
          </Step>

          <Step number={2} icon={Search} title="Ручной ввод">
            Если сканирование невозможно, введите QR-код или инвентарный номер вручную в поле «Ручной ввод» и нажмите <strong>«Найти»</strong>.
          </Step>

          <Step number={3} icon={CheckCircle} title="Создание инцидента">
            После сканирования можно отметить выполнение работы или создать инцидент (поломку) с фото и описанием.
          </Step>
        </div>

        {/* Section 5: Schedule */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} />План-график
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Визуальное представление запланированных работ в формате диаграммы Ганта.
          </p>

          <Step number={1} icon={Search} title="Фильтрация">
            Используйте фильтры вверху страницы:
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li>Группировка: по оборудованию или по ответственным</li>
              <li>Статус: запланировано, выполнено, просрочено</li>
              <li>Оборудование, помещение, работа</li>
              <li>Период: дата «От» и «До»</li>
            </ul>
          </Step>

          <Step number={2} icon={BarChart3} title="Просмотр диаграммы">
            Работы отображаются цветными полосами: <span style={{ color: 'var(--success)' }}>зеленые</span> — выполнены, <span style={{ color: 'var(--warning)' }}>желтые</span> — скоро, <span style={{ color: 'var(--danger)' }}>красные</span> — просрочены.
          </Step>
        </div>

        {/* Section 6: Incidents */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />Инциденты
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Учет поломок и неисправностей оборудования.
          </p>

          <Step number={1} icon={QrCode} title="Создание через QR-сканер">
            Отсканируйте QR-код оборудования и нажмите <strong>«Сообщить о поломке»</strong>. Опишите проблему и прикрепите фото.
          </Step>

          <Step number={2} icon={Plus} title="Ручное создание">
            В разделе <strong>«Инциденты»</strong> нажмите <strong>«+ Добавить инцидент»</strong> (при включенной настройке «Разрешить осмотры без QR-кода»).
            Выберите оборудование из списка, затем выберите <strong>типовую неисправность</strong> из выпадающего списка (описание заполнится автоматически) или введите описание вручную.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Загрузите фото для наглядности.
          </Step>

          <Step number={3} icon={CheckCircle} title="Обработка инцидента">
            Администратор может:
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li>Принять в работу — статус меняется на «В работе»</li>
              <li>Отметить решение — статус «Решен»</li>
              <li>Добавить административные заметки</li>
              <li>Удалить устаревший инцидент</li>
            </ul>
          </Step>
        </div>

        {/* Section 7: Notifications */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} />Уведомления
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Автоматические напоминания о предстоящих и просроченных работах.
          </p>

          <Step number={1} icon={Bell} title="Типы уведомлений">
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li><strong>Скоро</strong> — работа запланирована в ближайшие 7 дней</li>
              <li><strong>Просрочено</strong> — срок работы уже прошел</li>
              <li><strong>Инцидент</strong> — новая поломка зарегистрирована</li>
            </ul>
          </Step>

          <Step number={2} icon={CheckCircle} title="Просмотр и управление">
            Уведомления видны в разделе <strong>«Уведомления»</strong> в боковом меню. 
            Новые уведомления отмечаются индикатором. Нажмите на строку для просмотра деталей.
          </Step>
        </div>

        {/* Section 8: Analytics */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={18} />Аналитика
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Статистика и отчеты для анализа эффективности работы.
          </p>

          <Step number={1} icon={Users} title="Эффективность сотрудников">
            В разделе <strong>«Аналитика → Сотрудники»</strong> отображается количество выполненных работ по каждому сотруднику за выбранный период.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Используйте фильтр по периоду: неделя, месяц, квартал, год.
          </Step>

          <Step number={2} icon={FileText} title="Остатки ЗИП">
            Вкладка <strong>«Аналитика → ЗИП»</strong> показывает таблицу остатков с цветовой индикацией: <span style={{ color: 'var(--warning)' }}>желтые</span> — ниже нормы, <span style={{ color: 'var(--danger)' }}>красные</span> — критический уровень.
          </Step>

          <Step number={3} icon={BarChart3} title="Отчет по оборудованию">
            Вкладка <strong>«Аналитика → Оборудование»</strong> содержит отчет по всему оборудованию с количеством инцидентов на каждую единицу.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Фильтры: категория, статус, помещение, поиск по наименованию и инв. номеру.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Цветовая индикация инцидентов: <span style={{ color: 'var(--warning)' }}>1–2</span> — внимание, <span style={{ color: 'var(--danger)' }}>3+</span> — критично.
          </Step>
        </div>

        {/* Section 9: Settings */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} />Настройки
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Управление профилем компании, пользователями и правами доступа.
          </p>

          <Step number={1} icon={Settings} title="Профиль компании">
            Вкладка <strong>«Компания»</strong>: укажите название предприятия, загрузите логотип (200x200px, до 5 МБ), выберите часовой пояс.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Активируйте лицензию ключом PRO.
          </Step>

          <Step number={2} icon={Users} title="Пользователи и роли">
            <strong>Пользователи</strong> — создавайте учетные записи с логином и паролем (минимум 8 символов, буквы и цифры).<br/>
            <strong>Роли</strong> — назначайте права доступа:
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li><strong>Администратор</strong> — полный доступ</li>
              <li><strong>Руководитель</strong> — доступ без QR-сканера</li>
              <li><strong>Механик</strong> — ограниченный доступ</li>
            </ul>
          </Step>

          <Step number={3} icon={CheckCircle} title="Осмотры без QR">
            Включите переключатель <strong>«Разрешить осмотры и запросы без QR-кода»</strong>, чтобы сотрудники могли создавать инциденты и записи в журнале вручную.
          </Step>
        </div>

        {/* Section 10: Import */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={18} />Импорт из Excel
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Массовая загрузка оборудования из файла Excel.
          </p>

          <Step number={1} icon={Upload} title="Скачайте шаблон">
            В разделе <strong>«Импорт»</strong> нажмите <strong>«Скачать шаблон»</strong>. Откроется файл Excel с нужными колонками.
          </Step>

          <Step number={2} icon={FileText} title="Заполните данные">
            Заполните строки в шаблоне: название, инвентарный номер, помещение, статус, QR-код и др.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Помещения и работы должны быть предварительно созданы в справочниках.
          </Step>

          <Step number={3} icon={CheckCircle} title="Загрузите файл">
            Нажмите <strong>«Выбрать файл»</strong>, выберите заполненный Excel и нажмите <strong>«Импортировать»</strong>. 
            Система покажет результат: сколько записей успешно добавлено.
          </Step>
        </div>

        {/* Section 11: Tips */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} />Полезные советы
          </h3>
          <div style={{ color: 'var(--gray-700)', lineHeight: 1.8 }}>
            <Step number={1} icon={Search} title="Быстрый поиск">
              В любой таблице используйте строку поиска для фильтрации по наименованию, номеру или названию.
            </Step>
            <Step number={2} icon={Bell} title="Проверяйте уведомления">
              Регулярно просматривайте раздел «Уведомления», чтобы не пропустить сроки плановых работ.
            </Step>
            <Step number={3} icon={Camera} title="Загружайте фото">
              Добавляйте фото к оборудованию и инцидентам — это ускорит визуальную идентификацию на производстве.
            </Step>
            <Step number={4} icon={Settings} title="Настройте роли">
              Ограничьте доступ механиков только нужными разделами через настройки ролей.
            </Step>
            <Step number={5} icon={CheckCircle} title="Используйте мобильную версию">
              Откройте систему в браузере на смартфоне — интерфейс автоматически адаптируется под экран телефона.
            </Step>
            <Step number={6} icon={Calendar} title="Планируйте заранее">
              Создавайте работы в справочнике с периодичностью — система автоматически будет генерировать уведомления.
            </Step>
            <Step number={7} icon={FileText} title="Меню действий (⋮)">
              Во всех таблицах и карточках действия скрыты за кнопкой с тремя точками (⋮). Нажмите её, чтобы открыть выпадающее меню с доступными операциями: дублировать, изменить, удалить.
            </Step>
            <Step number={8} icon={Plus} title="Дублирование записей">
              В справочниках (Работы, Помещения, Сотрудники, ЗИП, Типовые неисправности, Пользователи, Должности) доступна функция <strong>«Дублировать»</strong>. 
              Она создает копию записи с суффиксом «(копия)» — удобно для быстрого создания похожих элементов.
            </Step>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-400)', fontSize: 13 }}>
          InventorySmart v1.0 — система управления оборудованием
        </div>
      </div>
    </div>
  );
}

export default HelpPage;
