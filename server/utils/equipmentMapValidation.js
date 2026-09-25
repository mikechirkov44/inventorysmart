const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class MapValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MapValidationError';
    this.statusCode = 400;
  }
}

function number(value, name, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new MapValidationError(`${name}: требуется число`);
  if (value < min || value > max) throw new MapValidationError(`${name}: значение вне границ плана`);
  return value;
}

function id(value, name) {
  if (!UUID_RE.test(String(value || ''))) throw new MapValidationError(`${name}: некорректный идентификатор`);
  return value;
}

function validateLayoutPayload(payload, bounds) {
  const width = Number(bounds?.width);
  const height = Number(bounds?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new MapValidationError('Некорректные размеры плана');
  const elements = Array.isArray(payload?.elements) ? payload.elements : [];
  const placements = Array.isArray(payload?.placements) ? payload.placements : [];
  if (elements.length > 500) throw new MapValidationError('На этаже допускается не более 500 элементов');
  if (placements.length > 2000) throw new MapValidationError('На этаже допускается не более 2000 единиц оборудования');

  const elementIds = new Set();
  const normalElements = elements.map((item, index) => {
    id(item.id, `Элемент ${index + 1}`);
    if (elementIds.has(item.id)) throw new MapValidationError('Повторный идентификатор элемента');
    elementIds.add(item.id);
    const base = { id: item.id, type: item.type, geometry: {}, style: item.style && typeof item.style === 'object' ? item.style : {}, label: String(item.label || '').slice(0, 120) };
    if (item.type === 'room') {
      base.roomId = id(item.roomId, `Помещение ${index + 1}`);
      base.geometry = {
        x: number(item.geometry?.x, 'x', 0, width), y: number(item.geometry?.y, 'y', 0, height),
        width: number(item.geometry?.width, 'width', 20, width), height: number(item.geometry?.height, 'height', 20, height),
      };
      if (base.geometry.x + base.geometry.width > width || base.geometry.y + base.geometry.height > height) throw new MapValidationError('Помещение выходит за границы плана');
    } else if (item.type === 'wall') {
      base.geometry = {
        x1: number(item.geometry?.x1, 'x1', 0, width), y1: number(item.geometry?.y1, 'y1', 0, height),
        x2: number(item.geometry?.x2, 'x2', 0, width), y2: number(item.geometry?.y2, 'y2', 0, height),
      };
    } else if (item.type === 'label') {
      base.geometry = { x: number(item.geometry?.x, 'x', 0, width), y: number(item.geometry?.y, 'y', 0, height) };
    } else {
      throw new MapValidationError(`Неподдерживаемый тип элемента: ${item.type || 'не указан'}`);
    }
    return base;
  });
  const rooms = normalElements.filter((item) => item.type === 'room');
  for (let left = 0; left < rooms.length; left += 1) {
    for (let right = left + 1; right < rooms.length; right += 1) {
      const a = rooms[left].geometry; const b = rooms[right].geometry;
      const intersects = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      if (intersects) throw new MapValidationError('Помещения не должны пересекаться');
    }
  }

  const seen = new Set();
  const normalPlacements = placements.map((item, index) => {
    const equipmentId = id(item.equipmentId, `Оборудование ${index + 1}`);
    if (seen.has(equipmentId)) throw new MapValidationError('Повторное размещение оборудования');
    seen.add(equipmentId);
    const widthValue = item.width === undefined ? 180 : number(item.width, 'width', 100, 500);
    const heightValue = item.height === undefined ? 80 : number(item.height, 'height', 60, 300);
    const x = number(item.x, 'x', 0, width);
    const y = number(item.y, 'y', 0, height);
    if (x + widthValue > width || y + heightValue > height) throw new MapValidationError('Карточка оборудования выходит за границы плана');
    return {
      equipmentId,
      x, y, width: widthValue, height: heightValue,
      rotation: typeof item.rotation === 'number' && Number.isFinite(item.rotation) ? Math.max(-360, Math.min(360, item.rotation)) : 0,
    };
  });
  return { version: Number.isInteger(payload?.version) && payload.version >= 0 ? payload.version : 0, elements: normalElements, placements: normalPlacements };
}

module.exports = { MapValidationError, validateLayoutPayload };
