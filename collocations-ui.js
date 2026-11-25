// 九类搭配展示层。保留原二元记录；长结构另存，避免把格式压成两个词。
const COLLOCATION_TYPES = ['主谓','动宾','定中','状中','述补','量名','介动','框式介词','关联词'];
Object.assign(COLLO_TYPE_COLOR, {'介动':'#f472b6','框式介词':'#a78bfa','关联词':'#38bdf8'});
Object.assign(state, {collocationType:'全部', collocationStatus:'全部', structureFocus:null, collocationDetail:null});

const collocationRecords = DATA.collocations.map((c, i) => ({
  id:c[7] || 'legacy-collocation:'+i, type:c[0], first:c[1], second:c[2],
  status:c[6] || '优先展示候选', evidenceCount:c[3], legacy:true,
  evidence:[{sentence:c[4], source:c[5]}],
})).concat(COLLOCATION_STRUCTURES.records);
const collocationRecordIndex = new Map(collocationRecords.map(r => [r.id,r]));

function isCollocationVisible(record){
  const type = Array.isArray(record) ? record[0] : record.type;
  const status = Array.isArray(record) ? record[6] : record.status;
  const example = status === '已编制例证' || status === '已编制结构例证';
  return (state.collocationType === '全部' || state.collocationType === type)
    && (state.collocationStatus === '全部' || (state.collocationStatus === '例证' ? example : !example));
}

function collocationTitle(record){
  return record.template || record.first+' → '+record.second;
}

function renderCollocationList(){
  const list = document.getElementById('collocationList');
  const records = collocationRecords.filter(isCollocationVisible);
  document.getElementById('collocationSummary').textContent =
    '收录170条二元记录、17项结构条目。当前显示'+records.length+'项；结构编制例证保留待正式准入状态。';
  list.innerHTML = records.map(r => {
    const color = COLLO_TYPE_COLOR[r.type];
    return `<button class="path-item collocation-item" data-collocation="${escapeHtml(r.id)}" style="text-align:left;display:block;width:100%">`
      + `<span style="color:${color}">${escapeHtml(r.type)}</span>　<b>${escapeHtml(collocationTitle(r))}</b>`
      + `<small style="display:block;color:var(--dim)">${escapeHtml(r.status)}${r.publicationStatus==='NOT_YET_FINAL_GRAPH_FACT'?' · 待正式准入':''}</small></button>`;
  }).join('') || '<div class="path-empty">该筛选范围暂无展示记录。</div>';
}

function collocationEvidenceHtml(record){
  return record.evidence.map(ev => {
    let h = '<div class="sent">';
    if(ev.surface) h += `<b>完整形式：</b>${escapeHtml(ev.surface)}<br>`;
    h += `<b>教材原句：</b>${escapeHtml(ev.sentence || '')}`;
    if(ev.slots && Object.keys(ev.slots).length){
      h += '<br><b>原记录槽位：</b>'+Object.entries(ev.slots)
        .map(([key,value]) => escapeHtml(key)+' = '+escapeHtml(value)).join('；');
    }
    const source = ev.source || ev.textbook+' / '+ev.lesson;
    h += `<br><small>${escapeHtml(source)}</small>`;
    if(ev.sentenceId) h += `<br><small>句子编号：${escapeHtml(ev.sentenceId)}</small>`;
    if(ev.line) h += `<br><small>定位：第${escapeHtml(ev.line)}行 · 句序${escapeHtml(ev.sentenceNumber)}</small>`;
    if(ev.id) h += `<br><small>证据编号：${escapeHtml(ev.id)}</small>`;
    return h+'</div>';
  }).join('');
}

