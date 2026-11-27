// 查词图显示优化：仅调整图面，不改动词频、关系或教材证据。
Object.assign(state,{focusPeerLimit:24,focusPeerEdges:false});
const buildBeforeReadableFocus=buildGraph;
function readableFocusEnabled(){return !!state.focus && !state.fullFormFocus && !state.structureFocus && !state.fullCollocationFocus;}
buildGraph=function(width,height){
 const graph=buildBeforeReadableFocus(width,height);
 if(!readableFocusEnabled())return graph;
 const centerId='w:'+state.focus.word;
 const score=new Map(),direct=new Set();
 for(const edge of graph.edges){
  if(edge.source!==centerId && edge.target!==centerId)continue;
  const other=edge.source===centerId?edge.target:edge.source;direct.add(other);
  const type=edge.edgeLabel||'';
  const priority=edge.fullFormGroup?10000:/近义|反义/.test(type)?5000:edge.collocationId?3000:/共现/.test(type)?1000:2000;
  score.set(other,Math.max(score.get(other)||0,priority)+(edge.frequency||0));
 }
 const ranked=graph.nodes.filter(n=>n.id!==centerId).sort((a,b)=>(score.get(b.id)||0)-(score.get(a.id)||0)||((b.wordData||[])[5]||0)-((a.wordData||[])[5]||0));
 const words=ranked.filter(n=>n.wordData),other=ranked.filter(n=>!n.wordData);
 const limit=state.focusPeerLimit;
 const selected=[...other.slice(0,limit?8:undefined),...words.slice(0,limit||undefined)];
 const keep=new Set([centerId,...selected.map(n=>n.id)]);
 graph.nodes=graph.nodes.filter(n=>keep.has(n.id));
 graph.edges=graph.edges.filter(e=>keep.has(e.source)&&keep.has(e.target)&&(state.focusPeerEdges||e.source===centerId||e.target===centerId));
 // 去掉已失去连接的节点；完整记录仍可从左侧清单查询。
 const linked=new Set(graph.edges.flatMap(e=>[e.source,e.target]));
 graph.nodes=graph.nodes.filter(n=>n.id===centerId||linked.has(n.id));
 const peers=graph.nodes.filter(n=>n.id!==centerId).sort((a,b)=>(score.get(b.id)||0)-(score.get(a.id)||0));
 const cx=width/2,cy=height/2;
 let offset=0,ring=0;
 while(offset<peers.length){
  const capacity=ring===0?10:16+8*(ring-1),batch=peers.slice(offset,offset+capacity),radius=145+ring*105;
  batch.forEach((node,i)=>{const angle=-Math.PI/2+(i+.5*(ring%2))*2*Math.PI/batch.length;
   node.x=cx+radius*Math.cos(angle);node.y=cy+radius*Math.sin(angle);node.fixed=true;
   node.symbolSize=node.wordData?Math.min(38,16+Math.log2(node.wordData[5]+1)*1.5):[80,32];
   node.label={show:true,position:Math.cos(angle)<-.15?'left':'right',distance:6,rotate:0,fontSize:12,color:node.wordData?'#dbeafe':'#e9d5ff',fontWeight:'normal'};
   node.itemStyle={...node.itemStyle,shadowBlur:0};
  });offset+=batch.length;ring++;
 }
 const center=graph.nodes.find(n=>n.id===centerId);
 if(center){center.x=cx;center.y=cy;center.fixed=true;center.symbolSize=64;center.label={show:true,position:'bottom',distance:10,rotate:0,fontSize:18,color:'#fde68a',fontWeight:'bold'};}
 for(const edge of graph.edges){
  edge.lineStyle={...edge.lineStyle,width:Math.min(2,edge.lineStyle?.width||1),opacity:(edge.source===centerId||edge.target===centerId)? .55 : .2,curveness:.04};
  edge.label={...edge.label,show:state.edgeLabel,formatter:edge.edgeLabel||'',fontSize:10};
  edge.emphasis={lineStyle:{opacity:1,width:3},label:{show:true,formatter:edge.edgeLabel||'',fontSize:12}};
 }
 const summary=document.getElementById('focusDisplaySummary');
 if(summary)summary.textContent='当前展开 '+peers.length+' 个关联节点；可调显示数量，完整记录见左侧清单。';
 return graph;
};
const renderBeforeReadableFocus=render;
render=function(){
 renderBeforeReadableFocus();
 const panel=document.getElementById('focusDisplayControls');if(panel)panel.style.display=readableFocusEnabled()?'flex':'none';
 if(readableFocusEnabled()){const graph=buildGraph(chart.getWidth(),chart.getHeight());chart.setOption({animation:false,series:[{id:'vocabGraph',type:'graph',animation:false,layout:'none',force:null,circular:null,data:graph.nodes,links:graph.edges,left:50,right:null,top:50,bottom:null,width:Math.max(200,Math.min(chart.getWidth()-(chart.getWidth()>850?540:100),chart.getHeight()-180)),height:Math.max(200,Math.min(chart.getWidth()-(chart.getWidth()>850?540:100),chart.getHeight()-180)),labelLayout:{hideOverlap:true},emphasis:{focus:'adjacency',blurScope:'coordinateSystem',label:{show:true},lineStyle:{opacity:1}}}]});}
};
const initBeforeReadableFocus=init;
init=function(){
 initBeforeReadableFocus();
 document.getElementById('focusPeerLimit').addEventListener('change',e=>{state.focusPeerLimit=Number(e.target.value);render();});
 document.getElementById('focusPeerEdges').addEventListener('change',e=>{state.focusPeerEdges=e.target.checked;render();});
};
