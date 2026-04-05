import { useState, useEffect, useRef, useMemo } from 'react';
import { Sp } from '../../constants/icons';

export default function TabTeia({ ds, buildRecursiveTree, buildRecursiveChain }) {
  const [artFilter, setArtFilter] = useState("");
  const [startArt, setStartArt] = useState("");
  const [tree, setTree] = useState(null);
  const [traced, setTraced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selNode, setSelNode] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" or "graph"
  const workerRef = useRef(null);
  const svgRef = useRef(null);

  const arts = useMemo(() => ds.filter(d => (d.tipo === "ARTIGO" || d.tipo === "PERGUNTA") && d.status !== "vetado").map(d => d.id), [ds]);
  const filteredArts = useMemo(() => {
    if (!artFilter.trim()) return arts;
    const f = artFilter.toLowerCase().replace(/\s/g, "");
    return arts.filter(a => a.toLowerCase().replace(/\s/g, "").includes(f));
  }, [arts, artFilter]);

  const rows = useMemo(() => {
    if (!tree) return [];
    const result = [];
    const visit = (node, depth, parentId) => {
      result.push({ node, depth, parentId });
      for (const child of node.children || []) visit(child, depth + 1, node.id);
    };
    visit(tree, 0, null);
    return result;
  }, [tree]);

  useEffect(() => {
    return () => { if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; } };
  }, []);

  useEffect(() => {
    if (viewMode === "graph" && tree && svgRef.current) {
      import('./renderD3Tree').then(m => m.default(tree, svgRef.current, (nodeData) => setSelNode(nodeData)));
    }
  }, [viewMode, tree]);

  const tracar = () => {
    if (!startArt) return;
    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
    setLoading(true); setTree(null); setTraced(false); setSelNode(null);
    try {
      const worker = new Worker(new URL('../../workers/teia.worker.js', import.meta.url));
      workerRef.current = worker;
      worker.onmessage = e => {
        workerRef.current = null;
        const newTree = e.data.ok ? e.data.tree : null;
        setTree(newTree);
        if (!e.data.ok) console.error("Teia worker erro:", e.data.error);
        setTraced(true); setLoading(false);
        if (newTree) setSelNode(newTree);
      };
      worker.onerror = err => {
        workerRef.current = null;
        console.error("Teia worker falhou:", err);
        setTree(null); setTraced(true); setLoading(false);
      };
      worker.postMessage({ ds, startId: startArt });
    } catch (e) {
      console.warn("Web Worker indisponível, usando main thread:", e);
      setTimeout(() => {
        try {
          const newTree = buildRecursiveTree(startArt);
          setTree(newTree);
          if (newTree) setSelNode(newTree);
        } catch (ex) { console.error(ex); setTree(null); }
        setTraced(true); setLoading(false);
      }, 50);
    }
  };

  const countNodes = nd => !nd ? 0 : 1 + (nd.children || []).reduce((s, c) => s + countNodes(c), 0);
  const totalNodes = tree ? countNodes(tree) : 0;

  return (
    <div style={{ display: "flex", gap: 0, height: "75vh", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg-card)" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "var(--gold)", marginBottom: 8 }}>TRAÇAR TEIA</div>
          <input value={artFilter} onChange={e => setArtFilter(e.target.value)} placeholder="Filtrar artigo… ex: 591" style={{ width: "100%", padding: "6px 10px", borderRadius: 5, fontSize: 12, marginBottom: 6, boxSizing: "border-box", outline: "none" }} />
          <select value={startArt} onChange={e => setStartArt(e.target.value)} style={{ width: "100%", padding: "7px 8px", borderRadius: 5, fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}>
            <option value="">Selecione o Artigo…</option>
            {filteredArts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={tracar} disabled={loading || !startArt} style={{ width: "100%", padding: "9px", background: loading || !startArt ? "var(--bg-hover)" : "var(--grad)", color: loading || !startArt ? "var(--text-sec)" : "#0c0e12", border: "none", borderRadius: 6, fontWeight: 700, cursor: loading || !startArt ? "not-allowed" : "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
            {loading && <Sp />}{loading ? "Processando…" : "Traçar Teia"}
          </button>
          {traced && tree && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-sec)", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 600, color: "var(--gold)" }}>{totalNodes}</span> nó(s) mapeados
              {tree.externalRefs?.length > 0 && <> · <span style={{ fontWeight: 600, color: "#3498db" }}>{tree.externalRefs.length}</span> ref(s) ext.</>}
            </div>
          )}
        </div>
        <div style={{ padding: "7px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {[["var(--ok)", "Vigente"], ["#e74c3c", "Revogado"], ["#3498db", "Refs. ext."]].map(([c, lb]) => (
            <div key={lb} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-sec)" }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: c, flexShrink: 0, display: "inline-block" }} />{lb}
            </div>
          ))}
          {tree && <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
            <button onClick={() => setViewMode("list")} style={{ padding: "3px 8px", fontSize: 10, fontWeight: viewMode === "list" ? 700 : 400, background: viewMode === "list" ? "var(--gold-subtle)" : "transparent", border: "1px solid " + (viewMode === "list" ? "var(--gold)" : "var(--border)"), borderRadius: 4, cursor: "pointer", color: viewMode === "list" ? "var(--gold)" : "var(--text-sec)", fontFamily: "inherit" }}>Lista</button>
            <button onClick={() => setViewMode("graph")} style={{ padding: "3px 8px", fontSize: 10, fontWeight: viewMode === "graph" ? 700 : 400, background: viewMode === "graph" ? "var(--gold-subtle)" : "transparent", border: "1px solid " + (viewMode === "graph" ? "var(--gold)" : "var(--border)"), borderRadius: 4, cursor: "pointer", color: viewMode === "graph" ? "var(--gold)" : "var(--text-sec)", fontFamily: "inherit" }}>Grafo</button>
          </div>}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0 12px" }}>
          {!traced && !loading && <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "var(--text-mute)", lineHeight: 1.6 }}>Selecione um artigo e clique em<br /><b>Traçar Teia</b>.</div>}
          {loading && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--text-sec)" }}><Sp /><div style={{ marginTop: 10 }}>Processando remissões…</div></div>}
          {traced && !loading && !tree && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--text-mute)" }}>Artigo não encontrado ou sem dispositivo vigente.</div>}
          {rows.map((row, i) => {
            const isSel = selNode && selNode.id === row.node.id;
            const isRev = row.node.status === "revogado";
            const hasExt = row.node.externalRefs && row.node.externalRefs.length > 0;
            const dotColor = isRev ? "#e74c3c" : hasExt ? "#3498db" : "var(--ok)";
            const indent = row.depth * 16;
            return (
              <div key={row.node.id + "-" + i} style={{ position: "relative" }}>
                {row.depth > 0 && <div style={{ position: "absolute", left: indent + 6, top: 0, bottom: "50%", width: 1, background: "var(--border)" }} />}
                {row.depth > 0 && <div style={{ position: "absolute", left: indent + 6, top: "50%", width: 8, height: 1, background: "var(--border)" }} />}
                <button onClick={() => setSelNode(row.node)} style={{ display: "block", width: "calc(100% - " + (indent + 18) + "px)", marginLeft: indent + 10, marginBottom: 3, padding: "6px 10px", background: isSel ? "var(--gold-subtle)" : "transparent", border: "1px solid " + (isSel ? "var(--gold)" : "transparent"), borderRadius: 5, cursor: "pointer", textAlign: "left", transition: "background .1s,border-color .1s", fontFamily: "inherit", position: "relative", zIndex: 1 }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: dotColor, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: isSel ? "var(--gold)" : "var(--text)", textDecoration: isRev ? "line-through" : "none", letterSpacing: .3 }}>{row.node.id}</span>
                    {(row.node.children || []).length > 0 && <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--text-mute)", flexShrink: 0 }}>{row.node.children.length}↓</span>}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
        {viewMode === "graph" && tree ? (
          <div style={{ flex: 1, position: "relative" }}>
            <svg ref={svgRef} style={{ width: "100%", height: "100%", background: "var(--bg)" }} />
          </div>
        ) : !selNode ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: "var(--text-sec)" }}>
            <div style={{ fontSize: 32, opacity: .4 }}>📑</div>
            <div style={{ fontSize: 13 }}>Selecione um dispositivo na teia para visualizar.</div>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 28px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "var(--bg-card)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "var(--gold)" }}>{selNode.id}</span>
                <span className={selNode.status === "revogado" ? "badge badge-revogado" : "badge badge-vigente"}>{selNode.status === "revogado" ? "REVOGADO" : "VIGENTE"}</span>
              </div>
              {(selNode.children || []).length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--text-mute)", marginRight: 2, letterSpacing: 1 }}>CITA →</span>
                  {selNode.children.map(c => (
                    <button key={c.id} onClick={() => setSelNode(c)} style={{ fontSize: 10, padding: "2px 9px", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--gold)", cursor: "pointer", fontFamily: "inherit", transition: "background .1s,border-color .1s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--gold-subtle)"; e.currentTarget.style.borderColor = "var(--gold)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.borderColor = "var(--border)"; }}>{c.id}</button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 32px" }}>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 26px", lineHeight: 1.8, fontSize: 13.5, color: "var(--text)", marginBottom: 12, boxShadow: "var(--shadow)" }}>
                {selNode.status === "revogado" && <div style={{ fontSize: 11, color: "#e74c3c", marginBottom: 10, fontStyle: "italic" }}>Dispositivo revogado — ramificações não seguidas.</div>}
                <div style={{ textDecoration: selNode.status === "revogado" ? "line-through" : "none", whiteSpace: "pre-wrap", opacity: selNode.status === "revogado" ? .7 : 1 }}>{selNode.text || "(sem texto)"}</div>
                {selNode.alteracao && <div style={{ marginTop: 12, padding: "5px 12px", background: "rgba(52,152,219,0.07)", borderLeft: "2px solid #3498db", borderRadius: 3, fontSize: 11.5, color: "#3498db" }}>↳ {selNode.alteracao}</div>}
              </div>
              {selNode.subs && selNode.subs.length > 0 && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 22px", marginBottom: 12, boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: "var(--text-sec)", marginBottom: 10 }}>SUBDISPOSITIVOS</div>
                  {selNode.subs.map((s, i) => (
                    <div key={i} style={{ paddingLeft: 14, marginBottom: 7, fontSize: 12.5, lineHeight: 1.7, borderLeft: "2px solid var(--border)" }}>
                      <span style={{ color: "var(--gold)", fontWeight: 600, marginRight: 6 }}>{s.id}</span>
                      <span style={{ textDecoration: s.status === "revogado" ? "line-through" : "none", opacity: s.status === "revogado" ? .6 : 1 }}>{s.txt}</span>
                      {s.status === "revogado" && <span className="badge badge-revogado" style={{ marginLeft: 6 }}>REVOGADO</span>}
                      {s.externalRefs && s.externalRefs.length > 0 && (
                        <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {s.externalRefs.map((ext, j) => <span key={j} style={{ padding: "1px 8px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: "rgba(52,152,219,0.08)", color: "#3498db", border: "1px solid rgba(52,152,219,0.2)" }}>↗ {ext}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selNode.externalRefs && selNode.externalRefs.length > 0 && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 22px", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: "var(--text-sec)", marginBottom: 8 }}>REFERÊNCIAS EXTERNAS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {selNode.externalRefs.map((ext, i) => <span key={i} style={{ padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "rgba(52,152,219,0.08)", color: "#3498db", border: "1px solid rgba(52,152,219,0.2)" }}>↗ {ext}</span>)}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
