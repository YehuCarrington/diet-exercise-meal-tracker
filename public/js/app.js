"use strict";
/* Plateful app: storage, sync, screens and actions. */
var S=clone(DEF);
try{var raw=localStorage.getItem(KEY);if(raw){S=merge(JSON.parse(raw));}}catch(e){}
var baseline=clone(S);          /* last saved copy, used to work out which days and blocks changed */
var syncState="device",saveTimer=null,writing=Promise.resolve();
function store(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function save(){
  var now=Date.now();prune();stampChanges(baseline,S,now);S.updated=now;baseline=clone(S);
  store();push();
}
function prune(){var cut=key(addDays(new Date(),-400));DAYSECS.forEach(function(k){for(var d in S[k])if(d<cut)delete S[k][d];});for(var m in S.mod)if(m<cut)delete S.mod[m];}
function setSync(s){syncState=s;var el=document.getElementById("sync");if(el)el.textContent=syncText();}
function syncText(){return {account:"Synced",device:"On this device only",offline:"Offline, will sync later",badkey:"Sync key rejected"}[syncState];}
var SK="cutplan-sync",syncKey="";try{syncKey=localStorage.getItem(SK)||"";}catch(e){}
var me=null,authReady=false,signinErr=/[?&]signin=/.test(location.search||"");
function api(method,body){var hd={"Content-Type":"application/json"};if(syncKey&&!me)hd.Authorization="Bearer "+syncKey;return fetch("/api/state",{method:method,cache:"no-store",headers:hd,body:body?JSON.stringify(body):undefined});}
function whoami(){return fetch("/api/me",{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j){me=j.email||null;authReady=!!j.configured;}}).catch(function(){}).then(function(){render();});}
function push(){
  if(!syncKey&&!me)return;clearTimeout(saveTimer);
  saveTimer=setTimeout(function(){var body=clone(S);
    writing=writing.then(function(){return api("PUT",body);}).then(function(r){
      if(r.status===409){pull();return;}            /* the server has something newer: merge with it, then send again */
      setSync(r.ok?"account":r.status===401?"badkey":"offline");},function(){setSync("offline");});},700);
}
function pull(){
  if(!syncKey&&!me){setSync("device");return;}
  api("GET").then(function(r){
    if(r.status===401){setSync("badkey");return null;}
    if(r.status===404){if(S.updated)push();else setSync("account");return null;}
    if(!r.ok)throw new Error("http "+r.status);return r.json();
  }).then(function(remote){
    if(!remote)return;remote=merge(remote);
    var merged=mergeStates(S,remote),changedHere=!sameData(merged,S),behindThere=!sameData(merged,remote);
    if(changedHere){S=merged;baseline=clone(S);store();render();}
    if(behindThere){S.updated=Date.now();baseline=clone(S);store();push();}
    setSync("account");
  }).catch(function(){setSync("offline");});
}
document.addEventListener("visibilitychange",function(){if(!document.hidden)pull();});
if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){});}

function drawChart(){
  var el=document.getElementById("chart");if(!el)return;var s=S.settings,ks=Object.keys(S.weights).sort();
  var W=520,H=220,L=36,R=12,T=12,B=24,today=new Date(),step=kgMode()?2:5,goal=wNum(s.goal),start=wNum(s.start);
  var first=ks.length?parseKey(ks[0]):today,span=Math.max(28,Math.round((today-first)/864e5)+3);
  var vals=ks.map(function(k){return wNum(S.weights[k]);}).concat([start,goal]);
  var lo=Math.floor((Math.min.apply(null,vals)-step/2)/step)*step,hi=Math.ceil((Math.max.apply(null,vals)+step/2)/step)*step;
  var x=function(d){return L+(W-L-R)*(Math.round((d-first)/864e5))/span;},y=function(v){return T+(H-T-B)*(hi-v)/(hi-lo);};
  var g='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="Weight over time against a goal of '+wOut(s.goal,0)+" "+U()+'">';
  var every=Math.max(1,Math.ceil((hi-lo)/step/6));
  for(var v=lo,n=0;v<=hi;v+=step,n++){if(n%every)continue;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(L-6)+'" y="'+(y(v)+4)+'" text-anchor="end">'+v+'</text>';}
  g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(goal)+'" y2="'+y(goal)+'" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="'+(W-R)+'" y="'+(y(goal)-5)+'" text-anchor="end" style="fill:var(--accent)">goal '+wOut(s.goal,0)+'</text>';
  [0,Math.round(span/2),span].forEach(function(n,i){var d=addDays(first,n);g+='<text x="'+x(d)+'" y="'+(H-6)+'" text-anchor="'+(i===0?"start":i===2?"end":"middle")+'">'+d.toLocaleDateString(undefined,{day:"numeric",month:"short"})+'</text>';});
  if(!ks.length){g+='<circle cx="'+x(today)+'" cy="'+y(start)+'" r="5" fill="var(--accent)"/><text x="'+(x(today)+10)+'" y="'+(y(start)+4)+'">start '+wOut(s.start,0)+' (log a reading to begin)</text>';}
  var pts=[];ks.forEach(function(k){var d=parseKey(k),w=[];for(var i=0;i<7;i++){var q=S.weights[key(addDays(d,-i))];if(q)w.push(wNum(q));}pts.push([x(d),y(avg(w))]);g+='<circle cx="'+x(d)+'" cy="'+y(wNum(S.weights[k]))+'" r="3" fill="var(--muted)" opacity=".55"/>';});
  if(pts.length>1)g+='<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="'+pts.map(function(p){return p[0].toFixed(1)+","+p[1].toFixed(1);}).join(" ")+'"/>';
  if(pts.length)g+='<circle cx="'+pts[pts.length-1][0]+'" cy="'+pts[pts.length-1][1]+'" r="5" fill="var(--accent)"/>';
  el.innerHTML=g+"</svg>";
}

/* ---------- small visual builders ---------- */
function ring(n,size){var r=40,C=2*Math.PI*r,seg=C/4-6,g='<svg class="ring" viewBox="0 0 100 100" width="'+size+'" height="'+size+'" role="img" aria-label="'+n+' of 4 plates eaten">';
  for(var i=0;i<4;i++)g+='<circle cx="50" cy="50" r="'+r+'" fill="none" stroke="'+(i<n?"var(--accent)":"var(--line)")+'" stroke-width="11" stroke-linecap="round" stroke-dasharray="'+seg.toFixed(1)+" "+(C-seg).toFixed(1)+'" transform="rotate('+(i*90-90+4)+' 50 50)"/>';
  return g+'<text x="50" y="58" text-anchor="middle" style="font-size:26px">'+n+'/4</text></svg>';}
function meter(label,val,max,unit,cls){return '<div class="meter"><div class="lab"><span>'+label+'</span><span><b>'+val+'</b> / '+max+" "+unit+'</span></div><div class="bar '+(cls||"")+'"><i style="width:'+Math.min(100,max?val/max*100:0)+'%"></i></div></div>';}
function seg(group,opts,cur){return '<div class="seg" role="tablist">'+opts.map(function(o){return '<button role="tab" aria-selected="'+(o[0]===cur)+'" class="'+(o[0]===cur?"on":"")+'" data-act="seg" data-g="'+group+'" data-v="'+o[0]+'">'+o[1]+'</button>';}).join("")+'</div>';}
function chips(items){return '<div class="chips">'+items.map(function(x){return '<span class="chip"><span class="e" aria-hidden="true">'+x.i+'</span>'+esc(gloss(x.x))+'</span>';}).join("")+'</div>';}
/* A plate seen from above, divided by where its calories come from. */
function plateSvg(items,size){
  var sh=plateShares(items);if(!sh.length)return "";
  var a0=-Math.PI/2,g='<svg class="plate" viewBox="0 0 100 100" width="'+size+'" height="'+size+'" role="img" aria-label="Calories from: '+sh.map(function(s){return Math.round(s[1]*100)+"% "+GROUPS[s[0]];}).join(", ")+'"><circle cx="50" cy="50" r="48" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/><circle cx="50" cy="50" r="40" fill="var(--bg)"/>';
  sh.forEach(function(s){var a1=a0+s[1]*2*Math.PI;
    if(s[1]>.999)g+='<circle cx="50" cy="50" r="38" fill="var(--g-'+s[0]+')"/>';
    else g+='<path d="M50 50L'+(50+38*Math.cos(a0)).toFixed(1)+" "+(50+38*Math.sin(a0)).toFixed(1)+"A38 38 0 "+(s[1]>.5?1:0)+" 1 "+(50+38*Math.cos(a1)).toFixed(1)+" "+(50+38*Math.sin(a1)).toFixed(1)+'Z" fill="var(--g-'+s[0]+')" stroke="var(--surface)" stroke-width="1.5"/>';
    a0=a1;});
  return g+"</svg>";
}
function plateLegend(){return '<div class="legend" aria-hidden="true"><span>Plate colours:</span>'+["protein","starch","veg","fruit","fat"].map(function(g){return '<span><i class="sw" style="background:var(--g-'+g+');border-radius:50%"></i>'+{protein:"Protein",starch:"Starch",veg:"Veg",fruit:"Fruit",fat:"Fats"}[g]+'</span>';}).join("")+'</div>';}

