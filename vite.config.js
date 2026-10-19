import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Accessible DOM queries across complete report CRUD can be slow on Windows.
  // Keep a bounded timeout without skipping assertions or retries.
  test: { environment: 'node', globals: true, testTimeout: 15000 }
})
