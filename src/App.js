import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════
const K = { users:"gx_users", session:"gx_session", state: uid=>"gx_state_"+uid };
async function hashPw(p){const d=new TextEncoder().encode(p+"galaxia2024");const b=await crypto.subtle.digest("SHA-256",d);return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");}
const loadUsers=()=>{try{return JSON.parse(localStorage.getItem(K.users)||"{}");}catch{return{};}};
const saveUsers=u=>{try{localStorage.setItem(K.users,JSON.stringify(u));}catch{}};
const Auth={
  async reg(e,p,n){const u=loadUsers(),k=e.toLowerCase().trim();if(u[k])return{ok:false,err:"Email déjà utilisé."};const id=Date.now().toString(36)+Math.random().toString(36).slice(2,7);u[k]={id,hash:await hashPw(p),name:n,email:k};saveUsers(u);return{ok:true,user:{id,email:k,name:n}};},
  async login(e,p){const u=loadUsers(),k=e.toLowerCase().trim(),r=u[k];if(!r)return{ok:false,err:"Email introuvable."};if(await hashPw(p)!==r.hash)return{ok:false,err:"Mot de passe incorrect."};return{ok:true,user:{id:r.id,email:k,name:r.name}};},
  saveSession:u=>{try{localStorage.setItem(K.session,JSON.stringify(u));}catch{}},
  loadSession:()=>{try{return JSON.parse(localStorage.getItem(K.session));}catch{return null;}},
  clearSession:()=>{try{localStorage.removeItem(K.session);}catch{}},
};

// ══════════════════════════════════════════════════════
// RNG / NOISE
// ══════════════════════════════════════════════════════
function rng(seed){let s=(seed|0)>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function noise2d(seed){
  const r=rng(seed),p=Array.from({length:256},(_,i)=>i);
  for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));[p[i],p[j]]=[p[j],p[i]];}
  const P=[...p,...p],G=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const f=t=>t*t*t*(t*(t*6-15)+10),lp=(a,b,t)=>a+(b-a)*t,dt=([a,b],x,y)=>a*x+b*y;
  return(x,y)=>{const X=Math.floor(x)&255,Y=Math.floor(y)&255,xf=x-Math.floor(x),yf=y-Math.floor(y),u=f(xf),v=f(yf);return lp(lp(dt(G[P[P[X]+Y]&7],xf,yf),dt(G[P[P[X+1]+Y]&7],xf-1,yf),u),lp(dt(G[P[P[X]+Y+1]&7],xf,yf-1),dt(G[P[P[X+1]+Y+1]&7],xf-1,yf-1),u),v);};
}
const fbm=(n,x,y,o=6,lac=2.1,gain=0.5)=>{let v=0,a=0.5,f=1,m=0;for(let i=0;i<o;i++){v+=n(x*f,y*f)*a;m+=a;a*=gain;f*=lac;}return v/m;};

// ══════════════════════════════════════════════════════
// PLANET DATA
// ══════════════════════════════════════════════════════
const TYPES=["Tellurique","Gazeuse","Glaciale","Désertique","Océanique","Volcanique","Forestière"];
const ATMOS=["Dense","Légère","Toxique","Respirable","Aucune","Tempétueuse"];
const PRE=["Kar","Sol","Vel","Nyx","Eos","Zar","Thal","Mor","Ith","Pyx","Aur","Ceth"];
const SUF=["ion","ara","ux","eth","is","on","ur","ax","el","ys","en","oth"];
const ROM=["I","II","III","IV","V","VI","VII","VIII","IX","X"];
const mkName=s=>{const r=rng(s*31337);return`${PRE[Math.floor(r()*PRE.length)]}${SUF[Math.floor(r()*SUF.length)]} ${ROM[Math.floor(r()*10)]}`;}
function mkP(gS,i){
  const s=gS+i*997,r=rng(s),d=+(0.3+r()*4.7).toFixed(2),type=TYPES[Math.floor(r()*TYPES.length)];
  const w=type==="Océanique"?60+Math.floor(r()*35):type==="Désertique"?Math.floor(r()*5):type==="Glaciale"?10+Math.floor(r()*30):Math.floor(r()*70);
  return{seed:s,i,name:mkName(s),type,dist:d,temp:Math.round(400-d*80+(r()-0.5)*60),light:Math.max(5,Math.round(100/(d*d)*(0.7+r()*0.6))),size:3000+Math.floor(r()*12000),water:w,atmos:ATMOS[Math.floor(r()*ATMOS.length)],moons:Math.floor(r()*r()*5),tilt:r()*40,clouds:type==="Gazeuse"?0.9:type==="Glaciale"?0.55:type==="Désertique"?0.08:0.25+r()*0.4,orbitAngle:(i/50)*Math.PI*2+r()*0.3,orbitRadius:80+(i/50)*340};
}
const huid=u=>{let h=0;for(let i=0;i<u.length;i++)h=(Math.imul(31,h)+u.charCodeAt(i))|0;return Math.abs(h);};
const slotOf=u=>{const h=huid(u);return{gSeed:Math.floor(h/50)*1000,idx:h%50};};
const GC={Tellurique:["#3d6b4a","#5e9e6e"],Gazeuse:["#b86820","#e09040"],Glaciale:["#6aaac8","#9ad0e8"],Désertique:["#c09040","#e0b860"],Océanique:["#1850b8","#2870d8"],Volcanique:["#b02818","#d83828"],Forestière:["#286028","#389838"]};
const gc=t=>GC[t]||["#667788","#99aabb"];

// ══════════════════════════════════════════════════════
// TERRAIN ZONES
// ══════════════════════════════════════════════════════
const TERRAIN_TYPES={
  ocean:    {name:"Océan",    icon:"🌊",bonuses:{deut:0.3},   buildable:false},
  coast:    {name:"Côte",     icon:"🏖️",bonuses:{deut:0.5},   buildable:true},
  plain:    {name:"Plaine",   icon:"🌾",bonuses:{metal:0.2,crystal:0.2,deut:0.1},buildable:true},
  forest:   {name:"Forêt",   icon:"🌲",bonuses:{crystal:0.5}, buildable:true},
  mountain: {name:"Montagne", icon:"⛰️",bonuses:{metal:0.5},   buildable:true},
  volcano:  {name:"Volcan",   icon:"🌋",bonuses:{metal:0.8},   buildable:true},
  ice:      {name:"Glace",    icon:"🧊",bonuses:{deut:0.2},    buildable:false},
  desert:   {name:"Désert",   icon:"🏜️",bonuses:{metal:0.3},   buildable:true},
};
const ZONE_POOL={
  Tellurique:["plain","plain","forest","mountain","coast","ocean","volcano"],
  Gazeuse:   ["plain","plain","plain","mountain","volcano","volcano","desert"],
  Glaciale:  ["ice","ice","plain","mountain","coast","ocean","plain"],
  Désertique:["desert","desert","desert","mountain","volcano","plain","coast"],
  Océanique: ["ocean","ocean","coast","coast","plain","forest","mountain"],
  Volcanique:["volcano","volcano","mountain","desert","plain","coast","ocean"],
  Forestière:["forest","forest","plain","mountain","coast","ocean","plain"],
};
const ZONE_NAMES=["Plaine d'Argos","Forêt de Ceth","Pics de Morax","Côte d'Helyon","Vallée Noire","Désert d'Aur","Volcans de Zar","Toundra Glacée","Marais de Vel","Monts Nyxar","Grotte de Pyx","Estuaire Solian"];

function generateZones(planet){
  const r=rng(planet.seed*7919);
  const pool=ZONE_POOL[planet.type]||["plain","forest","mountain","coast","ocean","desert","volcano"];
  return Array.from({length:12},(_,z)=>{
    const type=pool[Math.floor(r()*pool.length)];
    const terrain=TERRAIN_TYPES[type]||TERRAIN_TYPES.plain;
    // Spherical coords — these are LOCAL to the planet mesh (before rotation)
    const theta=r()*Math.PI*2;
    const phi=Math.acos(2*r()-1);
    return{
      id:z,name:ZONE_NAMES[z%ZONE_NAMES.length],type,terrain,theta,phi,
      // local unit-sphere position (rotates WITH the mesh)
      lx:Math.sin(phi)*Math.cos(theta),
      ly:Math.cos(phi),
      lz:Math.sin(phi)*Math.sin(theta),
      building:null,
    };
  });
}

