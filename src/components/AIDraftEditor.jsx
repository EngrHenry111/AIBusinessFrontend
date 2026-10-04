import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  RiRobot2Line, RiFileCopyLine, RiSaveLine, RiMailSendLine, RiAttachment2, RiCloseLine,
  RiRefreshLine, RiLoader4Line, RiFilePdfLine, RiCheckLine,
} from 'react-icons/ri';
import { draftService } from '../services';
import './AIDraftEditor.css';

const MAX_FILES = 5;
const MAX_FILE_MB = 8;

// AI drafts usually open with "Subject: …" (sometimes **bolded**). Split
// that off so the subject and the message can be edited separately.
export function splitDraft(text = '') {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const i = lines.findIndex((l) => l.trim());
  const m = i >= 0 && lines[i].replace(/\*\*/g, '').match(/^\s*subject\s*:\s*(.+)$/i);
  if (!m) return { subject: '', body: String(text).trim() };
  return { subject: m[1].trim(), body: lines.slice(i + 1).join('\n').trim() };
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older browsers / non-secure contexts
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

/**
 * Editable AI draft: edit subject + message, save, copy, and send as an email
 * with attachments (and, for invoices, the invoice PDF).
 *
 * type: 'invoice' | 'appointment' | 'lead'    id: the record's _id
 */
export default function AIDraftEditor({
  type, id, text, title = 'AI draft', recipient = '', defaultSubject = '',
  canAttachInvoicePdf = false, onRegenerate, regenerating = false, onSaved, onSent,
}) {
  const initial = splitDraft(text);
  const [subject, setSubject] = useState(initial.subject || defaultSubject);
  const [body, setBody] = useState(initial.body);
  const [savedText, setSavedText] = useState(text);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [to, setTo] = useState(recipient || '');
  const [cc, setCc] = useState('');
  const [files, setFiles] = useState([]);
  const [attachPdf, setAttachPdf] = useState(canAttachInvoicePdf);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const bodyRef = useRef(null);

  // A fresh AI draft (regenerate) replaces the editor contents.
  useEffect(() => {
    const d = splitDraft(text);
    setSubject(d.subject || defaultSubject);
    setBody(d.body);
    setSavedText(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  useEffect(() => { setTo(recipient || ''); }, [recipient]);

  // Grow the textarea with its content.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 640)}px`;
  }, [body]);

  const combined = subject.trim() ? `Subject: ${subject.trim()}\n\n${body.trim()}` : body.trim();
  const dirty = combined !== String(savedText || '').trim();

  async function save() {
    setSaving(true);
    try {
      await draftService.save(type, id, combined);
      setSavedText(combined);
      onSaved?.(combined);
      toast.success('Draft saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Could not save draft'); }
    finally { setSaving(false); }
  }

  async function copy() {
    await copyText(combined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success('Copied to clipboard');
  }

  function addFiles(list) {
    const incoming = [...list];
    const tooBig = incoming.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) toast.error(`${tooBig.name} is over ${MAX_FILE_MB}MB`);
    const ok = incoming.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
    setFiles((prev) => {
      const next = [...prev, ...ok.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))];
      if (next.length > MAX_FILES) toast.error(`Up to ${MAX_FILES} attachments`);
      return next.slice(0, MAX_FILES);
    });
    if (fileRef.current) fileRef.current.value = '';
  }

  async function send(e) {
    e.preventDefault();
    if (!subject.trim()) return toast.error('Add a subject');
    if (!body.trim()) return toast.error('The message is empty');
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('to', to);
      fd.append('cc', cc);
      fd.append('subject', subject.trim());
      fd.append('body', body.trim());
      fd.append('attachInvoicePdf', String(Boolean(canAttachInvoicePdf && attachPdf)));
      files.forEach((f) => fd.append('files', f));
      const { data } = await draftService.send(type, id, fd);
      setSavedText(combined);
      setShowSend(false);
      setFiles([]);
      toast.success(`Sent to ${data.data.to.join(', ')}${data.data.attachments.length ? ` with ${data.data.attachments.length} attachment(s)` : ''}`);
      onSent?.(combined);
    } catch (err) { toast.error(err.response?.data?.message || 'Email could not be sent'); }
    finally { setSending(false); }
  }

  const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

  return (
    <div className="ai-draft">
      <div className="ai-draft-head">
        <span className="ai-draft-title"><RiRobot2Line /> {title}</span>
        {dirty && <span className="ai-draft-dirty">Unsaved changes</span>}
        <div className="ai-draft-tools">
          {onRegenerate && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRegenerate} disabled={regenerating} title="Write a new draft with AI">
              {regenerating ? <RiLoader4Line className="spin" /> : <RiRefreshLine />} Regenerate
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy} title="Copy subject and message">
            {copied ? <RiCheckLine /> : <RiFileCopyLine />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={save} disabled={saving || !dirty}>
            {saving ? <RiLoader4Line className="spin" /> : <RiSaveLine />} Save
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowSend((v) => !v)}>
            <RiMailSendLine /> Send email
          </button>
        </div>
      </div>

      <label className="ai-draft-label" htmlFor={`ai-subj-${id}`}>Subject</label>
      <input id={`ai-subj-${id}`} className="form-input ai-draft-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" />
      <label className="ai-draft-label" htmlFor={`ai-body-${id}`}>Message <span>Edit anything: add details, change the tone, fix amounts.</span></label>
      <textarea id={`ai-body-${id}`} ref={bodyRef} className="form-input ai-draft-body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} />

      {showSend && (
        <form className="ai-draft-send" onSubmit={send}>
          <div className="ai-draft-row">
            <label htmlFor={`ai-to-${id}`}>To</label>
            <input id={`ai-to-${id}`} className="form-input" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com, another@example.com" />
          </div>
          <div className="ai-draft-row">
            <label htmlFor={`ai-cc-${id}`}>Cc</label>
            <input id={`ai-cc-${id}`} className="form-input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional" />
          </div>

          <div className="ai-draft-files">
            {canAttachInvoicePdf && (
              <label className="ai-draft-pdf">
                <input type="checkbox" checked={attachPdf} onChange={(e) => setAttachPdf(e.target.checked)} />
                <RiFilePdfLine /> Attach invoice PDF
              </label>
            )}
            {files.map((f, i) => (
              <span key={`${f.name}-${i}`} className="ai-draft-chip">
                <RiAttachment2 /> {f.name} <small>{kb(f.size)}</small>
                <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><RiCloseLine /></button>
              </span>
            ))}
            {files.length < MAX_FILES && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <RiAttachment2 /> Attach files
              </button>
            )}
            <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          </div>
          <p className="ai-draft-hint">Up to {MAX_FILES} files, {MAX_FILE_MB}MB each. Replies come back to your business email.</p>

          <div className="ai-draft-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSend(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
              {sending ? <><RiLoader4Line className="spin" /> Sending…</> : <><RiMailSendLine /> Send now</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
