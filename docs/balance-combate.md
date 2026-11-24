# Balance de combate y recursos de Anime Roguelike

## Rareza fija de tienda

La [configuración de tienda](../src/data/shopStock.ts) usa los mismos pesos para ambos héroes en cada generación de stock. Los niveles 1 a 5 tienen pesos **40, 35, 20, 4 y 1**. El sorteo forma cuatro casillas con boletos espaciados y baraja su posición. La probabilidad marginal de cada nivel por casilla coincide con su peso activo. Las rarezas dentro de un lote están correlacionadas. La franja de nivel 5 solo admite un boleto, por lo que pueden aparecer cero o un objeto de ese nivel por lote.

Primero se comprueba la elegibilidad del catálogo. Hasta **mundo 2, etapa 7**, las dos campañas carecen de objetos vendibles de nivel 5. Los pesos activos se dividen por 99 y quedan en **40,4040%, 35,3535%, 20,2020%, 4,0404% y 0%**. Desde esa etapa entra el ingrediente básico y se aplica la tabla completa. En **mundo 4, etapa 6** entra el ingrediente avanzado. Ambos comparten el mismo 1% de nivel 5 y se eligen con el mismo peso cuando los dos son elegibles. Los mundos especiales también usan el sorteo vigente. Su presupuesto de oro sigue las reglas existentes.

La semilla se genera al iniciar una expedición nueva y se guarda junto con el lote. Los guardados anteriores conservan sus objetos y ofertas válidas. La carga repara las ofertas que incumplan el desbloqueo o la restricción de un ingrediente mítico por lote. Los objetos de fusión de nivel 6 se obtienen con las recetas existentes.

### Probabilidad configurada y frecuencia medida

Se muestrearon **1.507.328 lotes** y **6.029.312 casillas**, con 2.048 semillas y ocho lotes distintos por etapa en cada campaña. La tabla muestra porcentajes por casilla en orden N1–N5. Las cifras coincidieron entre héroes al ejecutar las mismas semillas. El promedio del mundo 2 combina seis etapas con el nivel 5 bloqueado y seis con el ingrediente básico habilitado.

| Mundo | Lotes por campaña | Esperado según elegibilidad · N1 / N2 / N3 / N4 / N5 | Medido · N1 / N2 / N3 / N4 / N5 |
| --- | ---: | --- | --- |
| 1 | 196.608 | 40,40 / 35,35 / 20,20 / 4,04 / 0,00 | 40,36 / 35,38 / 20,21 / 4,05 / 0,00 |
| 2 | 196.608 | 40,20 / 35,18 / 20,10 / 4,02 / 0,50 | 40,19 / 35,19 / 20,10 / 4,04 / 0,49 |
| 3 | 81.920 | 40,00 / 35,00 / 20,00 / 4,00 / 1,00 | 40,02 / 34,98 / 20,01 / 3,99 / 1,00 |
| 4 | 196.608 | 40,00 / 35,00 / 20,00 / 4,00 / 1,00 | 39,97 / 35,03 / 19,97 / 4,01 / 1,02 |
| 5 | 81.920 | 40,00 / 35,00 / 20,00 / 4,00 / 1,00 | 40,02 / 34,98 / 20,01 / 3,99 / 1,00 |

Con el ingrediente básico como único elegible, apareció en **3,98% de los lotes**. Con ambos elegibles, el básico apareció en **2,02%** y el avanzado en **2,05%**. El **71,61%** de los grupos de ocho lotes con ambos elegibles quedó sin ninguna pieza mítica. Se registraron cero ofertas bloqueadas, cero objetos de nivel 6 y cero lotes con ambas piezas.

### Campañas, fusiones y coste observado

Se jugaron **1.024 expediciones** con 128 semillas por héroe y estrategia, usando las ofertas visibles, el gasto de oro, la colocación de piezas y el motor real. Las dos estrategias normales omitieron la compra de ingredientes míticos. Las dos estrategias de búsqueda ajustaron la reserva de oro mientras quedaban ingredientes por conseguir. Las cifras cuentan ejecuciones de estas estrategias.

| Héroe | Plan | Campañas completas | Llegaron a mundo 4, etapa 6 | Compraron ambas piezas | Equiparon la fusión mítica |
| --- | --- | ---: | ---: | ---: | ---: |
| Goku | Fusiones | 123/128 | 123 | 0 | 0 |
| Goku | Defensa | 123/128 | 123 | 0 | 0 |
| Goku | Priorizar mítica | 121/128 | 122 | 8 | 4 |
| Goku | Defensa antes de la mítica | 74/128 | 93 | 7 | 5 |
| Naruto | Fusiones | 97/128 | 97 | 0 | 0 |
| Naruto | Defensa | 94/128 | 94 | 0 | 0 |
| Naruto | Priorizar mítica | 94/128 | 95 | 6 | 3 |
| Naruto | Defensa antes de la mítica | 56/128 | 76 | 8 | 7 |

En las **437 campañas ganadas con los planes normales**, las fusiones de nivel 2, 3 y 4 se produjeron respectivamente en **395, 414 y 391** expediciones. Entre ellas hubo Báculo Energizado, Doble Ráfaga de Ki y Báculo Kaioken en Goku, y Kunais Gemelos, Kunais de las Sombras y Clones del Kyubi en Naruto.

| Fusión equipada | Éxitos sobre 256 búsquedas | Renovaciones de búsqueda · mín. / mediana / máx. | Oro de piezas y búsqueda · mín. / mediana / máx. |
| --- | ---: | ---: | ---: |
| Migatte no Gokui | 9 | 4 / 12 / 24 | 64 / 96 / 144 |
| Modo Barión | 10 | 4 / 13 / 24 | 64 / 100 / 144 |

El coste incluye las dos piezas de 24 de oro y las renovaciones pagadas de 4 de oro durante la búsqueda. Se calcula sobre las búsquedas que acabaron con la fusión equipada y suma gastos de distintos mundos. Algunos planes compraron ambas piezas y conservaron una en la bandeja con su estrategia de colocación. Con la semilla **3**, el plan que prioriza la mítica equipó ambas formas en el **mundo 4, etapa 6**, por **64 de oro** en cada campaña, y completó las 46 etapas.

Los perfiles de enemigos y los resultados de los diez jefes, incluidos los 120 duelos de referencia y la matriz de preparación, coincidieron con la medición previa. Build, lint y **306 pruebas** aprobadas.

```powershell
node scripts/simulate-combat.mjs --shop-audit --bosses --boss-preparation --purchase-routes
```

## Velocidad, Migatte y acceso a míticas

Las cifras de esta sección registran la calibración anterior de tienda. La rareza y los costes vigentes están documentados arriba.

El control de la arena empieza en **×1** en una expedición nueva. Conserva la velocidad elegida mientras la expedición está abierta. El adaptador sondea el reloj cada 50 ms y ejecuta únicamente pasos canónicos de 100 ms simulados. En ×1 reúne el tiempo de dos sondeos y en ×2 ejecuta un paso por sondeo. Cambiar de velocidad conserva el tiempo fraccionario pendiente. Los cuadros, las poses, los proyectiles, las auras y las transiciones visuales usan la velocidad de combate. La música y el ambiente de fondo mantienen su ritmo. En ×2 se priorizan hasta dos efectos sonoros distintos por actualización.

La prueba con Cell, escudos y Migatte compara todas las actualizaciones a ×1, a ×2 y en una ejecución ×1 → ×2 → ×1. Coinciden los impactos y el orden de eventos, la vida final, la absorción, la duración simulada y las activaciones de Migatte y de la fase de Cell. El tiempo de reloj de ×2 es la mitad en la prueba.

### Daño heredado

| Técnica | Golpe base al nivel 1 | Intervalo | DPS bruto |
| --- | ---: | ---: | ---: |
| Genkidama | 126 | 3,65 s | 34,52 |
| Genkidama concentrada | 110 | 3,075 s | 35,77 |
| Migatte, técnicas heredadas | 126 y 110 | 3,65 y 3,075 s | **70,29** |
| Migatte, técnicas durante la transformación | 195,3 y 170,5 | 3,65 y 3,075 s | **108,95** |

Las Genkidamas carecen de golpes extra o mejoras de daño propias. El mismo resultado de fusión ejecuta ambas técnicas visibles con sus recargas originales en cinco casillas. Las dos armas originales ocupan diez. La mejora de daño de Migatte sigue siendo del 55% y la guardia temporal del 35%, ambas durante 11 s por debajo del 48% de vida. Dos copias equipadas conservan un solo conjunto de técnicas y una sola activación por combate. El escalado de nivel, las recargas pasivas y la mitigación siguen sus reglas habituales.

Modo Barión conserva su ráfaga de siete segundos con +90% de daño y −24% de recarga. Afecta a las armas equipadas. Sus ingredientes siguen teniendo 98 de daño cada 2,9 s y 90 + 19 de daño cada 2,95 s, respectivamente, para **70,74 DPS brutos** cuando se usan juntos al nivel 1.

### Cuándo salen y cuánto cuestan

| Campaña | Primer ingrediente | Desbloqueo | Segundo ingrediente | Desbloqueo |
| --- | --- | --- | --- | --- |
| Goku | Genkidama (`spirit-bomb`) | Mundo 2, etapa 7 · 19/46 | Genkidama concentrada (`focused-spirit-bomb`) | Mundo 4, etapa 6 · 35/46 |
| Naruto | Rasenshuriken (`rasenshuriken`) | Mundo 2, etapa 7 · 19/46 | Rasenshuriken de Kurama (`kurama-rasenshuriken`) | Mundo 4, etapa 6 · 35/46 |