// ══════════════════════════════════════════════════════
// TEXTURE
// ══════════════════════════════════════════════════════
const PAL={
  Tellurique:{o:[12,55,155],l:[50,95,40],l2:[90,135,55],m:[120,100,75],s:[235,240,245],si:[160,210,110],beach:[210,195,145]},
  Gazeuse:   {b1:[198,132,48],b2:[232,182,92],b3:[158,92,28],st:[255,238,195]},
  Glaciale:  {o:[45,118,182],l:[198,220,235],l2:[168,202,222],m:[228,240,250],s:[250,252,255]},
  Désertique:{o:[185,148,52],l:[208,165,70],l2:[225,190,88],m:[158,118,38],s:[242,230,190]},
  Océanique: {o:[5,38,162],l:[25,92,202],l2:[15,68,178],m:[45,122,222],s:[160,202,248]},
  Volcanique:{o:[38,5,3],l:[82,10,5],l2:[148,25,0],m:[198,68,0],s:[248,118,0],lava:[255,80,5],hot:[255,160,0]},
  Forestière:{o:[15,62,128],l:[18,62,18],l2:[32,108,26],m:[55,78,36],s:[192,212,182],si:[82,138,50]},
};
function genTexture(planet,sz=1024){
  const cv=document.createElement("canvas");cv.width=sz;cv.height=sz;
  const ctx=cv.getContext("2d"),img=ctx.createImageData(sz,sz),d=img.data;
  const n=noise2d(planet.seed),n2=noise2d(planet.seed+11111),cn=noise2d(planet.seed+99999);
  const p=PAL[planet.type]||PAL.Tellurique,isG=planet.type==="Gazeuse",wl=planet.water/100;
  const isVolc=planet.type==="Volcanique",isDesert=planet.type==="Désertique";
  for(let py=0;py<sz;py++){for(let px=0;px<sz;px++){
    const u=px/sz,v=py/sz,lon=u*4,lat=v*2;
    let r,g,b;
    if(isG){
      const tb=fbm(n,lon*.8,lat*3,5)*.28,bnd=Math.sin((v+tb)*Math.PI*10),t=(bnd+1)/2,det=fbm(n,lon*1.5+3,lat*4+3,4),su=(u-.62)*3.5,sv2=(v-.48)*8,sd=Math.sqrt(su*su+sv2*sv2);
      if(sd<0.9){const sm=Math.max(0,1-sd/.9);r=Math.round(p.b1[0]*(1-sm)+p.st[0]*sm);g=Math.round(p.b1[1]*(1-sm)+p.st[1]*sm);b=Math.round(p.b1[2]*(1-sm)+p.st[2]*sm);}
      else{const mx=t*.6+det*.4;r=Math.round(p.b1[0]*(1-mx)+p.b2[0]*mx+(det-.5)*28);g=Math.round(p.b1[1]*(1-mx)+p.b2[1]*mx+(det-.5)*22);b=Math.round(p.b1[2]*(1-mx)+p.b2[2]*mx+(det-.5)*15);if(bnd<-.35){r=Math.round(r*.72+p.b3[0]*.28);g=Math.round(g*.72+p.b3[1]*.28);b=Math.round(b*.72+p.b3[2]*.28);}}
    }else{
      const el=fbm(n,lon,lat,9,2.0,0.54),el2=fbm(n2,lon*1.3+5,lat*1.3+5,4),combined=el*.75+el2*.25,isW=combined<wl;
      const poleFactor=Math.abs(v-.5)*2,poleThresh=planet.type==="Glaciale"?0.55:0.84+Math.min(planet.temp,0)*.002,pb=Math.max(0,(poleFactor-poleThresh)/.07);
      if(isW){
        const depth=Math.max(0,(wl-combined)/Math.max(wl,.01)),shallow=Math.pow(Math.max(0,1-depth*3),2),wv=fbm(n,lon*4+8,lat*4+8,3)*.08;
        const coastDist=(combined-wl)/Math.max(.001,wl*.1);
        if(coastDist>-.04&&p.beach){const cb=Math.max(0,Math.min(1,(-coastDist)/.04));r=Math.round(p.beach[0]*(1-cb)+p.o[0]*cb);g=Math.round(p.beach[1]*(1-cb)+p.o[1]*cb);b=Math.round(p.beach[2]*(1-cb)+p.o[2]*cb);}
        else{r=Math.round(p.o[0]*(1+shallow*.5)+wv*12);g=Math.round(p.o[1]*(1+shallow*.3)+wv*10);b=Math.round(p.o[2]*(1+shallow*.08)+wv*6);}
      }else{
        const h=Math.max(0,(combined-wl)/Math.max(1-wl,.01)),det=fbm(n,lon*5+2,lat*5+2,5)*.5+.5,det2=fbm(n2,lon*8+3,lat*8+3,3)*.5+.5;
        if(isVolc){const lf=fbm(n,lon*3,lat*3,6);if(h<.3||lf>.65){const lm=lf>.65?Math.min(1,(lf-.65)/.12):0,hm=Math.sin(lf*8)*.5+.5;r=Math.round(p.l[0]*(1-lm)+p.lava[0]*lm);g=Math.round(p.l[1]*(1-lm)+p.lava[1]*lm);b=Math.round(p.l[2]*(1-lm)+p.lava[2]*lm);if(lm>.5){r=Math.round(r*(1-hm*.3)+p.hot[0]*hm*.3);g=Math.round(g*(1-hm*.3)+p.hot[1]*hm*.3);}}else if(h>.7){r=Math.round(p.m[0]*(det*.6+.4));g=Math.round(p.m[1]*(det*.6+.4));b=Math.round(p.m[2]*(det*.6+.4));}else{r=Math.round(p.l2[0]*(det*.5+.5));g=Math.round(p.l2[1]*(det*.5+.5));b=Math.round(p.l2[2]*(det*.5+.5));}}
        else if(isDesert){const dn=Math.abs(Math.sin(lon*6+fbm(n,lon*2,lat*2,3)))*.4+.6;if(h>.75){r=Math.round(p.m[0]*det);g=Math.round(p.m[1]*det);b=Math.round(p.m[2]*det);}else{r=Math.round(p.l[0]*dn+p.l2[0]*(1-dn));g=Math.round(p.l[1]*dn+p.l2[1]*(1-dn));b=Math.round(p.l[2]*dn+p.l2[2]*(1-dn));}}
        else{if(h>.80){const sn=Math.min(1,(h-.80)/.15),rk=det2*.3+.7;r=Math.round(p.l2[0]*rk*(1-sn)+p.s[0]*sn);g=Math.round(p.l2[1]*rk*(1-sn)+p.s[1]*sn);b=Math.round(p.l2[2]*rk*(1-sn)+p.s[2]*sn);}else if(h>.62){const t2=(h-.62)/.18;r=Math.round(p.l2[0]*(1-t2)+p.m[0]*t2);g=Math.round(p.l2[1]*(1-t2)+p.m[1]*t2);b=Math.round(p.l2[2]*(1-t2)+p.m[2]*t2);}else if(h>.40){const t3=(h-.40)/.22;r=Math.round(p.l[0]*(1-t3)+p.l2[0]*t3);g=Math.round(p.l[1]*(1-t3)+p.l2[1]*t3);b=Math.round(p.l[2]*(1-t3)+p.l2[2]*t3);}else{const co=Math.max(0,(h-.32)/.08);r=Math.round(p.l[0]*co+(p.beach||p.l)[0]*(1-co));g=Math.round(p.l[1]*co+(p.beach||p.l)[1]*(1-co));b=Math.round(p.l[2]*co+(p.beach||p.l)[2]*(1-co));}
        r=Math.round(r*(.84+det*.32));g=Math.round(g*(.84+det*.32));b=Math.round(b*(.84+det*.32));
        if(planet.type==="Forestière"&&h>.25&&h<.55){const fst=fbm(n2,lon*4,lat*4,4);if(fst>.55){const fm=Math.min(1,(fst-.55)/.15);r=Math.round(r*(1-fm)+p.l[0]*fm*.8);g=Math.round(g*(1-fm)+p.l[1]*fm*1.1);b=Math.round(b*(1-fm)+p.l[2]*fm*.8);}}}
        r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
      }
      if(pb>0){r=Math.round(r*(1-pb)+p.s[0]*pb);g=Math.round(g*(1-pb)+p.s[1]*pb);b=Math.round(b*(1-pb)+p.s[2]*pb);}
      if(planet.clouds>.05){const cl=fbm(cn,lon*1.4,lat*1.4,5),ca=Math.max(0,Math.min(1,(cl-(1-planet.clouds))/.18));r=Math.round(r*(1-ca)+242*ca);g=Math.round(g*(1-ca)+246*ca);b=Math.round(b*(1-ca)+255*ca);}
    }
    const idx=(py*sz+px)*4;d[idx]=Math.max(0,Math.min(255,r));d[idx+1]=Math.max(0,Math.min(255,g));d[idx+2]=Math.max(0,Math.min(255,b));d[idx+3]=255;
  }}
  ctx.putImageData(img,0,0);return cv;
}

