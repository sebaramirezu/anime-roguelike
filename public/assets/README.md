# Recursos visuales de la arena

Los personajes, monstruos, escenarios y efectos provisionales de la arena se dibujan con CSS. El registro de `src/components/combat/arenaVisuals.ts` acepta PNG de esta carpeta. Un recurso ausente usa la silueta CSS. Una ruta que falla queda descartada para ese combatiente durante la arena.

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

- Personajes: `heroes/goku/` y `heroes/naruto/`.
- Enemigos por campaña: `enemies/goku/<enemigo>/` y `enemies/naruto/<enemigo>/`. Por ejemplo, Raditz usa `enemies/goku/raditz/` y Zabuza, `enemies/naruto/zabuza/`.
- El registro `enemySpriteRegistry` genera las rutas de cada pose a partir de los IDs de `src/data/enemies.ts`. Para activar los PNG, declarar los clips entregados en `installedEnemyClips` con el ID del enemigo, por ejemplo `goku-raditz`. Cada enemigo conserva su ruta si aparece en más de una etapa.
- Para una animación nueva, añadir el clip a la pose correspondiente del registro. Para dar un estilo a una técnica, usar el ID real del catálogo de objetos en `techniques`. Los recursos y estilos visuales se pueden cambiar sin tocar el motor.

Actualmente los 47 enemigos usan siluetas CSS con distintivo propio. Ninguno tiene un PNG definitivo registrado. El motor emite ataques, daño y bajas. Los efectos de curación y transformación están preparados para eventos `heal` y `transform`, pendientes de una fuente real en el adaptador actual.
