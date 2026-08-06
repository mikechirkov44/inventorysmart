const METRICS = [
  { id: 'totalPlanned', label: 'Запланировано работ' },
  { id: 'totalCompleted', label: 'Выполнено работ' },
  { id: 'duePassed', label: 'Работ с наступившим сроком' },
  { id: 'onTime', label: 'Выполнено в срок' },
  { id: 'overdue', label: 'Просрочено' },
  { id: 'completedLate', label: 'Выполнено с опозданием' },
  { id: 'neverCompleted', label: 'Не выполнено' },
];

const METRIC_IDS = new Set(METRICS.map((metric) => metric.id));
const OPERATORS = new Set(['+', '-', '*', '/']);
const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2 };

function normalizeConfig(value) {
  const config = value && typeof value === 'object' ? value : {};
  return {
    enabled: config.enabled === true,
    tokens: Array.isArray(config.tokens) ? config.tokens : [],
    thresholds: Array.isArray(config.thresholds) ? config.thresholds : [],
  };
}

function validateConfig(value) {
  const config = normalizeConfig(value);
  if (config.tokens.length > 100) throw new Error('Формула слишком длинная');
  let balance = 0;
  let expectValue = true;
  config.tokens.forEach((token) => {
    if (!token || typeof token !== 'object') throw new Error('Некорректный элемент формулы');
    if (token.type === 'metric') {
      if (!expectValue || !METRIC_IDS.has(token.value)) throw new Error('Некорректный показатель в формуле');
      expectValue = false;
    } else if (token.type === 'number') {
      if (!expectValue || !Number.isFinite(Number(token.value))) throw new Error('Некорректное число в формуле');
      expectValue = false;
    } else if (token.type === 'operator') {
      if (expectValue || !OPERATORS.has(token.value)) throw new Error('Некорректная математическая операция');
      expectValue = true;
    } else if (token.type === 'paren' && token.value === '(') {
      if (!expectValue) throw new Error('Перед скобкой нужна операция');
      balance += 1;
    } else if (token.type === 'paren' && token.value === ')') {
      if (expectValue || balance === 0) throw new Error('Некорректная закрывающая скобка');
      balance -= 1;
      expectValue = false;
    } else if (token.type === 'suffix' && token.value === '%') {
      if (expectValue) throw new Error('Знак процента должен стоять после значения');
    } else {
      throw new Error('Недопустимый элемент формулы');
    }
  });
  if (config.tokens.length && (expectValue || balance !== 0)) throw new Error('Формула не завершена');
  if (config.enabled && config.tokens.length === 0) throw new Error('Добавьте элементы формулы KPI');

  const thresholds = config.thresholds.map((item) => ({
    from: Number(item.from),
    payout: Number(item.payout),
  }));
  if (thresholds.some((item) => !Number.isFinite(item.from) || !Number.isFinite(item.payout))) {
    throw new Error('Некорректная шкала KPI');
  }
  return { ...config, thresholds: thresholds.sort((a, b) => b.from - a.from) };
}

function evaluate(configValue, values) {
  const config = validateConfig(configValue);
  if (!config.enabled || config.tokens.length === 0) return null;
  const output = [];
  const operators = [];
  config.tokens.forEach((token) => {
    if (token.type === 'metric' || token.type === 'number') output.push(token);
    if (token.type === 'suffix') output.push(token);
    if (token.type === 'operator') {
      while (operators.length && OPERATORS.has(operators.at(-1).value)
        && PRECEDENCE[operators.at(-1).value] >= PRECEDENCE[token.value]) output.push(operators.pop());
      operators.push(token);
    }
    if (token.type === 'paren' && token.value === '(') operators.push(token);
    if (token.type === 'paren' && token.value === ')') {
      while (operators.length && operators.at(-1).value !== '(') output.push(operators.pop());
      operators.pop();
    }
  });
  while (operators.length) output.push(operators.pop());
  const stack = [];
  output.forEach((token) => {
    if (token.type === 'metric') stack.push(Number(values[token.value]) || 0);
    else if (token.type === 'number') stack.push(Number(token.value));
    else if (token.type === 'suffix') {
      // KPI already returns a percentage score; this postfix node is a visual unit marker.
    }
    else {
      const right = stack.pop();
      const left = stack.pop();
      if (token.value === '+') stack.push(left + right);
      if (token.value === '-') stack.push(left - right);
      if (token.value === '*') stack.push(left * right);
      if (token.value === '/') stack.push(right === 0 ? 0 : left / right);
    }
  });
  const score = Math.round((stack[0] || 0) * 100) / 100;
  const matched = config.thresholds.find((item) => score >= item.from);
  return { score, payout: matched ? matched.payout : 0 };
}

module.exports = { METRICS, normalizeConfig, validateConfig, evaluate };
