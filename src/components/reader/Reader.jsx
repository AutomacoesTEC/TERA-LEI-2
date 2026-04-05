import { useState, useMemo, lazy, Suspense } from 'react';
import { AREAS } from '../../constants/areas';
import { DIV } from '../../constants/patterns';
import { hierarquia, extrairPrazosValores, buildIdx } from '../../utils/search';
import * as XLSX from 'xlsx';
import TabTexto from './TabTexto';
import TabMapa from './TabMapa';
const TabArtigos = lazy(() => import('./TabArtigos'));
const TabEstudo = lazy(() => import('./TabEstudo'));
const TabTeia = lazy(() => import('./TabTeia'));
const TabIndice = lazy(() => import('./TabIndice'));
const TabAnexos = lazy(() => import('./TabAnexos'));

export default function Reader({ lei, area, gSt, uSt, addAnexo, delAnexo, study, tagsConfig = [], setTagsConfig = () => {} }) {
  const [tab, setTab] = useState("mapa");
  const [saved, setSaved] = useState(false);
  const [goSearch, setGoSearch] = useState({ art: "", ts: 0 });
  const tabs = [
    { id: "mapa", lb: "Mapa" }, { id: "teia", lb: "Teia" }, { id: "busca", lb: "Busca" },
    { id: "estudo", lb: "Estudo Guiado" }, { id: "texto", lb: "Texto Integral" },
    { id: "artigos", lb: "Artigos" }, { id: "anexos", lb: `Anexos (${(lei.anexos || []).length})` }
  ];
  const ds = lei.ds;
  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const wrappedUSt = (a, b, c, d) => { uSt(a, b, c, d); showSaved(); };

  const artIndex = useMemo(() => {
    const idx = new Map();
    for (const d of ds) {
      if (d.tipo !== "ARTIGO" && d.tipo !== "PERGUNTA") continue;
      const numId = d.id.replace(/[^0-9]/g, "");
      if (!idx.has(numId)) idx.set(numId, { vigente: null, revogado: null, last: null });
      const entry = idx.get(numId);
      if (d.status === "vigente") entry.vigente = d;
      else if (d.status === "revogado") entry.revogado = d;
      entry.last = d;
    }
    return idx;
  }, [ds]);

  const subDevIndex = useMemo(() => {
    const idx = new Map();
    let currentArt = null;
    for (const d of ds) {
      if (d.tipo === "ARTIGO" || d.tipo === "PERGUNTA") { currentArt = d.id; continue; }
      if (DIV.has(d.tipo)) { currentArt = null; continue; }
      if (currentArt && d.status !== "vetado") {
        if (!idx.has(currentArt)) idx.set(currentArt, []);
        idx.get(currentArt).push(d);
      }
    }
    return idx;
  }, [ds]);

  const extractRefsWithMetadata = (text) => {
    const internal = [];
    const external = [];
    const reArt = /arts?\.\s*(\d+[ºo°]?(?:\s*(?:,|e|a)\s*\d+[ºo°]?)*)/gi;
    const reLeiNome = /(?:Lei(?:\s+Complementar)?|Decreto(?:-Lei)?|Medida\s+Provis[óo]ria|Instru[çc][ãa]o\s+Normativa(?:\s+(?:RFB|SRF|[A-Z]{2,}))?|C[óo]digo\s+\w+)\s+n[ºo°]/i;
    const externalRanges = [];
    const reParen = /\([^)]+\)/g;
    let pm;
    while ((pm = reParen.exec(text)) !== null) {
      if (reLeiNome.test(pm[0])) externalRanges.push([pm.index, pm.index + pm[0].length]);
    }
    const reLeiInline = /(?:Lei(?:\s+Complementar)?\s+n[ºo°]?\s*[\d.]+|Decreto(?:-Lei)?\s+n[ºo°]?\s*[\d.]+|Medida\s+Provis[óo]ria\s+n[ºo°]?\s*[\d.]+|Instru[çc][ãa]o\s+Normativa\s+(?:RFB\s+|SRF\s+|[A-Z]{2,}\s+)?n[ºo°]?\s*[\d.]+)/gi;
    const reLeiDirectlyAfter = /^\s*(?:[,;]\s*)?(?:d[aoe]s?\s+)?(?:Lei(?:\s+Complementar)?|Decreto(?:-Lei)?|Medida\s+Provis[óo]ria|Instru[çc][ãa]o\s+Normativa(?:\s+(?:RFB|SRF|[A-Z]{2,}))?|C[óo]digo\s+\w+|Constitui[çc][ãa]o)\s+[Nn][ºo°]?\s*[\d.]/i;
    const reLeiCapture = /(?:Lei(?:\s+Complementar)?\s+n[ºo°]?\s*[\d.\/]+|Decreto(?:-Lei)?\s+n[ºo°]?\s*[\d.\/]+|Medida\s+Provis[óo]ria\s+n[ºo°]?\s*[\d.\/\-]+|Instru[çc][ãa]o\s+Normativa\s+(?:RFB\s+|SRF\s+|[A-Z]{2,}\s+)?n[ºo°]?\s*[\d.\/]+|C[óo]digo\s+(?:Tribut[áa]rio|Civil|Penal|de\s+Processo)\s+Nacional|Constitui[çc][ãa]o\s+Federal)/gi;
    let lm2;
    while ((lm2 = reLeiCapture.exec(text)) !== null) {
      const name = lm2[0].trim();
      if (!external.includes(name)) external.push(name);
    }
    const isCitationSyntaxOnly = (between) => {
      let c = between;
      c = c.replace(/,?\s*de\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/g, "");
      c = c.replace(/,?\s*de\s+\d{4}/g, "");
      c = c.replace(/\s*arts?\.\s*\d+[ºo°]?/g, "");
      c = c.replace(/\s*§+\s*\d*[ºo°]?\.?/g, "");
      c = c.replace(/\s*incisos?\s+[IVXLCDM]+/gi, "");
      c = c.replace(/\s*al[íi]neas?\s+[a-z]\)?/gi, "");
      c = c.replace(/\s*itens?\s+\d+/gi, "");
      c = c.replace(/(?:Lei(?:\s+Complementar)?\s+n[ºo°]?\s*[\d.]+|Decreto(?:-Lei)?\s+n[ºo°]?\s*[\d.]+)/gi, "");
      c = c.replace(/[,;.\s\-–—ºo°:()]+/g, " ");
      c = c.replace(/\b(?:e|a|de|do|da|dos|das|no|na|nos|nas|ao|caput)\b/gi, "");
      return c.trim().length === 0;
    };
    let m;
    while ((m = reArt.exec(text)) !== null) {
      const pos = m.index;
      if (externalRanges.some(([s, e]) => pos >= s && pos <= e)) continue;
      const textAfterMatch = text.slice(m.index + m[0].length, m.index + m[0].length + 130);
      if (reLeiDirectlyAfter.test(textAfterMatch)) continue;
      const before = text.slice(Math.max(0, pos - 250), pos);
      reLeiInline.lastIndex = 0;
      let lastLaw = null, lm;
      while ((lm = reLeiInline.exec(before)) !== null) lastLaw = { end: lm.index + lm[0].length };
      if (lastLaw && isCitationSyntaxOnly(before.slice(lastLaw.end))) continue;
      const nums = m[1].match(/\d+[ºo°]?/g) || [];
      for (const n of nums) {
        const artId = "Art. " + n;
        if (!internal.includes(artId)) internal.push(artId);
      }
    }
    return { internal, external };
  };

  const extractInternalRefs = (text) => extractRefsWithMetadata(text).internal;

  const findDevice = (artId) => {
    const cleanId = artId.replace(/^Art\.\s*/i, "").replace(/[^0-9]/g, "").trim();
    const entry = artIndex.get(cleanId);
    if (!entry) return null;
    return entry.vigente || entry.revogado || entry.last;
  };

  const getSubDevices = (artId) => subDevIndex.get(artId) || [];

  const _BRT_MAX_DEPTH = 8;
  const buildRecursiveTree = (startId, visited = new Set(), depth = 0) => {
    if (depth > _BRT_MAX_DEPTH) return null;
    if (visited.has(startId)) return null;
    visited.add(startId);
    const device = findDevice(startId);
    if (!device) return null;
    const isRevogado = device.status === "revogado";
    const subs = getSubDevices(device.id);
    const fullText = [device.txt || "", ...subs.map(s => (s.id || "") + " " + (s.txt || ""))].join(" ");
    const allRefs = isRevogado ? { internal: [], external: [] } : extractRefsWithMetadata(fullText);
    const selfNum = device.id.replace(/[^0-9]/g, "");
    const filteredRefs = allRefs.internal.filter(r => r.replace(/[^0-9]/g, "") !== selfNum);
    const children = [];
    for (const ref of filteredRefs) {
      const child = buildRecursiveTree(ref, visited, depth + 1);
      if (child) children.push(child);
    }
    return {
      id: device.id, text: (device.txt || "").trim(), status: device.status || "vigente",
      alteracao: device.alteracao || "",
      subs: subs.map(s => { try { const sr = extractRefsWithMetadata((s.id || "") + " " + (s.txt || "")); return { ...s, externalRefs: sr.external }; } catch (_) { return { ...s, externalRefs: [] }; } }),
      refs: filteredRefs, externalRefs: allRefs.external, children
    };
  };

  const buildRecursiveChain = (startId) => {
    const chain = []; const visited = new Set(); let currentId = startId;
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const device = findDevice(currentId);
      if (!device) break;
      const fullText = (device.rub || "") + " " + (device.txt || "");
      const refs = extractInternalRefs(fullText);
      const selfNum = device.id.replace(/[^0-9]/g, "");
      const filteredRefs = refs.filter(r => r.replace(/[^0-9]/g, "") !== selfNum);
      chain.push({ id: device.id, text: fullText.trim(), refs: filteredRefs });
      currentId = filteredRefs.length > 0 ? filteredRefs[0] : null;
    }
    return chain;
  };

  const exportXlsx = () => {
    try {
      const wb = XLSX.utils.book_new();
      const txData = [["#", "Tipo", "Identificador", "Rubrica", "Texto", "Status Legal", "Alteração"], ...ds.map((d, i) => [i + 1, d.tipo, d.id, d.rub, d.txt, d.status || "vigente", d.alteracao || ""])];
      const wsTx = XLSX.utils.aoa_to_sheet(txData);
      wsTx["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 40 }, { wch: 80 }, { wch: 12 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsTx, "Texto Integral");
      const ctx = hierarquia(ds); let art = "";
      const estData = [["Localização", "Artigo", "Dispositivo", "Texto", "Status Estudo", "Dificuldade", "Anotação", "Status Legal"]];
      for (let i = 0; i < ds.length; i++) { const d = ds[i]; if (d.tipo === "ARTIGO" || d.tipo === "PERGUNTA") art = d.id; if (!DIV.has(d.tipo)) estData.push([ctx[art] || "", art, d.id, d.txt, gSt(lei.id, i, "status"), gSt(lei.id, i, "dif"), gSt(lei.id, i, "note"), d.status || "vigente"]); }
      const wsEst = XLSX.utils.aoa_to_sheet(estData);
      wsEst["!cols"] = [{ wch: 40 }, { wch: 12 }, { wch: 18 }, { wch: 70 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsEst, "Estudo Guiado");
      const teiaData = [["Artigo Origem", "Caminho da Teia (Texto Integral)"]];
      const artigos = ds.filter(d => d.tipo === "ARTIGO" || d.tipo === "PERGUNTA");
      artigos.forEach(a => {
        const chain = buildRecursiveChain(a.id);
        if (chain.length > 1) {
          const pathText = chain.map(c => `[${c.id}]\n${c.text}`).join("\n\n↓\n\n");
          teiaData.push([a.id, pathText]);
        }
      });
      const wsTeia = XLSX.utils.aoa_to_sheet(teiaData);
      wsTeia["!cols"] = [{ wch: 16 }, { wch: 100 }];
      XLSX.utils.book_append_sheet(wb, wsTeia, "Teia de Remissões");
      const pv = extrairPrazosValores(ds);
      const pvData = [["#", "Tipo", "Conteúdo", "Artigo", "Capítulo", "Contexto"], ...pv.map((r, i) => [i + 1, r.tipo, r.val, r.art, r.cap, r.ctx])];
      const wsPv = XLSX.utils.aoa_to_sheet(pvData);
      wsPv["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 35 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsPv, "Prazos e Valores");
      const idx = buildIdx(ds, area);
      const idxData = [["Palavra-chave", "Artigos", "Qtd"], ...Object.entries(idx).map(([p, a]) => [p, a.join(", "), a.length])];
      const wsIdx = XLSX.utils.aoa_to_sheet(idxData);
      wsIdx["!cols"] = [{ wch: 25 }, { wch: 80 }, { wch: 8 }];
      XLSX.utils.book_append_sheet(wb, wsIdx, "Índice Remissivo");
      XLSX.writeFile(wb, lei.nome + "_TERA.xlsx");
    } catch (e) { alert("Erro ao exportar: " + e.message); }
  };

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>{lei.nome}</h2>
          <div style={{ fontSize: 12, color: "var(--text-sec)", fontFamily: "'Segoe UI',sans-serif" }}>{lei.nD} dispositivos · {lei.nA} {lei.docTipo === "PER" ? "perguntas" : "artigos"} · {(lei.anexos || []).length} anexos · {AREAS[area]?.nome}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {saved && <span style={{ fontSize: 12, color: "var(--ok)", fontWeight: 600, animation: "fadeIn .2s" }}>Salvo!</span>}
          <button onClick={exportXlsx} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", background: "var(--grad)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Exportar Excel</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 14, overflowX: "auto" }}>
        {tabs.map(t => <a key={t.id} href={`#tab-${t.id}`} className={`stab ${tab === t.id ? "on" : ""}`} onClick={e => { e.preventDefault(); setTab(t.id); window.location.hash = `tab-${t.id}`; }} style={{ textDecoration: "none" }}>{t.lb}</a>)}
      </div>
      {tab === "texto" && <TabTexto ds={ds} lei={lei} gSt={gSt} uSt={wrappedUSt} goSearch={goSearch} />}
      {tab === "mapa" && <TabMapa ds={ds} />}
      <Suspense fallback={<div style={{ padding: 32, textAlign: "center", color: "var(--text-sec)", fontSize: 13 }}>Carregando…</div>}>
        {tab === "artigos" && <TabArtigos ds={ds} />}
        {tab === "estudo" && <TabEstudo ds={ds} lei={lei} gSt={gSt} uSt={wrappedUSt} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} />}
        {tab === "busca" && <TabIndice ds={ds} area={area} onGoToArt={a => { setGoSearch({ art: a, ts: Date.now() }); setTab("texto"); }} />}
        {tab === "anexos" && <TabAnexos lei={lei} addAnexo={addAnexo} delAnexo={delAnexo} />}
        {tab === "teia" && <TabTeia ds={ds} buildRecursiveTree={buildRecursiveTree} buildRecursiveChain={buildRecursiveChain} />}
      </Suspense>
    </div>
  );
}
