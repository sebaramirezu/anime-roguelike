import { fileURLToPath } from 'node:url'
import { pixelImage, pixelRandom, writePixelArt } from './pixel-art.mjs'

const width = 320
const height = 160
const horizon = 132
const scenes = new Map()

function landscape(name, palette, paint, seed) {
  const image = pixelImage(width, height)
  const random = pixelRandom(seed)
  const { rectangle: r, polygon: p, oval: o } = image
  const [sky, skyMiddle, skyLow, far, near, shadow, floor, mark, light] = palette
  r(0, 0, width, height, sky)
  r(0, 48, width, height - 48, skyMiddle)
  r(0, 79, width, height - 79, skyLow)

  function band(x, y, length, color) {
    r(x + 5, y, length - 12, 2, color)
    r(x, y + 2, length, 3, color)
    r(x + 14, y + 5, length - 20, 2, color)
  }
  function marks(color, top, bottom, count, maxWidth) {
    for (let i = 0; i < count; i++) r(random(width), top + random(bottom - top), 1 + random(maxWidth), 1 + random(2), color)
  }
  function ridge(points, color) {
    p([...points, [width, horizon + 1], [0, horizon + 1]], color)
  }
  function levelFloor(surface = floor, detail = mark) {
    r(0, horizon, width, height - horizon, surface)
    r(0, horizon, width, 2, detail)
    r(0, 151, width, 9, shadow)
    marks(detail, 136, 151, 35, 12)
    marks(near, 153, 160, 12, 8)
  }

  paint({ r, p, o, band, ridge, marks, levelFloor, colors: { skyLow, far, near, shadow, floor, mark, light }, random })
  scenes.set(name, image)
}

function mesa({ r, p }, x, y, w, h, base, shade, top) {
  p([[x,y+h],[x+4,y+9],[x+12,y],[x+w-9,y],[x+w-3,y+7],[x+w,y+h]], base)
  p([[x+w-17,y+4],[x+w-9,y],[x+w-3,y+7],[x+w,y+h],[x+w-22,y+h]], shade)
  r(x + 12, y + 2, w - 24, 3, top)
  r(x + 7, y + 12, 7, 13, shade)
  r(x + 22, y + 7, 3, Math.min(15, h - 7), top)
}

landscape('saiyan-rocks', ['332c50','574360','947077','6e596a','653b47','30283c','4d3341','8e534e','ffc187'], (d) => {
  const { r, o, band, ridge, levelFloor, colors: c } = d
  o(228, 69, 22, 22, c.light)
  band(181, 74, 64, 'af8182')
  band(24, 59, 72, '846580')
  ridge([[0,99],[26,83],[54,89],[73,93],[89,82],[107,82],[127,97],[154,95],[182,105],[205,96],[227,97],[257,82],[278,83],[304,72],[320,79]], c.far)
  mesa(d, -12, 73, 58, 62, '8a514b', c.near, 'b36a55')
  mesa(d, 31, 104, 39, 28, '79474a', c.near, '9e5851')
  mesa(d, 258, 91, 47, 44, '8a514b', c.near, 'b36a55')
  mesa(d, 291, 59, 46, 75, '844e49', c.near, 'b36a55')
  r(69, 124, 188, 8, c.near)
  levelFloor()
}, 11)

