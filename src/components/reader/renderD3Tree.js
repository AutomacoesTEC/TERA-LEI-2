import * as d3 from 'd3';

export default function renderD3Tree(data, svgEl, onSelect) {
  if (!d3 || !svgEl || !data) return;
  const cs = v => getComputedStyle(document.body).getPropertyValue(v).trim();
  const C = {
    gold: cs("--gold"),
    goldB: cs("--gold-bright"),
    border: cs("--border"),
    text: cs("--text"),
    sec: cs("--text-sec"),
    err: "#e74c3c",
    ext: "#3498db",
  };
  const H = svgEl.clientHeight || 500;

  d3.select(svgEl).selectAll("*").remove();
  const svg = d3.select(svgEl);

  const defs = svg.append("defs");
  defs.append("marker")
    .attr("id", "teia-arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 26).attr("refY", 0)
    .attr("markerWidth", 6).attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", C.border);

  const filt = defs.append("filter").attr("id", "teia-shadow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
  filt.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3).attr("flood-color", "rgba(0,0,0,0.25)");

  const g = svg.append("g");

  const zoom = d3.zoom().scaleExtent([0.08, 4])
    .on("zoom", e => g.attr("transform", e.transform));
  svg.call(zoom).on("dblclick.zoom", null);

  const root = d3.hierarchy(data);
  root.eachBefore(d => {
    if (d.depth >= 2 && d.children) { d._children = d.children; d.children = null; }
  });

  const layout = d3.tree().nodeSize([56, 300]);

  const nodeLabel = d => d.data.id.replace(/^Art\.\s*/i, "").replace(/[ºo°]/g, "").trim().slice(0, 6);
  const isRev = d => d.data.status === "revogado";
  const hasHidden = d => !!(d._children && d._children.length);
  const nodeColor = d => isRev(d) ? C.err : hasHidden(d) ? C.goldB : C.gold;

  function draw() {
    layout(root);
    const nodes = root.descendants();
    const links = root.links();

    g.selectAll(".t-link").remove();
    g.selectAll(".t-link").data(links).enter().append("path")
      .attr("class", "t-link")
      .attr("fill", "none")
      .attr("stroke", C.border)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.65)
      .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x));

    g.selectAll(".t-node").remove();
    const node = g.selectAll(".t-node").data(nodes).enter().append("g")
      .attr("class", "t-node")
      .attr("transform", d => "translate(" + d.y + "," + d.x + ")")
      .style("cursor", "pointer")
      .on("click", function(ev, d) {
        ev.stopPropagation();
        if (d.children) { d._children = d.children; d.children = null; }
        else if (d._children) { d.children = d._children; d._children = null; }
        onSelect(d.data);
        draw();
      });

    node.append("circle")
      .attr("r", 20)
      .attr("fill", nodeColor)
      .attr("fill-opacity", d => isRev(d) ? 0.7 : 1)
      .attr("stroke", "rgba(255,255,255,0.2)")
      .attr("stroke-width", 2)
      .attr("filter", "url(#teia-shadow)");

    node.append("circle")
      .attr("r", 20)
      .attr("fill", "transparent")
      .attr("stroke", "rgba(255,255,255,0)")
      .attr("stroke-width", 3)
      .on("mouseover", function() { d3.select(this).attr("stroke", "rgba(255,255,255,0.4)"); })
      .on("mouseout", function() { d3.select(this).attr("stroke", "rgba(255,255,255,0)"); });

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#fff")
      .attr("font-size", "10px")
      .attr("font-weight", "700")
      .attr("pointer-events", "none")
      .text(nodeLabel);

    node.filter(d => hasHidden(d)).append("text")
      .attr("x", 22).attr("y", -18)
      .attr("fill", C.goldB)
      .attr("font-size", "9px").attr("font-weight", "700")
      .text(d => "+" + d._children.length);

    node.filter(d => d.data.externalRefs && d.data.externalRefs.length > 0)
      .append("circle")
      .attr("cx", -16).attr("cy", -16).attr("r", 5)
      .attr("fill", C.ext)
      .attr("stroke", "rgba(255,255,255,0.5)").attr("stroke-width", 1.5);

    node.filter(d => d.children && d.children.length > 0).append("text")
      .attr("x", 24).attr("y", 4)
      .attr("fill", C.sec).attr("font-size", "9px")
      .text(d => d.children.length + " >");
  }

  layout(root);
  const xs = root.descendants().map(d => d.x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  svg.call(zoom.transform, d3.zoomIdentity.translate(90, H / 2 - mid));

  draw();
}
