import type { Combatant, CombatReport, CombatUpdate, Stats } from '../adapters/gameEngineAdapter'
import { CombatArena } from '../components/combat/CombatArena'
import { outcomeLabels } from '../components/combat/arenaVisuals'
import type { CharacterId } from '../data/items'
import { enemyLabels, levelsFor, type Stage } from '../data/levels'
import { STAGE_WARNING } from '../shared/gameConstants'

const unavailable = 'No disponible'
const value = (number?: number, unit = '') => number === undefined ? unavailable : `${Number(number.toFixed(1))}${unit}`
const list = (entries?: readonly string[]) => entries ? entries.join(' · ') || 'Ninguno' : unavailable
const health = (current?: number, maximum?: number) => `${value(current)} / ${value(maximum)}`

export function CombatStats({ stats }: { stats?: Stats }) {
  return <dl className="combat-stats">
    <dt>Daño de armas</dt><dd>{value(stats?.damage)}</dd>
    <dt>Armadura</dt><dd>{value(stats?.armor)}</dd>
    <dt>Crítico</dt><dd>{value(stats?.critPercent, '%')}</dd>
    <dt>Vampirismo</dt><dd>{value(stats?.lifestealPercent, '%')}</dd>
    <dt>Espinas</dt><dd>{value(stats?.thorns)}</dd>
    <dt>Regeneración</dt><dd>{value(stats?.regeneration)}</dd>
  </dl>
}

export function StageMap({ current, demo, onBack, onPreview }: {
  current: Stage
  demo: boolean
  onBack: () => void
  onPreview: (stage: Stage) => void
}) {
  return <section className="screen-padding inner-screen">
    <div className="section-heading">
      <button className="back-button" onClick={onBack}>← PREPARACIÓN</button>
      <h2>MAPA DE <span>EXPEDICIÓN</span></h2>
      {demo && <p>DEMO · Explora las 46 etapas. Las visitas al mapa no modifican tu partida.</p>}
    </div>
    <div className="expedition-map">{levelsFor(current.character).map(({ level, name, special, stages }) => (
      <section className="panel" key={level}>
        <p className="eyebrow">NIVEL {level} · {special ? 'ESPECIAL' : 'NORMAL'}</p>
        <h3>{name}</h3>
        <ul>{stages.map((stage) => <li key={stage.id}>
          {demo ? <button className="secondary-button" onClick={() => onPreview(stage)}>
            {stage.number} · {stage.enemy.name} <small>{enemyLabels[stage.enemy.kind]}</small>
          </button> : <span aria-current={current.id === stage.id ? 'step' : undefined}>
            {stage.number} · {stage.enemy.name} <small>{enemyLabels[stage.enemy.kind]}</small>
          </span>}
        </li>)}</ul>
      </section>
    ))}</div>
  </section>
}

export function StageNotice({ stage, demo, onStart, onBack }: {
  stage: Stage
  demo: boolean
  onStart: () => void
  onBack: () => void
}) {
  return <section className="screen-padding inner-screen">
    <div className="panel stage-gate">
      <p className="eyebrow">{demo && 'DEMO · '}NIVEL {stage.level} · ETAPA {stage.number} / {stage.total}</p>
      <h2>{STAGE_WARNING}</h2>
      <p>{stage.region} · {enemyLabels[stage.enemy.kind]} · {stage.enemy.name}</p>
      <div className="equipment-summary">
        <button className="secondary-button" onClick={onBack}>VOLVER</button>
        <button className="primary-button" onClick={onStart}>{demo ? 'VER ARENA DEMO' : 'INICIAR COMBATE'}</button>
      </div>
    </div>
  </section>
}

function Meter({ label, current, maximum, shield = false }: { label: string; current?: number; maximum?: number; shield?: boolean }) {
  const available = current !== undefined && maximum !== undefined && maximum > 0
  return <div className={shield ? 'combat-meter combat-shield' : 'combat-meter'}>
    <div><span>{label}</span><strong>{shield && maximum === undefined ? value(current) : health(current, maximum)}</strong></div>
    <div className="combat-track">
      {available && <i style={{ width: `${Math.min(100, Math.max(0, current / maximum * 100))}%` }} />}
    </div>
  </div>
}

function FighterHud({ name, state }: { name: string; state?: Combatant }) {
  return <div className="arena-hud">
    <h3>{name}</h3>
    {state?.progression && <p className="arena-progression">Nivel {state.progression.level} · XP {state.progression.xp} / {state.progression.xpNeeded}</p>}
    <Meter label="Vida" current={state?.health} maximum={state?.maxHealth} />
    <Meter label="Escudo" current={state?.shield} maximum={state?.maxShield} shield />
    {state?.stats?.armor !== undefined && <small>Armadura {value(state.stats.armor)}</small>}
    {state?.effects?.length ? <ul className="combat-effects">{state.effects.map((effect) => <li key={effect.id}>
      <strong>{effect.name}</strong> · {effect.kind === 'buff' ? 'Mejora' : 'Penalización'} · {value(effect.remainingSeconds, ' s')}
      {effect.description && <small>{effect.description}</small>}
    </li>)}</ul> : null}
  </div>
}

function LevelUpNotice({ report }: { report?: CombatReport | null }) {
  if (!report?.levelsGained) return null
  return <p className="stage-notice rpg-level-up" role="status">
    Subiste {report.levelsGained} {report.levelsGained === 1 ? 'nivel' : 'niveles'} · +{report.healthIncrease} de vida máxima · +{value(report.damageIncrease)} puntos porcentuales de daño base
  </p>
}

