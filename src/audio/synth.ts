type Layer = {
  kind: OscillatorType | 'noise'
  from: number
  to: number
  duration: number
  gain: number
  delay: number
}

const tone = (from: number, to: number, duration: number, gain: number, delay = 0, kind: OscillatorType = 'triangle'): Layer =>
  ({ kind, from, to, duration, gain, delay })
const noise = (from: number, to: number, duration: number, gain: number, delay = 0): Layer =>
  ({ kind: 'noise', from, to, duration, gain, delay })
const notes = (frequencies: readonly number[], duration: number, gap: number, gain = 0.24): Layer[] =>
  frequencies.map((frequency, index) => tone(frequency, frequency, duration, gain, index * gap))

export const soundBank = {
  physical: [noise(1450, 320, .09, .36), tone(165, 80, .095, .30)],
  energy: [tone(300, 760, .075, .22, 0, 'sine'), tone(780, 290, .15, .26, .05, 'sawtooth')],
  weapon: [noise(3400, 940, .1, .3), tone(1120, 420, .09, .18, .025)],
  special: [tone(150, 975, .19, .22), noise(1800, 440, .2, .37, .13)],
  staff: [noise(2700, 670, .08, .4), tone(232, 98, .12, .31, .035)],
  ki: [tone(760, 1480, .065, .23, 0, 'sine'), tone(1500, 350, .09, .22, .05)],
  kaioken: [tone(110, 430, .22, .34, 0, 'sawtooth'), noise(340, 1850, .28, .24)],
  beam: [tone(220, 1140, .18, .26, 0, 'sine'), tone(145, 63, .28, .39, .14), noise(2500, 550, .31, .29, .13)],
  genkidama: [tone(72, 350, .32, .26, 0, 'sine'), tone(230, 540, .23, .24, .06), noise(1300, 140, .4, .4, .24)],
  instinct: [...notes([659, 988, 1320], .24, .07, .20), noise(2600, 790, .18, .18, .13)],
  kunai: [noise(4900, 1900, .085, .37), tone(1840, 690, .15, .19, .025)],
  clones: [noise(530, 1050, .10, .23), noise(790, 1510, .13, .22, .055), tone(310, 490, .09, .14, .075)],
  kyubi: [tone(88, 260, .32, .36, 0, 'sawtooth'), noise(410, 1500, .28, .18, .07)],
  rasengan: [tone(300, 580, .13, .24), tone(620, 390, .17, .22, .075, 'sine'), noise(1800, 430, .19, .36, .14)],
  rasenshuriken: [noise(650, 4400, .23, .32), tone(980, 300, .21, .26, .145), noise(2300, 380, .22, .25, .23)],
  baryon: [tone(57, 86, .33, .41), tone(186, 77, .35, .35, .08, 'sawtooth'), noise(1040, 240, .34, .25, .17)],
  hit: [noise(1780, 540, .11, .32), tone(295, 140, .10, .25)],
  hurt: [tone(121, 48, .16, .48, 0, 'sine'), noise(520, 170, .11, .23)],
  criticalHit: [noise(3400, 600, .18, .43), tone(465, 170, .17, .31), tone(920, 385, .12, .18, .035)],
  criticalTaken: [tone(130, 44, .24, .51, 0, 'sine'), noise(730, 150, .17, .31)],
  shieldHit: [tone(1040, 740, .16, .25, 0, 'sine'), tone(550, 880, .17, .22, .045)],
  protect: [tone(590, 1140, .17, .26, 0, 'sine'), noise(2600, 720, .16, .21)],
  heal: notes([440, 554, 659, 880], .18, .07),
  transform: [tone(200, 840, .27, .28, 0, 'sine'), noise(970, 2100, .24, .22, .10)],
  danger: [tone(262, 262, .105, .21, 0, 'sine'), tone(221, 221, .145, .22, .15, 'sine')],
  enemyDown: [tone(275, 78, .27, .32), noise(950, 175, .23, .22, .03)],
  playerDown: [tone(165, 49, .32, .35, 0, 'sine'), noise(540, 145, .25, .22, .06)],
  fusion: [...notes([392, 523, 784, 1047], .23, .08), noise(1100, 2700, .19, .12, .08)],
  purchase: notes([880, 1319], .115, .08),
  select: notes([554, 740], .085, .055),
  levelUp: notes([523, 659, 784, 1047, 1319], .21, .08),
  victory: [...notes([392, 523, 659, 784, 1047], .25, .115), tone(262, 262, .43, .18, .24, 'sine')],
  defeat: [...notes([392, 330, 277, 196], .31, .16, .21), tone(131, 131, .57, .12, .28, 'sine')],
} satisfies Record<string, Layer[]>

export type SoundCue = keyof typeof soundBank

const priorities: Partial<Record<SoundCue, number>> = {
  victory: 6, defeat: 6, playerDown: 5, enemyDown: 4, danger: 4, levelUp: 5, fusion: 5,
  beam: 4, genkidama: 4, instinct: 4, kyubi: 4, baryon: 4, rasengan: 4, rasenshuriken: 4,
  kaioken: 4, transform: 4, special: 4, criticalHit: 4, criticalTaken: 4,
  hurt: 3, hit: 3, protect: 3, shieldHit: 3, heal: 3,
}

export function cuePriority(cue: SoundCue) { return priorities[cue] ?? 1 }

export function makeNoise(context: AudioContext) {
  const count = Math.ceil(context.sampleRate * .65)
  const buffer = context.createBuffer(1, count, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let index = 0; index < count; index++) samples[index] = Math.random() * 2 - 1
  return buffer
}

export function playSynthetic(context: AudioContext, output: AudioNode, buffer: AudioBuffer, cue: SoundCue, finished: () => void) {
  const layers = soundBank[cue]
  const variation = 0.97 + Math.random() * 0.06
  const origin = context.currentTime
  const sources: AudioScheduledSourceNode[] = []
  let pending = layers.length
  for (const layer of layers) {
    const start = origin + layer.delay
    const end = start + layer.duration
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(.0001, start)
    envelope.gain.exponentialRampToValueAtTime(layer.gain, start + .014)
    envelope.gain.exponentialRampToValueAtTime(.0001, end)
    envelope.connect(output)

    let source: AudioScheduledSourceNode
    let filter: BiquadFilterNode | undefined
    if (layer.kind === 'noise') {
      const sample = context.createBufferSource()
      sample.buffer = buffer
      filter = context.createBiquadFilter()
      filter.type = 'bandpass'
      filter.Q.value = 1.1
      filter.frequency.setValueAtTime(layer.from * variation, start)
      filter.frequency.exponentialRampToValueAtTime(layer.to * variation, end)
      sample.connect(filter).connect(envelope)
      source = sample
    } else {
      const oscillator = context.createOscillator()
      oscillator.type = layer.kind
      oscillator.frequency.setValueAtTime(layer.from * variation, start)
      oscillator.frequency.exponentialRampToValueAtTime(layer.to * variation, end)
      oscillator.connect(envelope)
      source = oscillator
    }
    source.onended = () => {
      source.disconnect()
      filter?.disconnect()
      envelope.disconnect()
      if (--pending === 0) finished()
    }
    source.start(start)
    source.stop(end)
    sources.push(source)
  }
  return () => sources.forEach((source) => {
    try { source.stop() } catch { /* Already stopped. */ }
  })
}
