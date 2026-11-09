/* Кликабельный прототип «Сообщения РФМ».
   Все данные вымышленные и живут в localStorage этого браузера. */

const STORAGE_KEY = 'finmon-prototype-v1';

/* ---------- Справочники ---------- */

const MSG_STATUS = {
  ready: { label: 'Готово к отправке', cls: 'ready' },
  sent:  { label: 'Отправлено',        cls: 'sent'  },
};

const MSG_TYPES = {
  FMO1: 'Операции, подлежащие обязательному контролю',
  FMO2: 'Подозрительные операции',
};

const USER_STATUS = {
  online:   { label: 'Онлайн',   hint: 'Принимаю задачи',              color: '#00b92d' },
  offline:  { label: 'Оффлайн',  hint: 'Не на рабочем месте',          color: '#9b59d0' },
  break:    { label: 'Перерыв',  hint: 'Вернусь в течение 15 минут',   color: '#ff8a00' },
  training: { label: 'Обучение', hint: 'На обучении, задачи не беру', color: '#428bf9' },
};

const CLIENTS = [
  ['ООО «Ромашка»', '7701234567'], ['ИП Сидоров А. В.', '502401234567'],
  ['ООО «Вектор»', '7812345670'], ['АО «Северный ветер»', '2901234568'],
  ['ООО «Гранит»', '6658123456'], ['ИП Кузнецова Е. С.', '773301234561'],
  ['ООО «Лесная поляна»', '5406123457'], ['АО «Меридиан»', '7707654321'],
  ['ООО «Альфа-Строй»', '1655123458'], ['ИП Морозов Д. И.', '631201234569'],
];

const CODES = [
  ['1001', 'Снятие наличных'], ['3011', 'Перевод за рубеж'],
  ['5003', 'Зачисление на счёт'], ['6001', 'Сделка с недвижимостью'],
  ['8001', 'Покупка ценных бумаг'],
];

/* ---------- Начальные данные ---------- */

function makeSeed() {
  let s = 42;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

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
  let n = 1;
  const makeOp = (date, messageId) => {
    const [client, inn] = pick(CLIENTS);
    const [code, codeName] = pick(CODES);
    return {
      id: 'ОП-' + String(48200 + n++),
      date, client, inn, code, codeName,
      amount: Math.round((600000 + rnd() * 9400000) / 100) * 100,
      messageId,
    };
  };

  const messages = plan.map(([number, status, date, count]) => {
    for (let i = 0; i < count; i++) ops.push(makeOp(date, number));
    return {
      id: number, number, date, type: 'FMO1', status,
      sentAt: status === 'sent' ? date : null,
    };
  });

  // В сообщении 00001108 у одной операции не указан ИНН — это и есть «предупреждение»
  ops.find((o) => o.messageId === '00001108').inn = '';

  for (let i = 0; i < 24; i++) ops.push(makeOp('22.02.2025', null));

  return { messages, ops, nextNumber: 1109, userStatus: 'offline' };
}

/* ---------- Состояние ---------- */