landscape('namek', ['123d4a','196069','3d9182','2c6e69','215454','102f39','285452','3d7670','bef0b2'], (d) => {
  const { r, p, o, band, ridge, levelFloor, colors: c } = d
  o(219, 68, 23, 23, '94d6a4')
  o(215, 65, 19, 19, c.light)
  o(85, 56, 7, 7, '82c3a1')
  band(152, 69, 108, '64ada0')
  ridge([[0,97],[24,99],[41,95],[58,84],[83,84],[99,101],[126,108],[168,108],[195,101],[210,94],[228,94],[246,104],[275,107],[291,99],[320,96]], c.far)
  r(0, 108, width, 24, '348b8c')
  for (const [x,y,len] of [[17,111,21],[48,119,33],[112,112,44],[152,124,39],[192,115,14],[246,122,35],[274,113,21]]) r(x,y,len,1,'61ada0')
  p([[0,99],[29,95],[68,103],[78,121],[111,127],[92,135],[0,142]], c.near)
  p([[320,99],[280,95],[254,110],[239,126],[262,134],[320,141]], c.near)
  for (const [x,y,size] of [[22,88,15],[56,100,10],[269,101,11],[294,83,16]]) {
    r(x - 2, y, 4, 24, '593b55')
    o(x, y - 6, size, size - 3, '295a63')
    o(x - 2, y - 9, size - 4, size - 6, '3a7a78')
  }
  levelFloor()
}, 19)

function buildings({ r, p, random }, blocks, front, shade, windows, damaged = false) {
  for (const [x,y,w] of blocks) {
    p([[x,y+4],[x+4,y],[x+w-4,y],[x+w,y+4],[x+w,horizon],[x,horizon]], front)
    r(x + w - 5, y + 6, 5, horizon - y - 6, shade)
    for (let row = y + 9; row < horizon - 5; row += 9) {
      for (let col = x + 4; col < x + w - 7; col += 7) {
        if (random(4)) r(col, row, 3, 3, windows)
      }
    }
    if (damaged) p([[x,y],[x+w-5,y],[x+w-10,y+6],[x+6,y+6],[x+3,y+12],[x,y+9]], shade)
  }
}

function pavement({ r, p, colors: c }, tile, seam) {
  r(0, horizon, width, height - horizon, tile)
  r(0, horizon, width, 2, c.light)
  for (const y of [139, 149, 159]) r(0, y, width, 1, seam)
  for (let x = 4; x < width; x += 20) {
    const offset = Math.round((x - 160) / 6)
    p([[x,132],[x+1,132],[x+offset+2,160],[x+offset,160]], seam)
  }
}

landscape('android-outskirts', ['253348','475269','9e7e82','5f596c','3b4054','242639','4b4857','6e616a','d3a18c'], (d) => {
  const { r, band, o, colors: c } = d
  o(238, 78, 15, 15, 'dfb19a')
  band(42, 76, 102, '7e6a7c')
  buildings(d, [[0,89,23],[32,79,37],[72,89,16],[94,95,19],[111,102,19],[137,95,24],[160,99,31],[203,88,28],[249,92,22],[274,76,28],[305,92,17]], c.far, '494455', 'b08c88')
  buildings(d, [[-8,71,29],[26,94,32],[66,107,28],[236,104,33],[277,89,33],[310,65,20]], c.near, c.shadow, '947185', true)
  r(48, 80, 1, 14, c.shadow)
  r(43, 83, 12, 1, c.shadow)
  r(291, 78, 2, 11, c.shadow)
  pavement(d, c.floor, c.mark)
}, 25)

landscape('cell-ring', ['23495d','3a6679','70939a','526d76','375659','253944','5f6472','414c5b','b9a8a6'], (d) => {
  const { r, p, band, ridge, colors: c } = d
  band(30, 68, 94, '6e90a0')
  band(204, 59, 89, '52798c')
  ridge([[0,99],[20,96],[42,77],[62,94],[79,99],[99,85],[111,89],[138,105],[171,110],[185,104],[213,83],[224,92],[247,100],[265,90],[274,80],[289,83],[320,109]], c.far)
  ridge([[0,108],[36,101],[57,111],[89,114],[110,106],[133,116],[165,113],[176,117],[192,110],[221,112],[250,106],[278,109],[302,98],[320,102]], c.near)
  r(0, 127, width, 5, c.shadow)
  for (const x of [19, 34, 281, 296]) {
    p([[x,130],[x,110],[x+3,105],[x+6,110],[x+6,130]], c.floor)
    r(x + 1, 112, 1, 14, c.light)
  }
  pavement(d, c.floor, c.mark)
}, 31)

