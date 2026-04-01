import { useState } from 'react';
import { Ic, IC, Sp } from '../../constants/icons';
import { LS } from '../../utils/storage';

export default function EConsultorAnotacoes({ lib }) {
  const [temas, setTemas] = useState(() => LS("t3-temas") || []);
  const [notas, setNotas] = useState(() => LS("t3-notas") || []);
  const [temaSel, setTemaSel] = useState("");
  const [leiSel, setLeiSel] = useState("");
  const [texto, setTexto] = useState("");
  const [viewMode, setViewMode] = useState("form");
  const [temaView, setTemaView] = useState(null);
  const [editNota, setEditNota] = useState(null);
  const [novoTema, setNovoTema] = useState("");

  const salvarTemas = (t) => { setTemas(t); LS("t3-temas", t); };
  const salvarNotas = (n) => { setNotas(n); LS("t3-notas", n); };

  const addTema = () => {
    const nome = novoTema.trim();
    if (!nome) { alert("Digite o nome do tema."); return; }
    if (temas.includes(nome)) { alert("Esse tema ja existe."); return; }
    salvarTemas([...temas, nome]);
    setNovoTema("");
  };

  const delTema = (tema) => {
    const notasTema = notas.filter(n => n.tema === tema);
    if (notasTema.length > 0) {
      if (!confirm(`O tema "${tema}" possui ${notasTema.length} anotacao(oes). Deseja excluir o tema e todas as anotacoes vinculadas?`)) return;
      salvarNotas(notas.filter(n => n.tema !== tema));
    }
    salvarTemas(temas.filter(t => t !== tema));
    if (temaView === tema) { setTemaView(null); setViewMode("form"); }
  };

  const addNota = () => {
    if (!temaSel) { alert("Selecione um tema."); return; }
    if (!texto.trim()) { alert("Escreva a anotacao."); return; }
    const nova = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      tema: temaSel, lei: leiSel || "",
      leiNome: leiSel ? lib.find(l => l.id === leiSel)?.nome || "" : "",
      texto: texto.trim(),
      data: new Date().toLocaleDateString("pt-BR"),
      dataISO: new Date().toISOString()
    };
    salvarNotas([nova, ...notas]);
    setTexto("");
  };

  const updateNota = (id, novoTexto) => {
    salvarNotas(notas.map(n => n.id === id ? { ...n, texto: novoTexto, dataEdit: new Date().toLocaleDateString("pt-BR") } : n));
    setEditNota(null);
  };

  const deleteNota = (id) => {
    if (!confirm("Excluir esta anotacao?")) return;
    salvarNotas(notas.filter(n => n.id !== id));
    setEditNota(null);
  };

  const limparForm = () => { setTemaSel(""); setLeiSel(""); setTexto(""); };
  const notasDoTema = temaView ? notas.filter(n => n.tema === temaView) : [];

  return (
    <div style={{ display: "flex", gap: 16, height: "68vh" }}>
      <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", border: "2px solid var(--gold)", borderRadius: 12, padding: 12, overflow: "hidden", minHeight: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "var(--gold)" }}>TEMAS</div>
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 10, minHeight: 0 }}>
          {temas.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-mute)", textAlign: "center", padding: 20 }}>Nenhum tema cadastrado</div>
            : temas.map((t, i) => (
              <div key={i} onClick={() => { setTemaView(t); setViewMode("list"); }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: temaView === t ? "var(--gold-subtle)" : "var(--bg-hover)", border: temaView === t ? "1px solid var(--gold)" : "1px solid transparent", transition: "all .12s" }}>
                <span style={{ fontSize: 13, fontWeight: temaView === t ? 600 : 400, color: temaView === t ? "var(--gold)" : "var(--text)" }}>{t}</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--text-mute)" }}>{notas.filter(n => n.tema === t).length}</span>
                  <button onClick={e => { e.stopPropagation(); delTema(t); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 1 }} title="Excluir tema"><Ic d={IC.tr} s={11} c="var(--text-mute)" /></button>
                </div>
              </div>
            ))}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <input value={novoTema} onChange={e => setNovoTema(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addTema(); }} placeholder="Novo tema..." style={{ flex: 1, padding: "7px 10px", borderRadius: 6, fontSize: 12 }} />
          <button onClick={addTema} style={{ padding: "7px 12px", background: "var(--grad)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Incluir</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {viewMode === "list" && temaView ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div><span style={{ fontSize: 16, fontWeight: 700 }}>Anotacoes — </span><span style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>{temaView}</span><span style={{ fontSize: 12, color: "var(--text-sec)", marginLeft: 8 }}>({notasDoTema.length} anotacao(oes))</span></div>
              <button onClick={() => { setViewMode("form"); setTemaView(null); }} style={{ padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "none", cursor: "pointer", fontSize: 12, color: "var(--text-sec)" }}>Voltar</button>
            </div>
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {notasDoTema.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Nenhuma anotacao neste tema</div>
                : notasDoTema.map(n => (
                  <div key={n.id} className="cd" style={{ padding: 14 }}>
                    {editNota === n.id ? (
                      <div>
                        <textarea defaultValue={n.texto} id={"edit-" + n.id} style={{ width: "100%", minHeight: 80, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 6, padding: 10, fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <button onClick={() => { const el = document.getElementById("edit-" + n.id); if (el) updateNota(n.id, el.value); }} style={{ padding: "6px 14px", background: "var(--grad)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Salvar</button>
                          <button onClick={() => setEditNota(null)} style={{ padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "none", cursor: "pointer", fontSize: 12, color: "var(--text-sec)" }}>Cancelar</button>
                          <button onClick={() => deleteNota(n.id)} style={{ padding: "6px 14px", border: "1px solid #e74c3c", borderRadius: 6, background: "none", cursor: "pointer", fontSize: 12, color: "#e74c3c", marginLeft: "auto" }}>Excluir</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setEditNota(n.id)} style={{ cursor: "pointer" }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span className="badge" style={{ background: "var(--gold-subtle)", color: "var(--gold)" }}>{n.tema}</span>
                          {n.leiNome && <span className="badge" style={{ background: "rgba(52,152,219,0.1)", color: "#3498db" }}>{n.leiNome}</span>}
                          <span style={{ fontSize: 10, color: "var(--text-mute)", marginLeft: "auto" }}>{n.data}{n.dataEdit ? " (editado " + n.dataEdit + ")" : ""}</span>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.texto}</div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>INCLUIR ANOTACOES</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <select value={temaSel} onChange={e => setTemaSel(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: 6, fontSize: 13 }}>
                <option value="">Selecionar Tema...</option>
                {temas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={leiSel} onChange={e => setLeiSel(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: 6, fontSize: 13 }}>
                <option value="">Selecionar Lei (opcional)...</option>
                {lib.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escreva sua anotacao aqui..." style={{ flex: 1, minHeight: 200, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={limparForm} style={{ padding: "10px 24px", border: "1px solid var(--border)", borderRadius: 6, background: "none", cursor: "pointer", fontSize: 13, color: "var(--text-sec)" }}>Limpar</button>
              <button onClick={addNota} style={{ padding: "10px 24px", background: "var(--grad)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Incluir</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
