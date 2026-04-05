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

// ─────────────────────────────────────────────────────────────────
// P&R dispatcher — detecta sub-formato e direciona para o parser certo
// ─────────────────────────────────────────────────────────────────
function parsePER(txt) {
  const first4k = txt.slice(0, 4000);
  // P&R PJ 2025: "Capítulo [Romano] - Título" + perguntas "001 Texto?"
  if (/Cap[íi]tulo\s+[IVXLCDM]+/i.test(first4k) && /^\s*\d{3}\s+\S/m.test(txt))
    return parsePER_PJ(txt);
  // P&R EFD: perguntas com "N)" (numeração global com parêntese)
  if (/^\s*\d+\)\s+\S/m.test(txt))
    return parsePER_EFD(txt);
  // P&R Simples Nacional: numeração hierárquica "N.M." com ponto final
  return parsePER_SN(txt);
}

// ─────────────────────────────────────────────────────────────────
// P&R PJ 2025 — Capítulo [Romano] + 3 dígitos (001, 002, ...)
// Hierarquia: SECAO_PR → ASSUNTO → PERGUNTA → txt (resposta)
// ─────────────────────────────────────────────────────────────────
function parsePER_PJ(txt) {
  const ds = [];
  const lines = txt.split("\n");
  const reSecao   = /^Cap[íi]tulo\s+([IVXLCDM]+)\s*[-–—]\s*(.+)/i;
  const rePergunta = /^\s*(\d{3})\s+(.{3,})/;

  let current = null;
  let chapPrefix = "";

  // Retorna a próxima linha não vazia a partir de idx+1
  const nextNonBlank = (idx) => {
    for (let j = idx + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (t) return t;
    }
    return "";
  };

  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) continue;

    // ── Cabeçalho de capítulo ─────────────────────────────────
    const mSec = reSecao.exec(s);
    if (mSec) {
      // Remove "... pág. N" ou "........ N" de entradas do sumário
      const rub = mSec[2].trim()
        .replace(/[\s.]{3,}.*$/, "")
        .replace(/[\s.]+p[áa]g\.?\s*\d+\s*$/i, "")
        .replace(/[\s.]+\d+\s*$/, "")
        .trim();
      if (!rub) continue; // entrada do sumário sem título real
      chapPrefix = "Cap. " + mSec[1];
      current = { tipo: "SECAO_PR", id: chapPrefix, rub, txt: "", status: "vigente", alteracao: "" };
      ds.push(current);
      continue;
    }

    // ── Pergunta (3 dígitos) ──────────────────────────────────
    const mPerg = rePergunta.exec(s);
    if (mPerg) {
      current = {
        tipo: "PERGUNTA",
        id: chapPrefix ? chapPrefix + "." + mPerg[1] : mPerg[1],
        rub: mPerg[2].trim(),
        txt: "", status: "vigente", alteracao: ""
      };
      ds.push(current);
      continue;
    }

    if (!current) continue;

    // ── Extensão de pergunta multiline (antes do "?") ─────────
    if (current.tipo === "PERGUNTA" && !current.rub.endsWith("?")) {
      current.rub = current.rub + " " + s;
      continue;
    }

    // ── Possível ASSUNTO (subtema dentro do capítulo) ─────────
    // É um ASSUNTO se: linha curta, isolada, e a próxima linha não vazia é uma pergunta
    if (current.tipo === "SECAO_PR" || current.tipo === "PERGUNTA") {
      const nb = nextNonBlank(i);
      const nextIsQ = rePergunta.test(nb) || reSecao.test(nb);
      const notContinuation = !/^(Nota[s]?:|Veja\s|Normativo:|Base\s+legal|Base\s+normativa|Art\.\s*\d|§\s*\d|Lei\s+n[ºo°]|Decreto|Instru[çc])/i.test(s);
      if (nextIsQ && notContinuation && s.length >= 3 && s.length <= 120 && !/^\d/.test(s) && !/^[a-z]\)/.test(s)) {
        ds.push({ tipo: "ASSUNTO", id: s.slice(0, 50), rub: s, txt: "", status: "vigente", alteracao: "" });
        current = null;
        continue;
      }
    }

    // ── Texto da resposta ─────────────────────────────────────
    if (current && current.tipo === "PERGUNTA") {
      current.txt = current.txt ? current.txt + " " + s : s;
    }
  }

  return ds;
}

