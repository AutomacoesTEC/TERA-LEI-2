import { useState } from 'react';
import { PROXY } from '../../constants/proxy';
import Logo from '../ui/Logo';
import ThemeBtn from '../ui/ThemeBtn';
import { Sp } from '../../constants/icons';

export default function LoginScreen({ onLogin, theme, toggleTheme }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!username.trim() || !password.trim()) { setErr("Preencha usuário e senha."); return; }
    if (mode === "register" && !inviteCode.trim()) { setErr("Informe o código de convite."); return; }
    setLoading(true);
    try {
      const body = mode === "login"
        ? { username: username.trim(), password }
        : { username: username.trim(), password, inviteCode: inviteCode.trim() };
      const r = await fetch(`${PROXY}/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Erro desconhecido"); setLoading(false); return; }
      onLogin(d.token, d.username, d.userId);
    } catch (e) { setErr("Erro de conexão: " + e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
      <div style={{ position: "absolute", top: 16, right: 16 }}><ThemeBtn theme={theme} toggle={toggleTheme} /></div>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <Logo />
        <div style={{ marginTop: 12, fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>TERA</div>
        <div style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 4 }}>CADERNO ELETRÔNICO</div>
      </div>
      <div className="cd" style={{ width: "100%", maxWidth: 380, padding: 28 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button onClick={() => { setMode("login"); setErr(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: mode === "login" ? 700 : 400, background: mode === "login" ? "var(--gold-subtle)" : "transparent", color: mode === "login" ? "var(--gold)" : "var(--text-sec)", fontSize: 13, fontFamily: "inherit" }}>Entrar</button>
          <button onClick={() => { setMode("register"); setErr(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: mode === "register" ? 700 : 400, background: mode === "register" ? "var(--gold-subtle)" : "transparent", color: mode === "register" ? "var(--gold)" : "var(--text-sec)", fontSize: 13, fontFamily: "inherit" }}>Criar Conta</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Usuário" style={{ padding: "10px 12px", borderRadius: 7, fontSize: 14, outline: "none" }} />
          <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} type="password" placeholder="Senha" style={{ padding: "10px 12px", borderRadius: 7, fontSize: 14, outline: "none" }} />
          {mode === "register" && <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Código de convite (ex: A3F2B1C4)" style={{ padding: "10px 12px", borderRadius: 7, fontSize: 14, outline: "none", letterSpacing: 2 }} />}
          {err && <div style={{ color: "var(--err)", fontSize: 12, padding: "6px 10px", background: "rgba(231,76,60,.1)", borderRadius: 5 }}>{err}</div>}
          <button onClick={submit} disabled={loading} className="btn-primary" style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading && <Sp />}{mode === "login" ? "Entrar" : "Criar Conta"}
          </button>
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: "var(--text-mute)" }}>Acesso restrito</div>
    </div>
  );
}
