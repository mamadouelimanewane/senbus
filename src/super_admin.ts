import './admin.css'
import { AdminCore } from './lib/admin_core'

document.addEventListener('DOMContentLoaded', () => {
  // Uses 'ALL' to render the Multi-Operator Dashboard
  new AdminCore('ALL', 'admin-root')
})