let state = load();
const ui = {
  msgFilter: 'all', msgQuery: '',
  opsTab: 'ready', opsQuery: '', opsLimit: 20,
  selected: new Set(),
  createType: 'FMO1',
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
const money = (n) => n.toLocaleString('ru-RU') + ' ₽';
const today = () => new Date().toLocaleDateString('ru-RU');

const ICON = {
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M9 6V4h6v2M6.5 6l1 14h9l1-14"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 1.5 21h21z" fill="#ff8a00"/><path d="M12 9v5.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.3" fill="#fff"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
};

const statusPill = (m) => `<span class="status status--${MSG_STATUS[m.status].cls}">${MSG_STATUS[m.status].label}</span>`;
const warnMark = (m) => hasIssue(m) ? `<span class="warn" title="Требует внимания" aria-label="Требует внимания">${ICON.warn}</span>` : '';

/* ---------- Общие куски разметки ---------- */

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

function setCrumbs(items) {
  document.getElementById('crumbs').innerHTML = items
    .map(([label, href]) => `<li>${href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`}</li>`)
    .join('');
  document.getElementById('nav-home').classList.toggle('is-active', items.length === 0);
}

/* ---------- Экраны ---------- */

function viewHome() {
  setCrumbs([]);
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
            ? `<a class="ready" href="#/operations"><b>${nOps(free)}</b> ${plural(free, ['готова', 'готовы', 'готовы'])} к отправке</a>`
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
  setCrumbs([['Сообщения РФМ']]);
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
  setCrumbs([['Сообщения РФМ', '#/messages'], [m.number]]);
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
            ? `В операции ${broken[0].id} не указан ИНН клиента.`
            : `В ${nOps(broken.length)} не указан ИНН клиента.`}</p>
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
      ${opsTable(ops, { fixable: m.status === 'ready' })}
    </section>`;
}

function opsTable(ops, { selectable = false, fixable = false, showMessage = false } = {}) {
  if (!ops.length) return '<div class="empty">Операций нет</div>';
  const allChecked = selectable && ops.every((o) => ui.selected.has(o.id));
  return `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          ${selectable ? `<th class="col-check"><input type="checkbox" class="check" data-action="select-all" ${allChecked ? 'checked' : ''} aria-label="Выбрать все"></th>` : ''}
          <th>Операция</th><th>Дата</th><th>Клиент</th><th>ИНН</th><th>Код</th><th class="num">Сумма</th>
          ${showMessage ? '<th>Сообщение</th>' : ''}
        </tr></thead>
        <tbody>
          ${ops.map((o) => `
            <tr class="${selectable && ui.selected.has(o.id) ? 'is-selected' : ''}">
              ${selectable ? `<td class="col-check"><input type="checkbox" class="check" data-action="select-op" data-op="${o.id}" ${ui.selected.has(o.id) ? 'checked' : ''} aria-label="Выбрать ${o.id}"></td>` : ''}
              <td>${o.id}</td>
              <td>${o.date}</td>
              <td>${esc(o.client)}</td>
              <td>${o.inn ? o.inn : fixable
                ? `<button class="linklike linklike--warn" type="button" data-action="fix-inn" data-op="${o.id}">Не указан — указать</button>`
                : '<span class="muted">не указан</span>'}</td>
              <td title="${esc(o.codeName)}">${o.code}</td>
              <td class="num">${money(o.amount)}</td>
              ${showMessage ? `<td>${o.messageId ? `<a class="link" href="#/messages/${o.messageId}">${o.messageId}</a>` : '<span class="status status--ready">Готова</span>'}</td>` : ''}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function viewOperations() {
  setCrumbs([['Операции']]);
  const free = freeOps().length;
  return `
    <div class="page-head">
      <h1 class="page__title page__title--sm">Операции</h1>
    </div>
    <section class="card messages">
      <div class="toolbar">
        <div class="tabs" role="tablist">
          <button type="button" class="tab ${ui.opsTab === 'ready' ? 'is-active' : ''}" data-action="ops-tab" data-tab="ready" role="tab">Готовы к отправке <span class="chip__count">${free}</span></button>
          <button type="button" class="tab ${ui.opsTab === 'all' ? 'is-active' : ''}" data-action="ops-tab" data-tab="all" role="tab">Все <span class="chip__count">${state.ops.length}</span></button>
        </div>
        <label class="search">${ICON.search}
          <input type="search" id="ops-search" placeholder="Клиент, ИНН или номер" value="${esc(ui.opsQuery)}">
        </label>
      </div>
      <div id="list">${operationsList()}</div>
    </section>
    <div id="selbar">${selectionBar()}</div>`;
}

function operationsList() {
  const q = ui.opsQuery.trim().toLowerCase();
  const source = ui.opsTab === 'ready' ? freeOps() : state.ops.slice().reverse();
  const list = source.filter((o) => !q || [o.id, o.client, o.inn].some((v) => v.toLowerCase().includes(q)));
  const shown = list.slice(0, ui.opsLimit);
  if (ui.opsTab === 'ready' && !freeOps().length) {
    return '<div class="empty">Все операции уже включены в сообщения</div>';
  }
  return `
    ${opsTable(shown, { selectable: ui.opsTab === 'ready', showMessage: ui.opsTab === 'all' })}
    ${list.length > shown.length
      ? `<div class="more"><button class="btn btn--secondary" type="button" data-action="more">Показать ещё · осталось ${list.length - shown.length}</button></div>`
      : ''}`;
}

function selectionBar() {
  const n = ui.selected.size;
  if (!n) return '';
  const sum = sumOf(state.ops.filter((o) => ui.selected.has(o.id)));
  return `
    <div class="selbar">
      <span>Выбрано <b>${nOps(n)}</b> на ${money(sum)}</span>
      <div class="selbar__actions">
        <button class="btn btn--link btn--sm" type="button" data-action="clear-selection">Сбросить</button>
        <a class="btn btn--primary btn--sm" href="#/create">Создать сообщение</a>
      </div>
    </div>`;
}

function viewCreate() {
  setCrumbs([['Сообщения РФМ', '#/messages'], ['Новое сообщение']]);
  const free = freeOps();
  // выбранные на экране операций переходят сюда; если ничего не выбрано — берём все готовые
  if (!ui.selected.size) free.forEach((o) => ui.selected.add(o.id));
  return `
    <a class="back" href="javascript:history.back()">${ICON.back}Назад</a>
    <h1 class="page__title page__title--sm">Новое сообщение</h1>

    <section class="card messages">
      <h2 class="messages__title">Тип сообщения</h2>
      <div class="options">
        ${Object.entries(MSG_TYPES).map(([k, d]) => `
          <label class="option ${ui.createType === k ? 'is-active' : ''}">
            <input type="radio" name="type" value="${k}" data-action="create-type" ${ui.createType === k ? 'checked' : ''}>
            <b>${k}</b><span>${d}</span>
          </label>`).join('')}
      </div>
    </section>

    <section class="card messages">
      <div class="messages__head">
        <h2 class="messages__title">Операции</h2>
        <span class="ready" id="create-summary">${createSummary()}</span>
      </div>
      ${free.length
        ? `<div id="list">${opsTable(free, { selectable: true })}</div>`
        : '<div class="empty">Нет операций, готовых к отправке. <a class="link" href="#/operations?all">Посмотреть все операции</a></div>'}
    </section>

    <div class="form-actions">
      <a class="btn btn--link" href="#/">Отмена</a>
      <button class="btn btn--primary" type="button" id="create-submit" data-action="create" ${ui.selected.size ? '' : 'disabled'}>Создать сообщение</button>
    </div>`;
}

function createSummary() {
  const n = ui.selected.size;
  if (!n) return 'Выберите хотя бы одну операцию';
  return `Выбрано <b>${nOps(n)}</b> на ${money(sumOf(state.ops.filter((o) => ui.selected.has(o.id))))}`;
}

function viewStatuses() {
  setCrumbs([['Статусы']]);
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
  setCrumbs([['Не найдено']]);
  return `
    <h1 class="page__title page__title--sm">Страница не найдена</h1>
    <p class="page__subtitle">Возможно, сообщение было удалено.</p>
    <p><a class="btn btn--secondary" href="#/">На главную</a></p>`;
}

/* ---------- Роутинг ---------- */

let currentRoute = '';

function render({ keepScroll = false } = {}) {
  const route = location.hash.replace(/^#/, '') || '/';
  const [path] = route.split('?');
  const parts = path.split('/').filter(Boolean);

  if (route !== currentRoute) {
    // при уходе с экранов выбора сбрасываем выделение
    const wasPicking = /^\/(operations|create)/.test(currentRoute);
    const isPicking = /^\/(operations|create)/.test(path);
    if (!isPicking || !wasPicking) ui.selected.clear();
    if (route === '/operations?all') ui.opsTab = 'all';
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

  document.getElementById('app').innerHTML = html;
  renderUser();
  if (route !== currentRoute && !keepScroll) window.scrollTo(0, 0);
  currentRoute = route;
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
      if (location.hash.startsWith('#/messages/')) location.hash = '#/messages';
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
    title: 'ИНН клиента',
    body: `
      <p>${esc(op.client)} · операция ${op.id}</p>
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

function createMessage() {
  const ids = [...ui.selected].filter((id) => state.ops.some((o) => o.id === id && !o.messageId));
  if (!ids.length) return;
  const number = String(state.nextNumber++).padStart(8, '0');
  state.messages.unshift({ id: number, number, date: today(), type: ui.createType, status: 'ready', sentAt: null });
  state.ops.forEach((o) => { if (ids.includes(o.id)) o.messageId = number; });
  ui.selected.clear();
  save();
  location.hash = `#/messages/${number}`;
  toast(`Сообщение ${number} создано · ${nOps(ids.length)}`);
}

/* ---------- Модалка и тосты ---------- */

function openModal({ title, body, confirmText, danger, onConfirm }) {
  const prevFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `
    <div class="modal__backdrop" data-close></div>
    <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title" class="modal__title">${esc(title)}</h2>
      <div class="modal__body">${body}</div>
      <div class="modal__actions">
        <button type="button" class="btn btn--secondary" data-close>Отмена</button>
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
  if (actionEl) {
    const { action, id, op, filter, tab } = actionEl.dataset;
    switch (action) {
      case 'delete': e.preventDefault(); return deleteMessage(id);
      case 'send': return sendMessage(id);
      case 'fix-inn': return fixInn(op);
      case 'create': return createMessage();
      case 'msg-filter': ui.msgFilter = filter; return render({ keepScroll: true });
      case 'ops-tab': ui.opsTab = tab; ui.opsLimit = 20; return render({ keepScroll: true });
      case 'more': ui.opsLimit += 20; return refreshList();
      case 'clear-selection': ui.selected.clear(); return refreshList();
      case 'toggle-power':
        state.userStatus = state.userStatus === 'online' ? 'offline' : 'online';
        save(); render({ keepScroll: true });
        return toast(`Статус: ${USER_STATUS[state.userStatus].label}`);
      case 'reset':
        return openModal({
          title: 'Сбросить данные прототипа?',
          body: '<p>Все созданные, удалённые и отправленные сообщения вернутся к исходному виду.</p>',
          confirmText: 'Сбросить',
          onConfirm() { state = makeSeed(); save(); ui.selected.clear(); location.hash = '#/'; render(); toast('Данные сброшены'); },
        });
    }
  }
  // клик по строке таблицы открывает сообщение
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button, input, label')) location.hash = row.dataset.href;
});

document.addEventListener('change', (e) => {
  const { action, op } = e.target.dataset;
  if (action === 'select-op') {
    e.target.checked ? ui.selected.add(op) : ui.selected.delete(op);
    refreshList();
  } else if (action === 'select-all') {
    const rows = [...document.querySelectorAll('[data-action="select-op"]')].map((c) => c.dataset.op);
    rows.forEach((id) => (e.target.checked ? ui.selected.add(id) : ui.selected.delete(id)));
    refreshList();
  } else if (action === 'create-type') {
    ui.createType = e.target.value;
    document.querySelectorAll('.option').forEach((l) => l.classList.toggle('is-active', l.contains(e.target)));
  } else if (action === 'set-status') {
    state.userStatus = e.target.value;
    save();
    render({ keepScroll: true });
    toast(`Статус: ${USER_STATUS[state.userStatus].label}`);
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'msg-search') { ui.msgQuery = e.target.value; refreshList(); }
  if (e.target.id === 'ops-search') { ui.opsQuery = e.target.value; ui.opsLimit = 20; refreshList(); }
});

// Перерисовываем только список, чтобы не терять фокус в поиске
function refreshList() {
  const list = document.getElementById('list');
  const route = currentRoute.split('?')[0];
  if (route === '/messages') list.innerHTML = messagesList();
  else if (route === '/operations') {
    list.innerHTML = operationsList();
    document.getElementById('selbar').innerHTML = selectionBar();
  } else if (route === '/create') {
    list.innerHTML = opsTable(freeOps(), { selectable: true });
    document.getElementById('create-summary').innerHTML = createSummary();
    document.getElementById('create-submit').disabled = !ui.selected.size;
  }
}

window.addEventListener('hashchange', () => render());

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
