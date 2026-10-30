/* SkillShow Guide Tour: the pink circular-grid spotlight tour.
   Load AFTER skillshow-patch.js and BEFORE skillshow-tourbutton.js.
   It takes over window.SkillTour, so the first-visit launch in skillshow-patch.js and the
   "Take App Tour" button both open this tour. The old gold tour stays hidden. */
(function () {
  "use strict";
  if (window.__SS_PINK_TOUR__) return;
  window.__SS_PINK_TOUR__ = true;

  var PINK = "#F45AA5", NAVY = "#0F203A", CARD = "#152642", MUTED = "#AAB7CA";
  var TOUR_ID = "ss-v3-claude-tour";
  var tourIndex = 0, tourActive = false;

  function addCSS() {
    if (document.getElementById("ss-pink-tour-style")) return;
    var s = document.createElement("style");
    s.id = "ss-pink-tour-style";
    s.textContent = `
      /* Disable the retired yellow legacy tour only; keep the Claude-style SkillTour. */
      #ss-tour{display:none!important;visibility:hidden!important;pointer-events:none!important}
      /* CLAUDE-STYLE TOUR */
      #${TOUR_ID}{position:fixed;inset:0;z-index:2147483645;display:none;pointer-events:none;font-family:Inter,system-ui,sans-serif}
      #${TOUR_ID}.active{display:block}
      #${TOUR_ID} .shade{position:absolute;inset:0;background:rgba(3,8,20,.76);pointer-events:auto}
      #${TOUR_ID} .spot{position:fixed;left:50%;top:50%;width:72px;height:72px;border-radius:50%;transform:translate(-50%,-50%);border:2px solid ${PINK};box-shadow:0 0 0 7px #f45aa52b,0 0 0 16px #f45aa51b,0 0 34px #f45aa5a8;pointer-events:none;transition:left .32s ease,top .32s ease,width .32s ease,height .32s ease}
      #${TOUR_ID} .spot:before{content:"";position:absolute;inset:-12px;border-radius:50%;background-image:radial-gradient(#ff9acb 1px,transparent 1.5px);background-size:9px 9px;opacity:.78;mask-image:radial-gradient(circle,transparent 43%,#000 46%,#000 54%,transparent 58%);-webkit-mask-image:radial-gradient(circle,transparent 43%,#000 46%,#000 54%,transparent 58%);animation:ssV3GridSpin 12s linear infinite}
      #${TOUR_ID} .spot:after{content:"";position:absolute;inset:-5px;border:1px dashed #ff8fc7;border-radius:50%;animation:ssV3Pulse 1.8s ease-out infinite}
      #${TOUR_ID} .tap{position:absolute;left:50%;top:50%;width:22px;height:22px;border-radius:50%;background:${PINK};border:3px solid white;box-shadow:0 0 0 7px #f45aa54a;transform:translate(-50%,-50%);animation:ssV3Tap 1.3s ease-in-out infinite}
      #${TOUR_ID} .card{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(390px,calc(100vw - 32px));box-sizing:border-box;padding:20px;background:linear-gradient(145deg,#192d4b,#101f38);border:1px solid #f45aa56e;border-radius:20px;color:#fff;box-shadow:0 18px 55px #0009;pointer-events:auto}
      #${TOUR_ID} .topline{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
      #${TOUR_ID} .brand{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ff9acb;font-weight:800}
      #${TOUR_ID} .count{font-size:11px;color:${MUTED};background:#ffffff10;padding:6px 9px;border-radius:20px}
      #${TOUR_ID} h3{font-size:20px;line-height:1.25;margin:0 0 8px;font-weight:750}
      #${TOUR_ID} p{font-size:14px;line-height:1.55;color:#c5d0df;margin:0 0 18px}
      #${TOUR_ID} .progress{height:3px;background:#ffffff18;border-radius:5px;overflow:hidden;margin:0 0 16px}
      #${TOUR_ID} .progress span{display:block;height:100%;background:${PINK};transition:width .25s}
      #${TOUR_ID} .actions{display:flex;align-items:center;gap:9px}
      #${TOUR_ID} button{font:600 13px system-ui;cursor:pointer;border:0}
      #${TOUR_ID} .next{flex:1;background:${PINK};color:#17101a;border-radius:11px;padding:12px}
      #${TOUR_ID} .back{background:#ffffff12;color:#fff;border:1px solid #ffffff22;border-radius:11px;padding:11px 13px}
      #${TOUR_ID} .skip{margin-left:auto;background:transparent;color:#b9c4d4;padding:10px 2px}
      #${TOUR_ID} .welcome-mark{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:#f45aa51c;color:#ff9acb;font-size:22px;margin-bottom:13px;border:1px solid #f45aa566}
      @keyframes ssV3Pulse{0%{transform:scale(.92);opacity:.85}100%{transform:scale(1.22);opacity:0}}
      @keyframes ssV3Tap{0%,100%{transform:translate(-50%,-50%) scale(.8)}50%{transform:translate(-50%,-50%) scale(1.18)}}
    `;
    document.head.appendChild(s);
  }

  var steps = [
    {title:"Welcome to SkillShow",body:"Your creative space starts here. Let's take a quick look around.",target:null},
    {title:"Your Home Feed",body:"See updates, creative work, opportunities and conversations from the community.",target:["nav span[onclick*=\"'home'\"]"]},
    {title:"Discover Jobs",body:"Explore jobs, internships, freelance projects and other opportunities.",target:["nav span[onclick*=\"'jobs'\"]"]},
    {title:"Create Something",body:"Share your work, publish an update or post an opportunity for the community.",target:["nav span[onclick*=\"openNew\"]"]},
    {title:"Communities",body:"Find communities that match your interests, or create one and build your own circle.",target:["nav span[onclick*=\"'comm'\"]"]},
    {title:"Messages",body:"Connect directly with creators, clients and other members.",target:["nav span[onclick*=\"'msgs'\"]"]},
    {title:"Search and Discover",body:"Find people, creative skills and opportunities across SkillShow.",target:[".hd .hi span:nth-child(1)","[data-action='search']","[aria-label*='Search']"]},
    {title:"Notifications",body:"Stay updated when people interact with your work or contact you.",target:[".hd .hi span:nth-child(2)"]},
    {title:"Your Profile",body:"Showcase your skills, portfolio, experience and the work you want people to see.",target:[".hd .hi span:nth-child(3)","[data-tab='profile']","[aria-label*='Profile']"]},
    {title:"You're ready!",body:"That's your SkillShow tour. Explore, connect, create and discover what's possible.",target:null}
  ];
  function findTarget(step) {
    if(!step||!step.target)return null;
    for(var i=0;i<step.target.length;i++){
      var el=document.querySelector(step.target[i]);
      if(el&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0)return el;
    }
    return null;
  }
  function ensureTourUI() {
    var root=document.getElementById(TOUR_ID);if(root)return root;
    root=document.createElement("div");root.id=TOUR_ID;
    root.innerHTML='<div class="shade"></div><div class="spot"><i class="tap"></i></div><section class="card"><div class="topline"><span class="brand">SKILLSHOW GUIDE</span><span class="count"></span></div><div class="welcome-mark">✦</div><h3></h3><p></p><div class="progress"><span></span></div><div class="actions"><button class="back" type="button">Back</button><button class="next" type="button">Next</button><button class="skip" type="button">Skip</button></div></section>';
    document.body.appendChild(root);
    root.querySelector(".next").onclick=function(){tourIndex++;renderTourStep();};
    root.querySelector(".back").onclick=function(){tourIndex=Math.max(0,tourIndex-1);renderTourStep();};
    var sk=root.querySelector(".skip"),armed=false,armT;
    sk.onclick=function(){
      if(!armed){armed=true;sk.textContent="Tap again to exit";armT=setTimeout(function(){armed=false;sk.textContent="Skip";},2500);}
      else{clearTimeout(armT);armed=false;sk.textContent="Skip";endTour();}
    };
    return root;
  }
  function renderTourStep() {
    var root=ensureTourUI(),step=steps[tourIndex];if(!step){endTour();return;}
    var card=root.querySelector(".card"),target=findTarget(step),spot=root.querySelector(".spot");
    root.querySelector(".count").textContent=(tourIndex+1)+" / "+steps.length;
    root.querySelector("h3").textContent=step.title;
    root.querySelector("p").textContent=step.body;
    root.querySelector(".progress span").style.width=((tourIndex+1)/steps.length*100)+"%";
    root.querySelector(".back").style.visibility=tourIndex===0?"hidden":"visible";
    root.querySelector(".next").textContent=tourIndex===steps.length-1?"Finish":"Next";
    if(target){
      target.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
      var r=target.getBoundingClientRect(),size=Math.max(62,Math.min(112,Math.max(r.width,r.height)+26));
      spot.style.display="block";spot.style.left=(r.left+r.width/2)+"px";spot.style.top=(r.top+r.height/2)+"px";
      spot.style.width=size+"px";spot.style.height=size+"px";
    } else {spot.style.display="none";}
    if(tourIndex===steps.length-1)root.querySelector(".next").onclick=endTour;
    else root.querySelector(".next").onclick=function(){tourIndex++;renderTourStep();};
    root.classList.add("active");tourActive=true;
  }
  function endTour() {
    tourActive=false;var root=document.getElementById(TOUR_ID);if(root)root.classList.remove("active");
  }

  window.SkillTour = {
    start: function () { addCSS(); tourIndex = 0; renderTourStep(); },
    end: endTour
  };
  addCSS();
})();
