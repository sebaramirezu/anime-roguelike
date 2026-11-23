import { useEffect, useRef, type ReactNode } from 'react'
import type { CombatEvent, CombatReport } from '../../adapters/gameEngineAdapter'
import type { CharacterId } from '../../data/items'
import type { Stage } from '../../data/levels'
import { AnimatedSprite } from './AnimatedSprite'
import { arenaPlayback, enemyVisual, eventStyle, heroVisual, outcomeLabels } from './arenaVisuals'
import './CombatArena.css'

export function CombatArena({ stage, hero, events, outcome, leftHud, rightHud }: {
  stage: Stage
  hero: CharacterId
  events: readonly CombatEvent[]
  outcome?: CombatReport['outcome']
  leftHud: ReactNode
  rightHud: ReactNode
}) {
  const special = events.findLast((event) => event.kind === 'transform' || (event.kind === 'attack' && eventStyle(event).special))
  const specialId = special?.id
  const arena = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!specialId || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = arena.current?.animate?.([
      { transform: 'translateX(0)' }, { transform: 'translateX(-4px)' },
      { transform: 'translateX(3px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' },
    ], { duration: 280, easing: 'ease-out' })
    return () => animation?.cancel()
  }, [specialId])
  return <div ref={arena} className="arena-2d" data-level={stage.level} data-enemy-kind={stage.enemy.kind}>
    <div className="arena-landscape" aria-hidden="true"><i /><b /><em /></div>
    {special && <div key={special.id} className="arena-special-impact" aria-hidden="true" />}
    <div className="arena-heads">{leftHud}{rightHud}</div>
    <div className="arena-ground" aria-hidden="true" />
    <div className="arena-actor arena-player">
      <AnimatedSprite visual={heroVisual(hero)} playback={arenaPlayback(events, 'player')} />
    </div>
    <div className="arena-actor arena-enemy" data-enemy={stage.enemy.id}>
      <AnimatedSprite key={stage.enemy.id} visual={enemyVisual(stage)} playback={arenaPlayback(events, 'enemy')} facing="left" />
    </div>
    <div className="arena-effects" aria-hidden="true">
      {events.map((event) => {
        if (event.kind === 'attack') return <span key={event.id} className="arena-attack" data-theme={eventStyle(event).theme} data-side={event.source} />
        if (event.kind === 'transform') return <span key={event.id} className="arena-aura" data-theme={eventStyle(event).theme} data-side={event.target} />
        if ((event.kind === 'damage' || event.kind === 'heal' || event.kind === 'shield') && event.amount !== undefined) {
          return <span key={event.id} className={`arena-number arena-${event.kind === 'shield' ? 'shield-number' : event.kind}`} data-side={event.target}>
            {event.kind === 'heal' ? '+' : '−'}{Math.round(event.amount)}
          </span>
        }
        return null
      })}
    </div>
    {outcome && <p className="arena-outcome" data-result={outcome} role="status">{outcomeLabels[outcome]}</p>}
  </div>
}
