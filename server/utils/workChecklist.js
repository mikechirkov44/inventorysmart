const MAX_STEPS = 30;
const MAX_TEXT = 300;

function stepText(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') return item.text;
  return '';
}

function normalizeTemplate(value) {
  let list = value;
  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (trimmed.startsWith('[')) {
      try { list = JSON.parse(trimmed); } catch (_) { list = trimmed.split(/\r?\n/); }
    } else {
      list = trimmed.split(/\r?\n/);
    }
  }
  if (!Array.isArray(list)) return [];
  const steps = [];
  for (const item of list) {
    const text = String(stepText(item) || '').trim().slice(0, MAX_TEXT);
    if (!text) continue;
    steps.push(text);
    if (steps.length >= MAX_STEPS) break;
  }
  return steps;
}

function orderChecklist(template) {
  return normalizeTemplate(template).map((text) => ({ text, done: false }));
}

function parseOrderChecklist(value) {
  let list = value;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (_) { return []; }
  }
  if (!Array.isArray(list)) return [];
  const steps = [];
  for (const item of list) {
    const text = String(stepText(item) || '').trim().slice(0, MAX_TEXT);
    if (!text) continue;
    steps.push({ text, done: Boolean(item && typeof item === 'object' && item.done) });
    if (steps.length >= MAX_STEPS) break;
  }
  return steps;
}

function mergeMarks(template, explicit) {
  const steps = orderChecklist(template);
  if (explicit == null) return steps;
  const marks = parseOrderChecklist(explicit);
  if (steps.length === 0) return marks;
  if (marks.length !== steps.length) return null;
  if (marks.some((step, index) => step.text !== steps[index].text)) return null;
  return steps.map((step, index) => ({ text: step.text, done: marks[index].done }));
}

function checklistReady(checklist) {
  return parseOrderChecklist(checklist).every((step) => step.done);
}

module.exports = {
  MAX_STEPS,
  normalizeTemplate,
  orderChecklist,
  parseOrderChecklist,
  mergeMarks,
  checklistReady,
};
