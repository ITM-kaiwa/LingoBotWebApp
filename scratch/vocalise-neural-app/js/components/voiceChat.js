import { Icons } from '../utils/icons.js';

export function renderVoiceChatMode(container, state) {
  let chatHistory = [
    {
      sender: 'ai',
      text: "Hello! I am your AI Voice Companion powered by Google Cloud Neural2 voices and Web Speech API. What would you like to talk about today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ];

  let isListening = false;
  let isSpeakingAI = false;
  let interimText = '';

  const updateUI = () => {
    container.innerHTML = `
      <div class="glass-panel chat-container">
        <!-- Chat History -->
        <div class="chat-messages" id="chat-messages-box">
          ${chatHistory.map(msg => `
            <div class="chat-bubble ${msg.sender}">
              <div>${msg.text}</div>
              <div class="chat-bubble-meta">
                <span>${msg.sender === 'ai' ? '🤖 Neural2 AI Voice' : '👤 You (STT)'}</span>
                <span>${msg.time}</span>
              </div>
            </div>
          `).join('')}

          ${isListening ? `
            <div class="chat-bubble user" style="opacity: 0.8;">
              <div style="font-style: italic;">🎙️ ${interimText || 'Listening to your voice...'}</div>
            </div>
          ` : ''}

          ${isSpeakingAI ? `
            <div class="chat-bubble ai" style="opacity: 0.85;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 500;">
                <span style="animation: pulseGlow 1s infinite alternate; width: 10px; height: 10px; border-radius: 50%; background: #00f2fe; display: inline-block;"></span>
                Speaking with Google Cloud Neural2 voice...
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Quick Prompts & Control Bar -->
        <div style="padding: 16px 24px; border-top: 1px solid var(--border-glass); background: rgba(10, 15, 28, 0.7); display: flex; flex-direction: column; gap: 12px;">
          <!-- Quick Prompt Chips -->
          <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
            <button class="category-chip prompt-chip" data-prompt="Hello! Can we practice daily conversation?">
              💬 Practice Daily Conversation
            </button>
            <button class="category-chip prompt-chip" data-prompt="What makes Google Cloud Neural2 voices sound so natural?">
              🧠 Neural2 Tech Overview
            </button>
            <button class="category-chip prompt-chip" data-prompt="Give me 3 tips to improve English pronunciation.">
              💡 Pronunciation Tips
            </button>
          </div>

          <!-- Input Controls -->
          <div style="display: flex; gap: 12px; align-items: center;">
            <input type="text" id="chat-text-input" class="form-input" placeholder="Type a message or click mic to speak..." />
            
            <button id="btn-chat-send" class="btn btn-secondary btn-icon" title="Send Text">
              ${Icons.send(20)}
            </button>

            <button id="btn-chat-mic" class="mic-button ${isListening ? 'recording' : ''}" style="width: 52px; height: 52px;" title="Talk with AI">
              ${isListening ? Icons.micOff(24) : Icons.mic(24)}
            </button>
          </div>
        </div>
      </div>
    `;

    scrollToBottom();
    attachListeners();
  };

  const scrollToBottom = () => {
    const box = container.querySelector('#chat-messages-box');
    if (box) box.scrollTop = box.scrollHeight;
  };

  const handleUserMessage = (userText) => {
    if (!userText.trim()) return;

    chatHistory.push({
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    updateUI();
    generateAIResponse(userText);
  };

  const generateAIResponse = (userQuery) => {
    // Generate intelligent AI response
    let replyText = "";
    const lower = userQuery.toLowerCase();

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('practice')) {
      replyText = "Hello! I'd love to practice with you. How has your day been so far?";
    } else if (lower.includes('neural2') || lower.includes('google')) {
      replyText = "Google Cloud Neural2 voices use advanced deep learning models trained on high-fidelity human speech, giving them unparalleled natural intonation and clarity!";
    } else if (lower.includes('tip') || lower.includes('pronunci')) {
      replyText = "Here are 3 key tips: First, record and shadow native speakers. Second, focus on mouth placement and word stress. Third, practice regularly with STT tools!";
    } else if (lower.includes('japanese') || lower.includes('日本語')) {
      replyText = "日本語の音声を認識してNeural2ボイスで美しく応答することができます！何か質問はありますか？";
    } else {
      replyText = `That is an interesting topic! Regarding "${userQuery}", constant practice with both speech recognition and model playback accelerates fluency.`;
    }

    chatHistory.push({
      sender: 'ai',
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    isSpeakingAI = true;
    updateUI();

    // Speak AI Response using Neural2 TTS
    state.ttsService.speak(
      replyText,
      () => {
        isSpeakingAI = true;
      },
      () => {
        isSpeakingAI = false;
        updateUI();
      },
      () => {
        isSpeakingAI = false;
        updateUI();
      }
    );
  };

  const attachListeners = () => {
    const sendBtn = container.querySelector('#btn-chat-send');
    const textInput = container.querySelector('#chat-text-input');
    const micBtn = container.querySelector('#btn-chat-mic');

    if (sendBtn && textInput) {
      const submit = () => {
        const val = textInput.value;
        textInput.value = '';
        handleUserMessage(val);
      };
      sendBtn.addEventListener('click', submit);
      textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    }

    // Prompt Chips
    container.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const text = e.target.dataset.prompt;
        handleUserMessage(text);
      });
    });

    // Mic Button
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (isListening) {
          state.sttService.stop();
          isListening = false;
          updateUI();
        } else {
          interimText = '';
          state.sttService.setLanguage(state.ttsService.languageCode || 'en-US');

          const success = state.sttService.start(
            (finalText) => {
              isListening = false;
              handleUserMessage(finalText);
            },
            (interim) => {
              interimText = interim;
              updateUI();
            },
            (err) => {
              isListening = false;
              alert(`Voice STT Error: ${err}`);
              updateUI();
            },
            (listening) => {
              isListening = listening;
            }
          );

          if (success) {
            isListening = true;
            updateUI();
          }
        }
      });
    }
  };

  updateUI();
}
