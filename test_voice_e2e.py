import urllib.request
import json

tts_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/tts',
    data=json.dumps({'text': 'Assalam o alaikum, weekly plan ki price kya hai?'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(tts_req) as tts_res:
    audio_sample = tts_res.read()

print('Audio sample generated, length:', len(audio_sample))

boundary = '----TestBoundary123456'
body = (
    b'--' + boundary.encode() + b'\r\n' +
    b'Content-Disposition: form-data; name="file"; filename="sample.mp3"\r\n' +
    b'Content-Type: audio/mp3\r\n\r\n' +
    audio_sample +
    b'\r\n--' + boundary.encode() + b'--\r\n'
)

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/voice',
    data=body,
    headers={'Content-Type': 'multipart/form-data; boundary=' + boundary}
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print('STT Transcript:', res.get('transcript'))
    print('AI Reply:', res.get('reply'))
    print('Audio base64 present:', bool(res.get('audio_base64')), 'length:', len(res.get('audio_base64', '')))
