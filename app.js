/* Кликабельный прототип «Сообщения РФМ».
   Все данные вымышленные и живут в localStorage этого браузера. */

const STORAGE_KEY = 'finmon-prototype-v3';

/* ---------- Справочники ---------- */

const MSG_STATUS = {
  ready: { label: 'Готово к отправке', cls: 'ready' },
  sent:  { label: 'Отправлено',        cls: 'sent'  },
};

const MSG_TYPES = {
  FMO1: 'Операции, подлежащие обязательному контролю',
  FMO2: 'Подозрительные операции',
};

const OP_KINDS = ['Первичное отправление', 'Корректировка', 'Удаление', 'Исправление'];

const OP_CLASSES = {
  suspicious: 'Операции сомнительного характера',
  mandatory:  'Операции обязательного контроля',
};

const USER_STATUS = {
  online:   { label: 'Онлайн',   hint: 'Принимаю задачи',             color: '#00b92d' },
  offline:  { label: 'Оффлайн',  hint: 'Не на рабочем месте',         color: '#9b59d0' },
  break:    { label: 'Перерыв',  hint: 'Вернусь в течение 15 минут',  color: '#ff8a00' },
  training: { label: 'Обучение', hint: 'На обучении, задачи не беру', color: '#428bf9' },
};

const CLIENTS = [
  ['ООО «Наггетсы с соусом»', '7701234567'], ['ООО «Фрешролл»', '7812345670'],
  ['ООО «Бигхит»', '2901234568'], ['ИП Картошкин Игорь Николаевич', '502401234567'],
  ['ООО «Макфлури»', '6658123456'], ['ИП Бигмакова Алина Сергеевна', '773301234561'],
  ['ООО «Добрая»', '5406123457'], ['АО «Твистер»', '7707654321'],
  ['ООО «Чизбургер»', '1655123458'], ['ИП Наггетсов Пётр Ильич', '631201234569'],
  ['ООО «Бигтейсти»', '7725123459'], ['ООО «Макфлури с шоколадным топингом»', '7736123450'],
  ['ООО «Картофель фри»', '5029123451'], ['ООО «Гамбургер без лука»', '6164123452'],
  ['ООО «Королевский чизбургер»', '3664123453'],
];

/* ---------- Начальные данные ---------- */

function makeSeed() {
  let s = 42;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const pad = (n, len) => String(n).padStart(len, '0');
  const shiftDate = (date, days) => {
    const [d, m, y] = date.split('.').map(Number);
    return new Date(y, m - 1, d - days).toLocaleDateString('ru-RU');
  };

  // [номер, статус, дата, кол-во операций]
  const plan = [
    ['00001105', 'ready', '22.02.2025', 18],
    ['00001108', 'ready', '22.02.2025', 14],
    ['00001103', 'sent',  '22.02.2025', 16],
    ['00001102', 'ready', '22.02.2025', 12],
    ['00001101', 'sent',  '21.02.2025', 15],
    ['00001100', 'sent',  '21.02.2025', 13],
    ['00001099', 'sent',  '20.02.2025', 17],
    ['00001098', 'sent',  '19.02.2025', 14],
    ['00001097', 'sent',  '18.02.2025', 16],
    ['00001096', 'sent',  '17.02.2025', 12],
    ['00001095', 'sent',  '14.02.2025', 15],
    ['00001094', 'sent',  '13.02.2025', 13],
    ['00001093', 'sent',  '12.02.2025', 14],
    ['00001092', 'sent',  '11.02.2025', 11],
    ['00001091', 'sent',  '10.02.2025', 16],
  ]; // 216 операций в сообщениях + 24 свободных = 240

  const ops = [];
  let n = 400;
  const makeOp = (date, messageId) => {
    const [client, inn] = pick(CLIENTS);
    const r = rnd();
    // суммы разного порядка: от сотен тысяч до десятков миллионов
    const amount = Math.round(r < .15 ? 20e6 + rnd() * 80e6 : r < .6 ? 1e6 + rnd() * 4e6 : 600e3 + rnd() * 900e3);
    const contractDate = shiftDate(date, 30 + Math.floor(rnd() * 300));
    n++;
    return {
      id: 'op' + n,
      record: pad(n, 8),
      client, inn,
      contract: 'ААА ' + pad(7000000 + Math.floor(rnd() * 999999), 7),
      contractDate,
      kind: rnd() < .75 ? OP_KINDS[0] : pick(OP_KINDS.slice(1)),
      cls: rnd() < .7 ? 'suspicious' : 'mandatory',
      appDate: date,
      overdueDays: Math.floor(rnd() * 4),
      detectedDate: date,
      amount,
      isNew: false,
      prevMessage: null,
      messageId,
    };
  };

  const messages = plan.map(([number, status, date, count]) => {
    for (let i = 0; i < count; i++) ops.push(makeOp(date, number));
    return { id: number, number, date, type: 'FMO1', status, sentAt: status === 'sent' ? date : null };
  });

  // В сообщении 00001108 у одной операции не указан ИНН — это и есть «предупреждение»
  ops.find((o) => o.messageId === '00001108').inn = '';

  // 24 операции, готовые к отправке. Новые — сверху, у части есть прошлое сообщение
  const free = [];
  for (let i = 0; i < 24; i++) {
    const o = makeOp('09.01.2025', null);
    if (i < 2) o.isNew = true;
    if (i % 3 !== 1) o.prevMessage = pick(['00001103', '00001101', '00001099']);
    // первичные операции, которые ещё никуда не отправлялись, пока без номера записи
    if (!o.prevMessage && o.kind === OP_KINDS[0]) o.record = null;
    free.push(o);
  }
  ops.push(...free.reverse());

  return { messages, ops, userStatus: 'offline' };
}

