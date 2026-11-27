// 九类搭配展示层。保留原二元记录；长结构另存，避免把格式压成两个词。
const COLLOCATION_TYPES = ['主谓','动宾','定中','状中','述补','量名','介动','框式介词','关联词'];
Object.assign(COLLO_TYPE_COLOR, {'介动':'#f472b6','框式介词':'#a78bfa','关联词':'#38bdf8'});
Object.assign(state, {collocationType:'全部', collocationStatus:'全部', structureFocus:null, collocationDetail:null});

function collocationStatusLabel(status){
  return status && !status.includes('候选') ? status : '搭配记录';
}
const fullSixByKey = new Map();
const fullSixByWord = new Map();
const fullSixRecords = FULL_SIX_COLLOCATIONS.records.map(source => {
  let evidence;
  const record = {...source, full:true, status:'搭配记录', compiledExamples:[],
    get evidence(){
      if(!evidence) evidence = source.occurrences.map(row => {
        const sentence = FULL_SIX_COLLOCATIONS.sentences[row[1]];
        return {id:row[0],sentenceId:sentence[0],sentence:sentence[1],
          textbook:sentence[2],lesson:sentence[3],relativePath:sentence[4],line:sentence[5],
          sentenceNumber:sentence[0].split('|').pop(),surface:row[2],recordStatus:row[3],
          rule:row[4],pos:row[5],dependency:row[6],startToken:row[7],endToken:row[8],review:row[9],
          held:['REVIEWED_EXIT','REVIEWED_NEEDS_CORRECTION','NEEDS_RECHECK_AFTER_BOUNDARY_R2'].includes(row[3])};
      }).sort((a,b) => Number(a.held)-Number(b.held));
      return evidence;
    }
  };
  fullSixByKey.set([record.type,record.first,record.second].join('|'),record);
  for(const word of new Set([record.first,record.second])){
    if(!fullSixByWord.has(word)) fullSixByWord.set(word,[]);
    fullSixByWord.get(word).push(record);
  }
  return record;
});
const legacyCollocationRecords = DATA.collocations.map((c, i) => ({
  id:c[7] || 'legacy-collocation:'+i, type:c[0], first:c[1], second:c[2],
  status:c[6] || '优先展示候选', evidenceCount:c[3], legacy:true,
  evidence:[{sentence:c[4], source:c[5]}],
}));
const collocationRecords = legacyCollocationRecords.filter(record => {
  const full = fullSixByKey.get([record.type,record.first,record.second].join('|'));
  if(!full) return true;
  full.compiledExamples.push(record);
  return false;
}).concat(COLLOCATION_STRUCTURES.records,fullSixRecords);
let collocationPage = 0;
const COLLOCATION_PAGE_SIZE = 80;
function filteredCollocationRecords(){
  const query = (document.getElementById('collocationSearch')?.value || '').trim();
  return collocationRecords.filter(r => isCollocationVisible(r) && (!query ||
    [r.first,r.second,r.template,r.id].some(value => value && value.includes(query))))
    .sort((a,b) => Number(!a.full)-Number(!b.full) || (b.frequency||0)-(a.frequency||0));
}
const collocationRecordIndex = new Map(collocationRecords.map(r => [r.id,r]));

function isCollocationVisible(record){
  const type = Array.isArray(record) ? record[0] : record.type;
  const status = Array.isArray(record) ? record[6] : record.status;
  const example = (record.full && record.compiledExamples.some(r => r.status === '已编制例证')) || status === '已编制例证' || status === '已编制结构例证' || status === '已核查例证';
  return (state.collocationType === '全部' || state.collocationType === type)
    && (state.collocationStatus === '全部' || (state.collocationStatus === '例证' ? example : !example));
}

function collocationTitle(record){
  return record.template || record.first+' → '+record.second;
}