/* ---------- views ---------- */
var NAV={today:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>',plan:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',train:'<path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12"/>',track:'<path d="M4 19V5M4 19h16M7 15l4-4 3 3 5-6"/>',more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'};
var TABS=[["today","Today"],["plan","Plan"],["train","Train"],["track","Track"],["more","More"]];
var sub={plan:"week",track:"calendar",more:"setup"},planDay=null,trainSel=null,calMonth=null,calSel=null,resetArmed=false,delArmed=false,swapOpen=null,editW=false,wErr="",finArmed=false,shopWk=null;
function route(){var h=(location.hash||"").replace("#","");return TABS.some(function(t){return t[0]===h;})?h:"today";}
function todayWorkout(){var k=key(new Date());return S.workouts[k]||{d:trainSel||nextDay(),sets:{}};}
function render(){
  var nv=document.getElementById("nav");
  if(!S.settings.onboarded){if(!wiz)wizInit();if(nv&&nv.style)nv.style.display="none";document.getElementById("app").innerHTML=vWizard();return;}
  if(nv&&nv.style)nv.style.display="";
  var r=route();
  document.getElementById("tabs").innerHTML=TABS.map(function(t){return '<a href="#'+t[0]+'"'+(t[0]===r?' class="on" aria-current="page"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+NAV[t[0]]+'</svg>'+t[1]+'</a>';}).join("");
  document.getElementById("app").innerHTML=({today:vToday,plan:vPlan,train:vTrain,track:vTrack,more:vMore})[r]();
  if(r==="track"&&sub.track==="weight")drawChart();
}
function vToday(){
  var now=new Date(),P=dayPlan(now),tm=times(),nowM=now.getHours()*60+now.getMinutes(),done=S.done[P.key]||{},n=plates(P.key),nextSet=false,w=S.weights[P.key],ek=0,ep=0,water=S.water[P.key]||0;
  P.meals.forEach(function(m){if(done[m.slot.id]){ek+=m.kcal;ep+=m.prot;}});
  var h='<header class="row spread"><div><p class="muted small">'+DAYS[dow(now)]+", "+now.toLocaleDateString(undefined,{day:"numeric",month:"short"})+'</p><h1>Today</h1></div><span class="sync" id="sync">'+syncText()+'</span></header>';
  var F=forecast(),yk=key(addDays(now,-1)),used=daysUsed();
  h+='<p class="small muted num">🎯 '+wOut(F.cur,0)+' → '+wOut(S.settings.goal,0)+" "+U()+(F.eta?' · about '+F.eta.toLocaleDateString(undefined,{month:"short",year:"numeric"}):"")+(used>0?' · day '+(used+1)+' · yesterday '+plates(yk)+'/4':"")+'</p>';
  h+='<div class="card hero">'+ring(n,104)+'<div class="grow" style="display:flex;flex-direction:column;gap:12px">'+meter("Energy",ek,P.target,"kcal")+meter("Protein, minimum",ep,P.T.protein,"g","p")+'</div></div>';
  var rail='<div class="rail" aria-hidden="true">',firstOpen=null;
  P.meals.forEach(function(m){var id=m.slot.id,d=!!done[id];if(!d&&!firstOpen)firstOpen=id;rail+='<div class="stop'+(d?" done":"")+(firstOpen===id?" next":"")+'"><span class="dot">'+(d?"✓":SLOTE[id])+'</span>'+clock(tm[id]).replace(" ","")+'</div>';});
  h+=rail+'<div class="stop"><span class="dot">🔒</span>'+clock(tm.close).replace(" ","")+'</div></div>';
  if(n===4)h+='<div class="note" style="background:var(--accent-soft)"><span class="e" aria-hidden="true">✅</span><span><b>All four plates.</b> That is the whole job for today.</span></div>';
  if(!w||editW)h+='<div class="card"><div class="row"><span class="slotic" aria-hidden="true">⚖️</span><label class="f" for="wq">Morning weight, '+U()+'<input id="wq" type="number" inputmode="decimal" step="0.1" value="'+(w?wOut(w):"")+'" placeholder="'+wOut(currentWeight())+'"></label><button class="btn primary" data-act="logw" data-src="wq">Log</button></div>'+(wErr?'<p class="err" role="alert">'+wErr+'</p>':"")+'</div>';
  else h+='<div class="card"><div class="row spread"><div class="row"><span class="slotic" aria-hidden="true">⚖️</span><span><b class="num">'+wOut(w)+" "+U()+'</b> logged this morning</span></div><button class="btn" data-act="editw">Edit</button></div></div>';
  h+=plateLegend();
  P.meals.forEach(function(m){
    var id=m.slot.id,isDone=!!done[id],isNext=!isDone&&!nextSet;if(isNext)nextSet=true;
    h+='<section class="card meal'+(isDone?" done":"")+(isNext?" next":"")+'"><div class="row spread"><div class="row"><span class="slotic" aria-hidden="true">'+SLOTE[id]+'</span><div><span class="time">'+clock(tm[id])+'</span><span class="muted small">'+m.slot.label+'</span></div></div>'+(isNext?'<span class="pill'+(nowM>tm[id]+45?" warn":"")+'">'+(nowM>tm[id]+45?"Overdue":"Next")+'</span>':isDone?'<span class="pill">✓ Eaten</span>':"")+'</div>';
    h+='<div class="row" style="flex-wrap:nowrap;align-items:center"><h2 class="grow">'+esc(gloss(m.meal.n))+'</h2>'+plateSvg(m.items,64)+'</div>'+chips(m.items);
    h+='<div class="row"><span class="tag">🔥 <b>'+m.kcal+'</b> kcal</span><span class="tag">💪 <b>'+m.prot+' g</b> protein</span></div>';
    h+=(m.meal.how?'<p class="small">'+esc(gloss(m.meal.how))+'</p>':"")+(m.meal.src?'<a class="demo" target="_blank" rel="noopener" href="'+esc(m.meal.src)+'">Open the recipe ↗</a>':"")+'<details><summary>Why this plate</summary><p>'+esc(m.slot.why)+'</p></details>';
    h+='<div class="row"><button class="btn big '+(isDone?"":"primary")+'" data-act="done" data-id="'+id+'">'+(isDone?"Undo":"✓ Eaten")+'</button><button class="btn" data-act="swap" data-id="'+id+'" aria-expanded="'+(swapOpen===id)+'">⟳ Swap</button></div>';
    if(swapOpen===id){
      h+='<div class="opts">'+MEALS[id].map(function(o,oi){if((o.free&&dow(now)!==5)||banned(o))return "";var mt=mealTotals(o);return '<button class="opt'+(o===m.meal?" on":"")+'" data-act="pick" data-id="'+id+'" data-n="'+oi+'"><span>'+esc(gloss(o.n))+'</span><span class="tag">'+mt.k+' kcal · '+mt.p+' g</span></button>';}).join("")+customList(id).map(function(o){var mt=mealTotals(o),cv="c:"+o.cid;return '<button class="opt'+(m.meal.cid===o.cid?" on":"")+'" data-act="pick" data-id="'+id+'" data-n="'+cv+'"><span>'+esc(o.n)+' <span class="pill">Yours</span></span><span class="tag">'+mt.k+' kcal · '+mt.p+' g</span></button>';}).join("")+'</div>';}
    h+='</section>';
  });
  h+='<div class="note"><span class="e" aria-hidden="true">🔒</span><span><b>Kitchen closes '+clock(tm.close)+'.</b> Water or unsweetened tea after that.</span></div>';
  h+='<div class="card"><div class="row spread"><h3>Water</h3><span class="tag"><b>'+(water*.5).toFixed(1)+'</b> / 2.5 L</span></div><div class="drops">';
  for(var i=1;i<=5;i++)h+='<button class="drop'+(i<=water?" on":"")+'" data-act="water" data-n="'+i+'" aria-label="'+(i*.5)+' litres drunk" aria-pressed="'+(i<=water)+'">💧</button>';
  h+='</div></div>';
  h+='<button class="toggle'+(S.train[P.key]?" on":"")+'" data-act="train" aria-pressed="'+!!S.train[P.key]+'"><span class="slotic" aria-hidden="true">🏋️</span><span>'+(S.train[P.key]?"Training day: one banana added to your snack, nothing else changes":"Training today?")+'</span></button>';
  h+='<div class="tiles"><div class="tile"><span class="e">🥤</span>No sweet drinks</div><div class="tile"><span class="e">🍟</span>Nothing fried</div><div class="tile"><span class="e">📦</span>Nothing from a packet</div><div class="tile">'+(mode()==="gain"?'<span class="e">🍽️</span>Not hungry? Eat the plate anyway':'<span class="e">🥒</span>Hungry? Cucumber or '+esc(gloss("pawpaw")))+'</div></div>';
  return h;
}
function vPlan(){
  var t=new Date(),mon=addDays(t,-dow(t)),veg=S.settings.noMeat,h='<header><h1>Plan</h1></header>'+seg("plan",[["week","Week"],["shop","Shop"],["recipes","Recipes"]],sub.plan);
  if(sub.plan==="week"){
    var selK=planDay||key(t);h+='<div class="strip">';
    for(var i=0;i<7;i++){var d=addDays(mon,i),k=key(d),n=plates(k);h+='<button class="'+(k===selK?"on ":"")+(k===key(t)?"today":"")+'" data-act="planday" data-k="'+k+'" aria-label="'+DAYS[i]+", "+n+' of 4 plates"><b>'+DAYS[i].slice(0,3)+'</b><span class="num">'+d.getDate()+'</span><span class="pips">'+[0,1,2,3].map(function(j){return '<i'+(j<n?' class="on"':"")+'></i>';}).join("")+'</span></button>';}
    h+='</div>';
    var P=dayPlan(parseKey(selK)),tm=times();
    h+='<div class="card"><div class="row spread"><h2>'+DAYS[dow(parseKey(selK))]+'</h2><span class="tag">🔥 <b>'+P.kcal+'</b> · 💪 <b>'+P.prot+' g</b></span></div><div>'+P.meals.map(function(m){
      return '<div class="prow">'+plateSvg(m.items,44)+'<div class="grow"><p class="small muted num">'+clock(tm[m.slot.id])+" · "+m.slot.label+'</p><p><b>'+esc(gloss(m.meal.n))+'</b></p><p class="ings" aria-hidden="true">'+m.items.map(function(x){return x.i;}).join("")+'</p></div></div>';}).join("")+'</div></div>';
    if(veg){
      h+='<div class="card"><div class="row spread"><h2>Sunday cook-up</h2><span class="pill">60 min</span></div><ol class="steps"><li><span class="e">🫘</span><span>'+esc(gloss("A big pot of lentils with pumpkin, and a pot of dhal."))+'</span></li><li><span class="e">🍚</span><span>A pot of rice.</span></li><li><span class="e">🍠</span><span>'+esc(gloss("Boil 2 kg provision, drain, cool."))+'</span></li><li><span class="e">🥡</span><span>Soak, squeeze and stew the soya chunks for the week.</span></li><li><span class="e">📦</span><span>Box 5 lunches. Fridge Mon to Wed, freeze Thu and Fri.</span></li></ol></div>';
    }else{
      h+='<div class="card"><div class="row spread"><h2>Sunday cook-up</h2><span class="pill">75 min</span></div><ol class="steps"><li><span class="e">🍗</span><span>'+esc(gloss("Rub the chicken with green seasoning. Bake at 200°C: breast 22 min, thighs 30."))+'</span></li><li><span class="e">🍚</span><span>'+esc(gloss("Meanwhile: a pot of rice, a pot of dhal, a pot of lentils with pumpkin."))+'</span></li><li><span class="e">🍠</span><span>'+esc(gloss("Boil the week's provision, drain, cool."))+'</span></li><li><span class="e">📦</span><span>Box 5 lunches. Fridge Mon to Wed, freeze Thu and Fri.</span></li>'+(S.settings.noFish?"":'<li><span class="e">🐟</span><span>'+esc(gloss("Boil the saltfish for two breakfasts."))+'</span></li>')+'</ol><p class="small muted">Amounts for all of this are on the Shop tab.</p></div>';
      if(!S.settings.noFish)h+='<div class="card"><div class="row spread"><h2>Wednesday top-up</h2><span class="pill">20 min</span></div><ol class="steps"><li><span class="e">🐟</span><span>Buy fresh fish for tonight and Friday.</span></li><li><span class="e">🍲</span><span>Make the soup pot for Wednesday and Sunday.</span></li></ol></div>';
    }
  }else if(sub.plan==="shop"){
    var wk=shopWk===null?(dow(t)>=5?1:0):shopWk,rg=shopRange(wk),list=shopList(rg.start,rg.days),tot=0,got=0;
    list.forEach(function(c){c.items.forEach(function(it){tot++;if(S.shop[it.id])got++;});});
    h+=seg("shopwk",[["0","Rest of this week"],["1","Next week"]],String(wk));
    h+='<div class="card">'+meter("In the trolley",got,tot,"items")+'<p class="small muted">Built from your plates for '+rg.start.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})+" to "+addDays(rg.start,rg.days-1).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})+', including swaps and your own meals.</p></div>';
    list.forEach(function(c){h+='<div class="card"><h3>'+c.cat+'</h3><div>'+c.items.map(function(it){var on=!!S.shop[it.id];return '<label class="chk'+(on?" on":"")+'" for="'+it.id+'"><input type="checkbox" id="'+it.id+'" data-act="shop"'+(on?" checked":"")+'><span class="e" aria-hidden="true">'+icon(it.name)+'</span><span class="t grow">'+esc(gloss(it.name))+'</span><b class="num">'+esc(it.amt)+'</b></label>';}).join("")+'</div></div>';});
    h+='<button class="btn" data-act="shopreset">Untick everything</button>';
    h+='<p class="small muted">Amounts are raw or dry weights, rounded up. Check your cupboard first. Saturday\'s free meal is not included. Pantry items to keep in: oil, garlic, ginger, '+esc(gloss("green seasoning"))+', salt.</p>';
    h+='<div class="tiles"><div class="tile"><span class="e">🥤</span>No soft drinks or juice</div><div class="tile"><span class="e">🍪</span>No biscuits or chips</div><div class="tile"><span class="e">🌭</span>No sausages or noodles</div>'+(S.settings.noDairy?'<div class="tile"><span class="e">🥛</span>No milk or yogurt</div>':'<div class="tile"><span class="e">🍦</span>No ice cream or sweet yogurt</div>')+'</div>';
  }else{
    h+=addForm.open?mealForm():'<button class="btn primary big" data-act="addopen">＋ Add your own meal</button>';
    h+='<p class="small muted">These are base portions. Today adjusts the rice, bread and provision to hit your daily target, so amounts there can differ. Tap Swap on a plate to choose any of these.</p>';
    SLOTS.forEach(function(sl){h+='<div class="card"><div class="row"><span class="slotic" aria-hidden="true">'+SLOTE[sl.id]+'</span><h2>'+sl.label+'</h2></div>'+MEALS[sl.id].filter(function(m){return !banned(m);}).map(function(m){var mt=mealTotals(m);
      return '<details><summary><span>'+esc(gloss(m.n))+'<br><span class="tag">'+mt.k+' kcal · '+mt.p+' g protein</span></span></summary>'+chips(m.it.map(function(it){return {x:qty(it,it.q),i:icon(it.t)};}))+'<p>'+esc(gloss(m.how))+'</p></details>';}).join("")+customList(sl.id).map(function(m){var mt=mealTotals(m);return '<details><summary><span>'+esc(m.n)+' <span class="pill">Yours</span><br><span class="tag">'+mt.k+' kcal · '+mt.p+' g protein</span></span></summary>'+chips(m.it.map(function(it){return {x:it.t,i:icon(it.t)};}))+(m.how?'<p>'+esc(m.how)+'</p>':"")+(m.src?'<a class="demo" target="_blank" rel="noopener" href="'+esc(m.src)+'">Open the recipe ↗</a>':"")+'<div><button class="btn danger" data-act="delmeal" data-id="'+m.cid+'">Remove this meal</button></div></details>';}).join("")+'</div>';});
  }
  return h;
}
function vTrain(){
  var k=key(new Date()),w=todayWorkout(),home=S.settings.gym==="home",W=workoutSet()[w.d],tot=0,got=0;
  W.ex.forEach(function(x,i){tot+=x.s;got+=Math.min(x.s,w.sets[i]||0);});
  var h='<header class="row spread"><div><p class="muted small">Day '+w.d+(S.workouts[k]?"":" · next in your rotation")+'</p><h1>'+W.e+" "+W.t+'</h1></div>'+(w.fin?'<span class="pill">✓ Logged</span>':"")+'</header>';
  h+=seg("place",[["gym","🏋️ Gym"],["home","🏠 Home"]],home?"home":"gym");
  h+=seg("trainday",[["A","Day A"],["B","Day B"],["C","Day C"]],w.d);
  h+='<div class="card">'+meter("Sets done",got,tot,"sets")+'</div>';
  h+='<div class="note"><span class="e" aria-hidden="true">🎚️</span><span>'+(home?'<b>No equipment needed.</b> A backpack loaded with books or water bottles is your weight. A sturdy chair and a step cover the rest.':'<b>Choosing a weight.</b> Pick one you could lift two more times than listed. Needs a gym with machines and cables.')+'</span></div>';
  W.ex.forEach(function(x,i){var d=w.sets[i]||0,before=liftBefore(x.n,k);
    h+='<section class="card ex"><div class="row spread"><h3>'+(i+1)+". "+esc(x.n)+'</h3><span class="reps">'+x.s+" × "+x.r+'</span></div><div class="row spread"><div class="sets">';
    for(var s=1;s<=x.s;s++)h+='<button class="set'+(s<=d?" on":"")+'" data-act="set" data-i="'+i+'" data-n="'+s+'" aria-label="Set '+s+" of "+x.s+'" aria-pressed="'+(s<=d)+'">'+(s<=d?"✓":s)+'</button>';
    h+='</div><label class="f lift" for="lf'+i+'">'+(home?"Load, ":"Weight, ")+U()+'<input id="lf'+i+'" type="number" inputmode="decimal" step="0.5" min="0" data-act="lift" data-n="'+esc(x.n)+'" value="'+(S.lifts[x.n]||"")+'" placeholder="'+(home?"optional":"last used")+'"></label></div>'+(before.length?'<p class="small muted num">Before: '+before.join(" → ")+" "+U()+'</p>':"")+'<ul class="cues">'+x.c.map(function(c){return "<li>"+esc(c)+"</li>";}).join("")+'</ul><a class="demo" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query='+encodeURIComponent(x.n+" proper form")+'">▶ Watch demos on YouTube</a></section>';});
  h+='<div class="note"><span class="e" aria-hidden="true">🚶</span><span><b>Finisher.</b> '+esc(W.fin)+'.</span></div>';
  h+='<button class="btn big '+(w.fin?"":"primary")+'" data-act="finish">'+(w.fin?"Undo finished session":finArmed?"Only "+got+" of "+tot+" sets ticked. Tap again to log anyway":"✓ Finish session")+'</button>';
  h+='<div class="tiles"><div class="tile"><span class="e">⏱️</span>Rest 60 to 90 s</div><div class="tile"><span class="e">➕</span>'+(home?"All reps done? Add reps or load the backpack":"All reps done? Add the smallest plate next time")+'</div><div class="tile"><span class="e">🛑</span>Stop 2 reps before failure</div><div class="tile"><span class="e">🍽️</span>Train 90 min after a plate</div></div>';
  h+='<p class="small muted">Three sessions a week with a rest day between, for example Mon, Wed, Fri. Sharp pain means stop that exercise.</p>';
  return h;
}
function vTrack(){
  var h='<header><h1>Track</h1></header>'+seg("track",[["calendar","Calendar"],["weight","Weight"]],sub.track);
  return h+(sub.track==="calendar"?calView():weightView());
}
function calView(){
  var t=new Date(),st=streaks(),m=calMonth||new Date(t.getFullYear(),t.getMonth(),1),first=new Date(m.getFullYear(),m.getMonth(),1),dim=new Date(m.getFullYear(),m.getMonth()+1,0).getDate(),tk=key(t);
  var h='<div class="tiles three"><div class="tile"><span class="e">🔥</span><b>'+st.cur+'</b>day streak</div><div class="tile"><span class="e">🏆</span><b>'+st.best+'</b>best streak</div><div class="tile"><span class="wk" aria-hidden="true">'+st.wk.map(function(x){return '<i'+(x?' class="on"':"")+'></i>';}).join("")+'</span><b>'+st.wk.filter(Boolean).length+'/7</b>this week</div></div>';
  h+='<div class="card"><div class="row spread"><button class="btn" data-act="calnav" data-d="-1" aria-label="Previous month">‹</button><h2>'+first.toLocaleDateString(undefined,{month:"long",year:"numeric"})+'</h2><button class="btn" data-act="calnav" data-d="1" aria-label="Next month">›</button></div><div class="cal">';
  ["M","T","W","T","F","S","S"].forEach(function(d){h+='<span class="dh">'+d+'</span>';});
  for(var b=0;b<dow(first);b++)h+='<span></span>';
  for(var d=1;d<=dim;d++){var k=key(new Date(m.getFullYear(),m.getMonth(),d)),n=plates(k),fut=k>tk;
    h+='<button class="cell l'+n+(fut?" fut":"")+(k===tk?" tod":"")+(k===calSel?" sel":"")+'" data-act="calsel" data-k="'+k+'" aria-label="'+k+": "+n+' of 4 plates'+(S.weights[k]?", weighed":"")+(S.train[k]?", trained":"")+'"><span>'+d+'</span><span class="mk" aria-hidden="true">'+(S.weights[k]?"●":"")+(S.train[k]?"▲":"")+'</span></button>';}
  h+='</div><div class="legend"><span><i class="sw"></i>0</span><span><i class="sw" style="background:var(--accent-soft)"></i>1–2</span><span><i class="sw" style="background:var(--accent)"></i>3–4 plates</span><span>● weighed</span><span>▲ trained</span></div></div>';
  var sk=calSel||tk,sp=dayPlan(parseKey(sk)),sd=S.done[sk]||{},wo=S.workouts[sk];
  h+='<div class="card"><h3>'+parseKey(sk).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})+'</h3><div class="row">'+sp.meals.map(function(x){var on=!!sd[x.slot.id];return '<button class="chip'+(on?" on":"")+'" '+(sk>tk?"disabled":"")+' data-act="caldone" data-k="'+sk+'" data-id="'+x.slot.id+'" aria-pressed="'+on+'" aria-label="'+x.slot.label+'"><span class="e" aria-hidden="true">'+SLOTE[x.slot.id]+'</span>'+(on?"✓":"–")+'</button>';}).join("")+'<button class="chip'+(S.train[sk]?" on":"")+'" '+(sk>tk?"disabled":"")+' data-act="caltrain" data-k="'+sk+'" aria-pressed="'+!!S.train[sk]+'" aria-label="Trained"><span class="e" aria-hidden="true">🏋️</span>'+(wo&&wo.fin?"Day "+wo.d:S.train[sk]?"✓":"–")+'</button><button class="chip" '+(sk>tk?"disabled":"")+' data-act="calwater" data-k="'+sk+'" aria-label="Water, tap to add half a litre"><span class="e" aria-hidden="true">💧</span>'+((S.water[sk]||0)*.5).toFixed(1)+' L</button><span class="chip"><span class="e" aria-hidden="true">⚖️</span>'+(S.weights[sk]?wOut(S.weights[sk])+" "+U():"–")+'</span></div>'+(sk<=tk?'<p class="small muted">Forgot to log? Tap a plate, the gym or the water to fix this day. Weight is logged under Weight.</p>':"")+'</div>';
  h+='<p class="small muted">A day counts toward your streak at 3 of 4 plates, so one missed snack does not reset it. Missing one day is normal. Never miss two in a row.</p>';
  return h;
}
function weightView(){
  var s=S.settings,F=forecast(),cur=F.cur,lost=s.start-cur,left=F.left,tr=F.tr,span=Math.max(.1,Math.abs(s.start-s.goal)),rate=F.rate,eta=F.eta,up=+s.goal>+s.start,u=U();
  var h='<div class="tiles three"><div class="tile"><span class="e">⚖️</span><b>'+wOut(cur)+'</b>'+u+(windowAvg(0,7)?", 7-day avg":", latest reading")+'</div><div class="tile"><span class="e">'+(up?"📈":"📉")+'</span><b>'+(Math.abs(lost)<.05?"":lost>0?"−":"+")+wOut(Math.abs(lost))+'</b>'+u+' since start</div><div class="tile"><span class="e">🎯</span><b>'+wOut(left)+'</b>'+u+" to "+wOut(s.goal,0)+'</div></div>';
  h+='<div class="card">'+meter(wOut(s.start,0)+" "+u+" → "+wOut(s.goal,0)+" "+u,wOut(Math.max(0,up?-lost:lost)),wOut(span),u)+'</div>';
  h+='<div class="card"><div class="row"><label class="f" for="wd">Date<input id="wd" type="date" value="'+key(new Date())+'" max="'+key(new Date())+'"></label><label class="f" for="wv">Weight, '+u+'<input id="wv" type="number" inputmode="decimal" step="0.1"></label></div><button class="btn primary" data-act="logw" data-src="wv">Log weigh-in</button><p class="err" id="wverr" role="alert"></p></div>';
  h+='<div class="card"><div id="chart"></div><div class="legend"><span>● daily</span><span style="color:var(--accent)">━ 7-day average</span><span style="color:var(--accent)">┅ goal</span></div></div>';
  var em={wait:"⏳",ok:"✅",fast:"⚠️",adh:"📋",slow:"🔧"}[tr.state],calm=tr.state==="ok"||tr.state==="wait";
  h+='<div class="'+(calm?"card":"note")+'" style="'+(calm?"":"flex-direction:column;align-items:stretch")+'"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="slotic" aria-hidden="true">'+em+'</span><p class="small">'+esc(tr.msg)+'</p></div>'+(tr.delta?'<button class="btn primary" data-act="adjust" data-delta="'+tr.delta+'">'+(tr.delta<0?"Take 150 kcal off my plates":"Add 150 kcal to my plates")+'</button>':"")+'</div>';
  h+='<div class="card"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="slotic" aria-hidden="true">🗓️</span><p class="small">'+(eta?'About '+wOut(rate)+" "+u+' a week puts you at '+wOut(s.goal,0)+" "+u+' around <b>'+eta.toLocaleDateString(undefined,{month:"long",year:"numeric"})+'</b>. '+(F.own?"Based on your own trend.":"An estimate until you have two weeks of readings."):"You are at your goal. The plan now feeds you what you burn, to hold you here.")+'</p></div></div>';
  var ks=Object.keys(S.weights).sort().reverse().slice(0,10);
  if(ks.length)h+='<div class="card"><h3>Recent readings</h3>'+ks.map(function(k){return '<div class="row spread small"><span class="num">'+parseKey(k).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})+'</span><span class="num">'+wOut(S.weights[k])+" "+u+' <button class="btn ghost" style="min-height:32px;padding:2px 10px" data-act="delw" data-k="'+k+'" aria-label="Remove reading for '+k+'">✕</button></span></div>';}).join("")+'</div>';
  return h;
}
function vMore(){
  var h='<header><h1>More</h1></header>'+seg("more",[["setup","Setup"],["why","Why it works"]],sub.more),T=targets(),s=S.settings;
  if(sub.more==="why"){
    var em=["⚖️","🍗","📦","⏰","📈","🔍","🏋️"];
    SCIENCE.forEach(function(c,i){if(i===0&&mode()==="gain")c={h:"Gaining is an energy surplus",b:"Your body burns roughly {tdee} kcal a day at your size and activity. The plan feeds you about {target}. A surplus near 300 kcal a day adds roughly half a pound a week. With high protein and strength training, much of that can be muscle. A bigger surplus does not build muscle faster. It adds fat faster."};
      if(i===5&&mode()==="gain")c={h:"Why eating more is harder than it sounds",b:"People who struggle to gain usually eat less than they think: a skipped breakfast, a small lunch, one big dinner. Four planned plates at fixed times fix that. Eat each one even when you are not hungry, and let the weekly average tell you whether to add more."};
      var b=c.b.replace("{tdee}",T.tdee).replace("{target}",T.target).replace("{protein}",T.protein).replace("{reflux}",S.settings.reflux?" The gap also keeps reflux down overnight.":"");
      h+='<div class="card"><div class="row" style="flex-wrap:nowrap"><span class="slotic" aria-hidden="true">'+em[i]+'</span><h2>'+esc(c.h)+'</h2></div><p class="small">'+esc(b)+'</p>'+(c.src?'<p class="small">'+c.src.map(function(x){return '<a href="'+x[1]+'" target="_blank" rel="noopener">'+esc(x[0])+'</a>';}).join("<br>")+'</p>':"")+'</div>';});
    h+='<div class="card"><div class="row" style="flex-wrap:nowrap"><span class="slotic" aria-hidden="true">📖</span><h2>Food names</h2></div><p class="small muted">The plates use Trinidad and Tobago names. Switch on "Explain local food names" in Setup to see these beside every ingredient.</p><div>'+GLOSS.map(function(g){return '<div class="row spread small" style="padding:6px 0;border-bottom:1px solid var(--line)"><b>'+esc(g[0])+'</b><span class="muted">'+esc(g[1])+'</span></div>';}).join("")+'</div></div>';
    h+='<p class="small muted">Plate figures are estimates from standard food tables. Your scale trend is the real check. Talk to your doctor before starting if you have a medical condition or take regular medication, and if weight stalls for six weeks on a fully followed plan.</p>';
    return h;
  }
  var kg=kgMode();
  h+='<div class="tiles three"><div class="tile"><span class="e">🔥</span><b>'+T.tdee+'</b>kcal you burn</div><div class="tile"><span class="e">🍽️</span><b>'+T.target+'</b>kcal on the plan</div><div class="tile"><span class="e">💪</span><b>'+T.protein+' g</b>protein floor</div></div>';
  h+='<div class="card">'+seg("units",[["lb","lb and inches"],["kg","kg and cm"]],kg?"kg":"lb")+'<div class="row">'+fld("start","Starting weight, "+U(),"number",wOut(s.start))+fld("goal","Goal weight, "+U(),"number",wOut(s.goal))+fld("height",kg?"Height, cm":"Height, inches","number",kg?Math.round(s.height*2.54):s.height)+fld("age","Age","number",s.age)+fld("wake","Wake-up time","time",s.wake)+fld("bed","Bedtime","time",s.bed)+'</div>'+seg("sex",[["m","Male"],["f","Female"]],s.sex)+seg("act",[["1.3","Mostly sitting"],["1.4","Some exercise"],["1.55","Very active"]],String(s.act))+'<button class="btn primary" data-act="saveset">Save</button><p class="small muted" id="setmsg">'+(s.adjust?"Target includes "+(s.adjust>0?"+":"")+s.adjust+" kcal from your trend.":"")+'</p></div>';
  h+='<div class="card"><h3>Foods to leave out</h3>'+FLAGS.map(function(f){return flagBtn(f,!!s[f[0]],"flag");}).join("")+'</div>';
  h+='<div class="card"><h3>Display</h3>'+flagBtn(PLAIN,!!s.plain,"flag")+'</div>';
  h+='<div class="card"><h3>Your account</h3>'+(me?'<p class="small">Signed in as <b>'+esc(me)+'</b>. '+syncText()+'.</p><div><button class="btn" data-act="logout">Sign out</button></div>':authReady?'<p class="small muted">Sign in to keep your data safe and see it on every device.</p>'+(signinErr?'<p class="err" role="alert">Sign-in did not finish. Try again.</p>':"")+'<a class="btn primary" href="/api/auth/google">Sign in with Google</a>':'<p class="small muted">Sign-in is not switched on for this site yet. Your data is saved on this device.</p>')+'<details><summary>Use a sync key instead</summary><div class="row" style="padding-top:8px"><label class="f" for="f_key">Sync key<input id="f_key" type="password" autocomplete="off" value="'+esc(syncKey)+'"></label><button class="btn" data-act="savekey">Connect</button></div></details></div>';
  h+='<div class="card"><h3>Backup</h3><textarea id="bk" aria-label="Backup data">'+esc(JSON.stringify(S))+'</textarea><div class="row"><button class="btn" data-act="copyb">Copy backup</button><button class="btn" data-act="importb">Load pasted backup</button></div><p class="small muted" id="bkmsg"></p></div>';
  h+='<button class="btn" data-act="rewiz">Run the setup questions again</button>';
  h+='<button class="btn danger" data-act="reset">Erase my logged days, keep my setup</button>';
  h+='<div class="card"><h3>Delete everything</h3><p class="small muted">Removes your setup, log and own meals from this device'+(me||syncKey?" and from the server":"")+(me?", and signs you out":"")+'. This cannot be undone.</p><button class="btn danger" data-act="delacct">'+(delArmed?"Tap again to delete everything for good":"Delete my account and data")+'</button></div>';
  return h;
}
var PLAIN=["plain","📖","Explain local food names","Shows a plain name beside words like zaboca and provision"];
function flagBtn(f,on,act){return '<button class="toggle'+(on?" on":"")+'" data-act="'+act+'" data-f="'+f[0]+'" aria-pressed="'+on+'" style="margin-top:8px"><span class="slotic" aria-hidden="true">'+f[1]+'</span><span><b>'+f[2]+'</b><br><span class="small muted">'+f[3]+'</span></span><span style="margin-left:auto;font-weight:700">'+(on?"✓":"")+'</span></button>';}

