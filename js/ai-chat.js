async function ocSubmit(text){
  try{
    const r=await fetch(getApiUrl()+'/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
    const d=await r.json();
    if(d.ok) return true;
    throw Error('nok');
  }catch{
    try{ await navigator.clipboard.writeText(text); }catch(_){}
    return false;
  }
}

function closeChat(){
  const o=document.getElementById('ai-overlay');
  if(!o) return;
  o.classList.remove('show');
  document.getElementById('ai-chat').style.display='';
  document.getElementById('ai-chat-bar').style.display='flex';
}

function openChat(topicId){
  if(topicId){
    const s=STUDY[topicId];
    if(!s||!s.p) return;
    const cmd='/learn '+s.tt+'\n'+s.p;
    ocSubmit(cmd).then(ok=>tst(ok?'<i data-lucide="send" style="width:11px;height:11px"></i> 已发送到 opencode':'<i data-lucide="clipboard-copy" style="width:11px;height:11px"></i> 已复制到剪贴板','success'));
    return;
  }
  const o=document.getElementById('ai-overlay'),chat=document.getElementById('ai-chat');
  const hd=document.getElementById('ai-panel-title'),sub=document.getElementById('ai-panel-sub');
  if(!o||!chat) return;
  if(hd) hd.textContent='AI 助教';
  if(sub) sub.textContent='输入追问，将自动发送到 opencode';
  chat.style.display='';
  const bar=document.getElementById('ai-chat-bar');
  const waiting=document.getElementById('ai-waiting');
  if(bar) bar.style.display='flex';
  if(waiting) waiting.style.display='none';
  chat.innerHTML='<div class="ai-msg ai" style="animation:aiFadeIn .3s ease both"><div class="ai-bubble"><i data-lucide="arrow-down" style="width:11px;height:11px"></i> 输入你的追问</div></div>';
  const input=document.getElementById('ai-question');
  if(input){ input.value=''; input.focus(); }
  o.classList.add('show');
  o.focus();
}

function sendMessage(){
  const input=document.getElementById('ai-question'),q=input?.value.trim();
  if(!q) return;
  if(input) input.value='';
  const chat=document.getElementById('ai-chat'),waiting=document.getElementById('ai-waiting');
  if(!chat) return;
  chat.style.display='';
  const userDiv=document.createElement('div');
  userDiv.className='ai-msg user';
  userDiv.style.animation='aiFadeIn .3s ease both';
  userDiv.innerHTML='<div class="ai-bubble">'+q.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';
  chat.appendChild(userDiv);
  chat.scrollTop=chat.scrollHeight;
  if(waiting){
    waiting.innerHTML='<i data-lucide="loader" style="width:11px;height:11px"></i> 发送中...';
    waiting.style.display='';
  }
  ocSubmit(q).then(ok=>{
    if(waiting){
      waiting.innerHTML=ok?'<i data-lucide="check" style="width:11px;height:11px"></i> 已发送':'<i data-lucide="clipboard-copy" style="width:11px;height:11px"></i> 已复制到剪贴板';
      if(typeof lucide!=='undefined') lucide.createIcons();
    }
  });
}

function bindChatEvents(){
  const chatBtns=document.querySelectorAll('.ai-btn[data-study-id]');
  chatBtns.forEach(btn=>{
    btn.addEventListener('click',function(){
      const id=this.dataset.studyId;
      if(id) openChat(id);
    });
  });
}
