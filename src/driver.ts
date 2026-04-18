import { lines } from './data/transit_data'
import './style_driver.css'

let selectedLineId: string | null = null
let isDriving = false
let currentProgress = 0

const root = document.querySelector<HTMLDivElement>('#driver-app')!

function render() {
    root.innerHTML = `
        <header>
            <div class="driver-id">CHAUFFEUR #782</div>
            <div class="status-dot"></div>
        </header>

        ${!isDriving ? `
            <div class="trip-selector">
                <h2>Sélectionnez votre ligne</h2>
                ${lines.map(l => `
                    <div class="selector-card ${selectedLineId === l.id ? 'active' : ''}" data-id="${l.id}">
                        <strong>${l.operatorId} - LIGNE ${l.code}</strong>
                        <p>${l.name}</p>
                    </div>
                `).join('')}
                <button class="big-btn" id="start-job" ${!selectedLineId ? 'disabled' : ''}>DÉMARRER LE TRAJET</button>
            </div>
        ` : `
            <div class="on-trip-view">
                <div class="live-status">EN LIGNE</div>
                <p>Transmission GPS active...</p>
                <div class="metrics">
                    <strong>Progression: ${Math.round(currentProgress * 100)}%</strong>
                </div>
                <button class="big-btn stop-now" id="stop-job">ARRÊTER LE SERVICE</button>
            </div>
        `}
    `
    attachListeners()
}

function attachListeners() {
    root.querySelectorAll<HTMLElement>('.selector-card').forEach(card => {
        card.onclick = () => { selectedLineId = card.dataset.id!; render() }
    })

    root.querySelector('#start-job')?.addEventListener('click', () => {
        isDriving = true
        currentProgress = 0
        simulateGPS()
        render()
    })

    root.querySelector('#stop-job')?.addEventListener('click', () => {
        isDriving = false
        render()
    })
}

function simulateGPS() {
    if (!isDriving) return
    currentProgress = (currentProgress + 0.01) % 1
    // In a real app, this would fetch navigator.geolocation and POST to backend
    setTimeout(() => { if(isDriving) { simulateGPS(); render(); } }, 2000)
}

render()