landscape('majin-wastes', ['2e244c','4e3058','88556f','68405f','533751','271e37','5d3f5a','885769','ee9da4'], (d) => {
  const { r, p, o, band, ridge, marks, levelFloor, colors: c } = d
  marks('8c6c80', 12, 86, 24, 2)
  o(207, 76, 28, 28, 'aa6c82')
  o(205, 72, 24, 24, 'c48694')
  band(176, 78, 66, 'd195a0')
  band(9, 76, 77, '78516b')
  ridge([[0,100],[30,95],[51,103],[78,98],[97,109],[114,106],[142,115],[162,112],[195,115],[229,104],[243,108],[263,103],[282,89],[315,92],[320,102]], c.far)
  for (const [x,y,w] of [[-12,107,63],[46,113,37],[253,111,51],[292,97,39]]) {
    p([[x,y+3],[x+7,y],[x+w-8,y],[x+w,y+4],[x+w-12,y+11],[x+16,y+14]], c.near)
    r(x + 8, y + 1, w - 18, 2, c.mark)
  }
  levelFloor()
}, 38)

function tree({ p, r, o }, x, top, size, trunk, leaves, edge) {
  p([[x-size/5,132],[x-size/12,top+15],[x+size/11,top+15],[x+size/5,132]], trunk)
  p([[x,top+40],[x+size/3,top+20],[x+size/2,top+17],[x+size/11,top+49]], trunk)
  o(x, top, size, Math.ceil(size / 2), leaves)
  o(x - 5, top - 3, Math.floor(size * .77), Math.ceil(size / 3), edge)
  r(x - 3, top + 25, 1, 15, edge)
}

landscape('ninja-forest', ['153b43','225052','457269','35615e','284c49','182f3c','294646','4d6857','90ad77'], (d) => {
  const { r, o, band, levelFloor, colors: c } = d
  band(102, 68, 113, '577d6f')
  for (const [x,top,size] of [[12,90,22],[48,91,17],[81,97,19],[113,98,14],[144,92,19],[170,98,14],[204,91,26],[245,98,19],[277,87,23],[318,83,21]]) tree(d,x,top,size,c.far,'426d61','527a68')
  for (const [x,top,size] of [[-3,65,32],[36,77,27],[72,99,20],[259,100,20],[290,78,27],[322,64,33]]) tree(d,x,top,size,c.shadow,c.near,'335b51')
  r(0,124,width,8,c.near)
  for (const x of [5,25,59,76,246,261,296,313]) o(x,125,14,5,c.near)
  levelFloor()
}, 57)

landscape('zabuza-bridge', ['344357','4d6678','809aa4','677e8b','415971','293848','566879','788997','b1c1c8'], (d) => {
  const { r, band, ridge, colors: c } = d
  ridge([[0,99],[35,87],[52,88],[70,96],[109,109],[132,106],[155,108],[194,108],[222,96],[247,93],[273,96],[299,91],[320,89]], c.far)
  r(0,111,width,21,'637e8e')
  for (const [x,y,w] of [[-8,92,98],[67,99,136],[200,93,112],[248,107,85],[21,114,111],[153,117,144]]) band(x,y,w,'9aafb7')
  r(0, 121, width, 3, c.near)
  r(0, 121, width, 1, c.light)
  for (const x of [1,29,64,100,134,182,219,255,289,317]) {
    r(x, 117, 4, 15, c.near)
    r(x, 117, 1, 15, c.light)
  }
  pavement(d, c.floor, c.shadow)
}, 64)

