import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { RiImageAddLine, RiLoader4Line, RiDeleteBinLine } from 'react-icons/ri';

// A logo as either an uploaded image or a pasted link. `upload` receives the
// FormData and saves it on the server; a typed link is saved with the form.
export default function LogoField({ value, onChange, upload }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo must be under 5MB'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const { data } = await upload(fd);
      onChange(data.data.logo);
      toast.success('Logo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload logo');
    } finally { setBusy(false); }
  }

  return (
    <div className="logo-field">
      <div className="logo-field-preview">
        {value ? <img src={value} alt="Logo preview" /> : <RiImageAddLine aria-hidden="true" />}
      </div>
      <div className="logo-field-controls">
        <div className="logo-field-actions">
          <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <RiLoader4Line className="spin" /> : <RiImageAddLine />} {busy ? 'Uploading…' : value ? 'Change image' : 'Upload image'}
          </button>
          {value && !busy && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}><RiDeleteBinLine /> Remove</button>
          )}
        </div>
        <input className="form-input" placeholder="Or paste an image link: https://…" aria-label="Logo image link" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        <span className="cell-sub">PNG or JPG, under 5MB. An upload saves straight away; a link or Remove saves with the form.</span>
      </div>
    </div>
  );
}