// ══════════════════════════════════════════════════════
// GAME LOGIC
// ══════════════════════════════════════════════════════
const BUILDINGS=[
  {id:"mine_metal",   name:"Mine de Métal",    icon:"⛏️",base:{metal:60,crystal:15,deut:0},   factor:1.5,produces:"metal",  terrainBonus:["mountain","volcano","desert"]},
  {id:"mine_crystal", name:"Mine de Cristal",  icon:"💎",base:{metal:48,crystal:24,deut:0},   factor:1.6,produces:"crystal",terrainBonus:["mountain","plain","forest"]},
  {id:"synth_deut",   name:"Synthétiseur",     icon:"⚗️",base:{metal:225,crystal:75,deut:0},  factor:1.5,produces:"deut",   terrainBonus:["coast","plain"]},
  {id:"centrale",     name:"Centrale Solaire", icon:"☀️",base:{metal:75,crystal:30,deut:0},   factor:1.5,produces:"energy", terrainBonus:["plain","desert","coast"]},
  {id:"usine_robots", name:"Usine de Robots",  icon:"🤖",base:{metal:400,crystal:120,deut:40},factor:2.0,produces:"speed",  terrainBonus:["plain","mountain"]},
  {id:"hangar",       name:"Hangar Spatial",   icon:"🚀",base:{metal:400,crystal:200,deut:100},factor:2.0,produces:"ships", terrainBonus:["plain","coast","desert"]},
];
const SHIPS=[
  {id:"chasseur",name:"Chasseur",icon:"🛸",cost:{metal:3000,crystal:1000,deut:0},   attack:50, shield:10, cargo:50,   req:{hangar:1}},
  {id:"cargo",   name:"Cargo",   icon:"🚢",cost:{metal:2000,crystal:2000,deut:0},   attack:5,  shield:25, cargo:5000, req:{hangar:2}},
  {id:"croiseur",name:"Croiseur",icon:"⚔️",cost:{metal:20000,crystal:7000,deut:2000},attack:400,shield:100,cargo:800, req:{hangar:3}},
];
const bCost=(b,lv)=>({metal:Math.round(b.base.metal*Math.pow(b.factor,lv)),crystal:Math.round(b.base.crystal*Math.pow(b.factor,lv)),deut:Math.round(b.base.deut*Math.pow(b.factor,lv))});
const bTime=(b,lv,rl)=>Math.max(2,Math.round(((bCost(b,lv).metal+bCost(b,lv).crystal)/(2500*(1+rl)))*3600));
const prodH=(lv,base,bonus=0)=>Math.round(base*lv*Math.pow(1.1,lv)*(1+bonus));
const eNeed=bld=>Math.round(10*(bld.mine_metal||0)*Math.pow(1.1,bld.mine_metal||0)+10*(bld.mine_crystal||0)*Math.pow(1.1,bld.mine_crystal||0)+20*(bld.synth_deut||0)*Math.pow(1.1,bld.synth_deut||0));
const eProd=lv=>Math.round(20*lv*Math.pow(1.1,lv));
const eRatio=bld=>{const n=eNeed(bld),p=eProd(bld.centrale||0);return n===0?1:Math.min(1,p/n);};
const canAfford=(res,cost)=>res.metal>=cost.metal&&res.crystal>=cost.crystal&&res.deut>=(cost.deut||0);
const deduct=(res,cost)=>({metal:res.metal-cost.metal,crystal:res.crystal-cost.crystal,deut:res.deut-(cost.deut||0)});
const fmt=n=>{n=Math.floor(n);return n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":""+n;};
const fmtT=s=>{if(s<=0)return"0s";const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return h>0?`${h}h${m}m`:m>0?`${m}m${sc}s`:`${sc}s`;};
function getTerrainBonuses(zones){
  const bon={metal:0,crystal:0,deut:0};
  (zones||[]).forEach(z=>{
    if(!z.building)return;
    const b=BUILDINGS.find(x=>x.id===z.building);if(!b)return;
    const isBonus=b.terrainBonus?.includes(z.type);
    if(!isBonus)return;
    const bv=z.terrain?.bonuses?.[b.produces]||0.2;
    if(b.produces==="metal")bon.metal+=bv;
    if(b.produces==="crystal")bon.crystal+=bv;
    if(b.produces==="deut")bon.deut+=bv;
  });
  return bon;
}
function initState(planet){return{resources:{metal:500,crystal:300,deut:100},buildings:{mine_metal:0,mine_crystal:0,synth_deut:0,centrale:0,usine_robots:0,hangar:0},ships:{chasseur:0,cargo:0,croiseur:0},zones:generateZones(planet),queue:null,fleets:[],lastTick:Date.now()};}
function loadGS(uid){try{const r=localStorage.getItem(K.state(uid));return r?JSON.parse(r):null;}catch{return null;}}
function saveGS(uid,s){try{localStorage.setItem(K.state(uid),JSON.stringify(s));}catch{}}
function tickGS(s,planet){
  const now=Date.now(),dt=(now-s.lastTick)/3600000,ratio=eRatio(s.buildings),tb=getTerrainBonuses(s.zones);
  const ns={...s,resources:{...s.resources},buildings:{...s.buildings},ships:{...s.ships},zones:[...(s.zones||[])],fleets:[...(s.fleets||[])],lastTick:now};
  ns.resources.metal  =Math.min(999999,ns.resources.metal  +prodH(ns.buildings.mine_metal  ||0,30,tb.metal)*ratio*dt);
  ns.resources.crystal=Math.min(999999,ns.resources.crystal+prodH(ns.buildings.mine_crystal||0,20,tb.crystal)*ratio*dt);
  ns.resources.deut   =Math.min(999999,ns.resources.deut   +prodH(ns.buildings.synth_deut  ||0,10,tb.deut)*ratio*dt);
  if(ns.queue&&now>=ns.queue.finishAt){if(ns.queue.type==="build")ns.buildings[ns.queue.id]=(ns.buildings[ns.queue.id]||0)+1;if(ns.queue.type==="ship")ns.ships[ns.queue.id]=(ns.ships[ns.queue.id]||0)+(ns.queue.count||1);ns.queue=null;}
  ns.fleets=ns.fleets.filter(f=>{if(now>=f.arriveAt&&!f.returning){f.returning=true;const dur=f.arriveAt-f.departAt;f.departAt=now;f.arriveAt=now+dur;}if(f.returning&&now>=f.arriveAt){ns.resources.metal+=f.cm||0;ns.resources.crystal+=f.cc||0;return false;}return true;});
  return ns;
}

// ══════════════════════════════════════════════════════
// 3D PLANET — markers parented to the planet mesh !!!
// ══════════════════════════════════════════════════════
function Planet3D({planet, zones, onZoneClick, isMyPlanet, fs}){
  const mountRef=useRef(),stateRef=useRef({}),dragRef=useRef({on:false,x:0,y:0,rx:0,ry:0,vx:0,vy:0,moved:false}),texRef=useRef(null);

  useEffect(()=>{
    if(!window.THREE||!planet||!mountRef.current)return;
    const T=window.THREE,div=mountRef.current;
    if(stateRef.current.af)cancelAnimationFrame(stateRef.current.af);
    if(stateRef.current.renderer){stateRef.current.renderer.dispose();while(div.firstChild)div.removeChild(div.firstChild);}
    const W=div.clientWidth||700,H=div.clientHeight||560;
    const renderer=new T.WebGLRenderer({antialias:true,alpha:true});
    renderer.setSize(W,H);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    div.appendChild(renderer.domElement);
    const scene=new T.Scene();
    const cam=new T.PerspectiveCamera(42,W/H,0.1,200);cam.position.z=2.85;

    // Stars
    const sp=new Float32Array(4000);for(let i=0;i<4000;i+=3){const a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1),r=35+Math.random()*20;sp[i]=r*Math.sin(b)*Math.cos(a);sp[i+1]=r*Math.sin(b)*Math.sin(a);sp[i+2]=r*Math.cos(b);}
    const sg=new T.BufferGeometry();sg.setAttribute("position",new T.BufferAttribute(sp,3));
    scene.add(new T.Points(sg,new T.PointsMaterial({color:0xffffff,size:.05,transparent:true,opacity:.85})));

    // Planet mesh
    if(!texRef.current)texRef.current=genTexture(planet,1024);
    const tex=new T.CanvasTexture(texRef.current);
    const mesh=new T.Mesh(
      new T.SphereGeometry(1,96,96),
      new T.MeshPhongMaterial({map:tex,bumpMap:tex,bumpScale:0.025,specular:planet.water>15?new T.Color(.08,.18,.32):new T.Color(.03,.03,.03),shininess:planet.water>15?28:3})
    );
    mesh.rotation.z=planet.tilt*Math.PI/180;
    scene.add(mesh);

    // Atmosphere
    if(planet.atmos!=="Aucune"){
      const ac={Dense:0x5588ff,Légère:0x88aaff,Toxique:0x99ee33,Respirable:0x66aaff,Tempétueuse:0x9977dd}[planet.atmos]||0x88aaff;
      scene.add(new T.Mesh(new T.SphereGeometry(1.06,48,48),new T.MeshPhongMaterial({color:ac,transparent:true,opacity:.08,depthWrite:false})));
      scene.add(new T.Mesh(new T.SphereGeometry(1.12,48,48),new T.MeshPhongMaterial({color:ac,transparent:true,opacity:.04,side:T.BackSide,blending:T.AdditiveBlending,depthWrite:false})));
    }

    // Moons
    const moonMeshes=[];
    for(let m=0;m<planet.moons;m++){
      const mr=rng(planet.seed+m*777),ms=.06+mr()*.07,md=1.5+m*.4+mr()*.1,ma=mr()*Math.PI*2;
      const mm=new T.Mesh(new T.SphereGeometry(ms,24,24),new T.MeshPhongMaterial({color:new T.Color(.5+mr()*.2,.5+mr()*.2,.52+mr()*.12)}));
      scene.add(mm);moonMeshes.push({mesh:mm,dist:md,angle:ma,speed:.15+mr()*.2,tilt:(mr()-.5)*.25});
    }

    // ══════════════════════════════════════════════════
    // KEY FIX: markers are children of `mesh`, not `scene`
    // They automatically rotate with the planet!
    // ══════════════════════════════════════════════════
    const markers=[];
    if(isMyPlanet&&zones){
      zones.forEach((zone,zi)=>{
        if(!zone.terrain?.buildable)return;
        const hasBuilding=!!zone.building;
        const col=hasBuilding?new T.Color(1,.85,0):new T.Color(.2,.65,1);
        const markerGeo=new T.SphereGeometry(.045,12,12);
        const markerMat=new T.MeshPhongMaterial({color:col,emissive:col,emissiveIntensity:.9,transparent:true,opacity:.95});
        const marker=new T.Mesh(markerGeo,markerMat);
        // Position in local planet space (lx,ly,lz are unit sphere coords)
        marker.position.set(zone.lx*1.04,zone.ly*1.04,zone.lz*1.04);
        marker.userData={zoneId:zi};
        // Add as child of planet mesh — rotates automatically!
        mesh.add(marker);
        markers.push(marker);
      });
    }

    // Lights
    const sun=new T.DirectionalLight(0xfff8e0,1.8);sun.position.set(5,2.5,4);scene.add(sun);
    scene.add(new T.DirectionalLight(0x112244,.3).position.set(-3,-2,-3));
    scene.add(new T.AmbientLight(0x182030,.5));

    const raycaster=new T.Raycaster();
    dragRef.current.rx=stateRef.current.rx||0;
    dragRef.current.ry=stateRef.current.ry||0;
    let t=stateRef.current.t||0,af;

    const loop=()=>{
      af=requestAnimationFrame(loop);t+=.004;
      const dr=dragRef.current;
      if(!dr.on){dr.vx*=.94;dr.vy*=.94;dr.ry+=dr.vx;dr.rx+=dr.vy;}
      dr.rx=Math.max(-1.4,Math.min(1.4,dr.rx));
      mesh.rotation.y=dr.ry+t*.08;
      mesh.rotation.x=dr.rx;
      // Pulse markers
      markers.forEach((m,i)=>{const s=.85+.15*Math.sin(t*2.5+i*.9);m.scale.setScalar(s);});
      moonMeshes.forEach(({mesh:m,dist,angle,speed,tilt})=>{const a=angle+t*speed;m.position.set(Math.cos(a)*dist,tilt,Math.sin(a)*dist);});
      renderer.render(scene,cam);
      stateRef.current.t=t;stateRef.current.rx=dr.rx;stateRef.current.ry=dr.ry;
    };
    loop();stateRef.current={renderer,mesh,markers,af};

    // Drag + click
    const oD=e=>{const dr=dragRef.current;dr.on=true;dr.moved=false;dr.x=e.clientX||(e.touches?.[0]?.clientX||0);dr.y=e.clientY||(e.touches?.[0]?.clientY||0);dr.vx=0;dr.vy=0;};
    const oM=e=>{const dr=dragRef.current;if(!dr.on)return;const cx=e.clientX||(e.touches?.[0]?.clientX||0),cy=e.clientY||(e.touches?.[0]?.clientY||0);if(Math.abs(cx-dr.x)>3||Math.abs(cy-dr.y)>3)dr.moved=true;const dx=(cx-dr.x)*.007,dy=(cy-dr.y)*.007;dr.vx=dx;dr.vy=dy;dr.ry+=dx;dr.rx+=dy;dr.x=cx;dr.y=cy;};
    const oU=e=>{
      const dr=dragRef.current;dr.on=false;
      if(!dr.moved&&isMyPlanet&&onZoneClick){
        const rect=renderer.domElement.getBoundingClientRect();
        const mx=((e.clientX-rect.left)/rect.width)*2-1,my=-((e.clientY-rect.top)/rect.height)*2+1;
        raycaster.setFromCamera({x:mx,y:my},cam);
        // Raycast against markers (world-space, Three handles transform)
        const hits=raycaster.intersectObjects(markers,false);
        if(hits.length>0)onZoneClick(hits[0].object.userData.zoneId);
      }
    };
    renderer.domElement.addEventListener("mousedown",oD);
    renderer.domElement.addEventListener("touchstart",oD,{passive:true});
    window.addEventListener("mousemove",oM);
    window.addEventListener("touchmove",oM,{passive:true});
    window.addEventListener("mouseup",oU);
    window.addEventListener("touchend",oU);
    return()=>{
      cancelAnimationFrame(af);
      renderer.domElement.removeEventListener("mousedown",oD);renderer.domElement.removeEventListener("touchstart",oD);
      window.removeEventListener("mousemove",oM);window.removeEventListener("touchmove",oM);
      window.removeEventListener("mouseup",oU);window.removeEventListener("touchend",oU);
      renderer.dispose();while(div.firstChild)div.removeChild(div.firstChild);
    };
  },[planet,zones,isMyPlanet,fs]);

  return <div ref={mountRef} style={{width:"100%",height:"100%",cursor:"grab"}}/>;
}

