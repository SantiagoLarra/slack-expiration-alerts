/**
 * Expirations → Slack  |  Vencimientos → Slack
 * Alerts a Slack channel before contracts, licenses, domains or certificates expire.
 * Google Sheets + Apps Script. No server, no cost.
 *
 * License: MIT
 */

/* ───────────────────────── Settings ───────────────────────── */

const LANG = 'en'; // 'en' = English | 'es' = Español

const CONFIG = {
  TRIGGER_HOUR: 9, // approximate hour of the daily check (script time zone)
  HIGHLIGHT_SOON_DAYS: 7, // rows due within N days turn yellow (0 = off). Overdue rows always turn red.
  // Thresholds, lowest to highest. Each item gets ONE alert per threshold.
  BUCKETS: [
    { key: 'VENCIDO', max: -1 },
    { key: 'HOY',     max: 0 },
    { key: '1D',      max: 1 },
    { key: '7D',      max: 7 },
    { key: '30D',     max: 30 },
  ],
};

const STRINGS = {
  en: {
    sheetName: 'Expirations',
    columns: { ITEM: 'Item', TYPE: 'Type', OWNER: 'Owner', DUE: 'Due date', NOTES: 'Notes', LAST_ALERT: 'Last alert' },
    bucketLabels: {
      VENCIDO: '🔴 Overdue',
      HOY: '🔴 Due today',
      '1D': '🟠 Due tomorrow',
      '7D': '🟡 Due within 7 days',
      '30D': '🔵 Due within 30 days',
      INVALIDA: '⚠️ Invalid date (fix it in the sheet)',
    },
    title: 'Upcoming expirations',
    dueMany: 'due in {n} days', dueTomorrow: 'due tomorrow', dueToday: 'due today',
    overdueOne: 'was due yesterday', overdueMany: 'was due {n} days ago',
    invalidValue: 'entered value: "{v}"', empty: '(empty)',
    dateFormat: 'yyyy-MM-dd', sheetDateFormat: 'yyyy-mm-dd',
    menu: 'Expirations',
    menuItems: ['1. Create sample sheet', '2. Set up Slack webhook', '3. Send test message', '4. Enable daily check', 'Check now', 'Disable daily check', 'Apply colors'],
    errNoWebhook: 'Webhook missing. Expirations menu → Set up Slack webhook.',
    errNoSheet: 'Sheet "{s}" not found. Expirations menu → Create sample sheet.',
    errMissingCols: 'Missing columns: {c}',
    errSlack: 'Slack responded {code}: {body}',
    sheetExists: 'Sheet "{s}" already exists. Nothing was changed.',
    sheetCreated: 'Sheet created with 4 examples. Next step: set up the Slack webhook.',
    lastAlertNote: 'Managed by the script. Do not edit.',
    samples: [
      ['company.com domain', 'Domain', 'Ana', 5, 'Renew at the registrar'],
      ['App SSL certificate', 'Certificate', 'IT team', 25, ''],
      ['Figma licenses (8 seats)', 'License', 'Ops', 60, 'Review unused seats first'],
      ['Office lease', 'Contract', 'Admin', -2, 'Example of an overdue item'],
    ],
    webhookTitle: 'Slack webhook',
    webhookPrompt: 'Paste the Incoming Webhook URL (https://hooks.slack.com/services/...)',
    webhookInvalid: "That doesn't look like a Slack webhook URL. Nothing was saved.",
    webhookSaved: 'Webhook saved. Next step: send a test message.',
    testMessage: '✅ Expirations → Slack connected successfully.',
    testSent: 'Message sent. Check your Slack channel.',
    error: 'Error: ',
    triggerOn: 'Daily check enabled between {h1}:00 and {h2}:00 (time zone: {tz}).',
    triggerOff: 'Daily check disabled.', triggerNone: 'No daily check was active.',
    toastSent: '{n} alert(s) sent to Slack.', toastNone: 'Nothing new to alert.',
    openSheet: 'Open sheet',
    formatApplied: 'Colors applied: overdue rows in red, rows due within {n} days in yellow.',
    formatAppliedNoSoon: 'Colors applied: overdue rows in red.',
  },
  es: {
    sheetName: 'Vencimientos',
    columns: { ITEM: 'Item', TYPE: 'Tipo', OWNER: 'Responsable', DUE: 'Vencimiento', NOTES: 'Notas', LAST_ALERT: 'Último aviso' },
    bucketLabels: {
      VENCIDO: '🔴 Vencidos',
      HOY: '🔴 Vencen hoy',
      '1D': '🟠 Vencen mañana',
      '7D': '🟡 Vencen en 7 días o menos',
      '30D': '🔵 Vencen en 30 días o menos',
      INVALIDA: '⚠️ Fecha inválida (corregir en la planilla)',
    },
    title: 'Vencimientos',
    dueMany: 'vence en {n} días', dueTomorrow: 'vence mañana', dueToday: 'vence hoy',
    overdueOne: 'venció ayer', overdueMany: 'venció hace {n} días',
    invalidValue: 'valor cargado: "{v}"', empty: '(vacío)',
    dateFormat: 'dd/MM/yyyy', sheetDateFormat: 'dd/mm/yyyy',
    menu: 'Vencimientos',
    menuItems: ['1. Crear hoja de ejemplo', '2. Configurar webhook de Slack', '3. Enviar mensaje de prueba', '4. Activar revisión diaria', 'Revisar ahora', 'Desactivar revisión diaria', 'Aplicar colores'],
    errNoWebhook: 'Falta el webhook. Menú Vencimientos → Configurar webhook de Slack.',
    errNoSheet: 'No existe la hoja "{s}". Menú Vencimientos → Crear hoja de ejemplo.',
    errMissingCols: 'Faltan columnas: {c}',
    errSlack: 'Slack respondió {code}: {body}',
    sheetExists: 'La hoja "{s}" ya existe. No se modificó nada.',
    sheetCreated: 'Hoja creada con 4 ejemplos. Siguiente paso: configurar el webhook de Slack.',
    lastAlertNote: 'Columna manejada por el script. No la edites.',
    samples: [
      ['Dominio empresa.com', 'Dominio', 'Ana', 5, 'Renovar en el registrador'],
      ['Certificado SSL app', 'Certificado', 'Equipo IT', 25, ''],
      ['Licencias Figma (8 seats)', 'Licencia', 'Ops', 60, 'Revisar seats sin uso antes'],
      ['Contrato alquiler oficina', 'Contrato', 'Administración', -2, 'Ejemplo de ítem vencido'],
    ],
    webhookTitle: 'Webhook de Slack',
    webhookPrompt: 'Pegá la URL del Incoming Webhook (https://hooks.slack.com/services/...)',
    webhookInvalid: 'Esa URL no parece un webhook de Slack. No se guardó nada.',
    webhookSaved: 'Webhook guardado. Siguiente paso: enviar mensaje de prueba.',
    testMessage: '✅ Vencimientos → Slack conectado correctamente.',
    testSent: 'Mensaje enviado. Revisá el canal de Slack.',
    error: 'Error: ',
    triggerOn: 'Revisión diaria activada entre las {h1} y las {h2} hs (zona horaria: {tz}).',
    triggerOff: 'Revisión diaria desactivada.', triggerNone: 'No había revisión diaria activa.',
    toastSent: '{n} aviso(s) enviados a Slack.', toastNone: 'Nada nuevo para avisar.',
    openSheet: 'Abrir planilla',
    formatApplied: 'Colores aplicados: vencidos en rojo, y en amarillo lo que vence en {n} días o menos.',
    formatAppliedNoSoon: 'Colores aplicados: vencidos en rojo.',
  },
};

