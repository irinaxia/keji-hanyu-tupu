// 独立反义候选层：保留资源出处、教材证据与未终审状态。
const antonymIndex = new Map();
for(const record of ANTONYMS.records){
  if(!record.words.every(word => wordIndex.has(word))) continue;
  for(const word of record.words){
    if(!antonymIndex.has(word)) antonymIndex.set(word,[]);
    antonymIndex.get(word).push(record);
  }
}

function antonymSelection(word){
  if(!document.getElementById('antonymEnabled').checked) return [];
  const limit = Number(document.getElementById('antonymLimit').value);
  return (antonymIndex.get(word)||[]).map(record => ({
    record, peer:record.words.find(w => w!==word),
  })).sort((a,b) => wordIndex.get(b.peer)[5]-wordIndex.get(a.peer)[5]
    || a.peer.localeCompare(b.peer,'zh')).slice(0,limit);
}

function antonymEvidenceHtml(record){
  let h='<b>双方出现的教材原文</b>';
  for(const e of record.jointEvidence){
    h+=`<div class="sent">${escapeHtml(e.sentence)}<br><small>${escapeHtml(e.textbook)} / ${escapeHtml(e.lesson)}<br>定位：${escapeHtml(e.path)} · 第${escapeHtml(e.line)}行</small></div>`;
  }
  for(const word of record.words){
    const examples=(DATA.wordExamples[word]||[]).slice(0,3);
    if(!examples.length) continue;
    h+=`<details class="antonym-word-examples"><summary>「${escapeHtml(word)}」的其他教材用例（${examples.length}条）</summary>`;
    for(const e of examples){
      h+=`<div class="sent">${escapeHtml(e.sentence)}<br><small>${escapeHtml(e.source)} · 第${escapeHtml(e.line)}行</small></div>`;
    }
    h+='</details>';
  }
  const source=ANTONYMS.source;
  const links=record.sourceRows.map(row => {
    const url=source.repository+'/blob/'+source.commit+'/antisem.txt#L'+row.line;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">第${row.line}行</a>`;
  });
  h+=`<p class="cilin-foot">关系来源：<a href="${source.repository}" target="_blank" rel="noopener noreferrer">ChineseAntiword</a> / antisem.txt · ${links.join('、')}<br>状态：AI辅助初筛；未完成研究者确认和逐条辞书核验。原文按来源行保存，同文出现本身不作为反义判定。</p>`;
  if(record.synonymConflicts.length){
    h+=`<p class="note">原资源同时存在词林词段关联：${escapeHtml(record.synonymConflicts.join('、'))}；义项关系待复核。</p>`;
  }
  return h;
}

function antonymBlock(word){
  const entries=antonymSelection(word);
  let h='<div class="relblock antonym-results"><h3>反义词</h3>';
  if(!entries.length){
    return h+'<p class="note">'+(document.getElementById('antonymEnabled').checked
      ? '该词暂无可展示的反义词。'
      : '反义关系显示已关闭。')+'</p></div>';
  }
  h+='<p class="note">来自ChineseAntiword公开词表。</p>';
  for(const {peer,record} of entries){
    const r=wordIndex.get(peer);
    h+=`<div class="cilin-item antonym-item" data-antonym-id="${record.id}"><div><button class="relit" data-w="${escapeHtml(peer)}">${escapeHtml(peer)}</button> <span class="tag">${escapeHtml(POS_CN[r[2]]||r[2])} · ${r[5]}次</span> <span class="tag">反义</span></div><details><summary>查看教材用例与关系来源</summary>${antonymEvidenceHtml(record)}</details></div>`;
  }
  return h+'</div>';
}

const showDetailBeforeAntonyms=showDetail;
showDetail=function(word,...args){
  showDetailBeforeAntonyms(word,...args);
  const body=document.getElementById('detailBody');
  const block=document.createElement('section');
  block.innerHTML=antonymBlock(word);
  const synonymSection=body.querySelector('.cilin-source-results')?.parentElement;
  if(synonymSection) synonymSection.insertAdjacentElement(
    document.getElementById('cilinView').value==='antonym'?'beforebegin':'afterend',block);
  else body.appendChild(block);
};

