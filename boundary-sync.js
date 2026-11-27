/* 教材逐词证据随边界修订同步，原句与来源保持原样。 */
const beforeR2Detail = showDetail;
showDetail = function(w, ...args){
  beforeR2Detail(w, ...args);
  const body = document.getElementById('detailBody');
  const examples = DATA.wordExamples[w] || [];
  if(!body || !examples.length) return;
  const block = document.createElement('div'); block.className='kv';
  const render = e => `<div class="sent" style="margin:8px 0">${escapeHtml(e.sentence)}<br><small>${escapeHtml(e.source)} · 第${escapeHtml(e.line)}行</small></div>`;
  block.innerHTML = `<b>教材多例（${examples.length}条）</b>` + examples.slice(0,3).map(render).join('') +
    (examples.length>3 ? `<details><summary>查看其余${examples.length-3}条教材例句</summary>${examples.slice(3).map(render).join('')}</details>` : '');
  const flag=DATA.qualityFlags[w];
  if(flag){const note=document.createElement('div');note.className='note';note.textContent=flag.status+'：'+flag.note;block.prepend(note);}
  body.appendChild(block);
};
