const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  const page=await browser.newPage();
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4317/');
  const cases=[
    {name:'default',tempo:120,tone:.58,volume:.6,sampleRate:48000},
    {name:'slow-dark',tempo:80,tone:0,volume:1,sampleRate:44100,all:true},
    {name:'fast-bright',tempo:150,tone:1,volume:1,sampleRate:48000,all:true},
    {name:'silence',tempo:120,tone:.58,volume:1,sampleRate:48000,empty:true},
    {name:'muted',tempo:120,tone:1,volume:0,sampleRate:48000,all:true},
    {name:'changes',tempo:120,tone:.58,volume:.6,sampleRate:48000,changes:true}
  ];
  const reports=[];
  for(const spec of cases){
    const result=await page.evaluate(async spec=>{
      const {createInstrument,DEFAULT_PATTERN}=await import('/sound-engine.js');
      const ctx=new OfflineAudioContext(2,spec.sampleRate*10,spec.sampleRate);
      const synth=createInstrument(ctx,spec);synth.output.connect(ctx.destination);synth.start(0);
      let t=.08,tempo=spec.tempo,pattern=spec.empty?Array(8).fill(false):spec.all?Array(8).fill(true):DEFAULT_PATTERN;
      for(let step=0;t<8;step++){
        if(spec.changes&&step===8){tempo=150;synth.setTempo(tempo,t);synth.setTone(1);}
        if(spec.changes&&step===16){tempo=80;synth.setTempo(tempo,t);synth.setTone(.05);synth.setVolume(.8,t);}
        if(spec.changes&&step===24){pattern=Array(8).fill(false);}
        synth.step(step%8,t,pattern);t+=60/tempo/2*(step%2?.92:1.08);
      }
      synth.stop(8.5);
      const rendered=await ctx.startRendering();
      let peak=0,sum=0,dc=0,difference=0,tail=0,nonfinite=0;
      const channels=[rendered.getChannelData(0),rendered.getChannelData(1)];
      for(const data of channels){for(let i=0;i<data.length;i++){
        const s=data[i];if(!Number.isFinite(s))nonfinite++;
        peak=Math.max(peak,Math.abs(s));sum+=s*s;dc+=s;
        if(i)difference=Math.max(difference,Math.abs(s-data[i-1]));
        if(i>spec.sampleRate*9)tail=Math.max(tail,Math.abs(s));
      }}
      const metrics={name:spec.name,peak,rms:Math.sqrt(sum/(rendered.length*2)),dc:dc/(rendered.length*2),maxDelta:difference,tail,nonfinite};
      let wav;
      if(spec.name==='default'){
        const n=rendered.length,buffer=new ArrayBuffer(44+n*4),view=new DataView(buffer);
        const str=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
        str(0,'RIFF');view.setUint32(4,36+n*4,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,spec.sampleRate,true);view.setUint32(28,spec.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,n*4,true);
        for(let i=0;i<n;i++)for(let c=0;c<2;c++){const sample=Math.max(-1,Math.min(1,channels[c][i]));view.setInt16(44+(i*2+c)*2,sample<0?sample*32768:sample*32767,true);}
        let binary='';const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));wav=btoa(binary);
      }
      synth.dispose();return {metrics,wav};
    },spec);
    const m=result.metrics;reports.push(m);
    assert.equal(m.nonfinite,0,`${spec.name}: finite audio`);assert.ok(m.peak<.75,`${spec.name}: output headroom ${m.peak}`);assert.ok(Math.abs(m.dc)<.002,`${spec.name}: DC offset`);assert.ok(m.tail<.00001,`${spec.name}: clean stop ${m.tail}`);
    if(spec.empty||spec.volume===0)assert.ok(m.peak<.00001,`${spec.name}: should be silent`);else assert.ok(m.rms>.005,`${spec.name}: audible mix`);
    if(result.wav){const dest=process.env.AUDIO_PREVIEW_PATH||path.resolve('../output/audio/fxlow-acid-preview.wav');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,Buffer.from(result.wav,'base64'));}
  }
  fs.writeFileSync(process.env.AUDIO_REPORT_PATH||path.resolve('../tmp/audio/offline-report.json'),JSON.stringify(reports,null,2));
  console.log(JSON.stringify(reports));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
