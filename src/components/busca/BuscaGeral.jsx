import { useState, useEffect, useMemo, createElement } from 'react';
import { DIV } from '../../constants/patterns';
import { fullTextSearch, hierarquia } from '../../utils/search';

export default function BuscaGeral({ lib }) {
  const [filtro, setFiltro] = useState("");
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [selLeis, setSelLeis] = useState(() => new Set(lib.map(l => l.id)));
  const allSelected = lib.length > 0 && selLeis.size === lib.length;

  useEffect(() => {
    setSelLeis(prev => {
      const ids = new Set(lib.map(l => l.id));
      const next = new Set();
      for (const id of prev) { if (ids.has(id)) next.add(id); }
      for (const id of ids) { if (!prev.has(id)) next.add(id); }
      return next;
    });
  }, [lib]);

  const toggleLei = (id) => {
    setSelLeis(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setExpandedIdx(null);
  };
  const toggleAll = () => {
    if (allSelected) setSelLeis(new Set());
    else setSelLeis(new Set(lib.map(l => l.id)));
    setExpandedIdx(null);
  };

  const resultados = useMemo(() => {
    if (!filtro || filtro.trim().length < 3) return [];
    const res = [];
    for (const lei of lib) {
      if (!selLeis.has(lei.id)) continue;
      try {
        const hits = fullTextSearch(lei.ds, filtro);
        for (const h of hits) res.push({ ...h, leiId: lei.id, leiNome: lei.nome, ds: lei.ds });
      } catch (_) {}
    }
    return res;
  }, [filtro, lib, selLeis]);

  const totalOcorrencias = useMemo(() => resultados.reduce((s, r) => s + r.ocorrencias, 0), [resultados]);
  const leisComResultados = useMemo(() => new Set(resultados.map(r => r.leiId)).size, [resultados]);
  const buscaAtiva = filtro.trim().length >= 3;

  const ctxMap = useMemo(() => {
    const m = {};
    for (const lei of lib) { try { m[lei.id] = hierarquia(lei.ds); } catch (_) { m[lei.id] = {}; } }
    return m;
  }, [lib]);

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

  const getArtigoDisps = (ds, artId) => {
    const result = []; let inside = false;
    for (const d of ds) {
      if (d.tipo === "ARTIGO" && d.id === artId) { inside = true; result.push(d); continue; }
      if (inside) { if (d.tipo === "ARTIGO" || DIV.has(d.tipo)) break; result.push(d); }
    }
    return result;
  };

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Busca Geral</h2>
      <p style={{ fontSize: 13, color: "var(--text-sec)", marginBottom: 14 }}>Pesquise em todas as leis da biblioteca ou selecione quais incluir na busca.</p>

      {lib.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>
          Nenhuma lei na biblioteca. Adicione leis pela aba <b>Biblioteca</b> para utilizar a busca geral.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14, border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", background: "var(--bg-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor: "var(--gold)" }} />
                {allSelected ? "Desmarcar todas" : "Selecionar todas"} ({lib.length} lei(s))
              </label>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {lib.map(l => (
                <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, padding: "3px 8px", borderRadius: 5, background: selLeis.has(l.id) ? "var(--gold-subtle)" : "var(--bg-hover)", border: "1px solid " + (selLeis.has(l.id) ? "var(--gold)" : "var(--border)"), transition: "all .15s" }}>
                  <input type="checkbox" checked={selLeis.has(l.id)} onChange={() => toggleLei(l.id)} style={{ accentColor: "var(--gold)", width: 12, height: 12 }} />
                  <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nome}</span>
                  <span style={{ color: "var(--text-mute)", fontSize: 10 }}>({l.nA} art.)</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <input value={filtro} onChange={e => { setFiltro(e.target.value); setExpandedIdx(null); }}
              placeholder="Buscar palavra (min. 3 letras) - Use + para AND: cofins + importacao + credito"
              style={{ width: "100%", maxWidth: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 14px", fontSize: 14, boxSizing: "border-box" }} />
            {buscaAtiva && (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-sec)" }}>
                {totalOcorrencias} ocorrencia(s) em {resultados.length} dispositivo(s) de {leisComResultados} lei(s)
              </div>
            )}
          </div>

          {buscaAtiva && selLeis.size === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Selecione pelo menos uma lei para realizar a busca.</div>
          )}
          {buscaAtiva && selLeis.size > 0 && resultados.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Nenhum dispositivo encontrado para "{filtro}" nas leis selecionadas.</div>
          )}
          {buscaAtiva && resultados.length > 0 && (
            <div style={{ maxHeight: "65vh", overflow: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              <table className="dt">
                <thead><tr><th style={{ width: 40 }}>#</th><th style={{ width: 180 }}>Lei</th><th style={{ width: 70 }}>Tipo</th><th style={{ width: 90 }}>Id</th><th style={{ width: 80 }}>Artigo</th><th>Texto</th><th style={{ width: 40 }}>Qtd</th></tr></thead>
                <tbody>
                  {resultados.map((r, i) => (
                    <tr key={r.leiId + "-" + i} style={{ opacity: r.status === "vetado" || r.status === "revogado" ? 0.5 : 1, cursor: "pointer", background: expandedIdx === i ? "var(--gold-subtle)" : "inherit" }} onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
                      <td>{i + 1}</td>
                      <td style={{ fontSize: 11, fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.leiNome}>{r.leiNome}</td>
                      <td><span className="badge" style={{ background: "var(--gold-subtle)", color: "var(--gold)" }}>{r.tipo}</span></td>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>{r.id}</td>
                      <td style={{ color: "var(--gold)", fontWeight: 600 }}>{r.art}</td>
                      <td style={{ fontSize: 12, lineHeight: 1.5 }}>{highlightText((r.txt || "").slice(0, 250) + (r.txt?.length > 250 ? "..." : ""), filtro)}</td>
                      <td style={{ fontWeight: 700, textAlign: "center", color: "var(--gold)" }}>{r.ocorrencias}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
