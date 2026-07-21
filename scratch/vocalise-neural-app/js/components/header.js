import { Icons } from '../utils/icons.js';
import { GoogleCloudTtsService } from '../services/googleCloudTts.js';

export function renderHeader(container, state, onOpenSettings) {
  const isKeyConfigured = !!state.ttsService.getApiKey();
  const selectedVoice = state.ttsService.voiceName;

  container.innerHTML = `
    <header class="app-header">
      <div class="brand-section">
        <div class="brand-logo">
          ${Icons.sparkles(24)}
        </div>
        <div>
          <div class="brand-title">
            Vocalise Neural AI
            <span class="badge badge-neural">${Icons.sparkles(12)} Neural2 TTS</span>
            <span class="badge badge-stt">${Icons.mic(12)} Web Speech STT</span>
          </div>
          <div class="brand-subtitle">
            Voice Pronunciation Training & AI Conversation with Google Cloud Neural2 Voices
          </div>
        </div>
      </div>

      <div class="header-actions">
        <div id="api-status-badge">
          ${isKeyConfigured 
            ? `<span class="badge badge-active">${Icons.check(12)} GCP API Active (${selectedVoice})</span>` 
            : `<span class="badge badge-warning">${Icons.key(12)} Browser Audio (GCP API Key Unset)</span>`
          }
        </div>
        <button id="btn-open-settings" class="btn btn-secondary btn-icon" title="Open Voice & GCP Settings">
          ${Icons.settings(20)}
        </button>
      </div>
    </header>
  `;

  document.getElementById('btn-open-settings').addEventListener('click', onOpenSettings);
}