function renderCollocationList(){
  const list = document.getElementById('collocationList');
  const records = filteredCollocationRecords();
  collocationPage = Math.min(collocationPage,Math.max(0,Math.ceil(records.length/COLLOCATION_PAGE_SIZE)-1));
  document.getElementById('collocationSummary').textContent =
    '六类全量：'+fullSixRecords.length+'种组合、'+fullSixRecords.reduce((n,r)=>n+r.evidenceCount,0)+'处实例。当前检索'+records.length+'项。';
  list.innerHTML = records.slice(collocationPage*COLLOCATION_PAGE_SIZE,(collocationPage+1)*COLLOCATION_PAGE_SIZE).map(r => {
    const color = COLLO_TYPE_COLOR[r.type];
    const label = r.full ? (r.graphEnabled ? '搭配记录' : '待核对记录') : collocationStatusLabel(r.status);
    return `<button class="path-item collocation-item" data-collocation="${escapeHtml(r.id)}" style="text-align:left;display:block;width:100%">`
      + `<span style="color:${color}">${escapeHtml(r.type)}</span>　<b>${escapeHtml(collocationTitle(r))}</b>`
      + `<small style="display:block;color:var(--dim)">${escapeHtml(label)}${r.full?' · '+r.evidenceCount+'处实例':''}</small></button>`;
  }).join('') || '<div class="path-empty">该筛选范围暂无记录。</div>';
  document.getElementById('collocationPageLabel').textContent = (collocationPage+1)+' / '+Math.max(1,Math.ceil(records.length/COLLOCATION_PAGE_SIZE));
  document.getElementById('collocationPrev').disabled = collocationPage===0;
  document.getElementById('collocationNext').disabled = (collocationPage+1)*COLLOCATION_PAGE_SIZE>=records.length;
}

function collocationEvidenceHtml(record){
  const candidate = record.representation === 'conjunction_candidate';
  const evidenceHtml = items => items.map(ev => {
    let h = '<div class="sent">';
    if(record.full) h += '<small>'+escapeHtml(fullOccurrenceStatus(ev.recordStatus))+'</small><br>';
    if(ev.surface) h += `<b>${candidate?'标记起始至句末的检索片段':(record.full?'原提取表层范围':'完整形式')}：</b>${escapeHtml(ev.surface)}<br>`;
    h += `<b>教材原句：</b>${escapeHtml(ev.sentence || '')}`;
    if(ev.slots && Object.keys(ev.slots).length){
      h += '<br><b>'+(candidate?'检索文本范围（待核查）':'结构成分')+'：</b>'+Object.entries(ev.slots)
        .map(([key,value]) => escapeHtml(key)+' = '+escapeHtml(value)).join('；');
    }
    const source = ev.source || ev.textbook+' / '+ev.lesson;
    h += `<br><small>${escapeHtml(source)}</small>`;
    if(ev.sentenceId) h += `<br><small>句子编号：${escapeHtml(ev.sentenceId)}</small>`;
    if(ev.line) h += `<br><small>定位：第${escapeHtml(ev.line)}行 · 句序${escapeHtml(ev.sentenceNumber)}</small>`;
    if(ev.id) h += `<br><small>证据编号：${escapeHtml(ev.id)}</small>`;
    if(record.full){
      h += '<br><small>规则：'+escapeHtml(ev.rule)+' · 词性：'+escapeHtml(ev.pos)+'<br>依存依据：'+escapeHtml(ev.dependency)+' · 原词位：'+escapeHtml(ev.startToken)+'—'+escapeHtml(ev.endToken)+'</small>';
      if(ev.review) h += '<br><small>核查记录：'+escapeHtml(ev.review.note || '')+(ev.review.correction?'；修正建议：'+escapeHtml(ev.review.correction):'')+'</small>';
    }
    if(ev.textCorrections && ev.textCorrections.length){
      h += '<details style="margin-top:6px"><summary>文字校订记录</summary>'
        + ev.textCorrections.map(c => escapeHtml(c.from)+' → '+escapeHtml(c.to)).join('；')
        + '<br>原转录：'+escapeHtml(ev.sourceSentenceOriginal || '')+'</details>';
    }
    return h+'</div>';
  }).join('');
  if((!candidate && !record.full) || record.evidence.length <= 5) return evidenceHtml(record.evidence);
  return evidenceHtml(record.evidence.slice(0,5))
    + '<details><summary>查看其余'+(record.evidence.length-5)+'条教材原句</summary>'
    + evidenceHtml(record.evidence.slice(5))+'</details>';
}