const T = STRINGS[LANG] || STRINGS.en;
const INVALID_KEY = 'INVALIDA';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEBHOOK_PROPERTY = 'SLACK_WEBHOOK_URL';
const HANDLER = 'checkExpirations';
const LEGACY_HANDLERS = ['revisarVencimientos']; // trigger name used by v1

/** Fills {placeholders} in a string. */
function t_(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, function (_, k) {
    return vars && vars[k] !== undefined ? vars[k] : '';
  });
}

/* ───────────────────────── Core ───────────────────────── */

/**
 * Scans the sheet and sends ONE Slack message with every item that crossed a threshold.
 * Run by the daily trigger. Returns the number of alerts sent.
 */
function checkExpirations() {
  const webhook = getWebhook_();
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;

  const idx = indexColumns_(data[0]);
  applyHighlighting_(sheet, idx); // keeps colors correct even if columns were moved
  const today = startOfDay_(new Date());
  const alerts = [];
  const lastAlertValues = data.slice(1).map(function (r) { return [r[idx.LAST_ALERT]]; });

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = String(row[idx.ITEM] || '').trim();
    if (!item) continue;

    const base = {
      item: item,
      type: String(row[idx.TYPE] || '').trim(),
      owner: String(row[idx.OWNER] || '').trim(),
      notes: String(row[idx.NOTES] || '').trim(),
    };
    const lastKey = String(row[idx.LAST_ALERT] || '');
    const due = parseDate_(row[idx.DUE]);

    let alert, key;
    if (!due) {
      const raw = String(row[idx.DUE] || '').trim() || T.empty;
      key = INVALID_KEY + '|' + raw;
      alert = Object.assign({ bucketKey: INVALID_KEY, rawDate: raw }, base);
    } else {
      const daysLeft = Math.round((due - today) / MS_PER_DAY);
      // First matching threshold. Missed runs or late-added items still get alerted:
      // it doesn't depend on hitting the exact day.
      const bucket = CONFIG.BUCKETS.find(function (b) { return daysLeft <= b.max; });
      if (!bucket) continue;
      // The key includes the date: renewing (changing the date) resets alerts automatically.
      key = bucket.key + '|' + formatIso_(due);
      alert = Object.assign({ bucketKey: bucket.key, due: due, daysLeft: daysLeft }, base);
    }

    if (lastKey === key) continue; // already alerted for this threshold
    alerts.push(alert);
    lastAlertValues[i - 1][0] = key;
  }

  if (!alerts.length) {
    console.log('No new alerts.');
    return 0;
  }

  // If Slack fails this throws and NOTHING is marked: it retries on the next run.
  sendToSlack_(webhook, buildMessage_(alerts, today, sheetUrl_(sheet)));
  sheet.getRange(2, idx.LAST_ALERT + 1, lastAlertValues.length, 1).setValues(lastAlertValues);
  console.log('Alerts sent: ' + alerts.length);
  return alerts.length;
}