/* ---------- Состояние ---------- */

let state = load();
const ui = {
  msgFilter: 'all', msgQuery: '',
  opsQuery: '', opsClass: 'suspicious', opsKind: '', opsFrom: '', opsTo: '', opsLimit: 20,
  periodOpen: false,
  pickQuery: '', pickKind: '',
  selected: new Set(),
  draftNumber: null,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* хранилище недоступно — работаем в памяти */ }
  return makeSeed();
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

/* ---------- Выборки ---------- */

const opsOf = (id) => state.ops.filter((o) => o.messageId === id);
const freeOps = () => state.ops.filter((o) => !o.messageId);
const msgById = (id) => state.messages.find((m) => m.id === id);
const hasIssue = (m) => m.status === 'ready' && opsOf(m.id).some((o) => !o.inn);
const sumOf = (ops) => ops.reduce((s, o) => s + o.amount, 0);

// Следующий свободный номер сообщения (номера удалённых сообщений освобождаются)
function nextNumber() {
  const taken = new Set(state.messages.map((m) => m.number));
  let n = 1106;
  while (taken.has(String(n).padStart(8, '0'))) n++;
  return String(n).padStart(8, '0');
}

/* ---------- Утилиты ---------- */

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
const nOps = (n) => `${n} ${plural(n, ['операция', 'операции', 'операций'])}`;
const nMsgs = (n) => `${n} ${plural(n, ['сообщение', 'сообщения', 'сообщений'])}`;
const num = (n) => n.toLocaleString('ru-RU');
const money = (n) => num(n) + ' ₽';
const today = () => new Date().toLocaleDateString('ru-RU');

