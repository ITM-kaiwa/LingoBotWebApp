// Microsoft Edge TTS Client Service (Speech Synthesis & MP3 Download)

export class EdgeTtsService {
  constructor() {
    this.currentAudio = null;
    this.currentBlobUrl = null;
    this.activeId = null;
  }

  static VOICE_MAP = {
    'en': { code: 'en-US-AriaNeural', name: 'US English - Aria Neural', flag: '🇺🇸' },
    'en-US': { code: 'en-US-AriaNeural', name: 'US English - Aria Neural', flag: '🇺🇸' },
    'ja': { code: 'ja-JP-NanamiNeural', name: '日本語 - Nanami Neural', flag: '🇯🇵' },
    'ja-JP': { code: 'ja-JP-NanamiNeural', name: '日本語 - Nanami Neural', flag: '🇯🇵' },
    'vi': { code: 'vi-VN-HoaiMyNeural', name: 'Tiếng Việt - Hoài Mỹ Neural', flag: '🇻🇳' },
    'vi-VN': { code: 'vi-VN-HoaiMyNeural', name: 'Tiếng Việt - Hoài Mỹ Neural', flag: '🇻🇳' },
    'es': { code: 'es-ES-ElviraNeural', name: 'Spanish - Elvira Neural', flag: '🇪🇸' },
    'fr': { code: 'fr-FR-DeniseNeural', name: 'French - Denise Neural', flag: '🇫🇷' },
  };

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.activeId = null;
  }

  async fetchMp3Blob(text, language = 'en', customVoice = null) {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
        voice: customVoice
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Server HTTP Error ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async speak(id, text, language = 'en', onStart = null, onEnd = null, onError = null) {
    if (this.activeId === id && this.currentAudio) {
      this.stop();
      if (onEnd) onEnd();
      return;
    }

    this.stop();

    try {
      const blobUrl = await this.fetchMp3Blob(text, language);
      const audio = new Audio(blobUrl);
      this.currentAudio = audio;
      this.activeId = id;

      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.currentAudio = null;
        this.activeId = null;
        if (onEnd) onEnd();
      };

      audio.onerror = (e) => {
        this.currentAudio = null;
        this.activeId = null;
        if (onError) onError('Playback error');
      };

      await audio.play();
    } catch (err) {
      console.error('Edge TTS Error:', err);
      this.stop();
      if (onError) onError(err.message);
    }
  }

  async downloadMp3(text, language = 'en', filename = 'edge_tts_audio.mp3') {
    try {
      const blobUrl = await this.fetchMp3Blob(text, language);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert(`MP3 Download Failed: ${err.message}`);
    }
  }
}
