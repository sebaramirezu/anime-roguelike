export const soundChannels = ['music', 'combat', 'interface'] as const
export type SoundChannel = typeof soundChannels[number]
export type SoundPreferences = {
  enabled: boolean
  master: number
  volume: Record<SoundChannel, number>
  muted: Record<SoundChannel, boolean>
}

export const audioStorageKey = 'anime-roguelike:audio:v1'
export const defaultSoundPreferences: SoundPreferences = {
  enabled: true, master: 0.8,
  volume: { music: 0.25, combat: 0.45, interface: 0.30 },
  muted: { music: false, combat: false, interface: false },
}

const bounded = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback

export function loadSoundPreferences(): SoundPreferences {
  const defaults = defaultSoundPreferences
  try {
    const data = JSON.parse(localStorage.getItem(audioStorageKey) ?? 'null') as Partial<SoundPreferences> | null
    const next = { ...defaults, volume: { ...defaults.volume }, muted: { ...defaults.muted } }
    if (typeof data?.enabled === 'boolean') next.enabled = data.enabled
    next.master = bounded(data?.master, defaults.master)
    for (const channel of soundChannels) {
      next.volume[channel] = bounded(data?.volume?.[channel], defaults.volume[channel])
      const muted = data?.muted?.[channel]
      if (typeof muted === 'boolean') next.muted[channel] = muted
    }
    return next
  } catch {
    return defaults
  }
}

export function saveSoundPreferences(preferences: SoundPreferences) {
  try {
    localStorage.setItem(audioStorageKey, JSON.stringify(preferences))
  } catch {
    // The live mix is still available with storage disabled.
  }
}

export function channelVolume(preferences: SoundPreferences, channel: SoundChannel) {
  return preferences.enabled && !preferences.muted[channel] ? preferences.volume[channel] : 0
}
