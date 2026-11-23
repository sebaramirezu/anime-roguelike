import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CombatEvent, CombatUpdate } from '../adapters/gameEngineAdapter'
import { CombatSoundCursor, sceneForCombat, soundForEvent } from './events'
import { GameAudio } from './gameAudio'
import { MusicPlayer, musicTrack } from './musicPlayer'
import { audioStorageKey, channelVolume, defaultSoundPreferences, loadSoundPreferences, saveSoundPreferences } from './preferences'
import * as synth from './synth'

const event = (id: string, kind: CombatEvent['kind'], target: CombatEvent['target'], extra?: Partial<CombatEvent>): CombatEvent =>
  ({ id, kind, target, text: '', ...extra })

const running = (recentEvents: CombatEvent[], health = 75): CombatUpdate =>
  ({ status: 'running', recentEvents, player: { health, maxHealth: 100 } })

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('combat cues', () => {
  it('distinguishes effective damage dealt from damage taken', () => {
    expect(soundForEvent(event('1', 'damage', 'enemy', { source: 'player' }))).toBe('hit')
    expect(soundForEvent(event('2', 'damage', 'player', { source: 'enemy' }))).toBe('hurt')
  })

  it('uses separate sounds for shield absorption and damage to health', () => {
    expect(soundForEvent(event('1', 'shield', 'player'))).toBe('protect')
    expect(soundForEvent(event('2', 'shield', 'enemy'))).toBe('shieldHit')
  })

  it('recognizes true critical flags in both directions', () => {
    expect(soundForEvent(event('1', 'damage', 'enemy', { critical: true }))).toBe('criticalHit')
    expect(soundForEvent(event('2', 'damage', 'player', { critical: true }))).toBe('criticalTaken')
    expect(soundForEvent(event('3', 'attack', 'enemy', { critical: true }))).toBe('physical')
  })

  it('selects the exact technique and resolves enemy attack styles', () => {
    expect(soundForEvent(event('1', 'attack', 'enemy', { techniqueId: 'power-pole' }))).toBe('staff')
    expect(soundForEvent(event('2', 'attack', 'enemy', { techniqueId: 'kamehameha' }))).toBe('beam')
    expect(soundForEvent(event('3', 'attack', 'enemy', { techniqueId: 'rasenshuriken' }))).toBe('rasenshuriken')
    expect(soundForEvent(event('4', 'transform', 'player', { techniqueId: 'nine-tails-chakra' }))).toBe('kyubi')
    expect(soundForEvent(event('5', 'attack', 'player', { visual: { theme: 'ki' } }))).toBe('energy')
    expect(soundForEvent(event('6', 'attack', 'player', { visual: { theme: 'blade' } }))).toBe('weapon')
    expect(soundForEvent(event('7', 'attack', 'player', { visual: { theme: 'beam', special: true } }))).toBe('special')
  })

  it('handles rolling event snapshots, repeated terminal states and new encounters', () => {
    const first = event('1', 'attack', 'enemy')
    const second = event('2', 'heal', 'player')
    const cursor = new CombatSoundCursor()
    expect(cursor.read(running([first]))).toEqual(['physical'])
    expect(cursor.read(running([{ ...first }, second]))).toEqual(['heal'])
    expect(cursor.read(running([second]))).toEqual([])
    const win: CombatUpdate = { status: 'finished', report: { outcome: 'victory' }, recentEvents: [second, event('3', 'death', 'enemy')] }
    expect(cursor.read(win)).toEqual(['enemyDown', 'victory'])
    expect(cursor.read({ ...win })).toEqual([])
    expect(new CombatSoundCursor().read(running([first]))).toEqual(['physical'])
  })

  it('alerts only when entering low health and suppresses duplicate music stingers', () => {
    const cursor = new CombatSoundCursor()
    expect(cursor.read(running([], 19))).toEqual(['danger'])
    expect(cursor.read(running([], 15))).toEqual([])
    expect(cursor.read(running([], 29))).toEqual([])
    cursor.read(running([], 30))
    expect(cursor.read(running([], 20))).toEqual(['danger'])
    expect(cursor.read({ status: 'finished', report: { outcome: 'defeat' } }, false)).toEqual([])
  })
})

function installAudioStubs() {
  const gains: { gain: ReturnType<typeof param> }[] = []
  const contexts: Context[] = []
  const media: Media[] = []

  function param() {
    const parameter = {
      value: 1,
      cancelScheduledValues: vi.fn(),
      cancelAndHoldAtTime: vi.fn(),
      setValueAtTime: vi.fn((value: number) => { parameter.value = value }),
      setTargetAtTime: vi.fn((value: number) => { parameter.value = value }),
      linearRampToValueAtTime: vi.fn(),
    }
    return parameter
  }
  function node() {
    return { connect: vi.fn((next: unknown) => next), disconnect: vi.fn() }
  }

  class Context {
    state = 'suspended'
    currentTime = 1
    sampleRate = 48000
    destination = node()
    resume = vi.fn(async () => { this.state = 'running' })
    close = vi.fn(async () => { this.state = 'closed' })
    constructor() { contexts.push(this) }
    createGain() {
      const gain = { ...node(), gain: param() }
      gains.push(gain)
      return gain
    }
    createDynamicsCompressor() { return { ...node(), threshold: param(), knee: param(), ratio: param() } }
    createMediaElementSource() { return node() }
  }
  class Media {
    src = ''
    preload = ''
    loop = false
    onerror: null | (() => void) = null
    play = vi.fn(async () => {})
    pause = vi.fn()
    load = vi.fn()
    removeAttribute = vi.fn(() => { this.src = '' })
    constructor() { media.push(this) }
  }
  vi.stubGlobal('AudioContext', Context)
  vi.stubGlobal('Audio', Media)
  return { contexts, gains, media }
}

