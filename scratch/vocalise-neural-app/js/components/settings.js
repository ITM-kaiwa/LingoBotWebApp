import { Icons } from '../utils/icons.js';
import { GoogleCloudTtsService } from '../services/googleCloudTts.js';

export function renderSettingsModal(state, onClose, onSave) {
  const modalDiv = document.createElement('div');
  modalDiv.className = 'modal-overlay';

  const currentApiKey = state.ttsService.getApiKey();
  const currentVoice = state.ttsService.voiceName;
  const currentPitch = state.ttsService.pitch;
  const currentRate = state.ttsService.speakingRate;

  modalDiv.innerHTML = `
    <div class="modal-content">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          ${Icons.settings(22)} Voice & Neural2 Settings
        </div>
        <button id="modal-close-btn" class="btn btn-secondary btn-icon" style="padding: 6px;">✕</button>
      </div>

      <!-- Google Cloud API Key -->
      <div class="form-group">
        <label class="form-label">
          <span>Google Cloud Text-to-Speech API Key</span>
          <span style="font-weight: 400; font-size: 0.75rem;">(Optional for Neural2)</span>
        </label>
        <input type="password" id="setting-api-key" class="form-input" placeholder="AIzaSy..." value="${currentApiKey}" />
        <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
          🔑 If set, TTS will use official <strong>Google Cloud Neural2</strong> REST API. If left empty, standard browser Web Speech Synthesis will be used as a fallback.
        </div>
      </div>

      <!-- Voice Selection -->
      <div class="form-group">
        <label class="form-label">
          <span>Google Cloud Neural2 Voice Model</span>
        </label>
        <select id="setting-voice-select" class="form-select">
          ${GoogleCloudTtsService.NEURAL2_VOICES.map(v => `
            <option value="${v.code}" ${v.code === currentVoice ? 'selected' : ''}>
              ${v.name}
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Speaking Rate Slider -->
      <div class="form-group">
        <label class="form-label">
          <span>Speaking Speed / Rate</span>
          <span id="rate-value">${currentRate}x</span>
        </label>
        <input type="range" id="setting-rate" min="0.5" max="1.5" step="0.05" value="${currentRate}" />
      </div>

      <!-- Pitch Slider -->
      <div class="form-group">
        <label class="form-label">
          <span>Pitch Adjustment</span>
          <span id="pitch-value">${currentPitch > 0 ? '+' : ''}${currentPitch} semitones</span>
        </label>
        <input type="range" id="setting-pitch" min="-10" max="10" step="1" value="${currentPitch}" />
      </div>

      <!-- Test Audio Button -->
      <div style="display: flex; gap: 12px; align-items: center; background: rgba(10, 15, 28, 0.6); padding: 12px; border-radius: var(--radius-md);">
        <button id="btn-test-voice" class="btn btn-neural btn-icon" style="padding: 10px;">
          ${Icons.play(18)}
        </button>
        <div style="font-size: 0.85rem; color: var(--text-main);">
          Click to test current voice settings
        </div>
      </div>

      <!-- Footer Action Buttons -->
      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
        <button id="btn-cancel-settings" class="btn btn-secondary">Cancel</button>
        <button id="btn-save-settings" class="btn btn-primary">Save Settings</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalDiv);

  // Range Listeners
  const rateInput = modalDiv.querySelector('#setting-rate');
  const pitchInput = modalDiv.querySelector('#setting-pitch');
  const rateVal = modalDiv.querySelector('#rate-value');
  const pitchVal = modalDiv.querySelector('#pitch-value');

  rateInput.addEventListener('input', (e) => {
    rateVal.innerText = `${e.target.value}x`;
  });
  pitchInput.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    pitchVal.innerText = `${v > 0 ? '+' : ''}${v} semitones`;
  });

  // Test Voice
  modalDiv.querySelector('#btn-test-voice').addEventListener('click', () => {
    const selectedVoice = modalDiv.querySelector('#setting-voice-select').value;
    const rate = parseFloat(rateInput.value);
    const pitch = parseFloat(pitchInput.value);
    const apiKey = modalDiv.querySelector('#setting-api-key').value;

    state.ttsService.setApiKey(apiKey);
    state.ttsService.setVoiceConfig(selectedVoice, pitch, rate);

    const testText = selectedVoice.startsWith('ja')
      ? 'Google Cloud Neural2 のニューラル音声テストです。'
      : 'This is a test of Google Cloud Neural2 voice synthesis.';

    state.ttsService.speak(testText);
  });

  // Close & Save handlers
  const close = () => {
    modalDiv.remove();
    onClose();
  };

  modalDiv.querySelector('#modal-close-btn').addEventListener('click', close);
  modalDiv.querySelector('#btn-cancel-settings').addEventListener('click', close);

  modalDiv.querySelector('#btn-save-settings').addEventListener('click', () => {
    const apiKey = modalDiv.querySelector('#setting-api-key').value;
    const selectedVoice = modalDiv.querySelector('#setting-voice-select').value;
    const rate = parseFloat(rateInput.value);
    const pitch = parseFloat(pitchInput.value);

    state.ttsService.setApiKey(apiKey);
    state.ttsService.setVoiceConfig(selectedVoice, pitch, rate);

    modalDiv.remove();
    onSave();
  });
}
