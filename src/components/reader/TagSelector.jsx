import { useState, useEffect, useRef, useMemo } from 'react';

export default function TagSelector({ selectedTags, onToggle, tagsConfig, setTagsConfig }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#d4a853");
  const [editingId, setEditingId] = useState(null);
  const [tagFilter, setTagFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const containerRef = useRef(null);

  const getContrastColor = (hex) => {
    if (!hex || hex.length < 6) return "#fff";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return ((r * 299 + g * 587 + b * 114) / 1000) >= 128 ? "#000" : "#fff";
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setShowAdd(false);
    };
    if (showAdd) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAdd]);

  const addTag = () => {
    if (!newName.trim()) return;
    const name = newName.trim().replace(/^#/, "");
    if (editingId) {
      setTagsConfig(tagsConfig.map(t => t.id === editingId ? { ...t, name, color: newColor } : t));
      setEditingId(null); setNewName(""); setNewColor("#d4a853");
    } else {
      if (tagsConfig.find(t => t.name.toLowerCase() === name.toLowerCase())) { alert("Tag já existe"); return; }
      setTagsConfig([...tagsConfig, { id: Date.now().toString(), name, color: newColor }]);
      setNewName("");
    }
  };

  const startEdit = (t) => { setEditingId(t.id); setNewName(t.name); setNewColor(t.color); };

  const removeTag = (id) => {
    if (confirm("Excluir esta tag permanentemente? Todas as marcações serão removidas.")) {
      setTagsConfig(tagsConfig.filter(t => t.id !== id));
      if (editingId === id) { setEditingId(null); setNewName(""); }
    }
  };

  const handleToggle = (tagId, isSelected) => {
    if (!isSelected) {
      // Adicionar tag: sem confirmação
      onToggle(tagId);
    } else {
      // Remover tag: pede confirmação
      const tagName = tagsConfig.find(t => t.id === tagId)?.name;
      if (confirm(`Deseja remover a tag #${tagName}?`)) onToggle(tagId);
    }
  };

  const filteredTags = useMemo(() => {
    return tagsConfig
      .filter(t => t.name.toLowerCase().includes(tagFilter.toLowerCase()))
      .sort((a, b) => sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }, [tagsConfig, tagFilter, sortOrder]);

  return (
    <div ref={containerRef} style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {selectedTags.map(tagId => {
          const t = tagsConfig.find(x => x.id === tagId);
          if (!t) return null;
          return (
            <span key={t.id} onClick={() => handleToggle(t.id, true)}
              style={{ background: t.color, color: getContrastColor(t.color), fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
              #{t.name} <span style={{ fontSize: 8, opacity: 0.8 }}>✕</span>
            </span>
          );
        })}
      </div>

      <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary"
        style={{ padding: "2px 6px", fontSize: 10, borderStyle: "solid", borderRadius: 4, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {showAdd ? "Fechar" : "+ Tag"}
      </button>

      {showAdd && (
        <div className="cd" style={{ position: "absolute", top: 24, left: 0, zIndex: 300, padding: 14, width: 280, display: "flex", flexDirection: "column", gap: 10, boxShadow: "var(--shadow)", border: "2px solid var(--gold)", background: "var(--bg-card)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>Gerenciar Tags</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setSortOrder(s => s === "asc" ? "desc" : "asc")} className="nb" style={{ padding: 2, fontSize: 10, background: "var(--bg-hover)" }} title="Inverter Ordem">
                {sortOrder === "asc" ? "A-Z ↓" : "Z-A ↑"}
              </button>
              <button onClick={() => setShowAdd(false)} style={{ border: "none", background: "none", color: "var(--text-sec)", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
          </div>

          <input value={tagFilter} onChange={e => setTagFilter(e.target.value)}
            placeholder="Filtrar tags..."
            style={{ fontSize: 11, padding: "6px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-hover)" }} />

          <div style={{ maxHeight: 165, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, paddingRight: 4, border: "1px solid var(--border)", borderRadius: 6, padding: 4, background: "var(--bg-hover)" }}>
            {filteredTags.length === 0 && <div style={{ fontSize: 10, color: "var(--text-mute)", textAlign: "center", padding: 10 }}>Nenhuma tag encontrada</div>}
            {filteredTags.map(t => {
              const isSel = selectedTags.includes(t.id);
              const isEditing = editingId === t.id;
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, padding: 2, borderRadius: 4, background: isEditing ? "var(--gold-subtle)" : isSel ? "rgba(212,168,83,0.1)" : "transparent", border: isEditing ? "1px dashed var(--gold)" : "none" }}>
                  <span onClick={() => handleToggle(t.id, isSel)}
                    style={{ flex: 1, cursor: "pointer", fontSize: 11, background: t.color, color: getContrastColor(t.color), padding: "4px 8px", borderRadius: 4, transition: "all 0.2s", fontWeight: isSel ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: isSel ? "2px solid var(--gold)" : "1px solid transparent", boxShadow: isSel ? "0 0 0 1px #fff" : "none" }}>
                    #{t.name} {isSel && "✓"}
                  </span>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button onClick={() => startEdit(t)} style={{ border: "none", background: "none", color: "var(--gold)", cursor: "pointer", fontSize: 12, padding: "0 4px" }} title="Editar Tag">✎</button>
                    <button onClick={() => removeTag(t.id)} style={{ border: "none", background: "none", color: "var(--err)", cursor: "pointer", fontSize: 14, padding: "0 6px" }} title="Excluir Tag">×</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: editingId ? "var(--gold)" : "var(--text-sec)" }}>
              {editingId ? "Editando Tag:" : "Nova Tag:"}
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()}
              placeholder="Ex: Lucro Presumido"
              style={{ fontSize: 11, padding: "5px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg)" }} />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 34, height: 26, padding: 0, border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer" }} title="Escolher cor" />
                <button onClick={addTag} className="btn-primary" style={{ flex: 1, padding: "4px 8px", fontSize: 11, fontWeight: 600, height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {editingId ? "Salvar Alterações" : "OK / Adicionar"}
                </button>
              </div>
              {editingId && <button onClick={() => { setEditingId(null); setNewName(""); setNewColor("#d4a853"); }} className="nb" style={{ fontSize: 10, padding: "4px 8px" }}>Cancelar</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
