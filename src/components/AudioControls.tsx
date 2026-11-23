import { hasMusicTracks } from '../audio/musicPlayer'
import { soundChannels, type SoundPreferences } from '../audio/preferences'
import './AudioControls.css'

const labels = { music: 'Música', combat: 'Combate', interface: 'Interfaz' }

export function AudioControls({ settings, onChange, onPreview }: {
  settings: SoundPreferences
  onChange: (next: SoundPreferences) => void
  onPreview: () => void
}) {
  return <details className="audio-settings" data-audio-controls>
    <summary>Audio</summary>
    <div className="audio-settings-panel">
      <label className="audio-mute">
        <input type="checkbox" checked={settings.enabled}
          onChange={(event) => onChange({ ...settings, enabled: event.currentTarget.checked })} />
        Audio activado
      </label>
      <label className="audio-slider">
        <span>Volumen general <output>{Math.round(settings.master * 100)}%</output></span>
        <input aria-label="Volumen general" type="range" min="0" max="100" value={Math.round(settings.master * 100)}
          onChange={(event) => onChange({ ...settings, master: Number(event.currentTarget.value) / 100 })} />
      </label>
      {soundChannels.map((channel) => <div className="audio-channel" key={channel}>
        <label className="audio-slider">
          <span>{labels[channel]} <output>{Math.round(settings.volume[channel] * 100)}%</output></span>
          <input aria-label={`Volumen de ${labels[channel].toLowerCase()}`} type="range" min="0" max="100"
            value={Math.round(settings.volume[channel] * 100)}
            onChange={(event) => onChange({ ...settings, volume: { ...settings.volume, [channel]: Number(event.currentTarget.value) / 100 } })} />
        </label>
        <label className="audio-mute">
          <input type="checkbox" checked={settings.muted[channel]}
            onChange={(event) => onChange({ ...settings, muted: { ...settings.muted, [channel]: event.currentTarget.checked } })} />
          Silenciar {labels[channel].toLowerCase()}
        </label>
      </div>)}
      {!hasMusicTracks && <small>Pistas musicales locales pendientes.</small>}
      <button type="button" className="secondary-button" onClick={onPreview}
        disabled={!settings.enabled || settings.master === 0 || settings.muted.interface || settings.volume.interface === 0}>
        PROBAR SONIDO
      </button>
    </div>
  </details>
}
