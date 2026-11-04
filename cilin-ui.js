function cilinExample(w){return CILIN.examples[w]||{sentence:"暂无教材例句",source:""};}
/* 词林来源关联：词段证据保留，显示筛选不改动匹配数据。 */
const cilinIndex = new Map();
for (const g of CILIN.groups) for (const w of g.members) {
  if (!cilinIndex.has(w)) cilinIndex.set(w, []);
  cilinIndex.get(w).push(g);
}
function cilinSelection(w) {
  const kind = document.getElementById('cilinKind').value;
  const samePOS = document.getElementById('cilinPOS').checked;
  const limit = Number(document.getElementById('cilinLimit').value);
  const pos = (wordIndex.get(w)||[])[2];
  const groups = (cilinIndex.get(w)||[]).filter(g=>g.marker!=='@' && (kind==='all'||g.marker===kind));
  const peers = new Map();
  for (const g of groups) for (const other of g.members) {
    if(other===w || (samePOS && (wordIndex.get(other)||[])[2]!==pos)) continue;
    if(!peers.has(other)) peers.set(other, []);
    peers.get(other).push(g);
  }
  const all = [...peers].sort((a,b)=>Number(b[1].some(g=>g.marker==='='))-Number(a[1].some(g=>g.marker==='=')) || wordIndex.get(b[0])[5]-wordIndex.get(a[0])[5] || a[0].localeCompare(b[0],'zh'));
  return {groups, all, shown:all.slice(0,limit)};
}
function cilinBlock(w) {
  const {groups,all,shown}=cilinSelection(w);
  let h='<div class="relblock"><h3>词林语义关联</h3>';
  if(!cilinIndex.has(w)) return h+'<p class="note">该词未匹配到本轮词林数据。</p></div>';
  h+=`<div class="note">按完整词段匹配；同词性筛选采用教材主词性。当前找到 ${all.length} 个关联词，显示 ${shown.length} 个。紫色为同义候选，青色为同类相关。</div>`;
  if(!all.length) h+='<p class="relsec">当前筛选下暂无关联词，可切换类别或取消“同词性”。</p>';
  for(const [other,gs] of shown) {
    const r=wordIndex.get(other), syn=gs.some(g=>g.marker==='=');
    h+=`<div class="cilin-item"><div><button class="relit" data-w="${escapeHtml(other)}">${escapeHtml(other)}</button> <span class="tag">${escapeHtml(POS_CN[r[2]]||r[2])} · ${r[5]}次</span></div>`;
    h+=`<div class="cilin-type" style="color:${syn?'#c4b5fd':'#5eead4'}">${syn?'词林同义候选':'词林同类相关'}</div>`;
    h+=`<details><summary>比较教材例句与词段依据</summary><div class="sent"><small>教材例句（v10）</small><br><b>${escapeHtml(w)}</b>：${escapeHtml(cilinExample(w).sentence)}<br><small>${escapeHtml(cilinExample(w).source)}</small></div><div class="sent"><small>教材例句（v10）</small><br><b>${escapeHtml(other)}</b>：${escapeHtml(cilinExample(other).sentence)}<br><small>${escapeHtml(cilinExample(other).source)}</small></div>`;
    for(const g of gs) h+=`<div class="relsec">${escapeHtml(g.code)}（${g.marker==='='?'同义词段':'同类词段'}）<br>教材内成员：${escapeHtml(g.members.join('、'))}</div>`;
    h+='</details></div>';
  }
  h+='<p class="cilin-foot">来源：《同义词词林（扩展版）》公开镜像。关联按词段记录，是否适用于当前教材语境需结合例句判断。词林不提供本页中文释义或反义关系。</p></div>';
  return h;
}
const originalShowDetail=showDetail;
showDetail=function(w,withRel){
  originalShowDetail(w,withRel);
  const body=document.getElementById('detailBody');
  const block=document.createElement('section');block.innerHTML=cilinBlock(w);
  const first=body.querySelector('.kv');
  if(first) first.insertAdjacentElement('afterend',block); else body.appendChild(block);
};
const originalBuildGraph=buildGraph;
buildGraph=function(width,height){
  if(!state.focus) return originalBuildGraph(width,height);
  const w=state.focus.word, selected=cilinSelection(w);
  const semanticOnly=document.getElementById('cilinView').value==='semantic';
  if(!semanticOnly) selected.shown.forEach(([peer])=>state.focus.nodes.add(peer));
  const graph=semanticOnly?{nodes:[],edges:[]}:originalBuildGraph(width,height);
  if(semanticOnly){
    const ws=[w,...selected.shown.map(x=>x[0])], cx=Math.max(120,(width-(width>850?430:0))/2),cy=height/2;
    const radius=Math.max(80,Math.min(cx-60,height/2-90,250));
    ws.forEach((name,i)=>{
      const r=wordIndex.get(name), angle=(i-1)*2*Math.PI/Math.max(1,ws.length-1)-Math.PI/2;
      graph.nodes.push({id:'w:'+name,name,wordData:r,category:0,
        x:i?cx+radius*Math.cos(angle):cx,y:i?cy+radius*Math.sin(angle):cy,
        symbolSize:i?Math.min(68,34+Math.log2(r[5]+1)*2):82,
        itemStyle:{color:i?'#243c63':'#244f79',borderColor:i?'#a78bfa':'#f5c55e',borderWidth:i?2:3},
        label:{show:true,color:'#f3f6ff',fontSize:i?14:20,fontWeight:i?'normal':'bold'}});
    });
  }
  for(const [peer,gs] of selected.shown){
    const syn=gs.some(g=>g.marker==='='), label=syn?'词林同义候选':'同类相关';
    graph.edges.push({source:'w:'+w,target:'w:'+peer,symbol:['none','none'],
      cilinRelation:{word:w,peer,groups:gs},edgeLabel:label,
      lineStyle:{color:syn?'#a78bfa':'#2dd4bf',width:2.5,type:syn?'solid':'dashed',curveness:semanticOnly?0:.18},
      label:{show:true,formatter:label,fontSize:11,color:syn?'#c4b5fd':'#5eead4',backgroundColor:'#101f33',padding:[3,5]}});
  }
  return graph;
};
const originalInit=init;
init=function(){
  originalInit();
  for(const id of ['cilinKind','cilinPOS','cilinLimit','cilinView']) document.getElementById(id).addEventListener('change',()=>{
    if(state.focus){ render(); showDetail(state.focus.word,true); }
  });
  document.querySelectorAll('[data-cilin-example]').forEach(b=>b.addEventListener('click',()=>{
    document.getElementById('kwSearch').value=b.dataset.cilinExample;focusWord(b.dataset.cilinExample);
  }));
  chart.on('click',p=>{
    if(p.dataType==='edge' && p.data.cilinRelation){
      const r=p.data.cilinRelation;showDetail(r.word,true);
      const details=document.querySelector('#detailBody .cilin-item button[data-w="'+CSS.escape(r.peer)+'"]');
      if(details){const item=details.closest('.cilin-item');item.querySelector('details').open=true;item.scrollIntoView({block:'nearest'});}
    }
  });
  const w=decodeURIComponent(location.hash.slice(1));
  if(wordIndex.has(w)){document.getElementById('kwSearch').value=w;focusWord(w);}
};