/** v1 compatibility: keeps triggers created with the old name working. */
function revisarVencimientos() {
  return checkExpirations();
}

/* ───────────────────────── Message ───────────────────────── */

function buildMessage_(alerts, today, sheetUrl) {
  const order = CONFIG.BUCKETS.map(function (b) { return b.key; }).concat([INVALID_KEY]);
  const lines = ['*' + T.title + ' — ' + formatDisplay_(today) + '*'];

  order.forEach(function (key) {
    const group = alerts.filter(function (a) { return a.bucketKey === key; });
    if (!group.length) return;
    group.sort(function (a, b) { return (a.daysLeft || 0) - (b.daysLeft || 0); });
    lines.push('', '*' + (T.bucketLabels[key] || key) + '*');
    group.forEach(function (a) { lines.push('• ' + formatAlert_(a)); });
  });

  if (sheetUrl) lines.push('', '<' + sheetUrl + '|📄 ' + T.openSheet + '>');
  return lines.join('\n');
}

function formatAlert_(a) {
  const parts = ['*' + escape_(a.item) + '*' + (a.type ? ' (' + escape_(a.type) + ')' : '')];
  if (a.bucketKey === INVALID_KEY) {
    parts.push(t_(T.invalidValue, { v: escape_(a.rawDate) }));
  } else {
    parts.push(describeDays_(a.daysLeft) + ' (' + formatDisplay_(a.due) + ')');
  }
  if (a.owner) parts.push(mention_(a.owner));
  if (a.notes) parts.push('_' + escape_(a.notes) + '_');
  return parts.join(' — ');
}

function describeDays_(n) {
  if (n < -1) return t_(T.overdueMany, { n: -n });
  if (n === -1) return T.overdueOne;
  if (n === 0) return T.dueToday;
  if (n === 1) return T.dueTomorrow;
  return t_(T.dueMany, { n: n });
}

