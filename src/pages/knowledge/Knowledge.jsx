import { useState, useEffect, useRef } from 'react';
import { documentService, knowledgeBaseService } from '../../services';
import {
  RiUploadLine, RiFilePdfLine, RiFileWordLine, RiFileTextLine,
  RiDeleteBinLine, RiSearchLine, RiCheckLine, RiLoader4Line,
  RiAlertLine, RiAddLine, RiFolderLine, RiEyeLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import './Knowledge.css';

const FILE_ICONS = { pdf: RiFilePdfLine, docx: RiFileWordLine, txt: RiFileTextLine };
const STATUS_CONFIG = {
  uploading: { label: 'Uploading...', color: 'info', icon: RiLoader4Line },
  extracting: { label: 'Extracting text...', color: 'info', icon: RiLoader4Line },
  chunking: { label: 'Chunking...', color: 'info', icon: RiLoader4Line },
  embedding: { label: 'Creating embeddings...', color: 'warning', icon: RiLoader4Line },
  indexing: { label: 'Indexing...', color: 'warning', icon: RiLoader4Line },
  ready: { label: 'Ready', color: 'success', icon: RiCheckLine },
  failed: { label: 'Failed', color: 'danger', icon: RiAlertLine },
};

export default function Knowledge() {
  const [documents, setDocuments] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKB, setSelectedKB] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [showCreateKB, setShowCreateKB] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    loadData();
    return () => clearInterval(pollingRef.current);
  }, []);

  // Poll for processing status
  useEffect(() => {
    const processing = documents.filter(d => !['ready', 'failed'].includes(d.status));
    if (processing.length > 0) {
      pollingRef.current = setInterval(pollProcessing, 3000);
    } else {
      clearInterval(pollingRef.current);
    }
    return () => clearInterval(pollingRef.current);
  }, [documents]);

  async function loadData() {
    setLoading(true);
    try {
      const [docsRes, kbsRes] = await Promise.all([
        documentService.getAll(),
        knowledgeBaseService.getAll(),
      ]);
      setDocuments(docsRes.data.data);
      setKnowledgeBases(kbsRes.data.data);
    } catch {} finally { setLoading(false); }
  }

  async function pollProcessing() {
    const processing = documents.filter(d => !['ready', 'failed'].includes(d.status));
    if (!processing.length) return;
    try {
      const updates = await Promise.all(processing.map(d => documentService.getStatus(d._id)));
      setDocuments(prev => prev.map(doc => {
        const update = updates.find(u => u.data.data._id === doc._id);
        return update ? { ...doc, ...update.data.data } : doc;
      }));
    } catch {}
  }

  const handleUpload = async (files) => {
    if (!files?.length) return;
    const file = files[0];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      toast.error('Only PDF, DOCX, and TXT files are supported.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    if (selectedKB !== 'all') formData.append('knowledgeBaseId', selectedKB);

    try {
      const { data } = await documentService.upload(formData, (e) => {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      toast.success('Document uploaded! Processing in background...');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}" and all its chunks?`)) return;
    try {
      await documentService.delete(id);
      setDocuments(prev => prev.filter(d => d._id !== id));
      toast.success('Document deleted');
    } catch { toast.error('Failed to delete document'); }
  };

  const handleCreateKB = async () => {
    if (!newKBName.trim()) return;
    try {
      await knowledgeBaseService.create({ name: newKBName });
      setNewKBName('');
      setShowCreateKB(false);
      const { data } = await knowledgeBaseService.getAll();
      setKnowledgeBases(data.data);
      toast.success('Knowledge base created');
    } catch { toast.error('Failed to create knowledge base'); }
  };

  const filtered = documents.filter(d => {
    const matchesKB = selectedKB === 'all' || d.knowledgeBaseId?._id === selectedKB || d.knowledgeBaseId === selectedKB;
    const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchesKB && matchesSearch;
  });

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="knowledge-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Knowledge Center</h1>
            <p>{documents.filter(d => d.status === 'ready').length} documents ready · {documents.reduce((s, d) => s + (d.chunksCount || 0), 0)} chunks indexed</p>
          </div>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <RiUploadLine /> Upload Document
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
        </div>
      </div>

      <div className="knowledge-layout">
        {/* KB Sidebar */}
        <div className="kb-sidebar">
          <div className="kb-sidebar-header">
            <span>Knowledge Bases</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowCreateKB(v => !v)} title="Create KB">
              <RiAddLine />
            </button>
          </div>

          {showCreateKB && (
            <div className="kb-create">
              <input
                className="form-input"
                placeholder="Knowledge base name..."
                value={newKBName}
                onChange={e => setNewKBName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateKB()}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleCreateKB}>Create</button>
            </div>
          )}

          <button className={`kb-item ${selectedKB === 'all' ? 'active' : ''}`} onClick={() => setSelectedKB('all')}>
            <RiFolderLine /> All Documents
            <span className="kb-count">{documents.length}</span>
          </button>
          {knowledgeBases.map(kb => (
            <button key={kb._id} className={`kb-item ${selectedKB === kb._id ? 'active' : ''}`} onClick={() => setSelectedKB(kb._id)}>
              <RiFolderLine style={{ color: kb.color }} /> {kb.name}
              <span className="kb-count">{kb.documentsCount}</span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="knowledge-main">
          {/* Upload Zone */}
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="upload-progress">
                <RiLoader4Line className="spin" />
                <span>Uploading... {uploadProgress}%</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <RiUploadLine className="upload-icon" />
                <p><strong>Drop files here</strong> or click to browse</p>
                <span>PDF, DOCX, TXT · Max 50MB</span>
              </>
            )}
          </div>

          {/* Search */}
          <div className="knowledge-search">
            <RiSearchLine />
            <input
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Document List */}
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8, borderRadius: 10 }} />
            ))
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><RiFileTextLine /></div>
              <h3>No documents yet</h3>
              <p>Upload your first document to start building your company's AI knowledge base.</p>
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                <RiUploadLine /> Upload Document
              </button>
            </div>
          ) : (
            <div className="document-list">
              {filtered.map(doc => {
                const Icon = FILE_ICONS[doc.fileType] || RiFileTextLine;
                const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.ready;
                const StatusIcon = status.icon;
                return (
                  <div key={doc._id} className="document-card">
                    <div className={`doc-file-icon ${doc.fileType}`}>
                      <Icon />
                    </div>
                    <div className="doc-info">
                      <div className="doc-name">{doc.name}</div>
                      <div className="doc-meta">
                        <span>{formatSize(doc.fileSize)}</span>
                        {doc.chunksCount > 0 && <span>· {doc.chunksCount} chunks</span>}
                        {doc.wordCount > 0 && <span>· {doc.wordCount.toLocaleString()} words</span>}
                        {doc.knowledgeBaseId?.name && <span>· {doc.knowledgeBaseId.name}</span>}
                      </div>
                    </div>
                    <div className={`doc-status badge badge-${status.color}`}>
                      <StatusIcon className={['uploading','extracting','chunking','embedding','indexing'].includes(doc.status) ? 'spin' : ''} />
                      {status.label}
                    </div>
                    <div className="doc-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => handleDelete(doc._id, doc.name)}>
                        <RiDeleteBinLine />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
