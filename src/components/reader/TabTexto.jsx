import { useEffect, useRef } from 'react';
import { DIV, CT } from '../../constants/patterns';

export default function TabTexto({ ds, lei, gSt, uSt, goSearch }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const artId = goSearch?.art || goSearch;
    if (!artId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-art-id="${artId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = "2px solid var(--gold)";
      el.style.outlineOffset = "-2px";
      setTimeout(() => { el.style.outline = ""; el.style.outlineOffset = ""; }, 3000);
    }
  }, [goSearch]);
  const ind = { PARTE: 0, LIVRO: 0, "TÍTULO": 0, "CAPÍTULO": 12, "SEÇÃO": 24, "SUBSEÇÃO": 36, ARTIGO: 0, "PARÁGRAFO": 20, INCISO: 36, "ALÍNEA": 52, ITEM: 68, "SECAO_PR": 0, PERGUNTA: 12, ASSUNTO: 0, "EMENTA_DOC": 12, "DISPOSITIVOS_LEGAIS": 12, "CONCLUSAO": 12 };
  const sts = ["", "Não lido", "Lido", "Revisando", "Dominado", "Dúvida"];
  const sC = { Dominado: "#27AE60", "Dúvida": "#C0392B", Revisando: "#D4A017", Lido: "#2E86AB" };

  return (
    <div>
      <div ref={containerRef} style={{ maxHeight: "68vh", overflow: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
        {ds.map((d, i) => {
          const ri = i;
          const isD = DIV.has(d.tipo);
          const st = gSt(lei.id, ri, "status");
          const nt = gSt(lei.id, ri, "note");
          const isVetado = d.status === "vetado";
          const isRevogado = d.status === "revogado";

          return (
            <div key={ri} data-art-id={d.tipo === "ARTIGO" || d.tipo === "PERGUNTA" ? d.id : undefined} style={{ display: "flex", borderBottom: "1px solid var(--border)", background: isVetado ? "rgba(231,76,60,0.06)" : isRevogado ? "rgba(231,76,60,0.04)" : isD ? CT[d.tipo] || "var(--bg-hover)" : ri % 2 === 0 ? "var(--bg-card)" : "var(--bg-hover)", paddingLeft: ind[d.tipo] || 0 }}>
              <div style={{ minWidth: 70, padding: "6px 4px", textAlign: "center" }}>
                <span className="badge" style={{ background: isD ? "rgba(0,0,0,.1)" : "var(--bg-hover)", color: isD ? (d.tipo === "PARTE" || d.tipo === "LIVRO" || d.tipo === "TÍTULO" || d.tipo === "CAPÍTULO" ? "#fff" : d.tipo === "SECAO_PR" ? "#3498db" : d.tipo === "ASSUNTO" ? "#805ad5" : "var(--text-sec)") : "var(--text-mute)" }}>{d.tipo === "SECAO_PR" ? "SEÇÃO" : d.tipo === "EMENTA_DOC" ? "EMENTA" : d.tipo === "DISPOSITIVOS_LEGAIS" ? "DISP.LEGAIS" : d.tipo === "CONCLUSAO" ? "CONCLUSÃO" : d.tipo}</span>
                {isVetado && <div><span className="badge badge-revogado" style={{ marginTop: 3, display: "inline-block" }}>VETADO</span></div>}
                {isRevogado && <div><span className="badge badge-revogado" style={{ marginTop: 3, display: "inline-block" }}>REVOGADO</span></div>}
              </div>
              <div style={{ flex: 1, padding: "6px 8px", fontSize: 12.5, lineHeight: 1.6, color: isD ? (d.tipo === "PARTE" || d.tipo === "LIVRO" || d.tipo === "TÍTULO" ? "#fff" : "var(--text)") : "var(--text)", fontWeight: isD || d.tipo === "ARTIGO" ? 600 : 400, textDecoration: (isVetado || isRevogado) ? "line-through" : "none", opacity: (isVetado || isRevogado) ? 0.6 : 1 }}>
                <span style={{ color: isD ? "inherit" : "var(--gold)", fontFamily: "'Segoe UI',sans-serif", fontSize: 12, marginRight: 4, textDecoration: "none" }}>{d.id}</span>
                {d.rub && <i style={{ opacity: .7 }}>{d.rub} </i>}{d.txt}
                {d.alteracao && <div style={{ marginTop: 3, padding: "2px 8px", background: "rgba(52,152,219,0.08)", borderLeft: "2px solid #3498db", borderRadius: 3, fontSize: 11, color: "#3498db", textDecoration: "none", fontWeight: 400, opacity: 1 }}>↳ {d.alteracao}</div>}
                {nt && <div style={{ marginTop: 3, padding: "2px 6px", background: "var(--gold-subtle)", borderLeft: "2px solid #B8965A", borderRadius: 3, fontSize: 11, color: "var(--gold)", textDecoration: "none", fontWeight: 400, opacity: 1 }} dangerouslySetInnerHTML={{ __html: nt }} />}
              </div>
              {!isD && (
                <div style={{ minWidth: 100, padding: "5px 4px", display: "flex", flexDirection: "column", gap: 3 }}>
                  <select value={st} onChange={e => uSt(lei.id, ri, "status", e.target.value)} style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 3, color: sC[st] || "#8A8279", padding: "2px", fontSize: 11, cursor: "pointer" }}>
                    {sts.map(s => <option key={s} value={s}>{s || "Status"}</option>)}
                  </select>
                  <textarea placeholder="Anotação..." defaultValue={nt} onBlur={e => uSt(lei.id, ri, "note", e.target.value)} style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 6px", fontSize: 12, width: "100%", minHeight: 50, maxHeight: 150, resize: "vertical", fontFamily: "inherit" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
