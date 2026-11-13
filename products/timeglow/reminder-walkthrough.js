/* Automatic editing is visual only; taking over stops the clock and preserves a full draft. */
(() => {
  function mount(el,index,reminderMarkup,reduced){
    const section=el.closest('[data-reminder-editor]'),editor=section.querySelector('.reminder-editor');
    el.innerHTML=`<button class="feature-notification" aria-expanded="false"><img src="assets/timeglow.png?v=678111dea9" alt=""><span><span class="feature-notification-top">TIMEGLOW <small>现在</small></span><strong>到了给自己的一点提醒时间</strong><span data-notice-copy></span></span><b aria-hidden="true">↗</b></button><div class="feature-connector" aria-hidden="true"><span>自动演示 · 从写下提醒开始</span><span>↓</span></div><div class="feature-reminder-slot"><div class="feature-reminder-placeholder" aria-hidden="true"><strong><b data-placeholder-node>75</b><span>%</span></strong><span data-placeholder-copy>先写下提醒，再看看它如何出现</span></div>${reminderMarkup(`feature-reminder-${index}`)}</div><div class="feature-playback"><p class="feature-feedback"></p><div><button data-feature-play>暂停</button><button data-feature-replay>↺ 重播</button></div></div>`;
    const cursor=document.createElement('span');cursor.className='feature-demo-cursor walkthrough-cursor';cursor.setAttribute('aria-hidden','true');section.append(cursor);
    const status=document.createElement('div');status.className='reminder-walkthrough-status';status.innerHTML='<span></span><button data-editor-play>暂停</button>';editor.prepend(status);
    const input=editor.querySelector('textarea'),notice=el.querySelector('.feature-notification'),popup=el.querySelector('.personal-reminder'),message=popup.querySelector('.personal-message'),placeholder=el.querySelector('.feature-reminder-placeholder');
    const original=message.textContent;
    const scenes=[{node:'50',message:'先把屏幕放一放。给自己五分钟，想想今天真正想完成的事。'},{node:'75',message:original},{node:'100',message:'今天已经用了不少时间。合上电脑，去散散步，剩下的事明天再继续。'}];
    let draft={node:'75',message:original},target={...scenes[0]},custom=false,cycle=0;
    const phases=['select','write','notification','click','reminder','close'];
    const durations={select:1200,write:3000,notification:1400,click:850,reminder:5600,close:1500};
    let phase='select',elapsed=0,playing=!reduced.matches,timer=null,lastTick=0,editorVisible=false,previewVisible=false;
    const radio=value=>editor.querySelector(`input[value="${value}"]`);
    const setPopup=open=>{popup.hidden=!open;placeholder.hidden=open;notice.setAttribute('aria-expanded',String(open));};
    popup.id=`custom-reminder-${index}`;notice.setAttribute('aria-controls',popup.id);
    function sync(){
      const node=editor.querySelector('input:checked').value,minutes=120*Number(node)/100;
      const time=`${Math.floor(minutes/60)} 小时${minutes%60?` ${minutes%60} 分钟`:''}`;
      editor.querySelector('[data-reminder-time]').textContent=`用到 ${time}时提醒`;
      notice.querySelector('strong').textContent=node==='100'?'到了今天设定的限额，停一下？':'到了给自己的一点提醒时间';
      el.querySelector('[data-notice-copy]').textContent=`今天的合计用时已达到每日限额的 ${node}%。`;
      popup.querySelector('.personal-context').textContent=`${node}% 节点提醒 · 已用 ${time}`;
      popup.querySelector('.personal-percent strong').textContent=node;el.querySelector('[data-placeholder-node]').textContent=node;
      message.textContent=input.value.trim()?input.value:'写下一句话，这里会同步预览。';message.dataset.empty=String(!input.value.trim());
    }
    function moveCursor(element,typing=false){
      const base=section.getBoundingClientRect(),rect=element.getBoundingClientRect();
      section.style.setProperty('--feature-cursor-x',`${rect.left-base.left+(typing?24:rect.width*.6)-5}px`);
      section.style.setProperty('--feature-cursor-y',`${rect.top-base.top+(typing?25:rect.height*.5)-5}px`);
    }
    function controls(){
      section.dataset.walkthroughPlaying=String(playing);
      section.querySelectorAll('[data-feature-play],[data-editor-play]').forEach(button=>{button.textContent=playing?'暂停':'播放';button.setAttribute('aria-label',playing?'暂停完整提醒演示':'播放完整提醒演示');});
      const descriptions={select:'1 / 5 · 选择提醒节点',write:'2 / 5 · 写下给自己的话',notification:'3 / 5 · 用时到点，通知出现',click:'4 / 5 · 点开通知',reminder:'5 / 5 · 阅读自己的提醒',close:'5 / 5 · 回应后收起提醒',manual:'实时预览 · 可继续编辑'};
      status.querySelector('span').textContent=`${playing?'自动演示':'已暂停'} · ${descriptions[phase]}`;
      el.querySelector('.feature-feedback').textContent=phase==='manual'?'编辑内容已同步 · 可演示完整流程':`${playing?'自动演示':'已暂停'} · ${descriptions[phase]}`;
    }
    function draw(){
      if(phase==='select'&&elapsed>=650){radio(target.node).checked=true;sync();section.dataset.nodeClicked='true';}
      if(phase==='write'){
        const chars=Array.from(target.message),length=Math.min(chars.length,Math.floor(Math.max(0,elapsed-150)/2400*chars.length));
        const value=chars.slice(0,length).join('');if(input.value!==value){input.value=value;sync();}
      }
      if(phase==='close'&&elapsed>=1000){setPopup(false);el.dataset.featureClosed='true';section.dataset.reminderClosed='true';}
    }
    function enter(next){
      phase=next;elapsed=0;section.dataset.walkthroughPhase=phase;el.dataset.featurePhase=phase;el.dataset.featureClosed='false';section.dataset.reminderClosed='false';section.dataset.nodeClicked='false';
      setPopup(phase==='reminder'||phase==='close');
      const setup=phase==='select'||phase==='write';notice.inert=setup;
      el.querySelector('[data-placeholder-copy]').textContent=setup?'先写下提醒，再看看它如何出现':'到了你设定的提醒时刻';
      el.querySelector('.feature-connector > span').textContent=setup?'自动演示 · 设置好，再等它提醒':'自动演示 · 通知到提醒';
      if(phase==='select')moveCursor(radio(target.node).closest('label'));
      if(phase==='write'){input.value='';sync();moveCursor(input,true);}
      if(phase==='notification'){input.value=target.message;radio(target.node).checked=true;sync();}
      if(phase==='click')moveCursor(notice);
      if(phase==='close')moveCursor(popup.querySelector('.personal-accept'));
      controls();draw();
    }
    function stopClock(){clearTimeout(timer);timer=null;lastTick=0;}
    function inView(){return phase==='select'||phase==='write'?editorVisible:previewVisible;}
    function schedule(){
      if(!playing||document.hidden||!inView()){stopClock();return;}
      if(timer!==null)return;
      lastTick=performance.now();
      timer=setTimeout(tick,40);
    }
    function tick(){
      timer=null;
      if(!playing||document.hidden||!inView()){stopClock();return;}
      const now=performance.now();elapsed+=now-lastTick;lastTick=now;draw();
      if(elapsed>=durations[phase]){
        const next=(phases.indexOf(phase)+1)%phases.length;
        if(next===0){cycle++;target=custom?{...draft}:{...scenes[cycle%scenes.length]};}
        enter(phases[next]);
      }
      schedule();
    }
    function setPlaying(value){playing=value;if(!value)stopClock();controls();schedule();}
    function manualPreview(){
      setPlaying(false);phase='manual';section.dataset.walkthroughPhase=phase;el.dataset.featurePhase='editing';notice.inert=false;
      sync();setPopup(true);controls();el.querySelector('.feature-connector > span').textContent='实时预览 · 给自己的提醒';
    }
    function takeOver(){
      if(phases.includes(phase)){input.value=target.message;radio(target.node).checked=true;}
      draft={node:editor.querySelector('input:checked').value,message:input.value};target={...draft};custom=true;manualPreview();
    }
    function start(){target=custom?{...draft}:{...target};enter('select');setPlaying(true);}
    input.value=original;sync();
    input.addEventListener('focus',takeOver);
    input.addEventListener('input',()=>{draft={node:editor.querySelector('input:checked').value,message:input.value};target={...draft};custom=true;manualPreview();});
    editor.querySelectorAll('input[type=radio]').forEach(node=>node.addEventListener('change',()=>{
      if(playing||phase==='select'||phase==='write')input.value=target.message;
      draft={node:node.value,message:input.value};target={...draft};custom=true;manualPreview();
    }));
    editor.querySelector('[data-reset-reminder]').addEventListener('click',()=>{draft={node:'75',message:original};target={...draft};custom=true;input.value=original;radio('75').checked=true;manualPreview();});
    editor.querySelector('[data-preview-reminder]').addEventListener('click',()=>{start();if(innerWidth<=760)editor.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});});
    section.querySelectorAll('[data-feature-play],[data-editor-play]').forEach(button=>button.addEventListener('click',()=>{if(playing)setPlaying(false);else if(phase==='manual')start();else setPlaying(true);}));
    el.querySelector('[data-feature-replay]').addEventListener('click',start);
    notice.addEventListener('click',()=>{takeOver();popup.querySelector('.personal-accept').focus({preventScroll:true});});
    function close(){setPlaying(false);phase='manual';section.dataset.walkthroughPhase=phase;el.dataset.featurePhase='manual';setPopup(false);controls();notice.focus({preventScroll:true});}
    el.querySelectorAll('[data-dismiss-reminder]').forEach(button=>button.addEventListener('click',close));
    el.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden){event.preventDefault();close();}});
    new IntersectionObserver(entries=>{editorVisible=entries[0].isIntersecting;schedule();},{threshold:.12}).observe(editor);
    new IntersectionObserver(entries=>{previewVisible=entries[0].isIntersecting;schedule();},{threshold:.12}).observe(el);
    new ResizeObserver(()=>{if(phase==='select')moveCursor(radio(target.node).closest('label'));if(phase==='write')moveCursor(input,true);if(phase==='click')moveCursor(notice);if(phase==='close')moveCursor(popup.querySelector('.personal-accept'));}).observe(section);
    document.addEventListener('visibilitychange',schedule);
    reduced.addEventListener('change',event=>{if(event.matches){input.value=target.message;radio(target.node).checked=true;manualPreview();}});
    if(reduced.matches){target={...draft};manualPreview();}else enter('select');
  }
  window.TimeglowReminderWalkthrough={mount};
})();
