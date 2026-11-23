import type { CombatUpdate } from '../adapters/gameEngineAdapter'
import { CombatSoundCursor } from './events'
import { MusicPlayer, musicTrack } from './musicPlayer'
import type { MusicScene } from './musicCatalog'
import { channelVolume, soundChannels, type SoundChannel, type SoundPreferences } from './preferences'
import { cuePriority, makeNoise, playSynthetic, type SoundCue } from './synth'

type Voice = { channel: SoundChannel; priority: number; stop: () => void }
type Graph = {
  context: AudioContext
  master: GainNode
  channels: Record<SoundChannel, GainNode>
  noise: AudioBuffer
  music: MusicPlayer
}

const maxVoices = 7
const maxCuesPerSnapshot = 5

export class GameAudio {
  private graph?: Graph
  private resumeTask?: Promise<boolean>
  private scene: MusicScene | null = 'menu'
  private visible = true
  private cursor = new CombatSoundCursor()
  private voices = new Set<Voice>()
  private preferences: SoundPreferences

  constructor(preferences: SoundPreferences) {
    this.preferences = preferences
  }

  /** Call from a trusted user interaction, never from a render or combat update. */
  async unlock(): Promise<boolean> {
    if (!this.preferences.enabled || !this.visible || typeof AudioContext !== 'function') return false
    if (this.resumeTask) return this.resumeTask
    if (this.graph?.context.state !== 'running' && typeof navigator !== 'undefined'
      && navigator.userActivation && !navigator.userActivation.isActive) return false
    try {
      const graph = this.graph ?? this.createGraph()
      if (graph.context.state === 'running') {
        this.syncMusic()
        return true
      }
      const task = graph.context.resume().then(() => {
        this.syncMusic()
        return graph.context.state === 'running'
      }, () => false)
      this.resumeTask = task
      try { return await task } finally { if (this.resumeTask === task) this.resumeTask = undefined }
    } catch {
      return false
    }
  }

  setPreferences(preferences: SoundPreferences) {
    this.preferences = preferences
    this.applyMix()
    for (const voice of this.voices) {
      if (!this.plays(voice.channel)) this.stopVoice(voice)
    }
    if (!this.plays('music')) this.graph?.music.stop()
    else this.syncMusic()
  }

  setVisible(visible: boolean) {
    this.visible = visible
    if (!visible) {
      this.graph?.music.stop()
      for (const voice of this.voices) this.stopVoice(voice)
    } else this.syncMusic()
  }

  setScene(scene: MusicScene | null) {
    if (this.scene === scene) return
    this.scene = scene
    this.syncMusic()
  }

  beginEncounter(scene: MusicScene) {
    this.cursor = new CombatSoundCursor()
    this.setScene(scene)
  }

  combatUpdate(update: CombatUpdate) {
    const outcome = update.status === 'finished' ? update.report.outcome : undefined
    const wantsTrack = outcome && outcome !== 'timeout' && this.plays('music') && musicTrack(outcome) !== null
    const cues = this.cursor.read(update, !wantsTrack)
    if (outcome) this.setScene(outcome === 'timeout' ? null : outcome)
    const ranked = cues.map((cue, order) => ({ cue, order }))
      .sort((a, b) => cuePriority(b.cue) - cuePriority(a.cue) || a.order - b.order)
      .slice(0, maxCuesPerSnapshot)
    ranked.sort((a, b) => a.order - b.order).forEach(({ cue }) => this.cue(cue, 'combat'))
  }

  cue(cue: SoundCue, channel: 'combat' | 'interface') {
    const graph = this.graph
    if (!graph || graph.context.state !== 'running' || !this.plays(channel)) return
    const priority = cuePriority(cue)
    if (this.voices.size >= maxVoices) {
      let lowest: Voice | undefined
      for (const voice of this.voices) if (!lowest || voice.priority < lowest.priority) lowest = voice
      if (!lowest || lowest.priority >= priority) return
      this.stopVoice(lowest)
    }
    const voice: Voice = { channel, priority, stop: () => {} }
    try {
      voice.stop = playSynthetic(graph.context, graph.channels[channel], graph.noise, cue, () => this.voices.delete(voice))
      this.voices.add(voice)
    } catch {
      // An unavailable audio device cannot interrupt the game.
    }
  }

  dispose() {
    const graph = this.graph
    this.graph = undefined
    this.resumeTask = undefined
    for (const voice of this.voices) this.stopVoice(voice)
    if (!graph) return
    graph.music.stop()
    void graph.context.close().catch(() => {})
  }

  private plays(channel: SoundChannel) {
    return this.visible && this.preferences.master > 0 && channelVolume(this.preferences, channel) > 0
  }

  private syncMusic() {
    const graph = this.graph
    if (graph?.context.state === 'running' && this.plays('music')) {
      try { graph.music.select(this.scene) } catch { /* Media setup can be unavailable. */ }
    }
  }

  private stopVoice(voice: Voice) {
    this.voices.delete(voice)
    voice.stop()
  }

  private createGraph() {
    const context = new AudioContext()
    const master = context.createGain()
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -17
    compressor.knee.value = 10
    compressor.ratio.value = 5
    master.connect(compressor).connect(context.destination)
    const channels = { music: context.createGain(), combat: context.createGain(), interface: context.createGain() }
    for (const channel of soundChannels) channels[channel].connect(master)
    const graph = { context, master, channels, noise: makeNoise(context), music: new MusicPlayer(context, channels.music) }
    this.graph = graph
    this.applyMix(true)
    return graph
  }

  private applyMix(immediate = false) {
    const graph = this.graph
    if (!graph) return
    const set = (node: GainNode, value: number) => {
      const time = graph.context.currentTime
      node.gain.cancelScheduledValues(time)
      if (immediate) node.gain.setValueAtTime(value, time)
      else node.gain.setTargetAtTime(value, time, .025)
    }
    set(graph.master, this.preferences.enabled ? this.preferences.master : 0)
    for (const channel of soundChannels) set(graph.channels[channel], channelVolume(this.preferences, channel))
  }
}
