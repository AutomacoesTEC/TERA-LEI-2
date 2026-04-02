import { AREAS } from '../constants/areas';
import { DIV } from '../constants/patterns';

export function fullTextSearch(ds, termo, leiId = null, study = null, tagsConfig = [], scope = { legis: true, notas: true }) {
  const hasTerm = termo && termo.trim().length >= 3;
  if (!hasTerm && !termo.includes("#")) return [];
  const termos = termo.split("+")
    .map(t => t.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    .filter(t => t.length >= 3);
  if (termos.length === 0) return [];
  const resultados = [];
  let artAtual = "";
  for (let i = 0; i < ds.length; i++) {
    try {
      const d = ds[i];
      if (DIV.has(d.tipo)) artAtual = "";
      else if (d.tipo === "ARTIGO") artAtual = d.id;
      let textoLegis = "";
      if (scope.legis) textoLegis = ((d.id || "") + " " + (d.rub || "") + " " + (d.txt || ""));
      let textoNotas = "";
      if (leiId && study) {
        const k = `${leiId}-${i}`;
        const note = (scope.notas ? study[k]?.note : "") || "";
        const tags = study[k]?.tags || [];
        const noteTags = study[k]?.noteTags || [];
        const tagNames = tagsConfig.filter(t => tags.includes(t.id) || noteTags.includes(t.id)).map(t => "#" + t.name).join(" ");
        textoNotas = note + " " + tagNames;
      }
      const textoFinal = (textoLegis + " " + textoNotas).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (termos.every(t => textoFinal.includes(t))) {
        const ocorrencias = hasTerm ? termos.reduce((s, t) => s + (textoFinal.split(t).length - 1), 0) : 1;
        resultados.push({ idx: i, tipo: d.tipo, id: d.id, art: artAtual, txt: d.txt, rub: d.rub, ocorrencias, status: d.status || "vigente" });
      }
    } catch (_) {}
  }
  return resultados;
}

export function hierarquia(ds) {
  const ctx = {};
  const trilha = { PARTE: "", LIVRO: "", "TÍTULO": "", "CAPÍTULO": "", "SEÇÃO": "", "SUBSEÇÃO": "" };
  const niv = ["PARTE", "LIVRO", "TÍTULO", "CAPÍTULO", "SEÇÃO", "SUBSEÇÃO"];
  for (const d of ds) {
    if (DIV.has(d.tipo)) {
      trilha[d.tipo] = d.rub || d.id;
      const i = niv.indexOf(d.tipo);
      for (let j = i + 1; j < niv.length; j++) trilha[niv[j]] = "";
    }
    if (d.tipo === "ARTIGO") ctx[d.id] = Object.values(trilha).filter(Boolean).join(" > ");
  }
  return ctx;
}

export function buildIdx(ds, area) {
  const ws = AREAS[area]?.palavras || [];
  const idx = {};
  let art = "";
  for (const d of ds) {
    if (d.tipo === "ARTIGO") art = d.id;
    const t = (d.txt + " " + d.rub).toLowerCase();
    for (const w of ws) if (t.includes(w.toLowerCase()) && art) {
      if (!idx[w]) idx[w] = [];
      if (!idx[w].includes(art)) idx[w].push(art);
    }
  }
  return Object.fromEntries(Object.entries(idx).sort((a, b) => a[0].localeCompare(b[0], "pt")));
}

export function extrairRemissoes(ds) {
  const re = /(?:§\s*\d+[ºo°]?\s+d[oe]\s+)?(?:arts?\.\s*)(\d+[ºo°]?(?:\s*(?:,|e|a)\s*\d+[ºo°]?)*)/gi;
  const res = [];
  let art = "";
  for (const d of ds) {
    if (d.tipo === "ARTIGO") art = d.id;
    const full = d.txt + " " + d.rub;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(full)) !== null) {
      const refs = m[1].match(/\d+[ºo°]?/g) || [];
      for (const r of refs) {
        const dest = "Art. " + r;
        if (dest !== art && art) res.push({ origem: art, disp: d.id, destino: dest, ctx: full.trim(), tipo: d.tipo });
      }
    }
  }
  return res;
}

export function extrairPrazosValores(ds) {
  const reVal = /R\$\s*[\d.]+,\d{2}/g;
  const rePct = /\d+(?:[,.]\d+)?\s*%/g;
  const rePrazo = /(?:\d+\s*(?:dias?|meses?|anos?|horas?))|(?:at[ée]\s+\d{1,2}\s+de\s+\w+)/gi;
  const res = [];
  let art = "", cap = "";
  for (const d of ds) {
    if (d.tipo === "CAPÍTULO") cap = d.rub || d.id;
    if (d.tipo === "ARTIGO") art = d.id;
    if (!d.txt) continue;
    for (const rx of [[reVal, "VALOR (R$)"], [rePct, "PERCENTUAL (%)"], [rePrazo, "PRAZO"]]) {
      rx[0].lastIndex = 0;
      let m;
      while ((m = rx[0].exec(d.txt)) !== null) res.push({ art, cap, disp: d.id, tipo: rx[1], val: m[0], ctx: d.txt });
    }
  }
  return res;
}
