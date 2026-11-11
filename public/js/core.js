"use strict";
/* Plateful core logic. Reads the global state object S; touches no DOM, so it can be tested in Node. */
var KEY="cutplan-v1";
var DEF={v:1,updated:0,settings:{start:"",goal:"",height:"",age:"",wake:"06:00",bed:"22:30",adjust:0,onboarded:false,sex:"m",act:1.4,noDairy:false,noEggs:false,noFish:false,noMeat:false,reflux:false,units:"lb",plain:false,gym:"gym"},weights:{},done:{},swaps:{},train:{},shop:{},workouts:{},water:{},lifts:{},lifthist:{},custom:[],mod:{},bm:{}};
/* DAYSECS are keyed by date and merge day by day; BLOCKS merge as whole units. */
var DAYSECS=["weights","done","swaps","train","water","workouts"],BLOCKS=["settings","custom","lifts","lifthist","shop"];
function clone(o){return JSON.parse(JSON.stringify(o));}
function merge(o){var b=clone(DEF);if(!o||typeof o!=="object")return b;
  ["weights","done","swaps","train","shop","workouts","water","lifts","lifthist","custom","mod","bm"].forEach(function(k){if(o[k]&&typeof o[k]==="object")b[k]=o[k];});
  if(!Array.isArray(b.custom))b.custom=[];
  if(o.settings)for(var k in b.settings)if(o.settings[k]!==undefined)b.settings[k]=o.settings[k];
  /* data saved before onboarding existed belongs to the original user: keep that plan as it was */
  if(o.settings&&o.settings.onboarded===undefined&&o.settings.start){b.settings.onboarded=true;b.settings.noDairy=true;b.settings.noEggs=true;b.settings.reflux=true;}
  b.updated=o.updated||0;return b;}

/* ---------- sync: stamp what changed, then merge two copies ---------- */
function stampChanges(prev,cur,now){
  cur.mod=cur.mod||{};cur.bm=cur.bm||{};
  DAYSECS.forEach(function(sec){var a=(prev&&prev[sec])||{},b=cur[sec]||{},ks={};
    Object.keys(a).forEach(function(k){ks[k]=1;});Object.keys(b).forEach(function(k){ks[k]=1;});
    Object.keys(ks).forEach(function(k){if(JSON.stringify(a[k])!==JSON.stringify(b[k]))cur.mod[k]=now;});});
  BLOCKS.forEach(function(n){if(JSON.stringify(prev?prev[n]:undefined)!==JSON.stringify(cur[n]))cur.bm[n]=now;});
}
/* Each day, and each block, comes from whichever copy changed it last. Copies written before stamps existed fall back to newest-overall. */
function mergeStates(a,b){
  var out=clone(a),older=b.updated>a.updated,ks={};
  DAYSECS.forEach(function(sec){Object.keys(a[sec]).concat(Object.keys(b[sec])).forEach(function(k){ks[k]=1;});});
  Object.keys(a.mod).concat(Object.keys(b.mod)).forEach(function(k){ks[k]=1;});
  Object.keys(ks).forEach(function(k){var ta=a.mod[k]||0,tb=b.mod[k]||0;
    if(tb>ta||(ta===0&&tb===0&&older)){DAYSECS.forEach(function(sec){if(b[sec][k]!==undefined)out[sec][k]=clone(b[sec][k]);else delete out[sec][k];});if(tb)out.mod[k]=tb;}});
  BLOCKS.forEach(function(n){var ta=a.bm[n]||0,tb=b.bm[n]||0;if(tb>ta||(ta===0&&tb===0&&older)){out[n]=clone(b[n]);if(tb)out.bm[n]=tb;}});
  out.updated=Math.max(a.updated,b.updated);return out;
}
/* Compare two copies ignoring key order and the overall timestamp, so a merge that changed nothing is not sent again. */
function canon(o){if(Array.isArray(o))return o.map(canon);if(o&&typeof o==="object"){var r={};Object.keys(o).sort().forEach(function(k){r[k]=canon(o[k]);});return r;}return o;}
function sameData(a,b){var x=canon(a),y=canon(b);delete x.updated;delete y.updated;return JSON.stringify(x)===JSON.stringify(y);}

