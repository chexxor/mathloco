const ids=['v400','v600','v700','s400','s700','s500'];
document.fonts.load('400 100px PSVar').then(()=>document.fonts.load('700 100px PSVar'))
 .then(()=>document.fonts.load('400 100px PSStatic')).then(()=>document.fonts.load('700 100px PSStatic'))
 .then(()=>{ const out={};
  for(const id of ids){const el=document.getElementById(id);out[id]=Math.round(el.getBoundingClientRect().width);}
  fetch(window.__MEASURE_ENDPOINT,{method:'POST',mode:'no-cors',body:JSON.stringify({out,done:true})});});
