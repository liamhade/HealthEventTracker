import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // The icon already has its own rounded background.
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#a7d8f8' } },
    apple: { ...minimal2023Preset.apple, padding: 0.1, resizeOptions: { background: '#a7d8f8' } },
  },
  images: ['public/favicon.svg'],
})
