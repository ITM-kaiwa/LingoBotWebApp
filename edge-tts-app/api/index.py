import io
import os
import sys
import json
import base64
import tempfile
import urllib.request
import urllib.parse
import traceback
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from gtts import gTTS
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

# Google Cloud Text-to-Speech Official Voice Model Catalog
# Fully Dedicated to Google Cloud Neural2 / WaveNet / Journey Voice Models
GOOGLE_TTS_CATALOG = {
    'neural2-b': { # Google Neural2 Female Voice
        'ja-JP': 'ja-JP-Neural2-B',
        'vi-VN': 'vi-VN-Wavenet-A',
        'en-US': 'en-US-Neural2-F'
    },
    'neural2-c': { # Google Neural2 Male Voice
        'ja-JP': 'ja-JP-Neural2-C',
        'vi-VN': 'vi-VN-Wavenet-B',
        'en-US': 'en-US-Neural2-D'
    },
    'journey': { # Google Journey Conversational Voice
        'ja-JP': 'ja-JP-Neural2-D',
        'vi-VN': 'vi-VN-Wavenet-A',
        'en-US': 'en-US-Journey-F'
    },
    'wavenet': { # Google WaveNet Deep Natural Voice
        'ja-JP': 'ja-JP-Wavenet-B',
        'vi-VN': 'vi-VN-Wavenet-B',
        'en-US': 'en-US-Wavenet-F'
    },
    'standard': { # Google Standard Voice
        'ja-JP': 'ja-JP-Standard-B',
        'vi-VN': 'vi-VN-Standard-A',
        'en-US': 'en-US-Standard-B'
    }
}

LANG_NAMES = {
    'en': 'English',
    'en-us': 'English',
    'ja': 'Japanese (日本語)',
    'ja-jp': 'Japanese (日本語)',
    'vi': 'Vietnamese (Tiếng Việt)',
    'vi-vn': 'Vietnamese (Tiếng Việt)'
}

def resolve_lang_code(lang_str: str) -> str:
    l = lang_str.lower()
    if l.startswith('ja'): return 'ja-JP'
    if l.startswith('vi'): return 'vi-VN'
    return 'en-US'

def call_google_cloud_tts_api(text: str, lang_code: str, google_voice_name: str, api_key: str) -> bytes:
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
    payload = {
        "input": { "text": text },
        "voice": {
            "languageCode": lang_code,
            "name": google_voice_name
        },
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": 1.0,
            "pitch": 0.0
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req, timeout=8) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        if "audioContent" in res_data:
            return base64.b64decode(res_data["audioContent"])
    return None

def generate_google_cloud_tts(text: str, language: str, voice_model_key: str = 'neural2-b', api_key: str = None) -> (bytes, str, str):
    lang_code = resolve_lang_code(language)
    model_key = voice_model_key.lower()

    cat_entry = GOOGLE_TTS_CATALOG.get(model_key, GOOGLE_TTS_CATALOG['neural2-b'])
    target_google_voice = cat_entry.get(lang_code, cat_entry['en-US'])

    clean_key = (api_key or os.getenv('GEMINI_API_KEY') or '').strip()

    # 1. Primary Engine: Direct Google Cloud Text-to-Speech REST API (Neural2 / Journey / WaveNet)
    if clean_key:
        try:
            audio_bytes = call_google_cloud_tts_api(text, lang_code, target_google_voice, clean_key)
            if audio_bytes and len(audio_bytes) > 200:
                print(f"[Google Cloud TTS Direct API Success] Voice Model: {target_google_voice}", flush=True)
                return audio_bytes, 'google-cloud-tts', target_google_voice
        except Exception as gc_err:
            print(f"[Google Cloud TTS Direct API Warning] ({target_google_voice}): {str(gc_err)} -> Trying Google Cloud Standard Model", flush=True)

        # 2. Secondary Engine: Google Cloud Standard Model Fallback (e.g. ja-JP-Standard-B)
        standard_google_voice = GOOGLE_TTS_CATALOG['standard'].get(lang_code, 'en-US-Standard-B')
        try:
            audio_bytes_std = call_google_cloud_tts_api(text, lang_code, standard_google_voice, clean_key)
            if audio_bytes_std and len(audio_bytes_std) > 200:
                print(f"[Google Cloud Standard Voice Fallback Success] Voice: {standard_google_voice}", flush=True)
                return audio_bytes_std, 'google-cloud-standard', standard_google_voice
        except Exception as std_err:
            print(f"[Google Cloud Standard Voice Warning]: {str(std_err)} -> Trying gTTS", flush=True)

    # 3. Final Universal Fallback: gTTS (Google Translate Voice Engine)
    short_lang = lang_code.split('-')[0]
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as fp:
            temp_path = fp.name

        tts = gTTS(text=text, lang=short_lang, slow=False)
        tts.save(temp_path)
        with open(temp_path, "rb") as f:
            audio_bytes_gtts = f.read()

        if audio_bytes_gtts and len(audio_bytes_gtts) > 200:
            print(f"[gTTS Fallback Success] Lang: {short_lang}", flush=True)
            return audio_bytes_gtts, 'gtts-fallback', 'gTTS-Standard'
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

    return None, 'failed', 'none'

