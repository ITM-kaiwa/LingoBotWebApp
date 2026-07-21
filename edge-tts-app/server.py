import asyncio
import io
import os
import traceback
from flask import Flask, request, send_file, send_from_directory, jsonify
from flask_cors import CORS
import edge_tts

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

VOICE_MAP = {
    'en': 'en-US-AriaNeural',
    'en-us': 'en-US-AriaNeural',
    'ja': 'ja-JP-NanamiNeural',
    'ja-jp': 'ja-JP-NanamiNeural',
    'vi': 'vi-VN-HoaiMyNeural',
    'vi-vn': 'vi-VN-HoaiMyNeural',
    'es': 'es-ES-ElviraNeural',
    'es-es': 'es-ES-ElviraNeural',
    'fr': 'fr-FR-DeniseNeural',
    'fr-fr': 'fr-FR-DeniseNeural',
}

DEFAULT_VOICE = 'en-US-AriaNeural'

async def generate_tts_bytes(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
    return bytes(audio_data)

@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('public', path)):
        return send_from_directory('public', path)
    return send_from_directory('public', 'index.html')

@app.route('/api/tts', methods=['POST'])
def tts_endpoint():
    try:
        data = request.get_json() or {}
        text = data.get('text', '').strip()
        language = data.get('language', 'en').strip().lower()
        custom_voice = data.get('voice', None)

        if not text:
            return jsonify({'error': 'Parameter "text" is required.'}), 400

        # Determine voice model
        if custom_voice:
            voice = custom_voice
        else:
            voice = VOICE_MAP.get(language)
            if not voice:
                prefix = language.split('-')[0]
                voice = VOICE_MAP.get(prefix, DEFAULT_VOICE)

        print(f"[Vocalise Edge TTS] Lang: '{language}' -> Voice: '{voice}' | Text: '{text[:25]}...'")

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

if __name__ == '__main__':
    print("🚀 Vocalise Edge AI Server starting on http://localhost:5050")
    app.run(host='0.0.0.0', port=5050, debug=False)
