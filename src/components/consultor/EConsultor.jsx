import { useState } from 'react';
import EConsultorAnotacoes from './EConsultorAnotacoes';
import EConsultorBusca from './EConsultorBusca';

export default function EConsultor({ lib }) {
  const [sub, setSub] = useState("anotacoes");
  const subs = [{ id: "anotacoes", lb: "Anotacoes" }, { id: "econsulta", lb: "E-Consulta" }];
  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>E-Consultor</h2>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 14 }}>
        {subs.map(s => <a key={s.id} href={`#ec-${s.id}`} className={`stab ${sub === s.id ? "on" : ""}`} onClick={e => { e.preventDefault(); setSub(s.id); window.location.hash = `ec-${s.id}`; }} style={{ textDecoration: "none" }}>{s.lb}</a>)}
      </div>
      {sub === "anotacoes" && <EConsultorAnotacoes lib={lib} />}
      {sub === "econsulta" && <EConsultorBusca lib={lib} />}
    </div>
  );
}
