# Recursos visuales de la arena

El registro `src/assets/heroSprites.ts` busca primero las variantes pixel art de `src/assets/heroes/` y usa los PNG de `src/assets/items/png/` como respaldo. Los iconos de objetos se resuelven en `src/assets/itemIcons.ts`. Los resultados de fusión y los tres iconos defensivos Saiyajin priorizan sus PNG. La arena usa fondos pixel art y aplica por CSS el movimiento ambiental y las poses de los sprites estáticos.

Cuando añadas un sprite, ejecuta `npm run build` antes de abrir `npm run preview` o publicar `dist/`. La vista previa usa los recursos de la última compilación.

## PNG y fotogramas

- Usar PNG transparente, preferentemente de **128 × 128 px por fotograma**. Mantener el tamaño, la línea de suelo y el anclaje entre fotogramas. Las imágenes deben mirar a la derecha. La orientación contraria se resuelve en el componente.
- Para una tira horizontal, colocar los fotogramas juntos y sin margen. Por ejemplo, seis fotogramas de 128 × 128 forman un PNG de 768 × 128. Para una secuencia, usar `attack-01.png`, `attack-02.png`, etcétera.
- Usar archivos `idle.png`, `attack.png`, `hurt.png`, `death.png` y `special.png`. Empezar con 8 FPS para las tiras cortas. Activar `loop: true` para idle. Las reacciones de combate habitualmente se reproducen una vez.

```ts
clips: {
  idle: { kind: 'png', src: assetPath('heroes/goku/idle.png') },
  attack: { kind: 'sheet', src: assetPath('heroes/goku/attack.png'), width: 128, height: 128, count: 6, fps: 10 },
  hurt: {
    kind: 'sequence', width: 128, height: 128, fps: 8,
    sources: [assetPath('heroes/goku/hurt-01.png'), assetPath('heroes/goku/hurt-02.png')],
  },
}
```

## Personajes y monstruos

- Goku conserva `gokufase1.png` y `gokufase2.png` como respaldo de sus variantes pixel art. Naruto conserva `narutofase1.png` para la forma base y `naruto2.png` para Chakra del Kyubi. El cambio visual de Chakra del Kyubi se activa en el primer ataque resuelto si el objeto está equipado.
- `naruto1-removebg-preview.png` y `naruto3-removebg-preview.png` se muestran como referencia de pose base y de manto dorado de chakra en el arsenal de Naruto. Ambas conservan la cuadrícula visible del archivo original.
- El registro `enemySpriteRegistry` usa los IDs de `src/data/enemies.ts` para descubrir los PNG de `src/assets/enemies/` durante el desarrollo y el build. En reposo, prefiere `idle.pixel.png` a `idle.png`. Cada enemigo reutiliza su sprite en todas las etapas en las que aparece.
- Con solo `idle.png`, la arena aplica por CSS la respiración en reposo, la embestida al atacar, el retroceso al recibir daño y la caída al ser derrotado. También reutiliza el PNG para ataques especiales. Sin una imagen para la pose actual ni un `idle.png`, muestra la silueta con el distintivo del enemigo.
- Puedes añadir `attack.png`, `hurt.png`, `death.png` o `special.png` junto a `idle.png` para ilustrar esas poses. Las tiras y secuencias de fotogramas requieren un clip en `installedEnemyClips`.
- Los seis ninjas comunes de Naruto pueden compartir un PNG en `src/assets/enemies/naruto/common/`. Para cada pose, el archivo del enemigo tiene prioridad sobre el compartido.

## Generar sprites en Pixel Art con OpenAI

El prompt pide un sprite retro RPG 2D de cuerpo completo, mirando a la derecha. Usa una cuadrícula visible, una paleta limitada, contornos definidos y sombreado por grupos de píxeles. Pide fondo transparente y descarta pintura digital, ilustración realista, sombreado suave, renderizado cinematográfico, acabado HD y antialiasing marcado.

