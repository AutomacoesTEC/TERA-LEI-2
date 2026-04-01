import { DIV } from '../../constants/patterns';

export default function TabArtigos({ ds }) {
  let art = "";
  const rows = [];
  const tipos = new Set(["ARTIGO", "PARÁGRAFO", "INCISO", "ALÍNEA", "ITEM"]);
  for (const d of ds) {
    if (d.tipo === "ARTIGO") art = d.id;
    if (tipos.has(d.tipo)) rows.push({ art, tipo: d.tipo, id: d.id, rub: d.rub, txt: d.txt, status: d.status || "vigente", alteracao: d.alteracao || "" });
  }

  return (
    <div style={{ maxHeight: "70vh", overflow: "auto" }}>
      <table className="dt">
        <thead><tr><th>Artigo</th><th>Tipo</th><th>Identificador</th><th>Status</th><th>Texto</th><th>Alteração</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ opacity: r.status === "vetado" || r.status === "revogado" ? 0.5 : 1 }}>
              <td style={{ fontWeight: 700, color: "var(--gold)" }}>{r.art}</td>
              <td><span className="badge" style={{ background: "var(--gold-subtle)", color: "var(--gold)" }}>{r.tipo}</span></td>
              <td style={{ fontSize: 12 }}>{r.id}</td>
              <td>{r.status === "vetado" ? <span className="badge badge-revogado">VETADO</span> : r.status === "revogado" ? <span className="badge badge-revogado">REVOGADO</span> : <span className="badge badge-vigente">VIGENTE</span>}</td>
              <td style={{ fontSize: 12, textDecoration: r.status !== "vigente" ? "line-through" : "none" }}>{r.txt}</td>
              <td style={{ fontSize: 11, color: "var(--text-sec)" }}>{r.alteracao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
