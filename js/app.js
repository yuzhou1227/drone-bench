function getApiUrl(){
  try{ return localStorage.getItem('lb-api-url')||DEFAULT_API_URL; }catch(_){ return DEFAULT_API_URL; }
}
function setApiUrl(url){
  try{ localStorage.setItem('lb-api-url',url); }catch(_){}
}

var DOM_CACHE={};
function $(id){ 
  var el=DOM_CACHE[id];
  if(!el||!el.isConnected){ el=document.getElementById(id); DOM_CACHE[id]=el; }
  return el;
}

function safeGet(key,fallback){
  try{ var r=localStorage.getItem(key); return r?JSON.parse(r):fallback; }catch(_){ return fallback; }
}
function safeSet(key,val){
  try{ localStorage.setItem(key,JSON.stringify(val)); return true; }catch(_){ return false; }
}

function ld(){
  var d=safeGet(APP_STORAGE_KEY,{checkins:{}});
  if(!d.checkins) d.checkins={};
  if(!d._version){ d._version=2; safeSet(APP_STORAGE_KEY,d); }
  if(!Object.keys(d.checkins).length){
    var old=safeGet(APP_STORAGE_KEY_OLD,null);
    if(old&&old.checkins){ d=old; d._version=2; safeSet(APP_STORAGE_KEY,d); }
  }
  return d;
}

function sv(d){ safeSet(APP_STORAGE_KEY,d); }

