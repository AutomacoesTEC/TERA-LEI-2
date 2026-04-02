import { useState, useEffect, useRef } from 'react';
import { Ic, IC, Sp } from '../../constants/icons';
import { callAI } from '../../utils/storage';

const REFORMA = [
  { n: "EC 132/2023", d: "Emenda Constitucional da Reforma Tributária. Institui IBS, CBS e Imposto Seletivo em substituição a PIS, COFINS, IPI, ICMS e ISS. Período de transição: 2026-2033.", url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm" },
  { n: "LC 214/2025", d: "Lei Complementar que regulamenta o IBS, a CBS e o Imposto Seletivo. Detalha regras de incidência, base de cálculo, alíquotas, créditos, regimes específicos e o split payment.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp214.htm" },
  { n: "LC 227/2026 (prevista)", d: "Complementação normativa da Reforma. Regulamentação adicional do Comitê Gestor do IBS e procedimentos de transição.", url: "" },
  { n: "IN RFB nº 2.121/2022", d: "Instrução Normativa que consolida a legislação de PIS/COFINS. Vigente durante o período de transição até a plena implementação da CBS.", url: "https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/127905" },
  { n: "Lei nº 10.637/2002", d: "PIS não cumulativo. Regime vigente durante a transição, com redução gradual de alíquotas a partir de 2027.", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10637.htm" },
  { n: "Lei nº 10.833/2003", d: "COFINS não cumulativa. Regime vigente durante a transição, com redução gradual de alíquotas a partir de 2027.", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm" },
  { n: "Lei nº 9.718/1998", d: "PIS/COFINS cumulativo. Regime vigente durante a transição para os contribuintes não sujeitos à não cumulatividade.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9718.htm" },
];

const TIMELINE = [
  { ano: "2023", ev: "EC 132/2023 promulgada", det: "Aprovação da Emenda Constitucional da Reforma Tributária.", fonte: "Planalto", url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm" },
  { ano: "2025", ev: "LC 214/2025 publicada", det: "Regulamentação do IBS, CBS e Imposto Seletivo.", fonte: "Planalto", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp214.htm" },
  { ano: "2026", ev: "Início do período de teste", det: "CBS a 0,9% e IBS a 0,1% (alíquota-teste). PIS/COFINS mantidos integralmente.", fonte: "EC 132/2023, art. 125" },
  { ano: "2027", ev: "CBS substituindo PIS/COFINS", det: "CBS em vigor com alíquota de referência. PIS e COFINS extintos.", fonte: "EC 132/2023, art. 125, §1º" },
  { ano: "2029-2032", ev: "Transição gradual ICMS/ISS → IBS", det: "Redução progressiva de ICMS e ISS: 90% em 2029, 80% em 2030, 70% em 2031, 60% em 2032.", fonte: "EC 132/2023, art. 125, §§3º-5º" },
  { ano: "2033", ev: "Plena vigência", det: "IBS em alíquota plena. ICMS e ISS extintos. Sistema dual CBS+IBS consolidado.", fonte: "EC 132/2023, art. 125, §6º" }
];

export default function Ref() {
  const [sub, setSub] = useState("leg");
  const [tMsgs, setTMsgs] = useState([]);
  const [tInp, setTInp] = useState("");
  const [tLd, setTLd] = useState(false);
  const cr = useRef(null);
  const subs = [{ id: "leg", lb: "Legislação" }, { id: "timeline", lb: "Timeline Transição" }, { id: "tutor", lb: "Tutor Reforma" }];

  const sendT = async () => {
    if (!tInp.trim() || tLd) return;
    const m = tInp.trim(); setTInp(""); setTMsgs(p => [...p, { role: "user", text: m }]); setTLd(true);
    try {
      const r = await callAI({ model: "claude-sonnet-4-20250514", max_tokens: 1024, system: "Você é o TERA Tutor especialista em Reforma Tributária brasileira (EC 132/2023, LC 214/2025). Responda sobre IBS, CBS, Imposto Seletivo, split payment, não cumulatividade, transição, cashback.", messages: [{ role: "user", content: m }] });
      const d = await r.json();
      if (d.error) setTMsgs(p => [...p, { role: "assistant", text: "⚠ " + d.error }]);
      else setTMsgs(p => [...p, { role: "assistant", text: d.content?.[0]?.text || "Erro." }]);
    } catch (e) { setTMsgs(p => [...p, { role: "assistant", text: "Erro: " + e.message }]); }
    setTLd(false);
  };
  useEffect(() => { cr.current && (cr.current.scrollTop = cr.current.scrollHeight); }, [tMsgs]);

  return (
    <div className="fade">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Reforma Tributária</h2>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 14 }}>
        {subs.map(s => <a key={s.id} href={`#ref-${s.id}`} className={`stab ${sub === s.id ? "on" : ""}`} onClick={e => { e.preventDefault(); setSub(s.id); window.location.hash = `ref-${s.id}`; }} style={{ textDecoration: "none" }}>{s.lb}</a>)}
      </div>
      {sub === "leg" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {REFORMA.map((r, i) => (
            <div key={i} className="cd" style={{ padding: 14, cursor: r.url ? "pointer" : "default" }} onClick={() => { if (r.url) window.open(r.url, "_blank"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>{r.n}</b>{r.url && <span style={{ fontSize: 11, color: "var(--gold)", display: "flex", alignItems: "center", gap: 3 }}><Ic d={IC.lk} s={11} c="var(--gold)" />Abrir</span>}
              </div>
              <p style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 4 }}>{r.d}</p>
            </div>
          ))}
        </div>
      )}
      {sub === "timeline" && (
        <div>
          <div style={{ background: "var(--gold-subtle)", border: "1px solid var(--gold)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Fontes: EC 132/2023, LC 214/2025 — Dados extraídos da legislação vigente publicada no Planalto.</span>
            <a href="https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm" target="_blank" style={{ fontSize: 11, color: "var(--gold)", whiteSpace: "nowrap", marginLeft: 8 }}>Verificar fonte</a>
          </div>
          <div style={{ position: "relative", paddingLeft: 30 }}>
            {TIMELINE.map((t, i) => (
              <div key={i} style={{ position: "relative", marginBottom: 20, paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: -30, top: 0, width: 20, height: 20, borderRadius: "50%", background: "var(--grad)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} /></div>
                {i < TIMELINE.length - 1 && <div style={{ position: "absolute", left: -21, top: 20, width: 2, height: "calc(100% + 4px)", background: "var(--border)" }} />}
                <div className="cd" style={{ padding: 14, cursor: t.url ? "pointer" : "default" }} onClick={() => { if (t.url) window.open(t.url, "_blank"); }}>
                  <div style={{ fontWeight: 700, color: "var(--gold)", fontSize: 15 }}>{t.ano}</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{t.ev}</div>
                  <div style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 4 }}>{t.det}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 6, fontStyle: "italic" }}>Fonte: {t.fonte}{t.url && <> · <a href={t.url} target="_blank" onClick={e => e.stopPropagation()} style={{ color: "var(--gold)" }}>ver legislação</a></>}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {sub === "tutor" && (
        <div style={{ display: "flex", flexDirection: "column", height: "60vh" }}>
          <div ref={cr} style={{ flex: 1, overflowY: "auto", padding: 10 }}>
            {tMsgs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text-sec)" }}>Pergunte sobre a Reforma Tributária, IBS, CBS, Imposto Seletivo...</div>}
            {tMsgs.map((m, i) => <div key={i} style={{ marginBottom: 10, textAlign: m.role === "user" ? "right" : "left" }}><div style={{ display: "inline-block", padding: 10, borderRadius: 10, maxWidth: "80%", background: m.role === "user" ? "var(--grad)" : "var(--bg-hover)", color: m.role === "user" ? "#fff" : "var(--text)", whiteSpace: "pre-wrap" }}>{m.text}</div></div>)}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={tInp} onChange={e => setTInp(e.target.value)} onKeyDown={e => e.key === "Enter" && sendT()} placeholder="Pergunte sobre a Reforma..." style={{ flex: 1, padding: 10, borderRadius: 6 }} />
            <button onClick={sendT} className="btn-primary" disabled={tLd}>{tLd ? <Sp /> : "Enviar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
