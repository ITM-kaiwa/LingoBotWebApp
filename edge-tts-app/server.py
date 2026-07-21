import asyncio
import io
import os
from flask import Flask, request, send_file, send_from_directory, jsonify
from flask_cors import CORS
import edge_tts

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# Preset Voice Mappings as specified in requirements
VOICE_MAP = {
    'en': 'en-US-AriaNeural',
    'en-US': 'en-US-AriaNeural',
    'ja': 'ja-JP-NanamiNeural',
    'ja-JP': 'ja-JP-NanamiNeural',
    'vi': 'vi-VN-HoaiMyNeural',
    'vi-VN': 'vi-VN-HoaiMyNeural',
    'fr': 'fr-FR-DeniseNeural',
    'fr-FR': 'fr-FR-DeniseNeural',
    'es': 'es-ES-ElviraNeural',
    'es-ES': 'es-ES-ElviraNeural',
    'de': 'de-DE-KatjaNeural',
    'de-DE': 'de-DE-KatjaNeural',
}

DEFAULT_VOICE = 'en-US-AriaNeural'

async def generate_tts_bytes(text: str, voice: str) -> bytes:
    """Uses edge-tts to synthesize speech into MP3 byte stream."""
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
        language = data.get('language', 'en').lower().strip()
        custom_voice = data.get('voice', None)

        if not text:
            return jsonify({'error': 'Parameter "text" is required.'}), 400

        # Determine voice model
        if custom_voice:
            voice = custom_voice
        else:
            voice = VOICE_MAP.get(language, DEFAULT_VOICE)

        print(f"[TTS Request] Lang: '{language}' -> Voice: '{voice}' | Text: '{text[:30]}...'")

        # Run async edge-tts inside sync Flask route
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        mp3_bytes = loop.run_until_complete(generate_tts_bytes(text, voice))
        loop.close()

        if not mp3_bytes:
            return jsonify({'error': 'Failed to generate audio stream from Edge TTS.'}), 500

        buffer = io.BytesIO(mp3_bytes)
        buffer.seek(0)

        response = send_file(
            buffer,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='ai_voice.mp3'
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['X-TTS-Voice'] = voice
        return response

    except Exception as e:
        print(f"[TTS Error] {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/voices', methods=['GET'])
def list_voices():
    return jsonify({
        'presets': [
            {'lang': 'en', 'code': 'en-US-AriaNeural', 'name': 'English (US) - Aria Neural'},
            {'lang': 'ja', 'code': 'ja-JP-NanamiNeural', 'name': 'Japanese - Nanami Neural'},
            {'lang': 'vi', 'code': 'vi-VN-HoaiMyNeural', 'name': 'Vietnamese - HoaiMy Neural'},
            {'lang': 'fr', 'code': 'fr-FR-DeniseNeural', 'name': 'French - Denise Neural'},
            {'lang': 'es', 'code': 'es-ES-ElviraNeural', 'name': 'Spanish - Elvira Neural'}
        ]
    })

if __name__ == '__main__':
    print("🚀 Edge TTS Server starting on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
