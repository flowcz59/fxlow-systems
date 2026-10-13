const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const Native=window.AudioContext,connect=AudioNode.prototype.connect;
  window.__audioContexts=[];window.__outputs=[];window.__liveSources=new Set();window.__startedSources=0;
  AudioNode.prototype.connect=function(...args){if(args[0] instanceof AudioDestinationNode)window.__outputs.push(this);return connect.apply(this,args)};
  const track=source=>{window.__liveSources.add(source);window.__startedSources++;source.addEventListener('ended',()=>window.__liveSources.delete(source));return source;};
  window.AudioContext=class extends Native{constructor(...args){super(...args);window.__audioContexts.push(this)}createOscillator(){return track(super.createOscillator())}createBufferSource(){return track(super.createBufferSource())}};
 });
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4317/');await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.evaluate(()=>window.__audioContexts.length),0,'No audio before a user gesture');
 await page.locator('.sound-playground').scrollIntoViewIfNeeded();await page.locator('#sound-toggle').click();
 assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'true');
 const measure=async(ms=350)=>page.evaluate(async ms=>{const context=window.__audioContexts[0],source=window.__outputs.at(-1),analyser=context.createAnalyser();analyser.fftSize=2048;source.connect(analyser);let peak=0;const data=new Float32Array(analyser.fftSize);for(let i=0;i<ms/25;i++){await new Promise(r=>setTimeout(r,25));analyser.getFloatTimeDomainData(data);for(const x of data)peak=Math.max(peak,Math.abs(x));}source.disconnect(analyser);analyser.disconnect();return peak;},ms);
 const peak=await measure(800);assert.ok(peak>.01&&peak<.75,`Live signal: ${peak}`);
 await page.locator('#sound-tone').focus();await page.keyboard.press('End');assert.equal(await page.locator('#tone-value').textContent(),'Incisif');
 await page.locator('#sound-tempo').focus();await page.keyboard.press('End');assert.equal(await page.locator('#tempo-value').textContent(),'150 BPM');
 await page.locator('#sound-volume').focus();await page.keyboard.press('Home');await page.waitForTimeout(350);assert.ok(await measure()<.00001,'Volume at zero is silent');
 await page.locator('#sound-reset').click();assert.equal(await page.locator('#sound-volume').inputValue(),'0','Reset never raises user volume');assert.equal(await page.locator('#sound-tone').inputValue(),'58');assert.equal(await page.locator('#sound-tempo').inputValue(),'120');
 await page.locator('#sound-volume').fill('60');await page.locator('#sound-toggle').click();
 while(await page.locator('.sound-steps button[aria-pressed=true]').count())await page.locator('.sound-steps button[aria-pressed=true]').first().click();
 await page.waitForTimeout(2800);const emptyPeak=await measure();assert.ok(emptyPeak<.0001,`All steps off: music and kit decay to silence (${emptyPeak})`);
 const sources=await page.evaluate(()=>window.__startedSources);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__startedSources),sources,'No percussion is scheduled for an empty pattern');
 await page.locator('[data-step="0"]').focus();await page.keyboard.press('Space');assert.equal(await page.locator('[data-step="0"]').getAttribute('aria-pressed'),'true');assert.ok(await measure(800)>.01,'Keyboard re-enables audio');
 await page.locator('#sound-toggle').click();await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.__liveSources.size),0,'Stopped voices are released');
 for(let i=0;i<4;i++){await page.locator('#sound-toggle').click();await page.waitForTimeout(50);await page.locator('#sound-toggle').click();}
 await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__liveSources.size),0,'Repeated start/stop leaves no voices');assert.equal(await page.evaluate(()=>window.__audioContexts.length),1,'The context is reused');
 await page.locator('#sound-reset').click();await page.locator('#sound-toggle').click();await page.locator('#hero-title').scrollIntoViewIfNeeded();await page.waitForTimeout(250);assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false','Offscreen stops audio');
 await page.locator('#focus-toggle').click();assert.equal(await page.locator('.sound-playground').isVisible(),false,'Focus hides the instrument');await page.evaluate(()=>document.querySelector('#sound-toggle').click());assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');assert.match(await page.locator('#sound-status').textContent(),/Focus/);
 await page.locator('#focus-toggle').click();await page.locator('.sound-playground').scrollIntoViewIfNeeded();await page.locator('#sound-toggle').click();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(150);assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false','Returning to a tab never auto-resumes');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#sound-toggle').click();await page.waitForTimeout(200);assert.equal(await page.locator('.sound-steps .is-current').count(),0);await page.locator('#sound-toggle').click();await page.locator('#sound-reset').click();
 const dir=process.env.AUDIO_QA_DIR||'../tmp/audio';fs.mkdirSync(dir,{recursive:true});
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.locator('.sound-playground').scrollIntoViewIfNeeded();
  const layout=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...document.querySelectorAll('.sound-playground input,.sound-playground label,.sound-playground output')].filter(e=>{const r=e.getBoundingClientRect();return r.x<0||r.right>innerWidth}).length}));assert.equal(layout.overflow,false,JSON.stringify(layout));assert.equal(layout.clipped,0,JSON.stringify(layout));
  await page.locator('.sound-playground').screenshot({path:`${dir}/sound-${width}.png`});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({livePeak:peak,lifecycle:'passed',controls:'passed',silentPattern:'passed',responsive:'320 / 390 / 768 / 1440',errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