function showCollocationRecord(id){
  const record = collocationRecordIndex.get(id);
  if(!record) return;
  state.collocationDetail = id;
  const color = COLLO_TYPE_COLOR[record.type];
  let h = `<h2 style="font-size:19px">${escapeHtml(collocationTitle(record))}</h2>`
    + `<div style="margin-top:8px"><span class="tag" style="border-color:${color};color:${color}">${escapeHtml(record.type)}</span>`
    + `<span class="tag">${escapeHtml(record.status)}</span></div>`;
  if(record.publicationStatus === 'NOT_YET_FINAL_GRAPH_FACT'){
    h += '<p class="note" style="margin-top:8px">已有研究者编制记录；正式图谱准入尚待确认。以下保留原有结构、槽位及教材证据。</p>';
  }
  if(record.status === '优先展示候选'){
    h += '<p class="note" style="margin-top:8px">自动候选，尚不能据此认定搭配正确。</p>';
  }
  if(record.legacy){
    h += `<div class="kv"><b>核心词项</b><div>${escapeHtml(record.first)} → ${escapeHtml(record.second)}</div></div>`;
  }else{
    h += `<div class="kv"><b>固定成分</b><div>${record.anchors.map(w => `<button class="relit" data-w="${escapeHtml(w)}">${escapeHtml(w)}</button>`).join('　')}</div></div>`
      + `<div class="kv"><b>已附证据</b> ${record.evidence.length}条教材实例</div>`;
  }
  h += `<div class="kv"><b>教材用例及来源</b>${collocationEvidenceHtml(record)}</div>`
    + `<div class="kv"><b>条目编号</b><div style="overflow-wrap:anywhere">${escapeHtml(record.id)}</div></div>`;
  if(record.recordStatus){
    h += `<details class="kv"><summary>原记录状态</summary><div>编制状态：${escapeHtml(record.recordStatus)}<br>发布状态：${escapeHtml(record.publicationStatus)}</div></details>`;
  }
  document.getElementById('detailBody').innerHTML = h;
  document.getElementById('detail').classList.add('open');
}

function focusCollocationRecord(id){
  const record = collocationRecordIndex.get(id);
  if(!record) return;
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
  return graph;
};

const showDetailBeforeNineTypes = showDetail;
showDetail = function(word,withRel){
  state.collocationDetail = null;
  showDetailBeforeNineTypes(word,withRel);
  const records = COLLOCATION_STRUCTURES.records.filter(r => isCollocationVisible(r) && r.anchors.includes(word));
  if(!records.length) return;
  const block = document.createElement('section');
  block.className = 'relblock';
  block.innerHTML = '<h3>相关搭配结构</h3>'+records.map(r =>
    `<div class="relsec"><span class="relsec-tag" style="color:${COLLO_TYPE_COLOR[r.type]}">${escapeHtml(r.type)}</span>`
    + `<button data-collocation="${escapeHtml(r.id)}">${escapeHtml(r.template)}</button>`
    + '<small>　已编制结构例证 · 待正式准入</small></div>'
  ).join('');
  document.getElementById('detailBody').appendChild(block);
};

const focusWordBeforeNineTypes = focusWord;
focusWord = function(word){
  state.structureFocus = null;
  state.collocationDetail = null;
  return focusWordBeforeNineTypes(word);
};
const flashBeforeNineTypes = flashAndCenter;
flashAndCenter = function(word){
  if(state.structureFocus || state.collocationDetail) return;
  return flashBeforeNineTypes(word);
};
const clearSearchBeforeNineTypes = clearSearch;
clearSearch = function(){
  const hadStructure = !!state.structureFocus;
  state.structureFocus = null;
  state.collocationDetail = null;
  clearSearchBeforeNineTypes();
  if(hadStructure) render();
};
const statsBeforeNineTypes = updateStats;
updateStats = function(n,e){
  statsBeforeNineTypes(n,e);
  document.getElementById('stats').insertAdjacentHTML('beforeend',
    '<span class="stat"><b>9</b>搭配类型 · <b>17</b>结构条目</span>');
};

const initBeforeNineTypes = init;
init = function(){
  const selector = document.getElementById('collocationType');
  selector.innerHTML = '<option value="全部">全部九类搭配</option>'+COLLOCATION_TYPES.map(type => {
    const count = collocationRecords.filter(r => r.type===type).length;
    return `<option value="${type}">${type}（${count}项展示记录）</option>`;
  }).join('');
  initBeforeNineTypes();
  const change = () => {
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
