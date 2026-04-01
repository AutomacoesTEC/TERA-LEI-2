"use strict";
const _DIV = new Set(["PARTE","LIVRO","TÍTULO","CAPÍTULO","SEÇÃO","SUBSEÇÃO"]);

function _buildIndices(ds) {
  const ai = new Map();
  const si = new Map();
  for (const d of ds) {
    if (d.tipo !== "ARTIGO") continue;
    const k = d.id.replace(/[^0-9]/g, "");
    if (!ai.has(k)) ai.set(k, { v: null, r: null, l: null });
    const e = ai.get(k);
    if (d.status === "vigente") e.v = d;
    else if (d.status === "revogado") e.r = d;
    e.l = d;
  }
  let curArt = null;
  for (const d of ds) {
    if (d.tipo === "ARTIGO") { curArt = d.id; continue; }
    if (_DIV.has(d.tipo)) { curArt = null; continue; }
    if (curArt && d.status !== "vetado") {
      if (!si.has(curArt)) si.set(curArt, []);
      si.get(curArt).push(d);
    }
  }
  return { ai, si };
}

function _findDevice(artId, ai) {
  const k = artId.replace(/^Art\.\s*/i, "").replace(/[^0-9]/g, "").trim();
  const e = ai.get(k);
  return e ? (e.v || e.r || e.l) : null;
}

function _extractRefs(text) {
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
  const reLeiDirectlyAfter = /^\s*(?:[,;]\s*)?(?:d[aoe]s?\s+)?(?:Lei(?:\s+Complementar)?|Decreto(?:-Lei)?|Medida\s+Provis[óo]ria|Instru[çc][ãa]o\s+Normativa(?:\s+(?:RFB|SRF|[A-Z]{2,}))?|C[óo]digo\s+\w+|Constitui[çc][ãa]o)\s+[Nn][ºo°]?\s*[\d.]/i;

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
}

const _MAX_DEPTH = 8;
function _buildTree(startId, ai, si, visited, depth) {
  if (depth > _MAX_DEPTH) return null;
  if (visited.has(startId)) return null;
  visited.add(startId);
  const dev = _findDevice(startId, ai);
  if (!dev) return null;
  const isRevogado = dev.status === "revogado";
  const subs = si.get(dev.id) || [];
  const fullText = [dev.txt || "", ...subs.map(s => (s.id || "") + " " + (s.txt || ""))].join(" ");
  const allRefs = isRevogado ? { internal: [], external: [] } : _extractRefs(fullText);
  const selfNum = dev.id.replace(/[^0-9]/g, "");
  const filteredRefs = allRefs.internal.filter(r => r.replace(/[^0-9]/g, "") !== selfNum);
  const children = [];
  for (const ref of filteredRefs) {
    const child = _buildTree(ref, ai, si, visited, depth + 1);
    if (child) children.push(child);
  }
  return {
    id: dev.id,
    text: (dev.txt || "").trim(),
    status: dev.status || "vigente",
    alteracao: dev.alteracao || "",
    subs: subs.map(function(s) {
      try {
        var sr = _extractRefs((s.id || "") + " " + (s.txt || ""));
        return Object.assign({}, s, { externalRefs: sr.external });
      } catch (_) {
        return Object.assign({}, s, { externalRefs: [] });
      }
    }),
    refs: filteredRefs,
    externalRefs: allRefs.external,
    children
  };
}

self.onmessage = function(e) {
  const { ds, startId } = e.data;
  try {
    const { ai, si } = _buildIndices(ds);
    const tree = _buildTree(startId, ai, si, new Set(), 0);
    self.postMessage({ ok: true, tree });
  } catch (err) {
    self.postMessage({ ok: false, error: err.message });
  }
};