/** Comma-separated Slack member IDs (U0123ABCD) become @mentions; anything else is plain text. */
function mention_(value) {
  return value.split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean)
    .map(function (s) { return /^[UW][A-Z0-9]{8,}$/.test(s) ? '<@' + s + '>' : escape_(s); })
    .join(' ');
}

function escape_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ───────────────────────── Slack ───────────────────────── */

function sendToSlack_(webhook, text) {
  const res = UrlFetchApp.fetch(webhook, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error(t_(T.errSlack, { code: code, body: res.getContentText() }));
  }
}

function getWebhook_() {
  const url = PropertiesService.getScriptProperties().getProperty(WEBHOOK_PROPERTY);
  if (!isValidWebhook_(url)) throw new Error(T.errNoWebhook);
  return url;
}

function isValidWebhook_(url) {
  return typeof url === 'string' && url.indexOf('https://hooks.slack.com/services/') === 0;
}

/* ───────────────────────── Sheet & dates ───────────────────────── */

function getSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(T.sheetName);
  if (!sheet) throw new Error(t_(T.errNoSheet, { s: T.sheetName }));
  return sheet;
}

/** Direct link to the expirations tab. */
function sheetUrl_(sheet) {
  return SpreadsheetApp.getActive().getUrl() + '#gid=' + sheet.getSheetId();
}

const HIGHLIGHT_COLORS = {
  overdue: { background: '#F4CCCC', font: '#990000' },
  soon: { background: '#FFF2CC', font: '#7F6000' },
};

/**
 * Colors whole rows by due date: red if overdue, yellow if due within HIGHLIGHT_SOON_DAYS.
 * Replaces only the rules this script created; your own conditional formats are kept.
 * Formulas avoid commas so they work with any spreadsheet locale.
 */
function applyHighlighting_(sheet, idx) {
  const col = columnLetter_(idx.DUE + 1);
  const range = sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), sheet.getLastColumn());
  const d = '$' + col + '2';
  const overdueFormula = '=(' + d + '<TODAY())*(' + d + '<>"")';
  const soonFormula = '=(' + d + '>=TODAY())*(' + d + '<=TODAY()+' + CONFIG.HIGHLIGHT_SOON_DAYS + ')';

  const ours = function (rule) {
    const c = rule.getBooleanCondition && rule.getBooleanCondition();
    const v = c && c.getCriteriaValues && c.getCriteriaValues();
    return !!(v && v.length && /TODAY\(\)/.test(String(v[0])) && /^=\(\$[A-Z]+2(<|>=)TODAY\(\)\)/.test(String(v[0])));
  };
  const rules = sheet.getConditionalFormatRules().filter(function (r) { return !ours(r); });

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(overdueFormula)
    .setBackground(HIGHLIGHT_COLORS.overdue.background)
    .setFontColor(HIGHLIGHT_COLORS.overdue.font)
    .setRanges([range]).build());
  if (CONFIG.HIGHLIGHT_SOON_DAYS > 0) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(soonFormula)
      .setBackground(HIGHLIGHT_COLORS.soon.background)
      .setFontColor(HIGHLIGHT_COLORS.soon.font)
      .setRanges([range]).build());
  }
  sheet.setConditionalFormatRules(rules);
}

