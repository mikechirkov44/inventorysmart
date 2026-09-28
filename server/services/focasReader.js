const { decodeFocasStatus } = require('../utils/monitoringTimeline');

let structReady = false;

function bindFocas(koffi, lib) {
  if (!structReady) {
    koffi.struct('Odbst', {
      hdck: 'int16',
      tmmode: 'int16',
      aut: 'int16',
      run: 'int16',
      motion: 'int16',
      mstb: 'int16',
      emergency: 'int16',
      alarm: 'int16',
      edit: 'int16',
    });
    structReady = true;
  }
  const convention = process.platform === 'win32' ? '__stdcall' : '__cdecl';
  return {
    openHandle: lib.func(convention, 'int16 cnc_allclibhndl3(const char *ip, uint16 port, long timeout, _Out_ uint16 *handle)'),
    readStatus: lib.func(convention, 'int16 cnc_statinfo(uint16 handle, _Out_ Odbst *stat)'),
    closeHandle: lib.func(convention, 'int16 cnc_freelibhndl(uint16 handle)'),
  };
}

async function readFocas(link) {
  let koffi;
  try {
    koffi = require('koffi');
  } catch {
    throw new Error('На сервере нет привязки к библиотеке Fanuc FOCAS');
  }
  const libraryPath = process.env.FOCAS_LIBRARY || '/usr/local/lib/libfwlib32.so';
  let lib;
  try {
    lib = koffi.load(libraryPath);
  } catch {
    throw new Error('Не найдена библиотека Fanuc libfwlib32. Положите её на сервер или читайте станок через MTConnect');
  }
  const { openHandle, readStatus, closeHandle } = bindFocas(koffi, lib);
  const handle = [0];
  const opened = openHandle(link.host, link.port, 3, handle);
  if (opened !== 0) throw new Error(`FOCAS не открыл соединение, код ${opened}`);
  try {
    const stat = {};
    const status = readStatus(handle[0], stat);
    if (status !== 0) throw new Error(`FOCAS не прочитал состояние, код ${status}`);
    return { value: stat.run, state: decodeFocasStatus(stat) };
  } finally {
    try { closeHandle(handle[0]); } catch { /* рукоятка уже закрыта */ }
  }
}

module.exports = { readFocas };
