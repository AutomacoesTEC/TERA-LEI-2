import { useState, useRef } from 'react';
import { Ic, IC, Sp } from '../../constants/icons';

export default function TabAnexos({ lei, addAnexo, delAnexo }) {
  const [uping, setUp] = useState(false);
  const [selAnx, setSelAnx] = useState(null);
  const fRef = useRef(null);

  const upAnx = async e => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUp(true);
    for (let i = 0; i < files.length; i++) { await addAnexo(lei.id, files[i]); }
    setUp(false);
    if (fRef.current) fRef.current.value = "";
  };

  const anexos = lei.anexos || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 14, color: "var(--text-sec)" }}>{anexos.length} anexo(s) vinculado(s)</div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 16px", background: "var(--grad)", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          {uping ? <><Sp /> Processando...</> : <><Ic d={IC.up} s={13} c="#fff" /> Adicionar Anexo(s)</>}
          <input ref={fRef} type="file" accept=".pdf" multiple onChange={upAnx} style={{ display: "none" }} />
        </label>
      </div>
      {anexos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Nenhum anexo vinculado</div>
      ) : (
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 4 }}>
            {anexos.map((a, i) => (
              <div key={i} className="cd" style={{ padding: "10px 12px", cursor: "pointer", borderColor: selAnx === i ? "#B8965A" : "#E8DFD0", background: selAnx === i ? "#F5EDDF" : "#fff" }} onClick={() => setSelAnx(i)}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.nome}</div>
                <div style={{ fontSize: 11, color: "var(--text-sec)", marginTop: 2 }}>{a.nD} itens</div>
              </div>
            ))}
          </div>
          {selAnx !== null && anexos[selAnx] && (
            <div style={{ flex: 1, maxHeight: "65vh", overflow: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              <table className="dt">
                <thead><tr><th>#</th><th>Tipo</th><th>Id</th><th>Texto</th></tr></thead>
                <tbody>{anexos[selAnx].ds.map((d, i) => <tr key={i}><td>{i + 1}</td><td>{d.tipo}</td><td>{d.id}</td><td>{d.txt}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
