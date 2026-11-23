import { useEffect, useRef, useState } from 'react'
import './App.css'
import { Backpack } from './components/inventory/Backpack'
import { ArsenalScreen, ShopScreen, StarterItemsScreen } from './screens/EquipmentScreens'
import { CombatScreen, ResultScreen, StageMap, StageNotice } from './screens/ExpeditionScreens'
import { advanceEquipment, buyOffer, refreshOffers, startEquipmentSession, type EquipmentSession } from './data/equipmentSession'
import { stages, type Stage } from './data/levels'
import type { CombatReport, CombatUpdate, GameEngineAdapter } from './adapters/gameEngineAdapter'
import { liveCombat } from './adapters/liveCombat'
import { editInventory, type InventoryCommand, type InventoryResponse } from './data/expeditionInventory'
import { loadExpedition, saveExpedition } from './data/expeditionSave'
import { setInventoryCombatLock } from './engine'
import type { CharacterId, Item } from './data/items'
import './Equipment.css'
import './Expedition.css'

type Screen = 'menu' | 'characters' | 'starter' | 'preparation' | 'shop' | 'arsenal' | 'credits' | 'map' | 'notice' | 'combat' | 'result'
type Character = { id: CharacterId; name: string; anime: string; role: string; description: string; color: string; stats: { label: string; value: number }[] }

const characters: Character[] = [
  { id: 'goku', name: 'Goku', anime: 'Dragon Ball', role: 'Guerrero de energía', description: 'Un luchador incansable que convierte cada batalla en una nueva transformación.', color: '#f6a623', stats: [{ label: 'Fuerza', value: 92 }, { label: 'Ki', value: 88 }, { label: 'Defensa', value: 76 }] },
  { id: 'naruto', name: 'Naruto', anime: 'Naruto', role: 'Ninja de chakra', description: 'Un ninja impredecible que domina clones, viento y una voluntad imposible de quebrar.', color: '#55b9ff', stats: [{ label: 'Fuerza', value: 84 }, { label: 'Chakra', value: 94 }, { label: 'Defensa', value: 80 }] },
]