@app.route('/', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "service": "LingoBotWebApp Vercel API (Google Cloud TTS Neural2/Journey/WaveNet)",
        "python_version": sys.version
    })

@app.route('/api/tts', methods=['POST'])
def tts_endpoint():
    try:
        data = request.get_json() or {}
        text = data.get('text', '').strip()
        language = data.get('language', 'en').strip().lower()
        voice_model_key = data.get('voiceModel', 'neural2-b').strip().lower()
        api_key = data.get('apiKey', '')

        if not text:
            return jsonify({'error': 'Parameter "text" is required.'}), 400

        print(f"[Google Cloud TTS Request] ModelKey: '{voice_model_key}' | Lang: '{language}' | Text: '{text[:30]}...'", flush=True)

        mp3_bytes, engine_used, voice_used = generate_google_cloud_tts(text, language, voice_model_key, api_key)

        if not mp3_bytes:
            return jsonify({'error': 'Failed to generate MP3 audio from Google Cloud TTS.'}), 500

        buffer = io.BytesIO(mp3_bytes)
        buffer.seek(0)

        response = send_file(
            buffer,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='lingobot_google_voice.mp3'
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['X-TTS-Engine'] = engine_used
        response.headers['X-TTS-Voice'] = voice_used
        return response

    except Exception as e:
        err_detail = traceback.format_exc()
        print(f"[TTS ERROR TRACEBACK]:\n{err_detail}", flush=True)
        return jsonify({'error': f"Google Cloud TTS Generation Failed: {str(e)}", 'detail': err_detail}), 500

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    try:
        data = request.get_json() or {}
        user_message = data.get('message', '').strip()
        history = data.get('history', [])
        ui_lang = data.get('uiLang', 'ja-JP').strip().lower()
        target_lang = data.get('targetLang', 'en-US').strip().lower()

        raw_api_key = data.get('apiKey', '') or os.getenv('GEMINI_API_KEY', '')
        api_key = raw_api_key.strip().replace('\r', '').replace('\n', '').replace(' ', '')

        if not api_key:
            return jsonify({
                'error': 'Gemini API Key is missing.',
                'log': 'API key was not provided in request or environment variables.',
                'source': 'gemini-error'
            }), 401

        ui_name = LANG_NAMES.get(ui_lang, 'Japanese')
        target_name = LANG_NAMES.get(target_lang, 'English')

        system_instruction = (
            f"You are LingoBot, an encouraging, interactive AI language conversation partner in LingoBotWebApp. "
            f"The user's interface language is {ui_name} and their target learning language is {target_name}. "
            f"CRITICAL RULE: Always write COMPLETE, fully formed sentences with proper punctuation (. ! ?). Never cut off mid-sentence. "
            f"{'CRITICAL RULE FOR JAPANESE: When writing in Japanese, ALWAYS write furigana in parentheses immediately after EVERY Kanji word, for example: 空港（くうこう） or 荷物（にもつ） or お預（あず）かり so learners can read the pronunciation! ' if target_lang.startswith('ja') else ''}"
            f"Always reply warmly, naturally, and concisely (1 to 3 complete sentences) in {target_name} so the user can practice listening and speaking. "
            f"If the user suggests a scenario (e.g. restaurant, airport, hotel, ordering food), naturally roleplay as a friendly conversation partner in that scenario! "
            f"If the user asks a question about vocabulary or grammar in {ui_name}, provide a short helpful explanation in {ui_name} followed by a practice question in {target_name}."
        )

        genai.configure(api_key=api_key)

        candidate_models = [
            'gemini-3.6-flash',
            'gemini-3.5-flash',
            'gemini-flash'
        ]
        reply_text = None
        used_model = None
        attempt_logs = []

        sdk_history = []
        for item in history[-6:]:
            sender = item.get('sender', 'user')
            text = item.get('text', '').strip()
            if text and not item.get('type') and not item.get('isError'):
                role = "user" if sender == "user" else "model"
                sdk_history.append({"role": role, "parts": [text]})

        for m_name in candidate_models:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_instruction
                )
                chat_session = model.start_chat(history=sdk_history)
                response = chat_session.send_message(user_message)
                if response and response.text:
                    reply_text = response.text.strip()
                    used_model = m_name
                    break
            except Exception as m_err:
                err_msg = f"{m_name}: {str(m_err)}"
                attempt_logs.append(err_msg)
                print(f"[Gemini Model Try Failed] {err_msg}", flush=True)

        if reply_text:
            return jsonify({'reply': reply_text, 'model': used_model, 'source': 'gemini-sdk'})

        return jsonify({
            'error': 'Gemini API connection failed for all candidate models.',
            'log': ' | '.join(attempt_logs),
            'source': 'gemini-error'
        }), 502

    except Exception as e:
        print(f"[Chat Error Traceback]:\n{traceback.format_exc()}", flush=True)
        return jsonify({'error': str(e), 'log': traceback.format_exc()}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5100, debug=True)