/* ---------- your own meals ---------- */
var addForm={open:false,slot:"d",url:"",n:"",k:"",p:"",ing:"",how:"",src:"",msg:"",busy:false};
function formRead(){["url","n","k","p","ing","how"].forEach(function(f){var el=document.getElementById("m_"+f);if(el&&el.tagName)addForm[f]=el.value;});}
function mealForm(){var f=addForm;
  return '<div class="card"><h2>Add your own meal</h2><div class="row"><label class="f" for="m_url" style="flex:3 1 200px">Recipe link (optional)<input id="m_url" type="url" inputmode="url" placeholder="https://" value="'+esc(f.url)+'"></label><button class="btn" data-act="mimport"'+(f.busy?" disabled":"")+'>'+(f.busy?"Reading…":"Import")+'</button></div>'+(f.msg?'<p class="small" role="status">'+esc(f.msg)+'</p>':"")+
   '<div class="seg">'+SLOTS.map(function(sl){return '<button class="'+(f.slot===sl.id?"on":"")+'" data-act="mslot" data-v="'+sl.id+'" aria-pressed="'+(f.slot===sl.id)+'">'+SLOTE[sl.id]+" "+sl.label.replace("Afternoon s","S")+'</button>';}).join("")+'</div>'+
   '<label class="f" for="m_n">Name<input id="m_n" type="text" maxlength="60" value="'+esc(f.n)+'"></label><div class="row"><label class="f" for="m_k">Calories per serving<input id="m_k" type="number" inputmode="numeric" value="'+esc(f.k)+'"></label><label class="f" for="m_p">Protein, g<input id="m_p" type="number" inputmode="numeric" value="'+esc(f.p)+'"></label></div>'+
   '<label class="f" for="m_ing">Ingredients, one per line<textarea class="plain" id="m_ing">'+esc(f.ing)+'</textarea></label><label class="f" for="m_how">Notes (optional)<input id="m_how" type="text" maxlength="160" value="'+esc(f.how)+'"></label>'+
   '<div class="row"><button class="btn primary big" data-act="msave">Save meal</button><button class="btn" data-act="mcancel">Cancel</button></div><p class="small muted">Your own meals are used exactly as entered. The app does not resize them, so the day total may land above or below your target.</p></div>';}

