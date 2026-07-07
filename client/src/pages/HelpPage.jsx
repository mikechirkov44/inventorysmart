import { HelpCircle, BookOpen, CheckCircle, AlertCircle, Info, Search, Plus, QrCode, Calendar, Settings, Users, FileText, Bell, BarChart3, ClipboardList, Upload, ArrowRight, Camera, Code, Key, Wrench, AlertTriangle } from 'lucide-react';

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

      <div>
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
            <span style={{ padding: '4px 12px', background: '#fef3c7', color: '#b45309', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>RCA</span>
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

          <Step number={6} icon={FileText} title="Причины возникновения и просрочки">
            <strong>«Причины возникновения»</strong> — справочник причин поломок и инцидентов. Выбирается при создании инцидента или наряда-заказа.<br/>
            <strong>«Причины просрочки»</strong> — справочник причин задержки выполнения работ. Выбирается руководителем при принятии работы, выполненной с нарушением срока.
          </Step>

          <Step number={7} icon={FileText} title="Приоритет работ">
            В справочнике работ каждому виду работ можно назначить приоритет: <strong>A</strong> (высокий), <strong>B</strong> (средний), <strong>C</strong> (низкий). 
            Приоритет отображается в журнале работ и наряд-заказах цветными метками.
          </Step>

          <Step number={8} icon={FileText} title="Действия со справочниками">
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
            Журнал отображает все запланированные и выполненные работы по оборудованию. Каждая запись содержит информацию о сроке устранения, причине и статусе принятия руководителем.
          </p>

          <Step number={1} icon={CheckCircle} title="Отметка выполнения работы">
            Найдите работу в статусе <strong>«В ожидании»</strong> в таблице и нажмите кнопку <strong>«Выполнено»</strong> в меню действий (⋮). 
            Система предложит списать использованные ЗИП (если они привязаны к работе).
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> При создании записи можно указать <strong>срок устранения</strong> и <strong>причину возникновения</strong> из справочника.
          </Step>

          <Step number={2} icon={Plus} title="Ручное добавление записи">
            Если в настройках компании включена опция <strong>«Разрешить осмотры без QR-кода»</strong>, 
            появится кнопка <strong>«+ Добавить запись»</strong>. Выберите оборудование, работу, причину, статус и дату.
          </Step>

          <Step number={3} icon={CheckCircle} title="Подтверждение руководителем">
            После выполнения работы она требует <strong>подтверждения руководителем</strong>:
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li>Руководителю (с правом «Журнал — Полный доступ») приходит <strong>уведомление</strong> «Требуется подтверждение работы»</li>
              <li>В журнале выполненная, но не принятая работа помечена статусом <strong>«Ожидает»</strong></li>
              <li>Руководитель нажимает <strong>«Принять»</strong> в меню действий</li>
              <li>Если работа выполнена <strong>в срок</strong> — достаточно подтвердить простым диалогом</li>
              <li>Если работа выполнена <strong>с просрочкой</strong> — руководитель обязан выбрать <strong>причину просрочки</strong> из справочника</li>
            </ul>
          </Step>

          <Step number={4} icon={FileText} title="Фильтрация и управление">
            Журнал работ отображается в виде таблицы: <strong>Дата</strong>, <strong>Оборудование</strong>, <strong>Работа</strong>, <strong>Приоритет</strong>, <strong>Статус</strong>, <strong>Причина</strong>, <strong>Срок</strong>, <strong>Принято</strong>.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Используйте кнопки фильтров вверху: <strong>Все</strong>, <strong>В ожидании</strong>, <strong>Выполнены</strong>.
            <br/><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }}/> Работы, выполненные с просрочкой, дополнительно помечены красным бейджем <strong>«Просрочено»</strong>.
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

        {/* Section 6: Incidents, work orders and RCA */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} />Инциденты, наряды и RCA
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 12 }}>
            Режим работы с инцидентами настраивается в <strong>Настройки → Компания → «Использовать RCA»</strong>.
            При выключенном RCA доступен упрощённый сценарий без расследования.
            <br /><br />
            <strong>Инцидент</strong> — фиксация поломки или неисправности. <strong>Наряд</strong> — задача на ремонт в журнале работ.
            <strong> RCA</strong> (Root Cause Analysis) — расследование коренной причины, чтобы предотвратить повторение.
          </p>

          <div style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 20,
            fontSize: 14,
            color: 'var(--gray-700)',
            lineHeight: 1.7,
          }}>
            <strong style={{ color: 'var(--gray-900)' }}>Цепочка в системе:</strong><br />
            Поломка → <strong>Инцидент</strong> → (при необходимости) <strong>Наряд на ремонт</strong> → (для серьёзных случаев) <strong>RCA-расследование</strong> → <strong>Закрытие</strong> с указанием причины
          </div>

          <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 12 }}>Статусы инцидента</h4>
          <ul style={{ margin: '0 0 20px', paddingLeft: 20, color: 'var(--gray-600)', lineHeight: 1.8, fontSize: 14 }}>
            <li><strong>Новый</strong> — поломка зарегистрирована, ожидает реакции</li>
            <li><strong>В работе</strong> — инцидент принят, ведётся устранение</li>
            <li><strong>Расследование</strong> — выполняется RCA (только при включённом флаге «Требует RCA»)</li>
            <li><strong>RCA завершён</strong> — коренная причина и мероприятия зафиксированы</li>
            <li><strong>Решён</strong> — инцидент закрыт (обязательно указана причина возникновения)</li>
          </ul>

          <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 12 }}>Сценарий 1 — простая поломка (без RCA)</h4>

          <Step number={1} icon={QrCode} title="Фиксация поломки">
            <strong>Через QR:</strong> отсканируйте код → «Сообщить о поломке» → укажите типовую неисправность, причину (если известна), описание и фото.
            <br /><strong>Вручную:</strong> раздел «Инциденты» → «+ Добавить инцидент» (если в настройках включены осмотры без QR).
            <br /><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} />
            Оборудование автоматически переходит в статус «Требует ремонта». Администраторам приходит уведомление.
          </Step>

          <Step number={2} icon={CheckCircle} title="Принятие в работу">
            Откройте инцидент → вкладка <strong>«Общее»</strong> → уточните типовую неисправность и причину → нажмите <strong>«В работу»</strong>.
          </Step>

          <Step number={3} icon={Wrench} title="Создание наряда на ремонт">
            В карточке инцидента нажмите <strong>«Создать наряд»</strong>. В журнале работ появится связанная запись с тем же оборудованием.
            <br /><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} />
            Выполните ремонт: отметьте наряд выполненным в журнале или через QR-сканер.
          </Step>

          <Step number={4} icon={CheckCircle} title="Закрытие инцидента">
            Укажите <strong>причину возникновения</strong> из справочника (если известна сразу) или заполните <strong>коренную причину</strong> на вкладке RCA — она автоматически станет причиной возникновения при сохранении и закрытии.
            <br /><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} />
            Нажмите <strong>«Решено»</strong>. Если других открытых инцидентов по этому оборудованию нет, статус оборудования вернётся в «Работает».
          </Step>

          <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)', margin: '24px 0 12px' }}>Сценарий 2 — серьёзная поломка (с RCA)</h4>
          <p style={{ color: 'var(--gray-600)', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
            Используйте RCA для повторяющихся, критичных или дорогостоящих отказов — когда важно не только устранить симптом, но и найти коренную причину.
          </p>

          <Step number={1} icon={AlertCircle} title="Отметить необходимость RCA">
            В карточке инцидента (вкладка «Общее») включите <strong>«Требует RCA-расследования»</strong> и сохраните.
          </Step>

          <Step number={2} icon={Search} title="Начать расследование">
            Нажмите <strong>«Начать RCA»</strong> — статус сменится на «Расследование». Перейдите на вкладку <strong>«Расследование (RCA)»</strong>.
          </Step>

          <Step number={3} icon={FileText} title="Заполнить результаты RCA">
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li>Назначьте <strong>ответственного за расследование</strong></li>
              <li>Опишите <strong>коренную причину</strong> (не симптом, а источник проблемы)</li>
              <li>Заполните цепочку <strong>«5 почему»</strong> — последовательные вопросы «почему это произошло?»</li>
              <li>Добавьте <strong>корректирующие мероприятия</strong>: что сделать, кто ответственный, срок</li>
            </ul>
          </Step>

          <Step number={4} icon={Wrench} title="Наряд как корректирующее действие">
            Альтернатива текстовому мероприятию — кнопка <strong>«Создать наряд»</strong> на вкладке «Общее».
            Наряд связывается с инцидентом и учитывается при завершении RCA.
          </Step>

          <Step number={5} icon={CheckCircle} title="Завершение RCA и закрытие">
            Заполните <strong>коренную причину</strong> на вкладке RCA — она автоматически фиксируется как <strong>причина возникновения</strong> (при отсутствии в справочнике будет создана новая запись).
            Нажмите <strong>«RCA завершён»</strong>, затем <strong>«Решено»</strong>. Система проверит:
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li>Заполнена <strong>коренная причина</strong> (становится причиной возникновения)</li>
              <li>Есть хотя бы одно <strong>корректирующее мероприятие</strong> или связанный <strong>наряд</strong></li>
            </ul>
          </Step>

          <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 8, padding: '12px 16px', marginTop: 8 }}>
            <strong style={{ color: 'var(--primary)', fontSize: 14 }}>Как связаны причины:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'var(--gray-700)', fontSize: 14, lineHeight: 1.7 }}>
              <li><strong>Типовая неисправность</strong> — что сломалось (симптом): «Перегрев насоса»</li>
              <li><strong>Коренная причина (RCA)</strong> — результат расследования; автоматически становится <strong>причиной возникновения</strong> в инциденте</li>
              <li><strong>Причина возникновения</strong> — запись в справочнике для аналитики; можно выбрать сразу или получить из RCA</li>
            </ul>
          </div>
        </div>

        {/* Section 7: Incidents list (short) */}
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />Раздел «Инциденты»
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            Список всех зарегистрированных поломок с фильтрами по статусу и флагу RCA.
          </p>

          <Step number={1} icon={Search} title="Фильтрация">
            Используйте фильтры: <strong>статус</strong> (новые, в работе, расследование, решённые) и <strong>«Требует RCA»</strong>.
          </Step>

          <Step number={2} icon={FileText} title="Карточка инцидента">
            Нажмите <strong>«Подробнее»</strong> в меню действий (⋮). В карточке две вкладки:
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li><strong>Общее</strong> — данные поломки, причина, заметки, создание наряда, смена статуса</li>
              <li><strong>Расследование (RCA)</strong> — 5 почему, коренная причина, корректирующие мероприятия</li>
            </ul>
          </Step>

          <Step number={3} icon={CheckCircle} title="Обработка">
            Администратор может сохранять изменения, переводить по статусам, добавлять заметки и удалять устаревшие инциденты.
          </Step>
        </div>

        {/* Section 8: Notifications */}
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
              <li><strong>Подтверждение</strong> — работа выполнена, ожидает подтверждения руководителем</li>
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

          <Step number={4} icon={AlertTriangle} title="Аналитика по инцидентам и RCA">
            Вкладка <strong>«Аналитика → Инциденты»</strong> за выбранный период показывает:
            <ul style={{ margin: '8px 0', paddingLeft: 20, color: 'var(--gray-600)' }}>
              <li>Количество инцидентов по статусам и флагу RCA</li>
              <li><strong>MTTR</strong> — среднее время от регистрации до закрытия</li>
              <li><strong>Повторяемость</strong> — доля повторных поломок (то же оборудование + неисправность за 90 дней)</li>
              <li>Топ <strong>причин возникновения</strong> и <strong>типовых неисправностей</strong></li>
              <li>Оборудование с наибольшим числом инцидентов</li>
              <li>Просроченные корректирующие мероприятия RCA</li>
            </ul>
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
              <li><strong>Администратор</strong> — полный доступ ко всем разделам</li>
              <li><strong>Руководитель</strong> — полный доступ, подтверждение работ, аналитика</li>
              <li><strong>Механик</strong> — ограниченный доступ (журнал, инциденты, инструкции)</li>
            </ul>
            <br/>Доступные ресурсы прав: Оборудование, Сотрудники, Работы, Помещения, ЗИП, Журнал работ, QR-сканер, План-график, Инциденты, Аналитика, Импорт, Инструкции, Типовые неисправности, Причины возникновения, Причины просрочки, Настройки.
          </Step>

          <Step number={3} icon={CheckCircle} title="Осмотры без QR">
            Включите переключатель <strong>«Разрешить осмотры и запросы без QR-кода»</strong>, чтобы сотрудники могли создавать инциденты и записи в журнале вручную.
          </Step>

          <Step number={4} icon={AlertTriangle} title="Использовать RCA">
            Переключатель <strong>«Использовать RCA»</strong> включает полный режим расследования инцидентов: вкладка RCA, 5 почему, корректирующие мероприятия.
            <br /><ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} />
            При выключении инциденты работают в <strong>упрощённом режиме</strong>: фиксация → ремонт → указание причины при закрытии.
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

        {/* Section 11: API Documentation */}
        <div className="settings-card" id="api" style={{ marginBottom: 20 }}>
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Code size={18} />Интеграция через API
          </h3>
          <p style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginBottom: 16 }}>
            InventorySmart предоставляет открытый API для интеграции с внешними системами. 
            API позволяет получать данные об оборудовании в формате JSON.
          </p>
          
          <Step number={1} icon={Settings} title="Включите API доступ">
            Перейдите в «Настройки» → «Интеграции» и включите опцию «Включить API доступ». 
            Сгенерируйте API ключ — он понадобится для всех запросов.
          </Step>
          
          <Step number={2} icon={Key} title="Используйте API ключ">
            Передайте API ключ в заголовке <code>X-API-Key</code> при каждом запросе:
            <div style={{ background: 'var(--gray-100)', padding: 12, borderRadius: 6, marginTop: 8, fontSize: 13, fontFamily: 'monospace' }}>
              GET /api/public/equipment<br />
              Header: X-API-Key: ваш-api-ключ
            </div>
          </Step>
          
          <Step number={3} icon={CheckCircle} title="Доступные эндпоинты">
            <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 2 }}>
              <li><code>GET /api/public/equipment</code> — список всего оборудования</li>
              <li><code>GET /api/public/equipment/:id</code> — детали оборудования по ID</li>
              <li><code>GET /api/public/stats</code> — статистика по оборудованию</li>
            </ul>
          </Step>
          
          <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', padding: 12, borderRadius: 6, marginTop: 16 }}>
            <strong style={{ color: 'var(--warning)' }}>⚠ Безопасность:</strong>
            <span style={{ color: 'var(--gray-700)', fontSize: 14 }}> API ключ предоставляет доступ к данным вашей компании. Храните его в безопасности и не передавайте третьим лицам.</span>
          </div>
        </div>

        {/* Section 12: Tips */}
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
