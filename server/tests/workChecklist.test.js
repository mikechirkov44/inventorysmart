const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeTemplate, orderChecklist, mergeMarks, checklistReady,
} = require('../utils/workChecklist');

test('checklist template keeps non-empty lines and drops blanks', () => {
  assert.deepEqual(normalizeTemplate('Слить масло\n\n  Залить новое \n'), ['Слить масло', 'Залить новое']);
  assert.deepEqual(normalizeTemplate(['', { text: 'Проверить уровень' }]), ['Проверить уровень']);
});

test('a new order copies the template with every step open', () => {
  assert.deepEqual(orderChecklist(['Слить масло', 'Залить новое']), [
    { text: 'Слить масло', done: false },
    { text: 'Залить новое', done: false },
  ]);
});

test('marks apply only when the step texts match the order', () => {
  const current = [{ text: 'Слить масло', done: false }, { text: 'Залить новое', done: false }];
  assert.deepEqual(mergeMarks(current, [
    { text: 'Слить масло', done: true },
    { text: 'Залить новое', done: false },
  ]), [
    { text: 'Слить масло', done: true },
    { text: 'Залить новое', done: false },
  ]);
  assert.equal(mergeMarks(current, [{ text: 'Другой шаг', done: true }]), null);
});

test('an order can be completed when it has no steps or every step is marked', () => {
  assert.equal(checklistReady([]), true);
  assert.equal(checklistReady([{ text: 'Слить масло', done: true }]), true);
  assert.equal(checklistReady([{ text: 'Слить масло', done: false }]), false);
});
