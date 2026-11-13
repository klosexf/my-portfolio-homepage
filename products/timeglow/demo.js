/* Offline HTML product demonstration. All numbers below are illustrative. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controllers = new Map();
  const labels = ['贴边书签', '点击展开', '到点提醒', '回顾用时'];
  const descriptions = [
    '书签贴在屏幕边缘，余光就能看到已用比例。',
    '点击书签，查看今日合计与应用、网站明细。',
    '用时到达节点，点击通知，打开给自己的提醒。',
    '切换周期，回顾全部用时与所选范围的用时。'
  ];
  function reminderMarkup(id) {
    return `<section class="personal-reminder" role="dialog" aria-modal="false" aria-labelledby="${id}-reminder-title"><div class="personal-header"><span><span class="reminder-logo"><img src="assets/timeglow.png?v=678111dea9" alt=""></span><span id="${id}-reminder-title">Timeglow / 给自己的提醒</span></span><button data-dismiss-reminder aria-label="关闭提醒">×</button></div><div class="personal-content"><p class="personal-context">14:30 · 75% 节点提醒</p><p class="personal-label">当前已用每日限额的</p><p class="personal-percent"><strong>75</strong><span>%</span></p><span class="personal-rule" aria-hidden="true"></span><p class="personal-message">先停下来思考5分钟，想一想，这是你想要过的生活吗？你还有更重要的事情值得你去做。如果现在心里不想做的话，先记住一句话：身体先行。</p><button class="personal-accept" data-dismiss-reminder>💪 我可以做到</button><button class="personal-dismiss" data-dismiss-reminder>我不听</button></div></section>`;
  }
  function tickMarkup(value) {
    return Array.from({length:16},(_,i)=>`<i class="${i < Math.ceil(value*16/100)?'on':''}"></i>`).join('');
  }
  function barsMarkup(weekly=true) {
    const h = weekly ? [55,76,63,87,70,46,39] : [18,32,82,67,35,58,26];
    return h.map((n,i)=>`<div><i style="--h:${n}%;--s:${[42,60,48,58,54,38,42][i]}%"></i></div>`).join('');
  }
  function mountDemo(el) {
    const isManual = el.hasAttribute('data-manual');
    el.innerHTML = `
      <div class="demo-canvas" data-step="0" role="group" aria-label="Timeglow 核心交互演示，使用示例数据">
       <div class="demo-desktop">
        <div class="landscape" aria-hidden="true"></div>
        <div class="desktop-menu" aria-hidden="true"><span><b></b><strong>备忘录</strong><span class="menu-extra">文件　编辑　显示</span></span><span>◒　⌁　▰　周五 14:30</span></div>
        <div class="desktop-note" aria-hidden="true"><div class="note-bar"><div class="traffic"><i></i><i></i><i></i></div></div><div class="note-content"><small>留一点时间，给自己</small><h3>今天想做的事</h3><div class="note-line complete"><i></i>把脑海里的想法写下来</div><div class="note-line"><i></i>完成正在做的作品</div><div class="note-line"><i></i>合上电脑，去散散步</div></div></div>
        <div class="demo-hint" aria-hidden="true">继续做你的事，时间在边上。</div>
        <button class="bookmark" aria-label="点击书签，展开使用概览" aria-expanded="false"><img src="assets/safe.webp" alt=""><span class="state-label">充足</span><span class="ticks" aria-hidden="true">${tickMarkup(63)}</span><span class="percent number">63%</span><small>已用</small></button>
        <div class="demo-cursor" aria-hidden="true"></div>
        <section class="overview" aria-label="今日使用概览" inert><div class="overview-top"><span>今天合计用时</span><span><i class="tiny-dot"></i>记录中</span></div><div class="quota"><strong class="number">1 时 15 分</strong><em>63%</em></div><div class="meter"><i></i></div><p class="remaining">每日限额 2 小时 · <b>剩余 45 分钟</b></p><div class="app-row"><img src="assets/chrome.png" alt=""><span>Google Chrome</span><small>48 分钟</small></div><div class="app-row website"><span>bilibili.com</span><small>30 分钟</small></div><div class="app-row"><img src="assets/wechat.png" alt=""><span>微信</span><small>27 分钟</small></div><div class="app-row"><img src="assets/figma.png" alt=""><span>Figma <em>未计入</em></span><small>1 时 20 分</small></div><div class="overview-bottom"><button data-open-stats>查看统计 ↗</button><span>所选范围内的时间只计算一次</span></div></section>
        <button class="notification" data-notification aria-label="点击 Timeglow 通知，打开给自己的提醒" inert><img src="assets/timeglow.png?v=678111dea9" alt=""><span class="notification-content"><span class="notification-top"><span>TIMEGLOW</span><span>现在</span></span><strong class="notification-title">用时接近限额，停一下？</strong><span class="notification-copy">今天已用 1 小时 30 分钟，剩余 30 分钟。</span><span class="notification-action">点击通知，读一读给自己的话 ↗</span></span></button>
        <div class="reminder-overlay" aria-hidden="true" inert>${reminderMarkup(el.id)}</div>
        ${window.TimeglowStatistics.markup()}
       </div>
      </div>
      <div class="demo-controls"><div class="demo-steps" role="group" aria-label="选择演示步骤">${labels.map((s,i)=>`<button data-go="${i}" class="${i===0?'active':''}" aria-pressed="${i===0}"><span class="step-number">0${i+1}</span>${s}</button>`).join('')}</div><div class="playback"><span>交互演示</span><button data-play aria-label="${reduced.matches||isManual?'播放动画':'暂停动画'}">${reduced.matches||isManual?'播放':'暂停'}</button><button data-replay aria-label="从头重播动画">↺ 重播</button></div><div class="demo-progress" aria-hidden="true"><i></i></div></div>
      <p class="demo-caption">示例数据 · 可以点击书签与步骤，亲自试一试</p>`;
    const canvas = el.querySelector('.demo-canvas');
    let step=0, playing=!reduced.matches&&!isManual, timer=null, reminderTimer=null, statisticsTimer=null, reminderOpen=false, visible=true;
    const desktop=el.querySelector('.demo-desktop');
    const laptop=el.hasAttribute('data-laptop-demo');
    function positionCursor() {
      const target=el.querySelector(step===2?'.notification':'.bookmark');
      canvas.style.setProperty('--cursor-x',`${target.offsetLeft+target.offsetWidth*.55-4}px`);
      canvas.style.setProperty('--cursor-y',`${target.offsetTop+target.offsetHeight*.5-3}px`);
    }
    function resizeDesktop() {
      if(laptop)desktop.style.transform=`scale(${canvas.clientWidth/1040})`;
      positionCursor();
    }
    new ResizeObserver(resizeDesktop).observe(canvas);
    resizeDesktop();
    function render(next) {
      step=Number(next); canvas.dataset.step=step;
      el.querySelector('.stats-body').scrollTop=0;
      reminderOpen=false; canvas.dataset.reminderOpen='false';
      el.querySelector('.reminder-overlay').inert=true;
      el.querySelector('.reminder-overlay').setAttribute('aria-hidden','true');
      el.querySelector('.overview').inert=step!==1;
      el.querySelector('.notification').inert=step!==2;
      el.querySelector('.stats-window').inert=step!==3;
      const bookmark=el.querySelector('.bookmark');
      bookmark.setAttribute('aria-expanded',String(step===1));
      bookmark.setAttribute('aria-label',step===1?'收起使用概览':'点击书签，展开使用概览');
      const warning=step===2;
      bookmark.querySelector('img').src=`assets/${warning?'warning':'safe'}.webp`;
      bookmark.querySelector('.state-label').textContent=warning?'留意':'充足';
      bookmark.querySelector('.percent').textContent=warning?'75%':'63%';
      bookmark.querySelector('.ticks').innerHTML=tickMarkup(warning?75:63);
      el.querySelectorAll('[data-go]').forEach(btn=>{
        const active=Number(btn.dataset.go)===step;
        btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
      });
      el.querySelector('.demo-progress i').style.transform=`translateX(${step*100}%)`;
      el.querySelector('.demo-caption').textContent=`示例数据 · ${descriptions[step]}`;
      positionCursor();
    }
    function openReminder(manual=true) {
      if(manual)setPlaying(false);
      if(step!==2)render(2);
      reminderOpen=true; canvas.dataset.reminderOpen='true';
      const overlay=el.querySelector('.reminder-overlay');
      overlay.inert=false;overlay.setAttribute('aria-hidden','false');
      el.querySelector('.notification').inert=true;
      el.querySelector('.demo-caption').textContent='示例数据 · 点击通知后，展开完整提醒；两个回应按钮都可收起弹框。';
      if(manual)el.querySelector('.personal-accept').focus({preventScroll:true});
    }
    function closeReminder() {
      setPlaying(false);render(0);
      el.querySelector('.demo-caption').textContent='示例数据 · 提醒已收起，记录继续。';
      el.querySelector('.bookmark').focus({preventScroll:true});
    }
    function schedule() {
      clearTimeout(timer);clearTimeout(reminderTimer);clearTimeout(statisticsTimer);
      if(playing&&visible&&!document.hidden){
        if(step===2&&!reminderOpen)reminderTimer=setTimeout(()=>openReminder(false),2400);
        if(step===3)statisticsTimer=setTimeout(()=>{const body=el.querySelector('.stats-body');body.scrollTo({top:body.scrollHeight-body.clientHeight,behavior:reduced.matches?'instant':'smooth'});},2800);
        timer=setTimeout(()=>{render((step+1)%4);schedule();},[1400,4600,10000,8500][step]);
      }
    }
    function setPlaying(value) {
      playing=value;
      const p=el.querySelector('[data-play]');p.textContent=playing?'暂停':'播放';p.setAttribute('aria-label',playing?'暂停动画':'播放动画');schedule();
    }
    el.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>{setPlaying(false);render(btn.dataset.go);}));
    el.querySelector('[data-notification]').addEventListener('click',()=>openReminder());
    el.querySelectorAll('[data-dismiss-reminder]').forEach(button=>button.addEventListener('click',closeReminder));
    el.addEventListener('keydown',event=>{if(event.key==='Escape'&&reminderOpen){event.preventDefault();closeReminder();}});
    bookmarkClick();
    function bookmarkClick(){el.querySelector('.bookmark').addEventListener('click',()=>{setPlaying(false);render(step===1?0:1);});}
    el.querySelector('[data-play]').addEventListener('click',()=>setPlaying(!playing));
    el.querySelector('[data-replay]').addEventListener('click',()=>{render(0);setPlaying(!reduced.matches);});
    el.querySelector('[data-open-stats]').addEventListener('click',()=>{setPlaying(false);render(3);});
    el.querySelector('[data-reminder]').addEventListener('click',()=>{setPlaying(false);render(2);});
    window.TimeglowStatistics.mount(el.querySelector('[data-statistics]'),()=>setPlaying(false));
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(el);
    document.addEventListener('visibilitychange',schedule);
    reduced.addEventListener('change',e=>{if(e.matches)setPlaying(false);});
    const controller={go(n){render(n);setPlaying(false);},pause(){setPlaying(false);}};
    controllers.set(el.id,controller);render(0);schedule();
  }
  document.querySelectorAll('[data-demo]').forEach(mountDemo);
  document.querySelectorAll('[data-reminder-feature]').forEach((el,index)=>{
    if(el.closest('[data-reminder-editor]')){window.TimeglowReminderWalkthrough.mount(el,index,reminderMarkup,reduced);return;}
    const id=`feature-reminder-${index}`;
    const phases=['notification','click','reminder','close'];
    const durations=[1800,1100,6500,1800];
    let phase=0,playing=!reduced.matches,visible=false,timer=null,closeTimer=null;
    el.innerHTML=`<button class="feature-notification" aria-controls="${id}-window" aria-expanded="false"><img src="assets/timeglow.png?v=678111dea9" alt=""><span><span class="feature-notification-top">TIMEGLOW <small>现在</small></span><strong>到了给自己的一点提醒时间</strong><span>今天的合计用时已达到每日限额的 75%。</span></span><b aria-hidden="true">↗</b></button><div class="feature-connector" aria-hidden="true"><span>自动演示 · 通知到提醒</span><span>↓</span></div><div class="feature-reminder-slot"><div class="feature-reminder-placeholder" aria-hidden="true"><strong>75<span>%</span></strong><span>到了你设定的提醒时刻</span></div>${reminderMarkup(id)}</div><span class="feature-demo-cursor" aria-hidden="true"></span><div class="feature-playback"><p class="feature-feedback">示例数据 · 通知出现</p><div><button data-feature-play aria-label="暂停自动演示">暂停</button><button data-feature-replay aria-label="从头重播通知与提醒演示">↺ 重播</button></div></div>`;
    const notification=el.querySelector('.feature-notification');
    const reminder=el.querySelector('.personal-reminder');
    const placeholder=el.querySelector('.feature-reminder-placeholder');
    const feedback=el.querySelector('.feature-feedback');
    const playButton=el.querySelector('[data-feature-play]');
    reminder.id=`${id}-window`;
    function clearTimers(){clearTimeout(timer);clearTimeout(closeTimer);}
    function setPopup(open){reminder.hidden=!open;placeholder.hidden=open;notification.setAttribute('aria-expanded',String(open));}
    function moveCursor(target){
      const base=el.getBoundingClientRect(),point=target.getBoundingClientRect();
      el.style.setProperty('--feature-cursor-x',`${Math.min(el.clientWidth-30,point.left-base.left+point.width*.6-5)}px`);
      el.style.setProperty('--feature-cursor-y',`${point.top-base.top+point.height*.5-5}px`);
    }
    function controls(){
      playButton.textContent=playing?'暂停':'播放';playButton.setAttribute('aria-label',playing?'暂停自动演示':'播放自动演示');
      el.querySelector('.feature-connector > span').textContent=playing?'自动演示 · 通知到提醒':'点击通知，展开完整提醒';
    }
    function renderPhase(next){
      phase=next;el.dataset.featurePhase=phases[phase];el.dataset.featureClosed='false';
      setPopup(phase>=2);
      feedback.textContent=['示例数据 · 提醒通知出现','示例数据 · 自动点开通知','示例数据 · 阅读给自己的完整提醒','示例数据 · 回应后，收起提醒'][phase];
      if(phase===1)moveCursor(notification);
      else if(phase===3)moveCursor(el.querySelector('.personal-accept'));
      else {el.style.setProperty('--feature-cursor-x',`${el.clientWidth*.65}px`);el.style.setProperty('--feature-cursor-y','210px');}
    }
    function schedule(){
      clearTimers();
      if(!playing||!visible||document.hidden)return;
      if(phase===3)closeTimer=setTimeout(()=>{setPopup(false);el.dataset.featureClosed='true';feedback.textContent='示例数据 · 提醒已收起，记录继续';},1100);
      timer=setTimeout(()=>{renderPhase((phase+1)%phases.length);schedule();},durations[phase]);
    }
    function setPlaying(value){playing=value;controls();schedule();}
    function show(){
      setPlaying(false);phase=2;el.dataset.featurePhase='manual';el.dataset.featureClosed='false';setPopup(true);
      feedback.textContent='已点开通知。读完后，可以选择下方任一回应。';
      el.querySelector('.personal-accept').focus({preventScroll:true});
    }
    function close(){
      setPlaying(false);phase=0;el.dataset.featurePhase='manual';setPopup(false);
      feedback.textContent='提醒已收起。点击通知，或播放自动演示。';notification.focus({preventScroll:true});
    }
    notification.addEventListener('click',show);
    el.querySelectorAll('[data-dismiss-reminder]').forEach(button=>button.addEventListener('click',close));
    el.addEventListener('keydown',event=>{if(event.key==='Escape'&&!reminder.hidden){event.preventDefault();close();}});
    playButton.addEventListener('click',()=>{if(!playing)renderPhase(phase);setPlaying(!playing);});
    el.querySelector('[data-feature-replay]').addEventListener('click',()=>{renderPhase(0);setPlaying(true);});
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(el);
    new ResizeObserver(()=>{if(phase===1)moveCursor(notification);if(phase===3&&!reminder.hidden)moveCursor(el.querySelector('.personal-accept'));}).observe(el);
    document.addEventListener('visibilitychange',schedule);
    reduced.addEventListener('change',event=>{if(event.matches){setPlaying(false);renderPhase(2);}});
    renderPhase(reduced.matches?2:0);controls();

  });
  document.querySelectorAll('[data-statistics-demo]').forEach(el=>{el.innerHTML=window.TimeglowStatistics.markup();window.TimeglowStatistics.mount(el.querySelector('[data-statistics]'));});
  document.querySelectorAll('[data-show-demo]').forEach(btn=>btn.addEventListener('click',()=>{
    const target=document.getElementById(btn.dataset.showDemo);
    target?.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});
    controllers.get(btn.dataset.showDemo)?.go(Number(btn.dataset.showStep ?? 1));
  }));
  document.querySelectorAll('[data-availability]').forEach(btn=>btn.addEventListener('click',()=>document.querySelector('.availability').showModal()));
  document.querySelectorAll('[data-close-dialog]').forEach(btn=>btn.addEventListener('click',()=>btn.closest('dialog').close()));
  document.querySelectorAll('.availability').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  document.querySelectorAll('[data-theme-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
    const body=document.body;body.dataset.theme=body.dataset.theme==='dark'?'light':'dark';
    btn.setAttribute('aria-label',body.dataset.theme==='dark'?'切换浅色外观':'切换深色外观');
    btn.textContent=body.dataset.theme==='dark'?'◐':'◑';
  }));
  const scopes=document.querySelector('[data-scopes]');
  if(scopes){const update=()=>{const minutes=[...scopes.querySelectorAll('input:checked')].reduce((n,input)=>n+Number(input.value),0);document.querySelector('[data-scope-total]').textContent=minutes>=60?`${Math.floor(minutes/60)} 时 ${String(minutes%60).padStart(2,'0')} 分`:`${minutes} 分`;};scopes.addEventListener('change',update);update();}
  let limit=120;
  const limitOutput=document.querySelector('[data-limit-output]');
  if(limitOutput){const update=()=>{const hours=limit/60;limitOutput.innerHTML=`${Number.isInteger(hours)?hours:hours.toFixed(1)} <small>小时 / 天</small>`;document.querySelectorAll('[data-node]').forEach(n=>{const m=Math.round(limit*Number(n.dataset.node));n.textContent=m>=60?`${Math.floor(m/60)} 时${m%60?' '+m%60+' 分':''}`:`${m} 分`;});document.querySelector('[data-limit-minus]').disabled=limit<=60;document.querySelector('[data-limit-plus]').disabled=limit>=480;};document.querySelector('[data-limit-minus]').addEventListener('click',()=>{limit=Math.max(60,limit-30);update();});document.querySelector('[data-limit-plus]').addEventListener('click',()=>{limit=Math.min(480,limit+30);update();});update();}
  const chapterObserver=new IntersectionObserver(entries=>{
    if(innerWidth<=760)return;
    for(const entry of entries){if(entry.isIntersecting){document.querySelectorAll('.story-chapter').forEach(x=>x.classList.toggle('is-active',x===entry.target));controllers.get('story-demo')?.go(Number(entry.target.dataset.chapter));}}
  },{rootMargin:'-28% 0px -35% 0px',threshold:0});
  document.querySelectorAll('[data-chapter]').forEach(c=>chapterObserver.observe(c));
  document.querySelectorAll('[data-story-step]').forEach(btn=>btn.addEventListener('click',()=>{
    controllers.get('story-demo')?.go(Number(btn.dataset.storyStep));
    if(innerWidth<=760)document.getElementById('story-demo').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});
  }));
})();
