# Audio de Anime Roguelike

## Efectos propios

Los efectos de combate e interfaz, las fanfarrias de victoria y derrota y el aviso de vida baja se sintetizan en tiempo de ejecución mediante Web Audio. Las frecuencias, envolventes y patrones de ruido están definidos en `src/audio/synth.ts`. No incorporan grabaciones, voces ni melodías de Dragon Ball, Naruto u otras obras.

## Música local

Las siete pistas provienen del paquete `musica_anime_roguelike_lista_para_subir (1).zip` entregado para este proyecto. El archivo de licencia del paquete las describe como música original sintetizada para Anime Roguelike, sin grabaciones externas. No identifica a un autor nominal.

Según el permiso incluido en el paquete, las siete pistas se pueden usar, editar y distribuir en el videojuego, demostraciones, tráileres y el repositorio, sin atribución. Este permiso se refiere a los archivos de este paquete.

| Archivo incorporado | Archivo en el paquete | Uso |
| --- | --- | --- |
| `opening.mp3` | `menu.mp3` | Opening instrumental del menú |
| `preparacion.mp3` | `preparation.mp3` | Preparación, tienda y mochila |
| `combate-normal.mp3` | `battle.mp3` | Combate normal |
| `miniboss.mp3` | `miniboss.mp3` | Combate contra miniboss |
| `jefe-mayor.mp3` | `boss.mp3` | Combate contra jefe mayor |
| `victoria.mp3` | `victory.mp3` | Jingle de victoria sin bucle |
| `derrota.mp3` | `defeat.mp3` | Jingle de derrota sin bucle |

Las pistas se guardan en `music/`. Si se sustituye una pista, mantener el nombre base de la primera columna y usar una extensión `.ogg`, `.mp3` o `.wav`.

Reiniciar Vite o recompilar después de añadir archivos. El build registra solo las pistas existentes. Si faltan los temas de victoria y derrota, se usan fanfarrias sintéticas cortas. El resto de las pistas ausentes permanece en silencio.