La tienda es determinista. Por ingrediente elegible se comprobó **1 de 8 lotes** en el ciclo de rotación, un 12,5% si se toman sus ocho posiciones con el mismo peso. Cuando ambos son elegibles, **2 de 8** lotes contienen alguno y **0 de 8** contienen los dos. El inicio de campaña y todas las renovaciones de la segunda tienda excluyen ambos ingredientes. Los mundos especiales 3 y 5 tampoco los ofrecen porque no hay oro utilizable en sus etapas intermedias y el cambio de mundo reinicia la reserva.

Cada arma cuesta 24 de oro y renovar cuesta 4. Desde un lote sin comprar, siete renovaciones recorren las ocho posiciones. Un ingrediente cuesta como máximo 52 de oro contando la búsqueda. En el mundo 4 se pueden obtener ambos desde sus dos posiciones distintas por hasta 76 de oro si se llega a la etapa 12 con los 77 de oro que se ganan al ahorrar las victorias previas. La reserva no requiere una moneda ni una recompensa nueva. Las recetas míticas son la única vía de obtención de su resultado en una expedición nueva. Los guardados antiguos conservan los objetos ya adquiridos y sustituyen las ofertas legendarias que ya no sean válidas.

### Rutas observadas

Se simularon 40 expediciones, cinco planes de compra por héroe con 0, 1, 2 y 3 renovaciones de apertura. Las ocho rutas por héroe que buscaban los materiales compraron ambos en cuatro casos por campaña. Goku fabricó Migatte en cuatro de ocho intentos y Naruto fabricó Barión en dos de ocho. En los dos casos adicionales de Naruto el segundo objeto quedó en la bandeja con la colocación de esa ruta. Son resultados de esos planes deterministas y del método de colocación, no tasas de jugadores.

| Héroe | Plan con 0 renovaciones iniciales | Compra básica · mundo–etapa | Compra avanzada · mundo–etapa | Renovaciones de búsqueda | Oro de ingredientes y búsqueda | Fusión equipada | Jefe final · tiempo y HP |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| Goku | Priorizar mítico | 2–7 | 4–6 | 2 | 56 | 4–6 | 32,06 s / 1.408,4 HP |
| Goku | Comprar defensa antes | 2–12 | 4–11 | 14 | 104 | 4–11 | 32,06 s / 1.141,82 HP |
| Naruto | Priorizar mítico | 2–7 | 4–6 | 3 | 60 | 4–6 | 47,82 s / 355,71 HP |
| Naruto | Comprar defensa antes | 4–7 | 4–12 | 7 | 76 | Material en bandeja | 36,88 s / 1.000,49 HP |

Las rutas de fusiones y defensa del conjunto habitual completaron ambas campañas sin míticas, con ocho victorias de expedición entre las 18 rutas medidas. Para pasar los jefes de apertura, estas rutas usaron fusiones accesibles como Báculo Kaioken y Doble Ráfaga de Ki en Goku o Rasengan del Kyubi en Naruto.

### Duelos de las transformaciones

Se probaron ocho configuraciones contra los cinco jefes de cada campaña. Los duelos de los mundos 1–3 con una mítica equipada representan pruebas de capacidad de combate. En la tienda de una partida nueva la forma solo se puede obtener a partir del mundo 4. V indica victoria y D derrota. Los valores son segundos del motor.

| Jefe | Ambas armas sueltas | Fusión y apoyo | Ofensiva | Defensiva | Inicial + forma | Sin forma | Ofensiva al 55% | Defensiva al 55% |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Piccolo | D 41,6 | V 42,04 | V 23,13 | V 43,5 | V 27,68 | D 40,7 | V 19,52 | V 38,53 |
| Vegeta | D 35,16 | D 36,9 | V 24,08 | V 46,33 | D 27,53 | D 35,3 | V 20,14 | D 43,09 |
| Freezer | D 34,87 | D 34,89 | V 23,79 | V 46,33 | D 25,74 | D 35,16 | V 20,14 | D 41,66 |
| Cell | D 37,2 | D 37,2 | V 28,64 | V 54,82 | D 27,9 | D 37,2 | D 24,8 | D 43,4 |
| Majin Buu | D 40,15 | D 43,8 | V 33,6 | V 68,75 | D 32,85 | D 40,15 | D 25,55 | D 46,4 |
| Zabuza | D 39 | D 45,6 | V 38,02 | V 42,03 | D 31,2 | D 39 | D 23,4 | V 32,09 |
| Orochimaru | D 35,2 | D 37,6 | D 35,2 | V 43,11 | D 28,2 | D 35,2 | D 22,4 | D 41,6 |
| Gaara | D 37,57 | D 38,4 | D 37,06 | V 46,47 | D 25,6 | D 37,5 | D 22,04 | D 40,16 |
| Itachi | D 36,46 | D 40,8 | D 35,9 | V 44,8 | D 27,2 | D 39,54 | D 20,52 | D 38,61 |
| Pain | D 40,15 | D 40,15 | D 36,13 | V 53,98 | D 29,2 | D 40,15 | D 22,8 | D 38,57 |

En los jefes finales, el DPS bruto sostenido se calcula antes de armadura y mejoras temporales. El DPS efectivo incluye la absorción del escudo enemigo y usa el tiempo del motor. La ventana mítica se mide con los tiempos exactos de los impactos desde la activación hasta su expiración o el final del duelo.

| Jefe | Configuración | DPS bruto | DPS efectivo total | DPS en ventana mítica | Daño a HP | Daño a escudo | HP propio final | Resultado |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Majin Buu | Ingredientes | 107,2 | 81,07 | — | 3.096,83 | 158 | 0 | D |
| Majin Buu | Fusión | 107,2 | 89,54 | 106,39 | 3.763,77 | 158 | 0 | D |
| Majin Buu | Ofensiva | 206,5 | 184,34 | 219,88 | 6.035,04 | 158 | 420,99 | V |
| Majin Buu | Defensiva | 116,52 | 90,08 | 106,39 | 6.035,04 | 158 | 135,57 | V |
| Majin Buu | Inicial | 157,33 | 137,12 | 177,35 | 4.346,26 | 158 | 0 | D |
| Majin Buu | Ofensiva al 55% | 206,5 | 196,84 | 211,62 | 4.871,37 | 158 | 0 | D |
| Majin Buu | Defensiva al 55% | 116,52 | 99,29 | 122,93 | 4.449,01 | 158 | 0 | D |
| Pain | Ingredientes | 107,92 | 82,51 | — | 3.154,59 | 158 | 0 | D |
| Pain | Fusión | 0 | 0 | 0 | 0 | 0 | 0 | D |
| Pain | Ofensiva | 104,02 | 105,5 | 199,72 | 3.653,24 | 158 | 0 | D |
| Pain | Defensiva | 119,2 | 105,55 | 188,18 | 5.540 | 158 | 255,29 | V |
| Pain | Inicial | 49,67 | 47,36 | 82,51 | 1.224,82 | 158 | 0 | D |
| Pain | Ofensiva al 55% | 104,02 | 120,01 | 175,99 | 2.578,14 | 158 | 0 | D |
| Pain | Defensiva al 55% | 119,2 | 118,37 | 211,9 | 4.407,78 | 158 | 0 | D |

Los diez topes de derrota para las builds insuficientes se volvieron a verificar. Las 40 builds A/B perdieron. Los 100 duelos de referencia que no incluyen Migatte y los perfiles de enemigos coincidieron con la medición anterior. Una mochila inicial con Migatte vence a Piccolo en la prueba hipotética y pierde ante los cuatro jefes posteriores. Contra Cell y Majin Buu, las dos configuraciones de Migatte que entraron con el 55% de vida perdieron. La defensa de Naruto ganó a Pain con 255 HP a vida completa y perdió al 55%.

```powershell
node scripts/simulate-combat.mjs --bosses --purchase-routes
node scripts/simulate-combat.mjs --boss-preparation --purchase-routes --mythic-audit
```

Build y lint pasaron con **303 pruebas**. Edge comprobó el cambio ×1 → ×2 → ×1 y el sprite de Migatte a 1280 y 390 px, con la música a velocidad normal. También comprobó la compra y la fusión desde la mochila, y ocho lotes consecutivos de la segunda tienda y del mundo 2 antes del desbloqueo.

## Preparación estratégica ante jefes

Se conservaron las estadísticas y fases de los diez jefes. El aviso previo ahora muestra el rango, el nombre del enemigo, rasgos generales de ofensiva y defensa y la posibilidad de una fase fuerte. La mochila muestra la vida real al entrar, el escudo inicial, la armadura, los objetos equipados y cuándo se activa su curación. El nombre, el umbral y los efectos de la fase se descubren durante el combate.

### Efecto de la vida al entrar

Se ejecutaron 240 duelos de C, D y E. Cada categoría usa las dos variantes del estudio anterior en cada jefe. El porcentaje se aplica a la vida máxima con el equipo puesto. El escudo empieza lleno, y el héroe tiene la experiencia correspondiente a la etapa. Los valores por jefe son **victorias C / D / E**, con dos intentos por categoría.

| Jefe | 55% | 72% | 85% | 100% |
| --- | ---: | ---: | ---: | ---: |
| Piccolo | 0 / 1 / 2 | 1 / 2 / 2 | 1 / 2 / 2 | 2 / 2 / 2 |
| Vegeta | 0 / 0 / 0 | 0 / 0 / 2 | 1 / 2 / 2 | 2 / 2 / 2 |
| Freezer | 0 / 0 / 0 | 0 / 0 / 2 | 1 / 0 / 2 | 2 / 2 / 2 |
| Cell | 0 / 0 / 1 | 0 / 1 / 1 | 1 / 1 / 2 | 1 / 1 / 2 |
| Majin Buu | 0 / 0 / 0 | 0 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 2 |
| Zabuza | 0 / 1 / 2 | 0 / 2 / 2 | 1 / 2 / 2 | 2 / 2 / 2 |
| Orochimaru | 0 / 0 / 0 | 0 / 0 / 2 | 0 / 0 / 2 | 2 / 2 / 2 |
| Gaara | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 1 | 1 / 1 / 2 |
| Itachi | 0 / 0 / 1 | 1 / 1 / 2 | 2 / 1 / 2 | 2 / 2 / 2 |
| Pain | 0 / 0 / 1 | 0 / 0 / 1 | 0 / 1 / 1 | 1 / 1 / 2 |

