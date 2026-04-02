import { useState, useEffect, useMemo, createElement, Fragment } from 'react';
import { DIV } from '../../constants/patterns';
import { fullTextSearch, hierarquia } from '../../utils/search';

export default function BuscaGeral({ lib, study = {}, tagsConfig = [] }) {
  const [filtro, setFiltro] = useState("");
  const [selTags, setSelTags] = useState([]);
  const [scope, setScope] = useState({ legis: true, notas: true });
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [selLeis, setSelLeis] = useState(() => new Set(lib.map(l => l.id)));
  const [showSelector, setShowSelector] = useState(false);
  const [leiFilter, setLeiFilter] = useState("");
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  const toggleTag = (tid) => {
    setSelTags(prev => prev.includes(tid) ? prev.filter(x => x !== tid) : [...prev, tid]);
    setExpandedIdx(null);
  };
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
    const termoBusca = (filtro || "").trim();
    const tagsFiltro = selTags.map(tid => "#" + tagsConfig.find(t => t.id === tid)?.name).filter(Boolean);
    if (termoBusca.length < 3 && tagsFiltro.length === 0) return [];
    const termoFinal = [...tagsFiltro, termoBusca].filter(t => t.length >= 3 || t.startsWith("#")).join(" + ");
    const res = [];
    for (const lei of lib) {
      if (!selLeis.has(lei.id)) continue;
      try {
        const hits = fullTextSearch(lei.ds, termoFinal, lei.id, study, tagsConfig, scope);
        for (const h of hits) res.push({ ...h, leiId: lei.id, leiNome: lei.nome, ds: lei.ds });
      } catch (_) {}
    }
    return res;
  }, [filtro, selTags, scope, lib, selLeis, study, tagsConfig]);

  const totalOcorrencias = useMemo(() => resultados.reduce((s, r) => s + r.ocorrencias, 0), [resultados]);
  const leisComResultados = useMemo(() => new Set(resultados.map(r => r.leiId)).size, [resultados]);
  const buscaAtiva = filtro.trim().length >= 3 || selTags.length > 0;

  const ctxMap = useMemo(() => {
    const m = {};
    for (const lei of lib) { try { m[lei.id] = hierarquia(lei.ds); } catch (_) { m[lei.id] = {}; } }
    return m;
  }, [lib]);

  const highlightText = (text, term) => {
    if (!term || term.length < 3 || !text) return text;
    try {
      const termos = term.split("+").map(t => t.trim()).filter(t => t.length >= 3 || t.startsWith("#"));
      if (termos.length === 0) return text;
      const escaped = termos.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const re = new RegExp(`(${escaped})`, "gi");
      const parts = text.split(re);
      return parts.map((p, i) => re.test(p) ? createElement("mark", { key: i, style: { background: "rgba(212,168,83,0.35)", padding: "0 1px", borderRadius: 2, fontWeight: p.startsWith("#") ? 700 : 400 } }, p) : p);
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
          {/* Campo de busca principal */}
          <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={filtro} onChange={e => { setFiltro(e.target.value); setExpandedIdx(null); }}
              placeholder="Buscar palavra (mín. 3 letras) · Use + para AND: cofins + importação + crédito"
              style={{ width: "100%", maxWidth: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", fontSize: 15, boxSizing: "border-box", boxShadow: "var(--shadow)" }} />

            <div style={{ display: "flex", gap: 15, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", background: "var(--bg-card)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sec)" }}>Buscar em:</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12 }}>
                    <input type="checkbox" checked={scope.legis} onChange={e => setScope({ ...scope, legis: e.target.checked })} /> Legislação
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12 }}>
                    <input type="checkbox" checked={scope.notas} onChange={e => setScope({ ...scope, notas: e.target.checked })} /> Anotações
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sec)" }}>Tags:</span>
                  <button onClick={() => { setShowTagSelector(!showTagSelector); setShowSelector(false); }} className="nb" style={{ background: showTagSelector ? "var(--gold-subtle)" : "var(--bg-hover)", border: "1px solid " + (showTagSelector ? "var(--gold)" : "var(--border)"), padding: "4px 8px", height: "auto" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: showTagSelector ? "var(--gold)" : "var(--text-sec)" }}>
                      {selTags.length === 0 ? "Todas as tags" : selTags.length + " selecionada(s)"}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.7 }}>{showTagSelector ? "▲" : "▼"}</span>
                  </button>
                  {selTags.length > 0 && <button onClick={() => setSelTags([])} style={{ border: "none", background: "none", color: "var(--err)", fontSize: 10, cursor: "pointer", textDecoration: "underline" }}>Limpar</button>}
                </div>
              </div>

              {/* Gatilho do Seletor de Leis */}
              <button onClick={() => { setShowSelector(!showSelector); setShowTagSelector(false); }} className="nb" style={{ background: showSelector ? "var(--gold-subtle)" : "var(--bg-hover)", border: "1px solid " + (showSelector ? "var(--gold)" : "var(--border)"), padding: "5px 10px", height: "auto" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: showSelector ? "var(--gold)" : "var(--text-sec)" }}>
                  {selLeis.size === lib.length ? "Todas as leis (" + lib.length + ")" : selLeis.size + " lei(s) selecionada(s)"}
                </span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{showSelector ? "▲" : "▼"}</span>
              </button>
            </div>

            {/* Painel de Tags Retrátil */}
            {showTagSelector && (
              <div className="fade" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: "var(--bg-card)", boxShadow: "var(--shadow)", marginTop: -5 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <input value={tagSearch} onChange={e => setTagSearch(e.target.value)}
                    placeholder="Pesquisar tags..."
                    style={{ fontSize: 11, padding: "5px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-hover)", flex: 1, maxWidth: 250 }} />
                  <button onClick={() => setShowTagSelector(false)} className="nb" style={{ fontSize: 11, padding: "4px 8px" }}>Fechar</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                  {tagsConfig.length === 0 && <span style={{ fontSize: 11, color: "var(--text-mute)" }}>Nenhuma tag cadastrada</span>}
                  {tagsConfig.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())).map(t => {
                    const isSel = selTags.includes(t.id);
                    return (
                      <span key={t.id} onClick={() => toggleTag(t.id)}
                        style={{ cursor: "pointer", fontSize: 11, padding: "3px 10px", borderRadius: 5, border: "1px solid " + (isSel ? t.color : "var(--border)"), background: isSel ? t.color : "var(--bg-hover)", color: isSel ? "#fff" : "var(--text-sec)", transition: "all 0.1s", fontWeight: isSel ? 600 : 400 }}>
                        #{t.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Painel de Escopo Retrátil */}
            {showSelector && (
              <div className="fade" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: "var(--bg-card)", boxShadow: "var(--shadow)", marginTop: -5 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <input value={leiFilter} onChange={e => setLeiFilter(e.target.value)}
                      placeholder="Filtrar leis por nome ou número..."
                      style={{ fontSize: 12, padding: "6px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg-hover)", width: "100%", maxWidth: 300 }} />
                    <span style={{ fontSize: 11, color: "var(--text-mute)" }}>{lib.filter(l => l.nome.toLowerCase().includes(leiFilter.toLowerCase())).length} de {lib.length}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={toggleAll} className="nb" style={{ fontSize: 11, padding: "4px 8px", background: "var(--bg-hover)" }}>
                      {allSelected ? "Desmarcar Todas" : "Selecionar Todas"}
                    </button>
                    <button onClick={() => setShowSelector(false)} className="nb" style={{ fontSize: 11, padding: "4px 8px" }}>Fechar</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6, maxHeight: 250, overflowY: "auto", paddingRight: 5 }}>
                  {lib.filter(l => l.nome.toLowerCase().includes(leiFilter.toLowerCase())).map(l => (
                    <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, padding: "5px 8px", borderRadius: 5, background: selLeis.has(l.id) ? "var(--gold-subtle)" : "transparent", border: "1px solid " + (selLeis.has(l.id) ? "var(--gold)" : "transparent"), transition: "all .1s" }}>
                      <input type="checkbox" checked={selLeis.has(l.id)} onChange={() => toggleLei(l.id)} style={{ accentColor: "var(--gold)", width: 13, height: 13 }} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.nome}>{l.nome}</span>
                      <span style={{ color: "var(--text-mute)", fontSize: 9, minWidth: 40, textAlign: "right" }}>{l.nA} art.</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {buscaAtiva && (
              <div style={{ marginTop: 2, fontSize: 12, color: "var(--text-sec)" }}>
                {totalOcorrencias} ocorrência(s) em {resultados.length} dispositivo(s) de {leisComResultados} lei(s)
              </div>
            )}
          </div>

          {/* Resultados */}
          {buscaAtiva && selLeis.size === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Selecione pelo menos uma lei para realizar a busca.</div>
          )}
          {buscaAtiva && selLeis.size > 0 && resultados.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Nenhum dispositivo encontrado para "{filtro}" nas leis selecionadas.</div>
          )}
          {buscaAtiva && resultados.length > 0 && (
            <div style={{ maxHeight: "65vh", overflow: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              <table className="dt">
                <thead><tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 180 }}>Lei</th>
                  <th style={{ width: 70 }}>Tipo</th>
                  <th style={{ width: 90 }}>Id</th>
                  <th style={{ width: 80 }}>Artigo</th>
                  <th>Texto</th>
                  <th style={{ width: 40 }}>Qtd</th>
                </tr></thead>
                <tbody>
                  {resultados.map((r, i) => (
                    <Fragment key={r.leiId + "-" + i}>
                      <tr style={{ opacity: r.status === "vetado" || r.status === "revogado" ? 0.5 : 1, cursor: "pointer", background: expandedIdx === i ? "var(--gold-subtle)" : "inherit" }}
                        onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
                        <td>{i + 1}</td>
                        <td style={{ fontSize: 11, fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.leiNome}>{r.leiNome}</td>
                        <td><span className="badge" style={{ background: "var(--gold-subtle)", color: "var(--gold)" }}>{r.tipo}</span></td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{r.id}</td>
                        <td style={{ color: "var(--gold)", fontWeight: 600 }}>{r.art}</td>
                        <td style={{ fontSize: 12, lineHeight: 1.5 }}>
                          {highlightText((r.txt || "").slice(0, 250) + (r.txt?.length > 250 ? "…" : ""), filtro)}
                          {(() => {
                            const k = `${r.leiId}-${r.idx}`;
                            const note = study[k]?.note || "";
                            if (note && scope.notas) {
                              const plainNote = note.replace(/<[^>]*>/g, "");
                              return (
                                <div style={{ marginTop: 4, padding: 4, background: "var(--gold-subtle)", borderRadius: 4, fontSize: 11, borderLeft: "2px solid var(--gold)" }}>
                                  <b>Anotação:</b> {highlightText(plainNote.slice(0, 150) + (plainNote.length > 150 ? "…" : ""), filtro)}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td style={{ fontWeight: 700, textAlign: "center", color: "var(--gold)" }}>{r.ocorrencias}</td>
                      </tr>
                      {expandedIdx === i && (
                        <tr><td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ padding: "12px 16px", background: "var(--bg-hover)", borderLeft: "3px solid var(--gold)" }}>
                            <div style={{ fontSize: 11, color: "var(--gold)", marginBottom: 4, fontWeight: 600 }}>{r.leiNome}</div>
                            {ctxMap[r.leiId]?.[r.art] && <div style={{ fontSize: 11, color: "var(--text-sec)", marginBottom: 8, fontStyle: "italic" }}>{ctxMap[r.leiId][r.art]}</div>}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {getArtigoDisps(r.ds, r.art || r.id).map((d, j) => {
                                const ri = r.ds.indexOf(d);
                                const k = `${r.leiId}-${ri}`;
                                const note = study[k]?.note || "";
                                const tags = study[k]?.tags || [];
                                const noteTags = study[k]?.noteTags || [];
                                const tagNames = tagsConfig.filter(t => tags.includes(t.id) || noteTags.includes(t.id)).map(t => t.name).join(" ");
                                const isMatch = (() => {
                                  const tagsFiltro = selTags.map(tid => "#" + tagsConfig.find(t => t.id === tid)?.name).filter(Boolean);
                                  const termoFinal = [...tagsFiltro, filtro].filter(t => t.trim().length >= 3 || t.startsWith("#")).join(" + ");
                                  const ts = termoFinal.split("+").map(t => t.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")).filter(t => t.length >= 3 || t.startsWith("#"));
                                  const tx = ((d.txt || "") + " " + note + " " + tagNames).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                  return ts.length > 0 && ts.every(t => tx.includes(t));
                                })();
                                return (
                                  <div key={j} style={{ padding: "8px", borderRadius: 6, background: isMatch ? "rgba(212,168,83,0.1)" : "transparent", fontSize: 12, lineHeight: 1.6, border: isMatch ? "1px solid var(--gold-subtle)" : "1px solid transparent", marginBottom: 4 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                      <span style={{ color: "var(--gold)", fontWeight: 600 }}>{d.id}</span>
                                      {tagsConfig.filter(t => tags.includes(t.id)).map(t => <span key={t.id} style={{ background: t.color, color: "#fff", fontSize: 9, padding: "1px 4px", borderRadius: 3 }}>{t.name}</span>)}
                                    </div>
                                    {highlightText(d.txt || "", filtro)}
                                    {note && (
                                      <div style={{ marginTop: 6, padding: 6, background: "var(--bg-card)", borderRadius: 4, borderLeft: "3px solid var(--gold)" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                                          ANOTAÇÃO
                                          {tagsConfig.filter(t => noteTags.includes(t.id)).map(t => <span key={t.id} style={{ background: t.color, color: "#fff", fontSize: 9, padding: "1px 4px", borderRadius: 3, fontWeight: 400 }}>{t.name}</span>)}
                                        </div>
                                        <div dangerouslySetInnerHTML={{ __html: highlightText(note, filtro) }} />
                                      </div>
                                    )}
                                    {d.status === "vetado" && <span className="badge badge-revogado" style={{ marginLeft: 6 }}>VETADO</span>}
                                    {d.status === "revogado" && <span className="badge badge-revogado" style={{ marginLeft: 6 }}>REVOGADO</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td></tr>
                      )}
                    </Fragment>
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
