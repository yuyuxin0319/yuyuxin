03.08 11:03
// 工具函数
function safeJSONParse(str, defaultValue) {
  try { return JSON.parse(str) || defaultValue; } catch { return defaultValue; }
}
function $(id) { return document.getElementById(id); }
// 全局变量
let target='', photos=[], selectMode=false, selected=[], currIdx=0
let users = safeJSONParse(localStorage.getItem('wx_users'), []) // 用户数据库，初始为空
let currentUser = null
// 时钟
setInterval(()=>{const d=new Date(); $('clock').innerText=`${String(d.getHours()).padStart(2,0)}:${String(d.getMinutes()).padStart(2,0)}`},1000)
// 应用切换
function openApp(id){
  document.querySelectorAll('.screen').forEach(s=>{ s.classList.add('hidden'); s.classList.remove('active') });
  $(id).classList.remove('hidden'); $(id).classList.add('active');
  if(id === 'chat-screen') {
    if(!currentUser) {
      $('wx-login-page').style.display='flex';
      $('wx-main').style.display='none';
    } else {
      $('wx-login-page').style.display='none';
      $('wx-main').style.display='block';
      wxTab('list', {target: document.querySelector('.wx-tab-item')});
    }
  }
}
function goHome(){ openApp('home') }
// 美化相关
function setTarget(t){ target=t; $('file').click() }
$('file').onchange = e => {
  const f=e.target.files[0]; if(!f) return;
  const u = URL.createObjectURL(f);
  if(target==='wallpaper') $('home').style.backgroundImage=`url(${u})`;
  else if(target==='avatar') $(target).innerHTML=`<img src="${u}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  else if(target==='clock') $(target).style.background=`url(${u}) center/cover`;
  else if(target.startsWith('widget-')) $(target).innerHTML=`<img src="${u}" style="width:100%;height:100%;object-fit:cover;">`;
  $('file').value=''; alert('更换成功啦！');
}
// 相册
function render(){
  const g=$('photoGrid'); g.innerHTML='';
  photos.forEach((p,i)=>{
    const div=document.createElement('div');
    div.className='photo-item'+(selected.includes(i)?' selected':'');
    div.style.backgroundImage=`url(${p.url})`;
    div.onclick=()=>selectMode?toggle(i):openDetail(i);
    g.appendChild(div);
  })
}
function toggleSelect(){ selectMode=!selectMode; selected=[]; document.querySelectorAll('.btn-red,.btn-green').forEach(b=>b.style.display=selectMode?'inline-block':'none'); render() }
function toggle(i){ selected = selected.includes(i) ? selected.filter(x=>x!==i) : [...selected,i]; render() }
function delSelect(){ if(selected.length&&confirm('确定删除？')){ photos=photos.filter((_,i)=>!selected.includes(i)); selected=[]; selectMode=false; document.querySelectorAll('.btn-red,.btn-green').forEach(b=>b.style.display='none'); render() } }
function shareSelect(){ alert('分享成功！') }
function openDetail(i){
  currIdx=i; const p=photos[i]; const t=new Date(p.time);
  $('showImg').src=p.url;
  $('showTime').innerText=`${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2,0)}`;
  $('photo-detail').classList.remove('hidden');
}
function closeDetail(){ $('photo-detail').classList.add('hidden') }
function openFirstPhoto(){ photos.length?openDetail(0):alert('还没照片哦') }
function shareDetail(){ alert('分享成功！') }
function removeDetail(){ if(confirm('确定移出？')){ photos.splice(currIdx,1); closeDetail(); render() } }
function delDetail(){ if(confirm('确定删除？')){ photos.splice(currIdx,1); closeDetail(); render() } }
function setWallpaper(){ if(confirm('设为壁纸？')){ $('home').style.backgroundImage=`url(${photos[currIdx].url})`; alert('壁纸设置成功！') } }
$('galleryFile').onchange = e => {
  [...e.target.files].forEach(f=>photos.push({url:URL.createObjectURL(f),time:Date.now()}));
  render(); alert('照片添加成功！'); $('galleryFile').value=''
}
// 设置页API
async function pullModel(){
  const url=$('apiUrl').value, key=$('apiKey').value;
  if(!url||!key){ alert('先填API地址和密钥'); return }
  try{
    let baseUrl=url;
    if(baseUrl.includes('/chat/completions')) baseUrl=baseUrl.replace('/chat/completions','/models');
    if(!baseUrl.endsWith('/models')) baseUrl=baseUrl.replace(/\/$/,'')+'/models';
    const res=await fetch(baseUrl,{headers:{Authorization:`Bearer ${key}`}});
    const data=await res.json();
    if(data&&data.data){
      const dl=$('modelList'); dl.innerHTML='';
      data.data.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; dl.appendChild(o) });
    }
    alert('拉取成功')
  }catch(e){ alert('网络或接口错误') }
}
function saveConfig(){
  localStorage.apiUrl=$('apiUrl').value; localStorage.apiKey=$('apiKey').value; localStorage.apiModel=$('apiModel').value;
  alert('配置保存成功')
}
// ========== 微信功能 ==========
// 登录
function login() {
  let acc = $('login-account').value.trim()
  let pwd = $('login-pwd').value
  if(acc === '') { alert('请输入账号'); return }
  let user = users.find(u => u.account === acc)
  if(!user) {
    // 创建新用户
    let newId = users.length > 0 ? Math.max(...users.map(u=>u.id)) + 1 : 1
    user = {
      id: newId,
      account: acc,
      pwd: pwd,
      name: acc,
      avatar: '',
      friends: [],
      requests: [],
      chatLogs: {}  // { 好友id: [{from: 发送者id, content: 'xx', type: 'text'/'system'}] }
    }
    users.push(user)
    saveUsers()
  } else {
    if(user.pwd !== pwd) {
      alert('密码错误')
      return
    }
  }
  currentUser = JSON.parse(JSON.stringify(user)) // 克隆
  $('wx-login-page').style.display = 'none'
  $('wx-main').style.display = 'block'
  // 更新“我”页面信息
  $('me-avatar').innerHTML = currentUser.avatar ? `<img src="${currentUser.avatar}" style="width:100%;height:100%;border-radius:50%">` : ''
  $('me-name').innerText = currentUser.name
  $('me-account').innerText = '账号: ' + currentUser.account
  wxTab('list', {target: document.querySelector('.wx-tab-item')})
  renderMyAvatars()
}
// 退出登录
function logout() {
  currentUser = null
  $('wx-main').style.display = 'none'
  $('wx-login-page').style.display = 'flex'
}
// tab切换
function wxTab(p, event) {
  document.querySelectorAll('.wx-tab-item').forEach(i=>i.classList.remove('active'))
  event.target.classList.add('active')
  $('wx-page-list').classList.add('hidden')
  $('wx-page-contact').classList.add('hidden')
  $('wx-page-me').classList.add('hidden')
  $('wx-page-chat').classList.add('hidden')
  if(p === 'list') {
    $('wx-page-list').classList.remove('hidden')
    renderChatList()
  } else if(p === 'contact') {
    $('wx-page-contact').classList.remove('hidden')
    let reqCount = currentUser.requests.length
    let badge = $('request-badge')
    if(reqCount>0) { badge.style.display='inline'; badge.innerText=reqCount } else badge.style.display='none'
  } else {
    $('wx-page-me').classList.remove('hidden')
  }
}
// 渲染聊天列表
function renderChatList() {
  let l = $('wx-chat-list')
  l.innerHTML = ''
  if(!currentUser) return
  currentUser.friends.forEach(fid => {
    let friend = users.find(u => u.id === fid)
    if(friend) {
      l.innerHTML += `<div class="wx-item" onclick="openChat(${friend.id})">
        <div class="wx-avatar" style="background-image:url(${friend.avatar})"></div>
        <div class="wx-name">${friend.name}</div>
      </div>`
    }
  })
}
// 渲染我的头像（聊天页顶部）
function renderMyAvatars() {
  let b = $('myAvatars')
  b.innerHTML = ''
  if(!currentUser) return
  b.innerHTML += `<div class="my-avatar active" style="background-image:url(${currentUser.avatar})"></div>`
}
// 打开聊天
function openChat(fid) {
  $('wx-page-list').classList.add('hidden')
  $('wx-page-contact').classList.add('hidden')
  $('wx-page-me').classList.add('hidden')
  $('wx-page-chat').classList.remove('hidden')
  $('wx-page-chat').setAttribute('data-fid', fid)
  renderChat(fid)
}
// 渲染聊天内容（支持气泡和系统消息）
function renderChat(fid) {
  let box = $('chatBox')
  box.innerHTML = ''
  if(!currentUser) return
  let logs = currentUser.chatLogs[fid] || []
  logs.forEach(m => {
    if(m.type === 'system') {
      box.innerHTML += `<div class="system-message">${m.content}</div>`
    } else {
      let isU = m.from === currentUser.id
      let bubbleClass = isU ? 'bubble-right' : 'bubble-left'
      let alignClass = isU ? 'message-right' : 'message-left'
      box.innerHTML += `<div class="message ${alignClass}">
        <div class="bubble ${bubbleClass}">${m.content}</div>
      </div>`
    }
  })
  box.scrollTop = box.scrollHeight
}
// 发送消息
function send() {
  let msg = $('msgInput').value.trim()
  if(!msg) return
  let fid = $('wx-page-chat').getAttribute('data-fid')
  if(!fid) return
  // 给自己存
  if(!currentUser.chatLogs[fid]) currentUser.chatLogs[fid] = []
  currentUser.chatLogs[fid].push({from: currentUser.id, content: msg, type: 'text'})
  // 给对方存
  let friend = users.find(u => u.id == fid)
  if(friend) {
    if(!friend.chatLogs[currentUser.id]) friend.chatLogs[currentUser.id] = []
    friend.chatLogs[currentUser.id].push({from: currentUser.id, content: msg, type: 'text'})
  }
  renderChat(fid)
  $('msgInput').value = ''
  saveUsers()
}
// 添加好友相关
function showAddFriend() { $('wx-add-friend').classList.remove('hidden') }
function hideAddFriend() { $('wx-add-friend').classList.add('hidden'); $('search-result').innerHTML = '' }
function searchFriend() {
  let acc = $('search-account').value
  let user = users.find(u => u.account === acc && u.id !== currentUser.id)
  let resDiv = $('search-result')
  if(user) {
    resDiv.innerHTML = `<div class="wx-item" style="justify-content:space-between;">
      <div><div class="wx-avatar" style="background-image:url(${user.avatar})"></div>${user.name}</div>
      <button onclick="sendRequest(${user.id})" style="background:#07c160;color:#fff;border:none;border-radius:5px;padding:5px 10px;">发送请求</button>
    </div>`
  } else {
    resDiv.innerHTML = '<p>用户不存在</p>'
  }
}
function sendRequest(toId) {
  let toUser = users.find(u => u.id === toId)
  if(toUser) {
    if(currentUser.friends.includes(toId)) { alert('已是好友'); return }
    if(toUser.requests.some(r => r.from === currentUser.id)) { alert('已发送过请求'); return }
    toUser.requests.push({from: currentUser.id, name: currentUser.name, avatar: currentUser.avatar})
    saveUsers()
    alert('请求已发送')
    hideAddFriend()
  }
}
// 新的朋友
function showRequests() {
  $('wx-requests-page').classList.remove('hidden')
  let listDiv = $('requests-list')
  listDiv.innerHTML = ''
  if(currentUser.requests.length === 0) { listDiv.innerHTML = '<p style="padding:20px;">暂无请求</p>'; return }
  currentUser.requests.forEach((r, idx) => {
    listDiv.innerHTML += `<div class="request-item">
      <div><div class="wx-avatar" style="background-image:url(${r.avatar})"></div>${r.name}</div>
      <div><button onclick="acceptRequest(${idx})">同意</button></div>
    </div>`
  })
}
// 同意请求，并发送系统消息
function acceptRequest(idx) {
  let req = currentUser.requests[idx]
  if(!currentUser.friends.includes(req.from)) currentUser.friends.push(req.from)
  let fromUser = users.find(u => u.id === req.from)
  if(fromUser && !fromUser.friends.includes(currentUser.id)) fromUser.friends.push(currentUser.id)
  let systemContent = '我通过了你的好友申请，现在我们可以开始聊天了'
  // 给自己存系统消息
  if(!currentUser.chatLogs[req.from]) currentUser.chatLogs[req.from] = []
  currentUser.chatLogs[req.from].push({from: currentUser.id, content: systemContent, type: 'system'})
  // 给对方存系统消息
  if(fromUser) {
    if(!fromUser.chatLogs[currentUser.id]) fromUser.chatLogs[currentUser.id] = []
    fromUser.chatLogs[currentUser.id].push({from: currentUser.id, content: systemContent, type: 'system'})
  }
  currentUser.requests.splice(idx, 1)
  saveUsers()
  hideRequests()
  alert('已添加好友')
}
function hideRequests() {
  $('wx-requests-page').classList.add('hidden')
  wxTab('contact', {target: document.querySelector('.wx-tab-item:nth-child(2)')})
}
// 通讯录好友列表
function showContactList() {
  $('wx-contact-list').classList.remove('hidden')
  let listDiv = $('contact-list')
  listDiv.innerHTML = ''
  if(currentUser.friends.length === 0) { listDiv.innerHTML = '<p style="padding:20px;">暂无好友</p>'; return }
  currentUser.friends.forEach(fid => {
    let friend = users.find(u => u.id === fid)
    if(friend) {
      listDiv.innerHTML += `<div class="wx-item" onclick="openChatFromContact(${friend.id})">
        <div class="wx-avatar" style="background-image:url(${friend.avatar})"></div>
        <div class="wx-name">${friend.name}</div>
      </div>`
    }
  })
}
function openChatFromContact(fid) { hideContactList(); openChat(fid) }
function hideContactList() { $('wx-contact-list').classList.add('hidden') }
// 保存用户数据
function saveUsers() { localStorage.setItem('wx_users', JSON.stringify(users)) }
// 关闭心语弹窗
function closeHeart() { $('heartPopup').classList.add('heart-hide') }
window.onload = () => {
  if(localStorage.apiUrl) $('apiUrl').value = localStorage.apiUrl
  if(localStorage.apiKey) $('apiKey').value = localStorage.apiKey
  if(localStorage.apiModel) $('apiModel').value = localStorage.apiModel
}
