// 只在绘制时替换颜色，保留节点、关系、位置及交互字段。
const LIGHT_RELATION_COLORS={'主谓':'#4f876f','动宾':'#b37b4c','定中':'#5b7fa9','状中':'#9b8750','述补':'#438982','量名':'#ac6875','介动':'#a46c91','框式介词':'#8974a7','关联词':'#4b899e'};
Object.assign(C,{word:'#86a6ca',fam:'#b09bc9',theme:'#82b5bd',famEdge:'#a18aba',themeEdge:'#86aeb8',coEdge:'#a5b4c3'});
Object.assign(COLLO_TYPE_COLOR,LIGHT_RELATION_COLORS);
function lightRelationColor(edge){
 const type=edge.edgeLabel||'';
 if(edge.fullFormGroup||/同素|共同成分/.test(type))return '#8b73a8';
 if(/反义/.test(type))return '#b56875';
 if(/近义/.test(type))return '#56857a';
 if(/共现/.test(type))return '#9aaabc';
 for(const key of Object.keys(LIGHT_RELATION_COLORS))if(type===key||type.startsWith(key+'搭配'))return LIGHT_RELATION_COLORS[key];
 return '#9aaabc';
}
// 等级颜色仅用于显示，保留原有词形的全部等级记录。
const WORD_LEVEL_PALETTE=[
 ['一级','#3b82c4'],['二级','#168a87'],['三级','#66a64c'],['四级','#c99a2e'],
 ['五级','#d8793f'],['六级','#c9617f'],['七-九级','#8162bd'],['多等级','#5e7398'],['未匹配／未标注','#9aa5b4']
];
function wordLevelDisplay(row){
 const raw=String(row?.[4]||'').replace(/^等级标准[：:]/,'').trim();
 if(!raw||/未匹配|未标注/.test(raw))return {key:'未匹配／未标注',label:raw||'未标注'};
 const levels=WORD_LEVEL_PALETTE.slice(0,7).filter(([name])=>raw.includes(name)).map(([name])=>name);
 return {key:levels.length>1?'多等级':levels[0]||'未匹配／未标注',label:raw};
}
function wordLevelColor(row){const key=wordLevelDisplay(row).key;return WORD_LEVEL_PALETTE.find(([name])=>name===key)[1];}
function wordLevelLegendHTML(){return '<span class="level-legend-title">词汇等级</span>'+WORD_LEVEL_PALETTE.map(([name,color])=>'<span class="level-legend-item"><i style="background:'+color+'"></i>'+name+'</span>').join('');}
document.getElementById('wordLevelLegend').innerHTML=wordLevelLegendHTML();

const renderBeforeLightTheme=render;
render=function(){
 renderBeforeLightTheme();
 const series=chart.getOption().series?.[0];if(!series)return;
 const data=series.data.map(node=>{
  const target=!!state.focus&&node.name===state.focus.word;
  const word=!!node.wordData;
  const color=word?wordLevelColor(node.wordData):node.themeName?'#8bb7bd':'#b3a1cb';
  return {...node,itemStyle:{...node.itemStyle,color,borderColor:target?'#997329':word?'#ffffff':'#9781b1',borderWidth:target?3:1.5,shadowBlur:0,shadowColor:'transparent'},
   label:{...node.label,color:target?'#153957':word?'#1e293b':'#513965',backgroundColor:node.label?.backgroundColor?'#f5f7fa':undefined},
   emphasis:{...node.emphasis,itemStyle:{color,borderColor:target?'#a9823e':'#54799b',shadowBlur:0},label:{...node.emphasis?.label,color:'#244765'}},blur:{...node.blur,itemStyle:{...node.blur?.itemStyle,shadowBlur:0}}};
 });
 const links=(series.links||series.edges||[]).map(edge=>{
  const color=lightRelationColor(edge);return {...edge,lineStyle:{...edge.lineStyle,color,opacity:Math.max(.72,edge.lineStyle?.opacity??.72)},label:{...edge.label,color:'#334155',opacity:1,backgroundColor:'#f5f7fa'},emphasis:{...edge.emphasis,lineStyle:{...edge.emphasis?.lineStyle,color},label:{...edge.emphasis?.label,color:'#1e293b',backgroundColor:'#f5f7fa'}}};
 });
 const baseTooltip=chart.getOption().tooltip?.[0]?.formatter;
 chart.setOption({tooltip:{formatter:p=>{const text=typeof baseTooltip==='function'?baseTooltip(p):escapeHtml(p.name||'');return p.dataType==='node'&&p.data.wordData?text+'<br>词汇等级：'+escapeHtml(wordLevelDisplay(p.data.wordData).label):text;},backgroundColor:'#ffffff',borderColor:'#cddbe7',textStyle:{color:'#304d68'}},series:[{id:series.id,data,links,label:{color:'#1e293b'},edgeLabel:{color:'#334155'},emphasis:{itemStyle:{shadowBlur:0},label:{color:'#244765'}}}]});
};
