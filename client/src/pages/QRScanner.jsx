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

      {!scanning && (
        <div className="qr-animated-wrap">
          <div className="qr-animated">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="10" width="50" height="50" rx="2" stroke="var(--gray-800)" strokeWidth="6" fill="none"/>
              <rect x="20" y="20" width="30" height="30" rx="1" fill="var(--gray-800)"/>
              <rect x="140" y="10" width="50" height="50" rx="2" stroke="var(--gray-800)" strokeWidth="6" fill="none"/>
              <rect x="150" y="20" width="30" height="30" rx="1" fill="var(--gray-800)"/>
              <rect x="10" y="140" width="50" height="50" rx="2" stroke="var(--gray-800)" strokeWidth="6" fill="none"/>
              <rect x="20" y="150" width="30" height="30" rx="1" fill="var(--gray-800)"/>
              <rect x="70" y="10" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="90" y="10" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="110" y="10" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="70" y="30" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="100" y="30" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="70" y="50" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="90" y="50" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="120" y="50" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="10" y="70" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="30" y="70" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="50" y="70" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="80" y="70" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="110" y="70" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="140" y="70" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="170" y="70" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="10" y="90" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="40" y="90" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="70" y="90" width="20" height="20" rx="1" fill="var(--gray-800)"/>
              <rect x="100" y="90" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="130" y="90" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="160" y="90" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="20" y="110" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="50" y="110" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="100" y="110" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="120" y="110" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="150" y="110" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="180" y="110" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="70" y="120" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="110" y="130" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="140" y="130" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="170" y="130" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="80" y="140" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="100" y="140" width="20" height="10" fill="var(--gray-800)"/>
              <rect x="140" y="150" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="160" y="150" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="180" y="150" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="80" y="160" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="110" y="160" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="80" y="180" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="100" y="180" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="130" y="170" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="160" y="180" width="10" height="10" fill="var(--gray-800)"/>
              <rect x="180" y="180" width="10" height="10" fill="var(--gray-800)"/>
            </svg>
            <div className="qr-scan-line"></div>
            <div className="qr-corners">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>
      )}

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
