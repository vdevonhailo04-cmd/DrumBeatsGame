(() => {
  const keys = ['a','s','d','f','g'];
  const colors = ['#28a7ff','#26e58b','#ffbd2e','#ff4568','#a855f7'];
  const names = ['Snare','Hi-hat','Kick','Tom','Crash'];
  const field = document.getElementById('playfield');
  const lanes = [...document.querySelectorAll('.lane')];
  const pads = [...document.querySelectorAll('.pad')];
  const scoreEl = document.getElementById('score');
  const comboEl = document.getElementById('combo');
  const bestEl = document.getElementById('best');
  const message = document.getElementById('message');
  const bpmInput = document.getElementById('bpm');
  const bpmValue = document.getElementById('bpmValue');
  let notes = [], running = false, score = 0, combo = 0, best = 0;
  let lastTime = 0, spawnTimer = 0, lastSpawnBeat = -1, raf = 0, audioCtx = null;
  const hitY = () => field.clientHeight - 96;
  const speeds = {easy:220, medium:290, hard:360};
  const density = {easy:0.72, medium:0.88, hard:1};
  let beatMs = 600;
  function audio(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
  }
  function sound(i){
    audio();
    const t = audioCtx.currentTime;
    const gain = audioCtx.createGain(); gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.0001,t);
    gain.gain.exponentialRampToValueAtTime(0.6,t+0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001,t+(i===1?0.08:0.35));
    if(i===1 || i===4){
      const buffer = audioCtx.createBuffer(1,audioCtx.sampleRate*0.16,audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let n=0;n<data.length;n++) data[n]=(Math.random()*2-1)*(1-n/data.length);
      const src=audioCtx.createBufferSource();src.buffer=buffer;
      const filter=audioCtx.createBiquadFilter();filter.type='highpass';filter.frequency.value=i===1?6500:1800;
      src.connect(filter);filter.connect(gain);src.start(t);
    } else {
      const osc=audioCtx.createOscillator();
      osc.type=i===0?'triangle':'sine';
      osc.frequency.setValueAtTime(i===2?145:i===3?190:220,t);
      osc.frequency.exponentialRampToValueAtTime(i===2?42:i===3?75:100,t+0.18);
      osc.connect(gain);osc.start(t);osc.stop(t+0.22);
      if(i===0){const nbuf=audioCtx.createBuffer(1,audioCtx.sampleRate*.12,audioCtx.sampleRate),d=nbuf.getChannelData(0);for(let n=0;n<d.length;n++)d[n]=Math.random()*2-1;const ns=audioCtx.createBufferSource();ns.buffer=nbuf;const ng=audioCtx.createGain();ng.gain.value=.18;ns.connect(ng);ng.connect(audioCtx.destination);ns.start(t);}
    }
  }
  function updateStats(){scoreEl.textContent=score;comboEl.textContent=combo+'×';bestEl.textContent=best;}
  function flash(i){const p=pads[i];p.classList.add('flash');setTimeout(()=>p.classList.remove('flash'),100);}
  function playPad(i){sound(i);flash(i);}
  function spawnNote(){
    const diff=document.getElementById('difficulty').value;
    let lane=Math.floor(Math.random()*5);
    // Kick and hi-hat are more common, like a basic drum pattern.
    if(Math.random()<.55) lane=Math.random()<.55?2:1;
    const el=document.createElement('div');el.className='note';el.style.setProperty('--c',colors[lane]);
    lanes[lane].appendChild(el);
    notes.push({lane,y:-25,el,hit:false});
  }
  function start(){
    audio();cancelAnimationFrame(raf);notes.forEach(n=>n.el.remove());notes=[];
    score=0;combo=0;spawnTimer=0;lastSpawnBeat=-1;lastTime=performance.now();running=true;
    beatMs=60000/Number(bpmInput.value);
    message.textContent='LET’S PLAY!';updateStats();raf=requestAnimationFrame(loop);
  }
  function endGame(){
    running=false;cancelAnimationFrame(raf);message.textContent='Tapos na! Score: '+score+' — Pindutin ulit ang START.';
    notes.forEach(n=>n.el.remove());notes=[];
  }
  function loop(now){
    if(!running)return;
    const dt=Math.min(40,now-lastTime);lastTime=now;
    beatMs=60000/Number(bpmInput.value);
    const diff=document.getElementById('difficulty').value;
    spawnTimer+=dt;
    const interval=beatMs*density[diff];
    if(spawnTimer>=interval){spawnTimer-=interval;spawnNote();}
    const target=hitY();
    for(let i=notes.length-1;i>=0;i--){
      const n=notes[i];n.y+=speeds[diff]*dt/1000;
      n.el.style.top=n.y+'px';
      if(n.y>target+34){
        n.el.remove();notes.splice(i,1);combo=0;updateStats();
      }
    }
    raf=requestAnimationFrame(loop);
  }
  function hit(key){
    const i=keys.indexOf(key.toLowerCase());if(i<0)return;
    playPad(i);
    if(!running)return;
    let candidate=null, distance=Infinity;
    for(const n of notes){if(n.lane===i){const d=Math.abs((n.y+11)-hitY());if(d<distance){distance=d;candidate=n;}}}
    if(candidate && distance<85){
      candidate.el.remove();notes=notes.filter(n=>n!==candidate);
      const points=distance<25?100:distance<50?70:40;
      score+=points;combo++;best=Math.max(best,score);
      message.textContent=distance<25?'PERFECT! +'+points:distance<50?'GREAT! +'+points:'GOOD! +'+points;
      updateStats();
    } else {combo=0;message.textContent='KEEP THE RHYTHM!';updateStats();}
  }
  document.addEventListener('keydown',e=>{
    if(e.repeat || ['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
    if(keys.includes(e.key.toLowerCase())){e.preventDefault();hit(e.key);}
    if(e.code==='Space' && !running){e.preventDefault();start();}
  });
  pads.forEach((p,i)=>p.addEventListener('click',()=>hit(keys[i])));
  document.getElementById('startBtn').addEventListener('click',start);
  document.getElementById('resetBtn').addEventListener('click',()=>{
    running=false;cancelAnimationFrame(raf);notes.forEach(n=>n.el.remove());notes=[];
    score=0;combo=0;spawnTimer=0;updateStats();message.textContent='Na-reset na. Pindutin ang START GAME!';
  });
  bpmInput.addEventListener('input',()=>{bpmValue.textContent=bpmInput.value;});
  updateStats();
})();
