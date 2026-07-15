// QUIZ_COLORS defined in quiz-data.js

var quizState = {
  view: 'subjects', subject: null, mode: 'random',
  current: 0, order: [], done: false, size: 10
};

function getQuizProgress(){ return safeGet(QUIZ_STORAGE_KEY,{}); }
function setQuizProgress(p){ safeSet(QUIZ_STORAGE_KEY,p); }

function getSubjectStats(subjectId){
  var p=getQuizProgress(), s=p[subjectId];
  if(!s) return { done:0, total:0, wrong:0, review:0, correct:0 };
  var total=QUIZ_QUESTIONS[subjectId]?.length||0;
  var wrong=Object.keys(s.wrong||{}), review=0;
  var today=getTodayStr();
  wrong.forEach(function(id){
    var w=s.wrong[id];
    if(w.nextReviewDate && w.nextReviewDate <= today) review++;
  });
  var correct=s.done?total-wrong.length:0;
  return {
    done:s.done?.length||0, total:total,
    wrong:wrong.length, review:review,
    correct:Math.max(0,correct)
  };
}

function svgRing(r, pct, color){
  var c=2*Math.PI*r, off=c*(1-pct/100);
  return '<svg class="quiz-card-ring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="'+(r-2)+'" fill="none" stroke="var(--surface)" stroke-width="3.5"/><circle cx="24" cy="24" r="'+(r-2)+'" fill="none" stroke="'+color+'" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" transform="rotate(-90,24,24)" style="transition:stroke-dashoffset .6s ease"/><text x="24" y="24" text-anchor="middle" dominant-baseline="central" font-family="var(--f-mono)" font-size="11" font-weight="600" fill="'+color+'">'+pct+'%</text></svg>';
}

// ── render dispatch ──
function renderQuiz(){
  var el=document.getElementById('quiz-app');
  if(!el) return;
  switch(quizState.view){
    case'subjects':renderSubjectGrid(el);break;
    case'mode-picker':renderModePicker(el);break;
    case'session':quizRenderQuestion(el);break;
    case'result':renderResult(el);break;
    case'review':renderReview(el);break;
    case'browse':renderBrowser(el);break;
  }
}
function initQuiz(){ renderQuiz(); }