function td(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function wk(){
  const n=new Date(),dw=n.getDay(),m=new Date(n);
  m.setDate(n.getDate()-dw+(dw===0?-6:1));
  return Array.from({length:7},(_,i)=>{
    const d=new Date(m);d.setDate(m.getDate()+i);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  });
}

function sk(k){
  if(!k||typeof k!='string')return [];
  if(!ALL_TASKS) buildAllTasks();
  return ALL_TASKS.list;
}

function buildAllTasks(){
  var seen={},list=[];
  SCH.forEach(function(e){
    e.its.forEach(function(t){
      if(!seen[t.id]){ seen[t.id]=1; list.push(t); }
    });
  });
  ALL_TASKS={list:list, map:seen};
}
var ALL_TASKS;

function getTaskById(id){
  if(!ALL_TASKS) buildAllTasks();
  var r;
  SCH.some(function(e){ return e.its.some(function(t){ if(t.id===id){ r=t; return 1; } }); });
  return r;
}

function strk(data){
  const tk=td(),d=data.checkins[tk];
  if(!d||!d.i||!d.i.every(t=>t.c))return 0;
  let s=1,c=new Date(tk+'T12:00:00');
  for(let i=0;i<365;i++){
    c.setDate(c.getDate()-1);
    const k2=c.getFullYear()+'-'+String(c.getMonth()+1).padStart(2,'0')+'-'+String(c.getDate()).padStart(2,'0');
    const x=data.checkins[k2];
    if(x&&x.i&&x.i.length&&x.i.every(t=>t.c)) s++;
    else break;
  }
  return s;
}

function wp(data){
  const w=wk();
  let d=0;
  w.forEach(k=>{const x=data.checkins[k];if(x?.i?.length&&x.i.every(t=>t.c))d++});
  return [d,Math.round(d/7*100)];
}

function getContentSchedule(data){
  if(typeof data.contentIndex!=='number'||isNaN(data.contentIndex)){ data.contentIndex=0; sv(data); }
  var entry=SCH[data.contentIndex % SCH.length];
  return entry?entry.its:[];
}

function tst(m,type){
  var e=$('toast');
  if(!e)return;
  e.innerHTML=m;
  e.className='toast';
  if(type) e.classList.add(type);
  e.classList.add('show');
  clearTimeout(e._t);
  e._t=setTimeout(function(){ e.classList.remove('show'); },type==='error'?4000:2500);
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function svAnim(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.remove('sv-up');
  void el.offsetWidth;
  el.classList.add('sv-up');
}

function hdr(){}
function qt(){
  const i=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/86400000)%QQ.length;
  var el=document.querySelector('.topbar-quote');
  if(el) el.innerHTML='&ldquo;'+QQ[i].t+'&rdquo;<span class="tq-auth"> '+QQ[i].a+'</span>';
}

function toggleTheme(){
  const html=document.documentElement;
  const btn=document.getElementById('theme-btn');
  if(html.dataset.theme==='dark'){
    html.dataset.theme='';
    localStorage.setItem('lb-theme','light');
    if(btn) btn.innerHTML='<i data-lucide="moon" style="width:16px;height:16px"></i>';
  }else{
    html.dataset.theme='dark';
    localStorage.setItem('lb-theme','dark');
    if(btn) btn.innerHTML='<i data-lucide="sun" style="width:16px;height:16px"></i>';
  }
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function initTheme(){
  const saved=localStorage.getItem('lb-theme'),html=document.documentElement;
  const btn=document.getElementById('theme-btn');
  if(saved){
    html.dataset.theme=saved;
    if(btn) btn.innerHTML=saved==='dark'?'<i data-lucide="sun" style="width:16px;height:16px"></i>':'<i data-lucide="moon" style="width:16px;height:16px"></i>';
    return;
  }
  if(window.matchMedia('(prefers-color-scheme:dark)').matches){
    html.dataset.theme='dark';
    if(btn) btn.innerHTML='<i data-lucide="sun" style="width:16px;height:16px"></i>';
  }
}

function switchTab(name){
  const target=document.getElementById('tab-'+name);
  if(!target){ name='dashboard'; }
  const current=document.querySelector('.tab-content.act');
  if(current && current.id==='tab-'+name) return;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('act',b.dataset.tab===name));
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  try{ localStorage.setItem('lb-active-tab',name); }catch(_){}
  const titles={dashboard:'工作台',training:'学习实训',quiz:'刷题'};
  const titleEl=document.querySelector('.page-title');
  if(titleEl) titleEl.textContent=titles[name]||'工作台';
  const headerEl=document.getElementById('page-header');
  if(headerEl) headerEl.style.display=name==='dashboard'?'flex':'none';
  const doSwitch=()=>{
    document.querySelectorAll('.tab-content').forEach(c=>{
      if(c.id==='tab-'+name){ c.classList.add('act'); }
      else{ c.classList.remove('act'); }
    });
    if(name==='quiz'&&typeof renderQuiz==='function'){
      var q=document.getElementById('tab-quiz'), pc=document.querySelector('.page-content');
      if(q&&pc&&q.parentElement!==pc) pc.appendChild(q);
      renderQuiz();
    }
    if(typeof lucide!=='undefined') lucide.createIcons();
  };
  if(current && current.id!=='tab-'+name){
    current.style.opacity='0';
    current.style.transform='translateY(4px)';
    setTimeout(()=>{
      doSwitch();
      target.style.opacity='0';
      target.style.transform='translateY(4px)';
      requestAnimationFrame(()=>{
        target.style.transition='opacity .25s ease, transform .3s ease';
        target.style.opacity='1';
        target.style.transform='translateY(0)';
        setTimeout(()=>{
          target.style.transition='';
          target.style.transform='';
          target.style.opacity='';
        },350);
      });
    },150);
  }else{
    doSwitch();
  }
}

function closeStats(){
  const o=document.getElementById('stats-overlay');
  if(o) o.classList.remove('show');
}

function openStats(){
  const o=document.getElementById('stats-overlay'),b=document.getElementById('stats-body');
  if(!o||!b)return;
  const d=ld(),tk=td();
  b.innerHTML='';
  let hm='';
  for(let i=364;i>=0;i--){
    const dt=new Date(tk+'T12:00:00');
    dt.setDate(dt.getDate()-i);
    const k2=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
    const x=d.checkins[k2];
    let c='st-hm-cell';
    if(x?.i?.length){
      const ci=x.ci!=null?x.ci:0;
      const total=SCH[ci%SCH.length]?.its?.length||x.i.length;
      const r=x.i.filter(t=>t.c).length/total;
      if(r>=1) c+=' l4';
      else if(r>=.75) c+=' l3';
      else if(r>=.5) c+=' l2';
      else if(r>0) c+=' l1';
    }
    hm+='<div class="'+c+'" title="'+k2+'"></div>';
  }
  b.innerHTML='<div><div class="st-hd"><i data-lucide="calendar" style="width:11px;height:11px"></i>过去365天</div><div class="st-hm">'+hm+'</div></div>';
  const m={};
  Object.keys(d.checkins).forEach(dk=>{
    const x=d.checkins[dk];
    if(!x?.i)return;
    const ci=x.ci!=null?x.ci:0;
    const total=SCH[ci%SCH.length]?.its?.length||x.i.length;
    const r=x.i.filter(t=>t.c).length/total;
    const mk=dk.slice(0,7);
    m[mk]=m[mk]||{t:0,c:0};
    m[mk].t++;
    m[mk].c+=r;
  });
  let mb='';
  const mks=Object.keys(m).sort().reverse().slice(0,6).reverse();
  mks.forEach(mk=>{
    const v=m[mk],pct=Math.round(v.c/v.t*100);
    mb+='<div class="st-bar"><div class="st-bar-lbl"><span>'+mk+'</span><span>'+pct+'%</span></div><div class="st-bar-tr"><div class="st-bar-fill" style="width:'+pct+'%"></div></div></div>';
  });
  b.innerHTML+='<div><div class="st-hd"><i data-lucide="trending-up" style="width:11px;height:11px"></i>月度趋势</div>'+mb+'</div>';
  const tg={};
  Object.keys(d.checkins).forEach(dk=>{
    (d.checkins[dk].i||[]).filter(t=>t.c).forEach(t=>{
      const tsk=getTaskById(t.id);
      if(tsk) tg[tsk.tg]=(tg[tsk.tg]||0)+1;
    });
  });
  if(Object.keys(tg).length){
    let sb='<div class="st-sub">';
    Object.entries(tg).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
      sb+='<div class="st-sub-item"><div class="st-sub-num">'+v+'</div><div class="st-sub-lbl">'+k+'</div></div>';
    });
    sb+='</div>';
    b.innerHTML+='<div><div class="st-hd"><i data-lucide="book-open" style="width:11px;height:11px"></i>科目分布</div>'+sb+'</div>';
  }else{
    b.innerHTML+='<div><div class="st-hd"><i data-lucide="book-open" style="width:11px;height:11px"></i>科目分布</div><div class="st-empty">暂无数据，开始打卡吧！</div></div>';
  }
  // 专注统计
  var focusStats=timer.history.getStats();
  b.innerHTML+='<div><div class="st-hd"><i data-lucide="timer" style="width:11px;height:11px"></i>专注统计</div><div class="st-sub"><div class="st-sub-item"><div class="st-sub-num">'+focusStats.week+'</div><div class="st-sub-lbl">本周(分钟)</div></div><div class="st-sub-item"><div class="st-sub-num">'+focusStats.total+'</div><div class="st-sub-lbl">累计(分钟)</div></div><div class="st-sub-item"><div class="st-sub-num">'+focusStats.count+'</div><div class="st-sub-lbl">专注次数</div></div></div></div>';
  o.classList.add('show');
  o.focus();
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function exp(){
  const b=new Blob([JSON.stringify(ld(),null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download='lb-'+td()+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  tst('<i data-lucide="download" style="width:11px;height:11px"></i> 备份已下载','success');
}

function imp(e){
  const f=e.target.files[0];
  if(!f)return;
  if(f.size>1024*1024){ tst('<i data-lucide="x-circle" style="width:11px;height:11px"></i> 文件过大（最大1MB）','error'); e.target.value=''; return; }
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const i=JSON.parse(ev.target.result);
      if(!i.checkins||typeof i.checkins!=='object') return tst('<i data-lucide="x-circle" style="width:11px;height:11px"></i> 无效备份文件：缺少 checkins 字段','error');
      const oldData=ld();
      const backup=JSON.stringify(oldData);
      try{
        Object.keys(i.checkins).forEach(k=>{
          if(typeof k==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(k)&&i.checkins[k]&&typeof i.checkins[k]==='object'){
            oldData.checkins[k]=i.checkins[k];
          }
        });
        sv(oldData);
      }catch(_){
        try{ localStorage.setItem(APP_STORAGE_KEY,backup); }catch(_){}
        return tst('<i data-lucide="x-circle" style="width:11px;height:11px"></i> 导入失败，已回滚','error');
      }
const RFS={st,prog,wkm,tasks,his,act,note,qt,rm};
      function rf(...ks){ ks.forEach(k=>RFS[k]?.()); }
      rf('st','prog','wkm','tasks','his','act','note');
      tst('<i data-lucide="upload" style="width:11px;height:11px"></i> 导入成功','success');
    }catch(_){ tst('<i data-lucide="x-circle" style="width:11px;height:11px"></i> 解析失败，请检查文件格式','error'); }
  };
  r.readAsText(f);
  e.target.value='';
}

function note(){
  const d=ld().checkins[td()];
  const el=document.getElementById('note-area');
  if(el&&d?.n) el.value=d.n;
}
function sav(){
  const n=document.getElementById('note-area')?.value.trim();
  const data=ld(),tk=td();
  if(!data.checkins[tk]) data.checkins[tk]={i:[]};
  data.checkins[tk].n=n||'';
  sv(data);
  const el=document.getElementById('note-ok');
  if(el){
    el.classList.add('on');
    clearTimeout(el._t);
    el._t=setTimeout(()=>el.classList.remove('on'),2000);
  }
}

function fmt(t){
  return t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
          .replace(/\n/g,'<br>')
          .replace(/```(\w*)\n?([\s\S]*?)```/g,'<div class="ai-code">$2</div>');
}

function buildStudyHTML(id, sub){
  const s=STUDY[id];
  if(!s)return '';
  let h='<div class="study-inner">';
  if(s.pts){
    h+='<div class="study-section"><div class="study-hd"><i data-lucide="file-text" style="width:11px;height:11px"></i>本节重点</div><ul class="study-list">'+
       s.pts.map(p=>'<li>'+p+'</li>').join('')+'</ul></div>';
  }
  if(s.code){
    h+='<div class="study-section"><div class="study-hd"><i data-lucide="code" style="width:11px;height:11px"></i>代码示例</div><div class="code-block">'+s.code+'</div></div>';
  }
  var vid=s.vid||(BV[sub]||'');
  if(vid){
    h+='<div class="study-section"><div class="study-hd"><i data-lucide="monitor" style="width:11px;height:11px"></i>推荐视频</div><a href="https://www.bilibili.com/video/'+vid+'" target="_blank" style="text-decoration:none"><div class="video-placeholder"><i data-lucide="play" style="width:12px;height:12px"></i> 去B站观看此章节视频 →</div></a></div>';
  }
  if(s.p){
    h+='<div class="study-section"><div class="study-hd"><i data-lucide="bot" style="width:11px;height:11px"></i>AI助教</div><button class="ai-btn" data-study-id="'+id+'"><i data-lucide="crosshair" style="width:11px;height:11px"></i> 向AI助教学习此内容</button></div>';
  }
  h+='</div>';
  return h;
}

function toggleSidebar(){
  const sidebar=document.getElementById('sidebar');
  const overlay=document.getElementById('sidebar-overlay');
  if(!sidebar)return;
  sidebar.classList.toggle('open');
  if(overlay) overlay.classList.toggle('show');
}

function closeSidebar(){
  const sidebar=document.getElementById('sidebar');
  const overlay=document.getElementById('sidebar-overlay');
  if(sidebar) sidebar.classList.remove('open');
  if(overlay) overlay.classList.remove('show');
}

function closeAllOverlays(){
  document.querySelectorAll('.ai-overlay.show').forEach(o=>o.classList.remove('show'));
}

function handleKeydown(e){
  if(e.key==='Escape'){
    const openOverlay=document.querySelector('.ai-overlay.show');
    if(openOverlay){ closeAllOverlays(); return; }
  }
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable) return;
  switch(e.key.toLowerCase()){
    case 'p': e.preventDefault(); timer.toggle(); break;
    case 'n': e.preventDefault(); const na=document.getElementById('note-area'); if(na) na.focus(); break;
    case 'r': e.preventDefault(); timer.reset(); break;
    case 's': e.preventDefault(); openStats(); break;
    case 'd': e.preventDefault(); toggleTheme(); break;
    case 'q': e.preventDefault(); switchTab('quiz'); break;
    case '1': e.preventDefault(); switchTab('dashboard'); break;
    case '2': e.preventDefault(); switchTab('training'); break;
    case '3': e.preventDefault(); switchTab('quiz'); break;
  }
}

