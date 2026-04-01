import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function pdfToText(f) {
  const ab = await f.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const pg = await pdf.getPage(i);
    const c = await pg.getTextContent();
    const items = c.items.filter(x => x.str.trim()).sort((a, b) => {
      const dy = b.transform[5] - a.transform[5];
      return Math.abs(dy) > 3 ? dy : a.transform[4] - b.transform[4];
    });
    let lastY = null;
    let line = "";
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 3) { fullText += line.trim() + "\n"; line = ""; }
      line += (line ? " " : "") + item.str;
      lastY = y;
    }
    if (line.trim()) fullText += line.trim() + "\n";
  }
  fullText = fullText.replace(/([.;:)\]]) *(§\s*\d)/g, "$1\n$2");
  fullText = fullText.replace(/([.;:)\]]) *(Parágrafo único)/gi, "$1\n$2");
  fullText = fullText.replace(/ (TÍTULO\s+[IVXLCDM])/g, "\n$1");
  fullText = fullText.replace(/ (CAPÍTULO\s+[IVXLCDM])/g, "\n$1");
  fullText = fullText.replace(/ (Seção\s+[IVXLCDM])/gi, "\n$1");
  fullText = fullText.replace(/ (Subseção\s+[IVXLCDM])/gi, "\n$1");
  fullText = fullText.replace(/ (PARTE\s+(?:GERAL|ESPECIAL|[IVXLCDM]))/g, "\n$1");
  fullText = fullText.replace(/ (LIVRO\s+[IVXLCDM])/g, "\n$1");
  fullText = fullText.replace(/\s*(?:\u0000|\ufffd)?\s*ANEXO\s+[IVXLCDM]+\.pdf/gi, "");
  fullText = fullText.replace(/ANEXO\s+[IVXLCDM]+\.pdf/gi, "");
  fullText = fullText.replace(/\* Este texto não substitui o publicado oficialmente\./gi, "");
  return fullText;
}
