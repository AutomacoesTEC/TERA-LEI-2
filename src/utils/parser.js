import { PATS, DIV } from '../constants/patterns';

export function detectDocType(txt) {
  const cabecalho = txt.split("\n").slice(0, 60).join("\n").toUpperCase();
  if (/ATO\s+DECLARATÓRIO\s+INTERPRETATIVO|ADI\s+(?:RFB|SRF)\s+N[ºO°]/i.test(cabecalho)) return "ADI";
  if (/SOLU[ÇC][ÃA]O\s+DE\s+CONSULTA|SC\s+COSIT|SC\s+DISIT/i.test(cabecalho)) return "SC";
  if (/PERGUNTAS\s+E\s+RESPOSTAS/i.test(cabecalho)) return "PER";
  const matches = txt.match(/^\s*\d+\.\d+\./mg);
  if (matches && matches.length >= 5) return "PER";
  return "LEI";
}

function parsePER(txt) {
  const ds = [];
  const lines = txt.split("\n");
  let current = null;
  const reSecao = /^\s*(\d+)\.\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÜÇÑ][^0-9]{2,})\s*$/;
  const rePergunta = /^\s*(\d+\.\d+(?:\.\d+)*)\s+(.*)/;
  for (const l of lines) {
    const s = l.trim();
    if (!s) continue;
    const mSec = reSecao.exec(s);
    if (mSec) {
      current = { tipo: "SECAO_PR", id: mSec[1] + ".", rub: mSec[2].trim(), txt: "", status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }
    const mPerg = rePergunta.exec(s);
    if (mPerg && /^\d+\.\d+/.test(mPerg[1])) {
      current = { tipo: "PERGUNTA", id: mPerg[1] + (mPerg[1].endsWith(".") ? "" : "."), rub: mPerg[2].trim(), txt: "", status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }
    if (current && current.tipo === "PERGUNTA") current.txt = current.txt ? current.txt + " " + s : s;
  }
  return ds.filter(d => d.tipo !== "SECAO_PR" || d.id);
}

function parseSC(txt) {
  const ds = [];
  const lines = txt.split("\n");
  let current = null;
  const reAltera = /\[?\s*(Reda[çc][ãa]o dada pel[oa]\(a\)[^\]]*|Inclu[ií]d[oa]\(a\) pel[oa]\(a\)[^\]]*|Revogad[oa]\(a\) pel[oa]\(a\)[^\]]*)\]?/gi;
  const reVetado = /\(\s*(?:VETADO|vetado)\s*\)/;
  const reRevogado = /\(\s*(?:REVOGADO|revogado)\s*\)/;
  for (const l of lines) {
    const s = l.trim();
    if (!s) continue;
    if (/^ASSUNTO\s*:/i.test(s)) {
      current = { tipo: "ASSUNTO", id: "ASSUNTO " + (ds.filter(d => d.tipo === "ASSUNTO").length + 1), rub: s.replace(/^ASSUNTO\s*:\s*/i, "").trim(), txt: "", status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }
    if (/^EMENTA\s*:/i.test(s)) {
      current = { tipo: "EMENTA_DOC", id: "EMENTA", rub: "", txt: s.replace(/^EMENTA\s*:\s*/i, "").trim(), status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }
    if (/^DISPOSITIVOS?\s+LEGAIS?\s*:/i.test(s)) {
      current = { tipo: "DISPOSITIVOS_LEGAIS", id: "DISP. LEGAIS", rub: "", txt: "", status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }
    if (/^CONCLUS[ÃA]O\s*:/i.test(s)) {
      current = { tipo: "CONCLUSAO", id: "CONCLUSÃO", rub: "", txt: s.replace(/^CONCLUS[ÃA]O\s*:\s*/i, "").trim(), status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }
    if (/^\s*Art\.\s*\d+/i.test(s)) {
      let status = "vigente", alteracao = "";
      const altM = s.match(reAltera);
      if (altM) alteracao = altM.map(m => m.replace(/^\[|\]$/g, "").trim()).join("; ");
      const cleanTxt = s.replace(reAltera, "").trim();
      if (reVetado.test(cleanTxt)) status = "vetado";
      else if (reRevogado.test(cleanTxt)) status = "revogado";
      const idM = /^(Art\.\s*\d+[ºo°]?[\-\.]?)/.exec(cleanTxt);
      const txtM = /^Art\.\s*\d+[ºo°]?[\s\-\.]+(.+)/.exec(cleanTxt);
      current = { tipo: "ARTIGO", id: idM ? idM[1].trim() : cleanTxt.slice(0, 30), rub: "", txt: txtM ? txtM[1].trim() : "", status, alteracao };
      ds.push(current); continue;
    }
    if (current) current.txt = current.txt ? current.txt + " " + s : s;
  }
  return ds;
}

export function idT(s) {
  for (const p of PATS) if (p.r.test(s.trim())) return p.t;
  return null;
}

export function exId(t, s) {
  s = s.trim();
  if (DIV.has(t)) return s;
  const R = {
    ARTIGO: /^(Art\.\s*\d+[ºo°]?[\-\.]?)/,
    PARÁGRAFO: /^(§\s*\d+[ºo°]?\.?|Par[áa]grafo\s+[úu]nico\.?)/i,
    INCISO: /^([IVXLCDM]+)\s*[\-–—]/,
    ALÍNEA: /^([a-z]\))/,
    ITEM: /^(\d+\.)/
  };
  const m = R[t]?.exec(s);
  return m ? m[1].trim() : s.slice(0, 30);
}

export function exTx(t, s) {
  s = s.trim();
  if (DIV.has(t)) return "";
  const R = {
    ARTIGO: /^Art\.\s*\d+[ºo°]?[\s\-\.]+(.+)/,
    PARÁGRAFO: /^(?:§\s*\d+[ºo°]?\.?\s+|Par[áa]grafo\s+[úu]nico\.?\s+)(.+)/i,
    INCISO: /^[IVXLCDM]+\s*[\-–—]\s+(.+)/,
    ALÍNEA: /^[a-z]\)\s+(.+)/,
    ITEM: /^\d+\.\s+(.+)/
  };
  const m = R[t]?.exec(s);
  return m ? m[1].trim() : s;
}

export function detectVetados(ds) {
  const normId = id => (id || "").replace(/[^a-zA-Z0-9ºo°§úÚ]/g, "").toLowerCase();
  for (let i = 0; i < ds.length; i++) {
    if (DIV.has(ds[i].tipo) || ds[i].status !== "vigente") continue;
    const myNorm = normId(ds[i].id);
    if (!myNorm) continue;
    let j = i + 1;
    const nivHier = { ARTIGO: 0, PARÁGRAFO: 1, INCISO: 2, ALÍNEA: 3, ITEM: 4 };
    const meuNiv = nivHier[ds[i].tipo];
    if (meuNiv === undefined) continue;
    while (j < ds.length) {
      if (DIV.has(ds[j].tipo)) { j++; continue; }
      const outroNiv = nivHier[ds[j].tipo];
      if (outroNiv === undefined) { j++; continue; }
      if (ds[j].tipo === ds[i].tipo && normId(ds[j].id) === myNorm) {
        ds[i].status = "vetado"; break;
      }
      if (outroNiv <= meuNiv && normId(ds[j].id) !== myNorm) break;
      j++;
    }
  }
  return ds;
}

export function parse(txt, docTipo) {
  if (docTipo === "PER") return parsePER(txt);
  if (docTipo === "SC") return parseSC(txt);
  return parseLei(txt);
}

function parseLei(txt) {
  const ds = [];
  let a = null, ag = false;
  const reAltera = /\[?\s*(Reda[çc][ãa]o dada pel[oa]\(a\)[^\]]*|Inclu[ií]d[oa]\(a\) pel[oa]\(a\)[^\]]*|Revogad[oa]\(a\) pel[oa]\(a\)[^\]]*)\]?/gi;
  const reVetado = /\(\s*(?:VETADO|Vetado|vetado)\s*\)/;
  const reRevogado = /\(\s*(?:REVOGADO|Revogado|revogado)\s*\)/;

  for (const l of txt.split("\n")) {
    const s = l.trim();
    if (!s) { if (ag && a) ag = false; continue; }
    const t = idT(s);
    if (t) {
      let alteracao = "";
      let status = "vigente";
      const altM = s.match(reAltera);
      if (altM) alteracao = altM.map(m => m.replace(/^\[|\]$/g, "").trim()).join("; ");
      const cleanTxt = s.replace(reAltera, "").trim();
      if (reVetado.test(cleanTxt)) status = "vetado";
      else if (reRevogado.test(cleanTxt)) status = "revogado";
      if (/revogad/i.test(alteracao)) status = "revogado";
      a = { tipo: t, id: exId(t, cleanTxt), rub: "", txt: exTx(t, cleanTxt), status, alteracao };
      ds.push(a);
      ag = DIV.has(t);
    } else if (a) {
      if (ag && !a.rub) { a.rub = s; ag = false; }
      else {
        const altM = s.match(reAltera);
        if (altM) {
          a.alteracao = a.alteracao
            ? (a.alteracao + "; " + altM.map(m => m.replace(/^\[|\]$/g, "").trim()).join("; "))
            : altM.map(m => m.replace(/^\[|\]$/g, "").trim()).join("; ");
          const cleaned = s.replace(reAltera, "").trim();
          if (cleaned) a.txt = a.txt ? a.txt + " " + cleaned : cleaned;
        } else {
          a.txt = a.txt ? a.txt + " " + s : s;
        }
      }
      if (reVetado.test(a.txt)) a.status = "vetado";
      if (reRevogado.test(a.txt)) a.status = "revogado";
      if (a.alteracao && /revogad/i.test(a.alteracao)) a.status = "revogado";
    }
  }
  return detectVetados(ds);
}