const RFS={st,prog,wkm,tasks,his,act,note,hdr,qt,rm};
function rf(...ks){ ks.forEach(k=>RFS[k]?.()); }

function bindTimerDurEvents(){
  document.querySelectorAll('.tmr-dur-btn').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('.tmr-dur-btn').forEach(function(x){x.classList.remove('act');});
      this.classList.add('act');
      timer.setDuration(parseInt(this.dataset.dur));
    });
  });
}

function bindEvents(){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>switchTab(btn.dataset.tab));
  });
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{ switchTab(btn.dataset.tab); closeSidebar(); });
  });
  const sidebarToggle=document.getElementById('sidebar-toggle');
  if(sidebarToggle) sidebarToggle.addEventListener('click',toggleSidebar);
  const sidebarOverlay=document.getElementById('sidebar-overlay');
  if(sidebarOverlay) sidebarOverlay.addEventListener('click',closeSidebar);
  const themeBtn=document.getElementById('theme-btn');
  if(themeBtn) themeBtn.addEventListener('click',toggleTheme);
  const chatBtn=document.getElementById('btn-open-chat');
  if(chatBtn) chatBtn.addEventListener('click',()=>openChat());
  const btnStats=document.getElementById('btn-stats');
  if(btnStats) btnStats.addEventListener('click',openStats);
  const btnExport=document.getElementById('btn-export');
  if(btnExport) btnExport.addEventListener('click',exp);
  const btnExport2=document.getElementById('btn-export2');
  if(btnExport2) btnExport2.addEventListener('click',exp);
  const btnImport=document.getElementById('btn-import');
  if(btnImport) btnImport.addEventListener('click',()=>document.getElementById('file-input')?.click());
  const fileInput=document.getElementById('file-input');
  if(fileInput) fileInput.addEventListener('change',imp);
  const btnReset=document.getElementById('btn-reset');
  if(btnReset){
    btnReset.addEventListener('click',function(){
      var c=prompt('输入 "确认" 以永久删除所有数据（不可恢复）：');
      if(c!=='确认'){ tst('重置已取消'); return; }
      localStorage.removeItem(APP_STORAGE_KEY);
      localStorage.removeItem(APP_STORAGE_KEY_OLD);
      location.reload();
    });
  }
  const noteSave=document.getElementById('note-save');
  if(noteSave) noteSave.addEventListener('click',sav);
  const tmrToggle=document.getElementById('tmr-toggle');
  if(tmrToggle) tmrToggle.addEventListener('click',()=>timer.toggle());
  const tmrReset=document.getElementById('tmr-reset');
  if(tmrReset) tmrReset.addEventListener('click',()=>timer.reset());
  bindTimerDurEvents();
  const aiSend=document.getElementById('ai-send');
  if(aiSend) aiSend.addEventListener('click',sendMessage);
  const aiQuestion=document.getElementById('ai-question');
  if(aiQuestion){
    aiQuestion.addEventListener('keydown',function(e){
      if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); }
    });
  }
  document.querySelectorAll('.ai-panel-close').forEach(btn=>{
    btn.addEventListener('click',closeAllOverlays);
  });
  document.querySelectorAll('.ai-overlay').forEach(overlay=>{
    overlay.addEventListener('click',function(e){
      if(e.target===this) closeAllOverlays();
    });
  });
  document.addEventListener('keydown',handleKeydown);
  const apiConfigLink=document.getElementById('api-config-link');
  if(apiConfigLink){
    apiConfigLink.addEventListener('click',function(){
      const current=localStorage.getItem('lb-api-url')||DEFAULT_API_URL;
      const url=prompt('请输入 opencode API 地址：',current);
      if(url&&url.trim()){ setApiUrl(url.trim()); tst('<i data-lucide="check-circle" style="width:11px;height:11px"></i> API 地址已更新','success'); }
    });
  }
  const chatOverlay=document.getElementById('ai-overlay');
  if(chatOverlay) chatOverlay.addEventListener('keydown',function(e){
    if(e.key==='Escape') closeChat();
  });
  const statsOverlay=document.getElementById('stats-overlay');
  if(statsOverlay) statsOverlay.addEventListener('keydown',function(e){
    if(e.key==='Escape') closeStats();
  });
}

