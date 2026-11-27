// 词群按共同成分与位置组织；列表、成员和小图复用同一份全量资料。
const fullFormIndex = new Map(FULL_FORM_GROUPS.records.map(g=>[g.id,g]));
const fullFormWordIndex = new Map();
for(const group of FULL_FORM_GROUPS.records)for(const member of group.members){
 if(!fullFormWordIndex.has(member[0]))fullFormWordIndex.set(member[0],[]);
 fullFormWordIndex.get(member[0]).push(group);
}
let formKind='单字',formPage=0,formMemberPage=0,formMemberQuery='';
const FORM_PAGE_SIZE=12,FORM_MEMBER_PAGE_SIZE=12,FORM_PREVIEW_SIZE=8;
const expandedFormGroups=new Set(),formPreviewPages=new Map(),selectedFormWords=new Set();
function formPositionLabel(pos){return ({词首:'前位同素',词尾:'后位同素',全部:'前位与后位'})[pos]||'前位与后位';}
function formMembersAt(group,pos){return group.members.filter(m=>pos==='全部'?/词首|词尾/.test(m[1]):m[1].includes(pos));}
function formMemberFrequency(members){return members.reduce((n,m)=>n+(wordIndex.get(m[0])?.[5]||0),0);}
function sortedFormMembers(group,pos){return formMembersAt(group,pos).slice().sort((a,b)=>(wordIndex.get(b[0])?.[5]||0)-(wordIndex.get(a[0])?.[5]||0)||a[0].localeCompare(b[0],'zh'));}
function filteredFormGroups(){
 const query=document.getElementById('formSearch').value.trim(),position=document.getElementById('formPosition').value;
 return FULL_FORM_GROUPS.records.filter(g=>g.kind===formKind&&formMembersAt(g,position).length&&(!query||g.form.includes(query)||formMembersAt(g,position).some(m=>wordIndex.has(query)?m[0]===query:m[0].includes(query))))
 .sort((a,b)=>formMembersAt(b,position).length-formMembersAt(a,position).length||formMemberFrequency(formMembersAt(b,position))-formMemberFrequency(formMembersAt(a,position))||a.form.localeCompare(b.form,'zh'));
}
function formWordRow(m){
 const r=wordIndex.get(m[0]);
 return '<div class="form-word-row"><label><input type="checkbox" data-form-select="'+escapeHtml(m[0])+'" '+(selectedFormWords.has(m[0])?'checked':'')+' aria-label="选用'+escapeHtml(m[0])+'"></label><button data-form-card="'+escapeHtml(m[0])+'">'+escapeHtml(m[0])+'</button><span>'+escapeHtml(POS_CN[r[2]]||r[2]||'')+'</span><small>'+r[5]+'次</small></div>';
}
function formGroupBody(g){
 const pos=document.getElementById('formPosition').value,members=sortedFormMembers(g,pos),pages=Math.max(1,Math.ceil(members.length/FORM_PREVIEW_SIZE));
 const page=Math.min(formPreviewPages.get(g.id)||0,pages-1);formPreviewPages.set(g.id,page);
 return '<div class="form-members-preview">'+members.slice(page*FORM_PREVIEW_SIZE,(page+1)*FORM_PREVIEW_SIZE).map(formWordRow).join('')+'</div><div class="form-group-tools"><button data-form-preview-step="-1" data-form-id="'+escapeHtml(g.id)+'" '+(!page?'disabled':'')+' aria-label="上一页成员">上一页</button><small>'+(page+1)+' / '+pages+'</small><button data-form-preview-step="1" data-form-id="'+escapeHtml(g.id)+'" '+(page+1>=pages?'disabled':'')+' aria-label="下一页成员">下一页</button></div><div class="form-group-tools"><button data-form-group="'+escapeHtml(g.id)+'" data-form-position="'+pos+'">查看完整成员与小图</button></div>';
}
function renderFormSelection(){
 const n=selectedFormWords.size;document.getElementById('formSelectionCount').textContent='已选 '+n+' 词';document.getElementById('formAddSelection').disabled=!n;document.getElementById('formClearSelection').disabled=!n;
}
renderCandList=function(){
 const groups=filteredFormGroups(),pages=Math.max(1,Math.ceil(groups.length/FORM_PAGE_SIZE));formPage=Math.max(0,Math.min(formPage,pages-1));
 const pos=document.getElementById('formPosition').value;
 document.getElementById('formSummary').textContent=formKind+'成分 · '+formPositionLabel(pos)+' · '+groups.length+'组；点击词群展开成员。';
 document.getElementById('candList').innerHTML=groups.slice(formPage*FORM_PAGE_SIZE,(formPage+1)*FORM_PAGE_SIZE).map(g=>'<details class="form-group-card" data-form-catalog="'+escapeHtml(g.id)+'" '+(expandedFormGroups.has(g.id)?'open':'')+'><summary><span class="form-group-name">'+escapeHtml(g.form)+'</span><span class="form-position">'+formPositionLabel(pos)+'</span><small>'+formMembersAt(g,pos).length+'词</small></summary><div class="form-group-body">'+(expandedFormGroups.has(g.id)?formGroupBody(g):'')+'</div></details>').join('')||'<p class="note">当前范围无匹配词群。</p>';
 document.getElementById('candTabFront').classList.toggle('on',formKind==='单字');document.getElementById('candTabBack').classList.toggle('on',formKind==='双字');
 document.getElementById('formPageLabel').textContent=(formPage+1)+' / '+pages;document.getElementById('formPrev').disabled=formPage===0;document.getElementById('formNext').disabled=formPage+1>=pages;renderFormSelection();
};
function currentFormMembers(){const g=fullFormIndex.get(state.fullFormFocus);return g?sortedFormMembers(g,state.fullFormPosition||'全部').filter(m=>!formMemberQuery||m[0].includes(formMemberQuery)):[];}
function showFullFormGroup(){
 const g=fullFormIndex.get(state.fullFormFocus);if(!g)return;
 const members=currentFormMembers(),total=formMembersAt(g,state.fullFormPosition).length,pages=Math.max(1,Math.ceil(members.length/FORM_MEMBER_PAGE_SIZE));formMemberPage=Math.max(0,Math.min(formMemberPage,pages-1));
 const displayed=members.slice(formMemberPage*FORM_MEMBER_PAGE_SIZE,(formMemberPage+1)*FORM_MEMBER_PAGE_SIZE);
 let html='<h2>'+escapeHtml(g.form)+' <small>· '+formPositionLabel(state.fullFormPosition)+'</small></h2><div class="form-detail-meta">'+g.kind+'成分 · '+total+'个成员词 · 按全库词频排序</div><p class="note">本组依据共同字形及其位置组织；语素意义与构词边界结合教材语境辨别。</p><label for="formMemberSearch">检索组内词语</label><input id="formMemberSearch" value="'+escapeHtml(formMemberQuery)+'" placeholder="输入成员词" autocomplete="off"><p class="form-detail-meta">当前匹配'+members.length+'词；小图同步显示本页成员。</p>';
 html+='<div class="form-table-wrap"><table class="form-member-table"><thead><tr><th>选用</th><th>词语</th><th>词性</th><th>全库词频</th><th>教材数</th></tr></thead><tbody>'+displayed.map(m=>{const r=wordIndex.get(m[0]);return '<tr><td><input type="checkbox" data-form-select="'+escapeHtml(m[0])+'" '+(selectedFormWords.has(m[0])?'checked':'')+' aria-label="选用'+escapeHtml(m[0])+'"></td><td><button data-form-card="'+escapeHtml(m[0])+'">'+escapeHtml(m[0])+'</button></td><td>'+escapeHtml(POS_CN[r[2]]||r[2]||'')+'</td><td>'+r[5]+'</td><td>'+r[11]+'</td></tr>';}).join('')+'</tbody></table></div>';
 html+='<div class="form-group-tools"><button data-form-member-step="-1" '+(!formMemberPage?'disabled':'')+'>上一页</button><span>'+(formMemberPage+1)+' / '+pages+'</span><button data-form-member-step="1" '+(formMemberPage+1>=pages?'disabled':'')+'>下一页</button></div><div class="form-group-tools"><button data-form-add>所选词加入备课清单</button></div>';
 document.getElementById('detailBody').innerHTML=html;document.getElementById('detail').classList.add('open');
}
function focusFullFormGroup(id,position){
 if(!fullFormIndex.has(id))return;if(position)document.getElementById('formPosition').value=position;
 clearInterval(flashTimer);hideSuggest();state.focus=null;state.structureFocus=null;state.fullCollocationFocus=null;state.collocationDetail=null;state.fullFormFocus=id;state.fullFormPosition=document.getElementById('formPosition').value;formMemberPage=0;formMemberQuery='';
 document.getElementById('kwSearch').value='';document.getElementById('kwClear').style.display='block';render();showFullFormGroup();document.getElementById('detail').scrollTop=0;
}
function addSelectedFormWords(){if(selectedFormWords.size&&window.TeacherWorkbench)window.TeacherWorkbench.addWords([...selectedFormWords]);}
bindCandPanel=function(){
 for(const [id,kind] of [['candTabFront','单字'],['candTabBack','双字']])document.getElementById(id).addEventListener('click',()=>{formKind=kind;formPage=0;renderCandList();});
 for(const id of ['formSearch','formPosition'])document.getElementById(id).addEventListener(id==='formSearch'?'input':'change',()=>{formPage=0;renderCandList();if(id==='formPosition'&&state.fullFormFocus){state.fullFormPosition=document.getElementById(id).value;formMemberPage=0;render();showFullFormGroup();}});
 document.getElementById('formPrev').addEventListener('click',()=>{formPage--;renderCandList();});document.getElementById('formNext').addEventListener('click',()=>{formPage++;renderCandList();});
 document.getElementById('formAddSelection').addEventListener('click',addSelectedFormWords);document.getElementById('formClearSelection').addEventListener('click',()=>{selectedFormWords.clear();renderCandList();if(state.fullFormFocus)showFullFormGroup();});
 document.getElementById('candList').addEventListener('toggle',e=>{const d=e.target;if(!d.matches('[data-form-catalog]'))return;const id=d.dataset.formCatalog;if(d.open){expandedFormGroups.add(id);d.querySelector('.form-group-body').innerHTML=formGroupBody(fullFormIndex.get(id));}else expandedFormGroups.delete(id);},true);
 function click(e){
  const card=e.target.closest('[data-form-card]');if(card){window.TeacherWorkbench?.openCard(card.dataset.formCard);return;}
  const step=e.target.closest('[data-form-preview-step]');if(step){const id=step.dataset.formId;formPreviewPages.set(id,(formPreviewPages.get(id)||0)+Number(step.dataset.formPreviewStep));step.closest('.form-group-body').innerHTML=formGroupBody(fullFormIndex.get(id));return;}
  const page=e.target.closest('[data-form-member-step]');if(page){formMemberPage+=Number(page.dataset.formMemberStep);render();showFullFormGroup();return;}
  if(e.target.closest('[data-form-add]')){addSelectedFormWords();return;}
  const group=e.target.closest('[data-form-group]');if(group)focusFullFormGroup(group.dataset.formGroup,group.dataset.formPosition);
 }
 function select(e){const input=e.target.closest('[data-form-select]');if(!input)return;if(input.checked)selectedFormWords.add(input.dataset.formSelect);else selectedFormWords.delete(input.dataset.formSelect);document.querySelectorAll('[data-form-select]').forEach(el=>el.checked=selectedFormWords.has(el.dataset.formSelect));renderFormSelection();}
 for(const id of ['candList','detailBody']){document.getElementById(id).addEventListener('click',click);document.getElementById(id).addEventListener('change',select);}
 document.getElementById('detailBody').addEventListener('input',e=>{if(e.target.id!=='formMemberSearch')return;const caret=e.target.selectionStart;formMemberQuery=e.target.value.trim();formMemberPage=0;render();showFullFormGroup();const input=document.getElementById('formMemberSearch');input.focus();input.setSelectionRange(caret,caret);});
};
const buildBeforeFullForms=buildGraph;
buildGraph=function(width,height){
 if(!state.fullFormFocus){
  const graph=buildBeforeFullForms(width,height);
  if(state.focus){
   const oldIds=new Set(graph.nodes.filter(n=>n.familyIndex!==undefined).map(n=>n.id));graph.nodes=graph.nodes.filter(n=>!oldIds.has(n.id));graph.edges=graph.edges.filter(e=>!oldIds.has(e.source)&&!oldIds.has(e.target));
   if(state.lyFam&&state.lyCand)for(const group of fullFormWordIndex.get(state.focus.word)||[]){
    const member=group.members.find(m=>m[0]===state.focus.word);
    for(const position of ['词首','词尾'])if(member[1].includes(position)){
     const id='fullform:'+group.id+':'+position;
     graph.nodes.push({id,name:group.form+' · '+(position==='词首'?'前位':'后位'),fullFormGroup:group.id,fullFormPosition:position,symbol:'circle',symbolSize:14,category:1,itemStyle:{color:'#76558e'},label:{show:true,position:'right',fontSize:13,color:'#51356c'}});
     graph.edges.push({source:id,target:'w:'+state.focus.word,fullFormGroup:group.id,fullFormPosition:position,edgeLabel:formPositionLabel(position),lineStyle:{color:'#8b69a4',width:1.5},label:{show:true,formatter:formPositionLabel(position),fontSize:11,color:'#51356c'}});
    }
   }
  }return graph;
 }
 const g=fullFormIndex.get(state.fullFormFocus),members=currentFormMembers().slice(formMemberPage*FORM_MEMBER_PAGE_SIZE,(formMemberPage+1)*FORM_MEMBER_PAGE_SIZE);
 const cx=width/2,cy=height/2,nodes=[{id:'fullform:'+g.id,name:g.form+' · '+formPositionLabel(state.fullFormPosition),fullFormGroup:g.id,symbol:'circle',symbolSize:30,x:cx,y:cy,fixed:true,itemStyle:{color:'#76558e'},label:{show:true,position:'bottom',fontSize:15,color:'#51356c'}}],edges=[];
 members.forEach((m,i)=>{const r=wordIndex.get(m[0]),angle=-Math.PI/2+i*2*Math.PI/Math.max(1,members.length),radius=190;
 nodes.push({id:'w:'+m[0],name:m[0],wordData:r,category:0,x:cx+radius*Math.cos(angle),y:cy+radius*Math.sin(angle),symbolSize:24,fixed:true,label:{show:true,position:Math.cos(angle)<-.15?'left':'right',distance:8,fontSize:14,color:'#243b53'},itemStyle:{color:C.word}});
 edges.push({source:'fullform:'+g.id,target:'w:'+m[0],fullFormGroup:g.id,edgeLabel:formPositionLabel(state.fullFormPosition),lineStyle:{color:'#8b69a4',width:1.5},label:{show:false},emphasis:{label:{show:true,formatter:formPositionLabel(state.fullFormPosition)}}});
 });return {nodes,edges};
};
const focusWordBeforeFullForms=focusWord;
focusWord=function(word,...args){state.fullFormFocus=null;const result=focusWordBeforeFullForms(word,...args);document.getElementById('formSearch').value=word;document.getElementById('formPosition').value='全部';formPage=0;renderCandList();return result;};
const focusCollocationBeforeFullForms=focusCollocationRecord;
focusCollocationRecord=function(...args){state.fullFormFocus=null;return focusCollocationBeforeFullForms(...args);};
const clearBeforeFullForms=clearSearch;
clearSearch=function(){const had=!!state.fullFormFocus;state.fullFormFocus=null;document.getElementById('formSearch').value='';formPage=0;renderCandList();clearBeforeFullForms();if(had)render();};
const detailBeforeFullForms=showDetail;
showDetail=function(word,...args){
 detailBeforeFullForms(word,...args);const groups=fullFormWordIndex.get(word)||[];const entries=groups.flatMap(g=>{const member=g.members.find(m=>m[0]===word);return ['词首','词尾'].filter(pos=>member[1].includes(pos)).map(pos=>({g,pos}));});if(!entries.length)return;
 const block=document.createElement('section');block.className='relblock';block.innerHTML='<h3>同素词群</h3>'+entries.map(({g,pos})=>'<details class="form-group-card"><summary><span class="form-group-name">'+escapeHtml(g.form)+'</span><span class="form-position">'+formPositionLabel(pos)+'</span><small>'+formMembersAt(g,pos).length+'词</small></summary><div class="form-group-body">'+sortedFormMembers(g,pos).slice(0,FORM_PREVIEW_SIZE).map(formWordRow).join('')+'<button data-form-group="'+escapeHtml(g.id)+'" data-form-position="'+pos+'">查看完整成员与小图</button></div></details>').join('');document.getElementById('detailBody').appendChild(block);
};
const statsBeforeFullForms=updateStats;
updateStats=function(n,e){statsBeforeFullForms(n,e);document.getElementById('stats').insertAdjacentHTML('beforeend','<span class="stat"><b>'+FULL_FORM_GROUPS.records.length+'</b>全量成分词群</span>');};
const initBeforeFullForms=init;
init=function(){initBeforeFullForms();chart.on('click',event=>{if(event.dataType==='node'&&event.data.fullFormGroup)focusFullFormGroup(event.data.fullFormGroup,event.data.fullFormPosition);});};
const renderBeforeFullForms=render;
render=function(){renderBeforeFullForms();if(state.fullFormFocus)chart.setOption({series:[{id:'vocabGraph',layout:'none',left:90,right:chart.getWidth()>850?510:90,top:90,bottom:90,animation:false}]});};