function App({ engine = liveCombat }: { engine?: GameEngineAdapter }) {
  const [saved] = useState(loadExpedition)
  const [screen, setScreen] = useState<Screen>('menu')
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>(saved?.session.character ?? 'goku')
  const [arsenalCharacter, setArsenalCharacter] = useState<CharacterId>('goku')
  const [session, setSession] = useState<EquipmentSession | null>(saved?.session ?? null)
  const [stageIndex, setStageIndex] = useState(saved?.stageIndex ?? 0)
  const [storageError, setStorageError] = useState(false)
  const [combat, setCombat] = useState<CombatUpdate | null>(null)
  const [combatError, setCombatError] = useState<string | null>(null)
  const activeCombat = useRef<AbortController | null>(null)
  const character = characters.find(({ id }) => id === selectedCharacter) ?? characters[0]
  const activeCharacter = characters.find(({ id }) => id === session?.character) ?? character
  const currentStage = stages[stageIndex]
  const stage = currentStage

  useEffect(() => () => activeCombat.current?.abort(), [])
  useEffect(() => {
    const saved = saveExpedition(session, stageIndex)
    let active = true
    queueMicrotask(() => { if (active) setStorageError(!saved) })
    return () => { active = false }
  }, [session, stageIndex])

  function lockInventory(locked: boolean) {
    setSession((current) => current && ({
      ...current, inventory: { ...current.inventory, bag: setInventoryCombatLock(current.inventory.bag, locked) },
    }))
  }

  function confirmEquipment(selection: readonly Item[]) {
    const next = startEquipmentSession(selectedCharacter, selection)
    if (!next) return
    setSession(next)
    setStageIndex(0)
    setScreen('preparation')
  }

  function beginCombat() {
    if (!session || activeCombat.current) return
    setCombat(null)
    setCombatError(null)
    setScreen('combat')
    const controller = new AbortController()
    activeCombat.current = controller
    const lockedInventory = setInventoryCombatLock(session.inventory.bag, true)
    lockInventory(true)
    function fail() {
      if (controller.signal.aborted) return
      controller.abort()
      activeCombat.current = null
      lockInventory(false)
      setCombatError('El motor no pudo iniciar o completar el combate. Vuelve a preparación para reintentar.')
    }
    try {
      const task = engine.startCombat({ character: session.character, stage, inventory: lockedInventory }, (update) => {
        if (controller.signal.aborted) return
        setCombat(update)
        if (update.status === 'finished') {
          controller.abort()
          activeCombat.current = null
          lockInventory(false)
          setScreen('result')
        }
      }, controller.signal)
      void Promise.resolve(task).catch(fail)
    } catch {
      fail()
    }
  }

  function continueExpedition(report: CombatReport | null) {
    if (!report || report.outcome === 'timeout') {
      setScreen('preparation')
      return
    }
    const nextStage = stages[stageIndex + 1]
    if (report.outcome === 'defeat' || !nextStage) {
      setSession(null)
      setScreen(report.outcome === 'defeat' ? 'characters' : 'menu')
      return
    }
    setSession((current) => current && advanceEquipment(current, report.gold, nextStage.level !== currentStage.level))
    setStageIndex(stageIndex + 1)
    setScreen('preparation')
  }

  function inventoryCommand(command: InventoryCommand): InventoryResponse {
    if (!session || screen !== 'preparation' || activeCombat.current) return { ok: false, error: 'La mochila está bloqueada.' }
    const result = editInventory(session.inventory, command)
    if (result.ok) setSession({ ...session, inventory: result.inventory })
    return result
  }

  const combatView = screen === 'combat' || screen === 'result' || screen === 'notice'
  const report = combat?.status === 'finished' ? combat.report : null

  return <main className="game-shell">
    <header className="topbar">
      <button className="brand" disabled={combatView} onClick={() => setScreen('menu')} aria-label="Volver al menú principal">
        <span className="brand-mark">AR</span><span>ANIME <strong>ROGUELIKE</strong></span>
      </button>
      <div className="top-status"><span className="status-dot" /> NIVEL {stage.level} · ETAPA {stage.number}
        {session && <><span className="gold" aria-hidden="true">◆</span> {session.gold} de oro</>}
      </div>
    </header>
    {storageError && <p className="stage-notice screen-padding" role="status">El navegador no permite guardar la expedición.</p>}
    {screen === 'menu' && <Menu onNavigate={setScreen} canResume={session !== null} />}
    {screen === 'characters' && <CharacterSelect selected={selectedCharacter} onSelect={setSelectedCharacter} onContinue={() => setScreen('starter')} onBack={() => setScreen('menu')} />}
    {screen === 'starter' && <StarterItemsScreen character={character.id} name={character.name} onBack={() => setScreen('characters')} onConfirm={confirmEquipment} />}
    {screen === 'preparation' && session && <Preparation character={activeCharacter} session={session} stage={stage}
      onInventoryCommand={inventoryCommand}
      onBack={() => setScreen('menu')} onCredits={() => setScreen('credits')} onShop={() => setScreen('shop')}
      onMap={() => setScreen('map')} onNotice={() => setScreen('notice')} />}
    {screen === 'shop' && session && <ShopScreen session={session} onBack={() => setScreen('preparation')}
      onBuy={(id) => {
        setSession((current) => current && buyOffer(current, id))
      }}
      onRefresh={() => setSession((current) => current && refreshOffers(current))} />}
    {screen === 'map' && <StageMap current={currentStage} demo={false} onBack={() => setScreen('preparation')} onPreview={() => {}} />}
    {screen === 'notice' && <StageNotice stage={stage} demo={false} onStart={beginCombat} onBack={() => setScreen('preparation')} />}
    {screen === 'combat' && <CombatScreen stage={stage}
      hero={{ name: activeCharacter.name, mark: activeCharacter.id === 'goku' ? '悟' : '忍', color: activeCharacter.color }}
      update={combat} demo={false} error={combatError}
      onBack={() => setScreen('preparation')} onDemoReport={() => setScreen('result')} />}
    {screen === 'result' && <ResultScreen stage={stage} report={report} onContinue={() => continueExpedition(report)} onMap={() => setScreen('map')} />}
    {screen === 'arsenal' && <ArsenalScreen character={arsenalCharacter} onSelect={setArsenalCharacter} onBack={() => setScreen('menu')} />}
    {screen === 'credits' && <Credits onBack={() => setScreen('menu')} />}
  </main>
}

function Menu({ onNavigate, canResume }: { onNavigate: (screen: Screen) => void; canResume: boolean }) {
  return <section className="menu-screen screen-padding">
    <div className="menu-art" aria-hidden="true">
      <div className="sun-orb" /><div className="fighter fighter-left">悟</div><div className="fighter fighter-right">忍</div>
      <div className="slash slash-one" /><div className="slash slash-two" />
    </div>
    <div className="menu-copy">
      <p className="eyebrow">TEMPORADA 01 · EL DESPERTAR</p>
      <h1>ANIME<br /><span>ROGUELIKE</span></h1>
      <p className="tagline">Cada batalla cambia tu destino.</p>
      <div className="menu-actions">
        <button className="primary-button" onClick={() => onNavigate('characters')}>{canResume ? 'NUEVA EXPEDICIÓN' : 'JUGAR'} <span>→</span></button>
        {canResume && <button className="secondary-button" onClick={() => onNavigate('preparation')}>CONTINUAR</button>}
        <button className="secondary-button" onClick={() => onNavigate('arsenal')}>ARSENAL</button>
        <button className="text-button" onClick={() => onNavigate('credits')}>CRÉDITOS</button>
      </div>
    </div>
    <div className="protocol"><span>◈</span><div><small>PROTOCOLO</small><strong>23</strong></div><p>El destino favorece<br />a los preparados.</p></div>
  </section>
}

