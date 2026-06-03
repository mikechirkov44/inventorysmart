/**
 * @fileoverview Страница импорта оборудования из Excel.
 * Позволяет скачать шаблон, загрузить файл и импортировать
 * данные оборудования в систему.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { importAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

/** Компонент импорта из Excel */
function ImportExcel() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importedCount, setImportedCount] = useState(0);

  const toast = useToast();
  const confirm = useConfirm();

  /** Обработка выбора файла */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  /** Отправка файла на сервер для импорта */
  const handleImport = async () => {
    if (!file) {
      setError('Выберите файл для импорта');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await importAPI.importExcel(formData);
      toast.success(response.data.message);
      setImportedCount(response.data.equipment.length);
      setFile(null);
      
      const fileInput = document.getElementById('excel-file');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      toast.error('Ошибка импорта: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  /** Скачивание шаблона Excel */
  const handleDownloadTemplate = async () => {
    try {
      const response = await importAPI.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'equipment_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Ошибка скачивания шаблона');
    }
  };

  return (
    <div className="import-excel">
      <div className="header">
        <h1>Импорт из Excel</h1>
        <Link to="/" className="btn">← Назад</Link>
      </div>

      <div className="import-content">
        {/* Секция шаблона для скачивания */}
        <div className="template-section">
          <h3>Шаблон для импорта</h3>
          <p>Скачайте шаблон и заполните его данными об оборудовании.</p>
          <button onClick={handleDownloadTemplate} className="btn btn-primary">
            Скачать шаблон
          </button>
          
          <div className="template-info">
            <h4>Формат шаблона:</h4>
            <ul>
              <li><strong>Наименование</strong> - название оборудования</li>
              <li><strong>Инвентарный номер</strong> - уникальный номер</li>
              <li><strong>Описание</strong> - описание оборудования</li>
              <li><strong>Расположение</strong> - место установки</li>
              <li><strong>Категория</strong> - категория оборудования</li>
              <li><strong>Работы</strong> - через запятую (например: "Замена масла, Проверка фильтров")</li>
            </ul>
          </div>
        </div>

        {/* Секция загрузки файла */}
        <div className="upload-section">
          <h3>Загрузка файла</h3>
          <div className="file-upload">
            <input
              type="file"
              id="excel-file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
            />
            {file && (
              <div className="file-info">
                <p>Выбран файл: {file.name}</p>
                <p>Размер: {(file.size / 1024).toFixed(2)} КБ</p>
              </div>
            )}
          </div>
          
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="btn btn-primary"
          >
            {loading ? 'Импорт...' : 'Импортировать'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {success && (
          <div className="success">
            {success}
            <p>Перейти к <Link to="/">списку оборудования</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportExcel;