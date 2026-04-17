import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
