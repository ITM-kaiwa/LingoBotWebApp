// Web Speech API Wrapper for Speech-To-Text (STT)

export class SpeechRecognitionService {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
    this.recognition = this.isSupported ? new SpeechRecognition() : null;

    this.isListening = false;
    this.language = 'en-US';

    this.onResultCallback = null;
    this.onInterimCallback = null;
    this.onErrorCallback = null;
    this.onStateChangeCallback = null;

    if (this.isSupported) {
      this._initRecognition();
    }
  }

  _initRecognition() {
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
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
      this.isListening = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (this.onErrorCallback) this.onErrorCallback(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    };
  }

  setLanguage(langCode) {
    this.language = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
    }
  }

  start(onResult, onInterim, onError, onStateChange) {
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

    this.recognition.lang = this.language;

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      if (onError) onError(e.message);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
  }
}
