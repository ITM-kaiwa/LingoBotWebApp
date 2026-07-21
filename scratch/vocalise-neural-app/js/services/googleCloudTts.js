// Google Cloud Text-To-Speech (TTS) Service using Neural2 Voices

export class GoogleCloudTtsService {
  constructor() {
    this.apiKey = localStorage.getItem('gcp_tts_api_key') || '';
    this.voiceName = localStorage.getItem('gcp_tts_voice') || 'en-US-Neural2-F';
    this.languageCode = localStorage.getItem('gcp_tts_lang') || 'en-US';
    this.pitch = parseFloat(localStorage.getItem('gcp_tts_pitch') || '0');
    this.speakingRate = parseFloat(localStorage.getItem('gcp_tts_rate') || '1.0');

    this.currentAudio = null;
  }

  // Pre-configured list of top Google Cloud Neural2 voices
  static NEURAL2_VOICES = [
    { code: 'en-US-Neural2-F', lang: 'en-US', name: 'US English - Neural2 Female (F)', gender: 'FEMALE' },
    { code: 'en-US-Neural2-C', lang: 'en-US', name: 'US English - Neural2 Male (C)', gender: 'MALE' },
    { code: 'en-US-Neural2-D', lang: 'en-US', name: 'US English - Neural2 Male (D)', gender: 'MALE' },
    { code: 'en-US-Neural2-A', lang: 'en-US', name: 'US English - Neural2 Female (A)', gender: 'FEMALE' },
    { code: 'ja-JP-Neural2-B', lang: 'ja-JP', name: 'Japanese - Neural2 Female (B)', gender: 'FEMALE' },
    { code: 'ja-JP-Neural2-C', lang: 'ja-JP', name: 'Japanese - Neural2 Male (C)', gender: 'MALE' },
    { code: 'ja-JP-Neural2-D', lang: 'ja-JP', name: 'Japanese - Neural2 Female (D)', gender: 'FEMALE' },
    { code: 'es-ES-Neural2-F', lang: 'es-ES', name: 'Spanish - Neural2 Female (F)', gender: 'FEMALE' },
    { code: 'fr-FR-Neural2-A', lang: 'fr-FR', name: 'French - Neural2 Female (A)', gender: 'FEMALE' },
    { code: 'de-DE-Neural2-F', lang: 'de-DE', name: 'German - Neural2 Female (F)', gender: 'FEMALE' },
  ];

  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('gcp_tts_api_key', this.apiKey);
  }

  getApiKey() {
    return this.apiKey;
  }

  setVoiceConfig(voiceCode, pitch = 0, speakingRate = 1.0) {
    const voiceObj = GoogleCloudTtsService.NEURAL2_VOICES.find(v => v.code === voiceCode);
    if (voiceObj) {
      this.voiceName = voiceObj.code;
      this.languageCode = voiceObj.lang;
      localStorage.setItem('gcp_tts_voice', this.voiceName);
      localStorage.setItem('gcp_tts_lang', this.languageCode);
    }
    this.pitch = pitch;
    this.speakingRate = speakingRate;
    localStorage.setItem('gcp_tts_pitch', pitch.toString());
    localStorage.setItem('gcp_tts_rate', speakingRate.toString());
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  async speak(text, onStart = null, onEnd = null, onError = null) {
    this.stop();

    // If API Key is present, call Google Cloud Text-to-Speech API
    if (this.apiKey) {
      try {
        const audioUrl = await this._fetchNeural2Audio(text);
        this._playAudio(audioUrl, onStart, onEnd, onError);
        return { mode: 'neural2', voice: this.voiceName };
      } catch (err) {
        console.warn('Google Cloud Neural2 API request failed, falling back to Web Speech Synthesis:', err);
        this._fallbackWebSpeech(text, onStart, onEnd, onError);
        return { mode: 'fallback-browser', error: err.message };
      }
    } else {
      // Fallback to Web Speech Synthesis when API key is not entered
      this._fallbackWebSpeech(text, onStart, onEnd, onError);
      return { mode: 'fallback-browser', voice: 'Browser Standard' };
    }
  }

  async _fetchNeural2Audio(text) {
    const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(this.apiKey)}`;

    const voiceObj = GoogleCloudTtsService.NEURAL2_VOICES.find(v => v.code === this.voiceName) || {
      code: this.voiceName,
      lang: this.languageCode,
      gender: 'FEMALE'
    };

    const payload = {
      input: { text },
      voice: {
        languageCode: voiceObj.lang,
        name: voiceObj.code,
        ssmlGender: voiceObj.gender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: this.speakingRate,
        pitch: this.pitch
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (!data.audioContent) {
      throw new Error('No audio content returned from Google Cloud TTS');
    }

    return `data:audio/mp3;base64,${data.audioContent}`;
  }

  _playAudio(audioSrc, onStart, onEnd, onError) {
    const audio = new Audio(audioSrc);
    this.currentAudio = audio;

    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      this.currentAudio = null;
      if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
      this.currentAudio = null;
      if (onError) onError('Audio playback failed');
    };

    audio.play().catch((err) => {
      console.error('Audio play error:', err);
      if (onError) onError(err.message);
    });
  }

  _fallbackWebSpeech(text, onStart, onEnd, onError) {
    if (!('speechSynthesis' in window)) {
      if (onError) onError('Speech synthesis not supported');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.languageCode;
    utterance.rate = this.speakingRate;
    utterance.pitch = 1.0 + (this.pitch / 20); // Normalize pitch range

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      if (onError) onError(e.error);
    };

    window.speechSynthesis.speak(utterance);
  }
}