landscape('forest-of-death', ['242d44','374152','55605e','3b5053','273d46','1a2835','353b44','52604f','8b9c70'], (d) => {
  const { r, p, o, marks, levelFloor, colors: c } = d
  for (const [x,top,size] of [[20,77,28],[62,93,22],[100,84,24],[133,92,24],[160,94,19],[208,85,29],[252,89,26],[302,69,31]]) tree(d,x,top,size,c.far,'465953','576b59')
  for (const [x,top,size] of [[1,60,38],[43,66,28],[282,72,31],[324,48,44]]) {
    tree(d,x,top,size,c.shadow,c.near,'364e4b')
    p([[x-8,131],[x+8,120],[x+26,128],[x+33,132]], c.near)
  }
  r(0,126,width,6,c.near)
  for (const [x,y] of [[21,125],[48,118],[92,126],[229,125],[270,121],[307,125]]) {
    o(x,y,8,4,'44554e')
    r(x-2,y-2,3,1,c.light)
  }
  marks('708167', 81, 125, 18, 2)
  levelFloor()
}, 75)

function villageRoof({ r, p }, x, y, w, wall, tile, light) {
  r(x + 4,y + 7,w - 8,horizon - y - 7,wall)
  p([[x,y+11],[x+7,y+4],[x+w-9,y],[x+w,y+11]],tile)
  r(x + 3,y+9,w-6,1,light)
  for (let col = x + 8; col < x+w-9; col += 9) r(col,y+16,3,4,light)
}

landscape('hidden-leaf', ['304a62','567580','9f9d8d','777f7d','59666a','2d3749','675654','8a6a62','d3aa85'], (d) => {
  const { r, p, band, ridge, levelFloor, colors: c } = d
  band(192,61,82,'92a39d')
  ridge([[0,110],[28,103],[47,75],[70,71],[88,65],[116,66],[136,73],[165,69],[196,82],[214,77],[238,88],[259,101],[291,102],[320,109]], c.far)
  p([[52,108],[58,85],[80,82],[84,73],[107,73],[116,89],[150,89],[161,84],[180,87],[194,108]], '8c8b81')
  for (const [x,y,w] of [[-8,100,38],[32,107,35],[68,111,28],[102,113,30],[143,116,40],[190,108,32],[234,111,29],[272,104,49]]) villageRoof(d,x,y,w,'66616b','824c55',c.light)
  villageRoof(d,-8,109,34,c.near,'754550','d4a27f')
  villageRoof(d,293,108,35,c.near,'754550','d4a27f')
  for (const x of [18,304]) {
    r(x, 112, 2, 20, c.shadow)
    r(x - 2, 114, 6, 5, 'f0a36d')
  }
  levelFloor()
}, 83)

landscape('pain-ruins', ['39354d','58536c','8e7d87','6a6577','554d63','332e45','514858','786779','bc9d9c'], (d) => {
  const { r, p, o, band, levelFloor, colors: c } = d
  o(198,74,14,14,'b39aa2')
  band(46,76,93,'7b7083')
  band(157,83,124,'96828d')
  buildings(d, [[0,92,33],[41,99,21],[71,100,19],[104,106,23],[151,110,18],[199,106,27],[228,103,22],[260,94,31],[302,87,22]], c.far, c.near, '887486', true)
  for (const path of [
    [[0,105],[22,95],[28,105],[38,109],[40,121],[77,125],[89,132],[0,136]],
    [[320,99],[300,94],[287,106],[275,104],[271,118],[239,125],[229,134],[320,139]],
    [[94,130],[107,120],[122,126],[139,128],[171,127],[207,124],[221,132]],
  ]) p(path,c.near)
  r(0,129,width,3,c.mark)
  levelFloor()
}, 97)

for (const [name, image] of scenes) {
  const path = fileURLToPath(new URL(`../src/assets/backgrounds/${name}.png`, import.meta.url))
  const written = await writePixelArt(path, await image.png())
  console.log(`${written ? 'Guardado ' : 'Conservado'}  src/assets/backgrounds/${name}.png`)
}