const ICON = {
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M9 6V4h6v2M6.5 6l1 14h9l1-14"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 1.5 21h21z" fill="#ff8a00"/><path d="M12 9v5.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.3" fill="#fff"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

const statusPill = (m) => `<span class="status status--${MSG_STATUS[m.status].cls}">${MSG_STATUS[m.status].label}</span>`;
const warnMark = (m) => hasIssue(m) ? `<span class="warn" title="Требует внимания" aria-label="Требует внимания">${ICON.warn}</span>` : '';

/* ---------- Таблица сообщений ---------- */

function messagesTable(list, { empty = 'Сообщений нет' } = {}) {
  if (!list.length) return `<div class="empty">${empty}</div>`;
  return `
    <div class="table-wrap">
      <table class="table table--click">
        <thead><tr><th>Номер</th><th>Дата</th><th>Тип</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>
          ${list.map((m) => `
            <tr data-href="#/messages/${m.id}">
              <td><a class="row-link" href="#/messages/${m.id}">${m.number}</a>${warnMark(m)}</td>
              <td>${m.date}</td>
              <td>${m.type}</td>
              <td>${statusPill(m)}</td>
              <td>${m.status === 'ready'
                ? `<button class="icon-btn" type="button" data-action="delete" data-id="${m.id}" aria-label="Удалить сообщение ${m.number}">${ICON.trash}</button>`
                : ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ---------- Таблица операций (как в макете выбора операций) ---------- */

function opsTable(ops, { selectable = false, fixable = false, showMessage = true, empty = 'Операций нет' } = {}) {
  if (!ops.length) return `<div class="empty">${empty}</div>`;
  const checkedCount = selectable ? ops.filter((o) => ui.selected.has(o.id)).length : 0;
  const allState = checkedCount === 0 ? '' : checkedCount === ops.length ? 'checked' : 'data-indeterminate';
  return `
    <div class="table-wrap">
      <table class="table table--ops">
        <thead><tr>
          ${selectable ? `<th class="col-check"><input type="checkbox" class="check" data-action="select-all" ${allState} aria-label="Выбрать все"></th>` : ''}
          <th>Лизингополучатель,<br>номер ДЛ и дата выдачи ПЛ</th>
          <th>Тип</th>
          <th>Номер записи<br>и дата АПП</th>
          <th>Дней просрочки<br>и дата выявления</th>
          <th>Сумма, ₽</th>
          ${showMessage ? '<th>Номер сообщения</th>' : ''}
        </tr></thead>
        <tbody>
          ${ops.map((o) => {
            const msg = o.messageId || o.prevMessage;
            return `
            <tr class="${selectable && ui.selected.has(o.id) ? 'is-selected' : ''}">
              ${selectable ? `<td class="col-check"><input type="checkbox" class="check" data-action="select-op" data-op="${o.id}" ${ui.selected.has(o.id) ? 'checked' : ''} aria-label="Выбрать: ${esc(o.client)}"></td>` : ''}
              <td class="col-client">
                <div class="ellipsis" title="${esc(o.client)}">${esc(o.client)}</div>
                <div class="sub"><a class="link" href="#" data-action="contract" data-op="${o.id}">${o.contract}</a> · ${o.contractDate}</div>
                ${!o.inn ? `<div class="sub">${fixable
                  ? `<button class="linklike linklike--warn" type="button" data-action="fix-inn" data-op="${o.id}">ИНН не указан — указать</button>`
                  : '<span class="text-warn">ИНН не указан</span>'}</div>` : ''}
              </td>
              <td>
                <div>${o.kind}</div>
                ${o.isNew ? '<span class="badge">Новая</span>' : ''}
              </td>
              <td><div>${o.record || '—'}</div><div class="sub">${o.appDate}</div></td>
              <td><div>${o.overdueDays}</div><div class="sub">${o.detectedDate}</div></td>
              <td>${num(o.amount)}</td>
              ${showMessage ? `<td>${msg ? `<a class="link" href="#/messages/${msg}">${msg}</a>` : '<span class="muted">—</span>'}</td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ---------- Навигация под шапкой ---------- */

function setNav(items, { tab } = {}) {
  const crumbs = document.getElementById('crumbs');
  if (tab) {
    crumbs.className = 'navtabs';
    crumbs.innerHTML = `
      <li class="navtab is-active">
        <span>${esc(tab.label)}</span>
        <a class="navtab__close" href="${tab.closeHref}" aria-label="Закрыть">${ICON.close}</a>
      </li>`;
  } else {
    crumbs.className = 'crumbs';
    crumbs.innerHTML = items
      .map(([label, href]) => `<li>${href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`}</li>`)
      .join('');
  }
  document.getElementById('nav-home').classList.toggle('is-active', !tab && items.length === 0);
}

/* ---------- Экраны ---------- */

function viewHome() {
  setNav([]);
  const free = freeOps().length;
  return `
    <h1 class="page__title">Моя работа</h1>
    <p class="page__subtitle">Здесь собраны твои рабочие инструменты</p>

    <a class="card banner" href="#/statuses">
      <div class="banner__text">
        <span class="banner__label">Мой статус</span>
        <span class="status-chip" style="--c:${USER_STATUS[state.userStatus].color}">${USER_STATUS[state.userStatus].label}</span>
      </div>
      <h2 class="banner__title">Статусы</h2>
      <div class="banner__art" aria-hidden="true">${BANNER_SVG}</div>
    </a>

    <section class="card messages">
      <div class="messages__head">
        <h2 class="messages__title">Сообщения РФМ</h2>
        <div class="messages__actions">
          ${free
            ? `<a class="ready" href="#/create"><b>${nOps(free)}</b> ${plural(free, ['готова', 'готовы', 'готовы'])} к отправке</a>`
            : '<span class="ready">Нет операций к отправке</span>'}
          <a class="btn btn--primary" href="#/create">Создать сообщение</a>
        </div>
      </div>
      ${messagesTable(state.messages.slice(0, 4))}
      <p class="messages__total">Всего ${nMsgs(state.messages.length)} и ${nOps(state.ops.length)}</p>
      <div class="messages__links">
        <a class="btn btn--secondary" href="#/messages">Все сообщения</a>
        <a class="btn btn--link" href="#/operations">Операции</a>
      </div>
    </section>`;
}

function viewMessages() {
  setNav([['Сообщения РФМ']]);
  const counts = {
    all: state.messages.length,
    ready: state.messages.filter((m) => m.status === 'ready').length,
    sent: state.messages.filter((m) => m.status === 'sent').length,
    issue: state.messages.filter(hasIssue).length,
  };
  const chips = [['all', 'Все'], ['ready', 'Готово к отправке'], ['issue', 'Требует внимания'], ['sent', 'Отправлено']];
  return `
    <div class="page-head">
      <h1 class="page__title page__title--sm">Сообщения РФМ</h1>
      <a class="btn btn--primary" href="#/create">Создать сообщение</a>
    </div>
    <section class="card messages">
      <div class="toolbar">
        <div class="chips" role="tablist">
          ${chips.map(([k, l]) => `
            <button type="button" class="chip ${ui.msgFilter === k ? 'is-active' : ''}" data-action="msg-filter" data-filter="${k}" role="tab" aria-selected="${ui.msgFilter === k}">
              ${l} <span class="chip__count">${counts[k]}</span>
            </button>`).join('')}
        </div>
        <label class="search">${ICON.search}
          <input type="search" id="msg-search" placeholder="Номер сообщения" value="${esc(ui.msgQuery)}">
        </label>
      </div>
      <div id="list">${messagesList()}</div>
    </section>`;
}

function messagesList() {
  const q = ui.msgQuery.trim();
  const list = state.messages.filter((m) =>
    (ui.msgFilter === 'all' || (ui.msgFilter === 'issue' ? hasIssue(m) : m.status === ui.msgFilter)) &&
    (!q || m.number.includes(q)));
  return messagesTable(list, { empty: 'Ничего не найдено' });
}

function viewMessage(id) {
  const m = msgById(id);
  if (!m) return viewNotFound();
  setNav([['Сообщения РФМ', '#/messages'], [m.number]]);
  const ops = opsOf(m.id);
  const broken = ops.filter((o) => !o.inn);
  const issue = hasIssue(m);
  return `
    <a class="back" href="#/messages">${ICON.back}Все сообщения</a>
    <div class="page-head">
      <div>
        <h1 class="page__title page__title--sm">Сообщение ${m.number}</h1>
        <div class="page-head__status">${statusPill(m)}</div>
      </div>
      ${m.status === 'ready' ? `
        <div class="page-head__actions">
          <button class="btn btn--secondary btn--danger" type="button" data-action="delete" data-id="${m.id}">Удалить</button>
          <button class="btn btn--primary" type="button" data-action="send" data-id="${m.id}" ${issue ? 'disabled' : ''}>Отправить в РФМ</button>
        </div>` : ''}
    </div>

    ${issue ? `
      <div class="callout">
        <span class="callout__icon">${ICON.warn}</span>
        <div class="callout__body">
          <b>Сообщение нельзя отправить</b>
          <p>${broken.length === 1
            ? `У лизингополучателя ${esc(broken[0].client)} (договор ${broken[0].contract}) не указан ИНН.`
            : `В ${nOps(broken.length)} не указан ИНН лизингополучателя.`}</p>
        </div>
        <button class="btn btn--secondary btn--sm" type="button" data-action="fix-inn" data-op="${broken[0].id}">Указать ИНН</button>
      </div>` : ''}

    <section class="card details">
      <dl class="facts">
        <div><dt>Тип</dt><dd>${m.type}<small>${MSG_TYPES[m.type]}</small></dd></div>
        <div><dt>Дата создания</dt><dd>${m.date}</dd></div>
        <div><dt>Операций</dt><dd>${ops.length}</dd></div>
        <div><dt>Общая сумма</dt><dd>${money(sumOf(ops))}</dd></div>
        ${m.sentAt ? `<div><dt>Отправлено</dt><dd>${m.sentAt}</dd></div>` : ''}
      </dl>
    </section>

    <section class="card messages">
      <h2 class="messages__title">Операции в сообщении</h2>
      ${opsTable(ops, { fixable: m.status === 'ready', showMessage: false })}
    </section>`;
}

/* --- Список операций (по макету «Операции») --- */

const CHEVRON = '<svg class="fsel__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const CALENDAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" stroke-width="2.4"/></svg>';

const isoToRu = (iso) => iso ? iso.split('-').reverse().join('.') : '';
const ruToIso = (ru) => ru.split('.').reverse().join('-');

function viewOperations() {
  setNav([], { tab: { label: 'Операции', closeHref: '#/' } });
  return `
    <section class="card picker">
      <h1 class="picker__title">Операции</h1>

      <div class="filters filters--ops">
        <label class="filters__search filters__row">
          <input type="search" id="ops-search" placeholder="Лизингополучатель, номер договора лизинга, или номер записи" value="${esc(ui.opsQuery)}" aria-label="Поиск">
        </label>

        <div class="fsel ${ui.opsClass ? 'has-value' : ''}">
          <span class="fsel__label">Класс</span>
          <span class="fsel__value">${ui.opsClass ? OP_CLASSES[ui.opsClass] : ''}</span>
          <select id="ops-class" aria-label="Класс">
            <option value="">Все классы</option>
            ${Object.entries(OP_CLASSES).map(([k, v]) => `<option value="${k}" ${ui.opsClass === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          ${ui.opsClass ? `<button type="button" class="fsel__clear" data-action="clear-filter" data-filter="opsClass" aria-label="Очистить класс">${ICON.close}</button>` : ''}
          ${CHEVRON}
        </div>

        <div class="fsel ${ui.opsKind ? 'has-value' : ''}">
          <span class="fsel__label">Тип</span>
          <span class="fsel__value">${esc(ui.opsKind)}</span>
          <select id="ops-kind" aria-label="Тип">
            <option value="">Все типы</option>
            ${OP_KINDS.map((k) => `<option value="${k}" ${ui.opsKind === k ? 'selected' : ''}>${k}</option>`).join('')}
          </select>
          ${ui.opsKind ? `<button type="button" class="fsel__clear" data-action="clear-filter" data-filter="opsKind" aria-label="Очистить тип">${ICON.close}</button>` : ''}
          ${CHEVRON}
        </div>

        <div class="fsel fsel--period ${ui.opsFrom || ui.opsTo ? 'has-value' : ''}">
          <button type="button" class="fsel__trigger" data-action="toggle-period" aria-expanded="${ui.periodOpen}">
            <span class="fsel__label">Период</span>
            <span class="fsel__value">${periodLabel()}</span>
          </button>
          ${ui.opsFrom || ui.opsTo ? `<button type="button" class="fsel__clear" data-action="clear-period" aria-label="Очистить период">${ICON.close}</button>` : ''}
          <span class="fsel__icon">${CALENDAR}</span>
          ${ui.periodOpen ? `
            <div class="popover" role="dialog" aria-label="Период">
              <div class="popover__fields">
                <label class="field"><span>С</span><input type="date" id="period-from" value="${ui.opsFrom}"></label>
                <label class="field"><span>По</span><input type="date" id="period-to" value="${ui.opsTo}"></label>
              </div>
              <div class="popover__presets">
                <button type="button" class="chip" data-action="period-preset" data-days="7">7 дней</button>
                <button type="button" class="chip" data-action="period-preset" data-days="30">30 дней</button>
                <button type="button" class="chip" data-action="period-preset" data-days="90">90 дней</button>
              </div>
              <div class="popover__actions">
                <button type="button" class="btn btn--secondary btn--sm" data-action="toggle-period">Отмена</button>
                <button type="button" class="btn btn--primary btn--sm" data-action="apply-period">Применить</button>
              </div>
            </div>` : ''}
        </div>
      </div>

      <div id="list">${operationsList()}</div>
    </section>`;
}

function periodLabel() {
  if (!ui.opsFrom && !ui.opsTo) return '';
  if (ui.opsFrom && ui.opsTo) return `${isoToRu(ui.opsFrom)} — ${isoToRu(ui.opsTo)}`;
  return ui.opsFrom ? `с ${isoToRu(ui.opsFrom)}` : `по ${isoToRu(ui.opsTo)}`;
}

const matches = (o, q) => !q || [o.record || '', o.client, o.contract, o.inn].some((v) => v.toLowerCase().includes(q));

function filteredOps() {
  const q = ui.opsQuery.trim().toLowerCase();
  return state.ops.slice().reverse().filter((o) => {
    const d = ruToIso(o.appDate);
    return matches(o, q)
      && (!ui.opsClass || o.cls === ui.opsClass)
      && (!ui.opsKind || o.kind === ui.opsKind)
      && (!ui.opsFrom || d >= ui.opsFrom)
      && (!ui.opsTo || d <= ui.opsTo);
  });
}

function operationsList() {
  const list = filteredOps();
  const shown = list.slice(0, ui.opsLimit);
  if (!list.length) {
    return `<div class="empty">Ничего не найдено<br>
      <button class="btn btn--secondary btn--sm empty__btn" type="button" data-action="reset-filters">Сбросить фильтры</button></div>`;
  }
  return `
    <p class="found">Найдено ${nOps(list.length)}</p>
    ${opsTable(shown)}
    ${list.length > shown.length
      ? `<div class="more"><button class="btn btn--secondary" type="button" data-action="more">Показать ещё · осталось ${list.length - shown.length}</button></div>`
      : ''}`;
}

/* --- Создание сообщения: выбор операций (по макету) --- */

function viewCreate() {
  if (!ui.draftNumber) {
    ui.draftNumber = nextNumber();
    // по умолчанию выбраны все операции, готовые к отправке
    ui.selected = new Set(freeOps().map((o) => o.id));
    ui.pickQuery = ''; ui.pickKind = '';
  }
  setNav([], { tab: { label: `Сообщение ${ui.draftNumber}`, closeHref: '#/' } });
  return `
    <section class="card picker">
      <h1 class="picker__title">Сообщение ${ui.draftNumber}</h1>
      <h2 class="picker__subtitle">Выбери операции, которые войдут в сообщение</h2>

      <div class="filters">
        <label class="filters__search">
          <input type="search" id="pick-search" placeholder="Лизингополучатель, номер договора лизинга, или номер записи" value="${esc(ui.pickQuery)}" aria-label="Поиск">
        </label>
        <label class="filters__select">
          <select id="pick-kind" aria-label="Тип">
            <option value="">Тип</option>
            ${OP_KINDS.map((k) => `<option value="${k}" ${ui.pickKind === k ? 'selected' : ''}>${k}</option>`).join('')}
          </select>
        </label>
      </div>

      <div id="list">${pickerList()}</div>
    </section>

    <div class="tablebar">
      <span id="pick-count">${pickCount()}</span>
      <button class="btn btn--primary" type="button" id="create-submit" data-action="create" ${ui.selected.size ? '' : 'disabled'}>Сформировать</button>
    </div>`;
}

function pickerOps() {
  const q = ui.pickQuery.trim().toLowerCase();
  return freeOps().filter((o) => matches(o, q) && (!ui.pickKind || o.kind === ui.pickKind));
}

function pickerList() {
  if (!freeOps().length) {
    return '<div class="empty">Нет операций, готовых к отправке</div>';
  }
  return opsTable(pickerOps(), { selectable: true, empty: 'Ничего не найдено. Измените условия поиска' });
}

const pickCount = () => ui.selected.size ? `Выбрано ${ui.selected.size}` : 'Ничего не выбрано';

function viewStatuses() {
  setNav([['Статусы']]);
  return `
    <h1 class="page__title page__title--sm">Мой статус</h1>
    <p class="page__subtitle">От статуса зависит, будут ли тебе приходить новые задачи</p>
    <section class="card messages">
      <div class="options options--list">
        ${Object.entries(USER_STATUS).map(([k, s]) => `
          <label class="option ${state.userStatus === k ? 'is-active' : ''}">
            <input type="radio" name="ustatus" value="${k}" data-action="set-status" ${state.userStatus === k ? 'checked' : ''}>
            <span class="dot" style="background:${s.color}"></span>
            <b>${s.label}</b><span>${s.hint}</span>
          </label>`).join('')}
      </div>
    </section>`;
}

function viewNotFound() {
  setNav([['Не найдено']]);
  return `
    <h1 class="page__title page__title--sm">Страница не найдена</h1>
    <p class="page__subtitle">Возможно, сообщение было удалено.</p>
    <p><a class="btn btn--secondary" href="#/">На главную</a></p>`;
}

/* ---------- Роутинг ---------- */

let currentRoute = '';
let currentPath = (() => { try { return location.hash.replace(/^#/, '') || '/'; } catch (e) { return '/'; } })();

function render({ keepScroll = false } = {}) {
  const route = currentPath;
  const parts = route.split('?')[0].split('/').filter(Boolean);

  if (route !== currentRoute) {
    if (parts[0] !== 'create') { ui.draftNumber = null; ui.selected.clear(); }
    ui.opsLimit = 20;
  }

  let html;
  if (!parts.length) html = viewHome();
  else if (parts[0] === 'messages' && parts[1]) html = viewMessage(decodeURIComponent(parts[1]));
  else if (parts[0] === 'messages') html = viewMessages();
  else if (parts[0] === 'operations') html = viewOperations();
  else if (parts[0] === 'create') html = viewCreate();
  else if (parts[0] === 'statuses') html = viewStatuses();
  else html = viewNotFound();

  const app = document.getElementById('app');
  app.innerHTML = html;
  document.body.classList.toggle('has-tablebar', parts[0] === 'create');
  syncIndeterminate();
  renderUser();
  if (route !== currentRoute && !keepScroll) window.scrollTo(0, 0);
  currentRoute = route;
}

function syncIndeterminate() {
  document.querySelectorAll('[data-indeterminate]').forEach((c) => { c.indeterminate = true; });
}

function renderUser() {
  const s = USER_STATUS[state.userStatus];
  const el = document.getElementById('user-status');
  el.textContent = s.label;
  el.style.color = s.color;
  const btn = document.getElementById('user-power');
  btn.style.background = s.color;
  btn.setAttribute('aria-label', state.userStatus === 'online' ? 'Уйти в оффлайн' : 'Выйти на линию');
}

/* ---------- Действия ---------- */

function deleteMessage(id) {
  const m = msgById(id);
  openModal({
    title: `Удалить сообщение ${m.number}?`,
    body: `<p>${nOps(opsOf(id).length)} вернутся в список «Готовы к отправке».</p>`,
    confirmText: 'Удалить',
    danger: true,
    onConfirm() {
      const snapshot = JSON.stringify(state);
      opsOf(id).forEach((o) => { o.messageId = null; });
      state.messages = state.messages.filter((x) => x.id !== id);
      save();
      if (currentPath.startsWith('/messages/')) go('/messages');
      else render({ keepScroll: true });
      toast(`Сообщение ${m.number} удалено`, {
        action: 'Отменить',
        onAction() { state = JSON.parse(snapshot); save(); render({ keepScroll: true }); },
      });
    },
  });
}

function sendMessage(id) {
  const m = msgById(id);
  const ops = opsOf(id);
  openModal({
    title: `Отправить сообщение ${m.number}?`,
    body: `<p>${nOps(ops.length)} на ${money(sumOf(ops))} будут отправлены в Росфинмониторинг. После отправки сообщение нельзя изменить или удалить.</p>`,
    confirmText: 'Отправить',
    onConfirm() {
      m.status = 'sent';
      m.sentAt = today();
      save();
      render({ keepScroll: true });
      toast(`Сообщение ${m.number} отправлено`);
    },
  });
}

function fixInn(opId) {
  const op = state.ops.find((o) => o.id === opId);
  openModal({
    title: 'ИНН лизингополучателя',
    body: `
      <p>${esc(op.client)} · договор ${op.contract}</p>
      <label class="field">
        <span>ИНН</span>
        <input type="text" inputmode="numeric" maxlength="12" id="inn-input" placeholder="10 или 12 цифр" autocomplete="off">
        <small class="field__error" id="inn-error"></small>
      </label>`,
    confirmText: 'Сохранить',
    onConfirm() {
      const v = document.getElementById('inn-input').value.trim();
      if (!/^(\d{10}|\d{12})$/.test(v)) {
        document.getElementById('inn-error').textContent = 'ИНН состоит из 10 цифр для организаций или 12 — для ИП';
        document.getElementById('inn-input').focus();
        return false;
      }
      op.inn = v;
      save();
      render({ keepScroll: true });
      toast('ИНН сохранён');
    },
  });
}

function showContract(opId) {
  const o = state.ops.find((x) => x.id === opId);
  openModal({
    title: `Договор лизинга ${o.contract}`,
    body: `
      <dl class="facts facts--modal">
        <div><dt>Лизингополучатель</dt><dd>${esc(o.client)}</dd></div>
        <div><dt>ИНН</dt><dd>${o.inn || '<span class="text-warn">не указан</span>'}</dd></div>
        <div><dt>Дата выдачи ПЛ</dt><dd>${o.contractDate}</dd></div>
        <div><dt>Сумма операции</dt><dd>${money(o.amount)}</dd></div>
      </dl>`,
    confirmText: 'Закрыть',
    hideCancel: true,
    onConfirm() {},
  });
}

function createMessage() {
  const ids = [...ui.selected].filter((id) => state.ops.some((o) => o.id === id && !o.messageId));
  if (!ids.length) return;
  const number = ui.draftNumber || nextNumber();
  state.messages.unshift({ id: number, number, date: today(), type: 'FMO1', status: 'ready', sentAt: null });
  state.ops.forEach((o) => { if (ids.includes(o.id)) { o.messageId = number; o.isNew = false; } });
  save();
  go(`/messages/${number}`);
  toast(`Сообщение ${number} сформировано · ${nOps(ids.length)}`);
}

/* ---------- Модалка и тосты ---------- */

function openModal({ title, body, confirmText, danger, hideCancel, onConfirm }) {
  const prevFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `
    <div class="modal__backdrop" data-close></div>
    <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title" class="modal__title">${esc(title)}</h2>
      <div class="modal__body">${body}</div>
      <div class="modal__actions">
        ${hideCancel ? '' : '<button type="button" class="btn btn--secondary" data-close>Отмена</button>'}
        <button type="button" class="btn ${danger ? 'btn--danger-solid' : 'btn--primary'}" data-confirm>${esc(confirmText)}</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');

  const close = () => {
    wrap.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    if (prevFocus && document.contains(prevFocus)) prevFocus.focus();
  };
  const confirm = () => { if (onConfirm() !== false) close(); };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') confirm();
  };
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
    if (e.target.closest('[data-confirm]')) confirm();
  });
  document.addEventListener('keydown', onKey);
  (wrap.querySelector('input') || wrap.querySelector('[data-confirm]')).focus();
}

function toast(text, { action, onAction } = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  document.getElementById('toasts').appendChild(el);
  const hide = () => el.remove();
  if (action) el.querySelector('button').addEventListener('click', () => { onAction(); hide(); });
  setTimeout(hide, action ? 6000 : 3500);
}

/* ---------- События ---------- */

document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (actionEl && actionEl.type !== 'checkbox' && actionEl.type !== 'radio') {
    const { action, id, op, filter, tab } = actionEl.dataset;
    switch (action) {
      case 'delete': e.preventDefault(); return deleteMessage(id);
      case 'send': return sendMessage(id);
      case 'fix-inn': return fixInn(op);
      case 'contract': e.preventDefault(); return showContract(op);
      case 'create': return createMessage();
      case 'msg-filter': ui.msgFilter = filter; return render({ keepScroll: true });
      case 'clear-filter': ui[filter] = ''; ui.opsLimit = 20; return render({ keepScroll: true });
      case 'toggle-period': ui.periodOpen = !ui.periodOpen; return render({ keepScroll: true });
      case 'clear-period': ui.opsFrom = ui.opsTo = ''; ui.periodOpen = false; return render({ keepScroll: true });
      case 'period-preset': {
        // считаем от самой свежей даты в данных, чтобы пресеты что-то находили
        const latest = state.ops.map((o) => ruToIso(o.appDate)).sort().pop();
        const to = new Date(latest);
        const from = new Date(to); from.setDate(from.getDate() - Number(actionEl.dataset.days));
        document.getElementById('period-from').value = from.toISOString().slice(0, 10);
        document.getElementById('period-to').value = latest;
        return;
      }
      case 'apply-period': {
        let from = document.getElementById('period-from').value;
        let to = document.getElementById('period-to').value;
        if (from && to && from > to) [from, to] = [to, from];
        ui.opsFrom = from; ui.opsTo = to; ui.periodOpen = false; ui.opsLimit = 20;
        return render({ keepScroll: true });
      }
      case 'reset-filters':
        Object.assign(ui, { opsQuery: '', opsClass: '', opsKind: '', opsFrom: '', opsTo: '', opsLimit: 20 });
        return render({ keepScroll: true });
      case 'more': ui.opsLimit += 20; return refreshList();
      case 'toggle-power':
        state.userStatus = state.userStatus === 'online' ? 'offline' : 'online';
        save(); render({ keepScroll: true });
        return toast(`Статус: ${USER_STATUS[state.userStatus].label}`);
      case 'reset':
        return openModal({
          title: 'Сбросить данные прототипа?',
          body: '<p>Все созданные, удалённые и отправленные сообщения вернутся к исходному виду.</p>',
          confirmText: 'Сбросить',
          onConfirm() { state = makeSeed(); save(); ui.selected.clear(); ui.draftNumber = null; go('/'); toast('Данные сброшены'); },
        });
    }
  }
  // клик мимо окна периода закрывает его
  if (ui.periodOpen && !e.target.closest('.fsel--period')) { ui.periodOpen = false; render({ keepScroll: true }); return; }
  // клик по строке таблицы сообщений открывает сообщение
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button, input, label')) { go(row.dataset.href.slice(1)); return; }
  // клик по строке при выборе операций переключает галочку
  const pickRow = e.target.closest('.table--ops tbody tr');
  if (pickRow && !e.target.closest('a, button, input, label')) {
    const box = pickRow.querySelector('[data-action="select-op"]');
    if (box) { box.checked = !box.checked; box.dispatchEvent(new Event('change', { bubbles: true })); }
  }
});