Los promedios se calculan entre las victorias de cada grupo. El daño recibido mide daño acumulado a la vida después de la mitigación y la absorción. El escudo consumido se muestra por separado. El motor registra la duración de las derrotas en el JSON.

| Vida al entrar | Categoría | Victorias | Duración (s) | HP restante | % restante | Daño a HP | Escudo consumido |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 55% | C | 0/20 | — | — | — | — | — |
| 55% | D | 2/20 | 42 | 53,6 | 3,2 | 1.236,4 | 220 |
| 55% | E | 7/20 | 32,6 | 255,4 | 14 | 1.171,7 | 191,4 |
| 72% | C | 2/20 | 48 | 92,7 | 5,2 | 1.673,7 | 270 |
| 72% | D | 7/20 | 42 | 206,1 | 11,4 | 1.558,4 | 191,4 |
| 72% | E | 15/20 | 38,6 | 337,1 | 17,6 | 1.474,4 | 204 |
| 85% | C | 8/20 | 49 | 176,6 | 9,2 | 1.931,8 | 252,5 |
| 85% | D | 10/20 | 43,3 | 341,4 | 18,2 | 1.710,9 | 192 |
| 85% | E | 17/20 | 41,3 | 477,1 | 24,5 | 1.604 | 211,8 |
| 100% | C | 16/20 | 51,7 | 303,1 | 16,2 | 2.015,9 | 228,8 |
| 100% | D | 16/20 | 47,2 | 471,7 | 24,5 | 1.891,9 | 208,8 |
| 100% | E | 20/20 | 45,2 | 608,7 | 31 | 1.799,7 | 215 |

Para comparar C y D en las mismas condiciones, se emparejó C1 con D1 y C2 con D2 frente al mismo jefe y porcentaje. La tabla muestra la diferencia media **D menos C** cuando ambas ganaron. Al 55% no hubo victorias comunes.

| Vida al entrar | Pares con dos victorias | Duración (s) | HP restante | Puntos de HP% restante | Daño a HP | Escudo consumido |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 72% | 2 | -9,1 | 128,9 | 6,8 | -128,9 | -110 |
| 85% | 6 | -7,5 | 135,8 | 6,7 | -135,8 | -106,7 |
| 100% | 15 | -4,9 | 169,5 | 8,4 | -121,9 | -21,3 |

### Dependencia de efectos temporales

Se repitieron las configuraciones C y D que usan mejoras temporales. La segunda ejecución conserva curación, escudo, armadura y recarga pasiva y desactiva únicamente los efectos temporales del héroe. La última columna toma solo los pares en los que se ganó de las dos maneras.

| Categoría | Duelos emparejados | Victorias con mejoras | Victorias con mejoras desactivadas | Segundos que ahorran las mejoras |
| --- | ---: | ---: | ---: | ---: |
| C | 40 | 19 | 13 | 2,3 |
| D | 80 | 35 | 26 | 2,9 |

Las 40 derrotas de las builds A y B y los 120 duelos de referencia se reprodujeron con los mismos resultados. Entre las builds E, entrar al 55% dejó 13 derrotas de 20, frente a 0 de 20 a vida completa. Estas cifras corresponden a las configuraciones medidas.

### Poción, escudo y fusiones

Las 880 simulaciones de equipo cambian una sola pieza cada vez, o la sustituyen por sus ingredientes del catálogo. Cada fila se prueba contra los diez jefes con el resto de la mochila indicado por C1, C2 o D1. La mochila de cada variante se coloca con las reglas de espacio y fusión del juego. El porcentaje de vida se aplica al máximo de cada variante, que puede variar si el cambio aporta vitalidad.

| Equipo en la plaza medida | 55% | 72% | 85% | 100% |
| --- | ---: | ---: | ---: | ---: |
| Curación C1 · sin consumible | 0/10 | 0/10 | 0/10 | 3/10 |
| Curación C1 · Poción de curación | 0/10 | 0/10 | 1/10 | 8/10 |
| Curación C1 · Completo Italiano | 0/10 | 2/10 | 7/10 | 10/10 |
| Curación C1 · Poción Superior | 0/10 | 7/10 | 8/10 | 10/10 |
| Curación C2 · sin consumible | 0/10 | 0/10 | 0/10 | 0/10 |
| Curación C2 · dos pociones básicas | 0/10 | 0/10 | 0/10 | 1/10 |
| Curación C2 · Poción Superior | 0/10 | 0/10 | 1/10 | 6/10 |
| Escudo C1 · sin escudo | 0/10 | 0/10 | 2/10 | 7/10 |
| Escudo C1 · Escudo básico | 0/10 | 0/10 | 4/10 | 8/10 |
| Escudo C1 · dos escudos básicos | 0/10 | 1/10 | 5/10 | 9/10 |
| Escudo C1 · barrera de Ki o Chakra | 0/10 | 2/10 | 7/10 | 10/10 |
| Escudo C1 · Escudo Reforzado | 0/10 | 3/10 | 8/10 | 10/10 |
| Armadura C1 · armaduras de campaña fusionadas | 0/10 | 2/10 | 7/10 | 10/10 |
| Armadura C1 · ingredientes equipados por separado | 0/10 | 0/10 | 1/10 | 7/10 |
| Armadura C2 · Coraza Blindada | 0/10 | 0/10 | 1/10 | 6/10 |
| Armadura C2 · armadura y casco por separado | 0/10 | 0/10 | 0/10 | 0/10 |
| Apoyo D1 · Brazales Guardianes | 1/10 | 5/10 | 7/10 | 9/10 |
| Apoyo D1 · guantes y escudo por separado | 0/10 | 4/10 | 7/10 | 9/10 |
| Arma C1 · Báculo Kaioken o Clones del Kyubi | 0/10 | 2/10 | 7/10 | 10/10 |
| Arma C1 · ingredientes equipados por separado | 0/10 | 0/10 | 2/10 | 5/10 |

- Con C1 al 72%, la Poción Superior convirtió 2 de 10 victorias con Completo Italiano en 7 de 10. A ese porcentaje, Completo Italiano conserva una ventaja de recarga y Poción Superior aporta 35% de curación. La potencia del resto de la mochila importa. C2 al 72% perdió los diez duelos incluso con Poción Superior.
- Al 85%, C1 ganó 8 de 10 con Escudo Reforzado, 5 de 10 con sus dos ingredientes y 2 de 10 con la plaza vacía. El escudo fusionado aporta 320 de absorción inicial frente a 180 de los dos escudos básicos.
- Al 85%, fusionar la armadura de campaña elevó C1 de 1 a 7 victorias. En D1, los Brazales Guardianes conservaron la recarga de los Guantes rápidos y añadieron 70 de escudo frente a llevar los ingredientes separados. En los siete duelos ganados de las dos formas al 85%, el tiempo medio coincidió y la fusión dejó 70 HP más.
- Al 85%, Báculo Kaioken y Clones del Kyubi elevaron C1 de 2 a 7 victorias en conjunto frente a llevar sus ingredientes separados y liberaron dos casillas. Contra Orochimaru, C1 al 85% ganó con 254 HP usando Poción Superior. Contra Gaara y Pain, esa sustitución dejó al jefe con 4 y 30 HP respectivamente y C1 perdió en ambos casos.

### Vida durante las 46 etapas

Se repitieron las 18 expediciones de tienda, con compras, fusiones y recuperación reales. En las 9 que completaron las 46 etapas, el héroe llegó con el 100% de su vida a los cinco jefes. Son 45 entradas registradas en rutas deterministas. Las compras que aumentan la vida máxima pueden reducir el porcentaje actual inmediatamente después de equiparlas. La recuperación entre etapas añade 72% del máximo que tenía el héroe en ese momento y respeta el límite de vida. La ruta de control ilustra otro límite: llegó con el 100% a Cell y Pain y perdió ante ambos.

| Campaña | Ruta con 0 renovaciones al abrir | Etapas ganadas | Vida de entrada en orden de jefe | Último combate |
| --- | --- | ---: | --- | --- |
| Goku | Control | 40 | 89% / 100% / 100% / 100% | Cell · derrota |
| Goku | Fusiones | 46 | 100% / 100% / 100% / 100% / 100% | Majin Buu · victoria |
| Goku | Defensa | 46 | 100% / 100% / 100% / 100% / 100% | Majin Buu · victoria |
| Naruto | Control | 45 | 87,3% / 100% / 100% / 100% / 100% | Pain · derrota |
| Naruto | Fusiones | 46 | 100% / 100% / 100% / 100% / 100% | Pain · victoria |
| Naruto | Defensa | 46 | 100% / 100% / 100% / 100% / 100% | Pain · victoria |

```powershell
node scripts/simulate-combat.mjs --boss-preparation --purchase-routes
```

El JSON incluye el HP inicial y final, el escudo disponible y consumido, el daño recibido, las curaciones, las activaciones, el equipo y los resultados de cada variante. Las comparaciones de equipo suponen que ya se poseen las piezas. Las rutas de tienda verifican por separado qué se compró y fusionó durante la expedición.

