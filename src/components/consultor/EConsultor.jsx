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
        {subs.map(s => <button key={s.id} className={`stab ${sub === s.id ? "on" : ""}`} onClick={() => setSub(s.id)}>{s.lb}</button>)}
      </div>
      {sub === "anotacoes" && <EConsultorAnotacoes lib={lib} />}
      {sub === "econsulta" && <EConsultorBusca lib={lib} />}
    </div>
  );
}