// ══════════════════════════════════════════════════════
// ZONE MODAL
// ══════════════════════════════════════════════════════
function ZoneModal({zone,state,onPlace,onRemove,onClose}){
  if(!zone)return null;
  const t=zone.terrain,placed=zone.building?BUILDINGS.find(b=>b.id===zone.building):null;
  const lv=placed?(state.buildings[placed.id]||0):0;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.65)"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:340,background:"linear-gradient(160deg,#07101f,#091420)",border:"1px solid #1a3050",borderRadius:16,padding:20,fontFamily:"'Share Tech Mono',monospace",color:"#9abcd8",boxShadow:"0 0 40px rgba(0,20,60,.9)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><div style={{fontSize:14,color:"#c8e0ff"}}>{t.icon} {zone.name}</div><div style={{fontSize:9,color:"#2a4a6a",marginTop:2}}>{t.name}</div></div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#2a4060",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{padding:"7px 10px",borderRadius:8,background:"rgba(10,25,50,.5)",border:"1px solid #0d2035",marginBottom:14,fontSize:9}}>
          <div style={{color:"#1e3050",letterSpacing:1,marginBottom:4}}>BONUS DE TERRAIN</div>
          {Object.entries(t.bonuses).map(([k,v])=><div key={k} style={{color:"#3a7a54"}}>+{Math.round(v*100)}% {k==="metal"?"métal":k==="crystal"?"cristal":"deutérium"}</div>)}
        </div>
        {placed?(
          <div style={{marginBottom:12,padding:10,borderRadius:8,background:"rgba(20,50,20,.3)",border:"1px solid #1a4020"}}>
            <div style={{fontSize:11,color:"#9abcd8",marginBottom:4}}>{placed.icon} {placed.name} <span style={{color:"#4a7aaa"}}>niv.{lv}</span></div>
            {placed.terrainBonus?.includes(zone.type)&&<div style={{fontSize:9,color:"#40c870"}}>✓ Bonus de terrain actif</div>}
            <button onClick={onRemove} style={{marginTop:8,width:"100%",padding:"5px 0",borderRadius:6,border:"1px solid #3a1010",background:"rgba(80,10,10,.3)",color:"#c05050",fontSize:9,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace"}}>🗑️ RETIRER LE BÂTIMENT</button>
          </div>
        ):(
          <div>
            <div style={{fontSize:9,color:"#1e3050",letterSpacing:1,marginBottom:8}}>PLACER UN BÂTIMENT</div>
            {BUILDINGS.map(b=>{
              const alreadyPlaced=state.zones?.some(z=>z.building===b.id);
              const isBonus=b.terrainBonus?.includes(zone.type);
              const lv2=state.buildings[b.id]||0;
              return(
                <button key={b.id} onClick={()=>onPlace(b.id)} disabled={alreadyPlaced}
                  style={{width:"100%",marginBottom:5,padding:"7px 10px",borderRadius:7,border:`1px solid ${isBonus?"#1a4030":"#0d2035"}`,background:isBonus?"rgba(15,40,20,.5)":"rgba(8,16,30,.5)",color:alreadyPlaced?"#1e3050":"#9abcd8",cursor:alreadyPlaced?"not-allowed":"pointer",display:"flex",justifyContent:"space-between",fontSize:10,fontFamily:"'Share Tech Mono',monospace"}}>
                  <span>{b.icon} {b.name} <span style={{color:"#2a4060"}}>niv.{lv2}</span></span>
                  {isBonus&&!alreadyPlaced&&<span style={{color:"#40c870",fontSize:9}}>✓ +bonus</span>}
                  {alreadyPlaced&&<span style={{color:"#804040",fontSize:9}}>déjà placé</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// VIEWER 3D MODAL
// ══════════════════════════════════════════════════════
function Viewer3D({planet,onClose,isPlayer,owner,state,onStateChange}){
  const[threeOk,setThreeOk]=useState(!!window.THREE),[fs,setFs]=useState(false),[selZone,setSelZone]=useState(null);
  useEffect(()=>{if(window.THREE){setThreeOk(true);return;}const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";s.onload=()=>setThreeOk(true);document.head.appendChild(s);},[]);
  useEffect(()=>{const f=e=>{if(e.key==="Escape"){if(selZone!==null)setSelZone(null);else if(fs)setFs(false);else onClose();}};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f);},[fs,onClose,selZone]);
  const zones=state?.zones||[];
  const[c1]=gc(planet.type);
  const BS={padding:"7px 14px",background:"rgba(6,16,30,.9)",border:"1px solid #0d2540",borderRadius:8,color:"#4a7aaa",fontSize:10,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",letterSpacing:1};
  const handleZoneClick=zi=>setSelZone(zones[zi]);
  const handlePlace=bldId=>{if(!onStateChange)return;const nz=zones.map(z=>z.id===selZone.id?{...z,building:bldId}:z);onStateChange({...state,zones:nz});setSelZone(null);};
  const handleRemove=()=>{if(!onStateChange)return;const nz=zones.map(z=>z.id===selZone.id?{...z,building:null}:z);onStateChange({...state,zones:nz});setSelZone(null);};

  const ViewerContent=({fullscreen})=>(
    <div style={{position:"relative",width:"100%",height:"100%",background:"#020810",display:"flex",flexDirection:"column"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,padding:"14px 18px",background:"linear-gradient(to bottom,rgba(2,8,16,.85),transparent)",pointerEvents:"none"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:fullscreen?22:19,color:"#c8e0ff",letterSpacing:1,textShadow:`0 0 20px ${c1}88`}}>{planet.name}</div>
        <div style={{fontSize:10,color:"#2a4a6a",marginTop:2}}>{planet.type} · Slot #{planet.i+1}{isPlayer&&" ⭐"}{owner&&` · 👤 ${owner}`}</div>
        {isPlayer&&<div style={{fontSize:9,color:"#1e3050",marginTop:1}}>Tourne la planète · Clique sur 🔵 pour placer · 🟡 = bâtiment existant</div>}
      </div>
      <div style={{position:"absolute",top:14,right:14,zIndex:10,display:"flex",gap:8}}>
        {fullscreen?<button onClick={()=>setFs(false)} style={BS}>⊡ FENÊTRE</button>:<button onClick={()=>setFs(true)} style={BS}>⛶ PLEIN ÉCRAN</button>}
        <button onClick={onClose} style={{...BS,color:"#2a4060"}}>✕</button>
      </div>
      <div style={{flex:1,minHeight:0}}>
        {threeOk?<Planet3D planet={planet} zones={isPlayer?zones:null} onZoneClick={isPlayer?handleZoneClick:null} isMyPlanet={isPlayer} fs={fullscreen}/>
        :<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#1e3050",fontSize:11,fontFamily:"'Share Tech Mono',monospace"}}>Chargement Three.js...</div>}
      </div>
      {!fullscreen&&<div style={{position:"absolute",bottom:10,left:0,right:0,textAlign:"center",fontSize:9,color:"#0d1e30",pointerEvents:"none"}}>GLISSER POUR PIVOTER{isPlayer?" · CLIQUER 🔵/🟡 POUR GÉRER":""}</div>}
    </div>
  );

  if(fs)return(
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column"}}>
      <ViewerContent fullscreen={true}/>
      {selZone&&<ZoneModal zone={selZone} state={state} onPlace={handlePlace} onRemove={handleRemove} onClose={()=>setSelZone(null)}/>}
    </div>
  );

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(2,5,12,.96)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,backdropFilter:"blur(6px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{display:"grid",gridTemplateColumns:"1fr 275px",width:"100%",maxWidth:1080,margin:12,background:"linear-gradient(160deg,#06101e,#08141f)",border:"1px solid #0d2035",borderRadius:20,overflow:"hidden",maxHeight:"94vh",fontFamily:"'Share Tech Mono',monospace",boxShadow:`0 0 80px rgba(0,10,40,.95),0 0 120px ${c1}18`}}>
        <div style={{position:"relative",minHeight:560,display:"flex",flexDirection:"column"}}>
          <ViewerContent fullscreen={false}/>
        </div>
        <div style={{padding:18,overflowY:"auto",color:"#9abcd8",borderLeft:"1px solid #0a1828"}}>
          {isPlayer&&state?(
            <>
              <div style={{fontSize:9,color:"#1e3050",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Zones ({zones.filter(z=>z.terrain?.buildable).length} constructibles)</div>
              {zones.filter(z=>z.terrain?.buildable).map(z=>{
                const placed=z.building?BUILDINGS.find(b=>b.id===z.building):null;
                const isBonus=placed&&placed.terrainBonus?.includes(z.type);
                return(
                  <div key={z.id} onClick={()=>setSelZone(z)} style={{marginBottom:5,padding:"7px 10px",borderRadius:8,background:"rgba(8,16,30,.7)",border:`1px solid ${z.building?"#1a3a20":"#0d2035"}`,cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:10,color:"#7a9ab8"}}>{z.terrain?.icon} {z.name}</span>
                      {placed?<span style={{fontSize:9,color:isBonus?"#40c870":"#4a7aaa"}}>{placed.icon}{isBonus?" ✓":""}</span>:<span style={{fontSize:9,color:"#44aaff"}}>🔵</span>}
                    </div>
                    {placed&&<div style={{fontSize:8,color:"#2a4a6a",marginTop:1}}>{placed.name} niv.{state.buildings[placed.id]||0}</div>}
                  </div>
                );
              })}
            </>
          ):(
            <>
              <div style={{fontSize:9,color:"#1e3050",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Informations</div>
              {[["Rayon",`${planet.size.toLocaleString()} km`],["Distance",`${planet.dist} UA`],["Eau",`${planet.water}%`],["Atmosphère",planet.atmos]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #0a1828",fontSize:11}}><span style={{color:"#2a4060"}}>{k}</span><span style={{color:"#8ab0cc",fontFamily:"monospace"}}>{v}</span></div>
              ))}
            </>
          )}
        </div>
      </div>
      {selZone&&<ZoneModal zone={selZone} state={state} onPlace={handlePlace} onRemove={handleRemove} onClose={()=>setSelZone(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// RESOURCE BAR
// ══════════════════════════════════════════════════════
function ResBar({res,bld,zones}){
  const ratio=eRatio(bld),ep=eProd(bld.centrale||0),en=eNeed(bld),ec=ratio<0.5?"#e05030":ratio<1?"#e0c030":"#40c870";
  const tb=getTerrainBonuses(zones||[]);
  return(
    <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"8px 12px",background:"rgba(6,15,28,.9)",borderRadius:10,border:"1px solid #0d2035",fontFamily:"'Share Tech Mono',monospace",fontSize:11,alignItems:"center"}}>
      {[["⛏️",res.metal,"#7090b8",tb.metal],["💎",res.crystal,"#40a8c8",tb.crystal],["⚗️",res.deut,"#40c890",tb.deut]].map(([ic,v,c,bon])=>(
        <div key={ic} style={{display:"flex",alignItems:"center",gap:3}}><span>{ic}</span><span style={{color:c,fontWeight:"bold"}}>{fmt(v)}</span>{bon>0&&<span style={{fontSize:8,color:"#40c870"}}>+{Math.round(bon*100)}%</span>}</div>
      ))}
      <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
        <span>⚡</span><span style={{color:ec}}>{ep}/{en}</span>
        {ratio<1&&<span style={{color:"#e08030",fontSize:9}}>({Math.round(ratio*100)}%)</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// BUILD TAB
// ══════════════════════════════════════════════════════
function BuildTab({state,onBuild}){
  const[now,setNow]=useState(Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  const rl=state.buildings.usine_robots||0,tb=getTerrainBonuses(state.zones||[]);
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:8}}>
      {BUILDINGS.map(b=>{
        const lv=state.buildings[b.id]||0,cost=bCost(b,lv),afford=canAfford(state.resources,cost),inQ=state.queue?.id===b.id,otherQ=state.queue&&!inQ;
        const bon=tb[b.produces]||0;
        const info=b.produces==="metal"?`+${fmt(prodH(lv+1,30,bon))}/h`:b.produces==="crystal"?`+${fmt(prodH(lv+1,20,bon))}/h`:b.produces==="deut"?`+${fmt(prodH(lv+1,10,bon))}/h`:b.produces==="energy"?`⚡+${fmt(eProd(lv+1))}`:b.produces==="speed"?`×${lv+2} vitesse`:`Niv.${lv+1}`;
        const zb=state.zones?.find(z=>z.building===b.id);
        return(
          <div key={b.id} style={{background:"#070f1e",border:`1px solid ${inQ?"#1a5080":zb?"#1a3a20":"#0d2035"}`,borderRadius:10,padding:11}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:11,color:"#9abcd8",fontFamily:"'Share Tech Mono',monospace"}}>{b.icon} {b.name}</div>
              <div style={{fontSize:13,padding:"1px 7px",borderRadius:5,background:"#0a1828",color:"#4a7aaa",fontFamily:"'Share Tech Mono',monospace"}}>{lv}</div>
            </div>
            <div style={{fontSize:9,color:bon>0?"#40c870":"#3a6a4a",marginBottom:4}}>{info}{bon>0&&" ✓"}</div>
            {zb&&<div style={{fontSize:8,color:"#3a7a54",marginBottom:4}}>{zb.terrain?.icon} {zb.name}</div>}
            <div style={{fontSize:9,marginBottom:6,display:"flex",gap:5,flexWrap:"wrap"}}>
              {cost.metal>0&&<span style={{color:state.resources.metal>=cost.metal?"#7090b8":"#803030"}}>⛏️{fmt(cost.metal)}</span>}
              {cost.crystal>0&&<span style={{color:state.resources.crystal>=cost.crystal?"#40a8c8":"#803030"}}>💎{fmt(cost.crystal)}</span>}
              {cost.deut>0&&<span style={{color:state.resources.deut>=cost.deut?"#40c890":"#803030"}}>⚗️{fmt(cost.deut)}</span>}
              <span style={{color:"#2a4060",marginLeft:"auto"}}>⏱{fmtT(bTime(b,lv,rl))}</span>
            </div>
            {inQ?<div style={{fontSize:9,color:"#4a9adf",textAlign:"center",padding:"5px 0"}}>🔧 {fmtT(Math.max(0,Math.round((state.queue.finishAt-now)/1000)))}</div>
            :<button onClick={()=>onBuild(b,lv)} disabled={!afford||!!otherQ} style={{width:"100%",padding:"5px 0",borderRadius:6,border:"none",cursor:afford&&!otherQ?"pointer":"not-allowed",background:afford&&!otherQ?"linear-gradient(135deg,#1a4070,#0d2860)":"#0a1828",color:afford&&!otherQ?"#77aadd":"#1e3050",fontSize:9,fontFamily:"'Share Tech Mono',monospace",letterSpacing:1}}>{otherQ?"FILE OCCUPÉE":"AMÉLIORER"}</button>}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SHIPS TAB
// ══════════════════════════════════════════════════════
function ShipsTab({state,onBuildShip}){
  const[now,setNow]=useState(Date.now()),[qty,setQty]=useState({});
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  const hl=state.buildings.hangar||0;
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:8}}>
      {SHIPS.map(s=>{
        const ul=Object.entries(s.req).every(([k,v])=>(state.buildings[k]||0)>=v),q=qty[s.id]||1;
        const tc={metal:s.cost.metal*q,crystal:s.cost.crystal*q,deut:(s.cost.deut||0)*q};
        const can=ul&&canAfford(state.resources,tc)&&!state.queue,inQ=state.queue?.id===s.id;
        const bsecs=Math.max(10,Math.round(((s.cost.metal+s.cost.crystal)*q)/(2500*(1+hl))*3600));
        return(
          <div key={s.id} style={{background:"#070f1e",border:`1px solid ${inQ?"#1a5080":ul?"#0d2035":"#070e1a"}`,borderRadius:10,padding:11,opacity:ul?1:0.5}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:11,color:"#9abcd8",fontFamily:"'Share Tech Mono',monospace"}}>{s.icon} {s.name}</div>
              {!ul?<span style={{fontSize:8,color:"#804040",padding:"1px 5px",borderRadius:4,border:"1px solid #401010"}}>🔒 H{s.req.hangar}</span>:<span style={{fontSize:9,color:"#2a4060"}}>×{state.ships[s.id]||0}</span>}
            </div>
            <div style={{fontSize:9,color:"#2a4a6a",marginBottom:6}}>⚔️{s.attack} 🛡{s.shield} 📦{fmt(s.cargo)}</div>
            {ul&&(<>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                <button onClick={()=>setQty(c=>({...c,[s.id]:Math.max(1,(c[s.id]||1)-1)}))} style={{width:22,height:22,borderRadius:4,border:"1px solid #0d2035",background:"#0a1828",color:"#4a7aaa",cursor:"pointer",fontSize:13,lineHeight:1}}>−</button>
                <span style={{flex:1,textAlign:"center",fontSize:12,color:"#9abcd8",fontFamily:"'Share Tech Mono',monospace"}}>{q}</span>
                <button onClick={()=>setQty(c=>({...c,[s.id]:(c[s.id]||1)+1}))} style={{width:22,height:22,borderRadius:4,border:"1px solid #0d2035",background:"#0a1828",color:"#4a7aaa",cursor:"pointer",fontSize:13,lineHeight:1}}>+</button>
              </div>
              <div style={{fontSize:9,marginBottom:6,display:"flex",gap:5,flexWrap:"wrap"}}>
                {tc.metal>0&&<span style={{color:state.resources.metal>=tc.metal?"#7090b8":"#803030"}}>⛏️{fmt(tc.metal)}</span>}
                {tc.crystal>0&&<span style={{color:state.resources.crystal>=tc.crystal?"#40a8c8":"#803030"}}>💎{fmt(tc.crystal)}</span>}
                {tc.deut>0&&<span style={{color:state.resources.deut>=tc.deut?"#40c890":"#803030"}}>⚗️{fmt(tc.deut)}</span>}
                <span style={{color:"#2a4060",marginLeft:"auto"}}>⏱{fmtT(bsecs)}</span>
              </div>
              {inQ?<div style={{fontSize:9,color:"#4a9adf",textAlign:"center",padding:"5px 0"}}>🏗️ {fmtT(Math.max(0,Math.round((state.queue.finishAt-now)/1000)))}</div>
              :<button onClick={()=>onBuildShip(s,q)} disabled={!can} style={{width:"100%",padding:"5px 0",borderRadius:6,border:"none",cursor:can?"pointer":"not-allowed",background:can?"linear-gradient(135deg,#1a4070,#0d2860)":"#0a1828",color:can?"#77aadd":"#1e3050",fontSize:9,fontFamily:"'Share Tech Mono',monospace",letterSpacing:1}}>CONSTRUIRE</button>}
            </>)}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// FLEET TAB
// ══════════════════════════════════════════════════════
function FleetTab({state,planets,myIdx,onSend}){
  const[now,setNow]=useState(Date.now()),[sel,setSel]=useState({}),[target,setTarget]=useState(null);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  const avail=SHIPS.filter(s=>(state.ships[s.id]||0)>0),total=Object.values(sel).reduce((a,b)=>a+b,0);
  const send=()=>{if(!target||total===0)return;onSend({id:Date.now().toString(36),ships:{...sel},target,departAt:now,arriveAt:now+180000,returning:false,cm:0,cc:0},sel);setSel({});setTarget(null);};
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={{background:"#070f1e",border:"1px solid #0d2035",borderRadius:10,padding:14}}>
        <div style={{fontSize:9,color:"#1e3050",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Envoyer une flotte</div>
        {avail.length===0?<div style={{fontSize:10,color:"#1e3050",textAlign:"center",padding:20}}>Construisez des vaisseaux d'abord.</div>:(
          <>
            {avail.map(s=>(<div key={s.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:14}}>{s.icon}</span>
              <span style={{flex:1,fontSize:10,color:"#6a9ab8",fontFamily:"'Share Tech Mono',monospace"}}>{s.name} <span style={{color:"#1e3050"}}>({state.ships[s.id]})</span></span>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <button onClick={()=>setSel(c=>({...c,[s.id]:Math.max(0,(c[s.id]||0)-1)}))} style={{width:20,height:20,borderRadius:4,border:"1px solid #0d2035",background:"#0a1828",color:"#4a7aaa",cursor:"pointer",fontSize:12}}>−</button>
                <span style={{width:24,textAlign:"center",fontSize:11,color:"#9abcd8",fontFamily:"'Share Tech Mono',monospace"}}>{sel[s.id]||0}</span>
                <button onClick={()=>setSel(c=>({...c,[s.id]:Math.min(state.ships[s.id],(c[s.id]||0)+1)}))} style={{width:20,height:20,borderRadius:4,border:"1px solid #0d2035",background:"#0a1828",color:"#4a7aaa",cursor:"pointer",fontSize:12}}>+</button>
              </div>
            </div>))}
            <div style={{fontSize:9,color:"#1e3050",letterSpacing:1,marginTop:8,marginBottom:6}}>DESTINATION</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10,maxHeight:90,overflowY:"auto"}}>
              {planets.map((p,i)=>i!==myIdx&&<button key={i} onClick={()=>setTarget(i)} style={{padding:"3px 7px",borderRadius:5,border:`1px solid ${target===i?"#2255aa":"#0d2035"}`,background:target===i?"#0d2040":"transparent",color:target===i?"#88ccff":"#2a4a6a",fontSize:8,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace"}}>{p.name.split(" ")[0]}</button>)}
            </div>
            <button onClick={send} disabled={!target||total===0} style={{width:"100%",padding:"6px 0",borderRadius:7,border:"none",cursor:target&&total>0?"pointer":"not-allowed",background:target&&total>0?"linear-gradient(135deg,#1a4070,#0d2860)":"#0a1828",color:target&&total>0?"#77aadd":"#1e3050",fontSize:9,fontFamily:"'Share Tech Mono',monospace",letterSpacing:1}}>🚀 ENVOYER ({total})</button>
          </>
        )}
      </div>
      <div style={{background:"#070f1e",border:"1px solid #0d2035",borderRadius:10,padding:14}}>
        <div style={{fontSize:9,color:"#1e3050",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Flottes actives</div>
        {(state.fleets||[]).length===0?<div style={{fontSize:10,color:"#1e3050",textAlign:"center",padding:20}}>Aucune flotte en transit.</div>
        :(state.fleets||[]).map(f=>{const prog=Math.min(1,(now-f.departAt)/(f.arriveAt-f.departAt)),rem=Math.max(0,Math.round((f.arriveAt-now)/1000));return(
          <div key={f.id} style={{marginBottom:10,padding:"8px 10px",borderRadius:8,background:"rgba(10,20,40,.5)",border:"1px solid #0d2035"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}><span style={{color:"#6a9ab8"}}>{f.returning?"↩ Retour":"→ "+(planets[f.target]?.name||"??")}</span><span style={{color:"#4a7aaa",fontSize:9}}>{fmtT(rem)}</span></div>
            <div style={{height:2,background:"#0a1828",borderRadius:1}}><div style={{height:"100%",width:`${prog*100}%`,background:f.returning?"#3a7a54":"#2255aa",borderRadius:1,transition:"width 1s linear"}}/></div>
          </div>
        );})}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PLANET ACTION PANEL (bâtiments/vaisseaux/flottes)
// ══════════════════════════════════════════════════════
function PlanetPanel({planet,userId,planets,myIdx,onClose,zones,onZonesChange}){
  const[state,setState]=useState(()=>{const s=loadGS(userId);return s?tickGS(s,planet):initState(planet);});
  const[tab,setTab]=useState("buildings");
  const[c1]=gc(planet.type);
  useEffect(()=>{const t=setInterval(()=>setState(p=>{const n=tickGS(p,planet);saveGS(userId,n);return n;}),2000);return()=>clearInterval(t);},[userId]);
  // sync zones from parent
  useEffect(()=>{if(zones)setState(p=>({...p,zones}));},[zones]);
  const updateState=ns=>{setState(ns);saveGS(userId,ns);onZonesChange&&onZonesChange(ns.zones);};
  const doBuild=(b,lv)=>{if(state.queue)return;const cost=bCost(b,lv);if(!canAfford(state.resources,cost))return;updateState({...state,resources:deduct(state.resources,cost),queue:{type:"build",id:b.id,finishAt:Date.now()+bTime(b,lv,state.buildings.usine_robots||0)*1000}});};
  const doShip=(s,q)=>{if(state.queue)return;const tc={metal:s.cost.metal*q,crystal:s.cost.crystal*q,deut:(s.cost.deut||0)*q};if(!canAfford(state.resources,tc))return;updateState({...state,resources:deduct(state.resources,tc),queue:{type:"ship",id:s.id,count:q,finishAt:Date.now()+Math.max(10,Math.round(((s.cost.metal+s.cost.crystal)*q)/(2500*(1+(state.buildings.hangar||0)))*3600))*1000}});};
  const doFleet=(f,sel)=>{const ns={...state.ships};Object.entries(sel).forEach(([k,v])=>{ns[k]=Math.max(0,(ns[k]||0)-v);});updateState({...state,ships:ns,fleets:[...(state.fleets||[]),f]});};
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(2,5,12,.96)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(6px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:980,margin:12,background:"linear-gradient(160deg,#06101e,#08141f)",border:"1px solid #0d2035",borderRadius:20,overflow:"hidden",maxHeight:"94vh",display:"flex",flexDirection:"column",fontFamily:"'Share Tech Mono',monospace",boxShadow:`0 0 80px rgba(0,10,40,.95),0 0 120px ${c1}18`}}>
        <div style={{padding:"12px 18px",borderBottom:"1px solid #0d2035",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%,${gc(planet.type)[1]},${gc(planet.type)[0]})`,boxShadow:`0 0 12px ${c1}55`}}/>
            <div><div style={{fontFamily:"'Cinzel',serif",fontSize:16,color:"#c8e0ff",letterSpacing:1}}>{planet.name}</div><div style={{fontSize:9,color:"#2a4a6a",marginTop:1}}>{planet.type} · ⭐ Votre planète</div></div>
          </div>
          <button onClick={onClose} style={{padding:"5px 12px",background:"transparent",border:"1px solid #0d2035",borderRadius:7,color:"#2a4a6a",fontSize:9,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace"}}>✕</button>
        </div>
        <div style={{padding:"6px 14px",borderBottom:"1px solid #0a1828"}}><ResBar res={state.resources} bld={state.buildings} zones={state.zones}/></div>
        <div style={{display:"flex",gap:1,padding:"6px 14px 0",borderBottom:"1px solid #0a1828"}}>
          {[["buildings","🏗️ Bâtiments"],["ships","🛸 Vaisseaux"],["fleet","🚀 Flottes"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{padding:"6px 14px",fontSize:9,border:"none",cursor:"pointer",borderRadius:"7px 7px 0 0",background:tab===k?"#0d2035":"transparent",color:tab===k?"#77aadd":"#2a4a6a",fontFamily:"'Share Tech Mono',monospace",letterSpacing:1,borderBottom:tab===k?"2px solid #2255aa":"2px solid transparent"}}>{l}</button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:14}}>
          {tab==="buildings"&&<BuildTab state={state} onBuild={doBuild}/>}
          {tab==="ships"&&<ShipsTab state={state} onBuildShip={doShip}/>}
          {tab==="fleet"&&<FleetTab state={state} planets={planets} myIdx={myIdx} onSend={doFleet}/>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// GALAXY MAP
// ══════════════════════════════════════════════════════
function GMap({planets,sel,pidx,onSelect}){
  const ref=useRef(),af=useRef(),t=useRef(0);
  const draw=useCallback(()=>{
    const c=ref.current;if(!c)return;const ctx=c.getContext("2d"),W=c.width,H=c.height,cx=W/2,cy=H/2;
    t.current+=.002;const ti=t.current;ctx.clearRect(0,0,W,H);
    for(let i=0;i<100;i++){ctx.fillStyle=`rgba(200,220,255,${(.3+.5*Math.sin(ti*1.5+i*.7))*.3})`;ctx.beginPath();ctx.arc((i*137.5+20)%W,(i*79.3+15)%H,.6,0,Math.PI*2);ctx.fill();}
    planets.forEach(p=>{ctx.strokeStyle="rgba(40,70,110,0.12)";ctx.lineWidth=.5;ctx.beginPath();ctx.arc(cx,cy,p.orbitRadius,0,Math.PI*2);ctx.stroke();});
    const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,38);sg.addColorStop(0,"rgba(255,248,180,1)");sg.addColorStop(.3,"rgba(255,190,40,.9)");sg.addColorStop(.7,"rgba(255,100,10,.4)");sg.addColorStop(1,"transparent");
    ctx.fillStyle=sg;ctx.beginPath();ctx.arc(cx,cy,38,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fffce8";ctx.beginPath();ctx.arc(cx,cy,11,0,Math.PI*2);ctx.fill();
    planets.forEach((p,i)=>{
      const ang=p.orbitAngle+ti*(.3/(p.orbitRadius/80)),px=cx+Math.cos(ang)*p.orbitRadius,py=cy+Math.sin(ang)*p.orbitRadius,r=3+(p.size/15000)*4,[base,light]=gc(p.type);
      if(i===pidx){ctx.save();ctx.strokeStyle="#ffd700";ctx.lineWidth=1.2;ctx.setLineDash([3,3]);ctx.shadowColor="#ffd700";ctx.shadowBlur=8;ctx.beginPath();ctx.arc(px,py,r+6,0,Math.PI*2);ctx.stroke();ctx.restore();}
      if(i===sel){ctx.save();ctx.strokeStyle="#44aaff";ctx.lineWidth=1.5;ctx.shadowColor="#44aaff";ctx.shadowBlur=10;ctx.beginPath();ctx.arc(px,py,r+4,0,Math.PI*2);ctx.stroke();ctx.restore();}
      const pg=ctx.createRadialGradient(px-r*.3,py-r*.3,0,px,py,r);pg.addColorStop(0,light);pg.addColorStop(1,base);ctx.fillStyle=pg;ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
    });af.current=requestAnimationFrame(draw);
  },[planets,sel,pidx]);
  useEffect(()=>{af.current=requestAnimationFrame(draw);return()=>cancelAnimationFrame(af.current);},[draw]);
  const click=e=>{const c=ref.current,rect=c.getBoundingClientRect(),ti=t.current,mx=(e.clientX-rect.left)*(c.width/rect.width),my=(e.clientY-rect.top)*(c.height/rect.height),cx2=c.width/2,cy2=c.height/2;let best=-1,minD=18;planets.forEach((p,i)=>{const a=p.orbitAngle+ti*(.3/(p.orbitRadius/80)),dd=Math.hypot(mx-cx2-Math.cos(a)*p.orbitRadius,my-cy2-Math.sin(a)*p.orbitRadius);if(dd<minD){minD=dd;best=i;}});if(best>=0)onSelect(best);};
  return <canvas ref={ref} width={480} height={480} onClick={click} style={{borderRadius:12,cursor:"crosshair",width:"100%",display:"block"}}/>;
}

// ══════════════════════════════════════════════════════
// AUTH SCREEN
// ══════════════════════════════════════════════════════
const INP={width:"100%",padding:"10px 14px",background:"#060f1c",border:"1px solid #0d2035",borderRadius:8,color:"#9abcd8",fontSize:12,fontFamily:"'Share Tech Mono',monospace",outline:"none"};
function AScreen({onAuth}){
  const[mode,setMode]=useState("login"),[email,setEmail]=useState(""),[pw,setPw]=useState(""),[name,setName]=useState(""),[err,setErr]=useState(""),[ok,setOk]=useState(""),[load,setLoad]=useState(false);
  const go=async()=>{setErr("");setOk("");setLoad(true);try{if(mode==="register"){if(!name.trim()){setErr("Nom requis.");setLoad(false);return;}if(pw.length<6){setErr("6 caractères minimum.");setLoad(false);return;}const r=await Auth.reg(email,pw,name.trim());if(!r.ok){setErr(r.err);setLoad(false);return;}setOk("Compte créé !");setMode("login");setPw("");setName("");}else{const r=await Auth.login(email,pw);if(!r.ok){setErr(r.err);setLoad(false);return;}Auth.saveSession(r.user);onAuth(r.user);}}catch(e){setErr("Erreur: "+e.message);}setLoad(false);};
  const reset=()=>{if(!window.confirm("Effacer toutes les données ?"))return;Object.keys(localStorage).filter(k=>k.startsWith("gx_")).forEach(k=>localStorage.removeItem(k));setOk("Données effacées.");};
  return(
    <div style={{minHeight:"100vh",background:"#040c18",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Share Tech Mono',monospace",overflow:"hidden",position:"relative"}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>{Array.from({length:80},(_,i)=><div key={i} style={{position:"absolute",left:`${(i*137.5)%100}%`,top:`${(i*79.3)%100}%`,width:1,height:1,borderRadius:"50%",background:"rgba(180,210,255,.6)",animation:`twinkle ${2+i%3}s ease-in-out ${(i*.07).toFixed(2)}s infinite`}}/>)}</div>
      <div style={{width:"100%",maxWidth:370,position:"relative",background:"linear-gradient(160deg,#060f1c,#08141f)",border:"1px solid #0d2035",borderRadius:18,padding:34,boxShadow:"0 0 60px rgba(0,20,60,.8)"}}>
        <div style={{textAlign:"center",marginBottom:26}}><div style={{fontFamily:"'Cinzel',serif",fontSize:28,letterSpacing:4,background:"linear-gradient(90deg,#3388ff,#77ccff,#ffd700)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>GALAXIA</div><div style={{fontSize:9,color:"#1e3050",letterSpacing:3,marginTop:3}}>SYSTÈME DE COMMANDEMENT</div></div>
        <div style={{display:"flex",marginBottom:20,background:"#040c18",borderRadius:8,padding:3}}>{[["login","Connexion"],["register","Inscription"]].map(([m,l])=><button key={m} onClick={()=>{setMode(m);setErr("");setOk("");}} style={{flex:1,padding:"7px 0",fontSize:10,border:"none",cursor:"pointer",borderRadius:6,background:mode===m?"#0d2035":"transparent",color:mode===m?"#6aacdf":"#1e3050",fontFamily:"'Share Tech Mono',monospace",letterSpacing:1}}>{l}</button>)}</div>
        {mode==="register"&&<><div style={{fontSize:9,color:"#1e3050",marginBottom:4,letterSpacing:1}}>NOM DE COMMANDANT</div><input style={{...INP,marginBottom:11}} placeholder="ex: DarkNova" value={name} onChange={e=>setName(e.target.value)}/></>}
        <div style={{fontSize:9,color:"#1e3050",marginBottom:4,letterSpacing:1}}>EMAIL</div><input style={{...INP,marginBottom:11}} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="commandant@galaxia.io"/>
        <div style={{fontSize:9,color:"#1e3050",marginBottom:4,letterSpacing:1}}>MOT DE PASSE</div><input style={{...INP,marginBottom:18}} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&go()}/>
        {err&&<div style={{marginBottom:10,padding:"8px 11px",borderRadius:7,background:"rgba(180,30,30,.15)",border:"1px solid #4a1515",color:"#e08080",fontSize:11}}>{err}</div>}
        {ok&&<div style={{marginBottom:10,padding:"8px 11px",borderRadius:7,background:"rgba(30,120,60,.15)",border:"1px solid #104020",color:"#60c880",fontSize:11}}>{ok}</div>}
        <button onClick={go} disabled={load} style={{width:"100%",padding:"11px 0",borderRadius:9,border:"none",cursor:"pointer",background:load?"#0a1828":"linear-gradient(135deg,#1a4070,#0d2860)",color:load?"#1e3050":"#77aadd",fontSize:11,letterSpacing:2,fontFamily:"'Share Tech Mono',monospace",marginBottom:10}}>{load?"⟳ EN COURS...":mode==="login"?"SE CONNECTER":"REJOINDRE LA GALAXIE"}</button>
        <button onClick={reset} style={{width:"100%",padding:"6px 0",borderRadius:7,border:"1px solid #1a0a0a",background:"transparent",color:"#3a1515",fontSize:9,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",letterSpacing:1}}>⚠ Réinitialiser toutes les données</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════
function Dash({user,onOut}){
  const{gSeed,idx}=slotOf(user.id);
  const[planets]=useState(()=>Array.from({length:50},(_,i)=>mkP(gSeed,i)));
  const[sel,setSel]=useState(null),[tab,setTab]=useState("galaxy");
  const[viewer,setViewer]=useState(null),[panel,setPanel]=useState(false);
  const[myState,setMyState]=useState(null);
  const lp=(()=>{const u=loadUsers();return Object.values(u).map(x=>({...slotOf(x.id),name:x.name,id:x.id})).filter(x=>x.gSeed===gSeed);})();
  const mine=planets[idx];
  useEffect(()=>{const s=loadGS(user.id);const st=s?tickGS(s,mine):initState(mine);setMyState(st);saveGS(user.id,st);},[]);
  const pick=i=>{setSel(i);if(i===idx)setPanel(true);else setViewer(planets[i]);};
  const handleStateChange=ns=>{setMyState(ns);saveGS(user.id,ns);};
  return(
    <div style={{minHeight:"100vh",background:"#040c18",color:"#9abcd8",fontFamily:"'Share Tech Mono',monospace",padding:14,display:"flex",flexDirection:"column",alignItems:"center"}}>
      {viewer&&<Viewer3D planet={viewer} onClose={()=>setViewer(null)} isPlayer={false} owner={lp.find(p=>p.idx===viewer.i)?.name} state={null} onStateChange={null}/>}
      {panel&&myState&&<Viewer3D planet={mine} onClose={()=>setPanel(false)} isPlayer={true} state={myState} onStateChange={handleStateChange}/>}
      <div style={{width:"100%",maxWidth:920,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontFamily:"'Cinzel',serif",fontSize:20,letterSpacing:3,background:"linear-gradient(90deg,#3388ff,#77ccff,#ffd700)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>GALAXIA</div><div style={{fontSize:9,color:"#1e3050",marginTop:1}}>SECTEUR {gSeed.toString(16).toUpperCase()} · SLOT {idx+1}/50</div></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#6a9ab8"}}>{user.name}</div><button onClick={()=>setPanel(true)} style={{fontSize:8,color:"#ffd700",background:"transparent",border:"1px solid #2a2000",borderRadius:5,padding:"2px 7px",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",marginTop:2}}>⭐ {mine.name}</button></div>
          <button onClick={()=>{Auth.clearSession();onOut();}} style={{padding:"6px 12px",background:"transparent",border:"1px solid #0d2035",borderRadius:7,color:"#2a4a6a",fontSize:9,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace"}}>DÉCO</button>
        </div>
      </div>
      <div style={{width:"100%",maxWidth:920,display:"flex",gap:2,marginBottom:10}}>
        {[["galaxy","🌌 Galaxie"],["players","👥 Joueurs"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:"6px 14px",fontSize:9,border:"none",cursor:"pointer",borderRadius:7,background:tab===k?"#0d2035":"transparent",color:tab===k?"#6aacdf":"#1e3050",fontFamily:"'Share Tech Mono',monospace",letterSpacing:1}}>{l}</button>)}
      </div>
      <div style={{width:"100%",maxWidth:920}}>
        {tab==="galaxy"?(
          <div style={{background:"linear-gradient(160deg,#060f1c,#08141f)",borderRadius:14,padding:10,border:"1px solid #0d2035",boxShadow:"0 0 40px rgba(0,12,40,.7)"}}>
            <GMap planets={planets} sel={sel} pidx={idx} onSelect={pick}/>
            <div style={{fontSize:9,color:"#0d1824",textAlign:"center",marginTop:6}}><span style={{color:"#ffd700"}}>🟡 Ta planète</span> → Vue 3D + Gestion · Autres → Vue 3D</div>
          </div>
        ):(
          <div style={{background:"linear-gradient(160deg,#060f1c,#08141f)",borderRadius:14,padding:14,border:"1px solid #0d2035"}}>
            <div style={{fontSize:9,color:"#1e3050",letterSpacing:2,marginBottom:10,textTransform:"uppercase"}}>Joueurs · {lp.length}/50</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:6}}>
              {planets.map((p,i)=>{const occ=lp.find(x=>x.idx===i);const[c]=gc(p.type);return(<div key={i} onClick={()=>pick(i)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,cursor:"pointer",background:i===idx?"rgba(255,215,0,.04)":"rgba(6,15,28,.8)",border:`1px solid ${i===idx?"#ffd70020":occ?"#0d2840":"#0a1828"}`}}><div style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0,boxShadow:`0 0 4px ${c}88`}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:9,color:occ?"#6a9ab8":"#1a2e40",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i===idx?"⭐ ":""}{p.name}</div>{occ&&<div style={{fontSize:8,color:"#3a7a54"}}>{occ.name}</div>}</div></div>);})}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════
export default function App(){
  const[user,setUser]=useState(null),[ready,setReady]=useState(false);
  useEffect(()=>{
    const s=document.createElement("style");
    s.textContent=`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Share+Tech+Mono&display=swap');@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes twinkle{0%,100%{opacity:.2}50%{opacity:.8}}*{box-sizing:border-box;margin:0;padding:0}body{background:#040c18}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#0d2035;border-radius:2px}`;
    document.head.appendChild(s);const sv=Auth.loadSession();if(sv?.id)setUser(sv);setReady(true);return()=>document.head.removeChild(s);
  },[]);
  if(!ready)return <div style={{minHeight:"100vh",background:"#040c18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Share Tech Mono',monospace",color:"#1e3050",fontSize:10,letterSpacing:3}}>INITIALISATION...</div>;
  if(!user)return <AScreen onAuth={u=>setUser(u)}/>;
  return <Dash user={user} onOut={()=>setUser(null)}/>;
}
