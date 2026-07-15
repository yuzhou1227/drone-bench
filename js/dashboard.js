function st(){
  const d=ld(),tk=td(),[,pct]=wp(d);
  const elTotal=document.getElementById('st-total');
  const elStreak=document.getElementById('st-streak');
  const elToday=document.getElementById('st-today');
  const elWeek=document.getElementById('st-week');
  if(elTotal){
    elTotal.textContent=Object.keys(d.checkins).filter(k=>d.checkins[k].i?.some(t=>t.c)).length;
  }
  if(elStreak) elStreak.textContent=strk(d);
  const x=d.checkins[tk];
  const dd=x?.i?.filter(t=>t.c).length||0;
  var todayTotal=getContentSchedule(d).length;
  if(elToday) elToday.textContent=dd+'/'+todayTotal;
  if(elWeek) elWeek.textContent=pct+'%';
  // update pending review count from quiz
  var elReview=document.getElementById('st-review');
  if(elReview){
    try{
      var qp=JSON.parse(localStorage.getItem('lb-quiz-progress'))||{}, total=0, today=new Date().toISOString().slice(0,10);
      Object.keys(qp).forEach(function(sid){
        var w=qp[sid].wrong||{};
        Object.keys(w).forEach(function(qid){
          if(w[qid].nextReviewDate&&w[qid].nextReviewDate<=today) total++;
        });
      });
      elReview.textContent=total;
      elReview.style.color=total>0?'var(--danger)':'var(--text3)';
    }catch(_){}
  }
  svAnim('st-total');svAnim('st-streak');svAnim('st-today');svAnim('st-review');svAnim('st-week');
}

function prog(){
  const d=ld(),w=wk(),tk=td(),[,pct]=wp(d);
  const elPct=document.getElementById('prog-pct');
  const elPps=document.getElementById('prog-pps');
  if(elPct) elPct.textContent=pct+'%';
  if(elPps){
    elPps.innerHTML=w.map(k=>{
      const x=d.checkins[k];
      let c='pip';
      if(x?.i?.length&&x.i.every(t=>t.c)) c+=' d';
      else if(k<tk) c+=' m';
      else if(k===tk&&x?.i?.some(t=>t.c)) c+=' d';
      return '<div class="'+c+'"></div>';
    }).join('');
  }
  const goalRing=document.getElementById('goal-ring');
  const goalNum=document.getElementById('goal-num');
  if(goalRing) goalRing.style.setProperty('--pct',pct+'%');
  if(goalNum) goalNum.textContent=pct+'%';
}

function wkm(){
  const d=ld(),w=wk(),tk=td(),lb=['一','二','三','四','五','六','日'];
  const el=document.getElementById('wk-grid');
  if(!el)return;
  el.innerHTML=w.map((k,i)=>{
    const x=d.checkins[k];
    let c='wdt';
    if(k===tk) c+=' t';
    if(x?.i?.length&&x.i.every(t=>t.c)) c+=' d';
    else if(k<tk) c+=' m';
    return '<div class="wd"><div class="wl">'+lb[i]+'</div><div class="'+c+'"></div></div>';
  }).join('');
}

function rm(){
  const el=document.getElementById('roadmap');
  if(!el)return;
  el.innerHTML=RM.map((r,i)=>{
    return '<div class="rmi"><div class="rmb'+(r.c?' c':'')+'">'+(i+1)+'</div><div class="rmx"><div class="rmn'+(r.c?' c':'')+'">'+r.nm+'</div><div class="rms">'+r.sub+'</div></div></div>';
  }).join('');
}

function his(){
  const d=ld(),c=document.getElementById('history-list');
  if(!c)return;
  if(!Object.keys(d.checkins).length){
    c.innerHTML='<div class="hi" style="justify-content:center;border:none;color:var(--text3)">暂无记录，今天开始打卡吧</div>';
    return;
  }
  c.innerHTML=Object.keys(d.checkins).sort().reverse().slice(0,6).map(dk=>{
    const ci=d.checkins[dk].ci,items=d.checkins[dk].i||[];
    const total=ci!=null?(SCH[ci%SCH.length]?.its?.length||items.length):items.length;
    const done=items.filter(t=>t.c).length,p=total?Math.round(done/total*100):0;
    return '<div class="hi"><span class="hdt">'+dk.slice(5)+'</span><div class="hbr"><div class="hfl" style="width:'+p+'%"></div></div><span class="hpt">'+(total?done+'/'+total:'-')+'</span></div>';
  }).join('');
}

function act(){
  const d=ld(),c=document.getElementById('activity-list');
  if(!c)return;
  const all=[];
  Object.keys(d.checkins).forEach(dk=>{
    (d.checkins[dk].i||[]).filter(t=>t.c).forEach(t=>all.push({date:dk,title:((STUDY[t.id]&&STUDY[t.id].tt)||t.id),diff:t.d,at:t.at}));
  });
  all.sort((a,b)=>b.at?.localeCompare(a.at));
  if(!all.length){
    c.innerHTML='<div class="aii" style="justify-content:center;border:none;color:var(--text3)">暂无记录，完成第一个任务吧</div>';
    return;
  }
  const lb={easy:'简易',standard:'标准',hard:'挑战'};
  c.innerHTML=all.slice(0,8).map(a=>{
    const h=parseInt(a.date.slice(5,7)),m=parseInt(a.date.slice(8));
    const dow='星期'+DOW[new Date(parseInt(a.date.slice(0,4)),h-1,m).getDay()];
    return '<div class="aii"><span class="adt">'+dow+'</span><div class="adot"></div><span class="adtxt" title="'+a.title+'">'+a.title+'</span><span class="adif">'+(lb[a.diff]||'')+'</span></div>';
  }).join('');
}