/* ---------- first-run setup ---------- */
var wiz=null;
function r1(v){return Math.round(v*10)/10;}
function wizInit(){var s=S.settings,kg=s.units==="kg",d=function(lb){return lb?r1(kg?lb/LB:lb):"";};
  wiz={step:1,err:"",units:s.units||"lb",sex:s.sex||"m",age:s.age||"",ft:s.height?Math.floor(s.height/12):"",inch:s.height?Math.round(s.height%12):"",cm:s.height?Math.round(s.height*2.54):"",start:d(s.start),goal:d(s.goal),wake:s.wake||"06:00",bed:s.bed||"22:30",act:+s.act||1.4,gym:s.gym||"gym",plain:!!s.plain};
  FLAGS.forEach(function(f){wiz[f[0]]=!!s[f[0]];});}
function wizRead(){["age","ft","inch","cm","start","goal","wake","bed"].forEach(function(f){var el=document.getElementById("w_"+f);if(el&&el.tagName)wiz[f]=el.value;});}
function wizNums(){var kg=wiz.units==="kg";return {age:+wiz.age,h:kg?(+wiz.cm)/2.54:(+wiz.ft)*12+(+wiz.inch||0),st:kg?(+wiz.start)*LB:+wiz.start,g:kg?(+wiz.goal)*LB:+wiz.goal};}
function wizCheck(){
  var n=wizNums(),kg=wiz.units==="kg",u=kg?"kg":"lb",d=function(lb){return kg?lb/LB:lb;};
  if(!(n.age>0)||!(n.h>0)||!(n.st>0)||!(n.g>0))return "Fill in every box to continue.";
  if(n.age<18)return "This plan is built for adults aged 18 and over.";
  if(n.age>90||n.h<54||n.h>90||n.st<66||n.st>660)return "Check those numbers. One of them looks off.";
  if(n.g>n.st&&n.g>maxGoal(n.h))return "That goal is above a healthy weight for your height. Choose "+Math.floor(d(maxGoal(n.h)))+" "+u+" or less.";
  var mg=minGoal(n.h);if(n.g<mg)return "That goal is below a healthy weight for your height. Choose "+Math.ceil(d(mg))+" "+u+" or more.";
  return "";
}
function wizUnits(to){if(to===wiz.units)return;var n=wizNums(),kg=to==="kg";wiz.units=to;
  if(n.st>0)wiz.start=r1(kg?n.st/LB:n.st);if(n.g>0)wiz.goal=r1(kg?n.g/LB:n.g);
  if(n.h>0){wiz.cm=Math.round(n.h*2.54);wiz.ft=Math.floor(Math.round(n.h)/12);wiz.inch=Math.round(n.h)%12;}}
