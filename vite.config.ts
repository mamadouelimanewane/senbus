import { defineConfig } from 'vite'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'SunuBus Client',
        short_name: 'SunuBus',
        description: 'Dakar Dem Dikk - AFTU Live Tracker',
        theme_color: '#d90429',
        background_color: '#f3f4f6',
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        admin_ddd: resolve(__dirname, 'admin_ddd.html'),
        admin_aftu: resolve(__dirname, 'admin_aftu.html'),
        desktop: resolve(__dirname, 'desktop_pc.html'),
        super_admin: resolve(__dirname, 'super_admin.html'),
        driver: resolve(__dirname, 'driver.html')
      }
    }
  }
})
