import urllib.request
import json

def test_api():
    print("🧪 Testing HTTP POST to http://localhost:5000/api/tts ...")
    url = "http://localhost:5000/api/tts"
    payload = {
        "text": "こんにちは！Microsoft Edge TTSのテスト配信です。",
        "language": "ja"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

    with urllib.request.urlopen(req) as response:
        content_type = response.headers.get('Content-Type')
        voice_header = response.headers.get('X-TTS-Voice')
        mp3_data = response.read()
        
        print(f"Status Code: {response.status}")
        print(f"Content-Type: {content_type}")
        print(f"X-TTS-Voice: {voice_header}")
        print(f"Received MP3 Bytes: {len(mp3_data)}")
        
        assert response.status == 200
        assert 'audio/mpeg' in content_type
        assert len(mp3_data) > 5000
        print("✅ HTTP API TEST PASSED PERFECTLY!")

if __name__ == '__main__':
    test_api()
