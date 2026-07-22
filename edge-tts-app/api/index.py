import asyncio
import io
import os
import sys
import json
import tempfile
import traceback
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import edge_tts
import aiohttp
from google import genai
from google.genai import types

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

# Fallback voices if Microsoft blocks or fails the primary voice
FALLBACK_VOICE_MAP = {
    'ja-JP-NanamiNeural': 'ja-JP-KeitaNeural',
    'vi-VN-HoaiMyNeural': 'vi-VN-NamMinhNeural',
    'en-US-AriaNeural': 'en-US-GuyNeural'
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

async def _save_edge_tts_async(text: str, primary_voice: str) -> bytes:
    voices_to_try = [primary_voice]
    if primary_voice in FALLBACK_VOICE_MAP:
        voices_to_try.append(FALLBACK_VOICE_MAP[primary_voice])

    last_error = None
    for attempt_voice in voices_to_try:
        for attempt in range(2):  # Retry up to 2 times per voice
            temp_path = None
            try:
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as fp:
                    temp_path = fp.name

                communicate = edge_tts.Communicate(text, attempt_voice)
                await communicate.save(temp_path)

                with open(temp_path, "rb") as f:
                    audio_bytes = f.read()

                if audio_bytes and len(audio_bytes) > 200:
                    print(f"[Edge TTS Success] Voice: '{attempt_voice}' | Size: {len(audio_bytes)} bytes", flush=True)
                    return audio_bytes
            except Exception as e:
                last_error = e
                print(f"[Edge TTS Warning] Voice '{attempt_voice}' Attempt {attempt+1} failed: {str(e)}", flush=True)
                await asyncio.sleep(0.2)
            finally:
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass

    if last_error:
        raise last_error
    raise RuntimeError("Edge-TTS generated empty audio bytes for all candidate voices.")

def generate_tts_bytes(text: str, voice: str) -> bytes:
    def thread_worker():
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        try:
            return new_loop.run_until_complete(_save_edge_tts_async(text, voice))
        finally:
            new_loop.close()

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(thread_worker)
        return future.result(timeout=25)

@app.route('/', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "service": "LingoBotWebApp Vercel Serverless API (Resilient Voice Fallback Edge-TTS)",
        "python_version": sys.version
    })

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

        print(f"[Edge TTS Vercel Request] Lang: '{language}' -> Primary Voice: '{voice}' | Text: '{text[:30]}...'", flush=True)

        mp3_bytes = generate_tts_bytes(text, voice)

        if not mp3_bytes:
            return jsonify({'error': 'Failed to generate MP3 stream from Edge TTS.'}), 500

        buffer = io.BytesIO(mp3_bytes)
        buffer.seek(0)

        response = send_file(
            buffer,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='lingobot_voice.mp3'
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['X-TTS-Voice'] = voice
        return response

    except Exception as e:
        err_detail = traceback.format_exc()
        print(f"[TTS ERROR TRACEBACK]:\n{err_detail}", flush=True)
        return jsonify({'error': f"TTS Generation Failed: {str(e)}", 'detail': err_detail}), 500

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

        client = genai.Client(api_key=api_key)

        candidate_models = [
            'gemini-3.6-flash',
            'gemini-3.5-flash',
            'gemini-flash'
        ]
        reply_text = None
        used_model = None
        attempt_logs = []

        contents = []
        for item in history[-6:]:
            sender = item.get('sender', 'user')
            text = item.get('text', '').strip()
            if text and not item.get('type') and not item.get('isError'):
                role = "user" if sender == "user" else "model"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=text)]
                ))
        
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message)]
        ))

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7
        )

        for m_name in candidate_models:
            try:
                response = client.models.generate_content(
                    model=m_name,
                    contents=contents,
                    config=config
                )
                if response and response.text:
                    reply_text = response.text.strip()
                    used_model = m_name
                    break
            except Exception as m_err:
                err_msg = f"{m_name}: {str(m_err)}"
                attempt_logs.append(err_msg)
                print(f"[google-genai Try Failed] {err_msg}", flush=True)

        if reply_text:
            return jsonify({'reply': reply_text, 'model': used_model, 'source': 'google-genai-sdk'})

        return jsonify({
            'error': 'Gemini API connection failed for all candidate models using google-genai SDK.',
            'log': ' | '.join(attempt_logs),
            'source': 'gemini-error'
        }), 502

    except Exception as e:
        print(f"[Chat Error Traceback]:\n{traceback.format_exc()}", flush=True)
        return jsonify({'error': str(e), 'log': traceback.format_exc()}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5100, debug=True)
