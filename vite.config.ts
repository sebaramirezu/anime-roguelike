import { existsSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { musicCatalog } from './src/audio/musicCatalog.ts'

const musicFiles = Object.fromEntries(Object.entries(musicCatalog).flatMap(([scene, { stem }]) => {
  const file = ['ogg', 'mp3', 'wav'].map((extension) => `${stem}.${extension}`)
    .find((filename) => existsSync(new URL(`./public/assets/audio/music/${filename}`, import.meta.url)))
  return file ? [[scene, file]] : []
}))

export default defineConfig({
  plugins: [react()],
  define: { __MUSIC_FILES__: JSON.stringify(musicFiles) },
})
