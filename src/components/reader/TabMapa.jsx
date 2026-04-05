import { useState, useMemo, useCallback, useRef } from 'react';
import { DIV } from '../../constants/patterns';
import { hierarquia } from '../../utils/search';

export default function TabMapa({ ds }) {
  const [selArt, setSelArt] = useState(null);

  const estrutura = useMemo(() => {
    const mapa = [];
    const stack = { PARTE: null, LIVRO: null, "TÍTULO": null, "CAPÍTULO": null, "SEÇÃO": null, "SUBSEÇÃO": null, "SECAO_PR": null, "ASSUNTO": null };
    const levels = ["PARTE", "LIVRO", "TÍTULO", "CAPÍTULO", "SEÇÃO", "SUBSEÇÃO", "SECAO_PR", "ASSUNTO"];
    const clearBelow = (tipo) => { const idx = levels.indexOf(tipo); for (let i = idx + 1; i < levels.length; i++) stack[levels[i]] = null; };
    const getParent = (tipo) => { const idx = levels.indexOf(tipo); for (let i = idx - 1; i >= 0; i--) { if (stack[levels[i]]) return stack[levels[i]]; } return null; };
    for (const d of ds) {
      if (DIV.has(d.tipo)) {
        const node = { tipo: d.tipo, id: d.id, rub: d.rub, children: [], artigos: [] };
        clearBelow(d.tipo); stack[d.tipo] = node;
        const parent = getParent(d.tipo);
        if (parent) parent.children.push(node); else mapa.push(node);
      } else if (d.tipo === "ARTIGO" || d.tipo === "PERGUNTA") {
        let target = null;
        for (let i = levels.length - 1; i >= 0; i--) { if (stack[levels[i]]) { target = stack[levels[i]]; break; } }
        const artEntry = { id: d.id, status: d.status || "vigente" };
        if (target) target.artigos.push(artEntry);
      }
    }
    return mapa;
  }, [ds]);

  const buildAllCollapsedKeys = useCallback((nodes) => {
    const all = {};
    const mark = (ns, prefix) => {
      ns.forEach((n, i) => {
        const k = prefix + "-" + n.id;
        const hasContent = (n.children && n.children.length > 0) || (n.artigos && n.artigos.length > 0);
        if (hasContent) all[k] = true;
        if (n.children) mark(n.children, k + "-" + i);
      });
    };
    mark(nodes, "root");
    return all;
  }, []);

  const allKeysRef = useRef({});
  const [collapsed, setCollapsed] = useState({});
  const estruturaRef = useRef(null);
  if (estrutura !== estruturaRef.current) {
    estruturaRef.current = estrutura;
    allKeysRef.current = buildAllCollapsedKeys(estrutura);
  }

  const toggle = (key) => {
    setCollapsed(p => {
      const isCurrentlyOpen = p[key] === false;
      const newState = { ...p, [key]: isCurrentlyOpen ? true : false };
      Object.keys(allKeysRef.current).forEach(k => {
        if (k.startsWith(key + "-")) newState[k] = true;
      });
      return newState;
    });
  };

  const artDetail = useMemo(() => {
    if (!selArt) return null;
    const result = []; let inside = false;
    for (const d of ds) {
      if ((d.tipo === "ARTIGO" || d.tipo === "PERGUNTA") && d.id === selArt) { inside = true; result.push(d); continue; }
      if (inside) { if (d.tipo === "ARTIGO" || d.tipo === "PERGUNTA" || DIV.has(d.tipo)) break; result.push(d); }
    }
    return result.length > 0 ? result : null;
  }, [ds, selArt]);

  const artPath = useMemo(() => {
    if (!selArt) return "";
    const ctx = hierarquia(ds);
    return ctx[selArt] || "";
  }, [ds, selArt]);

  const renderArtigos = (artigos, pathKey) => {
    if (!artigos || artigos.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4, marginLeft: 4 }}>
        {artigos.map((a, i) => {
          const isRev = a.status === "revogado"; const isVet = a.status === "vetado"; const isInativo = isRev || isVet; const isSel = selArt === a.id;
          return <span key={pathKey + "-" + i} onClick={(e) => { e.stopPropagation(); setSelArt(a.id); }}
            style={{ background: isSel ? "var(--gold)" : isInativo ? "rgba(231,76,60,0.15)" : "var(--gold-subtle)", color: isSel ? "#fff" : isInativo ? "#e74c3c" : "var(--gold)", padding: "2px 7px", borderRadius: 4, fontSize: 11, cursor: "pointer", textDecoration: isInativo ? "line-through" : "none", fontWeight: isSel ? 700 : 400, transition: "all .12s", border: isSel ? "1px solid var(--gold)" : "1px solid transparent" }}
            title={isRev ? "Revogado" : isVet ? "Vetado" : "Vigente"}>{a.id}</span>;
        })}
      </div>
    );
  };

  const renderNode = (node, depth, pathKey) => {
    const key = pathKey + "-" + node.id;
    const isOpen = collapsed[key] === false;
    const hasContent = (node.children && node.children.length > 0) || (node.artigos && node.artigos.length > 0);
    const lvlStyle = {
      "PARTE": { bg: "var(--grad)", color: "#fff", fontWeight: 700, fontSize: 14, borderRadius: 8, padding: "10px 14px" },
      "LIVRO": { bg: "var(--gold)", color: "#fff", fontWeight: 700, fontSize: 13, borderRadius: 7, padding: "8px 12px" },
      "TÍTULO": { bg: "var(--gold-subtle)", color: "var(--gold)", fontWeight: 600, fontSize: 13, borderRadius: 6, padding: "7px 12px" },
      "CAPÍTULO": { bg: "var(--bg-hover)", color: "var(--text)", fontWeight: 600, fontSize: 12, borderRadius: 6, padding: "6px 10px" },
      "SEÇÃO": { bg: "transparent", color: "var(--text-sec)", fontWeight: 500, fontSize: 12, borderRadius: 4, padding: "4px 10px" },
      "SUBSEÇÃO": { bg: "transparent", color: "var(--text-mute)", fontWeight: 400, fontSize: 11, borderRadius: 4, padding: "4px 10px" },
      "SECAO_PR": { bg: "rgba(52,152,219,0.15)", color: "#3498db", fontWeight: 600, fontSize: 12, borderRadius: 5, padding: "5px 10px" },
      "ASSUNTO": { bg: "rgba(128,90,213,0.15)", color: "#805ad5", fontWeight: 600, fontSize: 12, borderRadius: 5, padding: "5px 10px" }
    };
    const st = lvlStyle[node.tipo] || lvlStyle["SEÇÃO"];
    const indent = depth * 12;
    return (
      <div key={key} style={{ marginLeft: indent, marginTop: depth === 0 ? 8 : 4 }}>
        <div onClick={() => { if (hasContent) toggle(key); }}
          style={{ background: st.bg, color: st.color, fontWeight: st.fontWeight, fontSize: st.fontSize, borderRadius: st.borderRadius, padding: st.padding, cursor: hasContent ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6, border: node.tipo === "CAPÍTULO" || node.tipo === "SEÇÃO" ? "1px solid var(--border)" : "none", transition: "opacity .12s", userSelect: "none" }}>
          {hasContent && <span style={{ fontSize: 10, opacity: .7, flexShrink: 0, transition: "transform .15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>}
          <span style={{ fontFamily: "'Segoe UI',sans-serif" }}>{node.tipo} — </span>
          <b>{node.id}</b>
          {node.rub && <span style={{ opacity: .8, marginLeft: 4 }}>— {node.rub}</span>}
          {node.artigos && node.artigos.length > 0 && <span style={{ marginLeft: "auto", fontSize: 10, opacity: .6, flexShrink: 0 }}>{node.artigos.length} art.</span>}
        </div>
        {isOpen && <div>
          {renderArtigos(node.artigos, key)}
          {node.children && node.children.map((child, i) => renderNode(child, depth + 1, key + "-" + i))}
        </div>}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", gap: 16, height: "70vh" }}>
      <div style={{ flex: "1 1 55%", overflow: "auto", paddingRight: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>ESTRUTURA HIERÁRQUICA</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { const all = {}; Object.keys(allKeysRef.current).forEach(k => { all[k] = false; }); setCollapsed(all); }} style={{ fontSize: 11, padding: "3px 8px", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", color: "var(--text-sec)" }}>Expandir tudo</button>
            <button onClick={() => {
              const all = {};
              const markAll = (nodes, prefix) => {
                nodes.forEach((n, i) => {
                  const k = prefix + "-" + n.id;
                  const hasContent = (n.children && n.children.length > 0) || (n.artigos && n.artigos.length > 0);
                  if (hasContent) all[k] = true;
                  if (n.children) markAll(n.children, k + "-" + i);
                });
              };
              markAll(estrutura, "root");
              setCollapsed(all);
            }} style={{ fontSize: 11, padding: "3px 8px", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", color: "var(--text-sec)" }}>Colapsar tudo</button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-mute)", marginBottom: 6, display: "flex", gap: 12 }}>
          <span>● <span style={{ color: "var(--gold)" }}>Vigente</span></span>
          <span>● <span style={{ color: "#e74c3c" }}>Revogado/Vetado</span></span>
          <span style={{ marginLeft: "auto", fontStyle: "italic" }}>Clique no artigo para ver o conteúdo →</span>
        </div>
        {estrutura.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Nenhuma estrutura hierárquica encontrada</div>
          : estrutura.map((node) => renderNode(node, 0, "root"))}
      </div>
      <div style={{ flex: "0 0 40%", minWidth: 300, overflow: "auto", background: "var(--bg-hover)", borderRadius: 12, border: "1px solid var(--border)", padding: 16 }}>
        {!selArt ? (
          <div style={{ textAlign: "center", paddingTop: 80, color: "var(--text-sec)" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📑</div>
            <div style={{ fontSize: 14 }}>Selecione um artigo no mapa para visualizar seu conteúdo.</div>
          </div>
        ) : !artDetail ? (
          <div style={{ textAlign: "center", paddingTop: 80, color: "var(--text-sec)" }}>Artigo não encontrado nos dispositivos.</div>
        ) : (
          <div className="fade">
            {artPath && <div style={{ fontSize: 11, color: "var(--text-sec)", marginBottom: 8, fontStyle: "italic", lineHeight: 1.5 }}>{artPath}</div>}
            {artDetail.map((d, i) => {
              const isArt = d.tipo === "ARTIGO" || d.tipo === "PERGUNTA"; const isRev = d.status === "revogado"; const isVet = d.status === "vetado"; const isInativo = isRev || isVet;
              return (
                <div key={i} style={{ marginBottom: isArt ? 8 : 2, paddingLeft: isArt ? 0 : 16, opacity: isInativo ? 0.6 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ color: isInativo ? "#e74c3c" : "var(--gold)", fontWeight: 700, fontSize: isArt ? 14 : 12 }}>{d.id}</span>
                    {isArt && <span className={isInativo ? "badge badge-revogado" : "badge badge-vigente"}>{isVet ? "VETADO" : isRev ? "REVOGADO" : "VIGENTE"}</span>}
                    {!isArt && isInativo && <span className="badge badge-revogado" style={{ fontSize: 9 }}>{isVet ? "VETADO" : "REVOGADO"}</span>}
                  </div>
                  <div style={{ fontSize: isArt ? 13 : 12, lineHeight: 1.6, textDecoration: isInativo ? "line-through" : "none", color: "var(--text)" }}>
                    {d.rub && <i style={{ color: "var(--text-sec)" }}>{d.rub} </i>}{d.txt}
                  </div>
                  {d.alteracao && <div style={{ marginTop: 2, padding: "2px 8px", background: "rgba(52,152,219,0.08)", borderLeft: "2px solid #3498db", borderRadius: 3, fontSize: 11, color: "#3498db", textDecoration: "none" }}>↳ {d.alteracao}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
