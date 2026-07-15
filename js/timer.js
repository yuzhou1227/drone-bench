function playBeep(){
  try{
    const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();
    o.connect(g);g.connect(a.destination);
    o.frequency.value=880;o.type='sine';
    g.gain.setValueAtTime(.3,a.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.2);
    o.start(a.currentTime);o.stop(a.currentTime+.2);
  }catch(_){}
}

function requestNotify(title,body){
  try{
    if(Notification.permission==='granted') new Notification(title,{body,icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔧</text></svg>'});
    else if(Notification.permission==='default') Notification.requestPermission();
  }catch(_){}
}

const timer={
  dur:25*60,rem:25*60,run:false,rafId:null,lastTick:0,
  history:{
    load(){
      var h=safeGet('lb-focus-history',[]);
      if(!Array.isArray(h)) h=[];
      return h;
    },
    save(entry){
      var h=this.load();
      h.push(entry);
      if(h.length>100) h=h.slice(h.length-100);
      safeSet('lb-focus-history',h);
    },
    getStats(){
      var h=this.load(),now=new Date(),total=0,weekTotal=0;
      var ms=function(d){return new Date(d).setHours(0,0,0,0);};
      var weekStart=new Date(now);weekStart.setDate(now.getDate()-now.getDay());
      weekStart=ms(weekStart);
      h.forEach(function(e){
        total+=e.duration;
        if(ms(e.date)>=weekStart) weekTotal+=e.duration;
      });
      return {total:total,week:weekTotal,count:h.length};
    }
  },
  setDuration(min){
    this.dur=min*60;this.rem=min*60;
    this.run=false;if(this.rafId){cancelAnimationFrame(this.rafId);this.rafId=null;}
    this.render();
  },
  render(){
    const p=this.dur>0?(this.dur-this.rem)/this.dur*100:0;
    const elDisplay=document.getElementById('tmr-display');
    const elRing=document.getElementById('tmr-ring');
    const elState=document.getElementById('tmr-state');
    const elToggle=document.getElementById('tmr-toggle');
    if(elDisplay) elDisplay.textContent=String(Math.floor(this.rem/60)).padStart(2,'0')+':'+String(this.rem%60).padStart(2,'0');
    if(elRing){
      elRing.style.setProperty('--tpct',p+'%');
      elRing.classList.toggle('tmr-running',this.run);
      elRing.classList.toggle('tmr-warning',this.run&&this.rem<=60);
      elRing.classList.toggle('tmr-end',this.rem<=0);
    }
    if(elState) elState.textContent=this.run?'专注中':(this.rem<this.dur?'已暂停':'待开始');
    if(elToggle){
      elToggle.textContent=this.run?'暂停':'开始';
      elToggle.className='tmr-btn'+(this.run?' act':'');
    }
  },
  tick(){
    if(!this.run) return;
    const now=Date.now();
    const elapsed=Math.round((now-this.lastTick)/1000);
    if(elapsed<=0){ this.rafId=requestAnimationFrame(()=>this.tick()); return; }
    this.lastTick=now;
    this.rem=Math.max(0,this.rem-elapsed);
    this.render();
    if(this.rem<=0) this.complete();
    else this.rafId=requestAnimationFrame(()=>this.tick());
  },
  toggle(){
    this.run?this.pause():this.start();
  },
  start(){
    this.lastTick=Date.now();
    this.run=true;
    this.rafId=requestAnimationFrame(()=>this.tick());
    this.render();
  },
  pause(){
    this.run=false;
    if(this.rafId){cancelAnimationFrame(this.rafId);this.rafId=null;}
    this.render();
  },
  reset(){
    this.run=false;
    if(this.rafId){cancelAnimationFrame(this.rafId);this.rafId=null;}
    this.rem=this.dur;
    this.render();
  },
  complete(){
    this.run=false;
    if(this.rafId){cancelAnimationFrame(this.rafId);this.rafId=null;}
    var now=new Date();
    var entry={date:now.toISOString().slice(0,10),duration:Math.round(this.dur/60),startTime:'',endTime:now.toTimeString().slice(0,5)};
    this.history.save(entry);
    this.rem=this.dur;
    this.render();
    playBeep();
    requestNotify('[TIMER] 专注时间到！','学习时间结束，休息一下吧');
    tst('<i data-lucide="alarm-clock" style="width:11px;height:11px"></i> 专注时间到！','success');
  }
};
