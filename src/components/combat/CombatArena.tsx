import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { combatStepMs, type CombatEvent, type CombatReport, type CombatSpeed } from '../../adapters/gameEngineAdapter'
import type { HeroForm } from '../../data/heroForms'
import type { CharacterId } from '../../data/items'
import type { Stage } from '../../data/levels'
import { formatCombatAmount } from '../../shared/formatCombatAmount'
import { AnimatedSprite } from './AnimatedSprite'
import { sceneryFor } from './arenaScenery'
import { arenaImpacts, arenaPlayback, enemyVisual, eventStyle, heroVisual, outcomeLabels } from './arenaVisuals'
import { bossPhaseVisuals } from './bossPhaseVisuals'
import './CombatArena.css'

function ArenaLandscape({ url, ambient }: { url?: string; ambient: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="arena-landscape" aria-hidden="true">
    {url && !failed
      ? <img className="arena-background" src={url} alt="" draggable={false} onError={() => setFailed(true)} />
      : <><i /><b /><em /><div className="arena-ground" /></>}
    <div className="arena-ambient" data-ambient={ambient}><span /><span /><span /></div>
  </div>
}

function adjustAnimations(root: Element | null, subtree: boolean, speed: CombatSpeed) {
  for (const animation of root?.getAnimations?.({ subtree }) ?? []) {
    const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null
    if (!target?.closest('.arena-ambient') && animation.playbackRate !== speed) animation.updatePlaybackRate(speed)
  }
}

export function CombatArena({ stage, hero, heroForm, bossPhase, events, outcome, leftHud, rightHud, tick, speed = 1,
  onToggleSpeed, intenseEffects = true }: {
  stage: Stage
  hero: CharacterId
  heroForm?: HeroForm
  bossPhase?: string
  events: readonly CombatEvent[]
  outcome?: CombatReport['outcome']
  leftHud: ReactNode
  rightHud: ReactNode
  intenseEffects?: boolean
  tick?: number
  speed?: CombatSpeed
  onToggleSpeed?: () => void
}) {
  const scenery = sceneryFor(stage)
  const phaseVisual = bossPhaseVisuals[stage.enemy.id]
  const phaseEvent = events.findLast((event) => event.kind === 'transform' && event.visual?.bossPhase)
  const special = events.findLast((event) => !event.visual?.bossPhase &&
    (event.kind === 'transform' || (event.kind === 'attack' && eventStyle(event).special)))
  const phaseId = phaseEvent?.id
  const arena = useRef<HTMLDivElement>(null)
  const lastShake = useRef<string>(undefined)
  useLayoutEffect(() => adjustAnimations(arena.current, true, speed), [events, speed])
  useEffect(() => {
    if (!phaseId || lastShake.current === phaseId) return
    lastShake.current = phaseId
    if (!intenseEffects || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const element = arena.current
    const animation = element?.animate?.([
      { transform: 'translate(0)' }, { transform: 'translate(-4px, 2px)' },
      { transform: 'translate(3px, -1px)' }, { transform: 'translate(-2px)' }, { transform: 'translate(0)' },
    ], { duration: 340, easing: 'ease-out' })
    if (element?.dataset.speed === '2') animation?.updatePlaybackRate(2)
    return () => animation?.cancel()
  }, [intenseEffects, phaseId])
  function playbackProps(side: 'player' | 'enemy') {
    const playback = arenaPlayback(events, side)
    const start = events.find(({ id }) => id === playback.id)?.tick
    const origin = playback.pose === 'idle' ? 0 : start
    const elapsedMs = tick === undefined || origin === undefined || playback.pose === 'death'
      ? undefined : Math.max(0, tick - origin) * combatStepMs
    return { playback, elapsedMs, speed }
  }
  const style = { '--rim': scenery.rim, '--phase-color': phaseVisual?.color, '--phase-accent': phaseVisual?.accent } as CSSProperties
  return <>
    {onToggleSpeed && <div className="arena-toolbar">
      <button type="button" className="arena-speed" aria-pressed={speed === 2} aria-label="Velocidad doble"
        onClick={onToggleSpeed} disabled={Boolean(outcome)}>Velocidad ×{speed}</button>
    </div>}
    <div ref={arena} className="arena-2d" data-level={stage.level} data-enemy-kind={stage.enemy.kind} data-speed={speed}
      onAnimationStart={(event) => { if (event.target instanceof Element) adjustAnimations(event.target, false, speed) }}
      data-scenery={scenery.id} data-intense-effects={intenseEffects ? 'on' : 'off'} style={style}>
    <ArenaLandscape key={scenery.id} url={scenery.url} ambient={scenery.ambient} />
    {special && (!phaseEvent || special.tick !== phaseEvent.tick) &&
      <div key={special.id} className="arena-special-impact" aria-hidden="true" />}
    <div className="arena-heads">{leftHud}{rightHud}</div>
    <div className="arena-actor arena-player">
      <AnimatedSprite visual={heroVisual(hero, heroForm)} {...playbackProps('player')} />
    </div>
    <div className="arena-actor arena-enemy" data-enemy={stage.enemy.id} data-boss-phase={bossPhase}>
      <AnimatedSprite key={stage.enemy.id} visual={enemyVisual(stage)} {...playbackProps('enemy')} facing="left" />
    </div>
    {phaseEvent && <div key={phaseEvent.id} className="arena-phase-impact" data-motif={phaseVisual?.motif} aria-hidden="true">
      <span className="arena-phase-shade" />
      <span className="arena-phase-burst"><i /><b /><em /></span>
      {bossPhase && <p className="arena-phase-banner">{bossPhase}</p>}
    </div>}
    <div className="arena-effects" aria-hidden="true">
      {events.map((event) => {
        if (event.kind === 'attack') return <span key={event.id} className="arena-attack" data-theme={eventStyle(event).theme} data-side={event.source} />
        if (event.kind === 'transform') return <span key={event.id} className="arena-aura" data-theme={eventStyle(event).theme}
          data-side={event.target} data-phase-aura={event.visual?.bossPhase} />
        return null
      })}
      {Array.from(arenaImpacts(events), ({ id, kind, target, amount }) =>
        <span key={id} className={`arena-number arena-${kind === 'shield' ? 'shield-number' : kind}`} data-side={target}>
          {kind === 'heal' ? '+' : '−'}{formatCombatAmount(amount)}
        </span>
      )}
    </div>
    {outcome && <p className="arena-outcome" data-result={outcome} role="status">{outcomeLabels[outcome]}</p>}
  </div>
  </>
}
