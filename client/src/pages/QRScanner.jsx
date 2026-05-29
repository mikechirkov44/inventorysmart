import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

function QRScanner() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => { tryStop(); };
  }, []);

  function tryStop() {
    const s = scannerRef.current;
    if (!s) return;
    scannerRef.current = null;
    try { s.stop().catch(() => {}); } catch (_) {}
  }

  async function startScanner() {
    setError(null);
    try {
      const el = document.getElementById('qr-reader');
      if (!el) return;
      el.innerHTML = '';

      const qr = new Html5Qrcode("qr-reader");
      scannerRef.current = qr;
      busyRef.current = false;

      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onDecoded,
        () => {}
      );
      setScanning(true);
    } catch (err) {
      setError('Не удалось запустить камеру: ' + err.message);
      setScanning(false);
    }
  }

  function onDecoded(decodedText) {
    if (busyRef.current) return;
    busyRef.current = true;

    const raw = decodedText || '';
    let code = raw;

    const m = raw.match(/\/scan\/([a-f0-9-]+)/i);
    if (m) code = m[1];

    tryStop();
    setScanning(false);

    setTimeout(() => {
      navigate(`/scan/${code}`);
    }, 100);
  }

  function stopScanner() {
    tryStop();
    setScanning(false);
  }

  function handleManualInput(e) {
    e.preventDefault();
    const v = manualInput.trim();
    if (v) navigate(`/scan/${v}`);
  }

  return (
    <div className="qr-scanner">
      <h1>Сканирование QR-кода</h1>

      <div className="scanner-container">
        <div id="qr-reader"></div>

        {scanning ? (
          <button onClick={stopScanner} className="btn btn-danger">Остановить</button>
        ) : (
          <button onClick={startScanner} className="btn btn-primary">Начать сканирование</button>
        )}

        {error && <div className="error">{error}</div>}
      </div>

      <div className="manual-input">
        <h3>Ручной ввод</h3>
        <form onSubmit={handleManualInput}>
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="QR-код, ID или инв. номер оборудования"
          />
          <button type="submit" className="btn">Найти</button>
        </form>
      </div>
    </div>
  );
}

export default QRScanner;