document.addEventListener('change', (e) => {
  const { action, op } = e.target.dataset;
  if (action === 'select-op') {
    e.target.checked ? ui.selected.add(op) : ui.selected.delete(op);
    refreshList();
  } else if (action === 'select-all') {
    const visible = pickerOps().map((o) => o.id);
    const allOn = visible.every((id) => ui.selected.has(id));
    visible.forEach((id) => (allOn ? ui.selected.delete(id) : ui.selected.add(id)));
    refreshList();
  } else if (action === 'set-status') {
    state.userStatus = e.target.value;
    save();
    render({ keepScroll: true });
    toast(`Статус: ${USER_STATUS[state.userStatus].label}`);
  } else if (e.target.id === 'ops-class' || e.target.id === 'ops-kind') {
    ui[e.target.id === 'ops-class' ? 'opsClass' : 'opsKind'] = e.target.value;
    ui.opsLimit = 20;
    render({ keepScroll: true });
  } else if (e.target.id === 'pick-kind') {
    ui.pickKind = e.target.value;
    refreshList();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'msg-search') { ui.msgQuery = e.target.value; refreshList(); }
  if (e.target.id === 'ops-search') { ui.opsQuery = e.target.value; ui.opsLimit = 20; refreshList(); }
  if (e.target.id === 'pick-search') { ui.pickQuery = e.target.value; refreshList(); }
});