function taskCard(t,d0,df,tag,sh){
  const doneCls=d0?' d':'',tck=d0?'<i data-lucide="check" style="width:12px;height:12px"></i>':'',ckCls=d0?'':' on',ckTxt=d0?'<i data-lucide="check-check" style="width:11px;height:11px"></i> 已打卡':'打卡',ckDs=d0?' disabled':'';
  const diffs=LB.diffKeys.map(x=>{
    const onCls=df===x?' on':'',ds=d0?' disabled':'';
    return '<button class="df'+onCls+'" data-diff="'+x+'"'+ds+'>'+LB.diff[x]+'</button>';
  }).join('');
  return '<div class="tsk'+doneCls+'" data-id="'+t.id+'"><div class="tp"><div class="th"><div class="tck">'+tck+'</div><div class="tb"><div class="tt">'+t.tt+'</div><div class="td">'+(t.de||'')+'</div><div class="ttg"><span class="ttg-el'+(t.cp?' cp':'')+'">'+t.tg+'</span><span class="ttg-el">'+t.tm+'</span></div></div></div><div class="ta">'+diffs+'<button class="ck'+ckCls+'"'+ckDs+'>'+ckTxt+'</button></div><button class="study-toggle"><i data-lucide="book-open" style="width:11px;height:11px"></i> 展开学习</button><div class="study-panel">'+sh+'</div></div></div>';
}

function tasks(){
  const d=ld(),tk=td(),sd=getContentSchedule(d),c=document.getElementById('task-list');
  if(!c)return;
  if(!sd.length){
    c.innerHTML='<div class="glass"><div class="empty"><div class="emp-i"><i data-lucide="plug-zap" style="width:28px;height:28px;color:var(--text3)"></i></div><div class="emp-t">今天休息</div></div></div>';
    return;
  }
  var dd=d.checkins[tk]||{i:[]},done=new Set(dd.i.filter(function(t){return t.c;}).map(function(t){return t.id;}));
  var dayLabel=Math.floor((d.contentIndex||0)/SCH.length)+1;
  var weekName=DOW[SCH[(d.contentIndex||0)%SCH.length].d];
  var elWeek=document.getElementById('tp-week');
  var elDays=document.getElementById('tp-days');
  if(elWeek) elWeek.innerHTML='<i data-lucide="book-open" style="width:11px;height:11px"></i> 第 '+dayLabel+' 周 · 星期'+weekName;
  if(elDays) elDays.textContent='已学 '+(d.contentIndex||0)+' 天';
  if(typeof lucide!=='undefined') lucide.createIcons();
  var html=sd.map(function(t){
    var d0=done.has(t.id),ex=dd.i.find(function(x){return x.id===t.id;}),df=ex?ex.d:null;
    return taskCard(t,d0,df,LB.diff,buildStudyHTML(t.id,t.sub));
  }).join('');
  c.innerHTML=html;
  bindTaskEvents();
  if(typeof bindChatEvents==='function') bindChatEvents();
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function bindTaskEvents(){
  document.querySelectorAll('#task-list .df:not([disabled])').forEach(b=>b.addEventListener('click',ondf));
  document.querySelectorAll('#task-list .ck:not([disabled])').forEach(b=>b.addEventListener('click',onck));
  document.querySelectorAll('.study-toggle').forEach(b=>b.addEventListener('click',function(){
    this.classList.toggle('open');
    const p=this.nextElementSibling;
    if(p) p.classList.toggle('open');
    this.innerHTML=p&&p.classList.contains('open')?'<i data-lucide="book-open-check" style="width:11px;height:11px"></i> 收起学习':'<i data-lucide="book-open" style="width:11px;height:11px"></i> 展开学习';
    if(typeof lucide!=='undefined') lucide.createIcons();
  }));
}

function ondf(e){
  const b=e.currentTarget,p=b.closest('.tsk');
  if(!p)return;
  p.querySelectorAll('.df').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  const ck=p.querySelector('.ck');
  if(ck) ck.classList.add('on');
  p.dataset.df=b.dataset.diff;
}

function onck(e){
  const b=e.currentTarget,p=b.closest('.tsk'),df=p?.dataset.df;
  if(!df) return tst('请先选择难度','error');
  const data=ld(),tk=td();
  if(!data.checkins[tk]) data.checkins[tk]={i:[],ci:data.contentIndex||0};
  const a=data.checkins[tk].i,ex=a.find(t=>t.id===p.dataset.id);
  if(ex){ ex.c=1; ex.d=df; ex.at=new Date().toISOString(); }
  else a.push({id:p.dataset.id,c:1,d:df,at:new Date().toISOString()});
  sv(data);
  var cs=getContentSchedule(data);
  var allDone=cs.length && cs.every(function(t){
    return data.checkins[tk]?.i?.some(function(x){return x.id===t.id&&x.c;});
  });
  if(allDone){
    data.contentIndex=(data.contentIndex||0)+1;
    sv(data);
  }
  rf('st','prog','wkm','tasks','his','act');
  const tck=p.querySelector('.tck');
  if(tck){
    tck.classList.remove('tck-on');
    void tck.offsetWidth;
    tck.classList.add('tck-on');
  }
  p.classList.add('glow','glow-on');
  setTimeout(()=>p.classList.remove('glow','glow-on'),600);
  var taskName='';
  cs.some(function(t){if(t.id===p.dataset.id){taskName=t.tt;return true;}});
  tst('<i data-lucide="check-circle" style="width:11px;height:11px"></i> '+(taskName||'任务')+' · 完成','success');
}
