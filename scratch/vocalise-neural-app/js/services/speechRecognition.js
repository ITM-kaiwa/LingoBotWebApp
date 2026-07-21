// Web Speech API Wrapper for Speech-To-Text (STT)

export class SpeechRecognitionService {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
    this.recognition = this.isSupported ? new SpeechRecognition() : null;
    
    this.isListening = false;
    this.language = 'en-US';
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.animFrame = null;

    // Callbacks
    this.onResultCallback = null;
    this.onInterimCallback = null;
    this.onErrorCallback = null;
    this.onStateChangeCallback = null;
    this.onVolumeChangeCallback = null;

    if (this.isSupported) {
      this._initRecognition();
    }
  }

  _initRecognition() {
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
      this._startAudioVolumeMonitor();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && this.onInterimCallback) {
        this.onInterimCallback(interimTranscript);
      }

      if (finalTranscript && this.onResultCallback) {
        this.onResultCallback(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      this.isListening = false;
      this._stopAudioVolumeMonitor();
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (this.onErrorCallback) this.onErrorCallback(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this._stopAudioVolumeMonitor();
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    };
  }

  setLanguage(langCode) {
    this.language = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
    }
  }

  start(onResult, onInterim, onError, onStateChange, onVolumeChange) {
    if (!this.isSupported) {
      if (onError) onError('browser-unsupported');
      return false;
    }

    if (this.isListening) {
      this.stop();
    }

    this.onResultCallback = onResult;
    this.onInterimCallback = onInterim;
    this.onErrorCallback = onError;
    this.onStateChangeCallback = onStateChange;
    this.onVolumeChangeCallback = onVolumeChange;

    this.recognition.lang = this.language;

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      if (onError) onError(e.message);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
    this.isListening = false;
    this._stopAudioVolumeMonitor();
  }

  async _startAudioVolumeMonitor() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!this.isListening) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalizedVolume = Math.min(1, average / 128); // 0.0 to 1.0

        if (this.onVolumeChangeCallback) {
          this.onVolumeChangeCallback(normalizedVolume);
        }
        this.animFrame = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Microphone volume monitoring unavailable:', e);
    }
  }

  _stopAudioVolumeMonitor() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
