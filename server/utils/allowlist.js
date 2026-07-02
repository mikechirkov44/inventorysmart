function pickAllowed(data, allowedFields) {
  const result = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result;
}

module.exports = { pickAllowed };