// ─────────────────────────────────────────────────────────────────
// P&R EFD Contribuições — seções em romano + perguntas "N)"
// Hierarquia: SECAO_PR → PERGUNTA → txt (resposta)
// O sumário (págs. 1–9) é em ALL CAPS → filtrado automaticamente
// ─────────────────────────────────────────────────────────────────
function parsePER_EFD(txt) {
  const ds = [];
  const lines = txt.split("\n");
  const reRomanoSozinho = /^\s*([IVXLCDM]{1,6})\.\s*$/;
  const reRomanoTitulo  = /^\s*([IVXLCDM]{1,6})\.\s+(.{2,})\s*$/;
  const rePergunta       = /^\s*(\d+)\)\s+(.{3,})/;

  let current = null;
  let pendingRomano = null;

  // Filtra linha de sumário: ALL CAPS (sem letras minúsculas) ou contém "..."
  // Exceção: linhas que são APENAS numeral romano (ex.: "I.", "XLI.")
  const skipLine = (s) => {
    if (reRomanoSozinho.test(s)) return false; // preserva "I.", "II.", etc.
    if (/\.{3,}/.test(s)) return true;         // ToC com "..."
    if (s.length > 5 && /^[^a-záàâãéèêíïóôõúüçñ]+$/.test(s)) return true; // ALL CAPS
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) continue;
    if (skipLine(s)) { pendingRomano = null; continue; }

    // ── Romano sozinho (ex.: "I.") → aguarda título na próxima linha ─
    const mRS = reRomanoSozinho.exec(s);
    if (mRS) { pendingRomano = mRS[1]; continue; }

    // ── Romano pendente + esta linha = título da seção ───────
    if (pendingRomano) {
      const id = pendingRomano + ".";
      pendingRomano = null;
      if (!rePergunta.test(s) && s.length <= 100) {
        current = { tipo: "SECAO_PR", id, rub: s, txt: "", status: "vigente", alteracao: "" };
        ds.push(current);
        continue;
      }
      // Se a "próxima linha" era uma pergunta, cai no processamento abaixo
    }

    // ── Romano + título na mesma linha (ex.: "I. Leiaute") ───
    const mRT = reRomanoTitulo.exec(s);
    if (mRT && !rePergunta.test(s)) {
      const rub = mRT[2].trim()
        .replace(/[\s.]{3,}.*$/, "")
        .replace(/[\s.]+\d+\s*$/, "")
        .trim();
      if (rub) {
        current = { tipo: "SECAO_PR", id: mRT[1] + ".", rub, txt: "", status: "vigente", alteracao: "" };
        ds.push(current);
        continue;
      }
    }

    // ── Pergunta "N) Texto?" ──────────────────────────────────
    const mPerg = rePergunta.exec(s);
    if (mPerg) {
      current = { tipo: "PERGUNTA", id: mPerg[1], rub: mPerg[2].trim(), txt: "", status: "vigente", alteracao: "" };
      ds.push(current);
      continue;
    }

    if (!current) continue;

    // ── Extensão de pergunta multiline ────────────────────────
    if (current.tipo === "PERGUNTA" && !current.rub.endsWith("?")) {
      current.rub = current.rub + " " + s;
      continue;
    }

    // ── Texto da resposta ─────────────────────────────────────
    if (current.tipo === "PERGUNTA") {
      current.txt = current.txt ? current.txt + " " + s : s;
    }
  }

  return ds;
}

