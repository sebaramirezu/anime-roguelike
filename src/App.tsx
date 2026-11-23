import { useState } from 'react'
import './App.css'
import { STAGE_WARNING } from './shared/gameConstants'
import { Backpack } from './components/inventory/Backpack'
import { ArsenalScreen, ShopScreen, StarterItemsScreen } from './screens/EquipmentScreens'
import { buyOffer, refreshOffers, startEquipmentSession, type EquipmentSession } from './data/equipmentSession'
import type { CharacterId, Item } from './data/items'
import './Equipment.css'

type Screen = 'menu' | 'characters' | 'starter' | 'preparation' | 'shop' | 'arsenal' | 'credits'
type Character = { id: CharacterId; name: string; anime: string; role: string; description: string; color: string; stats: { label: string; value: number }[] }

const characters: Character[] = [
  { id: 'goku', name: 'Goku', anime: 'Dragon Ball', role: 'Guerrero de energía', description: 'Un luchador incansable que convierte cada batalla en una nueva transformación.', color: '#f6a623', stats: [{ label: 'Fuerza', value: 92 }, { label: 'Ki', value: 88 }, { label: 'Defensa', value: 76 }] },
  { id: 'naruto', name: 'Naruto', anime: 'Naruto', role: 'Ninja de chakra', description: 'Un ninja impredecible que domina clones, viento y una voluntad imposible de quebrar.', color: '#55b9ff', stats: [{ label: 'Fuerza', value: 84 }, { label: 'Chakra', value: 94 }, { label: 'Defensa', value: 80 }] },
]

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('goku')
  const [arsenalCharacter, setArsenalCharacter] = useState<CharacterId>('goku')
  const [session, setSession] = useState<EquipmentSession | null>(null)
  const character = characters.find(({ id }) => id === selectedCharacter) ?? characters[0]
  const activeCharacter = characters.find(({ id }) => id === session?.character) ?? character

  function confirmEquipment(selection: readonly Item[]) {
    const next = startEquipmentSession(selectedCharacter, selection)
    if (!next) return
    setSession(next)
    setScreen('preparation')
  }

  return <main className="game-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setScreen('menu')} aria-label="Volver al menú principal">
        <span className="brand-mark">AR</span><span>ANIME <strong>ROGUELIKE</strong></span>
      </button>
      <div className="top-status"><span className="status-dot" /> EXPEDICIÓN 01
        {session && <><span className="gold" aria-hidden="true">◆</span> {session.gold} de oro</>}
      </div>
    </header>
    {screen === 'menu' && <Menu onNavigate={setScreen} canResume={session !== null} />}
    {screen === 'characters' && <CharacterSelect selected={selectedCharacter} onSelect={setSelectedCharacter} onContinue={() => setScreen('starter')} onBack={() => setScreen('menu')} />}
    {screen === 'starter' && <StarterItemsScreen character={character.id} name={character.name} onBack={() => setScreen('characters')} onConfirm={confirmEquipment} />}
    {screen === 'preparation' && session && <Preparation character={activeCharacter} session={session}
      onBack={() => setScreen('menu')} onCredits={() => setScreen('credits')} onShop={() => setScreen('shop')} />}
    {screen === 'shop' && session && <ShopScreen session={session} onBack={() => setScreen('preparation')}
      onBuy={(id) => setSession((current) => current && buyOffer(current, id))}
      onRefresh={() => setSession((current) => current && refreshOffers(current))} />}
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

function Preparation({ character, session, onBack, onCredits, onShop }: {
  character: Character
  session: EquipmentSession
  onBack: () => void
  onCredits: () => void
  onShop: () => void
}) {
  return <section className="screen-padding inner-screen">
    <div className="section-heading">
      <button className="back-button" onClick={onBack}>← MENÚ</button>
      <p className="eyebrow">PREPARACIÓN · NIVEL 01</p>
      <h2>PREPARA TU <span>EXPEDICIÓN</span></h2>
      <p>Revisa tu equipo antes de la primera etapa.</p>
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
        <button className="secondary-button" onClick={onCredits}>VER CRÉDITOS</button>
      </div>
      <Backpack entries={session.tray} />
    </div>
    <div className="stage-notice"><span aria-hidden="true">⚠</span><p><strong>AVISO DE ETAPA</strong>{STAGE_WARNING}</p></div>
    <div className="bottom-action">
      <span>Nivel 01 <b>›</b> Etapa 01 / 12</span>
      <button className="primary-button" onClick={() => window.alert(STAGE_WARNING)}>VER AVISO DE ETAPA →</button>
    </div>
  </section>
}

function Credits({ onBack }: { onBack: () => void }) { return <section className="screen-padding credits-screen"><button className="back-button" onClick={onBack}>← MENÚ</button><div className="credits-card"><p className="eyebrow">REGISTRO DE EXPEDICIÓN</p><h2>ANIME <span>ROGUELIKE</span></h2><div className="codex-placeholder"><span>CODEX</span><small>ESPACIO RESERVADO PARA EL LOGO OFICIAL</small></div><p>Una experiencia roguelike autobattler de inventario espacial.</p><div className="credits-meta"><span>REACT · TYPESCRIPT · VITE</span><span>CREADO PARA EL HACKATHON</span><span>ASISTENCIA DE CODEX</span></div><p className="credits-note">El recurso oficial del logo Codex será incorporado cuando esté disponible.</p></div></section> }

export default App