function showCollocationRecord(id){
  const record = collocationRecordIndex.get(id);
  if(!record) return;
  state.collocationDetail = id;
  const color = COLLO_TYPE_COLOR[record.type];
  let h = `<h2 style="font-size:19px">${escapeHtml(collocationTitle(record))}</h2>`
    + `<div style="margin-top:8px"><span class="tag" style="border-color:${color};color:${color}">${escapeHtml(record.type)}</span>`
    + `<span class="tag">${escapeHtml(collocationStatusLabel(record.status))}</span></div>`;
  if(record.publicationStatus === 'NOT_YET_FINAL_GRAPH_FACT'){
    h += '<p class="note" style="margin-top:8px">已有研究者编制记录；正式图谱准入尚待确认。以下保留原有结构、槽位及教材证据。</p>';
  }
  if(record.status === '优先展示候选'){
    h += '<p class="note" style="margin-top:8px">'+(record.representation==='conjunction_candidate'
      ? '依据大纲双标记形式匹配教材原句；连接关系及分项边界待核查。'
      : '自动提取记录，保留教材原句与识别依据。')+'</p>';
  }
  if(record.outlineSources){
    h += '<div class="kv"><b>大纲依据</b><div>'+record.outlineSources.map(s =>
      escapeHtml(s.level+' · '+s.projectId+' · '+s.clauseType+' · '+s.location)).join('<br>')+'</div></div>'
      + '<div class="kv"><b>教材命中</b> '+record.matchCount+'处记录 · '+record.textbookCoverage+'部教材 · '+record.lessonCoverage+'篇课文</div>';
  }
  if(record.full){
    h += fullCollocationMetadataHtml(record);
  }else if(record.legacy){
    h += `<div class="kv"><b>核心词项</b><div>${escapeHtml(record.first)} → ${escapeHtml(record.second)}</div></div>`;
  }else{
    h += `<div class="kv"><b>${record.representation==='preposition_verb_example'?'核心词项':'固定成分'}</b><div>${record.anchors.map(w => `<button class="relit" data-w="${escapeHtml(w)}">${escapeHtml(w)}</button>`).join('　')}</div></div>`
      + `<div class="kv"><b>已附证据</b> ${record.evidence.length}条教材实例</div>`;
  }
  h += `<div class="kv"><b>教材用例及来源</b>${collocationEvidenceHtml(record)}</div>`
    + `<div class="kv"><b>条目编号</b><div style="overflow-wrap:anywhere">${escapeHtml(record.id)}</div></div>`;
  if(record.recordStatus && !record.full){
    h += `<details class="kv"><summary>原记录状态</summary><div>编制状态：${escapeHtml(record.recordStatus)}<br>发布状态：${escapeHtml(record.publicationStatus)}</div></details>`;
  }
  document.getElementById('detailBody').innerHTML = h;
  document.getElementById('detail').classList.add('open');
}

function focusCollocationRecord(id){
  const record = collocationRecordIndex.get(id);
  if(!record) return;
  if(record.full){
    clearInterval(flashTimer); hideSuggest(); state.structureFocus=null; state.focus=null; state.fullCollocationFocus=id;
    document.getElementById('kwSearch').value=''; document.getElementById('kwClear').style.display='block';
    render(); showCollocationRecord(id); return;
  }
  state.fullCollocationFocus=null;
  clearInterval(flashTimer);
  hideSuggest();
  state.collocationDetail = id;
  state.structureFocus = record.legacy ? null : id;
  state.focus = record.legacy ? {word:record.first, nodes:new Set([record.first,record.second])} : null;
  document.getElementById('kwSearch').value = record.legacy ? record.first : '';
  document.getElementById('kwClear').style.display = 'block';
  render();
  showCollocationRecord(id);
}