// ─────────────────────────────────────────────────────────────────
// P&R Simples Nacional — seções "N. Título" + perguntas "N.M."
// Hierarquia: SECAO_PR → PERGUNTA → txt (resposta)
// BUG CORRIGIDO: ponto final no ID da pergunta (1.1. não 1.1)
// ─────────────────────────────────────────────────────────────────
function parsePER_SN(txt) {
  const ds = [];
  const lines = txt.split("\n");
  let current = null;

  // Seção: número 1–99 + espaço + título curto sem vírgulas/pontos
  // O padrão curto evita falsos positivos em parágrafos de resposta
  const reSecao    = /^\s*(\d{1,2})\.\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÜÇÑ][^,;.]{2,59})\s*$/;
  // Pergunta: N.M. ou N.M.P. com ponto final (1.1., 2.3., 13.4.)
  const rePergunta = /^\s*(\d+\.\d+(?:\.\d+)*\.?)\s+(.{3,})/;
  // Filtra entradas do sumário (contém "...")
  const isToC = (s) => /\.{3,}/.test(s);

  for (const l of lines) {
    const s = l.trim();
    if (!s || isToC(s)) continue;

    // ── Pergunta (verificada primeiro — padrão mais específico) ─
    const mPerg = rePergunta.exec(s);
    if (mPerg && /^\d+\.\d+/.test(mPerg[1])) {
      const raw = mPerg[1];
      const id = raw.endsWith(".") ? raw : raw + ".";
      current = { tipo: "PERGUNTA", id, rub: mPerg[2].trim(), txt: "", status: "vigente", alteracao: "" };
      ds.push(current);
      continue;
    }

    // ── Seção de capítulo ─────────────────────────────────────
    const mSec = reSecao.exec(s);
    if (mSec) {
      current = { tipo: "SECAO_PR", id: mSec[1] + ".", rub: mSec[2].trim(), txt: "", status: "vigente", alteracao: "" };
      ds.push(current);
      continue;
    }

    if (!current) continue;

    if (current.tipo === "PERGUNTA") {
      // ── Extensão de pergunta multiline ──────────────────────
      if (!current.rub.endsWith("?") && !current.rub.endsWith(".")) {
        current.rub = current.rub + " " + s;
      } else {
        // ── Texto da resposta ──────────────────────────────────
        current.txt = current.txt ? current.txt + " " + s : s;
      }
    }
  }

  return ds;
}

