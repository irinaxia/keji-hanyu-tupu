// 只用词林标记为“=”的词段。排除记录针对词段和义项，不删除词本身。
const cilinContextExclusions = new Map([
  ["Ih05C01=", new Set(["抽", "滑坡", "刨"])],
  ["Da14B01=", new Set(["功"])],
  ["Dj05A01=", new Set(["圆"])],
  ["Cb07A01=", new Set(["圆"])],
  ["Dk16B01=", new Set(["电"])],
  ["Hi11D01=", new Set(["电", "发电"])],
  ["Br01A13=", new Set(["面"])],
  ["Bb02A01=", new Set(["面"])],
  ["Kd01A01=", new Set(["底"])],
  ["Da21A03=", new Set(["底"])],
  ["De03A01=", new Set(["种", "胆"])],
  ["Eb36C01=", new Set(["弱"])],
  ["Ib03B01=", new Set(["弱"])],
  ["Da08B01=", new Set(["造化"])],
  ["Hj43C01=", new Set(["温"])],
  ["Ed61A01=", new Set(["夫"])],
  ["Dd14A01=", new Set(["马力"])],
  ["Da13A01=", new Set(["光"])],
  ["Id03A01=", new Set(["光"])],
  ["Kc04B01=", new Set(["纵"])],
  ["Dn09A02=", new Set(["和", "水"])],
  ["Ed15C01=", new Set(["和"])],
  ["Ed15A01=", new Set(["可以"])],
]);
const cilinSynonymIndex = new Map();
for (const group of CILIN.groups) {
  if(group.marker !== '=') continue;
  const excluded = cilinContextExclusions.get(group.code);
  const members = group.members.filter(word => wordIndex.has(word) && !excluded?.has(word));
  for(const word of members){
    if(!cilinSynonymIndex.has(word)) cilinSynonymIndex.set(word, []);
    cilinSynonymIndex.get(word).push({code:group.code,members});
  }
}
// 从 v10 教材用例中选取该词段义项的示例，不影响词对纳入。
const reductionExamples = {
  "减": {
    "sentence": "因此，日常生活中我们应养成良好的习惯，少吃 “游离糖”，小心 “隐形糖”，减掉 “添加糖”，科学控糖，避免 “高糖” 危害。",
    "source": "理工中文 / 14_第十四章饮食中的大学问_03_高糖食品的危害"
  },
  "减小": {
    "sentence": "在一段平直的铁轨上行驶的火车，受到机车的牵引力，同时受到空气和铁轨对它的阻力，牵引力使火车的速度增大，阻力使火车的速度减小。",
    "source": "基础科技汉语教程阅读课本下 / 54_02_物体在平衡力作用下的运动"
  },
  "压缩": {
    "sentence": "灰松鼠的繁殖能力也比红松鼠强，所以灰松鼠的数量在急剧上升，结果红松鼠的栖息地进一步被压缩。",
    "source": "汉语科技文选读 / 04_生物世界_第4课"
  }
};
function cilinExample(word,codes){
  const example = codes.includes('Ih05C01=') && reductionExamples[word];
  return example || CILIN.examples[word] || {sentence:'暂无教材例句',source:''};
}
function cilinSelection(w) {
  const limit = Number(document.getElementById('cilinLimit').value);
  const peers = new Map();
  for(const {code,members} of cilinSynonymIndex.get(w)||[]){
    for(const peer of members){
      if(peer===w) continue;
      if(!peers.has(peer)) peers.set(peer,[]);
      peers.get(peer).push(code);
    }
  }
  const entries=[...peers].map(([peer,codes])=>({peer,codes}));
  entries.sort((a,b)=>wordIndex.get(b.peer)[5]-wordIndex.get(a.peer)[5] || a.peer.localeCompare(b.peer,'zh'));
  return entries.slice(0,limit);
}
function cilinBlock(w) {
  const entries=cilinSelection(w);
  let h='<div class="relblock cilin-source-results"><h3>词林近义词</h3>';
  if(!entries.length) return h+'<p class="note">暂无可展示的词林近义词。</p></div>';
  h+='<p class="note">来自《同义词词林（扩展版）》的同义词段。已发现与教材义项明显不符的成员已过滤。</p>';
  for(const {peer,codes} of entries){
    const r=wordIndex.get(peer);
    h+=`<div class="cilin-item"><div><button class="relit" data-w="${escapeHtml(peer)}">${escapeHtml(peer)}</button> <span class="tag">${escapeHtml(POS_CN[r[2]]||r[2])} · ${r[5]}次</span></div><details><summary>查看各词教材用例和词林出处</summary>`;
    for(const word of [w,peer]){
      const {sentence,source}=cilinExample(word,codes);
      h+=`<div class="sent"><b>${escapeHtml(word)}</b>：${escapeHtml(sentence)}<br><small>${escapeHtml(source)}</small></div>`;
    }
    h+=`<p class="cilin-foot">词林词段：${escapeHtml(codes.join('、'))}</p></details></div>`;
  }
  return h+'</div>';
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
  let graph={nodes:[],edges:[]};
  if(!semanticOnly){
    const originalNodes=state.focus.nodes;
    state.focus.nodes=new Set([...originalNodes,...selected.map(entry=>entry.peer)]);
    try { graph=originalBuildGraph(width,height); }
    finally { state.focus.nodes=originalNodes; }
  }
  if(semanticOnly){
    const ws=[w,...selected.map(entry=>entry.peer)], cx=Math.max(120,(width-(width>850?430:0))/2),cy=height/2;
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
  for(const {peer} of selected){
    const label='词林近义词';
    graph.edges.push({source:'w:'+w,target:'w:'+peer,symbol:['none','none'],
      cilinRelation:{word:w,peer},edgeLabel:label,
      lineStyle:{color:'#a78bfa',width:2.5,type:'solid',curveness:semanticOnly?0:.18},
      label:{show:true,formatter:label,fontSize:11,color:'#c4b5fd',backgroundColor:'#101f33',padding:[3,5]}});
  }
  return graph;
};
const originalInit=init;
init=function(){
  originalInit();
  for(const id of ['cilinLimit','cilinView']) document.getElementById(id).addEventListener('change',()=>{
    if(state.focus){ render(); showDetail(state.focus.word,true); }
  });
  document.querySelectorAll('[data-cilin-example]').forEach(b=>b.addEventListener('click',()=>{
    document.getElementById('kwSearch').value=b.dataset.cilinExample;focusWord(b.dataset.cilinExample);
  }));
  chart.on('click',p=>{
    if(p.dataType==='edge' && p.data.cilinRelation){
      const r=p.data.cilinRelation;showDetail(r.word,true);
      const details=document.querySelector('#detailBody .cilin-source-results .cilin-item button[data-w="'+CSS.escape(r.peer)+'"]');
      if(details){const item=details.closest('.cilin-item');item.querySelector('details').open=true;item.scrollIntoView({block:'nearest'});}
    }
  });
  const w=decodeURIComponent(location.hash.slice(1));
  if(wordIndex.has(w)){document.getElementById('kwSearch').value=w;focusWord(w);}
};