function addStructureToGraph(graph, record){
  const color = COLLO_TYPE_COLOR[record.type];
  const existing = new Set(graph.nodes.map(n => n.id));
  const id = 'structure:'+record.id;
  graph.nodes.push({id, name:record.template, category:3, structureId:record.id,
    symbol:'roundRect', symbolSize:[Math.min(220,record.template.length*13+24),38],
    itemStyle:{color:'#152a44',borderColor:color,borderWidth:2},
    label:{show:true,fontSize:12,color},
  });
  for(const word of record.anchors){
    const r = wordIndex.get(word);
    if(!r) continue;
    if(!existing.has('w:'+word)){
      graph.nodes.push({id:'w:'+word,name:word,category:0,wordData:r,
        symbolSize:Math.min(60,18+Math.log2(r[5]+1)*3),
        itemStyle:{color:C.word},label:{show:true,fontSize:12,color:'#dbeafe'}});
      existing.add('w:'+word);
    }
    // 表示固定成分属于该结构，不将两个标记直接解释为二元句法关系。
    graph.edges.push({source:'w:'+word,target:id,structureId:record.id,
      edgeLabel:record.type,sent:record.evidence[0].sentence,status:record.status,
      symbol:['none','none'],lineStyle:{color,width:2,type:'solid',curveness:.08},
      label:{show:!!state.focus || !!state.structureFocus || state.edgeLabel,formatter:record.type,fontSize:10,color},
    });
  }
}

const buildGraphBeforeNineTypes = buildGraph;
buildGraph = function(width,height){
  if(state.fullCollocationFocus) return fullCollocationGraph(collocationRecordIndex.get(state.fullCollocationFocus),width,height);
  if(state.structureFocus){
    const record = collocationRecordIndex.get(state.structureFocus);
    const graph = {nodes:[],edges:[]};
    addStructureToGraph(graph,record);
    const cx = Math.max(140,(width-(width>850?430:0))/2), cy = height/2;
    graph.nodes.forEach((node,i) => {
      // 两个锚点也须有非零横纵跨度，避免 ECharts 将子图缩成细线。
      const angle = -Math.PI*.75+(i-1)*Math.PI*2/Math.max(1,graph.nodes.length-1);
      node.x = i ? cx+150*Math.cos(angle) : cx;
      node.y = i ? cy+150*Math.sin(angle) : cy;
    });
    return graph;
  }
  const graph = buildGraphBeforeNineTypes(width,height);
  if(state.focus && document.getElementById('cilinView').value === 'semantic') return graph;
  if(!state.lyCol && !state.focus) return graph;
  const visible = new Set(graph.nodes.filter(n => n.wordData).map(n => n.wordData[0]));
  for(const record of COLLOCATION_STRUCTURES.records){
    if(!isCollocationVisible(record)) continue;
    const relevant = state.focus ? record.anchors.includes(state.focus.word)
      : record.anchors.some(w => visible.has(w));
    if(relevant) addStructureToGraph(graph,record);
  }
  addFullCollocationsToGraph(graph);
  return graph;
};

const showDetailBeforeNineTypes = showDetail;
showDetail = function(word,withRel){
  state.collocationDetail = null;
  showDetailBeforeNineTypes(word,withRel);
  const records = COLLOCATION_STRUCTURES.records.filter(r => isCollocationVisible(r) && r.anchors.includes(word));
  const fullRecords = (fullSixByWord.get(word)||[]).filter(isCollocationVisible);
  if(!records.length && !fullRecords.length) return;
  const block = document.createElement('section');
  block.className = 'relblock';
  block.innerHTML = '<h3>相关搭配结构</h3>'+records.map(r =>
    `<div class="relsec"><span class="relsec-tag" style="color:${COLLO_TYPE_COLOR[r.type]}">${escapeHtml(r.type)}</span>`
    + `<button data-collocation="${escapeHtml(r.id)}">${escapeHtml(r.template)}</button>`
    + '<small>　'+escapeHtml(collocationStatusLabel(r.status))+(r.publicationStatus==='NOT_YET_FINAL_GRAPH_FACT'?' · 待正式准入':'')+'</small></div>'
  ).join('');
  if(fullRecords.length){
    block.insertAdjacentHTML('beforeend','<h3>全量搭配记录（'+fullRecords.length+'项）</h3>'+fullRecords.slice(0,20).map(r=>'<div class="relsec"><button data-collocation="'+escapeHtml(r.id)+'">'+escapeHtml(r.type+' '+collocationTitle(r))+'</button><small> '+r.evidenceCount+'处实例</small></div>').join('')+'<button id="allWordCollocations">在左侧查看该词全部记录</button>');
  }
  document.getElementById('detailBody').appendChild(block);
  const allButton=document.getElementById('allWordCollocations');
  if(allButton) allButton.addEventListener('click',()=>{document.getElementById('collocationSearch').value=word;collocationPage=0;renderCollocationList();});
};

