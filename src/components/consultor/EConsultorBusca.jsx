import { useState, useMemo, createElement } from 'react';
import { LS } from '../../utils/storage';

export default function EConsultorBusca({ lib }) {
  const [notas] = useState(() => LS("t3-notas") || []);
  const [temas] = useState(() => LS("t3-temas") || []);
  const [filtroTema, setFiltroTema] = useState("");
  const [filtroLei, setFiltroLei] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");

  const indiceInvertido = useMemo(() => {
    const idx = new Map();
    for (const n of notas) {
      const texto = ((n.tema || "") + " " + (n.leiNome || "") + " " + (n.texto || "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const tokens = texto.match(/\w{3,}/g) || [];
      for (const token of tokens) {
        for (let i = 0; i <= token.length - 3; i++) {
          const tri = token.slice(i, i + 3);
          if (!idx.has(tri)) idx.set(tri, new Set());
          idx.get(tri).add(n.id);
        }
      }
    }
    return idx;
  }, [notas]);

  const resultados = useMemo(() => {
    let filtered = [...notas];
    if (filtroTema) filtered = filtered.filter(n => n.tema === filtroTema);
    if (filtroLei) filtered = filtered.filter(n => n.lei === filtroLei);
    if (filtroTexto.trim().length >= 3) {
      const termo = filtroTexto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const tri = termo.slice(0, 3);
      const candidatos = indiceInvertido.get(tri);
      if (candidatos) {
        const candidatoIds = new Set(candidatos);
        filtered = filtered.filter(n => {
          if (!candidatoIds.has(n.id)) return false;
          const texto = ((n.tema || "") + " " + (n.leiNome || "") + " " + (n.texto || "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return texto.includes(termo);
        });
      } else {
        filtered = [];
      }
    }
    return filtered;
  }, [notas, filtroTema, filtroLei, filtroTexto, indiceInvertido]);

  const highlightText = (text, term) => {
    if (!term || term.length < 3 || !text) return text;
    try {
      const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      const parts = text.split(re);
      return parts.map((p, i) => re.test(p) ? createElement("mark", { key: i, style: { background: "rgba(212,168,83,0.4)", padding: "0 2px", borderRadius: 2 } }, p) : p);
    } catch (_) { return text; }
  };

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>E-CONSULTA</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <select value={filtroTema} onChange={e => setFiltroTema(e.target.value)} style={{ flex: "1 1 180px", padding: "10px", borderRadius: 6, fontSize: 13 }}>
          <option value="">Busca por Tema</option>
          {temas.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroLei} onChange={e => setFiltroLei(e.target.value)} style={{ flex: "1 1 180px", padding: "10px", borderRadius: 6, fontSize: 13 }}>
          <option value="">Busca por Legislação</option>
          {lib.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
        <input value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} placeholder="Palavra Chave (mín. 3 letras)..." style={{ flex: "1 1 200px", padding: "10px", borderRadius: 6, fontSize: 13, background: "var(--input-bg)", border: "1px solid var(--border)" }} />
      </div>
      <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 12 }}>{resultados.length} anotação(ões) encontrada(s){filtroTexto.length >= 3 ? ` para "${filtroTexto}"` : ""}</div>
      <div style={{ maxHeight: "58vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {resultados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>{notas.length === 0 ? "Nenhuma anotação cadastrada. Use a aba Anotações para incluir." : "Nenhuma anotação encontrada com os filtros aplicados."}</div>
        ) : resultados.map(n => (
          <div key={n.id} className="cd" style={{ padding: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="badge" style={{ background: "var(--gold-subtle)", color: "var(--gold)", fontSize: 11, padding: "3px 10px" }}>{n.tema}</span>
              {n.leiNome && <span className="badge" style={{ background: "rgba(52,152,219,0.1)", color: "#3498db", fontSize: 11, padding: "3px 10px" }}>{n.leiNome}</span>}
              <span style={{ fontSize: 10, color: "var(--text-mute)", marginLeft: "auto" }}>{n.data}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{filtroTexto.length >= 3 ? highlightText(n.texto, filtroTexto) : n.texto}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
