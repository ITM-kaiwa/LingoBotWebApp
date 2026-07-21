import { Icons } from './utils/icons.js';
import { GoogleCloudTtsService } from './services/googleCloudTts.js';
import { SpeechRecognitionService } from './services/speechRecognition.js';
import { renderHeader } from './components/header.js';
import { renderShadowingMode } from './components/shadowing.js';
import { renderVoiceChatMode } from './components/voiceChat.js';
import { renderSettingsModal } from './components/settings.js';

class App {
  constructor() {
    this.state = {
      activeTab: 'shadowing', // 'shadowing' | 'voiceChat'
      ttsService: new GoogleCloudTtsService(),
      sttService: new SpeechRecognitionService(),
    };

    this.init();
  }

  init() {
    this.render();
  }

  render() {
    const appEl = document.getElementById('app');
    appEl.className = 'app-container';

    appEl.innerHTML = `
      <!-- Header -->
      <div id="header-container"></div>

      <!-- Navigation Tabs -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <nav class="nav-tabs">
          <button id="tab-shadowing" class="nav-tab ${this.state.activeTab === 'shadowing' ? 'active' : ''}">
            ${Icons.award(18)} Shadowing & Pronunciation
          </button>
          <button id="tab-chat" class="nav-tab ${this.state.activeTab === 'voiceChat' ? 'active' : ''}">
            ${Icons.chat(18)} Interactive AI Voice Chat
          </button>
        </nav>

        <div style="font-size: 0.85rem; color: var(--text-dim); display: flex; align-items: center; gap: 6px;">
          ${Icons.sparkles(14)} Neural2 TTS + Web Speech API STT
        </div>
      </div>

      <!-- Main Content Workspace -->
      <main id="main-workspace"></main>
    `;

    // Render Header
    renderHeader(
      document.getElementById('header-container'),
      this.state,
      () => this.openSettings()
    );

    // Tab Listeners
    document.getElementById('tab-shadowing').addEventListener('click', () => {
      this.state.activeTab = 'shadowing';
      this.renderWorkspace();
      this.updateTabStyles();
    });

    document.getElementById('tab-chat').addEventListener('click', () => {
      this.state.activeTab = 'voiceChat';
      this.renderWorkspace();
      this.updateTabStyles();
    });

    // Render Workspace
    this.renderWorkspace();
  }

  updateTabStyles() {
    const tabShadowing = document.getElementById('tab-shadowing');
    const tabChat = document.getElementById('tab-chat');

    if (tabShadowing) {
      tabShadowing.className = `nav-tab ${this.state.activeTab === 'shadowing' ? 'active' : ''}`;
    }
    if (tabChat) {
      tabChat.className = `nav-tab ${this.state.activeTab === 'voiceChat' ? 'active' : ''}`;
    }
  }

  renderWorkspace() {
    const workspace = document.getElementById('main-workspace');
    workspace.innerHTML = '';

    if (this.state.activeTab === 'shadowing') {
      renderShadowingMode(workspace, this.state);
    } else if (this.state.activeTab === 'voiceChat') {
      renderVoiceChatMode(workspace, this.state);
    }
  }

  openSettings() {
    renderSettingsModal(
      this.state,
      () => {},
      () => {
        // On save, re-render header and workspace
        renderHeader(
          document.getElementById('header-container'),
          this.state,
          () => this.openSettings()
        );
        this.renderWorkspace();
      }
    );
  }
}

// Boot Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.vocaliseApp = new App();
});