const buildGraphBeforeAntonyms=buildGraph;
buildGraph=function(width,height){
  if(!state.focus) return buildGraphBeforeAntonyms(width,height);
  const word=state.focus.word;
  const view=document.getElementById('cilinView').value;
  if(view==='semantic') return buildGraphBeforeAntonyms(width,height);
  const selected=antonymSelection(word);
  let graph;
  if(view==='antonym'){
    graph={nodes:[],edges:[]};
    const words=[word,...selected.map(item=>item.peer)];
    const cx=Math.max(120,(width-(width>850?430:0))/2),cy=height/2;
    const radius=Math.max(80,Math.min(cx-60,height/2-90,250));
    words.forEach((name,i)=>{
      const r=wordIndex.get(name), angle=(i-1)*2*Math.PI/Math.max(1,words.length-1)-Math.PI*.75;
      graph.nodes.push({id:'w:'+name,name,wordData:r,category:0,
        x:i?cx+radius*Math.cos(angle):cx,y:i?cy+radius*Math.sin(angle):cy,
        symbolSize:i?Math.min(68,34+Math.log2(r[5]+1)*2):82,
        itemStyle:{color:i?'#3d2944':'#244f79',borderColor:i?'#fb7185':'#f5c55e',borderWidth:i?2:3},
        label:{show:true,color:'#f3f6ff',fontSize:i?14:20,fontWeight:i?'normal':'bold'}});
    });
  }else{
    const previousNodes=state.focus.nodes;
    state.focus.nodes=new Set([...previousNodes,...selected.map(item=>item.peer)]);
    try{graph=buildGraphBeforeAntonyms(width,height);}
    finally{state.focus.nodes=previousNodes;}
  }
  for(const {peer,record} of selected){
    graph.edges.push({source:'w:'+word,target:'w:'+peer,symbol:['none','none'],
      antonymRelation:{word,peer,id:record.id},edgeLabel:'反义',
      lineStyle:{color:'#fb7185',width:2.3,type:'dashed',curveness:view==='antonym'?0:-.18},
      label:{show:true,formatter:'反义',fontSize:11,color:'#fda4af',backgroundColor:'#101f33',padding:[3,5]}});
  }
  return graph;
};

const initBeforeAntonyms=init;
init=function(){
  initBeforeAntonyms();
  document.getElementById('antonymSummary').textContent=
    ANTONYMS.counts.displayCandidatePairs+'对反义关联 · '+ANTONYMS.counts.displayWords+'个教材词形。';
  for(const id of ['antonymEnabled','antonymLimit']){
    document.getElementById(id).addEventListener('change',()=>{
      render();
      if(state.focus) showDetail(state.focus.word,true);
    });
  }
  document.querySelectorAll('[data-cilin-example]').forEach(button=>{
    button.addEventListener('click',()=>{
      if(document.getElementById('cilinView').value==='antonym'){
        document.getElementById('cilinView').value='semantic';
      }
    },true);
  });
  document.querySelectorAll('[data-antonym-example]').forEach(button=>{
    button.addEventListener('click',()=>{
      document.getElementById('antonymEnabled').checked=true;
      document.getElementById('cilinView').value='antonym';
      document.getElementById('kwSearch').value=button.dataset.antonymExample;
      focusWord(button.dataset.antonymExample);
    });
  });
  chart.on('click',event=>{
    if(event.dataType!=='edge' || !event.data.antonymRelation) return;
    const relation=event.data.antonymRelation;
    showDetail(relation.word,true);
    const item=document.querySelector('[data-antonym-id="'+CSS.escape(relation.id)+'"]');
    if(item){item.querySelector('details').open=true;item.scrollIntoView({block:'nearest'});}
  });
};

const focusCollocationBeforeAntonyms=focusCollocationRecord;
focusCollocationRecord=function(id){
  if(document.getElementById('cilinView').value==='antonym'){
    document.getElementById('cilinView').value='combined';
  }
  return focusCollocationBeforeAntonyms(id);
};