Edge comprobó el aviso y la navegación a preparación y combate a 1280 px con Piccolo y a 390 px con Zabuza.

## Jefes principales y fases fuertes

Hay cinco jefes por campaña. Piccolo cierra el primer mundo de Goku y Raditz conserva su puesto en los encuentros normales. Cada fase se activa una vez, por debajo del porcentaje de HP indicado, mediante los mismos efectos temporales y eventos que usan los objetos. La arena muestra el aura, el nombre de la fase, el daño y la absorción de escudo. El informe muestra la vida restante del jefe y cuándo se activó la fase.

Los DPS de esta tabla son brutos, antes de armadura y escudos. El valor anterior y el nuevo en apertura coinciden. La vida efectiva inicial multiplica la suma de HP y escudo por `1 + armadura/100`. La mitigación temporal se resuelve golpe a golpe. La cura de Buu añade hasta 447 HP reales, equivalentes a 639 HP brutos con su armadura. Gaara gana 180 de escudo inicial.

| Jefe | HP / escudo nuevo / armadura | Vida efectiva anterior → nueva | DPS anterior → apertura / fase | Fase fuerte |
| --- | ---: | ---: | ---: | --- |
| Piccolo | 3.182 / 101 / 27 | 4.169 → 4.169 | 43 → 43 / 55,1 | < 48% · Ki concentrado · +28% de daño · 13 s |
| Vegeta | 3.901 / 115 / 31 | 5.261 → 5.261 | 56,1 → 56,1 / 75,9 | < 46% · Orgullo saiyajin · +58% de daño en su especial de Ki, −12% de recarga · 14 s |
| Freezer | 4.165 / 130 / 35 | 5.798 → 5.798 | 59,4 → 59,4 / 89,2 | < 53% · Asalto a máxima potencia · +14% de daño, −24% de recarga · 15 s |
| Cell | 4.644 / 144 / 39 | 6.655 → 6.655 | 65,3 → 65,3 / 82,2 | < 50% · Perfección defensiva · +26% de daño, −22% de daño recibido · 13 s |
| Majin Buu | 5.588 / 158 / 43 | 8.217 → 8.217 | 60,3 → 60,3 / 79,5 | < 40% · Regeneración de Majin Buu · +32% de daño, cura 447 HP una vez · 16 s |
| Zabuza | 3.182 / 101 / 27 | 4.169 → 4.169 | 41,5 → 41,5 / 54,8 | < 50% · Ofensiva de la Niebla · +32% de daño · 14 s |
| Orochimaru | 3.901 / 115 / 31 | 5.261 → 5.261 | 54,7 → 54,7 / 64,6 | < 58% · Piel de serpiente · +18% de daño, −24% de daño recibido · 15 s |
| Gaara | 4.208 / 310 / 35 | 5.856 → 6.099 | 57,9 → 57,9 / 64,3 | < 52% · Defensa de arena · −10% de recarga, −26% de daño recibido · 13 s |
| Itachi | 4.600 / 144 / 39 | 6.594 → 6.594 | 58,9 → 58,9 / 82,6 | < 48% · Ventana de Amaterasu · +62% de daño en Amaterasu, −14% de recarga · 16 s |
| Pain | 5.540 / 158 / 43 | 8.148 → 8.148 | 60,3 → 60,3 / 96,8 | < 38% · Repulsión final · +38% de daño, −14% de recarga · 14 s |

### Derrota garantizada para la categoría insuficiente

Cada fila define tres topes **simultáneos**. `U` es el máximo DPS bruto sostenido, `V` el daño extra de la primera descarga lista en el segundo cero y `R` la resistencia total a daño bruto. Se usan los máximos hacia arriba de las dos mochilas A y las dos B del jefe. La cota de ráfaga de los primeros diez segundos es `U + V/10`. Para las muestras, las cotas de ataque suponen que todas las mejoras aplicables duran toda la pelea. La cota de defensa suma HP inicial, escudo y todas las curaciones nominales, aunque parte pudiera desperdiciarse, multiplica por la armadura y aplica la mejor guardia temporal de forma permanente.

| Jefe | U · DPS | V · daño bruto | R · daño bruto soportable | Supervivencia máxima (s) | Primera victoria posible (s) | Daño bruto enemigo antes de esa victoria |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Piccolo | 38 | 73 | 2426 | 52 | 107,8 | 4.824 |
| Vegeta | 43 | 82 | 2727 | 45 | 120,4 | 6.908 |
| Freezer | 46 | 87 | 2877 | 46,4 | 124,2 | 7.414 |
| Cell | 48 | 92 | 3027 | 43,4 | 136,7 | 9.195 |
| Majin Buu | 51 | 97 | 3177 | 47,5 | 159,2 | 9.712 |
| Zabuza | 39 | 69 | 2266 | 50,7 | 105,1 | 4.481 |
| Orochimaru | 44 | 78 | 2543 | 44,8 | 117,8 | 6.548 |
| Gaara | 47 | 83 | 2682 | 44,8 | 128 | 7.547 |
| Itachi | 49 | 87 | 2820 | 44,2 | 132,8 | 7.973 |
| Pain | 52 | 92 | 2959 | 45,6 | 154,9 | 9.517 |

Con estos topes, el héroe puede causar como máximo `V + U × t`. Para ganar necesita que ese valor alcance la vida efectiva del jefe. La otra condición necesaria es soportar el daño programado del jefe **estrictamente antes** de ese instante, porque el jugador golpea primero si ambos ataques coinciden. La simulación ordena los golpes de cada arma desde el segundo cero según sus recargas. Para la prueba se omiten las fases, lo que concede al héroe el mejor caso posible, y aun así el daño supera `R` antes del primer instante de victoria de las diez filas. Cubre cualquier mochila que respete los tres topes del jefe. Para una mochila que supere alguno, el desenlace depende del combate real. El número de fusiones no interviene en esta condición ni en el motor.

### Duelos con mochilas legales

Se probaron **120 duelos** con la experiencia correspondiente a cada etapa, piezas que caben en la mochila del mundo y el motor real en pasos de 100 ms. **V** es victoria y **D** es derrota. Los valores son segundos. Las dos primeras variantes de E comienzan con la vida completa. La tercera usa E2 al 55% de vida inicial como prueba de desgaste. M combina equipamiento inicial con una transformación de nivel 6.

| Jefe | A · inicial | B · insuficiente | C · buena | D · excelente | E · excepcional | M · inicial + mítica |
| --- | --- | --- | --- | --- | --- | --- |
| Piccolo | D 31,2 / D 37 | D 52 / D 41,6 | V 51,4 / V 59,2 | V 41,6 / V 45,5 | V 41,6 / V 44,4 / V 41 | D 33,3 |
| Vegeta | D 27 / D 32 | D 45 / D 36 | V 45,4 / V 50,2 | V 45,8 / V 50,5 | V 41,7 / V 45,5 / D 39,7 | D 28,8 |
| Freezer | D 28,8 / D 31,9 | D 46,4 / D 37,7 | V 47,2 / V 52,4 | V 48,6 / V 53,6 | V 43 / V 47,4 / D 41,7 | D 29 |
| Cell | D 27,9 / D 28,8 | D 43,4 / D 37,2 | V 45,4 / D 55,8 | V 37,8 / D 58,9 | V 35,5 / V 56,7 / D 43,4 | D 28,8 |
| Majin Buu | D 29,2 / D 34,8 | D 47,5 / D 40,2 | V 54 / D 58,4 | V 45,8 / D 69,4 | V 41,6 / V 68 / D 46,4 | D 32,9 |
| Zabuza | D 31,2 / D 35,1 | D 50,7 / D 39 | V 55,8 / V 58,2 | V 44,6 / V 42,5 | V 39,4 / V 42,5 / V 31,7 | D 31,2 |
| Orochimaru | D 28,2 / D 28,8 | D 44,8 / D 35,2 | V 52,2 / V 53 | V 54,3 / V 52,8 | V 44,3 / V 43,6 / D 37,6 | D 28,2 |
| Gaara | D 25,6 / D 29,7 | D 44,8 / D 35,2 | V 57 / D 58 | D 58 / V 57,2 | V 50,1 / V 48,5 / D 40,2 | D 25,6 |
| Itachi | D 27,2 / D 30,9 | D 44,2 / D 37,4 | V 44,6 / V 48,3 | V 36,2 / V 54,9 | V 32,2 / V 46,2 / D 38,6 | D 27,2 |
| Pain | D 29,2 / D 32,9 | D 45,6 / D 36,5 | V 53,3 / D 54,7 | V 42,7 / D 59,8 | V 37,4 / V 54,8 / D 38,7 | D 29,2 |

Resultados observados de victoria en las configuraciones medidas: A **0/20**, B **0/20**, C **16/20** (44,6–59,2 s), D **16/20** (36,2–57,2 s), E **20/20** a vida completa (31,7–68 s incluyendo las victorias con desgaste) y **2/10** al 55% de vida. M perdió los diez duelos. Estos resultados describen las mochilas probadas. La garantía para A y B sale de los topes calculados arriba.

La tabla siguiente muestra una **victoria C comprobada** por jefe. El DPS real incluye daño a HP y a escudos después de la mitigación. La ráfaga mide los primeros diez segundos y el daño a HP se mide sin el escudo. Las variantes usadas y sus listas completas de objetos se reproducen con `--bosses`.