function wf(id,label,type,val,extra){return '<label class="f" for="w_'+id+'">'+label+'<input id="w_'+id+'" type="'+type+'" value="'+esc(val)+'" '+(type==="number"?'inputmode="decimal" ':"")+(extra||"")+'></label>';}
function wseg(f,opts,cur){return '<div class="seg">'+opts.map(function(o){return '<button class="'+(cur===o[0]?"on":"")+'" data-act="wizset" data-f="'+f+'" data-v="'+o[0]+'" aria-pressed="'+(cur===o[0])+'">'+o[1]+'</button>';}).join("")+'</div>';}
function vWizard(){
  var w=wiz,kg=w.units==="kg",u=kg?"kg":"lb",h='<header><p class="muted small">Step '+w.step+' of 3</p><h1>'+["About you","Your day","Your food"][w.step-1]+'</h1></header><div class="bar"><i style="width:'+(w.step/3*100)+'%"></i></div>';
  if(w.step===1){
    h+='<div class="card"><p class="small muted">Used to work out how much you burn and how much to eat. It stays private to you.</p>'+(authReady&&!me?'<a class="btn" href="/api/auth/google">Used Plateful before? Sign in with Google</a>':"")+wseg("units",[["lb","lb, feet and inches"],["kg","kg and cm"]],w.units)+wseg("sex",[["m","Male"],["f","Female"]],w.sex)+'<div class="row three">'+wf("age","Age","number",w.age)+(kg?wf("cm","Height, cm","number",w.cm):wf("ft","Height, feet","number",w.ft)+wf("inch","and inches","number",w.inch))+'</div><div class="row">'+wf("start","Weight now, "+u,"number",w.start,'step="0.1"')+wf("goal","Goal weight, "+u,"number",w.goal,'step="0.1"')+'</div><p class="small muted">Set a goal below your weight to lose, above it to gain, or the same to hold steady.</p></div>';
  }else if(w.step===2){
    h+='<div class="card"><p class="small muted">Meal times are set from when you wake. The kitchen closes 3 hours before bed.</p><div class="row">'+wf("wake","I wake up at","time",w.wake)+wf("bed","I go to bed at","time",w.bed)+'</div></div>';
    h+='<div class="card"><h3>How active are you?</h3><div class="opts">'+[[1.3,"🪑","Mostly sitting","Desk job, little exercise"],[1.4,"🚶","Some exercise","Desk job plus 1 to 3 workouts a week"],[1.55,"🏃","Very active","On your feet all day, or 4+ workouts a week"]].map(function(o){return '<button class="opt'+(w.act===o[0]?" on":"")+'" data-act="wizset" data-f="act" data-v="'+o[0]+'" aria-pressed="'+(w.act===o[0])+'"><span><span aria-hidden="true">'+o[1]+'</span> <b>'+o[2]+'</b><br><span class="small muted">'+o[3]+'</span></span><span style="font-weight:700">'+(w.act===o[0]?"✓":"")+'</span></button>';}).join("")+'</div></div>';
    h+='<div class="card"><h3>Where will you train?</h3>'+wseg("gym",[["gym","🏋️ At a gym"],["home","🏠 At home"]],w.gym)+'<p class="small muted">The home plan needs no equipment beyond a backpack and a chair.</p></div>';
  }else{
    h+='<div class="card"><p class="small muted">Switch on anything that applies. Plates you cannot eat are removed. You can change these later under More.</p>'+FLAGS.map(function(f){return flagBtn(f,!!w[f[0]],"wizflag");}).join("")+'</div>';
    h+='<div class="card"><p class="small muted">The plates use Trinidad and Tobago food names.</p>'+flagBtn(PLAIN,!!w.plain,"wizflag")+'</div>';
  }
  if(w.err)h+='<p class="err" role="alert">'+esc(w.err)+'</p>';
  h+='<div class="row">'+(w.step>1?'<button class="btn" data-act="wizback">Back</button>':"")+'<button class="btn primary big" data-act="'+(w.step<3?"wiznext":"wizdone")+'">'+(w.step<3?"Next":"Build my plan")+'</button></div>';
  return h;
}
function fld(id,label,type,val){return '<label class="f" for="f_'+id+'">'+label+'<input id="f_'+id+'" type="'+type+'" value="'+esc(val)+'"'+(type==="number"?' inputmode="decimal" step="0.1"':"")+'></label>';}
function blankForm(){return {open:false,slot:"d",url:"",n:"",k:"",p:"",ing:"",how:"",src:"",msg:"",busy:false};}

