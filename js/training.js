function shuffleArray(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

/* ── Storage ── */
var TRAINING_HISTORY_KEY = 'drone-exam-history';

function loadExamHistory(){
  try{ return JSON.parse(localStorage.getItem(TRAINING_HISTORY_KEY))||[]; }catch(_){ return []; }
}
function saveExamResult(result){
  var h=loadExamHistory();
  h.unshift(result);
  if(h.length>50) h=h.slice(0,50);
  try{ localStorage.setItem(TRAINING_HISTORY_KEY,JSON.stringify(h)); }catch(_){}
}

/* ── CAAC Exam Simulator ── */
var EXAM_SUBJECTS = [{id:'all',name:'综合随机'}].concat(QUIZ_SUBJECTS.map(function(s){return{id:s.id,name:s.name}}));
var EXAM_COUNTS = [10,20,30,0];
var EXAM_TIMES = [{label:'不限时',value:0},{label:'15分钟',value:900},{label:'30分钟',value:1800},{label:'45分钟',value:2700}];
var examState = {
  active:false,questions:[],current:0,answers:{},flagged:{},
  timeLimit:0,timeRemaining:0,timer:null,startTime:null,completed:false,
  subject:'all',totalQuestions:0,correctCount:0,endTime:null,filter:'all'
};

function renderExamSimulator(){
  var el=$('tab-training');
  if(!el)return;
  var html='<div class="tc-inner" style="padding:0"><div class="glass"><div class="tc-inner" id="exam-app">';
  html+='<div class="tc-label"><i data-lucide="graduation-cap" style="width:12px;height:12px"></i>CAAC 考证模拟器</div>';
  html+='<div class="tc-sub">基于题库的限时模拟考试，覆盖全部 12 个科目</div>';
  html+='<div style="margin-bottom:6px"><div class="tc-label">考试科目</div>';
  html+='<select class="tc-sel" id="exam-subject">';
  EXAM_SUBJECTS.forEach(function(s,i){
    html+='<option value="'+s.id+'"'+(i===0?' selected':'')+'>'+s.name+'</option>';
  });
  html+='</select></div>';
  html+='<div class="tc-row"><div style="flex:1"><div class="tc-label">题目数量</div>';
  html+='<select class="tc-sel" id="exam-count">';
  EXAM_COUNTS.forEach(function(c){
    html+='<option value="'+c+'">'+(c===0?'全部题目':c+' 题')+'</option>';
  });
  html+='</select></div>';
  html+='<div style="flex:1"><div class="tc-label">时间限制</div>';
  html+='<select class="tc-sel" id="exam-time">';
  EXAM_TIMES.forEach(function(t){
    html+='<option value="'+t.value+'">'+t.label+'</option>';
  });
  html+='</select></div></div>';
  html+='<button class="tc-btn" id="btn-start-exam" style="margin-top:4px"><i data-lucide="play" style="width:12px;height:12px;vertical-align:-1px"></i> 开始考试</button>';
  var h=loadExamHistory();
  if(h.length){
    html+='<button class="tc-btn tc-btn-ghost" id="btn-view-history" style="margin-top:4px;width:100%"><i data-lucide="clock" style="width:12px;height:12px;vertical-align:-1px"></i> 查看考试历史 ('+h.length+'次)</button>';
  }
  html+='</div></div></div>';
  var grid=el.querySelector('.tools-grid');
  if(!grid) return;
  grid.innerHTML=html;
  grid.id='exam-container';
  if(typeof lucide!=='undefined') lucide.createIcons();
  var btn=$('btn-start-exam');
  if(btn) btn.onclick=function(){
    var sub=$('exam-subject')?.value||'all';
    var cnt=parseInt($('exam-count')?.value)||0;
    var tim=parseInt($('exam-time')?.value)||0;
    startExam({subject:sub,count:cnt,timeLimit:tim});
  };
  var histBtn=$('btn-view-history');
  if(histBtn) histBtn.onclick=renderExamHistory;
}

function renderExamHistory(){
  var el=$('exam-app');
  if(!el)return;
  var h=loadExamHistory();
  var html='<div class="tc-label"><i data-lucide="clock" style="width:12px;height:12px"></i>考试历史</div>';
  html+='<button class="tc-btn tc-btn-sm tc-btn-ghost" onclick="renderExamSimulator()" style="margin-bottom:6px"><i data-lucide="arrow-left" style="width:10px;height:10px"></i> 返回</button>';
  if(!h.length){
    html+='<div style="text-align:center;padding:30px;color:var(--text3);font-family:var(--f-mono);font-size:13px">暂无考试记录</div>';
    el.innerHTML=html; return;
  }
  var total=h.length, passed=h.filter(function(r){return r.passed;}).length;
  var avgScore=Math.round(h.reduce(function(s,r){return s+r.pct;},0)/total);
  html+='<div class="tc-row" style="gap:6px;margin-bottom:10px">';
  html+='<div class="tc-bgt-card" style="flex:1;text-align:center;padding:10px"><div class="num">'+total+'</div><div class="lb">考试次数</div></div>';
  html+='<div class="tc-bgt-card" style="flex:1;text-align:center;padding:10px"><div class="num '+(avgScore>=70?'gn':'')+'">'+avgScore+'%</div><div class="lb">平均分</div></div>';
  html+='<div class="tc-bgt-card" style="flex:1;text-align:center;padding:10px"><div class="num '+(passed/total>=0.7?'gn':'')+'">'+passed+'/'+total+'</div><div class="lb">通过次数</div></div>';
  html+='</div>';
  html+='<div style="max-height:360px;overflow-y:auto">';
  h.forEach(function(r,i){
    var dateStr=r.date?r.date.slice(0,16).replace('T',' '):'';
    var subName=EXAM_SUBJECTS.find(function(s){return s.id===r.subject;});
    html+='<div class="exam-hist-item" onclick="reviewExamHistory('+i+')">';
    html+='<div class="exam-hist-left"><div class="exam-hist-sub">'+(subName?subName.name:'综合')+'</div>';
    html+='<div class="exam-hist-date">'+dateStr+'</div></div>';
    html+='<div class="exam-hist-right"><span class="exam-hist-score '+(r.passed?'pass':'fail')+'">'+r.correct+'/'+r.total+'</span>';
    html+='<span class="exam-hist-pct">'+r.pct+'%</span>';
    html+='<span class="exam-hist-time">'+r.time+'</span></div></div>';
  });
  html+='</div>';
  html+='<button class="tc-btn tc-btn-sm tc-btn-ghost" onclick="if(confirm(\'确定清空所有考试历史？\')){localStorage.removeItem(TRAINING_HISTORY_KEY);renderExamHistory();}" style="margin-top:8px;color:var(--danger);border-color:rgba(220,38,38,0.3)"><i data-lucide="trash-2" style="width:10px;height:10px"></i> 清空历史</button>';
  el.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function reviewExamHistory(index){
  var h=loadExamHistory();
  var r=h[index];
  if(!r)return;
  examState.questions=r.questions||[];
  examState.answers=r.answers||{};
  examState.flagged=r.flagged||{};
  examState.totalQuestions=r.total||0;
  examState.correctCount=r.correct||0;
  examState.filter='all';
  renderResults();
}

function startExam(config){
  var pool=[];
  if(config.subject==='all'){
    QUIZ_SUBJECTS.forEach(function(s){
      var qs=QUIZ_QUESTIONS[s.id];
      if(qs) pool=pool.concat(qs);
    });
  }else{
    pool=QUIZ_QUESTIONS[config.subject]||[];
  }
  if(!pool.length){tst('题库为空','error');return;}
  shuffleArray(pool);
  var count=config.count;
  if(count<=0||count>pool.length) count=pool.length;
  examState.questions=pool.slice(0,count);
  examState.current=0;
  examState.answers={};
  examState.flagged={};
  examState.active=true;
  examState.completed=false;
  examState.subject=config.subject;
  examState.totalQuestions=count;
  examState.correctCount=0;
  examState.filter='all';
  examState.startTime=new Date();
  examState.endTime=null;
  if(config.timeLimit>0){
    examState.timeLimit=config.timeLimit;
    examState.timeRemaining=config.timeLimit;
    startTimer();
  }else{
    examState.timeLimit=0;
    examState.timeRemaining=0;
  }
  renderQuestion();
}

function startTimer(){
  if(examState.timer) clearInterval(examState.timer);
  examState.timer=setInterval(function(){
    examState.timeRemaining--;
    if(examState.timeRemaining<=0){
      examState.timeRemaining=0;
      clearInterval(examState.timer);
      examState.timer=null;
      tst('时间到！自动交卷','error');
      submitExam();
      return;
    }
    updateTimerDisplayUI();
  },1000);
}

function updateTimerDisplayUI(){
  var el=$('exam-timer-display');
  if(!el)return;
  var m=Math.floor(examState.timeRemaining/60);
  var s=examState.timeRemaining%60;
  el.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  el.style.color=examState.timeRemaining<=60?'var(--danger)':examState.timeRemaining<=300?'#F59E0B':'';
}

function getElapsedTime(){
  if(!examState.startTime) return '00:00';
  var end=examState.endTime||new Date();
  var sec=Math.floor((end-examState.startTime)/1000);
  var m=Math.floor(sec/60);
  var s=sec%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function renderQuestion(){
  var el=$('exam-app');
  if(!el)return;
  var q=examState.questions[examState.current];
  if(!q){submitExam();return;}
  var total=examState.totalQuestions;
  var idx=examState.current;
  var answered=Object.keys(examState.answers).length;
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
  html+='<div class="tc-label" style="margin-bottom:0"><i data-lucide="graduation-cap" style="width:12px;height:12px"></i>CAAC 模拟考试</div>';
  if(examState.timeLimit>0){
    html+='<div class="exam-timer-badge" id="exam-timer-display" style="font-family:var(--f-mono);font-size:14px;font-weight:600">'+getTimeDisplay()+'</div>';
  }
  html+='</div>';
  html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html+='<div style="font-family:var(--f-display);font-size:15px;font-weight:600">第 '+(idx+1)+' 题 / '+total+'</div>';
  html+='<div style="display:flex;gap:6px">';
  html+='<button class="tc-btn tc-btn-sm '+(examState.flagged[q.id]?'':'tc-btn-ghost')+'" id="btn-flag" style="padding:4px 10px;font-size:10px'+(examState.flagged[q.id]?';border-color:var(--accent);color:var(--accent);background:var(--accent-dim)':'')+'"><i data-lucide="'+(examState.flagged[q.id]?'star':'star')+'" style="width:11px;height:11px;'+(examState.flagged[q.id]?'fill:var(--accent);color:var(--accent)':'')+'"></i> '+(examState.flagged[q.id]?'已星标':'星标')+'</button>';
  html+='<button class="tc-btn tc-btn-sm tc-btn-ghost" id="btn-exit-exam" style="padding:4px 10px;font-size:10px;color:var(--danger);border-color:rgba(220,38,38,0.3)"><i data-lucide="x" style="width:11px;height:11px"></i> 退出</button>';
  html+='</div></div>';
  html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
  html+='<div class="exam-progress-bar" style="flex:1"><div class="exam-progress-fill" style="width:'+(total>0?Math.round(answered/total*100):0)+'%"></div></div>';
  html+='<span style="font-family:var(--f-mono);font-size:10px;color:var(--text3);white-space:nowrap">'+answered+'/'+total+' 已答</span>';
  html+='</div>';
  var subjectName=QUIZ_SUBJECTS.find(function(s){return s.id===q.id.split('-')[0];});
  html+='<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">';
  html+='<span class="ttg-el" style="background:var(--primary-dim);color:var(--primary)">'+(subjectName?subjectName.name:'未知')+'</span>';
  html+='<span class="ttg-el" style="background:'+(q.difficulty===1?'var(--success-dim)':q.difficulty===2?'var(--primary-dim)':'var(--blue-dim)')+';color:'+(q.difficulty===1?'var(--success)':q.difficulty===2?'var(--primary)':'var(--blue)')+'">'+['','简单','中等','困难'][q.difficulty]+'</span>';
  if(q.type==='judge') html+='<span class="ttg-el" style="background:var(--blue-dim);color:var(--blue)">判断题</span>';
  html+='</div>';
  html+='<div class="quiz-q" style="font-size:15px;line-height:1.7;margin-bottom:14px;font-weight:500;padding:0 2px">'+q.q+'</div>';
  if(q.type==='choice'){
    q.o.forEach(function(opt,i){
      var sel=examState.answers[q.id]===i?' sel':'';
      html+='<label class="quiz-opt'+sel+'" data-idx="'+i+'" onclick="selectAnswer(\''+q.id+'\','+i+')"><span class="quiz-opt-key">'+(i+1)+'</span><span class="quiz-opt-text">'+opt+'</span></label>';
    });
  }else{
    html+='<div class="tc-row" style="gap:12px;justify-content:center;margin-bottom:12px">';
    var s0=examState.answers[q.id]===0?' sel':'';
    var s1=examState.answers[q.id]===1?' sel':'';
    html+='<label class="quiz-opt quiz-judge'+s0+'" data-idx="0" onclick="selectAnswer(\''+q.id+'\',0)"><span class="quiz-opt-key">1</span><span class="quiz-opt-text"><i data-lucide="check" style="width:11px;height:11px"></i> 正确</span></label>';
    html+='<label class="quiz-opt quiz-judge'+s1+'" data-idx="1" onclick="selectAnswer(\''+q.id+'\',1)"><span class="quiz-opt-key">2</span><span class="quiz-opt-text"><i data-lucide="x" style="width:11px;height:11px"></i> 错误</span></label>';
    html+='</div>';
  }
  html+='<div style="font-size:9px;color:var(--text3);font-family:var(--f-mono);text-align:center;margin:2px 0 6px">按 1-4 快速选择 · Enter 下一题 · F 星标 · Esc 退出</div>';
  html+='<div class="tc-row" style="justify-content:space-between;margin-top:8px">';
  html+='<button class="tc-btn tc-btn-sm tc-btn-ghost" id="btn-prev"'+(idx===0?' disabled style="opacity:.4"':'')+'"><i data-lucide="chevron-left" style="width:10px;height:10px"></i> 上一题</button>';
  html+='<button class="tc-btn tc-btn-sm" id="btn-submit-exam" style="border-color:var(--danger);color:var(--danger);background:var(--danger-dim)"><i data-lucide="file-check" style="width:10px;height:10px"></i> 交卷</button>';
  if(idx<total-1){
    html+='<button class="tc-btn tc-btn-sm" id="btn-next">下一题 <i data-lucide="chevron-right" style="width:10px;height:10px"></i></button>';
  }else{
    html+='<button class="tc-btn tc-btn-sm tc-btn-ghost" id="btn-next" disabled style="opacity:.4">最后一题</button>';
  }
  html+='</div>';
  html+='<div class="exam-dots" style="margin-top:8px">';
  for(var i=0;i<total;i++){
    var cls='exam-dot';
    var eq=examState.questions[i];
    if(i===idx) cls+=' current';
    if(examState.flagged[eq&&eq.id]) cls+=' flagged';
    if(examState.answers[eq&&eq.id]!==undefined) cls+=' answered';
    html+='<div class="'+cls+'" onclick="goToQuestion('+i+')" title="第'+(i+1)+'题'+(examState.answers[eq&&eq.id]!==undefined?'·已答':'')+(examState.flagged[eq&&eq.id]?'·星标':'')+'"></div>';
  }
  html+='</div>';
  el.innerHTML=html;
  bindExamEvents();
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function getTimeDisplay(){
  if(examState.timeLimit<=0) return '';
  var m=Math.floor(examState.timeRemaining/60);
  var s=examState.timeRemaining%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function bindExamEvents(){
  var prev=$('btn-prev');
  if(prev&&!prev.disabled) prev.onclick=prevQuestion;
  var next=$('btn-next');
  if(next&&!next.disabled) next.onclick=function(){
    if(examState.completed) return;
    if(examState.current<examState.questions.length-1){
      examState.current++;
      renderQuestion();
    }else{
      submitExam();
    }
  };
  var submit=$('btn-submit-exam');
  if(submit) submit.onclick=function(){
    var unanswered=examState.totalQuestions-Object.keys(examState.answers).length;
    var msg='确定要交卷吗？';
    if(unanswered>0) msg+='\n还有 '+unanswered+' 题未答！';
    if(confirm(msg)) submitExam();
  };
  var flag=$('btn-flag');
  if(flag) flag.onclick=function(){
    var q=examState.questions[examState.current];
    if(q) toggleFlag(q.id);
  };
  var exit=$('btn-exit-exam');
  if(exit) exit.onclick=function(){
    if(confirm('确定退出考试？当前进度将丢失。')) renderExamSimulator();
  };
}

function selectAnswer(questionId,answer){
  if(examState.completed) return;
  examState.answers[questionId]=answer;
  renderQuestion();
}

function toggleFlag(questionId){
  examState.flagged[questionId]=!examState.flagged[questionId];
  renderQuestion();
}

function goToQuestion(idx){
  if(idx>=0&&idx<examState.questions.length){
    examState.current=idx;
    renderQuestion();
  }
}

function prevQuestion(){
  if(examState.current>0){
    examState.current--;
    renderQuestion();
  }
}

function submitExam(){
  if(examState.completed) return;
  examState.completed=true;
  examState.active=false;
  examState.endTime=new Date();
  if(examState.timer){clearInterval(examState.timer);examState.timer=null;}
  var correct=0;
  examState.questions.forEach(function(q){
    var userAns=examState.answers[q.id];
    if(userAns===undefined) return;
    var isCorrect=false;
    if(q.type==='choice') isCorrect=userAns===q.a;
    else isCorrect=(userAns===0&&q.a)||(userAns===1&&!q.a);
    if(isCorrect) correct++;
  });
  examState.correctCount=correct;
  renderResults();
  var pct=examState.totalQuestions>0?Math.round(correct/examState.totalQuestions*100):0;
  saveExamResult({
    date:new Date().toISOString(),
    subject:examState.subject,
    total:examState.totalQuestions,
    correct:correct,
    pct:pct,
    passed:pct>=70,
    time:getElapsedTime(),
    questions:examState.questions,
    answers:JSON.parse(JSON.stringify(examState.answers)),
    flagged:JSON.parse(JSON.stringify(examState.flagged))
  });
}

function renderResults(){
  var el=$('exam-app');
  if(!el)return;
  var total=examState.totalQuestions;
  var correct=examState.correctCount;
  var pct=total>0?Math.round(correct/total*100):0;
  var passed=pct>=70;
  var time=getElapsedTime();
  var html='<div class="tc-label"><i data-lucide="graduation-cap" style="width:12px;height:12px"></i>考试成绩</div>';
  html+='<div style="text-align:center;padding:16px 10px 10px">';
  html+='<div style="font-size:48px;margin-bottom:4px">'+(passed?'<i data-lucide="sparkles" style="width:44px;height:44px;color:var(--success)">':'<i data-lucide="frown" style="width:44px;height:44px;color:var(--danger)">')+'</i></div>';
  html+='<div style="font-family:var(--f-display);font-size:22px;font-weight:700;color:'+(passed?'var(--success)':'var(--danger)')+'">'+(passed?'恭喜通过！':(pct>=50?'再接再厉':'需要加强'))+'</div>';
  html+='<div style="font-size:12px;color:var(--text3);margin:2px 0 14px">'+(passed?'已达到 70% 合格线':'未达到 70% 合格线')+'</div>';
  html+='<div class="exam-result-cards">';
  html+='<div class="tc-bgt-card"><div class="num '+(passed?'pass':'fail')+'">'+pct+'%</div><div class="lb">得分</div></div>';
  html+='<div class="tc-bgt-card"><div class="num '+(passed?'pass':'fail')+'">'+correct+'/'+total+'</div><div class="lb">正确题数</div></div>';
  html+='<div class="tc-bgt-card"><div class="num" style="font-size:22px;color:var(--text)">'+time+'</div><div class="lb">用时</div></div>';
  html+='</div>';
  html+='<div class="exam-result-filters">';
  html+='<button class="tc-btn tc-btn-sm '+(examState.filter==='all'?'':'tc-btn-ghost')+'" onclick="setResultFilter(\'all\')">全部 ('+total+')</button>';
  var correctCount=0,wrongCount=0,flaggedCount=0;
  examState.questions.forEach(function(q){
    var ua=examState.answers[q.id];
    if(ua===undefined) return;
    var ic=false;
    if(q.type==='choice') ic=ua===q.a;
    else ic=(ua===0&&q.a)||(ua===1&&!q.a);
    if(ic) correctCount++;else wrongCount++;
    if(examState.flagged[q.id]) flaggedCount++;
  });
  html+='<button class="tc-btn tc-btn-sm '+(examState.filter==='correct'?'':'tc-btn-ghost')+'" onclick="setResultFilter(\'correct\')">正确 ('+correctCount+')</button>';
  html+='<button class="tc-btn tc-btn-sm '+(examState.filter==='wrong'?'':'tc-btn-ghost')+'" onclick="setResultFilter(\'wrong\')">错误 ('+wrongCount+')</button>';
  html+='<button class="tc-btn tc-btn-sm '+(examState.filter==='flagged'?'':'tc-btn-ghost')+'" onclick="setResultFilter(\'flagged\')">星标 ('+flaggedCount+')</button>';
  html+='</div>';
  html+='<div class="quiz-browse" id="exam-review-list">';
  var shown=0;
  examState.questions.forEach(function(q,i){
    var ua=examState.answers[q.id];
    if(ua===undefined) return;
    var ic=false;
    if(q.type==='choice') ic=ua===q.a;
    else ic=(ua===0&&q.a)||(ua===1&&!q.a);
    if(examState.filter==='correct'&&!ic) return;
    if(examState.filter==='wrong'&&ic) return;
    if(examState.filter==='flagged'&&!examState.flagged[q.id]) return;
    shown++;
    if(shown>20&&examState.filter==='all') return;
    var fbCls=ic?'quiz-fb-correct':'quiz-fb-wrong';
    var fbIcon=ic?'check-circle':'x-circle';
    var fbColor=ic?'var(--success)':'var(--danger)';
    var fbText=ic?'正确':'错误';
    html+='<div class="quiz-browse-card" onclick="toggleExamAnswer(this)">';
    html+='<div class="quiz-browse-q"><span class="quiz-browse-num">'+(i+1)+'.</span> '+(examState.flagged[q.id]?'<i data-lucide="star" style="width:10px;height:10px;color:var(--primary);fill:var(--primary)"></i> ':'')+q.q+'</div>';
    html+='<div class="quiz-browse-a" style="display:none"><div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,128,128,.06)">';
    html+='<div style="color:'+fbColor+';font-weight:500;margin-bottom:4px"><i data-lucide="'+fbIcon+'" style="width:11px;height:11px"></i> '+fbText+'</div>';
    if(!ic&&q.type==='choice'){
      html+='<div style="font-size:12px;color:var(--text2)">你的答案：'+(q.o[ua]||'未选择')+'</div>';
      html+='<div style="font-size:12px;color:var(--success)">正确答案：'+q.o[q.a]+'</div>';
    }else if(!ic&&q.type==='judge'){
      html+='<div style="font-size:12px;color:var(--text2)">你的答案：'+(ua===0?'正确':'错误')+'</div>';
      html+='<div style="font-size:12px;color:var(--success)">正确答案：'+(q.a?'正确':'错误')+'</div>';
    }else if(ic&&q.type==='choice'){
      html+='<div style="font-size:12px;color:var(--success)">答案：'+q.o[q.a]+'</div>';
    }else if(ic&&q.type==='judge'){
      html+='<div style="font-size:12px;color:var(--success)">答案：'+(q.a?'正确':'错误')+'</div>';
    }
    if(q.e) html+='<div style="font-size:12px;color:var(--text3);margin-top:4px;padding-top:4px;border-top:1px solid rgba(128,128,128,.06)"><i data-lucide="lightbulb" style="width:11px;height:11px"></i> '+q.e+'</div>';
    html+='</div></div></div>';
  });
  if(examState.filter==='all'&&examState.questions.length>20){
    html+='<div style="text-align:center;padding:8px;color:var(--text3);font-size:11px;font-family:var(--f-mono)">显示前20题，使用筛选按钮查看全部</div>';
  }
  html+='</div>';
  html+='<div class="tc-row" style="justify-content:center;margin-top:10px;gap:6px">';
  html+='<button class="tc-btn" onclick="renderExamSimulator()"><i data-lucide="refresh-ccw" style="width:12px;height:12px;vertical-align:-1px"></i> 再考一次</button>';
  html+='<button class="tc-btn tc-btn-ghost" onclick="renderExamHistory()"><i data-lucide="clock" style="width:12px;height:12px;vertical-align:-1px"></i> 历史</button>';
  html+='</div>';
  el.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function setResultFilter(filter){
  examState.filter=filter;
  renderResults();
}

function toggleExamAnswer(el){
  var a=el.querySelector('.quiz-browse-a');
  if(a) a.style.display=a.style.display==='block'?'none':'block';
}

function bindTrainingEvents(){
  var container=$('tab-training');
  if(!container)return;
  var scrollTabs=container.querySelector('.scroll-tabs');
  var toolTabs=[
    {id:'card-exam',label:'考证模拟'},
    {id:'card-pid',label:'PID 调参'},
    {id:'card-kml',label:'航线规划'},
    {id:'card-battery',label:'电池计算'},
    {id:'card-thrust',label:'推力估算'},
    {id:'card-cg',label:'重心计算'}
  ];
  if(scrollTabs){
    toolTabs.forEach(function(t){
      if(!scrollTabs.querySelector('[data-target-id="'+t.id+'"]')){
        var btn=document.createElement('button');
        btn.className='scroll-tab';
        btn.dataset.targetId=t.id;
        btn.textContent=t.label;
        scrollTabs.appendChild(btn);
      }
    });
  }
  var toolsGrid=container.querySelector('.tools-grid');
  if(toolsGrid){
    var examCards=toolsGrid.querySelectorAll('.glass');
    if(examCards.length>0) return;
  }
  renderExamSimulator();
  if(scrollTabs){
    scrollTabs.querySelectorAll('.scroll-tab').forEach(function(tab){
      tab.addEventListener('click',function(){
        var target=this.dataset.targetId;
        scrollTabs.querySelectorAll('.scroll-tab').forEach(function(t){t.classList.remove('act');});
        this.classList.add('act');
        if(target==='card-pid') renderPIDTuner();
        else if(target==='card-kml') renderKMLPlanner();
        else if(target==='card-battery') renderBatteryCalculator();
        else if(target==='card-thrust') renderThrustCalculator();
        else if(target==='card-cg') renderWeightBalance();
        else renderExamSimulator();
      });
    });
  }
}

/* ── Battery Calculator ── */
function renderBatteryCalculator(){
  var el=$('tab-training'); if(!el)return;
  var grid=el.querySelector('.tools-grid'); if(!grid)return;
  grid.innerHTML=
    '<div class="glass"><div class="tc-inner">'+
    '<div class="tc-label"><i data-lucide="battery-charging" style="width:12px;height:12px"></i>电池续航计算器</div>'+
    '<div class="tc-sub">根据电池参数和电机功耗估算飞行时间</div>'+
    '<div class="calc-section">'+
      '<div class="tc-label">电池参数</div>'+
      '<div class="tc-row" style="gap:6px">'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">电池容量 (mAh)</div><input class="tc-inp" id="bat-capacity" type="number" value="5200" step="100" min="100"></div>'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">电压 (S)</div><select class="tc-sel" id="bat-cells"><option value="1">1S (3.7V)</option><option value="2">2S (7.4V)</option><option value="3">3S (11.1V)</option><option value="4" selected>4S (14.8V)</option><option value="6">6S (22.2V)</option><option value="8">8S (29.6V)</option><option value="12">12S (44.4V)</option></select></div>'+
      '</div>'+
      '<div class="tc-row" style="gap:6px;margin-top:6px">'+
        '<div style="flex:0 0 80px"><div class="tc-label" style="margin-bottom:2px">放电 (C)</div><input class="tc-inp" id="bat-crate" type="number" value="25" step="5" min="1"></div>'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">电机数量</div><select class="tc-sel" id="bat-motors"><option value="3">3</option><option value="4" selected>4</option><option value="6">6</option><option value="8">8</option></select></div>'+
      '</div>'+
    '</div>'+
    '<div class="calc-section">'+
      '<div class="tc-label">飞行参数</div>'+
      '<div class="tc-row" style="gap:6px">'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">悬停电流/电机 (A)</div><input class="tc-inp" id="bat-hover-current" type="number" value="8" step="0.5" min="0.1"></div>'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">巡航电流/电机 (A)</div><input class="tc-inp" id="bat-cruise-current" type="number" value="12" step="0.5" min="0.1"></div>'+
      '</div>'+
    '</div>'+
    '<button class="tc-btn" id="btn-calc-battery" style="margin-top:4px"><i data-lucide="calculator" style="width:12px;height:12px"></i> 计算续航</button>'+
    '<div id="battery-result" style="margin-top:10px;display:none"></div>'+
    '</div></div>';
  grid.id='battery-calc-container';
  if(typeof lucide!=='undefined') lucide.createIcons();
  var btn=$('btn-calc-battery');
  if(btn) btn.onclick=function(){ calculateBattery(); };
  function calculateBattery(){
    var cap=parseFloat($('bat-capacity')?.value)||0;
    var cells=parseInt($('bat-cells')?.value)||4;
    var crate=parseFloat($('bat-crate')?.value)||25;
    var motors=parseInt($('bat-motors')?.value)||4;
    var hoverA=parseFloat($('bat-hover-current')?.value)||0;
    var cruiseA=parseFloat($('bat-cruise-current')?.value)||0;
    if(cap<=0||hoverA<=0){tst('请填写有效参数','error');return;}
    var voltage=cells*3.7;
    var wh=cap/1000*voltage;
    var maxDischargeA=cap/1000*crate;
    var totalHoverA=hoverA*motors;
    var totalCruiseA=cruiseA*motors;
    if(totalHoverA>maxDischargeA){
      tst('警告：悬停电流超过电池最大放电电流！','error');
    }
    var hoverMin=(wh/totalHoverA/voltage*wh*60*0.8).toFixed(1);
    var cruiseMin=(wh/totalCruiseA/voltage*wh*60*0.75).toFixed(1);
    hoverMin=(wh/totalHoverA*60*0.8).toFixed(1);
    cruiseMin=(wh/totalCruiseA*60*0.75).toFixed(1);
    var res=$('battery-result');
    if(!res)return;
    res.style.display='block';
    res.innerHTML=
      '<div class="calc-result-grid">'+
        '<div class="calc-result-item"><div class="calc-rl">悬停时间</div><div class="calc-rv success">'+hoverMin+'</div><div class="calc-ru">分钟</div></div>'+
        '<div class="calc-result-item"><div class="calc-rl">巡航时间</div><div class="calc-rv accent">'+cruiseMin+'</div><div class="calc-ru">分钟</div></div>'+
        '<div class="calc-result-item"><div class="calc-rl">电池能量</div><div class="calc-rv">'+wh.toFixed(1)+'</div><div class="calc-ru">Wh</div></div>'+
        '<div class="calc-result-item"><div class="calc-rl">悬停电流 / 最大放电</div><div class="calc-rv '+(totalHoverA<maxDischargeA?'success':'danger')+'">'+totalHoverA.toFixed(1)+' / '+maxDischargeA.toFixed(1)+'</div><div class="calc-ru">A</div></div>'+
      '</div>';
  }
}

/* ── Thrust Calculator ── */
function renderThrustCalculator(){
  var el=$('tab-training'); if(!el)return;
  var grid=el.querySelector('.tools-grid'); if(!grid)return;
  grid.innerHTML=
    '<div class="glass"><div class="tc-inner">'+
    '<div class="tc-label"><i data-lucide="zap" style="width:12px;height:12px"></i>电机推力估算器</div>'+
    '<div class="tc-sub">根据电机KV值、桨叶参数和电压估算推力和电流</div>'+
    '<div class="calc-section">'+
      '<div class="tc-label">电机参数</div>'+
      '<div class="tc-row" style="gap:6px">'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">KV 值</div><input class="tc-inp" id="thr-kv" type="number" value="920" step="10" min="100"></div>'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">电压 (V)</div><select class="tc-sel" id="thr-voltage"><option value="3.7">1S (3.7V)</option><option value="7.4">2S (7.4V)</option><option value="11.1">3S (11.1V)</option><option value="14.8" selected>4S (14.8V)</option><option value="22.2">6S (22.2V)</option><option value="29.6">8S (29.6V)</option></select></div>'+
      '</div>'+
    '</div>'+
    '<div class="calc-section">'+
      '<div class="tc-label">螺旋桨参数</div>'+
      '<div class="tc-row" style="gap:6px">'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">直径 (英寸)</div><input class="tc-inp" id="thr-prop-dia" type="number" value="10" step="0.5" min="3"></div>'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">螺距 (英寸)</div><input class="tc-inp" id="thr-prop-pitch" type="number" value="4.5" step="0.5" min="2"></div>'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">桨叶数</div><select class="tc-sel" id="thr-prop-blades"><option value="2" selected>2</option><option value="3">3</option><option value="4">4</option></select></div>'+
      '</div>'+
    '</div>'+
    '<button class="tc-btn" id="btn-calc-thrust" style="margin-top:4px"><i data-lucide="calculator" style="width:12px;height:12px"></i> 估算推力</button>'+
    '<div id="thrust-result" style="margin-top:10px;display:none"></div>'+
    '</div></div>';
  grid.id='thrust-calc-container';
  if(typeof lucide!=='undefined') lucide.createIcons();
  var btn=$('btn-calc-thrust');
  if(btn) btn.onclick=function(){ calculateThrust(); };
  function calculateThrust(){
    var kv=parseFloat($('thr-kv')?.value)||0;
    var voltage=parseFloat($('thr-voltage')?.value)||14.8;
    var dia=parseFloat($('thr-prop-dia')?.value)||0;
    var pitch=parseFloat($('thr-prop-pitch')?.value)||0;
    var blades=parseInt($('thr-prop-blades')?.value)||2;
    if(!kv||!dia||!pitch){tst('请填写完整参数','error');return;}
    var rpm=kv*voltage*0.82;
    var pitchMeter=pitch*0.0254;
    var diaMeter=dia*0.0254;
    var propArea=Math.PI*(diaMeter/2)*(diaMeter/2);
    var thrustGram=0.5*1.225*propArea*(rpm/60*pitchMeter)*(rpm/60*pitchMeter)*(blades/2)*0.6;
    thrustGram=Math.round(thrustGram);
    var powerW=Math.round(voltage*(thrustGram/1000*1.8));
    var currentA=(powerW/voltage);
    var efficiency=thrustGram>0?Math.round(thrustGram/powerW):0;
    if(thrustGram>5000){thrustGram=Math.round(kv*voltage*0.82/100*20+500);powerW=Math.round(kv*voltage*0.82/100*2.5);currentA=powerW/voltage;efficiency=thrustGram>0?Math.round(thrustGram/powerW):0;}
    var res=$('thrust-result');
    if(!res)return;
    res.style.display='block';
    res.innerHTML=
      '<div class="calc-result-grid">'+
        '<div class="calc-result-item"><div class="calc-rl">估算推力</div><div class="calc-rv success">'+thrustGram+'</div><div class="calc-ru">克 (g)</div></div>'+
        '<div class="calc-result-item"><div class="calc-rl">输入功率</div><div class="calc-rv accent">'+powerW+'</div><div class="calc-ru">瓦 (W)</div></div>'+
        '<div class="calc-result-item"><div class="calc-rl">工作电流</div><div class="calc-rv">'+currentA.toFixed(1)+'</div><div class="calc-ru">安 (A)</div></div>'+
        '<div class="calc-result-item"><div class="calc-rl">效率</div><div class="calc-rv">'+efficiency+'</div><div class="calc-ru">克/瓦 (g/W)</div></div>'+
      '</div>'+
      '<div style="margin-top:10px;padding:12px;background:var(--surface);border-radius:8px;font-size:12px;color:var(--text3);line-height:1.7;font-family:var(--f-mono);text-align:center">'+
        '转速 <strong style="color:var(--text)">'+(rpm|0)+'</strong> RPM · 推重比(4电机) <strong style="color:var(--primary)">'+((thrustGram*4/1000).toFixed(1))+'</strong> kg'+
      '</div>';
  }
}

/* ── Weight & Balance Calculator ── */
var cgItems=[];
function renderWeightBalance(){
  var el=$('tab-training'); if(!el)return;
  var grid=el.querySelector('.tools-grid'); if(!grid)return;
  grid.innerHTML=
    '<div class="glass"><div class="tc-inner">'+
    '<div class="tc-label"><i data-lucide="weight" style="width:12px;height:12px"></i>重量重心计算器</div>'+
    '<div class="tc-sub">输入各部件重量和安装位置，计算总重和重心位置</div>'+
    '<div class="calc-section">'+
      '<div class="tc-label">添加部件</div>'+
      '<div class="tc-row" style="gap:6px">'+
        '<div style="flex:2"><div class="tc-label" style="margin-bottom:2px">部件名称</div><input class="tc-inp" id="cg-name" placeholder="如：电池、飞控"></div>'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">重量 (g)</div><input class="tc-inp" id="cg-weight" type="number" value="100" min="1"></div>'+
        '<div style="flex:1"><div class="tc-label" style="margin-bottom:2px">位置 (mm)</div><input class="tc-inp" id="cg-pos" type="number" value="100" min="0" placeholder="距参考点"></div>'+
        '<div style="flex:0 0 auto;display:flex;align-items:flex-end"><button class="tc-btn" id="btn-add-cg"><i data-lucide="plus" style="width:12px;height:12px"></i></button></div>'+
      '</div>'+
    '</div>'+
    '<button class="tc-btn" id="btn-calc-cg" style="margin-top:4px"><i data-lucide="calculator" style="width:12px;height:12px"></i> 计算重心</button>'+
    '<div id="cg-items-list"></div>'+
    '<div id="cg-result" style="margin-top:10px;display:none"></div>'+
    '</div></div>';
  grid.id='cg-calc-container';
  if(typeof lucide!=='undefined') lucide.createIcons();
  renderCGList();
  var addBtn=$('btn-add-cg');
  if(addBtn) addBtn.onclick=function(){
    var name=($('cg-name')?.value||'').trim();
    var weight=parseFloat($('cg-weight')?.value);
    var pos=parseFloat($('cg-pos')?.value);
    if(!name||!weight||pos===undefined||isNaN(pos)){tst('请填写完整信息','error');return;}
    if(weight<=0){tst('重量必须大于0','error');return;}
    if(pos<0){tst('位置不能为负数','error');return;}
    cgItems.push({name:name,weight:weight,pos:pos});
    $('cg-name').value='';$('cg-weight').value='100';$('cg-pos').value='100';
    renderCGList();
    calculateCG();
  };
  var calcBtn=$('btn-calc-cg');
  if(calcBtn) calcBtn.onclick=function(){ calculateCG(); };
}

function renderCGList(){
  var container=$('cg-items-list');
  if(!container)return;
  if(!cgItems.length){
    container.innerHTML='<div style="text-align:center;padding:12px;color:var(--text3);font-size:12px">暂未添加部件</div>';
    return;
  }
  var html='<table style="width:100%;border-collapse:collapse;font-size:11px;margin:6px 0"><thead><tr style="color:var(--text2)"><th>部件</th><th>重量(g)</th><th>位置(mm)</th><th>力矩(g·mm)</th><th></th></tr></thead><tbody>';
  cgItems.forEach(function(item,i){
    var moment=item.weight*item.pos;
    html+='<tr><td style="padding:4px;font-weight:500">'+item.name+'</td>'+
      '<td style="padding:4px;font-family:var(--f-mono)">'+item.weight+'</td>'+
      '<td style="padding:4px;font-family:var(--f-mono)">'+item.pos+'</td>'+
      '<td style="padding:4px;font-family:var(--f-mono);color:var(--text2)">'+moment+'</td>'+
      '<td style="padding:4px"><button class="tc-btn tc-btn-xs tc-btn-ghost" onclick="cgItems.splice('+i+',1);renderCGList();calculateCG();" style="color:var(--danger);padding:2px 6px;font-size:9px">✕</button></td></tr>';
  });
  html+='</tbody></table>';
  container.innerHTML=html;
}

function calculateCG(){
  if(!cgItems.length){
    var res=$('cg-result');
    if(res){res.style.display='none';}
    return;
  }
  var totalW=cgItems.reduce(function(s,i){return s+i.weight;},0);
  var totalM=cgItems.reduce(function(s,i){return s+i.weight*i.pos;},0);
  var cg=totalM/totalW;
  var res=$('cg-result');
  if(!res)return;
  res.style.display='block';
  var refLength=Math.max.apply(null,cgItems.map(function(i){return i.pos;}));
  var cgPct=refLength>0?Math.round(cg/refLength*100):0;
  var isGood=cgPct>=20&&cgPct<=40;
  var html='<div class="calc-result-grid">'+
    '<div class="calc-result-item"><div class="calc-rl">总重量</div><div class="calc-rv success">'+totalW.toFixed(0)+'</div><div class="calc-ru">克 (g)</div></div>'+
    '<div class="calc-result-item"><div class="calc-rl">重心位置</div><div class="calc-rv accent">'+cg.toFixed(1)+'</div><div class="calc-ru">毫米 (mm)</div></div>'+
    '<div class="calc-result-item"><div class="calc-rl">重心百分比</div><div class="calc-rv '+(isGood?'success':'danger')+'">'+cgPct+'%</div><div class="calc-ru">'+(isGood?'✓ 合理':'需调整')+'</div></div>'+
    '<div class="calc-result-item"><div class="calc-rl">评估</div><div class="calc-rv" style="font-size:14px;color:'+(isGood?'var(--success)':'var(--danger)')+'">'+(isGood?'安全范围':'建议调整')+'</div><div class="calc-ru">20%-40%</div></div>'+
    '</div>';
  html+='<div class="cg-visual" style="margin-top:8px">';
  var barW=Math.max(refLength*1.2,200);
  html+='<div style="position:relative;height:24px;background:var(--surface);border-radius:12px;overflow:hidden">';
  html+='<div style="position:absolute;left:20%;width:20%;height:100%;background:rgba(5,150,105,0.2);border-left:2px solid var(--success);border-right:2px solid var(--success)"></div>';
  var cgLeft=Math.min(Math.max(cg/barW*100,2),98);
  html+='<div style="position:absolute;left:'+cgLeft+'%;top:3px;width:18px;height:18px;border-radius:50%;background:var(--primary);transform:translateX(-50%);display:flex;align-items:center;justify-content:center"><div style="width:6px;height:6px;border-radius:50%;background:#fff"></div></div>';
  html+='</div>';
  html+='<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);font-family:var(--f-mono);margin-top:2px"><span>0</span><span style="color:var(--success)">20%</span><span style="color:var(--success)">40%</span><span>'+refLength+'mm</span></div>';
  html+='</div>';
  html+='<button class="tc-btn tc-btn-sm tc-btn-ghost" onclick="cgItems=[];renderCGList();calculateCG();$(\'cg-result\').style.display=\'none\';" style="margin-top:6px;color:var(--danger);border-color:rgba(220,38,38,0.3)"><i data-lucide="trash-2" style="width:10px;height:10px"></i> 清空所有</button>';
  res.innerHTML=html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

/* ── PID Tuning Calculator ── */
var pidTunerState = {
  Kp:1.0, Ki:0.1, Kd:0.05, setpoint:45, canvas:null, ctx:null
};

function simulatePID(Kp,Ki,Kd,setpoint,steps){
  var output=0,integral=0,lastError=0,result=[];
  for(var i=0;i<steps;i++){
    var error=setpoint-output;
    integral+=error;
    var derivative=error-lastError;
    output+=(Kp*error+Ki*integral+Kd*derivative)*0.1;
    output=Math.max(0,Math.min(output,setpoint*1.2));
    lastError=error;
    result.push(output);
  }
  return result;
}

function computePIDStats(data,setpoint){
  var n=data.length,peak=0;
  for(var i=0;i<n;i++) if(data[i]>peak) peak=data[i];
  var t10=0,t90=0,p10=setpoint*0.1,p90=setpoint*0.9;
  for(var i=0;i<n;i++){
    if(t10===0&&data[i]>=p10) t10=i;
    if(t90===0&&data[i]>=p90) t90=i;
  }
  var riseTime=t90>t10?t90-t10:0;
  var overshoot=setpoint>0?Math.max(0,(peak-setpoint)/setpoint*100):0;
  var settleTime=n-1,thresh=setpoint*0.02;
  for(var i=n-1;i>=0;i--){if(Math.abs(data[i]-setpoint)>thresh){settleTime=i;break;}}
  var lastN=Math.max(1,Math.floor(n*0.1)),sum=0;
  for(var i=n-lastN;i<n;i++) sum+=data[i];
  var ssError=Math.abs(sum/lastN-setpoint);
  return{riseTime:riseTime,overshoot:overshoot,settleTime:settleTime,ssError:ssError};
}

function updatePID(param,value){
  pidTunerState[param]=parseFloat(value);
  var de=$('pid-val-'+param.toLowerCase());
  if(de) de.textContent=parseFloat(value).toFixed(2);
  drawPIDResponse();
}

function applyPreset(name){
  var ps={'default':{Kp:1.5,Ki:0.08,Kd:0.03},'debug':{Kp:0.8,Ki:0.05,Kd:0.01},'dji':{Kp:2.0,Ki:0.15,Kd:0.08}};
  var p=ps[name]; if(!p) return;
  pidTunerState.Kp=p.Kp; pidTunerState.Ki=p.Ki; pidTunerState.Kd=p.Kd;
  var sp=$('pid-slider-p'); if(sp) sp.value=p.Kp;
  var si=$('pid-slider-i'); if(si) si.value=p.Ki;
  var sd=$('pid-slider-d'); if(sd) sd.value=p.Kd;
  var dp=$('pid-val-p'); if(dp) dp.textContent=p.Kp.toFixed(2);
  var di=$('pid-val-i'); if(di) di.textContent=p.Ki.toFixed(2);
  var dd=$('pid-val-d'); if(dd) dd.textContent=p.Kd.toFixed(2);
  drawPIDResponse();
  var labels={'default':'四轴默认','debug':'调试起步','dji':'大疆风格'};
  tst('已应用"'+ (labels[name]||name) +'"预设','success');
}

function drawPIDResponse(){
  var canvas=pidTunerState.canvas,ctx=pidTunerState.ctx;
  if(!canvas||!ctx) return;
  var w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  var data=simulatePID(pidTunerState.Kp,pidTunerState.Ki,pidTunerState.Kd,pidTunerState.setpoint,100);
  var sp=pidTunerState.setpoint,maxVal=sp*1.2;
  ctx.strokeStyle='rgba(128,128,128,0.1)'; ctx.lineWidth=1;
  for(var i=0;i<=4;i++){var y=h-h*i/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.setLineDash([4,4]);
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
  var ty=h-h*sp/maxVal; ctx.beginPath();ctx.moveTo(0,ty);ctx.lineTo(w,ty);ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='9px monospace'; ctx.textAlign='right';
  for(var i=0;i<=4;i++){var y=h-h*i/4;ctx.fillText(Math.round(maxVal*i/4)+'°',w-4,y+3);}
  ctx.textAlign='center'; ctx.fillText('时间',w/2,h-2);
  ctx.strokeStyle='#3b82f6'; ctx.lineWidth=2; ctx.beginPath();
  for(var i=0;i<data.length;i++){
    var x=i/(data.length-1)*w,y=h-h*data[i]/maxVal;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
  var st=computePIDStats(data,sp);
  var re=$('pid-rise');if(re) re.textContent=st.riseTime.toFixed(1)+'s';
  var oe=$('pid-overshoot');if(oe) oe.textContent=st.overshoot.toFixed(1)+'%';
  var se=$('pid-settle');if(se) se.textContent=st.settleTime.toFixed(1)+'s';
  var ee=$('pid-error');if(ee) ee.textContent=st.ssError.toFixed(1)+'°';
}

function renderPIDTuner(){
  var el=$('tab-training'); if(!el) return;
  var grid=el.querySelector('.tools-grid'); if(!grid) return;
  var s=pidTunerState;
  grid.innerHTML=
    '<div class="glass"><div class="tc-inner">'+
    '<div class="tc-label"><i data-lucide="cpu" style="width:12px;height:12px"></i>PID 调参计算器</div>'+
    '<div class="tc-sub">调整 PID 参数，观察系统响应曲线变化</div>'+
    '<div class="tc-row" style="align-items:center;gap:8px;margin-bottom:6px">'+
      '<div class="tc-label" style="margin-bottom:0">目标角度</div>'+
      '<input class="tc-inp" id="pid-setpoint" type="number" value="'+s.setpoint+'" style="width:80px" onchange="pidTunerState.setpoint=parseFloat(this.value)||45;drawPIDResponse()">'+
    '</div>'+
    '<div class="tc-row" style="gap:4px;margin-bottom:10px">'+
      '<button class="tc-btn tc-btn-sm" onclick="applyPreset(\'default\')">四轴默认</button>'+
      '<button class="tc-btn tc-btn-sm" onclick="applyPreset(\'debug\')">调试起步</button>'+
      '<button class="tc-btn tc-btn-sm" onclick="applyPreset(\'dji\')">大疆风格</button>'+
    '</div>'+
    '<div style="margin-bottom:8px">'+
      '<div class="tc-row" style="margin-bottom:2px"><span class="tc-label" style="width:20px;margin-bottom:0">P</span><span id="pid-val-p" style="width:50px;font-family:var(--f-mono);font-size:12px;color:var(--primary)">'+s.Kp.toFixed(2)+'</span></div>'+
      '<input type="range" id="pid-slider-p" min="0" max="5" step="0.01" value="'+s.Kp+'" oninput="updatePID(\'Kp\',this.value)" style="width:100%">'+
    '</div>'+
    '<div style="margin-bottom:8px">'+
      '<div class="tc-row" style="margin-bottom:2px"><span class="tc-label" style="width:20px;margin-bottom:0">I</span><span id="pid-val-i" style="width:50px;font-family:var(--f-mono);font-size:12px;color:var(--primary)">'+s.Ki.toFixed(2)+'</span></div>'+
      '<input type="range" id="pid-slider-i" min="0" max="2" step="0.01" value="'+s.Ki+'" oninput="updatePID(\'Ki\',this.value)" style="width:100%">'+
    '</div>'+
    '<div style="margin-bottom:8px">'+
      '<div class="tc-row" style="margin-bottom:2px"><span class="tc-label" style="width:20px;margin-bottom:0">D</span><span id="pid-val-d" style="width:50px;font-family:var(--f-mono);font-size:12px;color:var(--primary)">'+s.Kd.toFixed(2)+'</span></div>'+
      '<input type="range" id="pid-slider-d" min="0" max="1" step="0.01" value="'+s.Kd+'" oninput="updatePID(\'Kd\',this.value)" style="width:100%">'+
    '</div>'+
    '<canvas id="pid-canvas" style="width:100%;height:200px;background:rgba(0,0,0,0.2);border-radius:6px"></canvas>'+
    '<div class="tc-row" style="gap:4px;margin-top:6px">'+
      '<div class="tc-bgt-card" style="flex:1;text-align:center"><div class="lb">上升时间</div><div class="num" id="pid-rise" style="font-size:14px">-</div></div>'+
      '<div class="tc-bgt-card" style="flex:1;text-align:center"><div class="lb">超调量</div><div class="num" id="pid-overshoot" style="font-size:14px">-</div></div>'+
      '<div class="tc-bgt-card" style="flex:1;text-align:center"><div class="lb">调节时间</div><div class="num" id="pid-settle" style="font-size:14px">-</div></div>'+
      '<div class="tc-bgt-card" style="flex:1;text-align:center"><div class="lb">稳态误差</div><div class="num" id="pid-error" style="font-size:14px">-</div></div>'+
    '</div>'+
    '</div></div>';
  grid.id='pid-tuner-container';
  s.canvas=$('pid-canvas');
  if(s.canvas){s.canvas.width=s.canvas.clientWidth||400;s.canvas.height=200;s.ctx=s.canvas.getContext('2d');}
  drawPIDResponse();
  if(typeof lucide!=='undefined') lucide.createIcons();
}

/* ── KML Waypoint Planner ── */
var kmlState = { waypoints: [] };

function renderKMLPlanner(){
  var el=$('tab-training');if(!el)return;
  var grid=el.querySelector('.tools-grid'); if(!grid) return;
  grid.innerHTML=
    '<div class="glass"><div class="tc-inner">'+
    '<div class="tc-label"><i data-lucide="map" style="width:12px;height:12px"></i>航线规划工具</div>'+
    '<div class="tc-sub">创建飞行航线并导出 KML 文件</div>'+
    '<div class="tc-row" style="gap:4px;margin-bottom:6px">'+
      '<div style="flex:1"><div class="tc-label">纬度</div><input class="tc-inp" id="kml-lat" type="number" step="any" placeholder="39.9042"></div>'+
      '<div style="flex:1"><div class="tc-label">经度</div><input class="tc-inp" id="kml-lng" type="number" step="any" placeholder="116.4074"></div>'+
      '<div style="flex:0 0 70px"><div class="tc-label">高度(m)</div><input class="tc-inp" id="kml-alt" type="number" value="100"></div>'+
    '</div>'+
    '<div class="tc-row" style="gap:4px;margin-bottom:8px">'+
      '<div style="flex:0 0 70px"><div class="tc-label">速度(m/s)</div><input class="tc-inp" id="kml-speed" type="number" value="10"></div>'+
      '<div style="flex:1"><div class="tc-label">转弯模式</div><select class="tc-sel" id="kml-turn-mode"><option value="直线">直线</option><option value="曲线">曲线</option><option value="停留">停留</option></select></div>'+
      '<div style="flex:0 0 auto;display:flex;align-items:flex-end"><button class="tc-btn" id="btn-add-waypoint"><i data-lucide="plus" style="width:12px;height:12px"></i> 添加航点</button></div>'+
    '</div>'+
    '<div id="kml-waypoint-list"></div>'+
    '<div class="tc-row" style="justify-content:space-between;margin:6px 0">'+
      '<span style="font-size:12px;color:var(--text3)">总距离: <strong id="kml-total-dist">0.0</strong> km</span>'+
      '<span style="font-size:12px;color:var(--text3)">预计飞行: <strong id="kml-flight-time">0</strong> s</span>'+
    '</div>'+
    '<button class="tc-btn" id="btn-gen-kml"><i data-lucide="file-down" style="width:12px;height:12px"></i> 生成 KML</button>'+
    '</div></div>';
  grid.id='kml-planner-container';
  bindKMLPlannerEvents();
  updateKMLTable();
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function bindKMLPlannerEvents(){
  var btnAdd=$('btn-add-waypoint');
  if(btnAdd) btnAdd.onclick=function(){
    var lat=parseFloat($('kml-lat')?.value);
    var lng=parseFloat($('kml-lng')?.value);
    var alt=parseFloat($('kml-alt')?.value);
    var speed=parseFloat($('kml-speed')?.value);
    var turnMode=$('kml-turn-mode')?.value||'直线';
    if(isNaN(lat)||isNaN(lng)){tst('请输入有效的经纬度','error');return;}
    if(lat<-90||lat>90){tst('纬度范围 -90 ~ 90','error');return;}
    if(lng<-180||lng>180){tst('经度范围 -180 ~ 180','error');return;}
    if(isNaN(alt)||alt<0){tst('请输入有效高度','error');return;}
    if(isNaN(speed)||speed<=0){tst('请输入有效速度','error');return;}
    addWaypoint(lat,lng,alt,speed,turnMode);
  };
  var btnGen=$('btn-gen-kml');
  if(btnGen) btnGen.onclick=function(){
    if(kmlState.waypoints.length<2){tst('至少需要 2 个航点','error');return;}
    var kml=generateKML();
    downloadKML(kml);
    tst('KML 文件已生成','success');
  };
}

function addWaypoint(lat,lng,alt,speed,turnMode){
  kmlState.waypoints.push({lat:lat,lng:lng,alt:alt,speed:speed,turnMode:turnMode});
  $('kml-lat').value='';$('kml-lng').value='';
  updateKMLTable();
}

function removeWaypoint(index){
  kmlState.waypoints.splice(index,1);
  updateKMLTable();
}

function updateKMLTable(){
  var container=$('kml-waypoint-list');
  if(!container)return;
  var wps=kmlState.waypoints;
  if(wps.length===0){
    container.innerHTML='<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">暂无航点，请添加</div>';
    updateKMLStats();
    return;
  }
  var html='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px">'+
    '<thead><tr style="color:var(--text2)"><th>#</th><th>纬度</th><th>经度</th><th>高度(m)</th><th>速度(m/s)</th><th>转弯</th><th></th></tr></thead><tbody>';
  wps.forEach(function(wp,i){
    html+='<tr>'+
      '<td style="padding:3px 4px;font-family:var(--f-mono);color:var(--primary)">'+(i+1)+'</td>'+
      '<td style="padding:3px 4px;font-family:var(--f-mono)">'+wp.lat.toFixed(4)+'</td>'+
      '<td style="padding:3px 4px;font-family:var(--f-mono)">'+wp.lng.toFixed(4)+'</td>'+
      '<td style="padding:3px 4px;font-family:var(--f-mono)">'+wp.alt+'</td>'+
      '<td style="padding:3px 4px;font-family:var(--f-mono)">'+wp.speed+'</td>'+
      '<td style="padding:3px 4px;color:var(--text2)">'+wp.turnMode+'</td>'+
      '<td style="padding:3px 4px"><button class="tc-btn tc-btn-xs tc-btn-ghost" onclick="removeWaypoint('+i+')" style="color:var(--danger);padding:2px 6px">✕</button></td>'+
      '</tr>';
  });
  html+='</tbody></table>';
  container.innerHTML=html;
  updateKMLStats();
}

function updateKMLStats(){
  var dist=calculateTotalDistance();
  var totalDistEl=$('kml-total-dist');
  if(totalDistEl) totalDistEl.textContent=dist.toFixed(2);
  var speedSum=0;
  kmlState.waypoints.forEach(function(wp){speedSum+=wp.speed;});
  var avgSpeed=kmlState.waypoints.length>0?speedSum/kmlState.waypoints.length:10;
  var estTime=avgSpeed>0?(dist*1000)/avgSpeed:0;
  var timeEl=$('kml-flight-time');
  if(timeEl) timeEl.textContent=Math.round(estTime);
}

function haversine(lat1,lng1,lat2,lng2){
  var R=6371;
  var dLat=(lat2-lat1)*Math.PI/180;
  var dLng=(lng2-lng1)*Math.PI/180;
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLng/2)*Math.sin(dLng/2);
  var c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  return R*c;
}

function calculateTotalDistance(){
  var total=0;
  for(var i=1;i<kmlState.waypoints.length;i++){
    var a=kmlState.waypoints[i-1],b=kmlState.waypoints[i];
    total+=haversine(a.lat,a.lng,b.lat,b.lng);
  }
  return total;
}

function generateKML(){
  var kml='<?xml version="1.0" encoding="UTF-8"?>\n';
  kml+='<kml xmlns="http://www.opengis.net/kml/2.2">\n';
  kml+='<Document>\n';
  kml+='<name>Drone Bench Flight Plan</name>\n';
  kmlState.waypoints.forEach(function(wp,i){
    kml+='<Placemark>\n';
    kml+='<name>WPT '+(i+1)+'</name>\n';
    kml+='<description>Alt: '+wp.alt+'m, Speed: '+wp.speed+'m/s</description>\n';
    kml+='<Point>\n';
    kml+='<coordinates>'+wp.lng+','+wp.lat+','+wp.alt+'</coordinates>\n';
    kml+='</Point>\n';
    kml+='</Placemark>\n';
  });
  kml+='<Placemark>\n';
  kml+='<name>Flight Route</name>\n';
  kml+='<LineString>\n';
  kml+='<coordinates>\n';
  kmlState.waypoints.forEach(function(wp){
    kml+=wp.lng+','+wp.lat+','+wp.alt+'\n';
  });
  kml+='</coordinates>\n';
  kml+='</LineString>\n';
  kml+='</Placemark>\n';
  kml+='</Document>\n';
  kml+='</kml>';
  return kml;
}

function downloadKML(kmlContent){
  var blob=new Blob([kmlContent],{type:'application/vnd.google-earth.kml+xml'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='drone-flight-plan.kml';
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Keyboard shortcuts for exam ── */
document.addEventListener('keydown',function(e){
  if(!examState.active||examState.completed) return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable) return;
  var q=examState.questions[examState.current];
  if(!q) return;
  var num=parseInt(e.key);
  if(num>=1&&num<=4){
    var handled=false;
    if(q.type==='choice'&&num<=q.o.length){
      selectAnswer(q.id,num-1); handled=true;
    }else if(q.type==='judge'&&num<=2){
      selectAnswer(q.id,num-1); handled=true;
    }
    if(handled){ e.preventDefault(); if(num>=1&&num<=3) e.stopImmediatePropagation(); }
  }
  if(e.key==='Enter'&&examState.active){
    e.preventDefault();
    if(examState.current<examState.questions.length-1){
      examState.current++;
      renderQuestion();
    }else{
      submitExam();
    }
  }
  if(e.key.toLowerCase()==='f'&&!e.ctrlKey&&!e.metaKey){
    e.preventDefault();
    toggleFlag(q.id);
  }
  if(e.key==='Escape'){
    e.preventDefault();
    if(confirm('确定退出考试？当前进度将丢失。')) renderExamSimulator();
  }
});
