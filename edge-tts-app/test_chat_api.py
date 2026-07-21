import urllib.request
import json

def test_greeting_conversation():
    url = "http://127.0.0.1:5100/api/chat"
    payload = {
        "message": "I am fine, thank you. And you? How are you doing?",
        "history": [
            {"sender": "ai", "text": "Wonderful! Target language set to English. Let's practice speaking together!"}
        ],
        "uiLang": "ja-JP",
        "targetLang": "en-US",
        "model": "gemini-1.5-flash"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')

    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.status}")
        res_json = json.loads(response.read().decode('utf-8'))
        print("AI Tutor Reply:", res_json.get('reply'))
        print("AI Model:", res_json.get('model'))
        assert response.status == 200
        assert "restaurant" not in res_json.get('reply').lower()
        print("✅ Greeting Check-in Scenario Passed Successfully on Port 5100!")

if __name__ == '__main__':
    test_greeting_conversation()
