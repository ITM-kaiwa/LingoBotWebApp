import asyncio
import io
import os
import json
import traceback
from flask import Flask, request, send_file, send_from_directory, jsonify
from flask_cors import CORS
import edge_tts
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

VOICE_MAP = {
    'en': 'en-US-AriaNeural',
    'en-us': 'en-US-AriaNeural',
    'ja': 'ja-JP-NanamiNeural',
    'ja-jp': 'ja-JP-NanamiNeural',
    'vi': 'vi-VN-HoaiMyNeural',
    'vi-vn': 'vi-VN-HoaiMyNeural',
    'es': 'es-ES-ElviraNeural',
    'fr': 'fr-FR-DeniseNeural',
}

DEFAULT_VOICE = 'en-US-AriaNeural'

LANG_NAMES = {
    'en': 'English',
    'en-us': 'English',
    'ja': 'Japanese (日本語)',
    'ja-jp': 'Japanese (日本語)',
    'vi': 'Vietnamese (Tiếng Việt)',
    'vi-vn': 'Vietnamese (Tiếng Việt)'
}

async def generate_tts_bytes(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
    return bytes(audio_data)

@app.route('/api/tts', methods=['POST'])
def tts_endpoint():
    try:
        data = request.get_json() or {}
        text = data.get('text', '').strip()
        language = data.get('language', 'en').strip().lower()
        custom_voice = data.get('voice', None)

        if not text:
            return jsonify({'error': 'Parameter "text" is required.'}), 400

        if custom_voice:
            voice = custom_voice
        else:
            voice = VOICE_MAP.get(language)
            if not voice:
                prefix = language.split('-')[0]
                voice = VOICE_MAP.get(prefix, DEFAULT_VOICE)

        print(f"[Edge TTS] Lang: '{language}' -> Voice: '{voice}' | Text: '{text[:25]}...'")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        mp3_bytes = loop.run_until_complete(generate_tts_bytes(text, voice))
        loop.close()

        if not mp3_bytes:
            return jsonify({'error': 'Failed to generate MP3 stream from Edge TTS.'}), 500

        buffer = io.BytesIO(mp3_bytes)
        buffer.seek(0)

        response = send_file(
            buffer,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='vocalise_edge_voice.mp3'
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['X-TTS-Voice'] = voice
        return response

    except Exception as e:
        print(f"[TTS Error Traceback]:\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    try:
        data = request.get_json() or {}
        user_message = data.get('message', '').strip()
        history = data.get('history', [])
        ui_lang = data.get('uiLang', 'ja-JP').strip().lower()
        target_lang = data.get('targetLang', 'en-US').strip().lower()

        # Clean API Key
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
            f"Always reply warmly, naturally, and concisely (1 to 3 complete sentences) in {target_name} so the user can practice listening and speaking. "
            f"If the user suggests a scenario (e.g. restaurant, airport, hotel, ordering food), naturally roleplay as a friendly conversation partner in that scenario! "
            f"If the user asks a question about vocabulary or grammar in {ui_name}, provide a short helpful explanation in {ui_name} followed by a practice question in {target_name}."
        )

        genai.configure(api_key=api_key)

        candidate_models = [
            'gemini-flash',
            'gemini-3.5-flash'
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
                print(f"[Gemini Model Try Failed] {err_msg}")

        if reply_text:
            return jsonify({'reply': reply_text, 'model': used_model, 'source': 'gemini-sdk'})

        # If all models failed, return strict connection error (no local fallback script)
        return jsonify({
            'error': 'Gemini API connection failed for all candidate models.',
            'log': ' | '.join(attempt_logs),
            'source': 'gemini-error'
        }), 502

    except Exception as e:
        print(f"[Chat Error Traceback]:\n{traceback.format_exc()}")
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
    print("🚀 Vocalise Edge AI Server starting on http://localhost:5100")
    app.run(host='0.0.0.0', port=5100, debug=False)