describe('music and mixing', () => {
  it('selects the intended scenes and only resolves supplied local files', () => {
    expect(sceneForCombat('normal')).toBe('normal')
    expect(sceneForCombat('minor')).toBe('minor')
    expect(sceneForCombat('major')).toBe('major')
    expect(sceneForCombat('major', 'victory')).toBe('victory')
    expect(sceneForCombat('major', 'defeat')).toBe('defeat')
    expect(sceneForCombat('major', 'timeout')).toBeNull()
    expect(musicTrack('normal', {})).toBeNull()
    expect(musicTrack('minor', { minor: 'miniboss.ogg' })).toMatchObject({ loop: true, url: expect.stringContaining('assets/audio/music/miniboss.ogg') })
    expect(musicTrack('victory', { victory: 'victoria.wav' })?.loop).toBe(false)
  })

  it('crossfades two tracks and releases the retired track', async () => {
    vi.useFakeTimers()
    const { gains, media } = installAudioStubs()
    const context = new AudioContext()
    const player = new MusicPlayer(context, context.createGain(), { menu: 'opening.ogg', major: 'jefe-mayor.ogg' })
    player.select('menu')
    await Promise.resolve()
    expect(media).toHaveLength(1)
    expect(gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, 1.45)
    player.select('menu')
    expect(media).toHaveLength(1)
    player.select('major')
    expect(media).toHaveLength(2)
    expect(gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.45)
    expect(media[0].pause).not.toHaveBeenCalled()
    vi.advanceTimersByTime(480)
    expect(media[0].pause).toHaveBeenCalledOnce()
    player.select('victory')
    expect(media).toHaveLength(2)
    vi.advanceTimersByTime(480)
    expect(media[1].pause).toHaveBeenCalledOnce()
  })

  it('never creates an audio device before activation or requests missing music', async () => {
    const { contexts, media } = installAudioStubs()
    vi.spyOn(synth, 'makeNoise').mockReturnValue({} as AudioBuffer)
    const played = vi.spyOn(synth, 'playSynthetic').mockReturnValue(() => {})
    vi.stubGlobal('navigator', { userActivation: { isActive: false } })
    const audio = new GameAudio(defaultSoundPreferences)
    audio.setScene('normal')
    audio.cue('hit', 'combat')
    expect(await audio.unlock()).toBe(false)
    expect(contexts).toHaveLength(0)
    expect(played).not.toHaveBeenCalled()
    vi.stubGlobal('navigator', { userActivation: { isActive: true } })
    expect(await audio.unlock()).toBe(true)
    await audio.unlock()
    expect(contexts).toHaveLength(1)
    expect(media).toHaveLength(0)
    audio.dispose()
  })

  it('uses separate gain nodes and disables muted and hidden sounds', async () => {
    const { gains } = installAudioStubs()
    vi.spyOn(synth, 'makeNoise').mockReturnValue({} as AudioBuffer)
    const stop = vi.fn()
    const played = vi.spyOn(synth, 'playSynthetic').mockReturnValue(stop)
    const audio = new GameAudio(defaultSoundPreferences)
    await audio.unlock()
    expect(gains.map(({ gain }) => gain.value)).toEqual([0.8, 0.25, 0.45, 0.30])
    audio.cue('hit', 'combat')
    audio.cue('purchase', 'interface')
    expect(played.mock.calls.map((call) => [call[1], call[3]])).toEqual([[gains[2], 'hit'], [gains[3], 'purchase']])
    audio.setPreferences({ ...defaultSoundPreferences, master: 0.5, muted: { ...defaultSoundPreferences.muted, combat: true } })
    expect(gains[0].gain.value).toBe(0.5)
    expect(gains[2].gain.value).toBe(0)
    audio.cue('hurt', 'combat')
    audio.setVisible(false)
    audio.cue('levelUp', 'interface')
    expect(played).toHaveBeenCalledTimes(2)
    expect(stop).toHaveBeenCalledTimes(2)
    audio.setVisible(true)
    audio.setPreferences({ ...defaultSoundPreferences, enabled: false })
    audio.cue('purchase', 'interface')
    expect(played).toHaveBeenCalledTimes(2)
    expect(channelVolume({ ...defaultSoundPreferences, enabled: false }, 'music')).toBe(0)
    audio.dispose()
  })

  it('drops low-priority voices under load and reserves room for a finishing cue', async () => {
    installAudioStubs()
    vi.spyOn(synth, 'makeNoise').mockReturnValue({} as AudioBuffer)
    const stop = vi.fn()
    const played = vi.spyOn(synth, 'playSynthetic').mockReturnValue(stop)
    const audio = new GameAudio(defaultSoundPreferences)
    await audio.unlock()
    for (let index = 0; index < 20; index++) audio.cue('physical', 'combat')
    expect(played).toHaveBeenCalledTimes(7)
    audio.cue('victory', 'combat')
    expect(stop).toHaveBeenCalledOnce()
    expect(played.mock.lastCall?.[3]).toBe('victory')
    audio.dispose()
  })
})

describe('audio preferences', () => {
  it('persists independent controls and clamps corrupted values', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) })
    expect(loadSoundPreferences()).toEqual(defaultSoundPreferences)
    const preferences = { ...defaultSoundPreferences, master: .6, muted: { ...defaultSoundPreferences.muted, music: true } }
    saveSoundPreferences(preferences)
    expect(loadSoundPreferences()).toEqual(preferences)
    values.set(audioStorageKey, JSON.stringify({ master: 9, volume: { combat: -1, interface: 'bad' }, enabled: false }))
    expect(loadSoundPreferences()).toMatchObject({ enabled: false, master: 1, volume: { music: .25, combat: 0, interface: .3 } })
  })
})
