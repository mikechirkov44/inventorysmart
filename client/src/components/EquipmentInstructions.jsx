import { useState } from 'react';
import { FileText, Upload, Trash2, Edit3, Save, X, File } from 'lucide-react';
import { useToast } from './Toast';

/**
 * @module EquipmentInstructions
 * @description Компонент для управления инструкциями оборудования (PDF и Markdown)
 */
function EquipmentInstructions({ equipmentId, instructionPdf, instructionMd, onUpdate }) {
  const [activeTab, setActiveTab] = useState(instructionPdf ? 'pdf' : 'md');
  const [mdContent, setMdContent] = useState(instructionMd || '');
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Ошибка', 'Допустимы только PDF файлы');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Ошибка', 'Размер файла не должен превышать 20 МБ');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const { equipmentAPI } = await import('../services/api');
      await equipmentAPI.uploadInstructionPdf(equipmentId, formData);
      
      toast.success('Успех', 'PDF инструкция загружена');
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error uploading PDF:', err);
      toast.error('Ошибка', 'Не удалось загрузить PDF');
    } finally {
      setUploading(false);
    }
  };

  const handlePdfDelete = async () => {
    if (!window.confirm('Удалить PDF инструкцию?')) return;

    try {
      const { equipmentAPI } = await import('../services/api');
      await equipmentAPI.deleteInstructionPdf(equipmentId);
      
      toast.success('Успех', 'PDF инструкция удалена');
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error deleting PDF:', err);
      toast.error('Ошибка', 'Не удалось удалить PDF');
    }
  };

  const handleMdSave = async () => {
    setSaving(true);
    try {
      const { equipmentAPI } = await import('../services/api');
      await equipmentAPI.updateInstructionMd(equipmentId, mdContent);
      
      toast.success('Успех', 'Markdown инструкция сохранена');
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error saving MD:', err);
      toast.error('Ошибка', 'Не удалось сохранить Markdown');
    } finally {
      setSaving(false);
    }
  };

  const hasPdf = !!instructionPdf;
  const hasMd = !!instructionMd;

  return (
    <div className="equipment-instructions">
      <div className="instructions-header">
        <h3>
          <FileText size={18} />
          Инструкции
        </h3>
        <div className="instructions-tabs">
          <button
            className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            PDF
          </button>
          <button
            className={`tab-btn ${activeTab === 'md' ? 'active' : ''}`}
            onClick={() => setActiveTab('md')}
          >
            Markdown
          </button>
        </div>
      </div>

      {activeTab === 'pdf' && (
        <div className="instruction-content">
          {hasPdf ? (
            <div className="pdf-viewer">
              <div className="pdf-info">
                <File size={16} />
                <span>Инструкция загружена</span>
              </div>
              <div className="pdf-actions">
                <a
                  href={`/uploads/${instructionPdf}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <FileText size={14} />
                  Открыть PDF
                </a>
                <button
                  onClick={handlePdfDelete}
                  className="btn btn-danger btn-sm"
                >
                  <Trash2 size={14} />
                  Удалить
                </button>
              </div>
              <iframe
                src={`/uploads/${instructionPdf}`}
                className="pdf-iframe"
                title="PDF Инструкция"
              />
            </div>
          ) : (
            <div className="upload-area">
              <label className="upload-label">
                <Upload size={24} />
                <span>Загрузить PDF инструкцию</span>
                <span className="upload-hint">Максимум 20 МБ</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfUpload}
                  disabled={uploading}
                />
              </label>
              {uploading && <div className="upload-progress">Загрузка...</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'md' && (
        <div className="instruction-content">
          {isEditing ? (
            <div className="md-editor">
              <textarea
                value={mdContent}
                onChange={(e) => setMdContent(e.target.value)}
                placeholder="Введите инструкцию в формате Markdown..."
                className="md-textarea"
              />
              <div className="md-actions">
                <button
                  onClick={handleMdSave}
                  className="btn btn-primary btn-sm"
                  disabled={saving}
                >
                  <Save size={14} />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setMdContent(instructionMd || '');
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <X size={14} />
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="md-viewer">
              {hasMd ? (
                <>
                  <div className="md-content">
                    <pre>{mdContent}</pre>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit3 size={14} />
                    Редактировать
                  </button>
                </>
              ) : (
                <div className="md-empty">
                  <p>Markdown инструкция не создана</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-primary btn-sm"
                  >
                    <Edit3 size={14} />
                    Создать инструкцию
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EquipmentInstructions;