const focusWordBeforeNineTypes = focusWord;
focusWord = function(word){
  state.structureFocus = null;
  state.fullCollocationFocus = null;
  state.collocationDetail = null;
  return focusWordBeforeNineTypes(word);
};
const flashBeforeNineTypes = flashAndCenter;
flashAndCenter = function(word){
  if(state.structureFocus || state.fullCollocationFocus || state.collocationDetail) return;
  return flashBeforeNineTypes(word);
};
const clearSearchBeforeNineTypes = clearSearch;
clearSearch = function(){
  const hadStructure = !!state.structureFocus || !!state.fullCollocationFocus;
  state.fullCollocationFocus = null;
  state.structureFocus = null;
  state.collocationDetail = null;
  clearSearchBeforeNineTypes();
  if(hadStructure) render();
};
const statsBeforeNineTypes = updateStats;
updateStats = function(n,e){
  statsBeforeNineTypes(n,e);
  document.getElementById('stats').insertAdjacentHTML('beforeend',
    '<span class="stat"><b>'+fullSixRecords.length+'</b>六类搭配组合</span><span class="stat"><b>9</b>搭配类型 · <b>'+COLLOCATION_STRUCTURES.records.length+'</b>结构与用法条目</span>');
};

const initBeforeNineTypes = init;
init = function(){
  const selector = document.getElementById('collocationType');
  selector.innerHTML = '<option value="全部">全部九类搭配</option>'+COLLOCATION_TYPES.map(type => {
    const count = collocationRecords.filter(r => r.type===type).length;
    return `<option value="${type}">${type}（${count}项展示记录）</option>`;
  }).join('');
  initBeforeNineTypes();
  document.getElementById('collocationSearch').addEventListener('input',()=>{collocationPage=0;renderCollocationList();});
  document.getElementById('collocationPrev').addEventListener('click',()=>{collocationPage--;renderCollocationList();});
  document.getElementById('collocationNext').addEventListener('click',()=>{collocationPage++;renderCollocationList();});
  const change = () => {
    collocationPage=0; state.fullCollocationFocus=null;
    state.collocationType = selector.value;
    state.collocationStatus = document.getElementById('collocationStatus').value;
    state.lyCol = true;
    document.getElementById('lyCol').checked = true;
    if(state.structureFocus && !isCollocationVisible(collocationRecordIndex.get(state.structureFocus))){
      state.structureFocus = null;
      state.collocationDetail = null;
      document.getElementById('detail').classList.remove('open');
    }
    renderCollocationList();
    if(state.focus) focusWord(state.focus.word); else render();
  };
  selector.addEventListener('change',change);
  document.getElementById('collocationStatus').addEventListener('change',change);
  for(const id of ['collocationList','detailBody']){
    document.getElementById(id).addEventListener('click',event => {
      const item = event.target.closest('[data-collocation]');
      if(item) focusCollocationRecord(item.dataset.collocation);
    });
  }
  chart.on('click',event => {
    const id = event.data.structureId || event.data.collocationId;
    if(id) showCollocationRecord(id);
  });
  renderCollocationList();
};