// Перерисовываем только список, чтобы не терять фокус в поиске
function refreshList() {
  const list = document.getElementById('list');
  const route = currentRoute.split('?')[0];
  if (route === '/messages') list.innerHTML = messagesList();
  else if (route === '/operations') list.innerHTML = operationsList();
  else if (route === '/create') {
    list.innerHTML = pickerList();
    document.getElementById('pick-count').textContent = pickCount();
    document.getElementById('create-submit').disabled = !ui.selected.size;
  }
  syncIndeterminate();
}

// Навигация без перехода по адресу: так прототип работает и во встроенном
// просмотре, где переходы по ссылкам заблокированы.
function go(path) {
  currentPath = path || '/';
  try { history.pushState({ path: currentPath }, '', '#' + currentPath); } catch (e) { /* просмотр без истории */ }
  render();
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.dataset.action || e.defaultPrevented) return;
  e.preventDefault();
  go(a.getAttribute('href').slice(1));
}, true);

window.addEventListener('popstate', () => {
  currentPath = location.hash.replace(/^#/, '') || '/';
  render();
});

/* ---------- Иллюстрация баннера (заглушка вместо 3D-картинки) ---------- */

const BANNER_SVG = `
<svg viewBox="0 0 460 272" preserveAspectRatio="xMaxYMax meet">
  <defs>
    <linearGradient id="y" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff176"/><stop offset=".55" stop-color="#ffdd2d"/><stop offset="1" stop-color="#f2b705"/></linearGradient>
    <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d9d9"/></linearGradient>
  </defs>
  <path d="M150 272V150q0-12 12-12h170q60 0 90 40l38 52v42z" fill="url(#w)"/>
  <rect x="0" y="230" width="230" height="42" fill="#ececec"/>
  <rect x="48" y="205" width="110" height="67" fill="url(#w)"/>
  <path d="M72 205a40 36 0 0 1 80 0z" fill="url(#y)"/>
  <circle cx="112" cy="148" r="20" fill="url(#y)"/>
  <rect x="108" y="212" width="12" height="60" rx="3" fill="#ffd400"/>
  <rect x="94" y="232" width="40" height="11" rx="3" fill="#ffd400"/>
  <circle cx="72" cy="110" r="8" fill="#e6e6e6"/><circle cx="72" cy="130" r="8" fill="#e6e6e6"/><circle cx="72" cy="150" r="8" fill="url(#y)"/>
  <path d="M225 120V70a90 90 0 0 1 180 0v70" fill="none" stroke="url(#w)" stroke-width="26" stroke-linecap="round"/>
  <path d="M225 70a90 90 0 0 1 40-62" fill="none" stroke="#ffdd2d" stroke-width="26" stroke-linecap="round"/>
  <ellipse cx="258" cy="128" rx="44" ry="58" fill="url(#y)"/><ellipse cx="264" cy="128" rx="26" ry="38" fill="#fff4b0"/>
  <ellipse cx="380" cy="150" rx="40" ry="56" transform="rotate(25 380 150)" fill="url(#y)"/>
  <ellipse cx="372" cy="150" rx="22" ry="34" transform="rotate(25 372 150)" fill="#f5f5f5"/>
  <path d="M360 200q-40 30-110 22" fill="none" stroke="#ffd400" stroke-width="8" stroke-linecap="round"/>
  <circle cx="248" cy="221" r="9" fill="#ffd400"/>
</svg>`;

render();
