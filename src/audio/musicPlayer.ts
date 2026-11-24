import { musicCatalog, type MusicScene } from './musicCatalog'

declare const __MUSIC_FILES__: Partial<Record<MusicScene, string>>
const availableFiles = typeof __MUSIC_FILES__ === 'undefined' ? {} : __MUSIC_FILES__
const fadeSeconds = .45

export function musicTrack(scene: MusicScene | null, files = availableFiles) {
  const file = scene && files[scene]
  if (!scene || !file) return null
  return { url: `${import.meta.env.BASE_URL}assets/audio/music/${file}`, loop: musicCatalog[scene].loop }
}

export const hasMusicTracks = Object.keys(availableFiles).length > 0

type Track = { url: string; media: HTMLAudioElement; source: MediaElementAudioSourceNode; gain: GainNode }

export class MusicPlayer {
  private active?: Track
  private fading?: Track
  private releaseTimer?: ReturnType<typeof setTimeout>
  private failed = new Set<string>()
  private context: AudioContext
  private output: GainNode
  private files: Partial<Record<MusicScene, string>>

  constructor(context: AudioContext, output: GainNode, files = availableFiles) {
    this.context = context
    this.output = output
    this.files = files
  }

  select(scene: MusicScene | null) {
    const track = musicTrack(scene, this.files)
    if (track?.url === this.active?.url) return
    this.finishFade()
    const time = this.context.currentTime
    if (this.active) {
      this.fading = this.active
      this.active = undefined
      this.fade(this.fading, 0, time)
      this.releaseTimer = setTimeout(() => this.finishFade(), fadeSeconds * 1000 + 30)
    }
    if (!track || this.failed.has(track.url)) return

    const media = new Audio()
    media.loop = track.loop
    media.preload = 'auto'
    const source = this.context.createMediaElementSource(media)
    const gain = this.context.createGain()
    gain.gain.value = 0
    source.connect(gain).connect(this.output)
    const next = { ...track, media, source, gain }
    this.active = next
    const fail = (unavailable: boolean) => {
      if (this.active !== next) return
      if (unavailable) this.failed.add(next.url)
      this.active = undefined
      this.disposeTrack(next)
    }
    media.onerror = () => fail(true)
    media.src = track.url
    void media.play().then(() => {
      if (this.active === next) this.fade(next, 1, this.context.currentTime)
    }).catch((error: unknown) => {
      fail(!(error instanceof DOMException) || error.name !== 'NotAllowedError')
    })
  }

  stop() {
    this.finishFade()
    if (this.active) this.disposeTrack(this.active)
    this.active = undefined
  }

  emphasizePhase() {
    if (!this.active) return
    const level = this.active.gain.gain
    const time = this.context.currentTime
    level.cancelAndHoldAtTime(time)
    level.linearRampToValueAtTime(.56, time + .12)
    level.linearRampToValueAtTime(1, time + .85)
  }

  private fade(track: Track, target: number, time: number) {
    const level = track.gain.gain
    level.cancelAndHoldAtTime(time)
    level.linearRampToValueAtTime(target, time + fadeSeconds)
  }

  private finishFade() {
    clearTimeout(this.releaseTimer)
    if (this.fading) this.disposeTrack(this.fading)
    this.fading = undefined
  }

  private disposeTrack(track: Track) {
    track.media.onerror = null
    track.media.pause()
    track.media.removeAttribute('src')
    track.media.load()
    track.source.disconnect()
    track.gain.disconnect()
  }
}