// ─────────────────────────────────────────────────────────────────
// SC (Solução de Consulta) — múltiplos blocos ASSUNTO/EMENTA/DISP.
// Hierarquia: ASSUNTO → EMENTA_DOC → DISPOSITIVOS_LEGAIS → CONCLUSAO
// ─────────────────────────────────────────────────────────────────
function parseSC(txt) {
  const ds = [];
  const lines = txt.split("\n");
  let current = null;
  const reAltera   = /\[?\s*(Reda[çc][ãa]o dada pel[oa]\(a\)[^\]]*|Inclu[ií]d[oa]\(a\) pel[oa]\(a\)[^\]]*|Revogad[oa]\(a\) pel[oa]\(a\)[^\]]*)\]?/gi;
  const reVetado   = /\(\s*(?:VETADO|vetado)\s*\)/;
  const reRevogado = /\(\s*(?:REVOGADO|revogado)\s*\)/;

  for (const l of lines) {
    const s = l.trim();
    if (!s) continue;

    // ── ASSUNTO: extrai sigla do tributo como ID ──────────────
    if (/^ASSUNTO\s*:/i.test(s)) {
      const corpo = s.replace(/^ASSUNTO\s*:\s*/i, "").trim();
      // Extrai sigla entre "–" e fim, ou entre parênteses: "– IRPJ" ou "(IRPJ)"
      const mSigla = corpo.match(/[–\-]\s*([A-Z][A-Z/\-]{1,15})\s*$/) ||
                     corpo.match(/\(([A-Z][A-Z/\-]{1,15})\)\s*$/);
      const id = mSigla ? mSigla[1].trim() : "ASSUNTO " + (ds.filter(d => d.tipo === "ASSUNTO").length + 1);
      current = { tipo: "ASSUNTO", id, rub: corpo, txt: "", status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }

    // ── EMENTA ────────────────────────────────────────────────
    if (/^EMENTA\s*:/i.test(s)) {
      current = { tipo: "EMENTA_DOC", id: "EMENTA", rub: "", txt: s.replace(/^EMENTA\s*:\s*/i, "").trim(), status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }

    // ── DISPOSITIVOS LEGAIS ───────────────────────────────────
    if (/^DISPOSITIVOS?\s+LEGAIS?\s*:/i.test(s)) {
      current = { tipo: "DISPOSITIVOS_LEGAIS", id: "DISP. LEGAIS", rub: "", txt: s.replace(/^DISPOSITIVOS?\s+LEGAIS?\s*:\s*/i, "").trim(), status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }

    // ── CONCLUSÃO ─────────────────────────────────────────────
    if (/^CONCLUS[ÃA]O\s*:/i.test(s)) {
      current = { tipo: "CONCLUSAO", id: "CONCLUSÃO", rub: "", txt: s.replace(/^CONCLUS[ÃA]O\s*:\s*/i, "").trim(), status: "vigente", alteracao: "" };
      ds.push(current); continue;
    }

    // ── Artigo (caso SC contenha artigos, ex.: ADI parseada como SC) ─
    if (/^\s*Art\.\s*\d+/i.test(s)) {
      let status = "vigente", alteracao = "";
      const altM = s.match(reAltera);
      if (altM) alteracao = altM.map(m => m.replace(/^\[|\]$/g, "").trim()).join("; ");
      const cleanTxt = s.replace(reAltera, "").trim();
      if (reVetado.test(cleanTxt)) status = "vetado";
      else if (reRevogado.test(cleanTxt)) status = "revogado";
      const idM  = /^(Art\.\s*\d+[ºo°]?[\-\.]?)/.exec(cleanTxt);
      const txtM = /^Art\.\s*\d+[ºo°]?[\s\-\.]+(.+)/.exec(cleanTxt);
      current = { tipo: "ARTIGO", id: idM ? idM[1].trim() : cleanTxt.slice(0, 30), rub: "", txt: txtM ? txtM[1].trim() : "", status, alteracao };
      ds.push(current); continue;
    }

    // ── Continuação do bloco atual (multiline) ────────────────
    if (current) current.txt = current.txt ? current.txt + " " + s : s;
  }

  return ds;
}

// ─────────────────────────────────────────────────────────────────
// Utilitários do parser de leis (parseLei)
// ─────────────────────────────────────────────────────────────────
export function idT(s) {
  for (const p of PATS) if (p.r.test(s.trim())) return p.t;
  return null;
}

export function exId(t, s) {
  s = s.trim();
  if (DIV.has(t)) return s;
  const R = {
    ARTIGO:    /^(Art\.\s*\d+[ºo°]?[\-\.]?)/,
    PARÁGRAFO: /^(§\s*\d+[ºo°]?\.?|Par[áa]grafo\s+[úu]nico\.?)/i,
    INCISO:    /^([IVXLCDM]+)\s*[\-–—]/,
    ALÍNEA:    /^([a-z]\))/,
    ITEM:      /^(\d+\.)/
  };
  const m = R[t]?.exec(s);
  return m ? m[1].trim() : s.slice(0, 30);
}

export function exTx(t, s) {
  s = s.trim();
  if (DIV.has(t)) return "";
  const R = {
    ARTIGO:    /^Art\.\s*\d+[ºo°]?[\s\-\.]+(.+)/,
    PARÁGRAFO: /^(?:§\s*\d+[ºo°]?\.?\s+|Par[áa]grafo\s+[úu]nico\.?\s+)(.+)/i,
    INCISO:    /^[IVXLCDM]+\s*[\-–—]\s+(.+)/,
    ALÍNEA:    /^[a-z]\)\s+(.+)/,
    ITEM:      /^\d+\.\s+(.+)/
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

// ─────────────────────────────────────────────────────────────────
// Dispatcher principal
// ─────────────────────────────────────────────────────────────────
export function parse(txt, docTipo) {
  if (docTipo === "PER") return parsePER(txt);
  if (docTipo === "SC")  return parseSC(txt);
  return parseLei(txt);
}

// ─────────────────────────────────────────────────────────────────
// Parser de Leis (LC 95/1998) — inalterado
// ─────────────────────────────────────────────────────────────────
function parseLei(txt) {
  const ds = [];
  let a = null, ag = false;
  const reAltera   = /\[?\s*(Reda[çc][ãa]o dada pel[oa]\(a\)[^\]]*|Inclu[ií]d[oa]\(a\) pel[oa]\(a\)[^\]]*|Revogad[oa]\(a\) pel[oa]\(a\)[^\]]*)\]?/gi;
  const reVetado   = /\(\s*(?:VETADO|Vetado|vetado)\s*\)/;
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