function CharacterSelect({ selected, onSelect, onContinue, onBack }: { selected: CharacterId; onSelect: (id: CharacterId) => void; onContinue: () => void; onBack: () => void }) { return <section className="screen-padding inner-screen"><div className="section-heading"><button className="back-button" onClick={onBack}>← MENÚ</button><p className="eyebrow">PASO 01 / 03</p><h2>ELIGE TU <span>CAMPEÓN</span></h2><p>Dos caminos. Una expedición. Elige quién luchará por ti.</p></div><div className="character-grid">{characters.map((item) => <button key={item.id} className={`character-card ${selected === item.id ? 'selected' : ''}`} onClick={() => onSelect(item.id)} style={{ '--character-color': item.color } as React.CSSProperties}><div className="portrait">{item.id === 'goku' ? '悟' : '忍'}</div><div className="character-info"><p className="eyebrow">{item.anime}</p><h3>{item.name}</h3><strong>{item.role}</strong><p>{item.description}</p>{item.stats.map((stat) => <div className="stat" key={stat.label}><span>{stat.label}</span><div><i style={{ width: `${stat.value}%` }} /></div><b>{stat.value}</b></div>)}</div><span className="select-indicator">{selected === item.id ? '✓ SELECCIONADO' : 'SELECCIONAR'}</span></button>)}</div><div className="bottom-action"><span>Tu elección define el arsenal inicial.</span><button className="primary-button" onClick={onContinue}>CONTINUAR →</button></div></section> }

function Preparation({ character, session, stage, onInventoryCommand, onBack, onCredits, onShop, onMap, onNotice }: {
  character: Character
  session: EquipmentSession
  stage: Stage
  onInventoryCommand: (command: InventoryCommand) => InventoryResponse
  onBack: () => void
  onCredits: () => void
  onShop: () => void
  onMap: () => void
  onNotice: () => void
}) {
  return <section className="screen-padding inner-screen">
    <div className="section-heading">
      <button className="back-button" onClick={onBack}>← MENÚ</button>
      <p className="eyebrow">PREPARACIÓN · NIVEL {stage.level}</p>
      <h2>PREPARA TU <span>EXPEDICIÓN</span></h2>
      <p>{stage.region} · Etapa {stage.number} / {stage.total} · {stage.enemy.name}</p>
    </div>
    <div className="prep-layout">
      <div className="loadout-panel panel">
        <div className="panel-title"><span>OPERADOR ACTIVO</span><b>{character.name.toUpperCase()}</b></div>
        <div className="mini-character" aria-hidden="true" style={{ '--character-color': character.color } as React.CSSProperties}>
          {character.id === 'goku' ? '悟' : '忍'}
        </div>
        <div className="loadout-stats">
          {character.stats.map(({ label, value }) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
          <div><span>Oro</span><strong>{session.gold} ◆</strong></div>
        </div>
        <button className="secondary-button" onClick={onShop}>ABRIR TIENDA</button>
        <button className="secondary-button" onClick={onMap}>MAPA DE EXPEDICIÓN</button>
        <button className="secondary-button" onClick={onCredits}>VER CRÉDITOS</button>
      </div>
      <Backpack inventory={session.inventory} onCommand={onInventoryCommand} />
    </div>
    <div className="bottom-action">
      <span>Nivel {stage.level} <b>›</b> Etapa {stage.number} / {stage.total}</span>
      <button className="primary-button" onClick={onNotice}>CONTINUAR A ETAPA →</button>
    </div>
  </section>
}

function Credits({ onBack }: { onBack: () => void }) { return <section className="screen-padding credits-screen"><button className="back-button" onClick={onBack}>← MENÚ</button><div className="credits-card"><p className="eyebrow">REGISTRO DE EXPEDICIÓN</p><h2>ANIME <span>ROGUELIKE</span></h2><div className="codex-placeholder"><span>CODEX</span><small>ESPACIO RESERVADO PARA EL LOGO OFICIAL</small></div><p>Una experiencia roguelike autobattler de inventario espacial.</p><div className="credits-meta"><span>REACT · TYPESCRIPT · VITE</span><span>CREADO PARA EL HACKATHON</span><span>ASISTENCIA DE CODEX</span></div><p className="credits-note">El recurso oficial del logo Codex será incorporado cuando esté disponible.</p></div></section> }

export default App
