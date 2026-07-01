import { useState } from 'react';
import { FileText, Upload, Trash2, Edit3, Save, X, File, Bold, Italic, List, ListOrdered, Link, Image, Code, Heading1, Heading2, Heading3, Quote, Eye } from 'lucide-react';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { equipmentAPI } from '../services/api';

/**
 * @module EquipmentInstructions
 * @description Компонент для управления инструкциями оборудования (PDF и Markdown)
 */
function EquipmentInstructions({ equipmentId, instructionPdf, instructionMd, onUpdate }) {
  const { can, canEdit } = useAuth();
  const [activeTab, setActiveTab] = useState(instructionPdf ? 'pdf' : 'md');
  const [mdContent, setMdContent] = useState(instructionMd || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const canViewInstructions = can('instructions');
  const canEditInstructions = canEdit('instructions');

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
      await equipmentAPI.updateInstructionMd(equipmentId, mdContent);
      
      toast.success('Успех', 'Markdown инструкция сохранена');
      setIsEditing(false);
      setShowPreview(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error saving MD:', err);
      toast.error('Ошибка', 'Не удалось сохранить Markdown');
    } finally {
      setSaving(false);
    }
  };

  const insertMarkdown = (before, after = '') => {
    const textarea = document.querySelector('.md-editor-textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = mdContent.substring(start, end);
    const newText = mdContent.substring(0, start) + before + selectedText + after + mdContent.substring(end);
    
    setMdContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const renderMarkdown = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    let inOrderedList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (inList && !line.startsWith('- ')) {
        html += '</ul>';
        inList = false;
      }
      if (inOrderedList && !line.match(/^\d+\. /)) {
        html += '</ol>';
        inOrderedList = false;
      }
      
      if (line.startsWith('# ')) {
        html += `<h1>${escapeHtml(line.slice(2))}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
      } else if (line.startsWith('### ')) {
        html += `<h3>${escapeHtml(line.slice(4))}</h3>`;
      } else if (line.startsWith('#### ')) {
        html += `<h4>${escapeHtml(line.slice(5))}</h4>`;
      } else if (line.startsWith('- ')) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${processInline(line.slice(2))}</li>`;
      } else if (line.match(/^\d+\. /)) {
        if (!inOrderedList) { html += '<ol>'; inOrderedList = true; }
        html += `<li>${processInline(line.replace(/^\d+\. /, ''))}</li>`;
      } else if (line.startsWith('> ')) {
        html += `<blockquote>${processInline(line.slice(2))}</blockquote>`;
      } else if (line.startsWith('```')) {
        html += `<pre><code>${escapeHtml(line.slice(3))}</code></pre>`;
      } else if (line.startsWith('---') || line.startsWith('***')) {
        html += '<hr />';
      } else if (line.trim() === '') {
        html += '<br />';
      } else {
        html += `<p>${processInline(line)}</p>`;
      }
    }
    
    if (inList) html += '</ul>';
    if (inOrderedList) html += '</ol>';
    
    return html;
  };

  const escapeHtml = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const processInline = (text) => {
    let result = escapeHtml(text);
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    result = result.replace(/`(.+?)`/g, '<code>$1</code>');
    result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" style="max-width:100%" />');
    return result;
  };

  const hasPdf = !!instructionPdf;
  const hasMd = !!instructionMd;

  if (!canViewInstructions) {
    return null;
  }

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
            <div className="pdf-file-card-simple">
              <div className="pdf-file-top">
                <div className="pdf-file-icon-simple">
                  <FileText size={32} />
                </div>
                <div className="pdf-file-text">
                  <div className="pdf-file-title">Инструкция.pdf</div>
                  <div className="pdf-file-subtitle">PDF документ</div>
                </div>
              </div>
              <div className="pdf-file-buttons">
                <a
                  href={`/uploads/${instructionPdf}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  <FileText size={14} />
                  Открыть PDF
                </a>
                {canEditInstructions && (
                  <button
                    onClick={handlePdfDelete}
                    className="btn btn-danger"
                  >
                    <Trash2 size={14} />
                    Удалить
                  </button>
                )}
              </div>
            </div>
          ) : (
            canEditInstructions ? (
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
            ) : (
              <div className="md-empty">
                <p>PDF инструкция не загружена</p>
              </div>
            )
          )}
        </div>
      )}

      {activeTab === 'md' && (
        <div className="instruction-content">
          {hasMd && !isEditing ? (
            <div className="md-viewer">
              <div className="md-content-rendered" dangerouslySetInnerHTML={{ __html: renderMarkdown(mdContent) }} />
              {canEditInstructions && (
                <div className="md-viewer-actions">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit3 size={14} />
                    Редактировать
                  </button>
                </div>
              )}
            </div>
          ) : !hasMd && !isEditing ? (
            canEditInstructions ? (
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
            ) : (
              <div className="md-empty">
                <p>Markdown инструкция не создана</p>
              </div>
            )
          ) : null}
        </div>
      )}

      {/* Markdown Editor Modal */}
      {isEditing && (
        <div className="md-editor-modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="md-editor-modal" onClick={e => e.stopPropagation()}>
            <div className="md-editor-header">
              <h3>
                <Edit3 size={18} />
                Редактор Markdown инструкции
              </h3>
              <div className="md-editor-header-actions">
                <button
                  className={`btn btn-sm ${showPreview ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye size={14} />
                  {showPreview ? 'Редактор' : 'Превью'}
                </button>
                <button className="btn-icon" onClick={() => setIsEditing(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {!showPreview && (
              <div className="md-editor-toolbar">
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('**', '**')} title="Жирный">
                  <Bold size={16} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('*', '*')} title="Курсив">
                  <Italic size={16} />
                </button>
                <div className="toolbar-separator" />
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('# ')} title="Заголовок 1">
                  <Heading1 size={16} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('## ')} title="Заголовок 2">
                  <Heading2 size={16} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('### ')} title="Заголовок 3">
                  <Heading3 size={16} />
                </button>
                <div className="toolbar-separator" />
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('- ')} title="Маркированный список">
                  <List size={16} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('1. ')} title="Нумерованный список">
                  <ListOrdered size={16} />
                </button>
                <div className="toolbar-separator" />
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('> ')} title="Цитата">
                  <Quote size={16} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('`', '`')} title="Код">
                  <Code size={16} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('[', '](url)')} title="Ссылка">
                  <Link size={16} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('![', '](url)')} title="Изображение">
                  <Image size={16} />
                </button>
              </div>
            )}

            <div className="md-editor-body">
              {!showPreview ? (
                <textarea
                  className="md-editor-textarea"
                  value={mdContent}
                  onChange={(e) => setMdContent(e.target.value)}
                  placeholder="# Заголовок инструкции&#10;&#10;Введите текст инструкции в формате Markdown...&#10;&#10;**Советы:**&#10;- Используйте **жирный** для акцентов&#10;- Используйте # для заголовков&#10;- Используйте - для списков"
                />
              ) : (
                <div className="md-preview">
                <div
                  className="md-preview-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(mdContent) }}
                />
              </div>
              )}
            </div>

            <div className="md-editor-footer">
              <div className="md-editor-hints">
                <span><strong>**жирный**</strong></span>
                <span><em>*курсив*</em></span>
                <span><code>`код`</code></span>
                <span># заголовок</span>
                <span>- список</span>
                <span>&gt; цитата</span>
              </div>
              <div className="md-editor-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setShowPreview(false);
                    setMdContent(instructionMd || '');
                  }}
                >
                  Отмена
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleMdSave}
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentInstructions;