/* ---------- actions ---------- */
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-act]");if(!b||b.tagName==="INPUT")return;var a=b.dataset.act,k=key(new Date());
  if(a.indexOf("wiz")===0){wizRead();wiz.err="";
    if(a==="wizset"){var wfld=b.dataset.f,wv=b.dataset.v;if(wfld==="units")wizUnits(wv);else wiz[wfld]=wfld==="act"?+wv:wv;}
    else if(a==="wizflag"){wiz[b.dataset.f]=!wiz[b.dataset.f];}
    else if(a==="wizback"){wiz.step--;}
    else if(a==="wiznext"){if(wiz.step===1){wiz.err=wizCheck();if(wiz.err){render();return;}}
      if(wiz.step===2&&!(/^\d\d:\d\d/.test(wiz.wake)&&/^\d\d:\d\d/.test(wiz.bed))){wiz.err="Set both times to continue.";render();return;}wiz.step++;}
    else if(a==="wizdone"){var ws=S.settings,wn=wizNums();ws.units=wiz.units;ws.sex=wiz.sex;ws.age=wn.age;ws.height=r1(wn.h);ws.start=r1(wn.st);ws.goal=r1(wn.g);ws.wake=wiz.wake.slice(0,5);ws.bed=wiz.bed.slice(0,5);ws.act=wiz.act;ws.gym=wiz.gym;ws.plain=!!wiz.plain;
      FLAGS.forEach(function(f){ws[f[0]]=!!wiz[f[0]];});ws.adjust=0;ws.onboarded=true;wiz=null;save();render();window.scrollTo(0,0);return;}
    render();window.scrollTo(0,0);return;}
  if(a!=="delacct"&&delArmed){delArmed=false;}
  if(a==="delacct"){
    if(!delArmed){delArmed=true;render();return;}
    delArmed=false;
    var wipe=function(){try{localStorage.removeItem(KEY);localStorage.removeItem(SK);}catch(err){}syncKey="";me=null;S=clone(DEF);baseline=clone(S);wiz=null;setSync("device");location.hash="";render();window.scrollTo(0,0);};
    if(!me&&!syncKey){wipe();return;}
    clearTimeout(saveTimer);
    writing=writing.then(function(){return api("DELETE");}).then(function(r){
      if(!r.ok&&r.status!==404)throw new Error("delete failed");
      return fetch("/api/logout",{method:"POST"}).catch(function(){});
    }).then(wipe,function(){var p=document.createElement("p");p.className="err";p.textContent="Could not reach the server, so nothing was deleted. Try again when you are online.";b.parentNode.appendChild(p);});
    return;}
  if(a==="logout"){fetch("/api/logout",{method:"POST"}).catch(function(){}).then(function(){me=null;setSync(syncKey?"offline":"device");render();if(syncKey)pull();});return;}
  if(a==="addopen"){addForm.open=true;addForm.msg="";render();return;}
  if(a==="mcancel"){addForm=blankForm();render();return;}
  if(a==="mslot"){formRead();addForm.slot=b.dataset.v;render();return;}
  if(a==="mimport"){formRead();var u=addForm.url.trim();
    if(!/^https:\/\/\S+\.\S+/.test(u)){addForm.msg="Paste a full link that starts with https://";render();return;}
    if(!me&&!syncKey){addForm.msg="Sign in under More to import from a link. You can still type the meal in below.";render();return;}
    addForm.busy=true;addForm.msg="";render();
    var ih={};if(syncKey&&!me)ih.Authorization="Bearer "+syncKey;
    fetch("/api/import?url="+encodeURIComponent(u),{cache:"no-store",headers:ih}).then(function(r){return r.json().then(function(j){return {s:r.status,j:j};});}).then(function(r){
      formRead();addForm.busy=false;
      if(r.s===200){addForm.n=r.j.name||addForm.n;addForm.ing=(r.j.ingredients||[]).join("\n");addForm.src=r.j.url;
        if(r.j.kcal){addForm.k=r.j.kcal;addForm.p=r.j.protein||"";addForm.msg="Imported. Figures are per serving as the site lists them"+(r.j.servings?" (makes "+r.j.servings+")":"")+". Check them before saving.";}
        else addForm.msg="Imported the name and ingredients. This site does not publish calories, so enter calories and protein yourself.";}
      else addForm.msg=r.s===422?"No recipe details found on that page. Type the meal in below.":r.s===401?"Sign in under More to import from a link.":"Could not read that page. Type the meal in below.";
      render();
    }).catch(function(){addForm.busy=false;addForm.msg="Could not reach the server. Type the meal in below.";render();});
    return;}
  if(a==="msave"){formRead();var mk=parseFloat(addForm.k),mp=parseFloat(addForm.p),mn=addForm.n.trim();
    if(!mn||!(mk>=30&&mk<=2500)||!(mp>=0&&mp<=250)){addForm.msg="A meal needs a name, calories between 30 and 2500, and protein in grams.";render();return;}
    S.custom=S.custom||[];if(S.custom.length>=60){addForm.msg="You have 60 meals saved. Remove one to add another.";render();return;}
    S.custom.push({id:Date.now().toString(36),slot:addForm.slot,n:mn.slice(0,60),k:Math.round(mk),p:Math.round(mp),ing:addForm.ing.split("\n").map(function(x){return x.trim().slice(0,120);}).filter(Boolean).slice(0,30),how:addForm.how.trim().slice(0,160),src:/^https:\/\//.test(addForm.src)?addForm.src:""});
    addForm=blankForm();save();render();return;}
  if(a==="delmeal"){S.custom=(S.custom||[]).filter(function(c){return c.id!==b.dataset.id;});save();render();return;}
  if(a==="rewiz"){S.settings.onboarded=false;wiz=null;render();window.scrollTo(0,0);return;}
  if(a==="flag"){S.settings[b.dataset.f]=!S.settings[b.dataset.f];save();render();return;}
  if(a!=="finish")finArmed=false;
  if(a==="seg"){var g=b.dataset.g,v=b.dataset.v,cw=S.workouts[k];
    if(g==="trainday"){trainSel=v;if(cw&&cw.d!==v){cw.by=cw.by||{};cw.by[cw.d]=cw.sets;cw.sets=cw.by[v]||{};cw.d=v;delete cw.fin;save();}}
    else if(g==="place"){if(S.settings.gym!==v){S.settings.gym=v;if(cw&&!cw.fin){cw.sets={};cw.by={};}save();}}
    else if(g==="sex"){S.settings.sex=v;save();}
    else if(g==="act"){S.settings.act=+v;save();}
    else if(g==="units"){S.settings.units=v;save();}
    else if(g==="shopwk"){shopWk=+v;}
    else sub[g]=v;
    render();return;}
  if(a==="swap"){swapOpen=swapOpen===b.dataset.id?null:b.dataset.id;render();return;}
  if(a==="editw"){editW=true;wErr="";render();return;}
  if(a==="planday"){planDay=b.dataset.k;render();return;}
  if(a==="calsel"){calSel=b.dataset.k;render();return;}
  if(a==="calnav"){var t0=new Date(),m=calMonth||new Date(t0.getFullYear(),t0.getMonth(),1);calMonth=new Date(m.getFullYear(),m.getMonth()+(+b.dataset.d),1);render();return;}
  if(a==="done"){S.done[k]=S.done[k]||{};if(S.done[k][b.dataset.id])delete S.done[k][b.dataset.id];else S.done[k][b.dataset.id]=1;}
  else if(a==="pick"){var pn=b.dataset.n;S.swaps[k]=S.swaps[k]||{};S.swaps[k][b.dataset.id]=/^c:/.test(pn)?pn:+pn;swapOpen=null;}
  else if(a==="caldone"){var ck=b.dataset.k;S.done[ck]=S.done[ck]||{};if(S.done[ck][b.dataset.id])delete S.done[ck][b.dataset.id];else S.done[ck][b.dataset.id]=1;}
  else if(a==="caltrain"){if(S.train[b.dataset.k])delete S.train[b.dataset.k];else S.train[b.dataset.k]=1;}
  else if(a==="calwater"){S.water[b.dataset.k]=((S.water[b.dataset.k]||0)+1)%6;}
  else if(a==="water"){var wn2=+b.dataset.n;S.water[k]=(S.water[k]===wn2)?wn2-1:wn2;}
  else if(a==="train"){if(S.train[k])delete S.train[k];else S.train[k]=1;}
  else if(a==="set"){var w=S.workouts[k]||(S.workouts[k]={d:todayWorkout().d,sets:{}}),si=b.dataset.i,sn=+b.dataset.n;w.sets[si]=(w.sets[si]===sn)?sn-1:sn;}
  else if(a==="finish"){var w2=S.workouts[k]||(S.workouts[k]={d:todayWorkout().d,sets:{}});if(w2.fin){delete w2.fin;delete S.train[k];}else{var W2=workoutSet()[w2.d],tt=0,gg=0;W2.ex.forEach(function(x,i){tt+=x.s;gg+=Math.min(x.s,w2.sets[i]||0);});
      if(gg<tt/2&&!finArmed){finArmed=true;render();return;}finArmed=false;w2.fin=1;S.train[k]=1;}}
  else if(a==="logw"){var lbv=wIn(parseFloat(document.getElementById(b.dataset.src).value)),dEl=document.getElementById("wd"),dk=dEl&&dEl.value?dEl.value:k;
    if(!(lbv>=66&&lbv<=660)){wErr="Enter a weight between "+wOut(66,0)+" and "+wOut(660,0)+" "+U()+".";if(b.dataset.src==="wq")render();else{var le=document.getElementById("wverr");if(le)le.textContent=wErr;}return;}
    wErr="";editW=false;S.weights[dk]=r1(lbv);}
  else if(a==="delw"){delete S.weights[b.dataset.k];}
  else if(a==="adjust"){S.settings.adjust=(+S.settings.adjust||0)+(+b.dataset.delta);}
  else if(a==="shopreset"){S.shop={};}
  else if(a==="saveset"){var s=S.settings,ok=true,num=function(f){var x=parseFloat(document.getElementById("f_"+f).value);if(!(x>0))ok=false;return x;};
    var st=num("start"),gl=num("goal"),ht=num("height"),ag=num("age");
    if(st>0)s.start=r1(wIn(st));if(gl>0)s.goal=r1(wIn(gl));if(ht>0)s.height=r1(kgMode()?ht/2.54:ht);if(ag>0)s.age=ag;
    ["wake","bed"].forEach(function(f){var x=document.getElementById("f_"+f).value;if(/^\d\d:\d\d/.test(x))s[f]=x.slice(0,5);else ok=false;});
    var mg2=minGoal(s.height),note="";if(s.age<18){s.age=18;note=" This plan is for adults, so age was set to 18.";}
    if(s.goal<mg2){s.goal=Math.ceil(mg2);note+=" Goal raised to "+wOut(s.goal,0)+" "+U()+", the lowest healthy weight for your height.";}
    if(s.goal>s.start&&s.goal>maxGoal(s.height)){s.goal=Math.floor(maxGoal(s.height));note+=" Goal lowered to "+wOut(s.goal,0)+" "+U()+", the top of a healthy range for your height.";}
    save();render();document.getElementById("setmsg").textContent=(ok?"Saved. Plates and times are updated.":"Some fields were empty and kept their old values.")+note;return;}
  else if(a==="savekey"){syncKey=document.getElementById("f_key").value.trim();try{localStorage.setItem(SK,syncKey);}catch(err){}setSync(syncKey?"offline":"device");render();pull();return;}
  else if(a==="copyb"){var mm=document.getElementById("bkmsg"),tx=document.getElementById("bk").value;if(navigator.clipboard)navigator.clipboard.writeText(tx).then(function(){mm.textContent="Copied.";},function(){mm.textContent="Could not copy. Select the text and copy it by hand.";});return;}
  else if(a==="importb"){try{var o=JSON.parse(document.getElementById("bk").value);if(!o||typeof o!=="object"||!o.settings)throw 0;S=merge(o);}catch(err){document.getElementById("bkmsg").textContent="That is not a valid backup. Nothing was changed.";return;}}
  else if(a==="reset"){if(!resetArmed){resetArmed=true;b.textContent="Tap again to erase your logged days";return;}resetArmed=false;var keep=S.settings,keepMeals=S.custom;S=clone(DEF);S.settings=keep;S.custom=keepMeals;S.settings.adjust=0;}
  save();render();
});
document.addEventListener("change",function(e){
  var b=e.target;if(!b.dataset)return;
  if(b.dataset.act==="lift"){recordLift(b.dataset.n,parseFloat(b.value),key(new Date()));save();return;}
  if(b.dataset.act!=="shop")return;
  if(b.checked)S.shop[b.id]=1;else delete S.shop[b.id];save();render();
});
window.addEventListener("hashchange",function(){render();window.scrollTo(0,0);});
render();
whoami().then(pull);
