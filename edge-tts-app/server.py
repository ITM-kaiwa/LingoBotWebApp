import io
import os
import sys
import json
import base64
import tempfile
import urllib.request
import urllib.parse
import traceback
from flask import Flask, request, send_file, send_from_directory, jsonify
from flask_cors import CORS
from gtts import gTTS
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

VOICE_OPTION_CATALOG = {
    'journey': {
        'ja-JP': 'ja-JP-Neural2-D',
        'vi-VN': 'vi-VN-Wavenet-A',
        'en-US': 'en-US-Journey-F'
    },
    'neural2-female': {
        'ja-JP': 'ja-JP-Neural2-B',
        'vi-VN': 'vi-VN-Wavenet-A',
        'en-US': 'en-US-Neural2-F'
    },
    'neural2-male': {
        'ja-JP': 'ja-JP-Neural2-C',
        'vi-VN': 'vi-VN-Wavenet-B',
        'en-US': 'en-US-Neural2-D'
    },
    'wavenet': {
        'ja-JP': 'ja-JP-Wavenet-B',
        'vi-VN': 'vi-VN-Wavenet-B',
        'en-US': 'en-US-Wavenet-F'
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

def call_google_cloud_tts_api(text: str, lang_code: str, voice_name: str, api_key: str) -> bytes:
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
    payload = {
        "input": { "text": text },
        "voice": {
            "languageCode": lang_code,
            "name": voice_name
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
    with urllib.request.urlopen(req, timeout=6) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        if "audioContent" in res_data:
            return base64.b64decode(res_data["audioContent"])
    return None

def generate_google_cloud_tts_with_stepwise_fallback(text: str, language: str, voice_option_key: str = 'journey', api_key: str = None) -> (bytes, str, str):
    lang_code = resolve_lang_code(language)
    clean_key = (api_key or os.getenv('GEMINI_API_KEY') or '').strip()

    if not clean_key:
        print("[TTS Backend Note] No API key available -> Signaling browser fallback", flush=True)
        return None, 'browser_fallback', 'none'

    primary_model_dict = VOICE_OPTION_CATALOG.get(voice_option_key, VOICE_OPTION_CATALOG['journey'])
    primary_voice = primary_model_dict.get(lang_code, primary_model_dict['en-US'])
    
    female_fallback_voice = VOICE_OPTION_CATALOG['neural2-female'].get(lang_code, 'en-US-Neural2-F')
    male_fallback_voice = VOICE_OPTION_CATALOG['neural2-male'].get(lang_code, 'en-US-Neural2-D')

    fallback_sequence = [
        ('step1_requested', primary_voice),
        ('step2_neural2_female', female_fallback_voice),
        ('step3_neural2_male', male_fallback_voice)
    ]

    seen_voices = set()
    unique_sequence = []
    for step_label, voice_name in fallback_sequence:
        if voice_name not in seen_voices:
            seen_voices.add(voice_name)
            unique_sequence.append((step_label, voice_name))

    for step_label, voice_name in unique_sequence:
        try:
            audio_bytes = call_google_cloud_tts_api(text, lang_code, voice_name, clean_key)
            if audio_bytes and len(audio_bytes) > 200:
                print(f"[TTS Success ({step_label})] Voice: {voice_name}", flush=True)
                return audio_bytes, step_label, voice_name
        except Exception as err:
            print(f"[TTS Try Failed ({step_label} - {voice_name})]: {str(err)}", flush=True)

    return None, 'browser_fallback', 'none'

@app.route('/api/tts', methods=['POST'])
def tts_endpoint():
    try:
        data = request.get_json() or {}
        text = data.get('text', '').strip()
        language = data.get('language', 'en').strip().lower()
        voice_option_key = data.get('voice', 'journey').strip().lower()
        api_key = data.get('apiKey', '')

        if not text:
            return jsonify({'error': 'Parameter "text" is required.'}), 400

        print(f"[TTS Endpoint Request] OptionKey: '{voice_option_key}' | Lang: '{language}' | Text: '{text[:30]}...'", flush=True)

        mp3_bytes, step_used, voice_used = generate_google_cloud_tts_with_stepwise_fallback(text, language, voice_option_key, api_key)

        if not mp3_bytes or step_used == 'browser_fallback':
            return jsonify({
                "fallback_to_browser": True,
                "error": "Google Cloud TTS completely unavailable or quota exceeded."
            }), 503

        buffer = io.BytesIO(mp3_bytes)
        buffer.seek(0)

        response = send_file(
            buffer,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='lingobot_google_voice.mp3'
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['X-TTS-Step'] = step_used
        response.headers['X-TTS-Voice'] = voice_used
        return response

    except Exception as e:
        err_detail = traceback.format_exc()
        print(f"[TTS ERROR TRACEBACK]:\n{err_detail}", flush=True)
        return jsonify({
            "fallback_to_browser": True,
            "error": f"Google Cloud TTS Generation Failed: {str(e)}",
            "detail": err_detail
        }), 503

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

@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('public', path)):
        return send_from_directory('public', path)
    return send_from_directory('public', 'index.html')

if __name__ == '__main__':
    print("🚀 Vocalise Edge AI Server starting on http://localhost:5100 (Stepwise Fallback TTS)")
    app.run(host='0.0.0.0', port=5100, debug=False)
