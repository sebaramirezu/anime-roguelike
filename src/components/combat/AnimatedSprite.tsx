import { useEffect, useState, type CSSProperties } from 'react'
import type { CombatSpeed } from '../../adapters/gameEngineAdapter'
import { frameCount, frameSource, resolveClip, type Playback, type SpriteClip, type SpriteVisual } from './arenaVisuals'

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

function SpriteFrames({ clip, failed, onFailure, reduced, atEnd, mark, elapsedMs, speed }: {
  clip?: SpriteClip; failed: ReadonlySet<string>; onFailure: (src: string) => void
  reduced: boolean; atEnd: boolean; mark?: string
  elapsedMs?: number; speed: CombatSpeed
}) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (elapsedMs !== undefined || !clip || clip.kind === 'png' || reduced || frameCount(clip) < 2) return
    const count = frameCount(clip)
    let frame = 0
    const timer = window.setInterval(() => {
      frame = (frame + 1) % count
      setIndex(frame)
      if (!clip.loop && frame === count - 1) window.clearInterval(timer)
    }, 1000 / Math.max(1, clip.fps) / speed)
    return () => window.clearInterval(timer)
  }, [clip, reduced, elapsedMs, speed])

  const count = clip ? frameCount(clip) : 0
  let frame = index
  if (reduced) frame = atEnd ? count - 1 : 0
  else if (elapsedMs !== undefined && clip && clip.kind !== 'png' && count > 0) {
    const elapsedFrames = Math.floor(elapsedMs * clip.fps / 1000)
    frame = clip.loop ? elapsedFrames % count : Math.min(count - 1, elapsedFrames)
  }
  const src = frameSource(clip, frame, failed)
  if (!clip || !src || count < 1) {
    return <span className="sprite-placeholder"><i /><b /><em />{mark && <small>{mark}</small>}</span>
  }
  const size = clip.kind === 'png' ? undefined : { '--frame-ratio': clip.width / clip.height } as CSSProperties
  return <span className={`sprite-frames${size ? ' sprite-sized-frame' : ''}`} style={size}>
    <img key={src} className={clip.kind === 'sheet' ? 'sprite-sheet' : undefined} src={src} alt="" draggable={false}
      onError={() => onFailure(src)} style={clip.kind === 'sheet'
        ? { width: `${count * 100}%`, transform: `translateX(-${frame / count * 100}%)` } : undefined} />
  </span>
}

const poseDuration = { idle: 0, attack: 420, hurt: 360, special: 620, death: 680 }

function playbackDuration(visual: SpriteVisual, pose: Playback['pose']) {
  const motionClip = visual.clips?.[pose]
  return motionClip && motionClip.kind !== 'png' && !motionClip.loop
    ? Math.max(poseDuration[pose], frameCount(motionClip) / Math.max(1, motionClip.fps) * 1000)
    : poseDuration[pose]
}

export function AnimatedSprite({ visual, playback, facing = 'right', elapsedMs, speed = 1 }: {
  visual: SpriteVisual
  playback: Playback
  facing?: 'left' | 'right'
  elapsedMs?: number
  speed?: CombatSpeed
}) {
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set())
  const [finished, setFinished] = useState<string>()
  const duration = playbackDuration(visual, playback.pose)
  const active = playback.pose === 'idle' || playback.pose === 'death'
    || (elapsedMs === undefined ? finished !== playback.id : elapsedMs < duration)
  const pose = active ? playback.pose : 'idle'
  const clip = resolveClip(visual, pose, failed)
  useEffect(() => {
    if (elapsedMs !== undefined || playback.pose === 'idle' || playback.pose === 'death') return
    const timer = window.setTimeout(() => setFinished(playback.id), duration / speed)
    return () => window.clearTimeout(timer)
  }, [playback.id, playback.pose, duration, elapsedMs, speed])

  return <div className="animated-sprite" data-shape={visual.shape} data-facing={facing}
    style={{ '--sprite-light': visual.color, '--pose-duration': `${duration}ms` } as CSSProperties} aria-hidden="true">
    <div key={`${pose}-${playback.id}`} className="sprite-motion" data-pose={pose}
      data-pixel-art={clip?.kind === 'png' ? clip.pixelArt : undefined}>
      <SpriteFrames clip={clip} failed={failed} reduced={reduced} atEnd={pose === 'death'} mark={visual.mark} elapsedMs={elapsedMs} speed={speed}
        onFailure={(src) => setFailed((previous) => new Set([...previous, src]))} />
    </div>
  </div>
}
