import { useState, useMemo, createElement, Fragment } from 'react';
import { AREAS } from '../../constants/areas';
import { DIV } from '../../constants/patterns';
import { fullTextSearch, buildIdx, hierarquia } from '../../utils/search';

export default function TabIndice({ ds, area, onGoToArt }) {
  const [filtro, setFiltro] = useState("");
  const [expandedIdx, setExpandedIdx] = useState(null);
  const idxPredefinido = useMemo(() => buildIdx(ds, area), [ds, area]);
  const resultadosBusca = useMemo(() => fullTextSearch(ds, filtro), [ds, filtro]);
  const totalOcorrencias = useMemo(() => resultadosBusca.reduce((s, r) => s + r.ocorrencias, 0), [resultadosBusca]);
  const buscaAtiva = filtro.trim().length >= 3;
  const ctx = useMemo(() => hierarquia(ds), [ds]);

  const highlightText = (text, term) => {
    if (!term || term.length < 3 || !text) return text;
    try {
      const termos = term.split("+").map(t => t.trim()).filter(t => t.length >= 3);
      if (termos.length === 0) return text;
      const escaped = termos.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const re = new RegExp(`(${escaped})`, "gi");
      const parts = text.split(re);
      return parts.map((p, i) => re.test(p) ? createElement("mark", { key: i, style: { background: "rgba(212,168,83,0.35)", padding: "0 1px", borderRadius: 2 } }, p) : p);
    } catch (_) { return text; }
  };

  const getArtigoDisps = (artId) => {
    const result = []; let inside = false;
    for (const d of ds) {
      if ((d.tipo === "ARTIGO" || d.tipo === "PERGUNTA") && d.id === artId) { inside = true; result.push(d); continue; }
      if (inside) { if (d.tipo === "ARTIGO" || d.tipo === "PERGUNTA" || DIV.has(d.tipo)) break; result.push(d); }
    }
    return result;
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <input value={filtro} onChange={e => { setFiltro(e.target.value); setExpandedIdx(null); }} placeholder="Buscar palavra (mín. 3 letras) · Use + para AND: lucro presumido + faturamento" style={{ width: "100%", maxWidth: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 14px", fontSize: 14, boxSizing: "border-box" }} />
        {buscaAtiva && <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-sec)" }}>{totalOcorrencias} ocorrência(s) em {resultadosBusca.length} dispositivo(s)</div>}
      </div>
      {buscaAtiva ? (
        resultadosBusca.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Nenhum dispositivo encontrado para "{filtro}"</div>
          : <div style={{ maxHeight: "65vh", overflow: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
            <table className="dt">
              <thead><tr><th style={{ width: 60 }}>#</th><th style={{ width: 80 }}>Tipo</th><th style={{ width: 100 }}>Id</th><th style={{ width: 80 }}>Artigo</th><th>Texto</th><th style={{ width: 40 }}>Qtd</th></tr></thead>
              <tbody>{resultadosBusca.map((r, i) => (
                <Fragment key={i}>
                  <tr style={{ opacity: r.status === "vetado" || r.status === "revogado" ? 0.5 : 1, cursor: "pointer", background: expandedIdx === i ? "var(--gold-subtle)" : "inherit" }} onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
                    <td>{i + 1}</td>
                    <td><span className="badge" style={{ background: "var(--gold-subtle)", color: "var(--gold)" }}>{r.tipo}</span></td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{r.id}</td>
                    <td style={{ color: "var(--gold)", fontWeight: 600 }}>{r.art}</td>
                    <td style={{ fontSize: 12, lineHeight: 1.5 }}>{highlightText((r.txt || "").slice(0, 300) + (r.txt?.length > 300 ? "..." : ""), filtro)}</td>
                    <td style={{ fontWeight: 700, textAlign: "center", color: "var(--gold)" }}>{r.ocorrencias}</td>
                  </tr>
                  {expandedIdx === i && (
                    <tr><td colSpan={6} style={{ padding: 0 }}>
                      <div style={{ padding: "12px 16px", background: "var(--bg-hover)", borderLeft: "3px solid var(--gold)" }}>
                        {ctx[r.art] && <div style={{ fontSize: 11, color: "var(--text-sec)", marginBottom: 8, fontStyle: "italic" }}>{ctx[r.art]}</div>}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {getArtigoDisps(r.art || r.id).map((d, j) => {
                            const isMatch = (() => { const ts = filtro.split("+").map(t => t.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")).filter(t => t.length >= 3); const tx = (d.txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); return ts.length > 0 && ts.every(t => tx.includes(t)); })();
                            return (
                              <div key={j} style={{ padding: "4px 8px", borderRadius: 4, background: isMatch ? "rgba(212,168,83,0.1)" : "transparent", fontSize: 12, lineHeight: 1.6 }}>
                                <span style={{ color: "var(--gold)", fontWeight: 600, marginRight: 6 }}>{d.id}</span>
                                {highlightText(d.txt || "", filtro)}
                                {d.status === "vetado" && <span className="badge badge-revogado" style={{ marginLeft: 6 }}>VETADO</span>}
                                {d.status === "revogado" && <span className="badge badge-revogado" style={{ marginLeft: 6 }}>REVOGADO</span>}
                              </div>
                            );
                          })}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onGoToArt(r.art || r.id); }} style={{ marginTop: 8, padding: "4px 12px", background: "var(--grad)", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Ir para Texto Integral →</button>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              ))}</tbody>
            </table>
          </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 10 }}>Palavras-chave do índice ({AREAS[area]?.nome}):</div>
          {Object.keys(idxPredefinido).length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Nenhuma palavra-chave encontrada no índice predefinido</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
              {Object.entries(idxPredefinido).map(([palavra, artigos]) => (
                <div key={palavra} className="cd" style={{ padding: 12, cursor: "pointer" }} onClick={() => { setFiltro(palavra); }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{palavra}</div>
                  <div style={{ fontSize: 11, color: "var(--text-sec)" }}>{artigos.length} artigo(s): {artigos.slice(0, 3).join(", ")}{artigos.length > 3 ? "..." : ""}</div>
                </div>
              ))}
            </div>}
        </div>
      )}
    </div>
  );
}