| Jefe / build | DPS jugador sostenido / ráfaga | DPS recibido efectivo | HP inicial / escudo / armadura / cura | Escudo absorbido héroe / jefe | Daño a HP causado / recibido | Fase / victoria (s) | HP final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Piccolo · C1 | 63,8 / 73,3 | 32,8 | 1.760 / 260 / 40 / 352 | 260 / 101 | 3.182 / 1.428 | 27,1 / 51,4 | 684 |
| Vegeta · C1 | 88,5 / 100,1 | 47,2 | 1.970 / 260 / 40 / 394 | 260 / 115 | 3.901 / 1.880 | 23,7 / 45,4 | 484 |
| Freezer · C1 | 91 / 102,8 | 51 | 2.075 / 260 / 40 / 415 | 260 / 130 | 4.165 / 2.147 | 22,4 / 47,2 | 343 |
| Cell · C1 | 105,6 / 123,9 | 51,9 | 2.180 / 260 / 40 / 436 | 260 / 144 | 4.644 / 2.095 | 21,5 / 45,4 | 521 |
| Majin Buu · C1 | 114,7 / 126,6 | 48,6 | 2.285 / 260 / 40 / 457 | 260 / 158 | 6.035 / 2.363 | 29,1 / 54 | 379 |
| Zabuza · C1 | 58,8 / 61,8 | 33,3 | 1.680 / 280 / 38 / 336 | 280 / 101 | 3.182 / 1.578 | 28,5 / 55,8 | 438 |
| Orochimaru · C1 | 76,9 / 87,6 | 43,7 | 1.880 / 280 / 38 / 376 | 280 / 115 | 3.901 / 2.002 | 21,2 / 52,2 | 254 |
| Gaara · C1 | 79,2 / 90 | 44,4 | 1.980 / 280 / 38 / 396 | 280 / 310 | 4.208 / 2.251 | 26,8 / 57 | 125 |
| Itachi · C1 | 106,3 / 112,2 | 50,8 | 2.080 / 280 / 38 / 416 | 280 / 144 | 4.600 / 1.988 | 23,5 / 44,6 | 508 |
| Pain · C1 | 106,8 / 114,7 | 52,8 | 2.180 / 280 / 38 / 436 | 280 / 158 | 5.540 / 2.539 | 33 / 53,3 | 77 |

En Goku, la ruta de fusiones combina Báculo Energizado, nivel 5, recarga y Armadura Saiyajin Superior. Frente a Cell pasa de perder con 301 HP enemigos en el control a ganar con 836 HP propios. La ruta defensiva cambia parte de la cadencia por Coraza Blindada y derrota a Majin Buu en 56,2 s con 1014 HP. En Naruto, Chaleco de Resistencia y Brazaletes Guardianes combinan vida, escudo y recarga. La ruta con Clones del Kyubi vence a Pain en 36,9 s. La variante defensiva con Coraza Blindada tarda 51,2 s. Las dos son victorias sin transformación mítica. Los duelos C sostienen el objetivo orientativo de 45–75 s; varias configuraciones avanzadas lo acortan con daño efectivo.

### Expediciones con compras reales

Las rutas usan las ofertas, oro, compras, colocaciones, fusiones y recuperación del juego. El motor del duelo y la rotación de la tienda son deterministas. Se varió la apertura con 0, 1 y 3 renovaciones pagadas con oro de la partida. Las tablas de tiempos por jefe siguen el orden de cada campaña. La columna de etapas cuenta victorias, hasta 46. Las primeras once etapas de cada ruta de control con cero renovaciones coinciden en tiempos y HP final con la medición previa. Las rutas ya divergen tras los jefes por vida remanente, equipo y compras. Se completaron 9 de 18 rutas probadas.

| Héroe | Compra | Renovaciones iniciales | Etapas ganadas | Jefes enfrentados (s) | Último encuentro |
| --- | --- | ---: | ---: | --- | --- |
| Goku | Control | 0 | 40 | V 39,1 / V 42 / V 44,2 / D 48 | Cell · D 48 · 301 HP de rival |
| Goku | Control | 1 | 40 | V 39,1 / V 42 / V 44,2 / D 48 | Cell · D 48 · 301 HP de rival |
| Goku | Control | 3 | 11 | D 33,3 | Piccolo · D 33,3 · 412 HP de rival |
| Goku | Fusiones | 0 | 46 | V 39,1 / V 38,5 / V 40,6 / V 39,5 / V 46,9 | Majin Buu · V 46,9 · 721 HP de héroe |
| Goku | Fusiones | 1 | 46 | V 39,1 / V 38,5 / V 40,6 / V 39,5 / V 46,9 | Majin Buu · V 46,9 · 721 HP de héroe |
| Goku | Fusiones | 3 | 11 | D 33,3 | Piccolo · D 33,3 · 412 HP de rival |
| Goku | Defensa | 0 | 46 | V 37,3 / V 38,5 / V 40,6 / V 46,9 / V 56,2 | Majin Buu · V 56,2 · 1.014 HP de héroe |
| Goku | Defensa | 1 | 46 | V 37,3 / V 38,5 / V 40,6 / V 46,9 / V 56,2 | Majin Buu · V 56,2 · 1.014 HP de héroe |
| Goku | Defensa | 3 | 46 | V 37,3 / V 38,5 / V 40,6 / V 46,9 / V 56,2 | Majin Buu · V 56,2 · 1.014 HP de héroe |
| Naruto | Control | 0 | 45 | V 37,8 / V 44,6 / V 48,6 / V 47,4 / D 52,5 | Pain · D 52,5 · 330 HP de rival |
| Naruto | Control | 1 | 45 | V 37,8 / V 44,6 / V 48,6 / V 47,4 / D 52,5 | Pain · D 52,5 · 330 HP de rival |
| Naruto | Control | 3 | 3 | — | Haku · D 25,8 · 101 HP de rival |
| Naruto | Fusiones | 0 | 46 | V 37,8 / V 41,3 / V 45,7 / V 31,1 / V 36,9 | Pain · V 36,9 · 1.000 HP de héroe |
| Naruto | Fusiones | 1 | 46 | V 37,8 / V 41,3 / V 45,7 / V 31,1 / V 36,9 | Pain · V 36,9 · 1.000 HP de héroe |
| Naruto | Fusiones | 3 | 3 | — | Haku · D 25,8 · 101 HP de rival |
| Naruto | Defensa | 0 | 46 | V 37,8 / V 41,3 / V 45,7 / V 43,5 / V 51,2 | Pain · V 51,2 · 982 HP de héroe |
| Naruto | Defensa | 1 | 46 | V 37,8 / V 41,3 / V 45,7 / V 43,5 / V 51,2 | Pain · V 51,2 · 982 HP de héroe |
| Naruto | Defensa | 3 | 3 | — | Haku · D 25,8 · 101 HP de rival |

La primera pasada de control, antes de añadir las fases, ganó las dos expediciones. En orden de mundo, los jefes tardaron 39,1, 42, 44,2, 48,8, 56,6 s con Goku y 37,8, 41,7, 44,4, 47,4, 55,8 s con Naruto. La tabla anterior conserva el orden de compra y mide el cambio con las fases activas.

```powershell
node scripts/simulate-combat.mjs --bosses --purchase-routes
```

El JSON incluye resultado y duración de cada duelo, DPS de ambos lados, daño a HP, absorción, HP al entrar y al terminar, objetos, curaciones y segundos exactos de activación. Con `--purchase-routes` se añade el equipo y el resultado de cada etapa visitada.

### Validación de las fases

Edge mostró el aura, el aviso, el daño, los indicadores de escudo y el informe de Piccolo a **1280 px** y de Zabuza a **390 px**, sin desbordamiento horizontal. Las pruebas comprueban el umbral estricto de Buu, una sola activación, la expiración, la curación, el informe y su recuperación desde una victoria pendiente.

## Mediciones de calibraciones anteriores

Raditz inflige **54 HP cada 1,85 s** a Goku sin armadura. Con Báculo y Esferas de Ki, Goku gana el primer combate en **21 s** con **602 de 1250 HP**. Con solo Báculo, pierde en **42,55 s**. Ambas campañas siguen siendo completables con las compras y recompensas de la tienda verificadas en las pruebas.

## Seguimiento en las dos campañas completas

La ruta de compras medida recorre las 46 etapas de cada héroe, comprueba colocaciones reales de mochila y aplica la recuperación entre etapas. La simulación avanza el motor en pasos de 100 ms, igual que la partida. Los duelos de la calibración anterior se conservan más abajo como referencia histórica.

| Rango | Duración anterior | Duración actual | Dentro del objetivo antes → ahora |
| --- | ---: | ---: | ---: |
| Normal | 6–24 s | 16,50–26,40 s | 4 → 51 de 54 |
| Miniboss | 13,20–25,97 s | 19,50–39,64 s | 0 → 12 de 28 |
| Jefe principal | 30–56,64 s | 37,80–56,64 s | 4 → 4 de 10 |

La vida de los encuentros normales aumenta a partir de la tercera etapa. Los minibosses ganan vida y escudo y armadura según el mundo. La recuperación tras ganar pasó del 55% al 72% de la vida máxima. Piccolo y Zabuza espacian sus ataques pesados para que una build con defensa pueda aguantar el combate más largo.

| Referencia | Ajuste | Resultado medido |
| --- | --- | --- |
| Raditz inicial | 54 HP cada 1,85 s | Báculo y Esferas de Ki ganan en 21 s con 602 HP |
| Cui | 1079 → 1384 HP, 78 HP por ataque | Build defensiva gana en 49 s con 310 HP |
| Dodoria | 1267 → 1965 HP, 104 HP por ataque | Build ofensiva gana en 30,44 s con 608 HP |
| Piccolo | 47,59 → 43,04 DPS sostenidos al espaciar sus ataques | Sin fusiones gana en 58,04 s con 18 HP. Con fusiones gana en 51,44 s con 295 HP |
| Zabuza | 47,34 → 41,52 DPS sostenidos al espaciar sus ataques | Sin fusiones pierde con 23 HP enemigos. Con fusiones gana en 55,84 s con 23 HP |
| Majin Buu en campaña completa | Compra y recuperación entre etapas | Victoria en 56,64 s con 101 HP |
| Pain en campaña completa | Compra y recuperación entre etapas | Victoria en 55,84 s con 186 HP |

