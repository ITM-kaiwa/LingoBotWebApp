import { Icons } from '../utils/icons.js';
import { SAMPLE_CATEGORIES, SAMPLE_SENTENCES } from '../data/sampleSentences.js';
import { evaluatePronunciation } from '../services/diffEngine.js';
import { AudioVisualizer } from './visualizer.js';

export function renderShadowingMode(container, state) {
  let selectedCategory = 'all';
  let currentSentenceIndex = 0;
  let isPlayingModel = false;
  let isRecording = false;
  let liveTranscript = '';
  let evaluationResult = null;
  let visualizer = null;

  const getFilteredSentences = () => {
    if (selectedCategory === 'all') return SAMPLE_SENTENCES;
    return SAMPLE_SENTENCES.filter(s => s.category === selectedCategory);
  };

  const updateUI = () => {
    const sentences = getFilteredSentences();
    if (currentSentenceIndex >= sentences.length) currentSentenceIndex = 0;
    const currentSentence = sentences[currentSentenceIndex] || sentences[0];

    container.innerHTML = `
      <div class="shadowing-layout">
        <!-- Sidebar Sentence List -->
        <div class="glass-panel sentence-sidebar" style="padding: 20px;">
          <div style="font-weight: 700; font-size: 1rem; color: var(--text-bright); margin-bottom: 8px;">
            📚 Practice Library
          </div>
          
          <div class="category-selector">
            ${SAMPLE_CATEGORIES.map(cat => `
              <button class="category-chip ${selectedCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
                ${cat.name}
              </button>
            `).join('')}
          </div>

          <div class="sentence-list">
            ${sentences.map((sent, idx) => `
              <div class="sentence-item ${idx === currentSentenceIndex ? 'active' : ''}" data-idx="${idx}">
                <div class="sentence-item-text">${sent.text}</div>
                <div class="sentence-item-meta">
                  <span>${sent.difficulty}</span>
                  <span>${sent.lang}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Main Practice Card -->
        <div class="glass-panel practice-card">
          <!-- Target Sentence Display -->
          <div class="target-sentence-box">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="target-label">
                ${Icons.sparkles(16)} Target Sentence (${currentSentence.lang})
              </div>
              <span class="badge badge-neural">${currentSentence.difficulty}</span>
            </div>

            <div class="target-text" id="target-sentence-text">${currentSentence.text}</div>
            
            ${currentSentence.phonetic ? `
              <div class="target-phonetic">IPA: ${currentSentence.phonetic}</div>
            ` : ''}

            <div style="margin-top: 10px; font-size: 0.95rem; color: var(--text-muted);">
              🇯🇵 ${currentSentence.translation}
            </div>
          </div>

          <!-- Visualizer & Live Mic Feedback -->
          <div style="position: relative; height: 70px; background: rgba(10, 15, 28, 0.5); border-radius: var(--radius-md); border: 1px solid var(--border-glass); overflow: hidden;">
            <canvas id="mic-visualizer-canvas" style="width: 100%; height: 100%;"></canvas>
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; color: var(--text-dim); font-size: 0.85rem;">
              ${isRecording ? '🎙️ Listening to your voice via Web Speech API...' : isPlayingModel ? '🔊 Synthesizing Neural2 Audio Model...' : 'Click Model Voice or Practice Mic to start'}
            </div>
          </div>

          <!-- Controls Bar -->
          <div class="action-controls">
            <!-- Play Model Audio (Google Cloud Neural2 TTS) -->
            <button id="btn-play-model" class="btn btn-neural" style="padding: 14px 24px;">
              ${isPlayingModel ? Icons.stop(20) : Icons.volume(20)}
              ${isPlayingModel ? 'Stop Playing' : 'Model Voice (Neural2)'}
            </button>

            <!-- Record User Voice (Web Speech API STT) -->
            <button id="btn-record-voice" class="mic-button ${isRecording ? 'recording' : ''}" title="Hold or Click to Speak">
              ${isRecording ? Icons.micOff(32) : Icons.mic(32)}
            </button>

            <!-- Next Sentence Button -->
            <button id="btn-next-sentence" class="btn btn-secondary" style="padding: 14px 20px;">
              Next ${Icons.refresh(18)}
            </button>
          </div>

          <!-- Live Transcript Output -->
          <div class="live-transcript-container">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">
              ${Icons.mic(14)} Your Recognized Voice (STT)
            </div>
            <div id="transcript-display" class="${liveTranscript ? 'transcript-final' : 'transcript-interim'}">
              ${liveTranscript || (isRecording ? 'Listening... speak clearly into your microphone' : 'Press microphone button above and speak the sentence aloud')}
            </div>
          </div>

          <!-- Pronunciation Score & Word Diff Card -->
          ${evaluationResult ? `
            <div class="score-result-panel">
              <div class="score-header">
                <div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">
                    Pronunciation Score
                  </div>
                  <div style="font-size: 1.3rem; font-weight: 700; color: ${evaluationResult.gradeColor};">
                    ${evaluationResult.grade}
                  </div>
                </div>
                <div class="score-badge" style="color: ${evaluationResult.gradeColor};">
                  ${evaluationResult.score}%
                </div>
              </div>

              <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; margin-top: 8px;">
                Word Alignment & Accuracy Breakdown:
              </div>

              <div class="word-diff-container">
                ${evaluationResult.diff.map(item => {
                  if (item.type === 'correct') {
                    return `<span class="diff-word diff-correct" title="Accurate">${item.word}</span>`;
                  } else if (item.type === 'missing') {
                    return `<span class="diff-word diff-missing" title="Missing or Mispronounced">${item.word} ${item.said ? `(said: ${item.said})` : ''}</span>`;
                  } else {
                    return `<span class="diff-word diff-extra" title="Extra Word">${item.word}</span>`;
                  }
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Attach Event Listeners
    attachEventListeners(sentences, currentSentence);

    // Setup Canvas Visualizer
    const canvas = document.getElementById('mic-visualizer-canvas');
    if (canvas) {
      visualizer = new AudioVisualizer(canvas);
      if (isRecording) visualizer.start();
    }
  };

  const attachEventListeners = (sentences, currentSentence) => {
    // Category Chips
    container.querySelectorAll('.category-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedCategory = e.target.dataset.cat;
        currentSentenceIndex = 0;
        evaluationResult = null;
        liveTranscript = '';
        updateUI();
      });
    });

    // Sentence Items
    container.querySelectorAll('.sentence-item').forEach(item => {
      item.addEventListener('click', (e) => {
        currentSentenceIndex = parseInt(item.dataset.idx, 10);
        evaluationResult = null;
        liveTranscript = '';
        updateUI();
      });
    });

    // Model Voice Playback Button
    const playBtn = container.querySelector('#btn-play-model');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (isPlayingModel) {
          state.ttsService.stop();
          isPlayingModel = false;
          updateUI();
        } else {
          // Set language code dynamically to match sentence
          state.ttsService.languageCode = currentSentence.lang;
          isPlayingModel = true;
          updateUI();

          state.ttsService.speak(
            currentSentence.text,
            () => {
              isPlayingModel = true;
            },
            () => {
              isPlayingModel = false;
              updateUI();
            },
            (err) => {
              isPlayingModel = false;
              alert(`TTS Error: ${err}`);
              updateUI();
            }
          );
        }
      });
    }

    // Mic Speech Recognition Button
    const micBtn = container.querySelector('#btn-record-voice');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (isRecording) {
          state.sttService.stop();
          isRecording = false;
          if (visualizer) visualizer.stop();
          updateUI();
        } else {
          liveTranscript = '';
          evaluationResult = null;
          state.sttService.setLanguage(currentSentence.lang);

          const success = state.sttService.start(
            // Final Result
            (finalText) => {
              liveTranscript = finalText;
              isRecording = false;
              if (visualizer) visualizer.stop();

              // Evaluate Pronunciation Diff
              evaluationResult = evaluatePronunciation(currentSentence.text, finalText);
              updateUI();
            },
            // Interim Result
            (interimText) => {
              liveTranscript = interimText;
              const display = document.getElementById('transcript-display');
              if (display) {
                display.innerText = interimText;
                display.className = 'transcript-interim';
              }
            },
            // Error
            (err) => {
              isRecording = false;
              if (visualizer) visualizer.stop();
              alert(`Speech Recognition Error: ${err}`);
              updateUI();
            },
            // State Change
            (listening) => {
              isRecording = listening;
              if (!listening && visualizer) visualizer.stop();
            },
            // Volume change
            (vol) => {
              if (visualizer) visualizer.setVolume(vol);
            }
          );

          if (success) {
            isRecording = true;
            updateUI();
          }
        }
      });
    }

    // Next Sentence Button
    const nextBtn = container.querySelector('#btn-next-sentence');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentSentenceIndex = (currentSentenceIndex + 1) % sentences.length;
        evaluationResult = null;
        liveTranscript = '';
        updateUI();
      });
    }
  };

  updateUI();
}
