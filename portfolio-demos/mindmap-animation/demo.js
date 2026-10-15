'use strict';

(() => {
  // Presentation-only adaptation of the real product components listed in source-manifest.json.
  // Every visual is HTML/SVG. The sample never calls the product backend or downloads a file.
  const DURATION = 48;
  const PLAYBACK_RATE = 1.1;
  const PLAYBACK_DURATION = Math.round(DURATION / PLAYBACK_RATE * 10) / 10;
  const SAMPLE = '产品经理的工作系统\n\n产品经理承担结果责任，却往往缺少相应的正式职权。\n会议和消息不断打断专注，需要建立自己的工作方法。\n用异步沟通替代不必要的会议，当场完成关键行动项。\n保护专注时间，沉淀可复用流程，让经验持续积累。';
  const chapters = [
    [0, '把文章粘贴进来，从一段文字开始。'],
    [7.5, '点击开始生成，内容逐步长成清晰的结构。'],
    [15, '双击一个节点，把它改成自己的表达。'],
    [21, '选中主题，按 Tab 补充一个新的想法。'],
    [26.5, '拖动节点，放到更合适的分支里。'],
    [34, '保存整理结果，再导出为 Markdown 文件。']
  ];
  const $ = id => document.getElementById(id);
  const viewport = document.querySelector('.demo-viewport');
  const svg = $('map');
  const timeline = $('timeline');
  timeline.max = String(PLAYBACK_DURATION);
  const toggle = $('toggle-play');
  const chapterButtons = [...document.querySelectorAll('[data-time]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const palette = ['#E08A4E', '#7C9A6D', '#6B8FA3'];
  const nodes = [
    {id:'root', text:'产品经理的\n工作系统', x:55, y:227, w:230, h:90, depth:0, at:7.6},
    {id:'challenge', text:'现实挑战', x:400, y:81, w:200, h:58, depth:1, branch:0, parent:'root', at:8.4},
    {id:'methods', text:'工作方法', x:400, y:236, w:200, h:58, depth:1, branch:1, parent:'root', at:9.7},
    {id:'accumulation', text:'长期积累', x:400, y:401, w:200, h:58, depth:1, branch:2, parent:'root', at:11},
    {id:'responsibility', text:'责任与权力错配', x:728, y:53, w:260, h:50, depth:2, branch:0, parent:'challenge', at:8.9},
    {id:'overload', text:'信息与会议过载', x:728, y:121, w:260, h:50, depth:2, branch:0, parent:'challenge', at:9.3},
    {id:'async', text:'异步沟通', x:728, y:206, w:260, h:50, depth:2, branch:1, parent:'methods', at:10.2},
    {id:'action', text:'当场完成行动项', x:728, y:274, w:260, h:50, depth:2, branch:1, parent:'methods', at:10.6},
    {id:'focus', text:'保护专注时间', x:728, y:370, w:260, h:50, depth:2, branch:2, parent:'accumulation', at:11.5},
    {id:'reuse', text:'沉淀可复用流程', x:728, y:438, w:260, h:50, depth:2, branch:2, parent:'accumulation', at:12},
    {id:'review', text:'每周复盘一次', x:728, y:506, w:260, h:50, depth:2, branch:2, parent:'accumulation', at:23.5}
  ];
  const byId = Object.fromEntries(nodes.map(n => [n.id,n]));
  let time = reducedMotion.matches ? 43 : 0;
  let paused = reducedMotion.matches;
  let externalPaused = false;
  let intersecting = true;
  let raf = 0;
  let previous = 0;
  let activeChapter = -1;
  let viewBox = [0,-16,1080,640];
  let geometry;
  const rememberedTargets = new Map();

  function el(tag, attributes = {}) {
    const result = document.createElementNS(ns,tag);
    Object.entries(attributes).forEach(([key,value]) => result.setAttribute(key,value));
    return result;
  }
  function text(node, value) { if (node.textContent !== value) node.textContent = value; }
  function show(node, visible) { node.hidden = !visible; }
  function clamp(n) { return Math.max(0,Math.min(1,n)); }
  function smooth(n) { n=clamp(n); return n*n*(3-2*n); }
  function mix(a,b,n) { return a+(b-a)*n; }
  function progress(t,a,b) { return smooth((t-a)/(b-a)); }
  function active(t,a,b) { return t>=a && t<b; }

  nodes.forEach(n => {
    n.group = el('g', {'class':'map-node', 'data-node':n.id});
    const radius = n.depth===0 ? 26 : n.depth===1 ? 18 : 12;
    n.group.append(el('rect',{width:n.w,height:n.h,rx:radius,fill:n.depth===0?'#C75537':n.depth===1?palette[n.branch]:'#FFFDF8',stroke:n.depth===2?'#F0E5D2':'transparent'}));
    n.label = el('text',{x:n.w/2,y:n.h/2,fill:n.depth<2?'#FFF9F2':'#5C4A38','font-size':n.depth===0?24:n.depth===1?19:16,'font-weight':n.depth===0?700:600});
    if(n.text.includes('\n')) {
      n.text.split('\n').forEach((line,i) => { const span=el('tspan',{x:n.w/2,dy:i?'1.4em':'-.65em'});span.textContent=line;n.label.append(span); });
    } else n.label.textContent=n.text;
    n.group.append(n.label);
    $('nodes').append(n.group);
    if(n.parent) { n.edge=el('path',{'class':'map-edge','data-edge':n.id});$('edges').append(n.edge); }
  });

  function measure() {
    const outer=viewport.getBoundingClientRect();
    const mapRect=svg.getBoundingClientRect();
    geometry={outer,mapRect,narrow:outer.width<500};
  }
  function mapPoint(x,y) {
    const {outer,mapRect}=geometry;
    const scale=Math.min(mapRect.width/viewBox[2],mapRect.height/viewBox[3]);
    return {x:mapRect.left-outer.left+(mapRect.width-viewBox[2]*scale)/2+(x-viewBox[0])*scale,
      y:mapRect.top-outer.top+(mapRect.height-viewBox[3]*scale)/2+(y-viewBox[1])*scale,scale};
  }
  function target(id,fx=.5,fy=.5) {
    const rect=$(id).getBoundingClientRect();
    if(rect.width && rect.height) {
      const point={x:rect.left-geometry.outer.left+rect.width*fx,y:rect.top-geometry.outer.top+rect.height*fy};
      rememberedTargets.set(id,point);
      return point;
    }
    return rememberedTargets.get(id)||{x:geometry.outer.width*.7,y:geometry.outer.height*.6};
  }
  function camera(t) {
    const whole=[0,-16,1080,640];
    const edit=geometry.narrow?[640,157,390,230]:[470,95,590,390];
    const add=geometry.narrow?[360,350,660,230]:[300,290,760,290];
    const drag=geometry.narrow?[350,190,690,360]:[280,150,780,410];
    const keys=[[0,whole],[15,whole],[16.2,edit],[20.5,edit],[21.7,add],[26,add],[27.2,drag],[32.2,drag],[34,whole],[48,whole]];
    for(let i=1;i<keys.length;i++) if(t<=keys[i][0]) {
      const a=keys[i-1],b=keys[i],p=progress(t,a[0],b[0]);
      return a[1].map((v,j)=>mix(v,b[1][j],p));
    }
    return whole;
  }

  function render(t) {
    if(!geometry)measure();
    const editor=t>=7.2;
    show($('input-scene'),!editor);
    show($('editor-scene'),editor);
    if(editor && !geometry.mapRect.width)measure();
    $('editor-scene').style.opacity=String(progress(t,7.2,7.7));
    const pasted=t>=2;
    text($('input-text'),pasted?SAMPLE:'');
    show($('input-placeholder'),!pasted);
    show($('input-caret'),active(t,1.3,5.2));
    $('sample-input').classList.toggle('pasted',active(t,2,3.1));
    $('generate-button').classList.toggle('demo-pressed',active(t,6.35,6.7));
    text($('generate-button'),t>=6.6?'生成中…':'开始生成');
    viewBox=camera(t);
    svg.setAttribute('viewBox',viewBox.map(v=>v.toFixed(2)).join(' '));
    const dragged=byId.focus;
    const dragProgress=progress(t,28.2,30.7);
    const reparented=t>=31;
    const positions=Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y}]));
    if(active(t,28.2,31)) {
      positions.focus={x:mix(dragged.x,570,dragProgress),y:mix(dragged.y,291,dragProgress)-Math.sin(dragProgress*Math.PI)*45};
    } else if(reparented) {
      const p=progress(t,31,31.65);
      positions.focus={x:mix(570,728,p),y:mix(291,342,p)};
    }
    const selected=active(t,16,20.8)?'async':active(t,22,26)?'accumulation':active(t,27.6,32.5)?'focus':null;
    let count=0;
    nodes.forEach(n=> {
      const alpha=progress(t,n.at,n.at+.48);
      if(alpha>0)count++;
      const pos=positions[n.id];
      n.group.style.opacity=String(alpha);
      n.group.setAttribute('transform',`translate(${pos.x.toFixed(2)} ${(pos.y+(1-alpha)*9).toFixed(2)})`);
      n.group.classList.toggle('selected',selected===n.id);
      n.group.classList.toggle('editing',n.id==='async'&&active(t,17.2,19.7));
      n.group.classList.toggle('new',n.id==='review'&&active(t,23.5,25.5));
      if(n.id==='async')text(n.label,t>=19.7?'用短视频替代会议':'异步沟通');
      if(n.edge) {
        const parent=byId[n.id==='focus'&&reparented?'methods':n.parent];
        const parentPos=positions[parent.id];
        const x1=parentPos.x+parent.w,y1=parentPos.y+parent.h/2,x2=pos.x,y2=pos.y+n.h/2;
        // Rounded orthogonal connectors follow the product's warm branch colors.
        const mid=x1+(x2-x1)*.46;
        const sign=y2>=y1?1:-1;
        const r=Math.min(12,Math.abs(y2-y1)/2,Math.abs(x2-x1)/4);
        const path=`M${x1} ${y1}H${mid-r}Q${mid} ${y1} ${mid} ${y1+sign*r}V${y2-sign*r}Q${mid} ${y2} ${mid+r} ${y2}H${x2}`;
        n.edge.setAttribute('d',path);
        n.edge.setAttribute('stroke',palette[n.id==='focus'&&reparented?1:n.branch]);
        n.edge.style.opacity=String(alpha*(active(t,28.2,31)&&n.id==='focus'?.25:.8));
        n.edge.style.strokeDasharray=String(1200);
        n.edge.style.strokeDashoffset=String((1-alpha)*1200);
        if(n.id==='focus')n.group.dataset.parent=reparented?'methods':'accumulation';
      }
    });
    const typing=active(t,17.2,19.7);
    show($('edit-input'),typing);
    if(typing) {
      const p=mapPoint(728,206),size=mapPoint(988,256),label='用短视频替代会议';
      Object.assign($('edit-input').style,{left:`${p.x-geometry.mapRect.left+geometry.outer.left}px`,top:`${p.y-geometry.mapRect.top+geometry.outer.top}px`,width:`${size.x-p.x}px`,height:`${size.y-p.y}px`,fontSize:`${16*p.scale}px`});
      text($('edit-input'),label.slice(0,Math.floor(clamp((t-17.5)/1.4)*label.length)));
    }
    show($('keyboard-hint'),active(t,22.2,25.8));
    show($('drag-hint'),active(t,29.8,31.7));
    $('drop-target').style.opacity=active(t,29.8,31)?'1':'0';
    $('drop-target').setAttribute('transform','translate(395 232)');
    const dirty=active(t,19.7,35.5);
    $('save-state').classList.toggle('dirty',dirty);
    text($('save-label'),dirty?'未保存':active(t,35.5,36.1)?'保存中…':'已保存');
    $('save-button').classList.toggle('demo-pressed',active(t,35.1,35.5));
    show($('generation-banner'),active(t,7.2,13.3));
    text($('generation-label'),t<9.5?'正在梳理内容结构…':t<12.5?'逐步展开主题与细节…':'生成完成，可以继续编辑');
    text($('generation-count'),`${count} 个节点`);
    $('summary-panel').style.opacity=String(progress(t,12.6,14));
    show($('export-menu'),active(t,37.2,39.7));
    $('markdown-option').classList.toggle('chosen',t>=38.2);
    show($('export-result'),active(t,39.7,43.4));
    text($('zoom-label'),`${Math.round(1060/viewBox[2]*100)}%`);
    renderCursor(t,positions);
    const chapter=Math.max(0,chapters.findLastIndex(([at])=>t>=at));
    if(chapter!==activeChapter) {
      activeChapter=chapter;
      text($('step-description'),chapters[chapter][1]);
      viewport.setAttribute('aria-label',chapters[chapter][1]);
      chapterButtons.forEach((button,i)=>i===chapter?button.setAttribute('aria-current','step'):button.removeAttribute('aria-current'));
    }
    timeline.value=String(t/PLAYBACK_RATE);
    timeline.style.setProperty('--progress',`${t/DURATION*100}%`);
    timeline.setAttribute('aria-valuetext',`${Math.floor(t/PLAYBACK_RATE)} 秒，共 ${PLAYBACK_DURATION} 秒`);
    document.body.dataset.step=String(chapter+1);
    document.body.dataset.time=t.toFixed(1);
  }

  function renderCursor(t,positions) {
    const mapTarget=(id,fx=.5,fy=.5)=>{ const n=byId[id],p=positions[id];return mapPoint(p.x+n.w*fx,p.y+n.h*fy); };
    const keys=[
      [0,()=>({x:geometry.outer.width*.8,y:geometry.outer.height*.75})],
      [1.4,()=>target('sample-input',.28,.25)],[3.5,()=>target('sample-input',.6,.4)],
      [5.8,()=>target('generate-button')],[7.2,()=>target('generate-button')],
      [8,()=>mapTarget('root')],[14.8,()=>mapTarget('async')],
      [16.2,()=>mapTarget('async')],[20.3,()=>mapTarget('async',1,1)],
      [22.1,()=>mapTarget('accumulation')],[25.7,()=>mapTarget('accumulation')],
      [27.6,()=>mapTarget('focus')],[28.2,()=>mapTarget('focus')],
      [31,()=>mapTarget('focus')],[32.3,()=>mapTarget('focus')],
      [34.8,()=>target('save-button')],[35.8,()=>target('save-button')],
      [36.9,()=>target('export-button')],[37.6,()=>target('export-button')],
      [38.6,()=>target('markdown-option')],[40.2,()=>target('markdown-option')],
      [42,()=>({x:geometry.outer.width*.65,y:geometry.outer.height*.82})],[48,()=>({x:geometry.outer.width*.65,y:geometry.outer.height*.82})]
    ];
    let point=keys[0][1]();
    for(let i=1;i<keys.length;i++) if(t<=keys[i][0]) {
      const a=keys[i-1],b=keys[i],p=progress(t,a[0],b[0]),from=a[1](),to=b[1]();
      point={x:mix(from.x,to.x,p),y:mix(from.y,to.y,p)};
      break;
    }
    // During the held drag, the pointer remains attached to the moving node.
    if(active(t,28.2,31)) point=mapTarget('focus');
    const clicks=[2,6.4,16.2,16.45,22.1,27.7,31,35.2,37,39.4];
    const click=clicks.find(at=>active(t,at,at+.38));
    const p=click===undefined?1:clamp((t-click)/.38);
    const cursor=$('demo-cursor');
    Object.assign(cursor.style,{left:`${Math.max(2,Math.min(geometry.outer.width-24,point.x))}px`,top:`${Math.max(2,Math.min(geometry.outer.height-29,point.y))}px`,opacity:t>44?'0':String(progress(t,0,.5)),transform:`scale(${click===undefined?1:1-.12*Math.sin(p*Math.PI)})`});
    Object.assign(cursor.querySelector('i').style,{opacity:click===undefined?'0':String((1-p)*.7),transform:`scale(${.5+p})`});
  }

  function canPlay() { return !paused&&!externalPaused&&!document.hidden&&intersecting; }
  function updateButton() {
    toggle.setAttribute('aria-label',paused?'播放演示':'暂停演示');
    toggle.title=paused?'播放演示':'暂停演示';
    text(toggle,paused?'▷':'Ⅱ');
  }
  function tick(now) {
    raf=0;
    if(!canPlay()) { previous=0;return; }
    if(previous)time=(time+Math.min((now-previous)/1000,.1)*PLAYBACK_RATE)%DURATION;
    previous=now;
    render(time);
    raf=requestAnimationFrame(tick);
  }
  function syncPlayback() {
    if(raf)cancelAnimationFrame(raf);
    raf=0;previous=0;updateButton();
    if(canPlay())raf=requestAnimationFrame(tick);
  }
  toggle.addEventListener('click',()=>{paused=!paused;syncPlayback();});
  $('replay').addEventListener('click',()=>{time=0;paused=false;render(time);syncPlayback();});
  chapterButtons.forEach(button=>button.addEventListener('click',()=>{
    time=Number(button.dataset.time);render(time);previous=0;
  }));
  timeline.addEventListener('input',()=>{time=Number(timeline.value)*PLAYBACK_RATE;paused=true;render(time);syncPlayback();});
  document.addEventListener('visibilitychange',syncPlayback);
  const observer=new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting;syncPlayback();},{threshold:.05});
  observer.observe(document.querySelector('.demo-player'));
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='mindmap-demo')return;
    if(event.data.action==='pause')externalPaused=true;
    else if(event.data.action==='play')externalPaused=false;
    else if(event.data.action==='restart'){time=0;paused=false;externalPaused=false;render(time);}
    else return;
    syncPlayback();
  });
  reducedMotion.addEventListener('change',event=>{if(event.matches){paused=true;render(time);}syncPlayback();});
  new ResizeObserver(()=>{measure();render(time);}).observe(viewport);
  window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);observer.disconnect();});
  measure();render(time);syncPlayback();
})();
