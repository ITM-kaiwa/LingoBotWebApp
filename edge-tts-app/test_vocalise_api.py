import urllib.request
import json

def test_vocalise_edge_api():
    url = "http://localhost:5050/api/tts"
    payload = {
        "text": "こんにちは！柔らかな暖色デザインの会話練習アプリです。",
        "language": "ja-JP"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.status}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"X-TTS-Voice: {response.headers.get('X-TTS-Voice')}")
        mp3 = response.read()
        print(f"MP3 Bytes: {len(mp3)}")
        assert response.status == 200
        assert len(mp3) > 5000
        print("✅ Vocalise Edge API Test Passed!")

if __name__ == '__main__':
    test_vocalise_edge_api()
