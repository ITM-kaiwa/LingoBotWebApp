import asyncio
import os
import edge_tts

TEST_CASES = [
    {"text": "Hello! This is Microsoft Edge TTS speaking in English with Aria Neural.", "voice": "en-US-AriaNeural", "file": "test_en.mp3"},
    {"text": "こんにちは！Microsoft Edgeの高品質なナナミボイスです。", "voice": "ja-JP-NanamiNeural", "file": "test_ja.mp3"},
    {"text": "Xin chào! Đây là giọng đọc Hoài My từ Microsoft Edge TTS.", "voice": "vi-VN-HoaiMyNeural", "file": "test_vi.mp3"},
]

async def test_generation():
    print("🧪 Testing Microsoft Edge TTS direct voice generation...")
    for test in TEST_CASES:
        print(f"\n-> Generating [{test['voice']}]...")
        communicate = edge_tts.Communicate(test['text'], test['voice'])
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
        
        size = len(audio_data)
        print(f"   [SUCCESS] Generated {size} bytes for '{test['file']}'.")
        
        # Write to test mp3 file
        with open(test['file'], 'wb') as f:
            f.write(audio_data)
            
        assert size > 5000, f"Audio file size too small: {size}"

    print("\n✅ ALL EDGE TTS TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(test_generation())
