import asyncio
import io
import os
import json
import urllib.request
import urllib.parse
import traceback
from flask import Flask, request, send_file, send_from_directory, jsonify
from flask_cors import CORS
import edge_tts

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
        api_key = data.get('apiKey', '').strip() or os.getenv('GEMINI_API_KEY', '')
        model_name = data.get('model', 'gemini-1.5-flash').strip()

        ui_name = LANG_NAMES.get(ui_lang, 'Japanese')
        target_name = LANG_NAMES.get(target_lang, 'English')

        system_instruction = (
            f"You are LingoBot, an encouraging, interactive AI language conversation partner in LingoBotWebApp. "
            f"The user's interface language is {ui_name} and their target learning language is {target_name}. "
            f"Always reply warmly, naturally, and concisely (1 to 3 sentences) in {target_name} so the user can practice listening and speaking. "
            f"If the user suggests a scenario (e.g. restaurant, airport, hotel, ordering food), naturally roleplay as a friendly conversation partner in that scenario! "
            f"If the user asks a question about vocabulary or grammar in {ui_name}, provide a short helpful explanation in {ui_name} followed by a practice question in {target_name}."
        )

        # Call Gemini REST API if API Key is available
        if api_key:
            try:
                clean_model = model_name.replace('gemini-3.5-flash', 'gemini-1.5-flash')
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"

                contents = []
                contents.append({"role": "user", "parts": [{"text": system_instruction}]})
                contents.append({"role": "model", "parts": [{"text": f"Understood! I am ready to be your LingoBot conversation tutor in {target_name}."}]})

                for item in history[-6:]:
                    sender = item.get('sender', 'user')
                    text = item.get('text', '').strip()
                    if text and not item.get('type'):
                        role = "user" if sender == "user" else "model"
                        contents.append({"role": role, "parts": [{"text": text}]})

                contents.append({"role": "user", "parts": [{"text": user_message}]})

                payload = {
                    "contents": contents,
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 200
                    }
                }

                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )

                with urllib.request.urlopen(req, timeout=12) as resp:
                    res_data = json.loads(resp.read().decode('utf-8'))
                    candidates = res_data.get('candidates', [])
                    if candidates and 'content' in candidates[0]:
                        parts = candidates[0]['content'].get('parts', [])
                        if parts:
                            reply_text = parts[0].get('text', '').strip()
                            return jsonify({'reply': reply_text, 'model': model_name, 'source': 'gemini-api'})
            except Exception as gemini_err:
                print(f"[Gemini API Exception] {gemini_err}. Falling back to contextual tutor response.")

        reply_text = generate_contextual_tutor_reply(user_message, target_lang, ui_lang)
        return jsonify({'reply': reply_text, 'model': 'LingoBot Context Engine', 'source': 'tutor-engine'})

    except Exception as e:
        print(f"[Chat Error Traceback]:\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

def generate_contextual_tutor_reply(msg, target_lang, ui_lang):
    lower = msg.lower().strip()
    t_prefix = target_lang.split('-')[0]

    # PRIORITY 1: Greetings & Polite Check-ins ("how are you", "i am fine", "hello", "good morning")
    if any(w in lower for w in ['how are you', 'how do you do', 'how are you doing', 'fine', 'good', 'thank', 'thanks', 'hello', 'hi', 'hey', 'chào', 'chao', 'こんにちは', '元気', '初めまして']):
        if t_prefix == 'en':
            return "I am doing great, thank you for asking! What topic or situation would you like to practice today?"
        elif t_prefix == 'ja':
            return "お元気そうで良かったです！今日はどんなトピックについてお話ししましょうか？"
        else: # vi
            return "Tôi rất khỏe, cảm ơn bạn đã hỏi! Hôm nay bạn muốn luyện tập chủ đề gì nào?"

    # PRIORITY 2: Scenario 1 - Restaurant / Ordering / Food (Only if explicitly in current message!)
    elif any(w in lower for w in ['restaurant', 'order', 'food', 'menu', 'eat', 'table', 'waiter', 'drink', 'dish', 'dinner', 'lunch', 'nha hang', 'an', 'giao tiep', 'レストラン', '注文', '料理', '食事', 'メニュー', '店']):
        if t_prefix == 'en':
            if any(w in lower for w in ['drink', 'water', 'coffee', 'tea', 'juice', 'wine', 'beer']):
                return "Excellent choice! I will bring your drink right away. What main dish would you like to order today?"
            elif any(w in lower for w in ['menu', 'recommend', 'special', 'popular']):
                return "Our chef's special today is grilled steak with fresh garden vegetables! Would you like to try that, or do you prefer seafood?"
            else:
                return "Welcome to our restaurant! Here is your table and today's menu. Are you ready to order, or would you like a minute to look it over?"
        elif t_prefix == 'ja':
            return "いらっしゃいませ！レストランへようこそ。こちらが本日のお席とメニューでございます。まずはお飲物からご注文なさいますか？"
        else: # vi
            return "Chào mừng quý khách đến với nhà hàng của chúng tôi! Đây là thực đơn hôm nay. Quý khách muốn gọi món gì ạ?"

    # PRIORITY 3: Scenario 2 - Travel / Airport / Hotel
    elif any(w in lower for w in ['travel', 'flight', 'hotel', 'trip', 'book', 'visit', 'du lich', 'khach san', '旅行', 'ホテル', '空港', '予約']):
        if t_prefix == 'en':
            return "Traveling is so exciting! Welcome to the hotel reception desk. May I have your name and reservation details?"
        elif t_prefix == 'ja':
            return "ご旅行ですね！ホテルのフロントへようこそ。お名前とご予約内容を伺ってもよろしいでしょうか？"
        else:
            return "Chào mừng quý khách đến với khách sạn của chúng tôi! Quý khách đã đặt phòng trước chưa ạ?"

    # PRIORITY 4: Scenario 3 - Hobbies / Free time / Daily life
    elif any(w in lower for w in ['hobby', 'free time', 'weekend', 'music', 'sport', 'movie', 'so thich', 'nhac', '趣味', '音楽', '映画', 'スポーツ']):
        if t_prefix == 'en':
            return "That sounds like a fun hobby! How long have you been doing that, and what do you enjoy most about it?"
        elif t_prefix == 'ja':
            return "とても楽しそうな趣味ですね！どのくらい続けていますか？どんなところが一番お気に入りですか？"
        else:
            return "Sở thích đó thật thú vị! Bạn đã gắn bó với nó lâu chưa và điều gì làm bạn thích nhất?"

    # DEFAULT CONTEXTUAL RESPONSE
    else:
        if t_prefix == 'en':
            return f"That is a great topic! Tell me more about '{msg}'. What would you like to discuss next?"
        elif t_prefix == 'ja':
            return f"素晴らしい話題ですね！『{msg}』についてもう少し詳しく教えていただけますか？"
        else:
            return f"Rất thú vị! Bạn có thể chia sẻ thêm về '{msg}' được không?"

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