function FighterDetails({ name, state }: { name: string; state?: Combatant }) {
  return <details className="panel combat-fighter">
    <summary>{name} · Estadísticas y armas</summary>
    <CombatStats stats={state?.stats} />
    <h4>Cooldowns de armas</h4>
    {state?.weapons?.length ? state.weapons.map((weapon) =>
      <Meter key={weapon.id} label={weapon.name + ' (s)'} current={weapon.remainingSeconds} maximum={weapon.totalSeconds} />
    ) : <p>{state?.weapons ? 'Sin armas' : unavailable}</p>}
  </details>
}

export function CombatScreen({ stage, hero, update, demo, error, onBack, onReport }: {
  stage: Stage
  hero: { id: CharacterId; name: string }
  update: CombatUpdate | null
  demo: boolean
  error: string | null
  onBack: () => void
  onReport: () => void
}) {
  const events = update?.recentEvents ?? []
  const log = events.filter((event) => event.kind !== 'attack').slice(-8)
  const outcome = update?.status === 'finished' ? update.report.outcome : undefined
  return <section className="screen-padding inner-screen arena-screen">
    <div className="section-heading">
      <p className="eyebrow">{demo && 'DEMO · '}NIVEL {stage.level} · ETAPA {stage.number} / {stage.total}</p>
      <h2>{stage.region}</h2>
      <p>{enemyLabels[stage.enemy.kind]} · Mochila bloqueada</p>
    </div>
    {demo && <p className="stage-notice">DEMO visual. Conecta el motor para ver ataques automáticos, efectos y estadísticas.</p>}
    {error && <p className="stage-notice" role="alert">{error}</p>}
    {!demo && !error && !update && <p role="status">Esperando el estado del motor…</p>}
    <CombatArena stage={stage} hero={hero.id} heroForm={update?.player?.visualForm} events={events} outcome={outcome}
      leftHud={<FighterHud name={hero.name} state={update?.player} />}
      rightHud={<FighterHud name={stage.enemy.name} state={update?.enemy} />} />
    <LevelUpNotice report={update?.status === 'finished' ? update.report : undefined} />
    {outcome && <div className="arena-actions"><button className="primary-button" onClick={onReport}>VER INFORME →</button></div>}
    <div className="combat-arena">
      <FighterDetails name={hero.name} state={update?.player} />
      <FighterDetails name={stage.enemy.name} state={update?.enemy} />
    </div>
    <section className="panel combat-log">
      <h3>Acciones recientes</h3>
      {log.length ? <ol>{log.map((event) => <li key={event.id}>{event.text}</li>)}</ol>
        : <p>{update ? 'Sin acciones registradas' : unavailable}</p>}
    </section>
    {(demo || error) && <div className="bottom-action">
      <button className="secondary-button" onClick={onBack}>VOLVER A PREPARACIÓN</button>
      {demo && <button className="primary-button" onClick={onReport}>VER INFORME DEMO</button>}
    </div>}
  </section>
}

export function ResultScreen({ stage, report, onContinue, onMap }: {
  stage: Stage
  report: CombatReport | null
  onContinue: () => void
  onMap: () => void
}) {
  const rows = [
    ['Vida restante / máxima', health(report?.health, report?.maxHealth)],
    ['Daño infligido', value(report?.damageDealt)],
    ['Daño recibido', value(report?.damageTaken)],
    ['Curación total', value(report?.healing)],
    ['Curación por vampirismo', value(report?.lifestealHealing)],
    ['Daño bloqueado por escudos', value(report?.shieldBlocked)],
    ['Daño al escudo enemigo', value(report?.shieldDamageDealt)],
    ['Daño reflejado por espinas', value(report?.thornsDamage)],
    ['Ataques', value(report?.attacks)],
    ['Críticos', value(report?.criticals)],
    ['Mejoras aplicadas (buffs)', list(report?.buffs)],
    ['Penalizaciones aplicadas (debuffs)', list(report?.debuffs)],
    ['Duración', value(report?.durationSeconds, ' s')],
    ['Oro obtenido', value(report?.gold)],
    ['Experiencia obtenida', value(report?.xpGained, ' XP')],
  ]
  const title = report ? outcomeLabels[report.outcome] : 'Informe de combate'
  const action = !report || report.outcome === 'timeout' ? 'VOLVER A PREPARACIÓN'
    : report.outcome === 'defeat' ? 'REINICIAR EXPEDICIÓN'
    : stage.level === 5 && stage.number === stage.total ? 'FINALIZAR EXPEDICIÓN' : 'CONTINUAR'
  return <section className="screen-padding inner-screen">
    <div className="section-heading">
      <p className="eyebrow">{!report && 'DEMO · '}NIVEL {stage.level} · ETAPA {stage.number} / {stage.total}</p>
      <h2>{title}</h2>
      <p>{stage.enemy.name}{!report && ' · Sin resultado del motor'}</p>
    </div>
    <LevelUpNotice report={report} />
    <section className="panel">
      <dl className="combat-stats report-stats">
        {rows.map(([label, metric]) => <div key={label}><dt>{label}</dt><dd>{metric}</dd></div>)}
      </dl>
      {report?.outcome === 'defeat' && stage.enemy.kind !== 'normal' &&
        <p className="stage-notice">Debilidad del jefe: {report.enemyWeakness ?? unavailable}</p>}
    </section>
    <div className="bottom-action">
      {!report && <button className="secondary-button" onClick={onMap}>VER MAPA</button>}
      <button className="primary-button" onClick={onContinue}>{action}</button>
    </div>
  </section>
}