function fullOccurrenceStatus(status){
  return ({UNREVIEWED_CANDIDATE_OCCURRENCE:'自动提取记录',REVIEWED_EXACT:'已有原形式核对记录',REVIEWED_KEEP:'已有保留记录',REVIEWED_EXIT:'已退出（归档）',REVIEWED_NEEDS_CORRECTION:'需修正（归档）',NEEDS_RECHECK_AFTER_BOUNDARY_R2:'词边界修订后待核对（归档）'})[status] || '待核对';
}
function fullCollocationMetadataHtml(record){
  const states = {};
  record.occurrences.forEach(e=>{const label=fullOccurrenceStatus(e[3]);states[label]=(states[label]||0)+1;});
  return '<div class="kv"><b>核心词项</b><div>'+escapeHtml(record.first)+' → '+escapeHtml(record.second)+'</div></div>'
    + '<div class="kv"><b>统计批次</b> 原冻结v10搭配统计</div>'
    + '<div class="kv"><b>原组合频次</b> '+record.frequency+'　<b>MI</b> '+record.mi+'<br><b>教材覆盖</b> '+record.textbookCoverage+'部　<b>课文覆盖</b> '+record.lessonCoverage+'篇<br><b>关联实例</b> '+record.evidenceCount+'处</div>'
    + '<div class="kv"><b>实例记录</b><div>'+Object.entries(states).map(([s,n])=>escapeHtml(s)+' '+n+'处').join('<br>')+'</div></div>'
    + (record.affectedOccurrenceCount?'<p class="note">部分实例涉及词边界修订，原频次、MI及词位保留原统计批次；修订后待核对的实例单独标示。</p>':'')
    + (!record.graphEnabled?'<p class="note">本组保留原记录供回查，当前不绘制搭配连线。</p>':'')
    + (record.compiledExamples.length?'<div class="kv"><b>已有展示例证</b>'+record.compiledExamples.map(r=>'<div class="sent">'+escapeHtml(collocationStatusLabel(r.status))+'：'+escapeHtml(r.evidence[0].sentence)+'<br><small>'+escapeHtml(r.evidence[0].source)+'</small></div>').join('')+'</div>':'');
}
function fullCollocationEdge(record){
  const color=COLLO_TYPE_COLOR[record.type];
  return {source:'w:'+record.first,target:'w:'+record.second,collocationId:record.id,
    edgeLabel:record.type,status:'搭配记录',symbol:['none','arrow'],symbolSize:[0,7],
    lineStyle:{color,width:Math.min(4,1+Math.log2(record.frequency+1)*.3),type:'dashed',curveness:.16},
    label:{show:!!state.focus || !!state.fullCollocationFocus || state.edgeLabel,formatter:record.type,fontSize:10,color}};
}
function fullCollocationGraph(record,width,height){
  const graph={nodes:[],edges:[]};
  for(const [i,word] of [...new Set([record.first,record.second])].entries()){
    const r=wordIndex.get(word);
    graph.nodes.push({id:'w:'+word,name:word,wordData:r,category:0,symbolSize:46,
      x:width*.35+i*180,y:height*.5+i*40,label:{show:true,fontSize:16,color:'#dbeafe'},itemStyle:{color:C.word}});
  }
  if(record.graphEnabled) graph.edges.push(fullCollocationEdge(record));
  return graph;
}
function addFullCollocationsToGraph(graph){
  const visible = new Set(graph.nodes.filter(n=>n.wordData).map(n=>n.name));
  const records = (state.focus ? (fullSixByWord.get(state.focus.word)||[]) : fullSixRecords)
    .filter(r=>r.graphEnabled && isCollocationVisible(r)).sort((a,b)=>b.frequency-a.frequency);
  const added=new Set();
  let count=0;
  for(const r of records){
    if(state.focus){
      if(count>=50) break;
      for(const word of [r.first,r.second]) if(!visible.has(word)){
        const row=wordIndex.get(word);if(!row) continue;
        graph.nodes.push({id:'w:'+word,name:word,category:0,wordData:row,symbolSize:Math.min(52,16+Math.log2(row[5]+1)*2),itemStyle:{color:C.word},label:{show:true,fontSize:12,color:'#dbeafe'}});
        visible.add(word);
      }
    }
    if(!visible.has(r.first)||!visible.has(r.second)) continue;
    if(graph.edges.some(e=>e.source==='w:'+r.first && e.target==='w:'+r.second && e.edgeLabel===r.type)) continue;
    if(!added.has(r.id)){graph.edges.push(fullCollocationEdge(r));added.add(r.id);count++;}
    if(!state.focus && count>=150) break;
  }
}
