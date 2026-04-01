export const PATS = [
  { t: "PARTE", r: /^\s*PARTE\s+(?:GERAL|ESPECIAL|[IVXLCDM]+|PRELIMINAR)\s*$/i },
  { t: "LIVRO", r: /^\s*LIVRO\s+(?:[IVXLCDM]+|ÚNICO)\s*$/i },
  { t: "TÍTULO", r: /^\s*T[ÍI]TULO\s+(?:[IVXLCDM]+|ÚNICO)\s*$/i },
  { t: "CAPÍTULO", r: /^\s*CAP[ÍI]TULO\s+(?:[IVXLCDM]+|ÚNICO)\s*$/i },
  { t: "SEÇÃO", r: /^\s*SE[ÇC][ÃA]O\s+(?:[IVXLCDM]+|ÚNICA)\s*$/i },
  { t: "SUBSEÇÃO", r: /^\s*SUBSE[ÇC][ÃA]O\s+(?:[IVXLCDM]+|ÚNICA)\s*$/i },
  { t: "ARTIGO", r: /^\s*Art\.\s*\d+[ºo°]?[\s\-\.]+/ },
  { t: "PARÁGRAFO", r: /^\s*(?:§\s*\d+[ºo°]?\.?\s|Par[áa]grafo\s+[úu]nico\.?\s)/i },
  { t: "INCISO", r: /^\s*[IVXLCDM]+\s*[\-–—]\s+/ },
  { t: "ALÍNEA", r: /^\s*[a-z]\)\s+/ },
  { t: "ITEM", r: /^\s*\d+\.\s+/ }
];

export const DIV = new Set(["PARTE", "LIVRO", "TÍTULO", "CAPÍTULO", "SEÇÃO", "SUBSEÇÃO"]);

export function getCS(v) {
  return getComputedStyle(document.body).getPropertyValue(v).trim() || v;
}

export const CT = {
  get PARTE() { return getCS("--gold"); },
  get LIVRO() { return getCS("--gold"); },
  get "TÍTULO"() { return getCS("--gold"); },
  get "CAPÍTULO"() { return getCS("--gold-bright"); },
  get "SEÇÃO"() { return getCS("--border"); },
  get "SUBSEÇÃO"() { return getCS("--bg-hover"); }
};