El generador solicita un PNG de 1024 × 1024 px al modelo `gpt-image-2.6-sunburst` en calidad `low`. Normaliza el resultado a **64 × 64 px** con vecino más cercano, alfa binario y dos píxeles de margen bajo la figura. La arena conserva la orientación del héroe y refleja al enemigo. La selección, preparación, arsenal y arena escalan las variantes de 64 px en múltiplos enteros cuando cabe al menos una unidad.

### Lote piloto

| ID | Destino pixel art |
| --- | --- |
| `goku-raditz` | `src/assets/enemies/goku/raditz/idle.pixel.png` |
| `goku-cui` | `src/assets/enemies/goku/cui/idle.pixel.png` |
| `naruto-zabuza` | `src/assets/enemies/naruto/zabuza/idle.pixel.png` |
| `naruto-mist-ninja` | `src/assets/enemies/naruto/mist-ninja/idle.pixel.png` |
| `goku-base` | `src/assets/heroes/goku/base.pixel.png` |
| `goku-ultra-instinct` | `src/assets/heroes/goku/ultra-instinct.pixel.png` |
| `naruto-base` | `src/assets/heroes/naruto/base.pixel.png` |
| `naruto-baryon` | `src/assets/heroes/naruto/baryon.pixel.png` |

Con Node.js 22.18 o posterior y las dependencias instaladas, ejecuta primero la simulación. El lote completo tiene un costo estimado de **USD 0.23752** con las tarifas consultadas el 23 de noviembre de 2026 y el margen para el texto. [Tarifas](https://developers.openai.com/api/docs/pricing#images) · [Calculadora de salida de imágenes](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency)

```powershell
npm.cmd run sprites:enemies -- --list
npm.cmd run sprites:enemies -- --pilot --dry-run --max-usd 0.24
```

Para generar, define `OPENAI_API_KEY` en la terminal de Node.js y escribe `GENERAR` cuando el script muestre el costo y pida confirmación. Los comandos de Raditz y del lote guardan la variante pixel art junto a cualquier ilustración anterior. Si la variante ya existe, el script la conserva.

```powershell
npm.cmd run sprites:enemies -- goku-raditz --generate --max-usd 0.03
npm.cmd run sprites:enemies -- --pilot --generate --max-usd 0.24
npm.cmd run sprites:enemies -- --pilot --validate
```

Goku y Naruto usan la variante base en selección, preparación, arsenal y combate. Migatte no Gokui y Modo Barión se muestran en el arsenal y mientras sus efectos estén activos en el motor. Al concluir la duración vuelve la forma base o el Chakra del Kyubi activo.

### Dodoria, Piccolo y equipo defensivo Saiyajin

Cui carga `src/assets/enemies/goku/cui/idle.pixel.png`. Dodoria y Piccolo usan siluetas hasta que estén disponibles sus PNG. Los tres iconos de equipo se dibujaron localmente y tienen un lienzo de 64 × 64 px con transparencia.

| ID | Destino PNG | Estado | Respaldo |
| --- | --- | --- | --- |
| `goku-dodoria` | `src/assets/enemies/goku/dodoria/idle.pixel.png` | Pendiente | Silueta |
| `goku-piccolo` | `src/assets/enemies/goku/piccolo/idle.pixel.png` | Pendiente | Silueta |
| `saiyan-armor` | `src/assets/items/png/saiyan-armor.png` | Instalado | `src/assets/items/saiyan-armor.svg` |
| `ki-barrier` | `src/assets/items/png/ki-barrier.png` | Instalado | `src/assets/items/ki-barrier.svg` |
| `vitality-orb` | `src/assets/items/png/vitality-orb.png` | Instalado | `src/assets/items/vitality-orb.svg` |

El generador local conserva los archivos existentes y permite recrear los iconos en una copia sin ellos.

```powershell
npm.cmd run sprites:items -- saiyan-armor ki-barrier vitality-orb
npm.cmd run sprites:items -- --validate
```

La primera orden para los enemigos inspecciona las rutas y calcula el costo sin contactar a la API. La segunda requiere `OPENAI_API_KEY` en Node.js y confirmación interactiva para autorizar el gasto.

```powershell
npm.cmd run sprites:enemies -- goku-dodoria goku-piccolo --dry-run --max-usd 0.06
npm.cmd run sprites:enemies -- goku-dodoria goku-piccolo --generate --max-usd 0.06
npm.cmd run sprites:enemies -- goku-dodoria goku-piccolo --validate
```

## Escenarios de combate

Los diez fondos rasterizados de **320 × 160 px** están en `src/assets/backgrounds/`. `src/components/combat/arenaScenery.ts` selecciona el recurso según el personaje, el mundo y, cuando corresponde, el enemigo de la etapa. La arena encuadra el fondo desde el suelo con escalado sin suavizado. Los archivos ausentes o dañados tienen respaldo CSS.

| Campaña y etapa | Fondo |
| --- | --- |
| Goku · mundos 1 y 2 | `saiyan-rocks.png`, paisaje rocoso saiyajin |
| Goku · mundo 3 | `namek.png`, Planeta Namek |
| Goku · mundo 4 hasta Cell | `android-outskirts.png`, entorno de los androides |
| Goku · combate contra Cell | `cell-ring.png`, arena de Cell |
| Goku · mundo 5 | `majin-wastes.png`, páramo de Majin Buu |
| Naruto · mundo 1 salvo Haku y Zabuza | `ninja-forest.png`, bosque ninja |
| Naruto · combates contra Haku y Zabuza | `zabuza-bridge.png`, puente en la niebla |
| Naruto · mundo 2 | `forest-of-death.png`, Bosque de la Muerte |
| Naruto · mundos 3 y 4 | `hidden-leaf.png`, Aldea Oculta de la Hoja |
| Naruto · mundo 5 | `pain-ruins.png`, Aldea de la Hoja destruida |

La orden `node scripts/generate-arena-backgrounds.mjs` reproduce los PNG offline. Los cambios de fondo no alteran el orden de los encuentros.

## Activación audiovisual de fases fuertes

La arena recibe una señal en el evento de transformación que ya emite el adaptador del motor. Muestra una sombra breve, un destello localizado, una sacudida y el nombre de la fase. El aura de color sigue el estado activo del jefe. El aviso y los medidores permanecen legibles con movimiento reducido o con **Efectos intensos de combate** desactivado en el menú de audio.

| Jefe | Identidad visual |
| --- | --- |
| Piccolo | Oleada verde y aura intensa |
| Vegeta | Aura azul y arcos amarillos |
| Freezer | Halo violeta |
| Cell | Aura verde con chispas eléctricas |
| Majin Buu | Aura y motas rosas |
| Zabuza | Neblina y energía azul fría |
| Orochimaru | Oleada violeta oscura |
| Gaara | Partículas doradas de arena |
| Itachi | Llamas rojizas |
| Pain | Ondas expansivas púrpuras |

## Inventario de sprites enemigos

Los 45 enemigos tienen destinos pixel art. `npm run sprites:enemies -- --list` consulta cuáles están pendientes en tu copia. Los `idle.png` previos, como los de Itachi y Raditz, sirven de respaldo mientras falten sus variantes `idle.pixel.png`.

### Dragon Ball

| ID | Ruta pixel art |
| --- | --- |
| `goku-raditz` | `src/assets/enemies/goku/raditz/idle.pixel.png` |
| `goku-cui` | `src/assets/enemies/goku/cui/idle.pixel.png` |
| `goku-dodoria` | `src/assets/enemies/goku/dodoria/idle.pixel.png` |
| `goku-zarbon` | `src/assets/enemies/goku/zarbon/idle.pixel.png` |
| `goku-guldo` | `src/assets/enemies/goku/guldo/idle.pixel.png` |
| `goku-recoome` | `src/assets/enemies/goku/recoome/idle.pixel.png` |
| `goku-burter` | `src/assets/enemies/goku/burter/idle.pixel.png` |
| `goku-jeice` | `src/assets/enemies/goku/jeice/idle.pixel.png` |
| `goku-ginyu` | `src/assets/enemies/goku/ginyu/idle.pixel.png` |
| `goku-android-19` | `src/assets/enemies/goku/android-19/idle.pixel.png` |
| `goku-dr-gero` | `src/assets/enemies/goku/dr-gero/idle.pixel.png` |
| `goku-pui-pui` | `src/assets/enemies/goku/pui-pui/idle.pixel.png` |
| `goku-yakon` | `src/assets/enemies/goku/yakon/idle.pixel.png` |
| `goku-babidi` | `src/assets/enemies/goku/babidi/idle.pixel.png` |
| `goku-dabura` | `src/assets/enemies/goku/dabura/idle.pixel.png` |
| `goku-piccolo` | `src/assets/enemies/goku/piccolo/idle.pixel.png` |
| `goku-vegeta` | `src/assets/enemies/goku/vegeta/idle.pixel.png` |
| `goku-freezer` | `src/assets/enemies/goku/freezer/idle.pixel.png` |
| `goku-cell` | `src/assets/enemies/goku/cell/idle.pixel.png` |
| `goku-majin-buu` | `src/assets/enemies/goku/majin-buu/idle.pixel.png` |

### Naruto

| ID | Ruta pixel art |
| --- | --- |
| `naruto-mist-ninja` | `src/assets/enemies/naruto/mist-ninja/idle.pixel.png` |
| `naruto-leaf-ninja` | `src/assets/enemies/naruto/leaf-ninja/idle.pixel.png` |
| `naruto-sound-ninja` | `src/assets/enemies/naruto/sound-ninja/idle.pixel.png` |
| `naruto-sand-ninja` | `src/assets/enemies/naruto/sand-ninja/idle.pixel.png` |
| `naruto-cloud-ninja` | `src/assets/enemies/naruto/cloud-ninja/idle.pixel.png` |
| `naruto-rain-ninja` | `src/assets/enemies/naruto/rain-ninja/idle.pixel.png` |
| `naruto-haku` | `src/assets/enemies/naruto/haku/idle.pixel.png` |
| `naruto-mizuki` | `src/assets/enemies/naruto/mizuki/idle.pixel.png` |
| `naruto-dosu` | `src/assets/enemies/naruto/dosu/idle.pixel.png` |
| `naruto-zaku` | `src/assets/enemies/naruto/zaku/idle.pixel.png` |
| `naruto-kin` | `src/assets/enemies/naruto/kin/idle.pixel.png` |
| `naruto-kankuro` | `src/assets/enemies/naruto/kankuro/idle.pixel.png` |
| `naruto-temari` | `src/assets/enemies/naruto/temari/idle.pixel.png` |
| `naruto-kabuto` | `src/assets/enemies/naruto/kabuto/idle.pixel.png` |
| `naruto-kimimaro` | `src/assets/enemies/naruto/kimimaro/idle.pixel.png` |
| `naruto-tayuya` | `src/assets/enemies/naruto/tayuya/idle.pixel.png` |
| `naruto-jirobo` | `src/assets/enemies/naruto/jirobo/idle.pixel.png` |
| `naruto-kidomaru` | `src/assets/enemies/naruto/kidomaru/idle.pixel.png` |
| `naruto-sakon-ukon` | `src/assets/enemies/naruto/sakon-ukon/idle.pixel.png` |
| `naruto-konan` | `src/assets/enemies/naruto/konan/idle.pixel.png` |
| `naruto-zabuza` | `src/assets/enemies/naruto/zabuza/idle.pixel.png` |
| `naruto-orochimaru` | `src/assets/enemies/naruto/orochimaru/idle.pixel.png` |
| `naruto-gaara` | `src/assets/enemies/naruto/gaara/idle.pixel.png` |
| `naruto-pain` | `src/assets/enemies/naruto/pain/idle.pixel.png` |
