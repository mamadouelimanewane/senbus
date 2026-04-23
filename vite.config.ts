import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        admin_ddd: resolve(__dirname, 'admin_ddd.html'),
        admin_aftu: resolve(__dirname, 'admin_aftu.html'),
        desktop: resolve(__dirname, 'desktop_pc.html'),
        super_admin: resolve(__dirname, 'super_admin.html'),
        driver: resolve(__dirname, 'driver.html'),
        client: resolve(__dirname, 'client.html')
      }
    }
  }
})
