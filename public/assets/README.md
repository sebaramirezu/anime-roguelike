# Recursos visuales de la arena

Los PNG existentes de los héroes se importan desde `src/assets/items/png/` en `src/assets/heroSprites.ts`. Los iconos de objetos se resuelven por separado en `src/assets/itemIcons.ts`, con preferencia por SVG y respaldo PNG. Los escenarios y las animaciones de poses estáticas usan CSS.

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

- Goku usa `gokufase1.png` en su forma base y `gokufase2.png` con Migatte no Gokui. Naruto usa `narutofase1.png` en su forma base y `naruto2.png` con Chakra del Kyubi. Si la técnica está colocada en la mochila, el cambio visual se activa en el primer ataque real del campeón y dura el resto del combate. No modifica sus estadísticas.
- `naruto1-removebg-preview.png` y `naruto3-removebg-preview.png` se muestran como referencia de pose base y de manto dorado de chakra en el arsenal de Naruto. Ambas conservan la cuadrícula visible del archivo original.
- Enemigos por campaña: `enemies/goku/<enemigo>/` y `enemies/naruto/<enemigo>/`. Por ejemplo, Raditz usa `enemies/goku/raditz/` y Zabuza, `enemies/naruto/zabuza/`.
- El registro `enemySpriteRegistry` genera las rutas de cada pose a partir de los IDs de `src/data/enemies.ts`. Para activar los PNG, declarar los clips entregados en `installedEnemyClips` con el ID del enemigo, por ejemplo `goku-raditz`. Cada enemigo conserva su ruta si aparece en más de una etapa.
- Para una animación nueva, añadir el clip a la pose correspondiente del registro. Para dar un estilo a una técnica, usar el ID real del catálogo de objetos en `techniques`. Los recursos y estilos visuales se pueden cambiar sin tocar el motor.

Los enemigos sin imágenes usan siluetas CSS con distintivo propio. El registro carga automáticamente los PNG por pose desde `src/assets/enemies/<campaña>/<enemigo>/`. Por ejemplo, `src/assets/enemies/goku/piccolo/idle.png` para el primer jefe y `src/assets/enemies/goku/raditz/idle.png` para los encuentros normales de esa campaña.

Itachi ya usa `src/assets/enemies/naruto/itachi/idle.png` en la etapa final del cuarto nivel. Los enemigos comunes de Naruto pueden compartir `src/assets/enemies/naruto/common/idle.png`. Si alguno tiene un PNG propio, tendrá prioridad sobre la imagen compartida.
