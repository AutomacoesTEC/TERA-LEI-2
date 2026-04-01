import { useState, useMemo } from 'react';
import { Ic, IC, Sp } from '../../constants/icons';
import { LS } from '../../utils/storage';

const PORTAIS = [
  { id: "agencia_rf", nome: "AgênciaGov — Receita Federal", cor: "#2e86ab" },
  { id: "agencia_pl", nome: "AgênciaGov — Planalto", cor: "#8e44ad" },
  { id: "agencia_ju", nome: "AgênciaGov — Justiça", cor: "#c0392b" },
  { id: "agencia_ec", nome: "AgênciaGov — Economia", cor: "#27ae60" },
  { id: "agencia_co", nome: "AgênciaGov — Comunicações", cor: "#e67e22" },
  { id: "cfc", nome: "CFC", cor: "#2980b9" },
  { id: "jota", nome: "Jota Info", cor: "#1a1a2e" },
  { id: "fazenda", nome: "Min. Fazenda", cor: "#16a085" },
  { id: "rfb", nome: "RFB Reforma", cor: "#d4a017" },
  { id: "rfb_not", nome: "RFB Notícias", cor: "#e67e22" },
  { id: "nfe", nome: "NFe/NFCe", cor: "#7f8c8d" },
];

const DATA_URL = "data/atualizacoes.json";

export default function Atl() {
  const [itens, setItens] = useState(() => LS("t3-upd-v2") || []);
  const [ultimaAtt, setUltimaAtt] = useState(() => LS("t3-upd-dt") || "");
  const [ld, setLd] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [filtroPortal, setFiltroPortal] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const buscar = async () => {
    setLd(true); setErro(""); setSucesso("");
    try {
      const r = await fetch(DATA_URL + "?t=" + Date.now());
      if (!r.ok) throw new Error("Arquivo de atualizações não encontrado (" + r.status + "). Verifique se o workflow do GitHub Actions foi executado e se o arquivo data/atualizacoes.json existe no repositório.");
      const data = await r.json();
      if (data.itens && Array.isArray(data.itens)) {
        if (data.itens.length === 0 && itens.length === 0) {
          setSucesso("Busca concluída — o servidor retornou 0 itens.");
          setUltimaAtt(data.ultima_atualizacao || new Date().toISOString());
          LS("t3-upd-dt", data.ultima_atualizacao || new Date().toISOString());
        } else {
          const linksExist = new Set(itens.map(i => i.link));
          const novos = data.itens.filter(i => !linksExist.has(i.link));
          const merged = [...novos, ...itens].sort((a, b) => b.data.localeCompare(a.data));
          setItens(merged); LS("t3-upd-v2", merged);
          setUltimaAtt(data.ultima_atualizacao || new Date().toISOString());
          LS("t3-upd-dt", data.ultima_atualizacao || new Date().toISOString());
          setSucesso("Busca concluída — " + novos.length + " novo(s) item(ns). Total: " + merged.length + " itens.");
        }
      } else { setErro("Formato de dados inesperado no arquivo JSON."); }
    } catch (e) { setErro(e.message); }
    setLd(false);
  };

  const exportar = () => {
    try {
      const data = { ultima_atualizacao: ultimaAtt, itens: itensFiltrados, exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "TERA_atualizacoes_" + new Date().toISOString().slice(0, 10) + ".json";
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert("Erro ao exportar: " + e.message); }
  };

  const limpar = () => {
    if (confirm("Tem certeza que deseja limpar todo o histórico de atualizações?")) {
      setItens([]); setUltimaAtt(""); setSucesso(""); setErro("");
      LS("t3-upd-v2", null); LS("t3-upd-dt", null);
    }
  };

  const itensFiltrados = useMemo(() => {
    let f = itens;
    if (filtroPortal) f = f.filter(i => i.portal === filtroPortal);
    if (filtroData) f = f.filter(i => i.data === filtroData);
    if (filtro.trim()) { const term = filtro.toLowerCase(); f = f.filter(i => (i.titulo || "").toLowerCase().includes(term) || (i.resumo || "").toLowerCase().includes(term) || (i.portal || "").toLowerCase().includes(term)); }
    return f;
  }, [itens, filtroPortal, filtroData, filtro]);

  const datasUnicas = useMemo(() => [...new Set(itens.map(i => i.data))].sort().reverse(), [itens]);
  const portalCor = (portal) => PORTAIS.find(p => p.nome === portal || p.id === portal)?.cor || "var(--text-sec)";

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>Atualizações</h2>
          {ultimaAtt && <div style={{ fontSize: 11, color: "var(--text-sec)", marginTop: 2 }}>Última atualização do servidor: {new Date(ultimaAtt).toLocaleString("pt-BR")}</div>}
          <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 1 }}>Atualização automática: diariamente às 09:00 (GitHub Actions)</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={buscar} className="btn-primary" disabled={ld}>{ld ? <><Sp /> Buscando...</> : "Buscar Agora"}</button>
          {itens.length > 0 && <>
            <button onClick={exportar} className="btn-secondary" style={{ fontSize: 12, padding: "8px 12px" }}>Exportar</button>
            <button onClick={limpar} className="btn-secondary" style={{ fontSize: 12, padding: "8px 12px", color: "var(--err)" }}>Limpar Histórico</button>
          </>}
        </div>
      </div>
      {erro && <div style={{ background: "rgba(231,76,60,0.1)", border: "1px solid #e74c3c", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 13, color: "#e74c3c" }}>{erro}</div>}
      {sucesso && <div style={{ background: "rgba(46,204,113,0.1)", border: "1px solid #2ecc71", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 13, color: "#2ecc71" }}>{sucesso}</div>}
      {itens.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Filtrar por nome ou texto..." style={{ flex: "1 1 200px", padding: "8px 12px", borderRadius: 6, fontSize: 13, background: "var(--bg-hover)", border: "1px solid var(--border)" }} />
          <select value={filtroPortal} onChange={e => setFiltroPortal(e.target.value)} style={{ padding: "8px", borderRadius: 6, fontSize: 12 }}>
            <option value="">Todos os portais</option>
            {PORTAIS.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
          </select>
          <select value={filtroData} onChange={e => setFiltroData(e.target.value)} style={{ padding: "8px", borderRadius: 6, fontSize: 12 }}>
            <option value="">Todas as datas</option>
            {datasUnicas.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--text-sec)" }}>{itensFiltrados.length} de {itens.length}</span>
        </div>
      )}
      {itens.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>Nenhuma atualização carregada</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>Clique em "Buscar Agora" para carregar as atualizações do servidor.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "65vh", overflow: "auto" }}>
          {itensFiltrados.map((item, i) => (
            <div key={i} className="cd" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <span className="badge" style={{ background: portalCor(item.portal) + "22", color: portalCor(item.portal), marginRight: 8 }}>{item.portal}</span>
                  {item.premium && <span className="badge" style={{ background: "rgba(230,126,34,0.15)", color: "#e67e22", marginRight: 8 }}>PREMIUM</span>}
                  <span style={{ fontSize: 11, color: "var(--text-sec)" }}>{item.data}</span>
                </div>
                {item.link && <a href={item.link} target="_blank" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "var(--gold)", display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}><Ic d={IC.lk} s={10} c="var(--gold)" />Abrir</a>}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.titulo}</div>
              {item.resumo && <div style={{ fontSize: 12, color: "var(--text-sec)", lineHeight: 1.5 }}>{item.resumo}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