function init(){
  try{
    initTheme();
    const appEl=document.querySelector('.app');
    if(appEl) appEl.classList.add('app-in');
    const topbarEl=document.querySelector('.topbar');
    if(topbarEl) topbarEl.classList.add('topbar-in');
    const savedTab=(()=>{try{return localStorage.getItem('lb-active-tab');}catch{return null;}})();
    switchTab(savedTab||'dashboard');
    rf('qt','st','prog','wkm','rm','tasks','note','his','act');
    timer.render();
    if(typeof initQuiz==='function') initQuiz();
    bindEvents();
    if(typeof bindTrainingEvents==='function') bindTrainingEvents();
    setTimeout(stagger,200);
    if('Notification' in window && Notification.permission==='default'){
      Notification.requestPermission();
    }
    checkBackupReminder();
    if(typeof lucide!=='undefined') lucide.createIcons();
  }catch(e){
    console.error('Init:',e);
    tst('<i data-lucide="alert-triangle" style="width:11px;height:11px"></i> '+e.message,'error');
  }
}

function checkBackupReminder(){
  var last=safeGet('lb-backup-check','');
  if(!last){ safeSet('lb-backup-check',td()); return; }
  var diff=Math.floor((new Date(td()+'T12:00:00')-new Date(last+'T12:00:00'))/(86400000));
  if(diff>=7) tst('<i data-lucide="download" style="width:11px;height:11px"></i> 已 '+diff+' 天未备份，建议导出数据');
}

function stagger(){
  let idx=0;
  document.querySelectorAll('.feed-card, .feed-stat, .tsk, .sidebar-card, .tmr-card').forEach((el)=>{
    el.style.animationDelay=(80+idx*60)+'ms';
    idx++;
  });
}

document.addEventListener('DOMContentLoaded',init);
