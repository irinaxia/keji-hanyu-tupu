// 全量形式词群；字形共有记录不自动转为已确认语素关系。
const fullFormIndex = new Map(FULL_FORM_GROUPS.records.map(g=>[g.id,g]));
const fullFormWordIndex = new Map();
for(const group of FULL_FORM_GROUPS.records) for(const member of group.members){
  if(!fullFormWordIndex.has(member[0]))fullFormWordIndex.set(member[0],[]);
  fullFormWordIndex.get(member[0]).push(group);
}
let formKind='单字',formPage=0,formMemberPage=0;
const FORM_PAGE_SIZE=50,FORM_MEMBER_PAGE_SIZE=80;
function filteredFormGroups(){
 const query=document.getElementById('formSearch').value.trim();
 const position=document.getElementById('formPosition').value;
 return FULL_FORM_GROUPS.records.filter(g=>g.kind===formKind && (!query||g.form.includes(query)||g.members.some(m=>m[0].includes(query))) && (position==='全部'||g.members.some(m=>m[1].includes(position))))
  .sort((a,b)=>b.members.length-a.members.length||b.frequency-a.frequency||a.form.localeCompare(b.form,'zh'));
}
renderCandList=function(){
 const groups=filteredFormGroups(),pages=Math.max(1,Math.ceil(groups.length/FORM_PAGE_SIZE));formPage=Math.min(formPage,pages-1);
 document.getElementById('formSummary').textContent='全量 '+FULL_FORM_GROUPS.records.length+'组 · 单字2332组 · 双字1985组；当前检索'+groups.length+'组。';
 document.getElementById('candList').innerHTML=groups.slice(formPage*FORM_PAGE_SIZE,(formPage+1)*FORM_PAGE_SIZE).map(g=>'<button class="cand-item" style="width:100%;text-align:left" data-form-group="'+escapeHtml(g.id)+'"><b>◆ '+escapeHtml(g.form)+'</b><span class="n">'+g.members.length+'词形</span></button>').join('')||'<p class="note">当前范围无匹配词群。</p>';
 document.getElementById('candTabFront').classList.toggle('on',formKind==='单字');document.getElementById('candTabBack').classList.toggle('on',formKind==='双字');
 document.getElementById('formPageLabel').textContent=(formPage+1)+' / '+pages;
 document.getElementById('formPrev').disabled=formPage===0;document.getElementById('formNext').disabled=formPage+1>=pages;
};
function currentFormMembers(){
 const g=fullFormIndex.get(state.fullFormFocus);if(!g)return [];
 const pos=state.fullFormPosition||'全部';return g.members.filter(m=>pos==='全部'||m[1].includes(pos));
}
function showFullFormGroup(){
 const g=fullFormIndex.get(state.fullFormFocus);if(!g)return;
 const members=currentFormMembers(),pages=Math.max(1,Math.ceil(members.length/FORM_MEMBER_PAGE_SIZE));formMemberPage=Math.min(formMemberPage,pages-1);
 const displayed=members.slice(formMemberPage*FORM_MEMBER_PAGE_SIZE,(formMemberPage+1)*FORM_MEMBER_PAGE_SIZE);
 let html='<h2>'+escapeHtml(g.form)+'</h2><div class="tag">形式层 · 共享词形成分</div><div class="tag">'+g.kind+'成分</div>'
  +'<div class="kv"><b>成员词形</b> '+g.members.length+'个 · 当前位置筛选'+members.length+'个<br><b>成员词累计词次</b> '+g.frequency+'</div>'
  +'<p class="note">本组依据共同字形及其位置组织；同一语素及构词边界仍需结合词义核对。</p>'
  +'<div class="kv"><b>全部成员词</b>（点击词语查看教材原句）</div>';
 html+=displayed.map(m=>{const r=wordIndex.get(m[0]);return '<div class="relsec"><button class="relit" data-w="'+escapeHtml(m[0])+'">'+escapeHtml(m[0])+'</button><small> '+escapeHtml(m[1])+' · '+r[5]+'次 · 教材'+r[11]+'部 · 课文'+r[12]+'篇</small></div>';}).join('');
 html+='<div class="row"><button data-form-member-step="-1" '+(formMemberPage===0?'disabled':'')+'>上一页</button><span>'+(formMemberPage+1)+' / '+pages+'</span><button data-form-member-step="1" '+(formMemberPage+1>=pages?'disabled':'')+'>下一页</button></div>'
 +'<div class="kv"><b>词群编号</b><div>'+escapeHtml(g.id)+'</div></div>';
 document.getElementById('detailBody').innerHTML=html;document.getElementById('detail').classList.add('open');document.getElementById('detail').scrollTop=0;
}
function focusFullFormGroup(id){
 if(!fullFormIndex.has(id))return;clearInterval(flashTimer);hideSuggest();state.focus=null;state.structureFocus=null;state.fullCollocationFocus=null;state.collocationDetail=null;state.fullFormFocus=id;state.fullFormPosition=document.getElementById('formPosition').value;formMemberPage=0;
 document.getElementById('kwSearch').value='';document.getElementById('kwClear').style.display='block';render();showFullFormGroup();
}
bindCandPanel=function(){
 for(const [id,kind] of [['candTabFront','单字'],['candTabBack','双字']])document.getElementById(id).addEventListener('click',()=>{formKind=kind;formPage=0;renderCandList();});
 for(const id of ['formSearch','formPosition'])document.getElementById(id).addEventListener(id==='formSearch'?'input':'change',()=>{formPage=0;renderCandList();});
 document.getElementById('formPrev').addEventListener('click',()=>{formPage--;renderCandList();});document.getElementById('formNext').addEventListener('click',()=>{formPage++;renderCandList();});
 document.getElementById('candList').addEventListener('click',e=>{const b=e.target.closest('[data-form-group]');if(b)focusFullFormGroup(b.dataset.formGroup);});
 document.getElementById('detailBody').addEventListener('click',e=>{
  const step=e.target.closest('[data-form-member-step]');if(step){formMemberPage+=Number(step.dataset.formMemberStep);render();showFullFormGroup();return;}
  const group=e.target.closest('[data-form-group]');if(group)focusFullFormGroup(group.dataset.formGroup);
 });
};
const buildBeforeFullForms=buildGraph;
buildGraph=function(width,height){
 if(!state.fullFormFocus)return buildBeforeFullForms(width,height);
 const g=fullFormIndex.get(state.fullFormFocus),members=currentFormMembers().slice(formMemberPage*FORM_MEMBER_PAGE_SIZE,(formMemberPage+1)*FORM_MEMBER_PAGE_SIZE);
 const cx=Math.max(180,(width-(width>850?430:0))/2),cy=height/2;
 const nodes=[{id:'fullform:'+g.id,name:g.form,fullFormGroup:g.id,symbol:'roundRect',symbolSize:[Math.max(60,g.form.length*24),46],x:cx,y:cy,fixed:true,itemStyle:{color:'#a855f7'},label:{show:true,fontSize:17,color:'#fff'}}],edges=[];
 members.forEach((m,i)=>{const r=wordIndex.get(m[0]),angle=i*2*Math.PI/Math.max(1,members.length),radius=170+Math.floor(i/25)*70;
 nodes.push({id:'w:'+m[0],name:m[0],wordData:r,category:0,x:cx+radius*Math.cos(angle),y:cy+radius*Math.sin(angle),symbolSize:Math.min(45,15+Math.log2(r[5]+1)*2),label:{show:true,fontSize:12,color:'#dbeafe'},itemStyle:{color:C.word}});
 edges.push({source:'fullform:'+g.id,target:'w:'+m[0],edgeLabel:'共同成分 · '+m[1],fullFormGroup:g.id,lineStyle:{color:'#c084fc',width:1.5},label:{show:state.edgeLabel,formatter:m[1],fontSize:10,color:'#e9d5ff'}});
 });return {nodes,edges};
};
const focusWordBeforeFullForms=focusWord;
focusWord=function(...args){state.fullFormFocus=null;return focusWordBeforeFullForms(...args);};
const focusCollocationBeforeFullForms=focusCollocationRecord;
focusCollocationRecord=function(...args){state.fullFormFocus=null;return focusCollocationBeforeFullForms(...args);};
const clearBeforeFullForms=clearSearch;
clearSearch=function(){const had=!!state.fullFormFocus;state.fullFormFocus=null;clearBeforeFullForms();if(had)render();};
const detailBeforeFullForms=showDetail;
showDetail=function(word,...args){
 detailBeforeFullForms(word,...args);
 const groups=fullFormWordIndex.get(word)||[];if(!groups.length)return;
 const block=document.createElement('section');block.className='relblock';
 block.innerHTML='<h3>形式层 · 共享词形成分（'+groups.length+'组）</h3>'+groups.map(g=>'<button data-form-group="'+escapeHtml(g.id)+'" style="margin:3px">'+escapeHtml(g.form)+' · '+g.members.length+'词形</button>').join('');document.getElementById('detailBody').appendChild(block);
};
const statsBeforeFullForms=updateStats;
updateStats=function(n,e){statsBeforeFullForms(n,e);document.getElementById('stats').insertAdjacentHTML('beforeend','<span class="stat"><b>'+FULL_FORM_GROUPS.records.length+'</b>全量成分词群</span>');};
const initBeforeFullForms=init;
init=function(){initBeforeFullForms();chart.on('click',event=>{if(event.data.fullFormGroup){state.fullFormFocus=event.data.fullFormGroup;showFullFormGroup();}});};
const renderBeforeFullForms=render;
render=function(){
 renderBeforeFullForms();
 if(state.fullFormFocus)chart.setOption({series:[{id:'vocabGraph',layout:'none',left:35,right:chart.getWidth()>850?450:35,top:45,bottom:45}]});
};
