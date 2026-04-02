import { useState, useEffect, useRef, useMemo } from 'react';
import { DIV } from '../../constants/patterns';
import RichTextEditor from './RichTextEditor';
import TagSelector from './TagSelector';

export default function TabEstudo({ ds, lei, gSt, uSt, tagsConfig = [], setTagsConfig = () => {} }) {
  const [filtroStatus, setFiltroStatus] = useState("");
  const [selSection, setSelSection] = useState(null);
  const [collNav, setCollNav] = useState({});
  const sts = ["Não lido", "Lido", "Revisando", "Dominado", "Dúvida"];
  const sC = { Dominado: "#27AE60", "Dúvida": "#C0392B", Revisando: "#D4A017", Lido: "#2E86AB" };

  const [colWidths, setColWidths] = useState([100, 360, 120, 120, 220]);
  const dragRef = useRef(null);
  useEffect(() => {
    const onMove = e => {
      if (!dragRef.current) return;
      const { colIdx, startX, startW } = dragRef.current;
      const newW = Math.max(60, startW + (e.clientX - startX));
      setColWidths(p => { const n = [...p]; n[colIdx] = newW; return n; });
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);
  const handleColResizeMouseDown = (e, colIdx) => {
    e.preventDefault();
    dragRef.current = { colIdx, startX: e.clientX, startW: colWidths[colIdx] };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const estrutura = useMemo(() => {
    const mapa = [];
    const stack = { PARTE: null, LIVRO: null, "TÍTULO": null, "CAPÍTULO": null, "SEÇÃO": null, "SUBSEÇÃO": null };
    const levels = ["PARTE", "LIVRO", "TÍTULO", "CAPÍTULO", "SEÇÃO", "SUBSEÇÃO"];
    const clearBelow = (tipo) => { const idx = levels.indexOf(tipo); for (let i = idx + 1; i < levels.length; i++) stack[levels[i]] = null; };
    const getParent = (tipo) => { const idx = levels.indexOf(tipo); for (let i = idx - 1; i >= 0; i--) { if (stack[levels[i]]) return stack[levels[i]]; } return null; };
    for (let dsIdx = 0; dsIdx < ds.length; dsIdx++) {
      const d = ds[dsIdx];
      if (DIV.has(d.tipo)) {
        const node = { tipo: d.tipo, id: d.id, rub: d.rub, dsStart: dsIdx, dsEnd: null, children: [] };
        clearBelow(d.tipo); stack[d.tipo] = node;
        const parent = getParent(d.tipo);
        if (parent) parent.children.push(node); else mapa.push(node);
      }
    }
    const computeRange = (nodes) => {
      for (const n of nodes) {
        let endIdx = ds.length;
        const myLevel = levels.indexOf(n.tipo);
        for (let i = n.dsStart + 1; i < ds.length; i++) {
          if (DIV.has(ds[i].tipo) && levels.indexOf(ds[i].tipo) <= myLevel) { endIdx = i; break; }
        }
        n.dsEnd = endIdx;
        computeRange(n.children);
      }
    };
    computeRange(mapa);
    return mapa;
  }, [ds]);

  const allNavKeysRef = useRef({});
  const estNavRef = useRef(null);
  if (estrutura !== estNavRef.current) {
    estNavRef.current = estrutura;
    const allK = {};
    const mark = (ns, prefix) => ns.forEach((n, i) => { const k = prefix + "-" + n.id; if (n.children?.length > 0) allK[k] = true; mark(n.children, k + "-" + i); });
    mark(estrutura, "enav");
    allNavKeysRef.current = allK;
  }

  const toggleNav = (key) => {
    setCollNav(p => {
      const isCurrentlyOpen = p[key] === false;
      const ns = { ...p, [key]: isCurrentlyOpen ? true : false };
      Object.keys(allNavKeysRef.current).forEach(k => { if (k.startsWith(key + "-")) ns[k] = true; });
      return ns;
    });
  };

  const items = useMemo(() => ds.filter(d => !DIV.has(d.tipo)), [ds]);
  const fd = useMemo(() => {
    let base = items;
    if (selSection) {
      base = ds.slice(selSection.dsStart, selSection.dsEnd).filter(d => !DIV.has(d.tipo));
    }
    if (!filtroStatus) return base;
    return base.filter(d => { const ri = ds.indexOf(d); return gSt(lei.id, ri, "status") === filtroStatus; });
  }, [items, selSection, filtroStatus, lei.id, gSt, ds]);

  const levelStyle = {
    "PARTE": { bg: "var(--grad)", color: "#fff", fw: 700, fs: 13, pad: "8px 10px" },
    "LIVRO": { bg: "var(--gold)", color: "#fff", fw: 700, fs: 12, pad: "7px 10px" },
    "TÍTULO": { bg: "var(--gold-subtle)", color: "var(--gold)", fw: 600, fs: 12, pad: "6px 10px" },
    "CAPÍTULO": { bg: "var(--bg-hover)", color: "var(--text)", fw: 600, fs: 11, pad: "5px 8px" },
    "SEÇÃO": { bg: "transparent", color: "var(--text-sec)", fw: 500, fs: 11, pad: "4px 8px" },
    "SUBSEÇÃO": { bg: "transparent", color: "var(--text-mute)", fw: 400, fs: 10, pad: "3px 8px" },
  };

  const renderNavNode = (node, depth, pathKey) => {
    const key = pathKey + "-" + node.id;
    const isOpen = collNav[key] === false;
    const hasChildren = node.children && node.children.length > 0;
    const isSel = selSection === node;
    const st = levelStyle[node.tipo] || levelStyle["SEÇÃO"];
    const indent = depth * 10;
    return (
      <div key={key} style={{ marginLeft: indent, marginTop: 2 }}>
        <div
          onClick={() => { setSelSection(isSel ? null : node); if (hasChildren) toggleNav(key); }}
          style={{ background: isSel ? "var(--gold)" : st.bg, color: isSel ? "#fff" : st.color, fontWeight: st.fw, fontSize: st.fs, padding: st.pad, borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, border: node.tipo === "CAPÍTULO" || node.tipo === "SEÇÃO" ? "1px solid var(--border)" : "none", userSelect: "none", lineHeight: 1.3 }}>
          {hasChildren && <span style={{ fontSize: 9, opacity: .7, flexShrink: 0, transition: "transform .12s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>}
          <span style={{ fontFamily: "'Segoe UI',sans-serif", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.35 }}>{node.tipo} — <b>{node.id}</b>
            {node.rub && <span style={{ opacity: .75, fontWeight: 400 }}> — {node.rub}</span>}
          </span>
        </div>
        {isOpen && hasChildren && <div>{node.children.map((ch, i) => renderNavNode(ch, depth + 1, key + "-" + i))}</div>}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", gap: 10, height: "72vh" }}>
      <div style={{ width: "clamp(200px, 22%, 340px)", flexShrink: 0, display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "8px 10px", background: "var(--grad)", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: .5, flexShrink: 0 }}>NAVEGAR POR SEÇÃO</div>
        {selSection && (
          <div style={{ padding: "4px 8px", background: "var(--gold-subtle)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "var(--gold)" }}>Filtro: {selSection.id}</span>
            <button onClick={() => setSelSection(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-mute)", padding: 0 }}>✕ todos</button>
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto", padding: 6 }}>
          {estrutura.length === 0
            ? <div style={{ padding: 20, textAlign: "center", color: "var(--text-mute)", fontSize: 12 }}>Sem estrutura hierárquica</div>
            : estrutura.map((node) => renderNavNode(node, 0, "enav"))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setFiltroStatus("")} style={{ padding: "5px 11px", background: !filtroStatus ? "var(--grad)" : "var(--bg-hover)", color: !filtroStatus ? "#fff" : "var(--text-sec)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Todos</button>
          {sts.map(s => <button key={s} onClick={() => setFiltroStatus(s)} style={{ padding: "5px 11px", background: filtroStatus === s ? "var(--grad)" : "var(--bg-hover)", color: filtroStatus === s ? "#fff" : "var(--text-sec)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{s}</button>)}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-mute)", alignSelf: "center" }}>
            {fd.length} dispositivo(s){selSection ? ` em ${selSection.tipo} ${selSection.id}` : ""}
          </span>
        </div>
        <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
          <table className="dt" style={{ width: "100%", tableLayout: "fixed" }}>
            <thead><tr>
              {["Dispositivo", "Texto", "Status", "Dificuldade", "Anotação"].map((lbl, ci) => (
                <th key={ci} style={{ width: colWidths[ci], userSelect: "none", padding: "8px 6px 8px 10px", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lbl}</span>
                    {ci < 4 && <div onMouseDown={e => handleColResizeMouseDown(e, ci)} title="Arraste para redimensionar a coluna" style={{ width: 4, minHeight: 16, cursor: "col-resize", background: "rgba(255,255,255,0.28)", borderRadius: 2, flexShrink: 0, transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.65)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.28)"} />}
                  </div>
                </th>
              ))}
            </tr></thead>
            <tbody>{fd.map((d, i) => {
              const ri = ds.indexOf(d);
              const st = gSt(lei.id, ri, "status");
              const dif = gSt(lei.id, ri, "dif");
              const nt = gSt(lei.id, ri, "note");
              const isVetado = d.status === "vetado";
              const isRevogado = d.status === "revogado";
              const isInativo = isVetado || isRevogado;
              return (
                <tr key={ri} style={{ opacity: isInativo ? 0.6 : 1, background: isVetado ? "rgba(231,76,60,0.06)" : isRevogado ? "rgba(231,76,60,0.04)" : "inherit" }}>
                  <td style={{ fontWeight: 700, fontSize: 12, verticalAlign: "top" }}>
                    <div style={{ marginBottom: 4 }}>{d.id}</div>
                    <TagSelector
                      selectedTags={gSt(lei.id, ri, "tags") || []}
                      onToggle={tid => {
                        const current = gSt(lei.id, ri, "tags") || [];
                        uSt(lei.id, ri, "tags", current.includes(tid) ? current.filter(x => x !== tid) : [...current, tid]);
                      }}
                      tagsConfig={tagsConfig}
                      setTagsConfig={setTagsConfig}
                    />
                    {isVetado && <div><span className="badge badge-revogado" style={{ marginTop: 4, display: "inline-block" }}>VETADO</span></div>}
                    {isRevogado && <div><span className="badge badge-revogado" style={{ marginTop: 4, display: "inline-block" }}>REVOGADO</span></div>}
                  </td>
                  <td style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", verticalAlign: "top", padding: "10px", textDecoration: isInativo ? "line-through" : "none" }}>
                    {d.txt}
                    {d.alteracao && <div style={{ marginTop: 4, padding: "2px 8px", background: "rgba(52,152,219,0.08)", borderLeft: "2px solid #3498db", borderRadius: 3, fontSize: 11, color: "#3498db", textDecoration: "none", fontWeight: 400 }}>↳ {d.alteracao}</div>}
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <select value={st} onChange={e => uSt(lei.id, ri, "status", e.target.value)} style={{ width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 4, color: sC[st] || "var(--text)", padding: "4px", fontSize: 11 }}>
                      <option value="">Selecionar...</option>
                      {sts.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <select value={dif} onChange={e => uSt(lei.id, ri, "dif", e.target.value)} style={{ width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 4, padding: "4px", fontSize: 11 }}>
                      <option value="">—</option>
                      <option value="Fácil">Fácil</option>
                      <option value="Médio">Médio</option>
                      <option value="Difícil">Difícil</option>
                    </select>
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <RichTextEditor value={nt} onBlur={html => uSt(lei.id, ri, "note", html)} placeholder="Expandir anotação..." />
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 10, color: "var(--text-mute)", marginBottom: 2 }}>Tags da Anotação:</div>
                      <TagSelector
                        selectedTags={gSt(lei.id, ri, "noteTags") || []}
                        onToggle={tid => {
                          const current = gSt(lei.id, ri, "noteTags") || [];
                          uSt(lei.id, ri, "noteTags", current.includes(tid) ? current.filter(x => x !== tid) : [...current, tid]);
                        }}
                        tagsConfig={tagsConfig}
                        setTagsConfig={setTagsConfig}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
