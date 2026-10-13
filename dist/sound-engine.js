/* Original acid instrument: a monophonic voice, accents, slides and a dry kit. */
export const DEFAULT_PATTERN = [true, false, true, true, false, true, true, false];
export const DEFAULT_TEMPO = 120;
export const DEFAULT_TONE = 0.58;
export const DEFAULT_VOLUME = 0.6;
const NOTES = [45, 57, 48, 52, 43, 55, 48, 52];
const SLIDES = [3, 6, 7];
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const clamp = value => Math.max(0, Math.min(1, value));

export function createInstrument(context, options = {}) {
  let tempo = options.tempo ?? DEFAULT_TEMPO;
  let tone = clamp(options.tone ?? DEFAULT_TONE), volume = clamp(options.volume ?? DEFAULT_VOLUME);
  let stopped = false, disposed = false, lastHz = frequency(NOTES[0]), lastIndex = -1;
  const voices = new Set(), nodes = new Set();
  const keep = node => { nodes.add(node); return node; };
  const gain = value => { const node = keep(context.createGain()); node.gain.value = value; return node; };
  const filter = (type, hz, q = 0.7) => {
    const node = keep(context.createBiquadFilter());
    node.type = type; node.frequency.value = hz; node.Q.value = q; return node;
  };
  const hold = (param, when) => {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(when);
    else param.cancelScheduledValues(when);
  };
  const smooth = (param, value, when, duration = 0.025) => {
    hold(param, when); param.setTargetAtTime(value, when, duration);
  };
  function saturation(drive, level = 1) {
    const node = keep(context.createWaveShaper()), curve = new Float32Array(4096);
    for (let i = 0; i < curve.length; i++) {
      const x = i * 2 / (curve.length - 1) - 1;
      curve[i] = Math.tanh(x * drive) / Math.tanh(drive) * level;
    }
    node.curve = curve; node.oversample = '2x'; return node;
  }
  const mix = gain(1), music = gain(1), duck = gain(1), highpass = filter('highpass', 26);
  const compressor = keep(context.createDynamicsCompressor());
  compressor.threshold.value = -14; compressor.knee.value = 10;
  compressor.ratio.value = 3; compressor.attack.value = 0.006; compressor.release.value = 0.12;
  const ceiling = saturation(1.15, 0.84), output = gain(0);
  music.connect(duck).connect(mix);
  mix.connect(highpass).connect(compressor).connect(ceiling).connect(output);

  // Filtered ping-pong echo; the bass stays centered and the repeats stay quiet.
  const echoSend = gain(0.19), echoHighpass = filter('highpass', 440);
  const left = keep(context.createDelay(2)), right = keep(context.createDelay(2));
  const echoLeft = filter('lowpass', 2400), echoRight = filter('lowpass', 2000);
  const feedbackLeft = gain(0.27), feedbackRight = gain(0.27);
  const panLeft = keep(context.createStereoPanner()), panRight = keep(context.createStereoPanner());
  panLeft.pan.value = -0.65; panRight.pan.value = 0.65;
  left.delayTime.value = right.delayTime.value = 60 / tempo * 0.75;
  echoSend.connect(echoHighpass).connect(left);
  left.connect(echoLeft).connect(panLeft).connect(music);
  echoLeft.connect(feedbackLeft).connect(right);
  right.connect(echoRight).connect(panRight).connect(music);
  echoRight.connect(feedbackRight).connect(left);

  function oscillator(type, hz) {
    const node = keep(context.createOscillator()); node.type = type; node.frequency.value = hz; return node;
  }
  // One continuous voice makes the glides genuinely legato, without stacking notes.
  const saw = oscillator('sawtooth', lastHz), sub = oscillator('sine', lastHz / 2);
  const sawLevel = gain(0.65), subLevel = gain(0.12), gate = gain(0);
  const resonant = filter('lowpass', 400, 7.5), slope = filter('lowpass', 900, 0.6);
  const drive = saturation(2.8), polish = filter('lowpass', 5200, 0.5);
  saw.connect(sawLevel).connect(resonant); sub.connect(subLevel).connect(resonant);
  resonant.connect(slope).connect(drive).connect(polish).connect(gate);
  gate.connect(music); gate.connect(echoSend);

  // Shared, deterministic noise for the hats and clap. No external samples.
  const noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.6), context.sampleRate);
  const samples = noise.getChannelData(0); let seed = 90210;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    samples[i] = seed / 2147483648 - 1;
  }
  function envelope(when, peak, attack, decay) {
    const node = gain(0);
    node.gain.setValueAtTime(0, when); node.gain.linearRampToValueAtTime(peak, when + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    node.gain.linearRampToValueAtTime(0, when + decay + 0.025); return node;
  }
  function run(source, chain, when, duration) {
    voices.add(source);
    source.onended = () => {
      voices.delete(source); source.disconnect(); nodes.delete(source);
      for (const node of chain) { node.disconnect(); nodes.delete(node); }
    };
    source.start(when); source.stop(when + duration);
  }
  function acid(index, when, pattern) {
    const step = 60 / tempo / 2 * (index % 2 ? 0.92 : 1.08);
    const accent = index === 0 || index === 3 || index === 6;
    const slideIn = SLIDES.includes(index) && lastIndex === (index + 7) % 8 && pattern[(index + 7) % 8];
    const slideOut = SLIDES.includes((index + 1) % 8) && pattern[(index + 1) % 8];
    const hz = frequency(NOTES[index]), level = accent ? 0.3 : 0.22;
    for (const [osc, ratio] of [[saw, 1], [sub, 0.5]]) {
      hold(osc.frequency, when);
      osc.frequency.setValueAtTime(slideIn ? lastHz * ratio : hz * ratio, when);
      if (slideIn) osc.frequency.exponentialRampToValueAtTime(hz * ratio, when + Math.min(0.065, step * 0.25));
    }
    hold(gate.gain, when);
    if (!slideIn) gate.gain.setValueAtTime(0.0001, when);
    gate.gain.linearRampToValueAtTime(level, when + (slideIn ? 0.012 : 0.006));
    gate.gain.exponentialRampToValueAtTime(slideOut ? level * 0.62 : 0.0001, when + step * (slideOut ? 0.98 : 0.76));
    if (!slideOut) gate.gain.linearRampToValueAtTime(0, when + step * 0.9);
    const base = 130 + tone * 360, peak = 480 + 3400 * tone ** 1.4 + (accent ? 650 : 0);
    for (const [node, ratio] of [[resonant, 1], [slope, 1.25]]) {
      hold(node.frequency, when);
      if (!slideIn) node.frequency.setValueAtTime(base * ratio, when);
      node.frequency.exponentialRampToValueAtTime(peak * ratio, when + 0.012);
      node.frequency.exponentialRampToValueAtTime(base * ratio, when + step * 0.88);
    }
    lastHz = hz; lastIndex = index;
  }
  function kick(when) {
    const source = oscillator('sine', 160), amp = envelope(when, 0.84, 0.0025, 0.32);
    source.frequency.setValueAtTime(160, when);
    source.frequency.exponentialRampToValueAtTime(55, when + 0.045);
    source.frequency.exponentialRampToValueAtTime(51, when + 0.28);
    source.connect(amp).connect(mix); run(source, [amp], when, 0.36);
    duck.gain.setValueAtTime(1, when);
    duck.gain.linearRampToValueAtTime(0.45, when + 0.006);
    duck.gain.exponentialRampToValueAtTime(1, when + 0.14);
  }
  function percussion(when, clap = false, ghost = false) {
    const source = keep(context.createBufferSource()); source.buffer = noise;
    const hp = filter('highpass', clap ? 1050 : 6500, 0.5);
    const lp = filter('lowpass', clap ? 3400 : 10500, 0.5);
    const amp = envelope(when, clap ? 0.14 : ghost ? 0.025 : 0.095, 0.002, clap ? 0.13 : ghost ? 0.035 : 0.08);
    const pan = keep(context.createStereoPanner()); pan.pan.value = clap ? -0.08 : 0.22;
    if (clap) {
      amp.gain.setValueAtTime(0.04, when + 0.009);
      amp.gain.linearRampToValueAtTime(0.12, when + 0.013);
      amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.13);
    }
    source.connect(hp).connect(lp).connect(amp).connect(pan).connect(mix);
    run(source, [hp, lp, amp, pan], when, 0.18);
  }
  return {
    output,
    start(when = context.currentTime) {
      for (const source of [saw, sub]) {
        voices.add(source); source.onended = () => voices.delete(source); source.start(when);
      }
      output.gain.setValueAtTime(0, when);
      output.gain.linearRampToValueAtTime(volume * 0.82, when + 0.03);
    },
    step(index, when, pattern) {
      if (stopped) return;
      if (!pattern[index]) {
        // Closing a step also releases an already scheduled slide into that step.
        smooth(gate.gain, 0, when, 0.01); gate.gain.setValueAtTime(0, when + 0.07);
        lastIndex = -1;
      }
      if (!pattern.some(Boolean)) return;
      if (index % 2 === 0) kick(when);
      percussion(when, false, index % 2 === 0);
      if (index === 2 || index === 6) percussion(when + 0.005, true);
      if (pattern[index]) acid(index, when, pattern);
    },
    setTempo(value, when = context.currentTime) {
      tempo = Math.max(80, Math.min(150, value));
      smooth(left.delayTime, 60 / tempo * 0.75, when, 0.1);
      smooth(right.delayTime, 60 / tempo * 0.75, when, 0.1);
    },
    setTone(value) { tone = clamp(value); },
    setVolume(value, when = context.currentTime) {
      volume = clamp(value); if (!stopped) smooth(output.gain, volume * 0.82, when, 0.015);
    },
    stop(when = context.currentTime) {
      if (stopped) return; stopped = true;
      smooth(output.gain, 0, when, 0.01); output.gain.setValueAtTime(0, when + 0.075);
      for (const source of voices) { try { source.stop(when + 0.08); } catch (_) { /* Already ended. */ } }
    },
    dispose() {
      if (disposed) return; disposed = true;
      for (const source of voices) { try { source.stop(); } catch (_) { /* Already ended. */ } }
      for (const node of nodes) node.disconnect();
      nodes.clear(); voices.clear();
    }
  };
}