function columnLetter_(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Finds columns by header name, so column order doesn't matter. */
function indexColumns_(headerRow) {
  const headers = headerRow.map(function (h) { return String(h).trim(); });
  const idx = {};
  const missing = [];
  Object.keys(T.columns).forEach(function (k) {
    const i = headers.indexOf(T.columns[k]);
    if (i === -1) missing.push(T.columns[k]);
    idx[k] = i;
  });
  if (missing.length) throw new Error(t_(T.errMissingCols, { c: missing.join(', ') }));
  return idx;
}

/**
 * Accepts date-formatted cells, or text: yyyy-mm-dd always;
 * slash dates as dd/mm/yyyy (es) or mm/dd/yyyy (en).
 */
function parseDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return isNaN(value.getTime()) ? null : startOfDay_(value);
  }
  const s = String(value || '').trim();
  let y, m, d, match;
  if ((match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    y = +match[1]; m = +match[2]; d = +match[3];
  } else if ((match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    y = +match[3];
    if (LANG === 'es') { d = +match[1]; m = +match[2]; } else { m = +match[1]; d = +match[2]; }
  } else {
    return null;
  }
  const date = new Date(y, m - 1, d);
  // Reject impossible dates (Feb 31) instead of rolling into the next month.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function startOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatIso_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatDisplay_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), T.dateFormat);
}

/* ───────────────────────── Menu & setup ───────────────────────── */

function onOpen() {
  const m = T.menuItems;
  SpreadsheetApp.getUi()
    .createMenu(T.menu)
    .addItem(m[0], 'createSampleSheet')
    .addItem(m[1], 'configureWebhook')
    .addItem(m[2], 'sendTestMessage')
    .addItem(m[3], 'enableDailyCheck')
    .addSeparator()
    .addItem(m[4], 'menuCheckNow')
    .addItem(m[5], 'disableDailyCheck')
    .addItem(m[6], 'applyColors')
    .addToUi();
}

function createSampleSheet() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  if (ss.getSheetByName(T.sheetName)) {
    ui.alert(t_(T.sheetExists, { s: T.sheetName }));
    return;
  }
  const sheet = ss.insertSheet(T.sheetName);
  const c = T.columns;
  const today = startOfDay_(new Date());
  const rows = [[c.ITEM, c.TYPE, c.OWNER, c.DUE, c.NOTES, c.LAST_ALERT]].concat(
    T.samples.map(function (s) {
      return [s[0], s[1], s[2], new Date(today.getTime() + s[3] * MS_PER_DAY), s[4], ''];
    })
  );
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  sheet.getRange('D2:D').setNumberFormat(T.sheetDateFormat);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, rows[0].length);
  sheet.getRange('F1').setNote(T.lastAlertNote);
  applyHighlighting_(sheet, indexColumns_(rows[0]));
  ui.alert(T.sheetCreated);
}

function configureWebhook() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt(T.webhookTitle, T.webhookPrompt, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const url = res.getResponseText().trim();
  if (!isValidWebhook_(url)) {
    ui.alert(T.webhookInvalid);
    return;
  }
  PropertiesService.getScriptProperties().setProperty(WEBHOOK_PROPERTY, url);
  ui.alert(T.webhookSaved);
}

function sendTestMessage() {
  const ui = SpreadsheetApp.getUi();
  try {
    sendToSlack_(getWebhook_(), T.testMessage);
    ui.alert(T.testSent);
  } catch (e) {
    ui.alert(T.error + e.message);
  }
}

function enableDailyCheck() {
  removeTriggers_();
  ScriptApp.newTrigger(HANDLER).timeBased().everyDays(1).atHour(CONFIG.TRIGGER_HOUR).create();
  SpreadsheetApp.getUi().alert(t_(T.triggerOn, {
    h1: CONFIG.TRIGGER_HOUR, h2: CONFIG.TRIGGER_HOUR + 1, tz: Session.getScriptTimeZone(),
  }));
}

function disableDailyCheck() {
  SpreadsheetApp.getUi().alert(removeTriggers_() ? T.triggerOff : T.triggerNone);
}

/** Applies the red/yellow row colors to an existing sheet right away. */
function applyColors() {
  try {
    const sheet = getSheet_();
    applyHighlighting_(sheet, indexColumns_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]));
    SpreadsheetApp.getUi().alert(CONFIG.HIGHLIGHT_SOON_DAYS > 0
      ? t_(T.formatApplied, { n: CONFIG.HIGHLIGHT_SOON_DAYS }) : T.formatAppliedNoSoon);
  } catch (e) {
    SpreadsheetApp.getUi().alert(T.error + e.message);
  }
}

function menuCheckNow() {
  try {
    const n = checkExpirations();
    SpreadsheetApp.getActive().toast(n ? t_(T.toastSent, { n: n }) : T.toastNone);
  } catch (e) {
    SpreadsheetApp.getUi().alert(T.error + e.message);
  }
}

/** Removes this script's daily triggers, including ones created by v1. */
function removeTriggers_() {
  const names = [HANDLER].concat(LEGACY_HANDLERS);
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (names.indexOf(tr.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(tr);
      n++;
    }
  });
  return n;
}
