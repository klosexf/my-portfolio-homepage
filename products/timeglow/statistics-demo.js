/* Illustrative data only. App totals, chart buckets and daily limits share one dataset. */
(() => {
  const apps=[
    {name:'Figma',icon:'figma',category:'创作与开发',minutes:[80,95,90,80,80,90,95]},
    {name:'Visual Studio Code',icon:'vscode',category:'创作与开发',minutes:[65,65,55,55,60,90,60]},
    {name:'Google Chrome',icon:'chrome',category:'网页浏览',minutes:[40,60,48,90,48,40,34],selected:true},
    {name:'微信',icon:'wechat',category:'沟通',minutes:[20,30,27,45,27,0,1],selected:true},
    {name:'Notion',icon:'notion',category:'阅读与整理',minutes:[20,20,20,20,31,0,39]}
  ];
  const sum=values=>values.reduce((a,b)=>a+b,0);
  const duration=m=>m>=60?`${Math.floor(m/60)} 时${m%60?` ${m%60} 分`:''}`:`${m} 分`;
  const shortDate=date=>`${String(date.getUTCMonth()+1).padStart(2,'0')}/${String(date.getUTCDate()).padStart(2,'0')}`;
  function markup(){return `<section class="stats-window tg-statistics" data-statistics aria-label="完整使用统计，所有数据均为示例">
    <div class="stats-titlebar"><span><span class="traffic" aria-hidden="true"><i></i><i></i><i></i></span><b>Timeglow</b></span><nav aria-label="演示窗口导航"><span>使用统计</span><button data-reminder>提醒演示</button></nav><span class="statistics-example">示例数据</span></div>
    <div class="stats-body" tabindex="0" aria-label="统计内容，可上下滚动"><div class="statistics-content">
      <div class="statistics-heading stats-heading"><div><small>把时间看清楚</small><h3>这一周的时间去向</h3></div><button class="statistics-export" data-export-statistics>导出示例 CSV ↗</button></div>
      <div class="statistics-toolbar"><div class="periods" aria-label="统计周期"><button data-period="today">今日</button><button data-period="week">每周</button><button data-period="all">累计</button></div><span data-statistics-date></span></div>
      <div class="statistics-metrics"><div><small>所有应用总时长</small><strong data-metric="total"></strong><em>前台使用时长 · 网站计入浏览器</em></div><div><small data-metric-label>日均使用</small><strong data-metric="average"></strong><em data-average-note></em></div><div><small>所选应用和网站合计用时</small><strong data-metric="selected"></strong><em data-selected-note></em></div></div>
      <div class="statistics-grid">
        <section class="statistics-card"><h4 data-trend-title>每天花了多少时间</h4><div class="statistics-legend"><span>全部应用用时</span><span>所选范围用时（已含于总量）</span></div><div class="statistics-bars" data-trend-bars></div><p class="statistics-note">悬停或聚焦柱形，查看用时明细。</p></section>
        <section class="statistics-card"><h4>时间花在哪里</h4><p class="statistics-note">按应用用途归类</p><div class="statistics-categories"><div class="statistics-donut" data-category-chart><span data-leading-category></span></div><div class="statistics-category-list" data-category-list></div></div></section>
        <section class="statistics-card statistics-apps"><h4>每个应用，都有记录</h4><p class="statistics-note">按使用时长排序 · 点击浏览器可展开网站</p><div data-application-list></div></section>
        <section class="statistics-card statistics-days"><h4>每日合计用时记录</h4><p class="statistics-note">所选应用和网站合计用时 / 当日限额 2 小时</p><div class="statistics-day-grid" data-day-list></div><div class="statistics-day-legend"><span>● 充足</span><span>● 留意</span><span>● 用尽</span></div><p class="statistics-note" data-limit-summary></p><p class="statistics-note">点击日期，查看当天的应用与网站用时。</p></section>
      </div><p class="statistics-footnote">官网交互演示 · 全部为编制的示例数据，非真实使用记录。网站用时已包含在浏览器中。</p>
    </div></div></section>`;}
  function mount(root,onInteract=()=>{}){
    let period='week',dayIndex=4,chosenDay=null;
    const week=Array.from({length:7},(_,i)=>({index:i,date:new Date(Date.UTC(2026,10,9+i)),total:sum(apps.map(a=>a.minutes[i])),selected:sum(apps.filter(a=>a.selected).map(a=>a.minutes[i]))}));
    let report=[];
    const text=(selector,value)=>{root.querySelector(selector).textContent=value;};
    function render(){
      report=period==='today'?[chosenDay||week[dayIndex]]:period==='week'?week:Array.from({length:28},(_,i)=>({...week[i%7],date:new Date(Date.UTC(2026,9,19+i))}));
      const total=sum(report.map(d=>d.total)),selected=sum(report.map(d=>d.selected));
      const rows=apps.map(a=>({...a,value:period==='today'?a.minutes[dayIndex]:sum(a.minutes)*(period==='all'?4:1)})).sort((a,b)=>b.value-a.value);
      text('.stats-heading h3',period==='today'?'今天的时间去向':period==='week'?'这一周的时间去向':'一路以来的时间去向');
      text('[data-statistics-date]',period==='today'?`2026 年 ${shortDate(report[0].date).replace('/',' 月 ')} 日`:period==='week'?'2026.11.09 — 11.15':'2026.10.19 — 11.15');
      text('[data-metric=total]',duration(total));text('[data-metric=selected]',duration(selected));
      text('[data-metric-label]',period==='today'?'每日限额':'日均使用');text('[data-metric=average]',period==='today'?'2 小时':duration(Math.round(total/report.length)));
      text('[data-average-note]',period==='today'?'仅用于所选应用和网站':`按有记录的 ${report.length} 天计算`);
      text('[data-selected-note]',`占全部用时 ${Math.round(selected/total*100)}%`);
      root.querySelectorAll('[data-period]').forEach(button=>{const active=button.dataset.period===period;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
      let buckets=period==='all'?Array.from({length:4},(_,i)=>({label:`第 ${i+1} 周`,total:1720,selected:510})):report.map(d=>({...d,label:shortDate(d.date)}));
      if(period==='today'){
        const weights=[.1,.15,.2,.1,.2,.15,.1];let assigned=0,scoped=0;
        buckets=weights.map((weight,i)=>{const t=i===6?total-assigned:Math.floor(total*weight),s=i===6?selected-scoped:Math.floor(selected*weight);assigned+=t;scoped+=s;return {label:`${9+i}:00`,total:t,selected:s};});
      }
      text('[data-trend-title]',period==='today'?'时间集中在哪些时段':period==='all'?'每周花了多少时间':'每天花了多少时间');
      const max=Math.max(...buckets.map(d=>d.total))*1.1;
      root.querySelector('[data-trend-bars]').innerHTML=buckets.map(d=>`<div class="statistics-bar-column"><button class="statistics-bar" style="--bar-height:${d.total/max*100}%;--scope-height:${d.selected/d.total*100}%" aria-label="${d.label}：全部 ${duration(d.total)}，所选范围 ${duration(d.selected)}"><i></i><span class="statistics-tooltip">${d.label}<br>全部 ${duration(d.total)}<br>合计 ${duration(d.selected)}</span></button><span>${d.label}</span></div>`).join('');
      const categories=[['创作与开发','#c2c7d3'],['网页浏览','#8eafbe'],['沟通','#c9ad89'],['阅读与整理','#7b8594']].map(([name,color])=>({name,color,value:sum(rows.filter(r=>r.category===name).map(r=>r.value))})).sort((a,b)=>b.value-a.value);
      categories.forEach(c=>c.percent=Math.floor(c.value/total*100));
      const remainders=[...categories].sort((a,b)=>(b.value/total*100-b.percent)-(a.value/total*100-a.percent));
      for(let i=0,remaining=100-sum(categories.map(c=>c.percent));i<remaining;i++)remainders[i].percent++;
      let angle=0;
      root.querySelector('[data-category-chart]').style.background=`conic-gradient(${categories.map(c=>{const start=angle;angle+=c.value/total*360;return `${c.color} ${start}deg ${angle}deg`;}).join(',')})`;
      root.querySelector('[data-leading-category]').innerHTML=`最多时间<br><b>${categories[0].name}</b><strong>${categories[0].percent}%</strong>`;
      root.querySelector('[data-category-list]').innerHTML=categories.map(c=>`<div><i style="background:${c.color}"></i><span>${c.name}</span><b>${c.percent}%</b></div>`).join('');
      root.querySelector('[data-application-list]').innerHTML=rows.map(a=>{
        const row=`<img src="assets/${a.icon}.png" alt=""><span class="statistics-app-name">${a.name}${a.selected?'<small>计入每日合计</small>':''}<i style="--usage-width:${a.value/rows[0].value*100}%"></i></span><strong>${duration(a.value)}</strong>`;
        if(a.icon!=='chrome')return `<div class="statistics-app-row">${row}</div>`;
        const sites=[['bilibili.com',Math.floor(a.value*.625)],['docs.google.com',Math.floor(a.value*.25)],['github.com',a.value-Math.floor(a.value*.625)-Math.floor(a.value*.25)]];
        return `<details class="statistics-browser" open><summary class="statistics-app-row">${row}</summary><div class="statistics-sites">${sites.map(([name,m])=>`<div><span>↳ ${name}</span><strong>${duration(m)}</strong></div>`).join('')}<p>网站明细已包含在 Chrome 用时中</p></div></details>`;
      }).join('');
      root.querySelector('[data-day-list]').innerHTML=report.map((d,position)=>{const pct=Math.round(d.selected/120*100);return `<button data-statistics-day="${position}" class="${pct>=100?'spent':pct>=75?'warning':'safe'}" aria-label="${shortDate(d.date)}，已用限额 ${pct}%，查看当天"><span>${shortDate(d.date)}</span><strong>${pct}%</strong></button>`;}).join('');
      text('[data-limit-summary]',`${report.filter(d=>d.selected>=120).length} 天合计用时达到或超过每日限额`);
    }
    root.addEventListener('click',event=>{
      if(event.target.closest('summary'))onInteract();
      const button=event.target.closest('[data-period],[data-statistics-day]');
      if(!button)return;
      onInteract();
      if(button.hasAttribute('data-period')){period=button.dataset.period;if(period==='today'){dayIndex=4;chosenDay=null;}}
      else {chosenDay={...report[Number(button.dataset.statisticsDay)]};period='today';dayIndex=chosenDay.index;}
      render();root.querySelector('.stats-body').scrollTop=0;
    });
    root.querySelector('[data-export-statistics]').addEventListener('click',()=>{
      onInteract();
      const lines=[['日期','应用','使用分钟','数据性质'],...report.flatMap(d=>apps.map(a=>[d.date.toISOString().slice(0,10),a.name,a.minutes[d.index],'示例数据']))];
      const csv='\uFEFF'+lines.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
      const link=document.createElement('a');link.href=url;link.download='Timeglow-示例使用记录.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    root.querySelector('.stats-body').addEventListener('wheel',onInteract,{passive:true});
    root.querySelector('.stats-body').addEventListener('touchstart',onInteract,{passive:true});
    root.querySelector('.stats-body').addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(event.key))onInteract();});
    render();
  }
  window.TimeglowStatistics={markup,mount};
})();
