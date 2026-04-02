import { useState, useEffect, useRef } from 'react';
import { PROXY } from './constants/proxy';
import { AREAS } from './constants/areas';
import { Ic, IC, Sp } from './constants/icons';
import { LS, storageInit, storageLogout, saveUserApiKey, deleteUserApiKey, getUserApiKeyStatus } from './utils/storage';
import { parse } from './utils/parser';
import { pdfToText } from './utils/pdf';
import Logo from './components/ui/Logo';
import ThemeBtn from './components/ui/ThemeBtn';
import LoginScreen from './components/auth/LoginScreen';
import ApiKeyModal from './components/auth/ApiKeyModal';
import Lib from './components/library/Lib';
import Reader from './components/reader/Reader';
import EConsultor from './components/consultor/EConsultor';
import BuscaGeral from './components/busca/BuscaGeral';
import Ref from './components/reforma/Ref';
import Atl from './components/atlas/Atl';

export default function App() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem("t3-theme") || "dark"; } catch { return "dark"; } });
  const [auth, setAuth] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lib, setLib] = useState([]);
  const [sel, setSel] = useState(null);
  const [vw, setVw] = useState("library");
  const [uping, setUp] = useState(false);
  const [area, setArea] = useState("tributario");
  const [study, setStudy] = useState({});
  const [tagsConfig, setTagsConfig] = useState(() => { try { return JSON.parse(localStorage.getItem("t3-tags-config")) || []; } catch { return []; } });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState(null);
  const fRef = useRef(null);

  useEffect(() => { document.body.setAttribute("data-theme", theme); try { localStorage.setItem("t3-theme", theme); } catch {} }, [theme]);

  useEffect(() => {
    const token = sessionStorage.getItem("t3-token");
    if (!token) { setAuthLoading(false); return; }
    fetch(`${PROXY}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(async d => {
        if (d && d.userId) {
          await storageInit(token);
          setLib(LS("t3-lib") || []);
          setStudy(LS("t3-st") || {});
          setAuth({ token, username: d.username, userId: d.userId });
        }
        setAuthLoading(false);
      })
      .catch(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!auth) return;
    getUserApiKeyStatus().then(s => setApiKeyStatus(s));
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    const ids = ["library", "reader", "econsultor", "buscageral", "reforma", "atualizacoes"];
    const hash = window.location.hash.replace("#", "");
    if (hash && ids.includes(hash)) setVw(hash);
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      if (h && ids.includes(h)) setVw(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [auth]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const handleLogin = async (token, username, userId) => {
    await storageInit(token);
    setLib(LS("t3-lib") || []);
    setStudy(LS("t3-st") || {});
    setAuth({ token, username, userId });
  };

  const handleLogout = async () => {
    try { await fetch(`${PROXY}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${auth.token}` } }); } catch {}
    storageLogout();
    setLib([]); setStudy({}); setSel(null); setVw("library");
    setAuth(null);
  };

  if (authLoading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><Sp /><span style={{ marginLeft: 10, color: "var(--text-sec)" }}>Carregando…</span></div>;
  if (!auth) return <LoginScreen onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} />;

  const upF = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    setUp(true);
    try {
      const t = await pdfToText(f);
      const ds = parse(t);
      const l = { id: Date.now() + "", nome: f.name.replace(/\.pdf$/i, ""), data: new Date().toLocaleDateString("pt-BR"), ds, nA: ds.filter(d => d.tipo === "ARTIGO").length, nD: ds.length, area, anexos: [] };
      const nl = [l, ...lib]; setLib(nl); LS("t3-lib", nl); setSel(l); setVw("reader");
    } catch (e) { alert("Erro: " + e.message); }
    setUp(false); if (fRef.current) fRef.current.value = "";
  };

  const del = id => { const nl = lib.filter(l => l.id !== id); setLib(nl); LS("t3-lib", nl); if (sel?.id === id) { setSel(null); setVw("library"); } };

  const addAnexo = async (leiId, file) => {
    try {
      const t = await pdfToText(file);
      let ds = parse(t);
      if (ds.length < 3) { const lines = t.split("\n").map(l => l.trim()).filter(Boolean); ds = lines.map(l => ({ tipo: "TEXTO", id: "", rub: "", txt: l })); }
      const anx = { nome: file.name.replace(/\.pdf$/i, ""), data: new Date().toLocaleDateString("pt-BR"), ds, nD: ds.length };
      const nl = lib.map(l => l.id === leiId ? { ...l, anexos: [...(l.anexos || []), anx] } : l);
      setLib(nl); LS("t3-lib", nl); if (sel?.id === leiId) setSel(nl.find(l => l.id === leiId));
      return true;
    } catch (e) { alert("Erro no anexo: " + e.message); return false; }
  };

  const delAnexo = (leiId, idx) => {
    const nl = lib.map(l => l.id === leiId ? { ...l, anexos: (l.anexos || []).filter((_, i) => i !== idx) } : l);
    setLib(nl); LS("t3-lib", nl); if (sel?.id === leiId) setSel(nl.find(l => l.id === leiId));
  };

  const uSt = (lid, di, f, v) => { const k = `${lid}-${di}`; const n = { ...study, [k]: { ...study[k], [f]: v } }; setStudy(n); LS("t3-st", n); };
  const gSt = (lid, di, f) => study[`${lid}-${di}`]?.[f] || "";

  const exportBackup = () => {
    try {
      const data = { lib, study, area, notas: LS("t3-notas"), temas: LS("t3-temas"), exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = "TERA_backup_" + new Date().toISOString().slice(0, 10) + ".json";
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert("Erro ao exportar: " + e.message); }
  };

  const importBackup = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json";
    inp.onchange = async e => {
      const f = e.target.files?.[0]; if (!f) return;
      try {
        const txt = await f.text(); const data = JSON.parse(txt);
        if (data.lib) { setLib(data.lib); LS("t3-lib", data.lib); }
        if (data.study) { setStudy(data.study); LS("t3-st", data.study); }
        if (data.notas) LS("t3-notas", data.notas);
        if (data.temas) LS("t3-temas", data.temas);
        alert("Backup restaurado com sucesso! " + ((data.lib || []).length) + " leis, " + (Object.keys(data.study || {}).length) + " anotações de estudo e " + ((data.notas || []).length) + " anotações do E-Consultor importadas.");
      } catch (e) { alert("Erro ao importar: " + e.message); }
    };
    inp.click();
  };

  const nav = [
    { id: "library", ic: IC.bk, lb: "Biblioteca" },
    ...(sel ? [{ id: "reader", ic: IC.ls, lb: sel.nome.slice(0, 20) }] : []),
    { id: "econsultor", ic: IC.br, lb: "E-Consultor" },
    { id: "buscageral", ic: IC.sr, lb: "Busca Geral" },
    { id: "reforma", ic: IC.sc, lb: "Reforma" },
    { id: "atualizacoes", ic: IC.bl, lb: "Atualizações" }
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo />
          <div><div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "1px" }}>TERA</div><div style={{ fontSize: 11, color: "var(--text-sec)" }}>CADERNO ELETRÔNICO</div></div>
        </div>
        <nav style={{ display: "flex", gap: 2, overflowX: "auto" }}>
          {nav.map(n => <a key={n.id} href={`#${n.id}`} className={`nb ${vw === n.id ? "on" : ""}`} onClick={e => { e.preventDefault(); setVw(n.id); window.location.hash = n.id; }} style={{ textDecoration: "none" }}><Ic d={n.ic} s={14} c={vw === n.id ? "var(--gold)" : "var(--text-sec)"} />{n.lb}</a>)}
        </nav>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <ThemeBtn theme={theme} toggle={toggleTheme} />
          <button onClick={exportBackup} title="Exportar Backup" style={{ fontSize: 11, color: "var(--text-sec)", padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 5, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}><Ic d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" s={11} c="var(--text-sec)" />Backup</button>
          <button onClick={importBackup} title="Importar Backup" style={{ fontSize: 11, color: "var(--text-sec)", padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 5, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}><Ic d={IC.up} s={11} c="var(--text-sec)" />Restaurar</button>
          <button onClick={() => setShowApiKeyModal(true)} title="Configurar API Key Anthropic" style={{ fontSize: 11, color: apiKeyStatus?.configured ? "var(--ok)" : "var(--err)", padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 5, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}><Ic d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22z" s={11} c={apiKeyStatus?.configured ? "var(--ok)" : "var(--err)"} />API Key</button>
          <button onClick={handleLogout} title="Sair" style={{ fontSize: 11, color: "var(--text-sec)", padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 5, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}><Ic d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" s={11} c="var(--text-sec)" />{auth.username}</button>
          <select value={area} onChange={e => setArea(e.target.value)} style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text)", padding: "5px 8px", fontSize: 11 }}>
            {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
          </select>
        </div>
      </header>
      <main style={{ width: "100%", padding: "20px" }}>
        {vw === "library" && <Lib lib={lib} sel={sel} onSel={l => { setSel(l); setVw("reader"); }} onDel={del} onUp={upF} uping={uping} fRef={fRef} />}
        {vw === "reader" && sel && <Reader lei={sel} area={area} gSt={gSt} uSt={uSt} addAnexo={addAnexo} delAnexo={delAnexo} study={study} />}
        {vw === "econsultor" && <EConsultor lib={lib} />}
        {vw === "buscageral" && <BuscaGeral lib={lib} study={study} tagsConfig={tagsConfig} />}
        {vw === "reforma" && <Ref />}
        {vw === "atualizacoes" && <Atl />}
      </main>
      {showApiKeyModal && <ApiKeyModal
        status={apiKeyStatus}
        onSave={async (k) => {
          const r = await saveUserApiKey(k);
          if (r.ok) { setApiKeyStatus({ configured: true, masked: r.masked }); setShowApiKeyModal(false); }
          else alert(r.error || "Erro ao salvar chave");
        }}
        onDelete={async () => {
          await deleteUserApiKey();
          setApiKeyStatus({ configured: false });
          setShowApiKeyModal(false);
        }}
        onClose={() => setShowApiKeyModal(false)}
      />}
    </div>
  );
}
