import { useState } from 'react';
import { Sp } from '../../constants/icons';

export default function ApiKeyModal({ status, onSave, onDelete, onClose }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!key.trim()) { setErr("Digite a chave."); return; }
    if (!key.trim().startsWith("sk-ant-")) { setErr("Chave inválida — deve começar com sk-ant-"); return; }
    setLoading(true); setErr("");
    try { await onSave(key.trim()); } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const remove = async () => {
    if (!confirm("Remover sua API Key? Sem ela as funções de IA ficarão indisponíveis.")) return;
    setLoading(true);
    try { await onDelete(); } catch {}
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cd" style={{ width: "100%", maxWidth: 420, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Minha API Key Anthropic</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-sec)", fontSize: 18 }}>✕</button>
        </div>
        {status?.configured && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(46,204,113,.1)", borderRadius: 6, fontSize: 12, color: "var(--ok)" }}>Chave configurada: <code>{status.masked}</code></div>}
        <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 10 }}>Sua chave fica armazenada no servidor de forma segura e nunca é exposta ao navegador.</div>
        <input value={key} onChange={e => setKey(e.target.value)} placeholder="sk-ant-api03-…" style={{ width: "100%", padding: "10px 12px", borderRadius: 7, fontSize: 13, outline: "none", marginBottom: 10, fontFamily: "monospace" }} />
        {err && <div style={{ color: "var(--err)", fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} disabled={loading} className="btn-primary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {loading && <Sp />}Salvar
          </button>
          {status?.configured && <button onClick={remove} disabled={loading} className="btn-secondary" style={{ color: "var(--err)", borderColor: "var(--err)" }}>Remover</button>}
        </div>
      </div>
    </div>
  );
}
