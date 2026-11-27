// 全量形式词群；字形共有记录不自动转为已确认语素关系。
const fullFormIndex = new Map(FULL_FORM_GROUPS.records.map(g=>[g.id,g]));
const fullFormWordIndex = new Map();
for(const group of FULL_FORM_GROUPS.records) for(const member of group.members){
  if(!fullFormWordIndex.has(member[0]))fullFormWordIndex.set(member[0],[]);
  fullFormWordIndex.get(member[0]).push(group);
}
let formKind='单字',formPage=0,formMemberPage=0;
const FORM_PAGE_SIZE=50,FORM_MEMBER_PAGE_SIZE=80;
function formPositionLabel(pos){return ({词首:'前位同素',词尾:'后位同素',全部:'全部位置'})[pos]||'全部位置';}
function formMembersAt(group,pos){return group.members.filter(m=>pos==='全部'||m[1].includes(pos));}
function formMemberFrequency(members){return members.reduce((n,m)=>n+wordIndex.get(m[0])[5],0);}
function filteredFormGroups(){
 const query=document.getElementById('formSearch').value.trim();
 const position=document.getElementById('formPosition').value;
 return FULL_FORM_GROUPS.records.filter(g=>g.kind===formKind && (!query||g.form.includes(query)||formMembersAt(g,position).some(m=>m[0].includes(query))) && (position==='全部'||g.members.some(m=>m[1].includes(position))))
  .sort((a,b)=>formMembersAt(b,position).length-formMembersAt(a,position).length||formMemberFrequency(formMembersAt(b,position))-formMemberFrequency(formMembersAt(a,position))||a.form.localeCompare(b.form,'zh'));
}
renderCandList=function(){
 const groups=filteredFormGroups(),pages=Math.max(1,Math.ceil(groups.length/FORM_PAGE_SIZE));formPage=Math.min(formPage,pages-1);
 document.getElementById('formSummary').textContent='全量 '+FULL_FORM_GROUPS.records.length+'组成分目录；当前'+formKind+' · '+formPositionLabel(document.getElementById('formPosition').value)+'：'+groups.length+'组。';
 document.getElementById('candList').innerHTML=groups.slice(formPage*FORM_PAGE_SIZE,(formPage+1)*FORM_PAGE_SIZE).map(g=>'<button class="cand-item" style="width:100%;text-align:left" data-form-group="'+escapeHtml(g.id)+'"><b>◆ '+escapeHtml(g.form)+'</b><span class="n">'+formMembersAt(g,document.getElementById('formPosition').value).length+'词形</span></button>').join('')||'<p class="note">当前范围无匹配词群。</p>';
 document.getElementById('candTabFront').classList.toggle('on',formKind==='单字');document.getElementById('candTabBack').classList.toggle('on',formKind==='双字');
 document.getElementById('formPageLabel').textContent=(formPage+1)+' / '+pages;
 document.getElementById('formPrev').disabled=formPage===0;document.getElementById('formNext').disabled=formPage+1>=pages;
};
function currentFormMembers(){
 const g=fullFormIndex.get(state.fullFormFocus);if(!g)return [];
 const pos=state.fullFormPosition||'全部';return formMembersAt(g,pos);
}
function showFullFormGroup(){
 const g=fullFormIndex.get(state.fullFormFocus);if(!g)return;
 const members=currentFormMembers(),pages=Math.max(1,Math.ceil(members.length/FORM_MEMBER_PAGE_SIZE));formMemberPage=Math.min(formMemberPage,pages-1);
 const displayed=members.slice(formMemberPage*FORM_MEMBER_PAGE_SIZE,(formMemberPage+1)*FORM_MEMBER_PAGE_SIZE);
 let html='<h2>'+escapeHtml(g.form)+'</h2><div class="tag">形式层 · 同素词群</div><div class="tag">'+g.kind+'成分</div>'
  +'<div class="kv"><b>'+formPositionLabel(state.fullFormPosition)+'</b> · '+members.length+'个成员词<br><b>本位置成员累计词次</b> '+formMemberFrequency(members)+'<br><small>该字形成分全部位置合计'+g.members.length+'个词形</small></div>'
  +'<p class="note">本组依据共同字形及其位置组织；同一语素及构词边界仍需结合词义核对。</p>'
  +'<div class="kv"><b>'+formPositionLabel(state.fullFormPosition)+'成员词</b>（点击词语查看教材原句）</div>';
 html+=displayed.map(m=>{const r=wordIndex.get(m[0]);return '<div class="relsec"><button class="relit" data-w="'+escapeHtml(m[0])+'">'+escapeHtml(m[0])+'</button><small> '+escapeHtml(m[1])+' · '+r[5]+'次 · 教材'+r[11]+'部 · 课文'+r[12]+'篇</small></div>';}).join('');
 html+='<div class="row"><button data-form-member-step="-1" '+(formMemberPage===0?'disabled':'')+'>上一页</button><span>'+(formMemberPage+1)+' / '+pages+'</span><button data-form-member-step="1" '+(formMemberPage+1>=pages?'disabled':'')+'>下一页</button></div>'
 +'<div class="kv"><b>词群编号</b><div>'+escapeHtml(g.id)+'</div></div>';
 document.getElementById('detailBody').innerHTML=html;document.getElementById('detail').classList.add('open');document.getElementById('detail').scrollTop=0;
}
function focusFullFormGroup(id,position){
 if(position)document.getElementById('formPosition').value=position;
 if(!fullFormIndex.has(id))return;
 if(!formMembersAt(fullFormIndex.get(id),document.getElementById('formPosition').value).length){document.getElementById('formPosition').value='全部';renderCandList();}
 clearInterval(flashTimer);hideSuggest();state.focus=null;state.structureFocus=null;state.fullCollocationFocus=null;state.collocationDetail=null;state.fullFormFocus=id;state.fullFormPosition=document.getElementById('formPosition').value;formMemberPage=0;
 document.getElementById('kwSearch').value='';document.getElementById('kwClear').style.display='block';render();showFullFormGroup();
}
bindCandPanel=function(){
 for(const [id,kind] of [['candTabFront','单字'],['candTabBack','双字']])document.getElementById(id).addEventListener('click',()=>{formKind=kind;formPage=0;renderCandList();});
 for(const id of ['formSearch','formPosition'])document.getElementById(id).addEventListener(id==='formSearch'?'input':'change',()=>{formPage=0;renderCandList();if(id==='formPosition'&&state.fullFormFocus){state.fullFormPosition=document.getElementById(id).value;formMemberPage=0;render();showFullFormGroup();}});
 document.getElementById('formPrev').addEventListener('click',()=>{formPage--;renderCandList();});document.getElementById('formNext').addEventListener('click',()=>{formPage++;renderCandList();});
 document.getElementById('candList').addEventListener('click',e=>{const b=e.target.closest('[data-form-group]');if(b)focusFullFormGroup(b.dataset.formGroup);});
 document.getElementById('detailBody').addEventListener('click',e=>{
  const step=e.target.closest('[data-form-member-step]');if(step){formMemberPage+=Number(step.dataset.formMemberStep);render();showFullFormGroup();return;}
  const group=e.target.closest('[data-form-group]');if(group)focusFullFormGroup(group.dataset.formGroup,group.dataset.formPosition);
 });
};
const buildBeforeFullForms=buildGraph;
buildGraph=function(width,height){
 if(!state.fullFormFocus){
  const graph=buildBeforeFullForms(width,height);
  if(state.focus && state.lyFam){
   // 查词图改用全量词群索引，不再依赖旧展示词群子集。
   const oldIds=new Set(graph.nodes.filter(n=>n.familyIndex!==undefined).map(n=>n.id));
   graph.nodes=graph.nodes.filter(n=>!oldIds.has(n.id));graph.edges=graph.edges.filter(e=>!oldIds.has(e.source)&&!oldIds.has(e.target));
   const word=state.focus.word;
   for(const group of fullFormWordIndex.get(word)||[]){
    const member=group.members.find(m=>m[0]===word);
    for(const position of ['词首','词尾']){
     if(!member[1].includes(position))continue;
     const id='fullform:'+group.id+':'+position;
     graph.nodes.push({id,name:group.form+' · '+(position==='词首'?'前位':'后位'),fullFormGroup:group.id,fullFormPosition:position,
      symbol:'roundRect',symbolSize:[Math.max(78,group.form.length*16+55),34],category:1,
      itemStyle:{color:'#6b3c93',borderColor:'#c084fc',borderWidth:2},label:{show:true,fontSize:12,color:'#f3e8ff'}});
     graph.edges.push({source:id,target:'w:'+word,fullFormGroup:group.id,fullFormPosition:position,edgeLabel:formPositionLabel(position),
      lineStyle:{color:'#c084fc',width:2},label:{show:true,formatter:formPositionLabel(position),fontSize:10,color:'#e9d5ff'}});
    }
   }
  }
  return graph;
 }
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
 block.innerHTML='<h3>形式层 · 同素词群（'+groups.length+'组）</h3>'+groups.map(g=>{const member=g.members.find(m=>m[0]===word);return '<button data-form-group="'+escapeHtml(g.id)+'" data-form-position="'+(member[1].includes('词首')?'词首':member[1].includes('词尾')?'词尾':'全部')+'" style="margin:3px">'+escapeHtml(g.form)+' · '+escapeHtml(member[1])+'</button>';}).join('');document.getElementById('detailBody').appendChild(block);
};
const statsBeforeFullForms=updateStats;
updateStats=function(n,e){statsBeforeFullForms(n,e);document.getElementById('stats').insertAdjacentHTML('beforeend','<span class="stat"><b>'+FULL_FORM_GROUPS.records.length+'</b>全量成分词群</span>');};
const initBeforeFullForms=init;
init=function(){initBeforeFullForms();chart.on('click',event=>{if(event.data.fullFormGroup)focusFullFormGroup(event.data.fullFormGroup,event.data.fullFormPosition);});};
const renderBeforeFullForms=render;
render=function(){
 renderBeforeFullForms();
 if(state.fullFormFocus)chart.setOption({series:[{id:'vocabGraph',layout:'none',left:35,right:chart.getWidth()>850?450:35,top:45,bottom:45}]});
};
