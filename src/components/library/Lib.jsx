import { Ic, IC, Sp } from '../../constants/icons';
import { AREAS } from '../../constants/areas';

export default function Lib({ lib, sel, onSel, onDel, onUp, uping, fRef }) {
  return (
    <div className="fade">
      <div style={{ border: "2px dashed var(--border)", borderRadius: 14, padding: "40px 28px", textAlign: "center", marginBottom: 24, background: "var(--bg-hover)" }}>
        {uping ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Sp />
            <span style={{ color: "var(--text-sec)", fontSize: 14 }}>Processando PDF e extraindo estrutura...</span>
          </div>
        ) : (
          <>
            <Ic d={IC.up} s={26} c="#B8965A" />
            <div style={{ marginTop: 8, fontSize: 17, fontWeight: 600 }}>Adicionar Lei</div>
            <div style={{ color: "var(--text-sec)", fontSize: 14, marginTop: 3, marginBottom: 12 }}>O parser LC 95/1998 roda local — sem gastar IA</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 24px", background: "var(--grad)", color: "#fff", borderRadius: 7, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              <Ic d={IC.up} s={14} c="#fff" />Selecionar PDF
              <input ref={fRef} type="file" accept=".pdf" onChange={onUp} style={{ display: "none" }} />
            </label>
          </>
        )}
      </div>
      {lib.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>
          {lib.map(l => (
            <div key={l.id} className="cd" style={{ padding: 14, cursor: "pointer", borderColor: sel?.id === l.id ? "#B8965A" : "#E8DFD0" }} onClick={() => onSel(l)}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{l.nome}</div>
                  <span className="tg" style={{ background: "var(--gold-subtle)", color: "var(--gold)" }}>{AREAS[l.area]?.nome || l.area}</span>
                </div>
                <button onClick={e => { e.stopPropagation(); onDel(l.id); }} style={{ background: "none", border: "none", color: "var(--text-sec)", cursor: "pointer" }}>
                  <Ic d={IC.tr} s={13} c="#8A8279" />
                </button>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 11, color: "var(--text-sec)", fontFamily: "'Segoe UI',sans-serif" }}>
                <span>{l.nA} artigos</span>
                <span>{l.nD} dispositivos</span>
                <span>{l.data}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