/* ---------- helpers ---------- */
function key(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
function addDays(d,n){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x;}
function parseKey(k){var a=k.split("-");return new Date(+a[0],+a[1]-1,+a[2]);}
function dow(d){return (d.getDay()+6)%7;}
function mins(t){var a=String(t).split(":");return (+a[0])*60+(+a[1]||0);}
function clock(m){m=((Math.round(m)%1440)+1440)%1440;var h=Math.floor(m/60),mm=m%60,ap=h>=12?"pm":"am";h=h%12||12;return h+":"+("0"+mm).slice(-2)+" "+ap;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function frac(q){var w=Math.floor(q),r=Math.round((q-w)*4)/4,f={0:"",0.25:"¼",0.5:"½",0.75:"¾"}[r];if(r===1){w++;f="";}return (w?w:"")+(f||"")||"0";}
function avg(a){return a.reduce(function(x,y){return x+y;},0)/a.length;}
function icon(t){t=String(t).toLowerCase();for(var i=0;i<ICONS.length;i++)if(t.indexOf(ICONS[i][0])>=0)return ICONS[i][1];return "🥬";}

/* ---------- units: weights are stored in lb, heights in inches ---------- */
var LB=2.2046;
function kgMode(){return S.settings.units==="kg";}
function U(){return kgMode()?"kg":"lb";}
function wNum(lb){return kgMode()?lb/LB:+lb;}
function wOut(lb,d){return wNum(lb).toFixed(d===undefined?1:d);}
function wIn(v){return kgMode()?v*LB:+v;}
function wSay(lb){return wOut(Math.abs(lb),1)+" "+U();}
function minGoal(heightIn){return 18.5*Math.pow(heightIn*.0254,2)*LB;}
function maxGoal(heightIn){return 30*Math.pow(heightIn*.0254,2)*LB;}

/* ---------- plain names for local foods ---------- */
function gloss(text){
  if(!S.settings.plain)return text;
  GLOSS.forEach(function(g){var re=new RegExp("\\b"+g[0]+"\\b(?! \\()","i");text=text.replace(re,function(m){return m+" ("+g[1]+")";});});
  return text;
}

/* ---------- plates ---------- */
function toMeal(c){var ing=c.ing&&c.ing.length?c.ing:[c.n];return {n:c.n,how:c.how||"",custom:1,cid:c.id,src:c.src||"",it:ing.map(function(t,i){return {t:t,q:1,u:"",k:i?0:(+c.k||0),p:i?0:(+c.p||0),c:0,raw:1};})};}
function customList(slot){return (S.custom||[]).filter(function(c){return c.slot===slot;}).map(toMeal);}
function customMeal(id){var c=(S.custom||[]).filter(function(x){return x.id===id;})[0];return c?toMeal(c):null;}
function qty(it,q){
  if(it.raw)return it.t;
  if(it.u==="g")return Math.round(q/10)*10+" g "+it.t;
  var n=frac(q),pl=q>1&&/^(cup|slice|scoop|can)$/.test(it.u)?"s":"";
  return n+(it.u?" "+it.u+pl:"")+" "+it.t;
}
function banned(m){var s=S.settings;
  return (m.x==="egg"&&s.noEggs)||(m.x==="dairy"&&s.noDairy)||(m.x==="fish"&&(s.noFish||s.noMeat))||(m.meat&&s.noMeat)||(m.gain&&mode()!=="gain");}
/* When the scheduled plate is ruled out, rotate through the ones that are allowed so the week still varies. */
function allowedIdx(slot,idx){var l=MEALS[slot];if(!banned(l[idx])&&!l[idx].gain)return idx;
  var ok=[];l.forEach(function(m,i){if(!banned(m)&&!m.free&&!m.gain)ok.push(i);});
  return ok.length?ok[idx%ok.length]:idx;}
function windowAvg(endOffset,len){var v=[],t=new Date();for(var i=endOffset;i<endOffset+len;i++){var w=S.weights[key(addDays(t,-i))];if(w)v.push(w);}return v.length>=3?avg(v):null;}
function currentWeight(){var a=windowAvg(0,7);if(a)return a;var ks=Object.keys(S.weights).sort();return ks.length?S.weights[ks[ks.length-1]]:+S.settings.start;}
function mode(){var s=S.settings,c=currentWeight();if(+s.goal<+s.start&&c>+s.goal)return "lose";if(+s.goal>+s.start&&c<+s.goal)return "gain";return "hold";}
function targets(){
  var s=S.settings,kg=currentWeight()/LB,cm=s.height*2.54;
  var bmr=10*kg+6.25*cm-5*s.age+(s.sex==="f"?-161:5),tdee=bmr*(+s.act||1.4);
  var target=Math.max(s.sex==="f"?1400:1700,Math.round((tdee+({lose:-500,gain:300,hold:0})[mode()]+(+s.adjust||0))/10)*10);
  return {bmr:Math.round(bmr),tdee:Math.round(tdee/10)*10,target:target,protein:Math.round((mode()==="gain"?1.6:1.5)*kg/5)*5};
}
function times(){var w=mins(S.settings.wake),b=mins(S.settings.bed);if(b<=w)b+=1440;
  var d=Math.min(w+750,b-210),sn=Math.min(w+570,d-150),l=Math.min(w+360,sn-150);
  return {b:Math.min(w+45,l-150),l:l,s:sn,d:d,close:b-180};}
function isMeat(it){return it.u==="g"&&!it.raw&&it.k>0&&it.p/it.k>.12;}
function group(it){var t=String(it.t).toLowerCase();
  if(it.raw||/choice/.test(t))return "other";
  if(/peanut|\boil\b|zaboca/.test(t))return "fat";
  if(/banana|pawpaw|fruit|melon|raisin/.test(t))return "fruit";
  if(it.c||/rice|oats|bread|cracker|provision|potato|dasheen|green fig|pelau/.test(t))return "starch";
  if(/chicken|tuna|sardine|saltfish|carite|kingfish|powder|egg|yogurt|soy|tofu|lentil|dhal|channa|pigeon/.test(t))return "protein";
  return "veg";}
function dayPlan(date){
  var k=key(date),base=WEEK[dow(date)],sw=S.swaps[k]||{},T=targets(),picks=[],fixed=0,carb=0;
  SLOTS.forEach(function(sl,i){var list=MEALS[sl.id],sv=sw[sl.id],m=typeof sv==="string"?customMeal(sv.slice(2)):null;
    if(!m){var idx=(typeof sv==="number"?sv:base[i])%list.length;m=typeof sv==="number"&&!banned(list[idx])?list[idx]:list[allowedIdx(sl.id,idx)];}picks.push(m);});
  /* gaining: the recipes were written for a cut, so trim meat and fish toward about 1.3x the protein floor and let starch carry the surplus */
  var ps=1;
  if(mode()==="gain"){var bp=0,mp=0;picks.forEach(function(m){m.it.forEach(function(it){bp+=it.q*it.p;if(isMeat(it))mp+=it.q*it.p;});});var want=T.protein*1.3;if(bp>want&&mp>0)ps=Math.max(.6,Math.min(1,1-(bp-want)/mp));}
  picks.forEach(function(m){m.it.forEach(function(it){var q0=isMeat(it)?it.q*ps:it.q;if(it.c)carb+=q0*it.k;else fixed+=q0*it.k;});});
  var extra=S.train[k]?105:0;
  function build(scoops){
    var fx=fixed+scoops*120,fr=carb?(T.target-fx)/carb:1,f=Math.max(.6,Math.min(2,fr)),g=1,tk=0,tp=0;
    /* when starch alone cannot reach the target (small or large eaters), scale the rest of the plate too */
    if(fx&&(fr<.6||fr>2))g=Math.max(.6,Math.min(1.6,(T.target-f*carb-scoops*120)/fixed));
    var meals=picks.map(function(m,i){var k2=0,p=0;var items=m.it.map(function(it){
        var q0=isMeat(it)?it.q*ps:it.q,q=q0;if(it.c){q=it.u==="g"?it.q*f:Math.max(.25,Math.round(it.q*f*4)/4);if(it.u===""||it.u==="slice")q=Math.max(1,Math.round(it.q*f));}
        else if(g!==1&&!m.free){if(it.u==="g")q=q0*g;else if(it.u==="cup")q=Math.max(.25,Math.round(it.q*g*4)/4);}
        k2+=q*it.k;p+=q*it.p;return {x:qty(it,q),i:icon(it.t),t:it.t,q:q,u:it.u,raw:!!it.raw,kc:q*it.k,g:group(it)};});
      if(scoops&&SLOTS[i].id==="s"){items.push({x:scoops+" extra scoop"+(scoops>1?"s":"")+" protein powder, to reach your protein minimum",i:"🥤",t:"lactose-free protein powder",q:scoops,u:"scoop",raw:false,kc:120*scoops,g:"protein"});k2+=120*scoops;p+=24*scoops;}
      if(S.train[k]&&SLOTS[i].id==="s"){items.push({x:"1 extra banana, 60 to 90 min before training",i:"🍌",kc:105,g:"fruit"});k2+=105;p+=1;}
      tk+=k2;tp+=p;return {slot:SLOTS[i],meal:m,items:items,kcal:Math.round(k2/10)*10,prot:Math.round(p)};});
    return {key:k,meals:meals,kcal:Math.round(tk/10)*10,prot:Math.round(tp),T:T,target:T.target+extra};
  }
  /* if the chosen plates fall short of the protein minimum, top up with protein powder at the snack (two scoops at most) and make room for it */
  var out=build(0);
  for(var sc=1;sc<=2&&out.prot<T.protein;sc++)out=build(sc);
  return out;
}
/* Share of a plate's calories by food group, for the plate picture. */
function plateShares(items){var tot=0,by={};items.forEach(function(x){var kc=x.kc||0;tot+=kc;by[x.g]=(by[x.g]||0)+kc;});
  if(!tot)return [];return Object.keys(GROUPS).filter(function(g){return by[g]>0;}).map(function(g){return [g,by[g]/tot];});}
function mealTotals(m){var k=0,p=0;m.it.forEach(function(it){k+=it.q*it.k;p+=it.q*it.p;});return {k:Math.round(k/10)*10,p:Math.round(p)};}
function adherence(n){var t=new Date(),got=0,tot=0;for(var i=1;i<=n;i++){var d=S.done[key(addDays(t,-i))];tot+=4;if(d)got+=Object.keys(d).length;}return tot?got/tot:0;}
function daysUsed(){var ks=Object.keys(S.done).concat(Object.keys(S.weights)).sort();if(!ks.length)return 0;return Math.round((new Date()-parseKey(ks[0]))/864e5);}

/* ---------- shopping list built from the planned plates ---------- */
function buyFor(t){t=String(t).toLowerCase();for(var i=0;i<BUY.length;i++)for(var j=0;j<BUY[i][0].length;j++)if(t.indexOf(BUY[i][0][j])>=0)return BUY[i][1];return BUY_DEFAULT;}
function amount(q,unit){
  if(unit==="g"||unit==="ml"){var step=unit==="g"?50:250,r=Math.ceil(q/step-1e-9)*step,big=unit==="g"?"kg":"L";return r>=1000?String(Math.round(r/100)/10)+" "+big:r+" "+unit;}
  var n=Math.ceil(q-1e-9);return n+(unit?" "+unit+(n>1?"s":""):"");
}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function shopList(start,days){
  var tot={},own={};
  for(var d=0;d<days;d++)dayPlan(addDays(start,d)).meals.forEach(function(m){if(m.meal.free)return;
    m.items.forEach(function(x){if(x.t===undefined)return;
      if(x.raw){if(m.meal.custom)own[x.t]=(own[x.t]||0)+1;return;}
      buyFor(x.t).forEach(function(o){if(!tot[o[0]])tot[o[0]]={name:o[0],cat:o[1],unit:o[2],q:0};tot[o[0]].q+=x.q*o[3];});});});
  var out=SHOPCATS.map(function(c){return {cat:c,items:[]};});
  Object.keys(tot).forEach(function(n){var e=tot[n];out[SHOPCATS.indexOf(e.cat)].items.push({id:"k_"+slug(n),name:n,amt:amount(e.q,e.unit)});});
  Object.keys(own).forEach(function(t){out[SHOPCATS.length-1].items.push({id:"k_own-"+slug(t).slice(0,40),name:t,amt:own[t]>1?"× "+own[t]:""});});
  return out.filter(function(c){return c.items.length;});
}
function shopRange(next){var t=new Date();return next?{start:addDays(t,7-dow(t)),days:7}:{start:t,days:7-dow(t)};}

/* ---------- weight trend ---------- */
function trend(){
  var a1=windowAvg(0,7),a0=windowAvg(7,7),ad=adherence(Math.min(14,Math.max(1,daysUsed())));
  if(a1===null||a0===null)return {state:"wait",msg:"Log at least 3 weigh-ins in each of two back-to-back weeks. Then this box tells you whether to change the food."};
  var rate=a0-a1,md=mode(),pc=Math.round(ad*100);
  if(md==="gain"){var up=-rate;
    if(up>1.2)return {state:"fast",rate:rate,msg:"You are gaining "+wSay(up)+" a week. Above about "+wSay(1)+" a week the extra is mostly fat. Take some food off.",delta:-150};
    if(up>=.25)return {state:"ok",rate:rate,msg:"Up "+wSay(up)+" on the weekly average. Change nothing."};
    if(ad<.8)return {state:"adh",rate:rate,msg:"The average moved "+wSay(up)+", but only "+pc+"% of plates were ticked. Eat every plate for two weeks before adding more food."};
    return {state:"slow",rate:rate,msg:"You ate the plan ("+pc+"% of plates) and the average moved only "+wSay(up)+". You burn more than the estimate. Add 150 kcal.",delta:150};}
  if(md==="hold")return {state:"ok",rate:rate,msg:"You are at your goal. The plan is now set to hold you here."};
  if(rate>2.2)return {state:"fast",rate:rate,msg:"You are dropping "+wSay(rate)+" a week. That is faster than you can hold. Add food back.",delta:150};
  if(rate>=.5)return {state:"ok",rate:rate,msg:"Down "+wSay(rate)+" on the weekly average. Change nothing."};
  if(ad<.8)return {state:"adh",rate:rate,msg:"The average moved "+wSay(rate)+", but only "+pc+"% of plates were ticked. The plan has not been run yet, so cutting food would be guessing. Hit 80% for two weeks first."};
  return {state:"slow",rate:rate,msg:"You ate the plan ("+pc+"% of plates) and the average moved only "+wSay(rate)+". Your real burn is lower than the estimate. Take 150 kcal off.",delta:-150};
}
function forecast(){var s=S.settings,cur=currentWeight(),md=mode(),left=md==="hold"?0:Math.abs(cur-s.goal),tr=trend(),obs=tr.rate,own=false,rate=md==="gain"?.5:.9;
  if(md==="lose"&&obs>=.4){rate=Math.min(obs,2);own=true;}
  if(md==="gain"&&obs<=-.2){rate=Math.min(-obs,1.5);own=true;}
  return {cur:cur,left:left,rate:rate,tr:tr,own:own,mode:md,eta:left?addDays(new Date(),Math.round(left/rate*7)):null};}

/* ---------- habits and training ---------- */
function plates(k){return S.done[k]?Object.keys(S.done[k]).length:0;}
function hit(k){return plates(k)>=3;}
function streaks(){
  var t=new Date(),d=hit(key(t))?t:addDays(t,-1),cur=0;
  while(hit(key(d))){cur++;d=addDays(d,-1);}
  var ks=Object.keys(S.done).filter(hit).sort(),best=0,run=0,prev=null;
  ks.forEach(function(k){run=(prev&&key(addDays(parseKey(prev),1))===k)?run+1:1;if(run>best)best=run;prev=k;});
  var mon=addDays(t,-dow(t)),wk=[];for(var i=0;i<7;i++)wk.push(hit(key(addDays(mon,i))));
  return {cur:cur,best:Math.max(best,cur),wk:wk};
}
function workoutSet(){return S.settings.gym==="home"?WORKOUTS_HOME:WORKOUTS;}
function nextDay(){var ks=Object.keys(S.workouts).filter(function(k){return S.workouts[k].fin;}).sort();if(!ks.length)return "A";return {A:"B",B:"C",C:"A"}[S.workouts[ks[ks.length-1]].d]||"A";}
/* Remember the weight used per exercise, one entry per day, newest last. */
function recordLift(name,val,dateKey){
  S.lifthist=S.lifthist||{};var h=S.lifthist[name]||[];
  if(h.length&&h[h.length-1][0]===dateKey)h.pop();
  if(val>0){S.lifts[name]=val;h.push([dateKey,val]);}else delete S.lifts[name];
  if(h.length)S.lifthist[name]=h.slice(-12);else delete S.lifthist[name];
}
function liftBefore(name,dateKey){return ((S.lifthist||{})[name]||[]).filter(function(e){return e[0]!==dateKey;}).slice(-3).map(function(e){return e[1];});}
