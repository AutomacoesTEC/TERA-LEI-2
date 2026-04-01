import { useRef, useEffect } from 'react';

export default function RichTextEditor({ value, onBlur, placeholder }) {
  const edRef = useRef(null);
  const lastSaved = useRef(value || "");

  useEffect(() => {
    if (!edRef.current) return;
    if (document.activeElement === edRef.current) return;
    if (edRef.current.innerHTML !== (value || "")) {
      edRef.current.innerHTML = value || "";
    }
  }, [value]);

  const cmd = (command, val = null) => {
    try {
      edRef.current && edRef.current.focus();
      document.execCommand(command, false, val);
    } catch (e) { console.warn("execCommand falhou:", command, e); }
  };

  const clearFmt = () => {
    try {
      edRef.current && edRef.current.focus();
      document.execCommand("removeFormat", false, null);
      document.execCommand("insertOrderedList", false, null);
      document.execCommand("insertOrderedList", false, null);
      document.execCommand("insertUnorderedList", false, null);
      document.execCommand("insertUnorderedList", false, null);
    } catch (e) { console.warn("clearFmt:", e); }
  };

  const handleBlur = () => {
    if (!edRef.current) return;
    const html = edRef.current.innerHTML || "";
    if (html !== lastSaved.current) {
      lastSaved.current = html;
      onBlur && onBlur(html);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") e.stopPropagation();
  };

  const btnStyle = () => ({
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: 4,
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: 12,
    color: "var(--text-sec)",
    fontFamily: "inherit",
    lineHeight: "18px",
    transition: "color .1s,border-color .1s",
    flexShrink: 0,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", background: "var(--input-bg)" }}>
      <div style={{ display: "flex", gap: 3, padding: "4px 6px", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)", flexWrap: "wrap" }}>
        <button onMouseDown={e => { e.preventDefault(); cmd("bold"); }} style={btnStyle()} title="Negrito"><b>N</b></button>
        <button onMouseDown={e => { e.preventDefault(); cmd("italic"); }} style={btnStyle()} title="Itálico"><i>I</i></button>
        <button onMouseDown={e => { e.preventDefault(); cmd("underline"); }} style={btnStyle()} title="Sublinhado"><u>S</u></button>
        <button onMouseDown={e => { e.preventDefault(); cmd("strikeThrough"); }} style={btnStyle()} title="Tachado"><s>T</s></button>
        <span style={{ width: 1, background: "var(--border)", margin: "2px 2px", flexShrink: 0 }} />
        <button onMouseDown={e => { e.preventDefault(); cmd("insertUnorderedList"); }} style={btnStyle()} title="Lista com marcadores">•≡</button>
        <button onMouseDown={e => { e.preventDefault(); cmd("insertOrderedList"); }} style={btnStyle()} title="Lista numerada">1≡</button>
        <span style={{ width: 1, background: "var(--border)", margin: "2px 2px", flexShrink: 0 }} />
        <button onMouseDown={e => { e.preventDefault(); clearFmt(); }} style={btnStyle()} title="Remover formatação">✕<sub style={{ fontSize: 9 }}>fmt</sub></button>
      </div>
      <div
        ref={edRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder || "Expandir anotação..."}
        style={{
          minHeight: "120px", maxHeight: "280px", overflowY: "auto",
          padding: "8px 10px", fontSize: 12, lineHeight: 1.6,
          fontFamily: "inherit", color: "var(--text)", outline: "none",
          resize: "vertical", wordBreak: "break-word",
        }}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty::before{
          content:attr(data-placeholder);
          color:var(--text-mute);
          pointer-events:none;
          font-style:italic;
        }
        [contenteditable] ul{padding-left:18px;margin:2px 0;}
        [contenteditable] ol{padding-left:18px;margin:2px 0;}
        [contenteditable] li{margin:1px 0;}
      `}</style>
    </div>
  );
}