El motor procesa los apoyos elegibles en el mismo instante, reevalúa el umbral tras cada efecto y cancela los ataques pendientes una vez resuelto un golpe letal. La arena reproduce la reacción al impacto incluso si el escudo lo absorbe entero. Edge mostró el PNG original de Cui a 1280 px y su reacción con 1384 HP intactos y 14,1/46 de escudo. A 390 px comprobó el respaldo de Dodoria y Piccolo. Build, lint y 278 pruebas pasaron.

```powershell
node scripts/simulate-combat.mjs --campaign --hits
```

Queda observar los minibosses iniciales y los primeros jefes con otras rutas de compra. Los cinco PNG pendientes se listan en la sección de recursos.

## Calibración anterior

### Diagnóstico del daño de 9 HP

El Raditz inicial partía de un valor `4` en el catálogo. La definición de combate lo multiplicaba por `2,35` y redondeaba `9,4` a **9 HP**. Sin armadura ni escudo, esos 9 HP eran el daño real, con **4,86 DPS** a su cadencia de 1,85 s. A ese ritmo, el combate alcanzaba el límite de 120 s antes de que Raditz pudiera agotar los 1250 HP de Goku.

El motor aplica armadura con el factor `100 / (100 + armadura)` una sola vez. La guardia de Migatte multiplica el daño restante durante su efecto. Después se consume el escudo y el excedente resta HP. Los golpes extra de Ki, físicos y de clones siguen la misma ruta. El HUD lee el escudo y la vida de la misma actualización. El registro conserva cada golpe. Los números flotantes suman los que llegan en el mismo intervalo de actualización por objetivo y por tipo, de modo que la cifra de escudo se lee aparte del daño a la vida.

## Daño y cadencia enemigos

Cada fila usa la primera etapa en que aparece el enemigo. Los impactos y el DPS sostenido se calculan contra un objetivo sin defensa. La última columna simula cuánto tarda en caer un Goku de referencia con 1250 HP, sin armas ni defensa, con el motor real y el primer ataque disponible desde el inicio. **>120** indica que alcanzó el límite del encuentro.

| Enemigo · mundo.etapa | Impactos anteriores | Impactos nuevos | DPS anterior → nuevo | HP / escudo / armadura nuevos | Derrota de Goku antes → ahora (s) |
| --- | --- | --- | --- | --- | --- |
| Raditz · 1.1 | 9 cada 1,85 s | 54 cada 1,85 s | 4,86 → 29,19 | 706 / 0 / 0 | >120 → 42,55 |
| Cui · 1.4 | 13 cada 1,95 s | 78 cada 2,2 s | 6,67 → 35,45 | 1079 / 46 / 13 | >120 → 35,2 |
| Dodoria · 1.8 | 19 cada 2,55 s | 104 cada 2,78 s | 7,45 → 37,41 | 1267 / 48 / 15 | >120 → 33,36 |
| Piccolo · 1.12 | 18 cada 1,95 s + 18 cada 4,3 s | 108 cada 3,4 s + 144 cada 9,1 s | 13,42 → 47,59 | 2486 / 101 / 27 | 91,65 → 23,8 |
| Zarbon · 2.4 | 17 cada 1,89 s | 93 cada 2,2 s | 8,99 → 42,27 | 1445 / 57 / 17 | >120 → 28,6 |
| Guldo · 2.8 | 18 cada 1,7 s | 88 cada 2,02 s | 10,59 → 43,56 | 1387 / 59 / 19 | 117,3 → 28,28 |
| Vegeta · 2.12 | 23 cada 1,8 s + 35 cada 5,1 s | 121 cada 3,2 s + 165 cada 9 s | 19,64 → 56,15 | 3121 / 115 / 31 | 61,2 → 19,2 |
| Recoome · 3.1 | 22 cada 2,4 s + 15 cada 5,4 s | 109 cada 2,65 s + 109 cada 7,6 s | 11,94 → 55,47 | 1912 / 66 / 20 | 103,2 → 21,2 |
| Burter · 3.2 | 13 cada 1,05 s | 70 cada 1,44 s | 12,38 → 48,61 | 1705 / 67 / 21 | 100,8 → 24,48 |
| Jeice · 3.3 | 22 cada 2,1 s | 114 cada 2,48 s | 10,48 → 45,97 | 1865 / 68 / 22 | 117,6 → 24,8 |
| Capitán Ginyu · 3.4 | 19 cada 1,85 s + 19 cada 4,9 s | 98 cada 2,23 s + 117 cada 7,9 s | 14,15 → 58,76 | 2081 / 70 / 23 | 86,95 → 20,07 |
| Freezer · 3.5 | 28 cada 1,83 s + 42 cada 5,8 s | 118 cada 2,9 s + 180 cada 9,6 s | 22,54 → 59,44 | 3786 / 130 / 35 | 53,07 → 19,2 |
| Androide 19 · 4.4 | 27 cada 2,7 s | 147 cada 2,88 s | 10 → 51,04 | 2227 / 78 / 25 | >120 → 23,04 |
| Dr. Gero · 4.8 | 25 cada 2,2 s | 127 cada 2,55 s | 11,36 → 49,8 | 2225 / 79 / 27 | 107,8 → 22,95 |
| Cell · 4.12 | 34 cada 1,81 s + 50 cada 5,8 s | 139 cada 3,1 s + 196 cada 9,6 s | 27,41 → 65,26 | 4644 / 144 / 39 | 43,44 → 18,6 |
| Pui Pui · 5.1 | 26 cada 2,1 s | 138 cada 2,55 s | 12,38 → 54,12 | 2387 / 86 / 28 | 100,8 → 22,95 |
| Yakon · 5.2 | 30 cada 2,5 s | 166 cada 3,02 s | 12 → 54,97 | 2650 / 88 / 29 | 102,5 → 21,14 |
| Babidi · 5.3 | 23 cada 1,73 s | 123 cada 2,22 s | 13,29 → 55,41 | 2233 / 89 / 30 | 93,42 → 22,2 |
| Dabura · 5.4 | 30 cada 2,3 s + 27 cada 5,6 s | 151 cada 2,79 s + 147 cada 8,9 s | 17,86 → 70,64 | 2897 / 90 / 31 | 67,2 → 16,74 |
| Majin Buu · 5.5 | 41 cada 1,7 s + 58 cada 5,7 s | 152 cada 3,65 s + 216 cada 11,6 s | 34,29 → 60,26 | 5588 / 158 / 43 | 34,2 → 18,25 |
| Ninja de la Niebla · 1.1 | 7 cada 1,45 s | 46 cada 1,45 s | 4,83 → 31,72 | 693 / 0 / 0 | >120 → 39,15 |
| Ninja de la Hoja · 1.2 | 9 cada 1,85 s | 54 cada 1,85 s | 4,86 → 29,19 | 687 / 0 / 0 | >120 → 42,55 |
| Ninja del Sonido · 1.3 | 10 cada 1,7 s | 52 cada 1,7 s | 5,88 → 30,59 | 748 / 0 / 0 | >120 → 40,8 |
| Haku · 1.4 | 13 cada 1,46 s + 13 cada 4,7 s | 76 cada 2,15 s + 76 cada 8,8 s | 11,67 → 43,99 | 1114 / 46 / 13 | 106,58 → 26,4 |
| Ninja de la Arena · 1.5 | 12 cada 2,2 s | 64 cada 2,2 s | 5,45 → 29,09 | 791 / 0 / 1 | >120 → 41,8 |
| Ninja de la Nube · 1.6 | 10 cada 1,65 s | 51 cada 1,65 s | 6,06 → 30,91 | 745 / 0 / 2 | >120 → 39,6 |
| Ninja de la Lluvia · 1.7 | 12 cada 2,1 s | 62 cada 2,1 s | 5,71 → 29,52 | 794 / 0 / 2 | >120 → 42 |
| Mizuki · 1.8 | 19 cada 2,37 s | 101 cada 2,59 s | 8,02 → 39 | 1249 / 48 / 15 | >120 → 31,08 |
| Zabuza · 1.12 | 20 cada 2,01 s + 20 cada 4,7 s | 113 cada 3,5 s + 143 cada 9,5 s | 14,21 → 47,34 | 2486 / 101 / 27 | 86,43 → 24,5 |
| Dosu · 2.4 | 17 cada 1,87 s | 86 cada 2,22 s | 9,09 → 38,74 | 1424 / 57 / 17 | >120 → 31,08 |
| Zaku · 2.8 | 21 cada 2,12 s | 111 cada 2,67 s | 9,91 → 41,57 | 1495 / 59 / 19 | >120 → 29,37 |
| Orochimaru · 2.12 | 23 cada 1,83 s + 32 cada 4,85 s | 119 cada 3,2 s + 165 cada 9,4 s | 19,17 → 54,74 | 3121 / 115 / 31 | 63,05 → 19,2 |
| Kin · 3.1 | 15 cada 1,4 s | 76 cada 1,71 s | 10,71 → 44,44 | 1622 / 66 / 20 | 116,2 → 27,36 |
| Kankurō · 3.2 | 22 cada 2,05 s | 106 cada 2,39 s | 10,73 → 44,35 | 1853 / 67 / 21 | 114,8 → 26,29 |
| Temari · 3.3 | 22 cada 1,8 s | 112 cada 2,36 s | 12,22 → 47,46 | 1915 / 68 / 22 | 100,8 → 25,96 |
| Kabuto · 3.4 | 26 cada 2,4 s | 128 cada 2,79 s | 10,83 → 45,88 | 1978 / 70 / 23 | 115,2 → 25,11 |
| Gaara · 3.5 | 28 cada 1,85 s + 42 cada 5,7 s | 127 cada 3,2 s + 180 cada 9,9 s | 22,5 → 57,87 | 3825 / 130 / 35 | 53,65 → 19,8 |
| Kimimaro · 4.4 | 27 cada 1,85 s + 24 cada 5,2 s | 123 cada 2,55 s + 125 cada 8,2 s | 19,21 → 63,48 | 2313 / 78 / 25 | 62,9 → 17,85 |
| Tayuya · 4.8 | 25 cada 1,9 s | 121 cada 2,38 s | 13,16 → 50,84 | 2254 / 79 / 27 | 93,1 → 23,8 |
| Itachi · 4.12 | 34 cada 1,86 s + 50 cada 5,8 s | 134 cada 3,4 s + 201 cada 10,3 s | 26,9 → 58,93 | 4600 / 144 / 39 | 44,64 → 20,4 |
| Jirōbō · 5.1 | 33 cada 2,61 s | 161 cada 2,87 s | 12,64 → 56,1 | 2672 / 86 / 28 | 96,57 → 20,09 |
| Kidōmaru · 5.2 | 30 cada 2,21 s | 138 cada 2,63 s | 13,57 → 52,47 | 2521 / 88 / 29 | 90,61 → 23,67 |
| Sakon y Ukon · 5.3 | 26 cada 1,61 s | 132 cada 2,35 s | 16,15 → 56,17 | 2625 / 89 / 30 | 77,28 → 21,15 |
| Konan · 5.4 | 30 cada 1,96 s + 23 cada 5,15 s | 141 cada 2,64 s + 133 cada 8,5 s | 19,77 → 69,06 | 2798 / 90 / 31 | 61,8 → 15,84 |
| Pain · 5.5 | 41 cada 1,72 s + 58 cada 5,65 s | 151 cada 3,65 s + 216 cada 11,4 s | 34,1 → 60,32 | 5540 / 158 / 43 | 34,4 → 18,25 |