// ── subject grid ──
function renderSubjectGrid(el){
  var totalDone=0,totalAll=0,totalReview=0,totalWrong=0;
  QUIZ_SUBJECTS.forEach(function(s){
    var st=getSubjectStats(s.id);
    totalDone+=st.done; totalAll+=st.total; totalReview+=st.review; totalWrong+=st.wrong;
  });
  var html='<div class="quiz-hdr">'
    +'<div class="quiz-hdr-l">'
    +'<span class="quiz-hdr-icon"><i data-lucide="file-text" style="width:13px;height:13px"></i></span>'
    +'<div><div class="quiz-hdr-title">刷题</div>'
    +'<div class="quiz-hdr-sub">'+totalDone+'/'+totalAll+' 题'
    +(totalReview?' · <span style="color:var(--danger)">'+totalReview+' 题待复习</span>':'')
    +'</div></div></div>'
    +'<div class="quiz-hdr-actions">'
    +'<button class="sb sb-sm" onclick="resetAllQuiz()" style="padding:4px 8px;font-size:9px"><i data-lucide="refresh-ccw" style="width:9px;height:9px"></i>重置</button>'
    +'</div></div>'
    +'<div class="quiz-grid">';
  QUIZ_SUBJECTS.forEach(function(s,i){
    var st=getSubjectStats(s.id), color=QUIZ_COLORS[s.id]||'var(--primary)';
    var pct=st.total?Math.round(st.done/st.total*100):0;
    var acc=st.done?Math.round(st.correct/st.done*100):0;
    html+='<div class="quiz-card quiz-card-in" style="animation-delay:'+(i*80)+'ms" onclick="pickSubject(\''+s.id+'\')">'
      +'<div class="quiz-card-icon"><i data-lucide="'+s.icon+'" style="width:22px;height:22px"></i></div>'
      +'<div class="quiz-card-name">'+s.name+'</div>'
      +svgRing(24,pct,color)
      +'<div class="quiz-card-stat">'+st.done+'/'+st.total+' 题'
      +(st.wrong?'<span class="quiz-card-dot">·</span>'+st.wrong+' 错题':'')
      +(st.done?'<span class="quiz-card-dot">·</span>'+acc+'% 正确率':'')
      +(st.review?'<br><span style="color:var(--danger)"><i data-lucide="pin" style="width:9px;height:9px"></i> '+st.review+' 待复习</span>':'')
      +'</div></div>';
  });
  html+='</div>';
  el.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function pickSubject(subjectId){
  quizState.subject=subjectId;
  quizState.view='mode-picker';
  renderQuiz();
}

// ── mode picker ──
function renderModePicker(el){
  var s=QUIZ_SUBJECTS.find(function(x){return x.id===quizState.subject;});
  var st=getSubjectStats(quizState.subject);
  var hasWrong=st.wrong>0;
  var html='<div class="quiz-hdr">'
    +'<div class="quiz-hdr-l">'
    +'<span class="quiz-hdr-icon"><i data-lucide="'+s.icon+'" style="width:13px;height:13px"></i></span>'
    +'<div><div class="quiz-hdr-title">'+s.name+'</div>'
    +'<div class="quiz-hdr-sub">请选择练习模式</div></div></div>'
    +'<button class="sb sb-sm" onclick="exitQuiz()" style="padding:4px 8px;font-size:9px">← 返回</button>'
    +'</div>'
    +'<div class="quiz-modes">';
  var modes=[
    {id:'sequential',icon:'file-text',name:'顺序练习',desc:'按题库顺序逐题练习'},
    {id:'random',icon:'shuffle',name:'随机抽题',desc:'从题库随机抽取'+quizState.size+'题'}
  ];
  if(hasWrong) modes.push({id:'review',icon:'clipboard-list',name:'错题复习',desc:st.review+'题等待复习'});
  modes.push({id:'browse',icon:'book-open',name:'浏览题库',desc:'查看所有题目和答案'});
  modes.forEach(function(m){
    html+='<div class="quiz-mode" onclick="startMode(\''+m.id+'\')">'
      +'<div class="quiz-mode-icon"><i data-lucide="'+m.icon+'" style="width:18px;height:18px"></i></div>'
      +'<div><div class="quiz-mode-name">'+m.name+'</div>'
      +'<div class="quiz-mode-desc">'+m.desc+'</div></div>'
      +'</div>';
  });
  html+='</div>';
  el.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function startMode(mode){
  quizState.mode=mode;
  var questions=QUIZ_QUESTIONS[quizState.subject];
  if(!questions||!questions.length) return;
  if(mode==='browse'){ quizState.view='browse'; renderQuiz(); return; }
  var order=[];
  if(mode==='sequential'){
    order=questions.map(function(_,i){return i;});
  }else if(mode==='review'){
    var p=getQuizProgress(), sub=p[quizState.subject];
    if(sub&&sub.wrong){
      var today=getTodayStr();
      order=questions.reduce(function(arr,q,i){
        var w=sub.wrong[q.id];
        if(w&&w.nextReviewDate&&w.nextReviewDate<=today) arr.push(i);
        return arr;
      },[]);
    }
  }else{ // random
    var size=Math.min(quizState.size,questions.length);
    var pool=questions.map(function(_,i){return i;});
    shuffleArray(pool);
    order=pool.slice(0,size);
  }
  if(!order.length){ tst('当前没有可做的题目','error'); return; }
  quizState.order=order;
  quizState.current=0;
  quizState.done=false;
  quizState.view='session';
  renderQuiz();
}

// ── session (quick answer mode) ──
function quizRenderQuestion(el){
  var questions=QUIZ_QUESTIONS[quizState.subject];
  if(!questions||!quizState.order.length||quizState.current>=quizState.order.length){ exitQuiz(); return; }
  var idx=quizState.order[quizState.current];
  var q=questions[idx];
  if(!q){ exitQuiz(); return; }
  var p=getQuizProgress();
  var sub=p[quizState.subject]||{};
  var isWrong=q.id in (sub.wrong||{});
  var isDone=sub.done?.includes(q.id);
  var total=quizState.order.length;
  var pct=total>0?Math.round(quizState.current/total*100):0;
  var modeLabel={sequential:'顺序练习',random:'随机抽题',review:'错题复习'}[quizState.mode]||'';
  var s=QUIZ_SUBJECTS.find(function(x){return x.id===quizState.subject;});

  var html='<div class="tc-inner" style="padding:0"><div class="glass"><div class="tc-inner">';
  html+='<div class="quiz-sess-hdr">'
    +'<div><span class="tc-label"><span><i data-lucide="'+s.icon+'" style="width:11px;height:11px"></i></span>'+s.name+' · '+modeLabel+'</span>'
    +'<div style="font-family:var(--f-mono);font-size:9px;color:var(--text3);margin-top:1px">第 '+(quizState.current+1)+'/'+total+' 题</div></div>'
    +'<button class="sb sb-sm" onclick="exitQuiz()" style="padding:3px 8px;font-size:9px"><i data-lucide="x" style="width:9px;height:9px"></i> 退出</button>'
    +'</div>';
  html+='<div class="tc-bgt-prog"><div class="tc-bgt-bar"><div class="tc-bgt-fill" style="width:'+pct+'%"></div></div></div>';
  html+='<div style="margin:8px 0 4px"><span class="ttg-el" style="background:'+(q.difficulty===1?'var(--success-dim)':q.difficulty===2?'var(--primary-dim)':'var(--blue-dim)')+';color:'+(q.difficulty===1?'var(--success)':q.difficulty===2?'var(--primary)':'var(--blue)')+'">'+['','简单','中等','困难'][q.difficulty]+'</span>';
  if(q.type==='judge') html+='<span class="ttg-el" style="background:var(--blue-dim);color:var(--blue);margin-left:4px">判断题</span>';
  html+='</div>';
  html+='<div class="quiz-q" style="font-size:15px;line-height:1.6;margin:8px 0 14px;font-weight:500">'+q.q+'</div>';

  if(quizState.done){
    // show feedback
    var p2=getQuizProgress(), sub2=p2[quizState.subject]||{};
    var wrongData=sub2.wrong?.[q.id];
    var isAnswerCorrect=wrongData===undefined;
    html+='<div class="tc-output quiz-fb-'+(isAnswerCorrect?'correct':'wrong')+'" style="min-height:auto;padding:12px;margin-bottom:10px">';
    html+='<div class="'+(isAnswerCorrect?'quiz-fb-correct':'quiz-fb-wrong')+'" style="color:'+(isAnswerCorrect?'var(--success)':'var(--danger)')+';font-weight:600;margin-bottom:6px">'+(isAnswerCorrect?'<i data-lucide="check-circle" style="width:13px;height:13px"></i> 正确':'<i data-lucide="x-circle" style="width:13px;height:13px"></i> 错误')+'</div>';
    if(!isAnswerCorrect&&q.type==='choice'){
      html+='<div style="font-size:12px;color:var(--text2)">你的答案：'+(q.o[wrongData.selected]||'未选择')+'</div>';
      html+='<div style="font-size:12px;color:var(--success)">正确答案：'+q.o[q.a]+'</div>';
    }else if(!isAnswerCorrect&&q.type==='judge'){
      html+='<div style="font-size:12px;color:var(--text2)">你的答案：'+(wrongData.selected===0?'正确':'错误')+'</div>';
      html+='<div style="font-size:12px;color:var(--success)">正确答案：'+(q.a?'正确':'错误')+'</div>';
    }
    if(q.e) html+='<div style="font-size:12px;color:var(--text3);margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,128,128,.08)"><i data-lucide="lightbulb" style="width:11px;height:11px"></i> '+q.e+'</div>';
    html+='</div>';
    // keyboard hint
    html+='<div class="tc-row" style="justify-content:space-between">'
      +'<span style="font-size:10px;color:var(--text3);font-family:var(--f-mono)">按 Enter 下一题 · Esc 退出</span>'
      +'<button class="tc-btn tc-btn-sm" id="quiz-next-btn" onclick="nextQuestion()">下一题 →</button>'
      +'</div>';
    html+='</div></div></div>';
  }else{
    // choice options
    if(q.type==='choice'){
      q.o.forEach(function(opt,i){
        html+='<label class="quiz-opt" data-idx="'+i+'" onclick="quickAnswer(this,'+i+')">'
          +'<span class="quiz-opt-key">'+(i+1)+'</span>'
          +'<span class="quiz-opt-text">'+opt+'</span>'
          +'</label>';
      });
    }else{
      html+='<div class="tc-row" style="gap:12px;justify-content:center;margin:6px 0 12px">';
      html+='<label class="quiz-opt quiz-judge" data-idx="0" onclick="quickAnswer(this,0)"><span class="quiz-opt-key">1</span><span class="quiz-opt-text"><i data-lucide="check" style="width:11px;height:11px"></i> 正确</span></label>';
      html+='<label class="quiz-opt quiz-judge" data-idx="1" onclick="quickAnswer(this,1)"><span class="quiz-opt-key">2</span><span class="quiz-opt-text"><i data-lucide="x" style="width:11px;height:11px"></i> 错误</span></label>';
      html+='</div>';
    }
    html+='<div style="font-size:10px;color:var(--text3);font-family:var(--f-mono);text-align:center;margin-top:6px">按 1-4 快速选择</div>';
    html+='</div></div></div>';
  }
  el.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function quickAnswer(el,selectedIdx){
  if(quizState.done) return;
  var questions=QUIZ_QUESTIONS[quizState.subject];
  var idx=quizState.order[quizState.current];
  var q=questions[idx];
  // visual select
  document.querySelectorAll('.quiz-opt').forEach(function(x){ x.classList.remove('sel'); });
  el.classList.add('sel');
  // submit
  var p=getQuizProgress();
  if(!p[quizState.subject]) p[quizState.subject]={done:[],wrong:{}};
  var sub=p[quizState.subject];
  if(!sub.done.includes(q.id)) sub.done.push(q.id);
  var isCorrect=false;
  if(q.type==='choice'){ isCorrect=selectedIdx===q.a; }
  else{ isCorrect=(selectedIdx===0&&q.a)||(selectedIdx===1&&!q.a); }
  if(!isCorrect){
    var existing=sub.wrong[q.id];
    var level=existing?Math.min(existing.reviewLevel||0,QUIZ_MAX_REVIEW_LEVEL-1):0;
    sub.wrong[q.id]={selected:selectedIdx,correct:q.a,reviewLevel:level,lastReviewDate:getTodayStr(),nextReviewDate:calcNextReviewDate(level)};
  }else if(sub.wrong[q.id]){
    // correct answer on a previously wrong question — advance review level
    var w=sub.wrong[q.id];
    w.reviewLevel=(w.reviewLevel||0)+1;
    w.lastReviewDate=getTodayStr();
    if(w.reviewLevel>=QUIZ_MAX_REVIEW_LEVEL){
      delete sub.wrong[q.id]; // mastered
    }else{
      w.nextReviewDate=calcNextReviewDate(w.reviewLevel);
    }
  }
  setQuizProgress(p);
  quizState.done=true;
  renderQuiz();
}

function nextQuestion(){
  quizState.current++;
  quizState.done=false;
  if(quizState.current>=quizState.order.length){
    quizState.view='result'; renderQuiz(); return;
  }
  renderQuiz();
}

// ── result ──
function renderResult(el){
  var p=getQuizProgress(), sub=p[quizState.subject]||{};
  var questions=QUIZ_QUESTIONS[quizState.subject];
  var total=questions?.length||0;
  var done=sub.done?.length||0;
  var wrongCount=Object.keys(sub.wrong||{}).length;
  var correct=done-wrongCount;
  var pct=total?Math.round(done/total*100):0;
  var accuracy=done?Math.round(correct/done*100):0;
  var s=QUIZ_SUBJECTS.find(function(x){return x.id===quizState.subject;});
  var html='<div class="tc-inner" style="padding:0"><div class="glass"><div class="tc-inner" style="text-align:center;padding:28px 20px">';
  html+='<div class="quiz-q" style="font-size:40px;margin-bottom:6px">'+(accuracy>=80?'<i data-lucide="sparkles" style="width:36px;height:36px">':accuracy>=50?'<i data-lucide="muscle" style="width:36px;height:36px">':'<i data-lucide="book-open" style="width:36px;height:36px">')+'</i></div>';
  html+='<div style="font-family:var(--f-display);font-size:18px;font-weight:600;margin-bottom:2px"><i data-lucide="'+s.icon+'" style="width:14px;height:14px"></i> '+s.name+'</div>';
  html+='<div style="font-size:12px;color:var(--text3);margin-bottom:16px">本场完成 '+quizState.order.length+' 题</div>';
  html+='<div class="tc-bgt-card" style="max-width:260px;margin:0 auto 14px">';
  html+='<div class="num '+(accuracy>=80?'gn':accuracy>=50?'am':'')+'">'+correct+'/'+done+'</div>';
  html+='<div class="lb">正确率 '+accuracy+'%</div>';
  html+='<div class="tc-bgt-prog"><div class="tc-bgt-bar"><div class="tc-bgt-fill '+(accuracy>=80?'gn':'')+'" style="width:'+accuracy+'%"></div></div></div>';
  html+='</div>';
  html+='<div class="tc-bgt-card" style="max-width:260px;margin:0 auto 16px">';
  html+='<div class="num '+(pct>=100?'gn':'')+'">'+pct+'%</div>';
  html+='<div class="lb">总进度（'+done+'/'+total+'）</div>';
  html+='<div class="tc-bgt-prog"><div class="tc-bgt-bar"><div class="tc-bgt-fill '+(pct>=100?'gn':'')+'" style="width:'+pct+'%"></div></div></div>';
  html+='</div>';
  var hasWrong=Object.keys(sub.wrong||{}).length>0;
  html+='<div class="tc-row" style="justify-content:center;gap:8px">';
  html+='<button class="tc-btn tc-btn-sm" onclick="exitQuiz()">← 返回</button>';
  if(hasWrong) html+='<button class="tc-btn tc-btn-sm tc-btn-ghost" onclick="startMode(\'review\')"><i data-lucide="clipboard-list" style="width:11px;height:11px"></i> 错题复习</button>';
  html+='</div></div></div></div>';
  el.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

// ── question browser ──
function renderBrowser(el){
  var questions=QUIZ_QUESTIONS[quizState.subject];
  var s=QUIZ_SUBJECTS.find(function(x){return x.id===quizState.subject;});
  var html='<div class="quiz-hdr">'
    +'<div class="quiz-hdr-l">'
    +'<span class="quiz-hdr-icon"><i data-lucide="book-open" style="width:13px;height:13px"></i></span>'
    +'<div><div class="quiz-hdr-title"><i data-lucide="'+s.icon+'" style="width:13px;height:13px"></i> '+s.name+' — 题库浏览</div>'
    +'<div class="quiz-hdr-sub">共 '+questions.length+' 题，点击查看答案</div></div></div>'
    +'<button class="sb sb-sm" onclick="exitQuiz()" style="padding:4px 8px;font-size:9px">← 返回</button>'
    +'</div>'
    +'<div class="quiz-browse-filter">'
    +'<input class="tc-inp" id="quiz-filter-input" placeholder="搜索题目关键词..." style="flex:1;min-width:0" oninput="renderQuizBrowseList()">'
    +'<select class="tc-sel" id="quiz-filter-diff" style="width:auto;min-width:80px" onchange="renderQuizBrowseList()"><option value="">全部难度</option><option value="1">简单</option><option value="2">中等</option><option value="3">困难</option></select>'
    +'<select class="tc-sel" id="quiz-filter-type" style="width:auto;min-width:80px" onchange="renderQuizBrowseList()"><option value="">全部题型</option><option value="choice">选择题</option><option value="judge">判断题</option></select>'
    +'</div>'
    +'<div class="quiz-browse" id="quiz-browse-list"></div>';
  el.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
  renderQuizBrowseList();
}

function renderQuizBrowseList(){
  var questions=QUIZ_QUESTIONS[quizState.subject];
  if(!questions) return;
  var kw=(document.getElementById('quiz-filter-input')?.value||'').toLowerCase();
  var df=document.getElementById('quiz-filter-diff')?.value||'';
  var tp=document.getElementById('quiz-filter-type')?.value||'';
  var filtered=questions.filter(function(q,i){
    if(kw&&!q.q.toLowerCase().includes(kw)) return false;
    if(df&&q.difficulty!==parseInt(df)) return false;
    if(tp&&q.type!==tp) return false;
    return true;
  });
  var el=document.getElementById('quiz-browse-list');
  if(!el) return;
  if(!filtered.length){
    el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3)">没有匹配的题目</div>';
    return;
  }
  var html='';
  filtered.forEach(function(q,i){
    var diffLabel=['','简单','中等','困难'][q.difficulty];
    var diffColor=q.difficulty===1?'var(--success)':q.difficulty===2?'var(--primary)':'var(--blue)';
    html+='<div class="quiz-browse-card" onclick="toggleBrowseAnswer(this)">'
      +'<div class="quiz-browse-q"><span class="quiz-browse-num">'+(i+1)+'.</span> '
      +'<span class="ttg-el" style="background:'+diffColor.replace(')','-dim)').replace('var(--success)','var(--success-dim)').replace('var(--primary)','var(--primary-dim)').replace('var(--blue)','var(--blue-dim)')+';color:'+diffColor+'">'+diffLabel+'</span>'
      +(q.type==='judge'?' <span class="ttg-el" style="background:var(--blue-dim);color:var(--blue)">判断题</span>':'')
      +' <span>'+q.q+'</span></div>'
      +'<div class="quiz-browse-a" style="display:none">'
      +'<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,128,128,.06)">'
      +'<span style="color:var(--success);font-weight:500"><i data-lucide="check-circle" style="width:11px;height:11px"></i> 答案：'+(q.type==='choice'?q.o[q.a]:(q.a?'正确':'错误'))+'</span>'
      +(q.e?'<div style="font-size:12px;color:var(--text3);margin-top:4px"><i data-lucide="lightbulb" style="width:11px;height:11px"></i> '+q.e+'</div>':'')
      +'</div></div></div>';
  });
  el.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function toggleBrowseAnswer(el){
  var a=el.querySelector('.quiz-browse-a');
  if(a) a.style.display=a.style.display==='block'?'none':'block';
}

// ── wrong answer review ──
function renderReview(el){
  var p=getQuizProgress(), sub=p[quizState.subject]||{};
  var wrong=sub.wrong||{};
  var questions=QUIZ_QUESTIONS[quizState.subject]||[];
  var s=QUIZ_SUBJECTS.find(function(x){return x.id===quizState.subject;});
  var html='<div class="quiz-hdr">'
    +'<div class="quiz-hdr-l">'
    +'<span class="quiz-hdr-icon"><i data-lucide="clipboard-list" style="width:13px;height:13px"></i></span>'
    +'<div><div class="quiz-hdr-title"><i data-lucide="'+s.icon+'" style="width:13px;height:13px"></i> '+s.name+' — 错题本</div>'
    +'<div class="quiz-hdr-sub">共 '+Object.keys(wrong).length+' 道错题</div></div></div>'
    +'<button class="sb sb-sm" onclick="exitQuiz()" style="padding:4px 8px;font-size:9px">← 返回</button>'
    +'</div>'
    +'<div class="quiz-browse">';
  var wrongList=questions.filter(function(q){return q.id in wrong;});
  if(!wrongList.length){
    html+='<div style="text-align:center;padding:40px;color:var(--text3)"><i data-lucide="sparkles" style="width:24px;height:24px"></i> 没有错题！</div>';
  }else{
    wrongList.forEach(function(q,i){
      var w=wrong[q.id];
      var levelLabel=['','新错题','已复习1次','已复习2次'][w.reviewLevel]||'';
      html+='<div class="quiz-browse-card" onclick="toggleBrowseAnswer(this)">'
        +'<div class="quiz-browse-q"><span class="quiz-browse-num">'+(i+1)+'.</span>'
        +' <span>'+q.q+'</span>'
        +(levelLabel?' <span class="ttg-el" style="background:var(--primary-dim);color:var(--primary)">'+levelLabel+'</span>':'')
        +'</div>'
        +'<div class="quiz-browse-a" style="display:none">'
        +'<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,128,128,.06)">'
        +'<div style="font-size:12px;color:var(--danger)"><i data-lucide="x-circle" style="width:11px;height:11px"></i> 你的答案：'+(q.type==='choice'?q.o[w.selected]:(w.selected===0?'正确':'错误'))+'</div>'
        +'<div style="font-size:12px;color:var(--success);margin-top:2px"><i data-lucide="check-circle" style="width:11px;height:11px"></i> 答案：'+(q.type==='choice'?q.o[w.correct]:(w.correct?'正确':'错误'))+'</div>'
        +(q.e?'<div style="font-size:12px;color:var(--text3);margin-top:4px;padding-top:4px;border-top:1px solid rgba(128,128,128,.06)"><i data-lucide="lightbulb" style="width:11px;height:11px"></i> '+q.e+'</div>':'')
        +'</div></div></div>';
    });
    html+='<div class="tc-row" style="margin-top:8px"><button class="tc-btn tc-btn-sm tc-btn-ghost" onclick="clearWrong(\''+quizState.subject+'\')"><i data-lucide="trash-2" style="width:11px;height:11px"></i> 清空此科目错题</button></div>';
  }
  html+='</div>';
  el.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function clearWrong(subjectId){
  if(!confirm('确定清空此科目所有错题记录？')) return;
  var p=getQuizProgress();
  if(p[subjectId]){ p[subjectId].wrong={}; setQuizProgress(p); }
  renderQuiz();
}

function exitQuiz(){
  quizState.view='subjects'; quizState.subject=null;
  renderQuiz();
}

function shuffleArray(arr){
  for(var i=arr.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;
  }
}

function resetAllQuiz(){
  if(!confirm('确定重置所有科目的刷题进度？此操作不可恢复！')) return;
  localStorage.removeItem(QUIZ_STORAGE_KEY);
  tst('<i data-lucide="refresh-ccw" style="width:11px;height:11px"></i> 刷题进度已重置','success');
  renderQuiz();
}

// ── keyboard shortcuts ──
document.addEventListener('keydown',function(e){
  if(quizState.view==='session'){
    var q=QUIZ_QUESTIONS[quizState.subject];
    var idx=quizState.order[quizState.current];
    var question=q&&q[idx];
    if(!question) return;
    if(!quizState.done){
      // 1-4 select option
      var num=parseInt(e.key);
      if(num>=1&&num<=4){
        if(question.type==='choice'&&num<=question.o.length){
          var opt=document.querySelector('.quiz-opt[data-idx="'+(num-1)+'"]');
          if(opt) quickAnswer(opt,num-1);
        }else if(question.type==='judge'&&num<=2){
          var opt2=document.querySelector('.quiz-opt[data-idx="'+(num-1)+'"]');
          if(opt2) quickAnswer(opt2,num-1);
        }
      }
    }else{
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        nextQuestion();
      }
    }
  }
  if(e.key==='Escape'){
    if(quizState.view==='session'||quizState.view==='browse'||quizState.view==='mode-picker'||quizState.view==='result'||quizState.view==='review'){
      e.preventDefault();
      exitQuiz();
    }
  }
});
