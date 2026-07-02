/**
 * @fileoverview Страница QR-сканера.
 * Позволяет сканировать QR-коды оборудования с помощью камеры
 * или вводить код вручную для перехода к карточке работ.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Camera, Square, Keyboard, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import PageHeader from '../components/PageHeader';

function getQrBoxSize() {
  if (typeof window === 'undefined') return 260;
  return Math.min(300, Math.max(220, window.innerWidth - 96));
}

/** Декоративная иллюстрация до запуска камеры */
function QrIdleIllustration() {
  return (
    <div className="qr-idle-illustration" aria-hidden>
      <div className="qr-idle-glow" />
      <div className="qr-idle-frame">
        <span className="qr-corner qr-corner-tl" />
        <span className="qr-corner qr-corner-tr" />
        <span className="qr-corner qr-corner-bl" />
        <span className="qr-corner qr-corner-br" />
        <div className="qr-idle-pattern">
          <ScanLine size={52} strokeWidth={1.5} />
        </div>
        <div className="qr-idle-scanline" />
      </div>
    </div>
  );
}

/** Компонент QR-сканера */
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

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Камера не поддерживается в этом браузере. Используйте ручной ввод.');
        return;
      }

      const qr = new Html5Qrcode('qr-reader');
      scannerRef.current = qr;
      busyRef.current = false;

      const size = getQrBoxSize();
      await qr.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: size, height: size } },
        onDecoded,
        () => {}
      );
      setScanning(true);
    } catch (err) {
      console.error('Camera error:', err);
      let msg = 'неизвестная ошибка';
      if (typeof err === 'string') {
        msg = err;
      } else if (err instanceof Error) {
        msg = err.message || err.toString();
      } else if (err && typeof err === 'object') {
        msg = JSON.stringify(err);
      }
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        msg = 'Доступ к камере запрещён. Разрешите доступ в настройках браузера.';
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFound')) {
        msg = 'Камера не найдена. Подключите камеру и попробуйте снова.';
      } else if (msg.includes('NotReadableError') || msg.includes('TrackStartError')) {
        msg = 'Камера занята другим приложением.';
      }
      setError(`Не удалось запустить камеру: ${msg}`);
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
    <div className="qr-scanner-page">
      <PageHeader icon={ScanLine} title="QR-сканер" />

      <div className="qr-scanner-card">
        <div className={`qr-viewfinder ${scanning ? 'is-scanning' : ''}`}>
          {!scanning && (
            <div className="qr-viewfinder-idle">
              <QrIdleIllustration />
              <p className="qr-viewfinder-hint">Наведите камеру на QR-код оборудования</p>
            </div>
          )}

          <div id="qr-reader" className={scanning ? 'qr-reader-active' : 'qr-reader-hidden'} />

          {scanning && (
            <>
              <div className="qr-viewfinder-overlay" aria-hidden />
              <div className="qr-viewfinder-corners" aria-hidden>
                <span className="qr-corner qr-corner-tl" />
                <span className="qr-corner qr-corner-tr" />
                <span className="qr-corner qr-corner-bl" />
                <span className="qr-corner qr-corner-br" />
              </div>
              <div className="qr-scanning-badge">
                <span className="qr-scanning-dot" />
                Сканирование…
              </div>
            </>
          )}
        </div>

        <div className="qr-scanner-actions">
          {scanning ? (
            <button type="button" onClick={stopScanner} className="btn btn-danger btn-full qr-action-btn">
              <Square size={18} />
              Остановить
            </button>
          ) : (
            <button type="button" onClick={startScanner} className="btn btn-primary btn-full qr-action-btn">
              <Camera size={18} />
              Начать сканирование
            </button>
          )}
        </div>

        {error && (
          <div className="qr-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="qr-manual-card">
        <div className="qr-manual-header">
          <Keyboard size={20} />
          <div>
            <h3>Ручной ввод</h3>
            <p>QR-код, UUID или инвентарный номер</p>
          </div>
        </div>
        <form onSubmit={handleManualInput} className="qr-manual-form">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Например: EQ-00142"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={!manualInput.trim()}>
            Найти
          </button>
        </form>
      </div>

      <ul className="qr-tips">
        <li>Держите телефон на расстоянии 15–25 см от кода</li>
        <li>Убедитесь, что QR-код хорошо освещён</li>
        <li>На этикетке оборудования может быть ссылка или UUID</li>
      </ul>
    </div>
  );
}

export default QRScanner;