## Daño, cadencia y espacio de las armas

Las cifras usan héroes de nivel 1. Los términos separados por `+` son el golpe principal y los impactos adicionales de una activación. La cadencia cuenta activaciones del arma, y cada impacto extra se resuelve por separado. El DPS por casilla divide el DPS base por la huella real del objeto. La columna de armadura 13 incluye el DPS efectivo sostenido y su valor mientras está activa la mejora de apertura propia del arma.

| Arma | Nivel / casillas | Daño por ciclo antes → ahora | Activaciones/s antes → ahora | DPS base antes → ahora | DPS con armadura 13 / mejora propia | DPS base por casilla |
| --- | --- | --- | --- | --- | --- | --- |
| Báculo | 1 / 2 | 11 → 18 | 0,83 → 0,83 | 9,17 → 15 | 13,27 / 13,27 | 7,5 |
| Esferas de Ki | 2 / 2 | 14 → 25 | 0,71 → 0,71 | 10 → 17,86 | 15,8 / 15,8 | 8,93 |
| Kamehameha | 4 / 4 | 20 → 63 | 0,56 → 0,43 | 11,11 → 27,39 | 24,24 / 24,24 | 6,85 |
| Genkidama | 5 / 5 | 23 → 126 | 0,5 → 0,27 | 11,5 → 34,52 | 30,55 / 30,55 | 6,9 |
| Genkidama concentrada | 5 / 5 | 23 → 110 | 0,5 → 0,33 | 11,5 → 35,77 | 31,66 / 31,66 | 7,15 |
| Kunai | 1 / 2 | 11 → 15 | 0,83 → 0,98 | 9,17 → 14,71 | 13,01 / 13,01 | 7,35 |
| Clones de sombra | 2 / 2 | 14 → 17 + 8 | 0,71 → 0,71 | 10 → 17,86 | 15,8 / 15,8 | 8,93 |
| Rasengan | 4 / 4 | 20 → 60 | 0,56 → 0,48 | 11,11 → 28,57 | 25,28 / 25,28 | 7,14 |
| Rasenshuriken | 5 / 5 | 23 → 98 | 0,5 → 0,34 | 11,5 → 33,79 | 29,91 / 29,91 | 6,76 |
| Rasenshuriken de Kurama | 5 / 5 | 23 → 90 + 19 | 0,5 → 0,34 | 11,5 → 36,95 | 32,7 / 32,7 | 7,39 |
| Báculo Energizado | 2 / 2 | 15 + 9 → 26 + 16 | 0,83 → 0,67 | 20 → 28 | 24,78 / 24,78 | 14 |
| Doble Ráfaga de Ki | 3 / 2 | 18 → 24 + 18 | 1,14 → 0,74 | 20,57 → 30,88 | 27,33 / 27,33 | 15,44 |
| Báculo Kaioken | 4 / 3 | 22 + 6 → 35 + 17 | 0,85 → 0,66 | 23,73 → 34,21 | 30,27 / 39,36 | 11,4 |
| Kamehameha Potenciado | 5 / 4 | 42 → 88 | 0,79 → 0,44 | 33,33 → 39,11 | 34,61 / 34,61 | 9,78 |
| Kunais Gemelos | 2 / 2 | 11 + 12 → 16 + 15 | 0,83 → 0,88 | 19,17 → 27,43 | 24,28 / 24,28 | 13,72 |
| Kunais de las Sombras | 3 / 2 | 13 + 12 → 19 + 16 | 0,78 → 0,83 | 19,53 → 29,17 | 25,81 / 25,81 | 14,58 |
| Clones del Kyubi | 4 / 3 | 15 + 12 → 24 + 12 + 10 | 0,71 → 0,71 | 19,29 → 32,86 | 29,08 / 29,08 | 10,95 |
| Rasengan del Kyubi | 5 / 4 | 27 → 69 + 13 | 0,63 → 0,48 | 16,88 → 39,05 | 34,56 / 44,92 | 9,76 |

### DPS por nivel

| Nivel | DPS base anterior | DPS base nuevo | DPS nuevo con armadura 13 |
| --- | --- | --- | --- |
| 1 | 9,17–9,17 | 14,71–15 | 13,01–13,27 |
| 2 | 10–20 | 17,86–28 | 15,8–24,78 |
| 3 | 19,53–20,57 | 29,17–30,88 | 25,81–27,33 |
| 4 | 11,11–23,73 | 27,39–34,21 | 24,24–30,27 |
| 5 | 11,5–33,33 | 33,79–39,11 | 29,91–34,61 |
| 6 | ×1,35 / ×1,45 durante las formas | Migatte ×1,55 · Barión ×2,50 durante la recarga | Proporcional al DPS de las armas equipadas |

Las fusiones intermedias conservan valor por casilla. Doble Ráfaga y Kunais de las Sombras concentran ataques en dos casillas, mientras que Genkidama, Kamehameha Potenciado y Rasengan del Kyubi ofrecen impactos mayores. Cada nivel ganado aplica al golpe principal y a los adicionales el multiplicador RPG de **+7,5 puntos porcentuales de daño base**. Los Guantes rápidos y los Brazales Guardianes reducen la recarga base un **8%** por pieza, con un tope acumulado del **40%**. Completo Italiano combina una curación del **20% de la vida máxima** con una reducción temporal de recarga del **15%**. Para cada arma se aplica la mejora de daño temporal más fuerte que le corresponda. Si coinciden Italiano y Barión, se aplica la reducción temporal de recarga más fuerte.

## Transformaciones míticas

| Forma | Activación | Ventaja temporal | Duración |
| --- | --- | --- | --- |
| Migatte no Gokui | Menos del 48% de HP | +55% de daño y −35% de daño recibido después de la armadura | 11 s |
| Modo Barión | Menos del 48% de HP | +90% de daño y −24% de tiempo de recarga | 7 s |

Cada forma se activa una vez por combate, incluso con dos copias equipadas. El evento resuelto activa el sprite y el panel muestra ambos temporizadores hasta que vencen. Con la misma build de nivel 5, Migatte llevó a Majin Buu de **68,96 s y 13,43 HP** a **62,81 s y 290 HP**. Contra Pain, la build de control perdió con **298,63 HP enemigos** restantes, y Modo Barión ganó en **54,82 s con 362,67 HP**. Las dos formas perdieron al combinarse con armamento inicial contra esos mismos jefes.

## Simulaciones reproducibles

El simulador usa el catálogo, la mochila y el motor existentes. Las builds caben en la mochila del mundo correspondiente. Cada héroe parte con la experiencia de las etapas anteriores y la vida máxima de la build. El DPS medido incluye el daño que reduce HP y el que consume escudo. Los rangos de impacto incorporan golpes extra y el daño realmente aplicado, incluidos los golpes finales. Las compras y las recuperaciones entre etapas se prueban por separado en la campaña completa.

```powershell
node scripts/simulate-combat.mjs
node scripts/simulate-combat.mjs --hits
```

La segunda orden registra todos los golpes resueltos, con su arma, blanco implícito por bando, daño a HP y escudo absorbido. La fila defensiva de Dodoria se añadió después de tomar las mediciones anteriores.

| Encuentro · build | Antes (s y resultado) | Ahora (s y resultado) | HP jugador / enemigo al final | DPS jugador / enemigo |
| --- | --- | --- | --- | --- |
| Raditz · Raditz inicial | 21 · victoria | 21 · victoria | 602 / 0 | 33,62 / 30,86 |
| Raditz · solo Báculo | 44,4 · victoria | 42,55 · derrota | 0 / 58 | 15,23 / 29,38 |
| Cui · sin fusiones | 38,4 · victoria | 36,04 · victoria | 264 / 0 | 31,22 / 36,8 |
| Cui · defensiva | 38,4 · victoria | 37,8 · victoria | 610 / 0 | 29,76 / 28,57 |
| Dodoria · sin fusiones | 25,2 · victoria | 19,26 · victoria | 1024 / 0 | 68,27 / 37,79 |
| Dodoria · defensiva | — | 37,44 · victoria | 892 / 0 | 35,13 / 29,92 |
| Piccolo · sin fusiones | 51,8 · victoria | 44,44 · victoria | 295,08 / 0 | 58,22 / 38,64 |
| Piccolo · fusiones intermedias | 33,25 · victoria | 39,28 · victoria | 461,23 / 0 | 65,87 / 39,48 |
| Ninja de la Niebla · inicial | 21 · victoria | 21 · victoria | 490 / 0 | 33 / 32,86 |
| Ninja de la Arena · inicial | 22,4 · victoria | 22,4 · victoria | 576 / 0 | 35,31 / 31,43 |
| Zabuza · sin fusiones | 51,8 · victoria | 44,44 · victoria | 202,67 / 0 | 58,22 / 39,01 |
| Zabuza · fusiones intermedias | 39,68 · victoria | 43,84 · victoria | 202,67 / 0 | 59,02 / 39,54 |
| Freezer · armas nivel 5 | 28,98 · victoria | 31,99 · victoria | 1224,29 / 0 | 122,43 / 47,7 |
| Gaara · armas nivel 5 | 43,2 · victoria | 33,64 · victoria | 1121,94 / 0 | 117,58 / 45,61 |
| Majin Buu · control | 63,76 · victoria | 68,96 · victoria | 13,43 / 0 | 83,32 / 43,34 |
| Majin Buu · Migatte no Gokui | 63,76 · victoria | 62,81 · victoria | 290 / 0 | 91,48 / 43,18 |
| Majin Buu · build precaria con Migatte | 57 · derrota | 32,85 · derrota | 0 / 4355,67 | 42,32 / 60,43 |
| Pain · control | 99,04 · victoria | 62,05 · derrota | 0 / 298,63 | 87,02 / 46,67 |
| Pain · Modo Barión | 94,24 · victoria | 54,82 · victoria | 362,67 / 0 | 103,93 / 46,21 |
| Pain · build precaria con Barión | 53,32 · derrota | 29,2 · derrota | 0 / 4315,18 | 47,36 / 64,38 |

### Impactos, escudos y efectos

| Encuentro · build | Impacto jugador media (rango) | Impacto enemigo media (rango) | Escudo absorbido jugador / enemigo | Efectos activados |
| --- | --- | --- | --- | --- |
| Raditz · Raditz inicial | 20,76 (7–25) | 54 (54–54) | 0 / 0 | — |
| Raditz · solo Báculo | 18 (18–18) | 52,08 (8–54) | 0 / 0 | — |
| Cui · sin fusiones | 18,75 (15,93–22,12) | 78 (78–78) | 90 / 46 | Completo Italiano (+250 HP) |
| Cui · defensiva | 18,75 (15,93–22,12) | 60 (60–60) | 260 / 46 | — |
| Dodoria · sin fusiones | 30,58 (18–62,96) | 104 (104–104) | 0 / 48 | Completo Italiano (+292 HP) |
| Dodoria · defensiva | 21,21 (18–24,96) | 80 (80–80) | 260 / 48 | Completo Italiano (+292 HP) |
| Piccolo · sin fusiones | 27,52 (8,42–57,01) | 90,36 (83,08–110,77) | 260 / 101 | Completo Italiano (+292 HP) |
| Piccolo · fusiones intermedias | 21,92 (6,07–41,25) | 91,22 (83,08–110,77) | 260 / 101 | Completo Italiano (+292 HP) |
| Ninja de la Niebla · inicial | 13,33 (3–17) | 46 (46–46) | 0 / 0 | — |
| Ninja de la Arena · inicial | 14,38 (8,51–18,12) | 64 (64–64) | 0 / 0 | — |
| Zabuza · sin fusiones | 19,16 (7,24–54,33) | 96,3 (89,68–113,49) | 280 / 101 | Completo Italiano (+276 HP) |
| Zabuza · fusiones intermedias | 14,7 (9,06–21,73) | 96,3 (89,68–113,49) | 280 / 101 | Completo Italiano (+276 HP) |
| Freezer · armas nivel 5 | 53,64 (9,37–112,07) | 95,36 (84,29–128,57) | 260 / 130 | Completo Italiano (+415 HP) |
| Gaara · armas nivel 5 | 33,24 (7,89–91,7) | 102,27 (92,03–130,43) | 280 / 130 | Completo Italiano (+396 HP) |
| Majin Buu · control | 102,61 (44,04–117,34) | 119,54 (108,57–154,29) | 260 / 158 | Completo Italiano (+457 HP) |
| Majin Buu · Migatte no Gokui | 112,67 (44,03–181,88) | 113 (70,57–154,29) | 260 / 158 | Completo Italiano (+457 HP), Migatte no Gokui |
| Majin Buu · build precaria con Migatte | 26,74 (19,23–41,3) | 152,69 (98,8–216) | 0 / 158 | Migatte no Gokui |
| Pain · control | 50,94 (13,85–96,01) | 120,67 (96,72–156,52) | 280 / 158 | Completo Italiano (+436 HP) |
| Pain · Modo Barión | 58,14 (12,54–182,43) | 120,63 (109,42–156,52) | 280 / 158 | Completo Italiano (+436 HP), Modo Barión |
| Pain · build precaria con Barión | 17,96 (8,53–34,41) | 156,67 (24–216) | 0 / 158 | Modo Barión |

## Recursos y escudo de Cui

El build previo a la incorporación del PNG mostraba la silueta de Cui. La compilación actual incluye el mismo archivo de 64 × 64 px. Dodoria y Piccolo tienen registrados sus destinos, y sus siluetas siguen visibles mientras sus PNG están pendientes. El orden de reposo es `idle.pixel.png`, `idle.png` y silueta. Las poses conservan sus animaciones CSS.

| ID | PNG | Estado |
| --- | --- | --- |
| `goku-cui` | `src/assets/enemies/goku/cui/idle.pixel.png` | Cargado en Edge |
| `goku-dodoria` | `src/assets/enemies/goku/dodoria/idle.pixel.png` | Pendiente |
| `goku-piccolo` | `src/assets/enemies/goku/piccolo/idle.pixel.png` | Pendiente |
| `saiyan-armor` | `src/assets/items/png/saiyan-armor.png` | SVG propio de respaldo |
| `ki-barrier` | `src/assets/items/png/ki-barrier.png` | SVG propio de respaldo |
| `vitality-orb` | `src/assets/items/png/vitality-orb.png` | SVG propio de respaldo |

Los tres iconos defensivos carecían de entrada en el registro. Los PNG de Armadura Saiyajin Superior y Barrera Vital corresponden a sus fusiones. El registro usa iconos propios para las piezas base. La guía muestra Armadura Saiyajin y Esfera de Vitalidad como ingredientes y el PNG existente de la armadura superior como resultado. Barrera de Ki figura como equipo en la tienda, la mochila y el arsenal.

La captura de **115,7/618 HP con 46/46 de escudo** quedó sin reproducir. En la compilación nueva, Edge registró **1079 HP / 46 de escudo → 1079 / 7,9 → 1071 / 0**. Las pruebas comprueban las actualizaciones de ambos combatientes y el escudo agotado. La reserva de escudo solo disminuye con los impactos y el motor aplica el mismo orden de absorción a todos los tipos de golpe.

```powershell
npm.cmd run sprites:enemies -- goku-dodoria goku-piccolo saiyan-armor ki-barrier vitality-orb --dry-run --max-usd 0.15
npm.cmd run sprites:enemies -- goku-dodoria goku-piccolo --generate --max-usd 0.06
npm.cmd run sprites:enemies -- saiyan-armor ki-barrier vitality-orb --generate --max-usd 0.09
```

El generador pide confirmación para los lotes de pago. Las verificaciones de esta entrega usaron el modo de simulación y respuestas de prueba locales.

## Archivos modificados

- Balance y efectos en `src/data/enemies.ts`, `items.ts`, `combatLoadout.ts`, `heroForms.ts` y los módulos de `src/engine/combat/` y `src/engine/effects/`.
- Estado visual y presentación en `src/adapters/liveCombat.ts`, `gameEngineAdapter.ts`, `src/assets/heroSprites.ts` y `src/components/combat/`.
- Iconos en `src/assets/itemIconPaths.ts`, `itemIcons.ts`, los tres SVG de `src/assets/items/`, `src/components/inventory/ItemIcon.tsx`, `Backpack.tsx` y `src/Equipment.css`.
- Generación y mediciones en `scripts/generate-enemy-sprites.mjs`, `enemy-sprite-png.mjs`, `simulate-combat.mjs` y `public/assets/README.md`.
- Pruebas en `scripts/generate-enemy-sprites.test.mjs`, `src/adapters/heroForms.test.ts`, `src/assets/itemIcons.test.ts`, `src/components/combat/arenaVisuals.test.ts`, `src/data/expeditionInventory.test.ts`, `fusionEffects.test.ts`, `rpgProgression.test.ts`, `src/engine/combat/combat.test.ts` y `src/engine/effects/effects.test.ts`.

## Validación

`npm.cmd run build`, `npm.cmd run lint` y **275 pruebas** de `npm.cmd run test` pasaron. Edge verificó la compilación a **1280 y 390 px**, incluidos los iconos, las animaciones, el resultado de fusión y el escudo de Cui.
