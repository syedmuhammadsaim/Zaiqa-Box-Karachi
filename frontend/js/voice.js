/**
 * ZaiqaBox Karachi - Hands-Free Continuous AI Voice Call
 * Deepgram Nova-2 STT + Groq LLaMA 3.3 + Deepgram Aura TTS
 * 
 * Features:
 * - Hands-free continuous live call (No "Tap to Speak" button needed)
 * - Auto silence detection: Waits 2 seconds after user finishes speaking, then generates answer
 * - Speaks in Roman Urdu if question is Roman Urdu; English if question is English
 * - Auto-loop: As soon as AI finishes speaking its reply, mic automatically listens for next question
 * - Clean interface: Real-time pulse visualizer, captions, and single End Call button
 */

class VoiceAssistant {
  constructor() {
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.isPlaying = false;
    this.currentAudio = null;
    this.activeAudioSource = null;
    this.audioContext = null;
    this.analyser = null;
    this.silenceTimer = null;
    this.isModalActive = false;
    this.animationFrameId = null;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Chat bar elements
    this.micBtn = document.getElementById("chatMicBtn");
    this.stateBanner = document.getElementById("voiceStateBanner");
    this.stateIcon = document.getElementById("voiceStateIcon");
    this.stateText = document.getElementById("voiceStateText");
    this.stopBtn = document.getElementById("voiceStopBtn");

    // Modal elements
    this.modal = document.getElementById("voiceCallModal");
    this.launcherBtn = document.getElementById("voiceCallLauncherBtn");
    this.closeModalBtn = document.getElementById("closeVoiceCallBtn");
    this.endCallBtn = document.getElementById("voiceEndCallBtn");
    this.faqVoiceBtn = document.getElementById("openVoiceInChatBtn");
    this.visualizer = document.getElementById("voiceVisualizer");
    this.avatarCircle = document.getElementById("voiceAvatarCircle");
    this.liveStatus = document.getElementById("voiceLiveStatus");
    this.statusText = document.getElementById("voiceStatusText");
    this.userCaption = document.getElementById("voiceUserCaption");
    this.userText = document.getElementById("voiceUserText");
    this.botCaption = document.getElementById("voiceBotCaption");
    this.botText = document.getElementById("voiceBotText");
  }

  bindEvents() {
    // Chat widget mic toggle
    if (this.micBtn) {
      this.micBtn.addEventListener("click", () => this.toggleRecording(false));
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener("click", () => this.stopAll());
    }

    // Modal Open Buttons
    if (this.launcherBtn) {
      this.launcherBtn.addEventListener("click", () => this.openModal());
    }
    if (this.faqVoiceBtn) {
      this.faqVoiceBtn.addEventListener("click", () => this.openModal());
    }

    // Modal Close / End Call Buttons
    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener("click", () => this.closeModal());
    }
    if (this.endCallBtn) {
      this.endCallBtn.addEventListener("click", () => this.closeModal());
    }

    // Close on backdrop click
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }
  }

  async openModal() {
    this.isModalActive = true;
    if (this.modal) {
      this.modal.classList.add("open");
    }
    this.setModalState("connecting", "Connecting Call... (Microphone activating)");
    trackEvent("voice_call_started");

    // Pre-unlock AudioContext on user interaction to guarantee seamless audio playback
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && !this.audioContext) {
        this.audioContext = new AudioContextClass();
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
    } catch (e) {}

    // Immediately start listening hands-free!
    await this.startRecording(true);
  }

  closeModal() {
    this.isModalActive = false;
    this.stopAll();
    if (this.modal) {
      this.modal.classList.remove("open");
    }
    if (this.statusText) {
      this.statusText.textContent = "Call Ended";
    }
    trackEvent("voice_call_ended");
  }

  setModalState(state, customText) {
    if (!this.visualizer) return;

    this.visualizer.classList.remove("listening", "speaking");

    if (state === "listening") {
      this.visualizer.classList.add("listening");
      if (this.statusText) {
        this.statusText.textContent = customText || "🟢 Listening... (Speak now)";
      }
    } else if (state === "thinking") {
      if (this.statusText) {
        this.statusText.textContent = customText || "⏳ Thinking... (Preparing answer)";
      }
    } else if (state === "speaking") {
      this.visualizer.classList.add("speaking");
      if (this.statusText) {
        this.statusText.textContent = customText || "🔊 ZaiqaBox AI Speaking...";
      }
    } else if (state === "connecting") {
      if (this.statusText) {
        this.statusText.textContent = customText || "Connecting Call...";
      }
    } else {
      if (this.statusText) {
        this.statusText.textContent = customText || "🟢 Call Connected • Speak now";
      }
    }
  }

  setChatState(state, customText) {
    if (!this.stateBanner) return;

    if (!state) {
      this.stateBanner.classList.remove("visible");
      if (this.micBtn) this.micBtn.classList.remove("recording");
      return;
    }

    this.stateBanner.classList.add("visible");

    if (state === "listening") {
      this.stateIcon.textContent = "🎙️";
      this.stateText.textContent = customText || "Listening... Speak now";
      if (this.micBtn) this.micBtn.classList.add("recording");
    } else if (state === "thinking") {
      this.stateIcon.textContent = "⏳";
      this.stateText.textContent = customText || "Thinking... Processing";
      if (this.micBtn) this.micBtn.classList.remove("recording");
    } else if (state === "speaking") {
      this.stateIcon.textContent = "🔊";
      this.stateText.textContent = customText || "Speaking reply...";
      if (this.micBtn) this.micBtn.classList.remove("recording");
    }
  }

  async toggleRecording(isModal = false) {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording(isModal);
    }
  }

  async startRecording(isModal = false) {
    if (this.isRecording) return;
    this.stopPlaybackOnly();

    this.isModalActive = isModal || (this.modal && this.modal.classList.contains("open"));

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone recording is not supported on this browser.");
      return;
    }

    try {
      if (!this.audioStream || !this.audioStream.active) {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }

      this.audioChunks = [];

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      }

      const options = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.audioStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecordedAudio(mimeType);
      };

      // Voice Activity Detection (Auto silence detector: 2s threshold)
      try {
        if (!this.audioContext) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            this.audioContext = new AudioContextClass();
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            source.connect(this.analyser);
          }
        }
        if (this.audioContext && this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }
        this.detectSilence();
      } catch (vadErr) {
        console.warn("[VAD Init Warning]", vadErr);
      }

      this.mediaRecorder.start(250);
      this.isRecording = true;

      if (this.isModalActive) {
        this.setModalState("listening", "🟢 Listening... Speak now");
      } else {
        this.setChatState("listening");
      }

    } catch (err) {
      console.warn("[Microphone Permission Denied or Error]", err);
      this.isRecording = false;
      this.setModalState("idle", "Microphone access required");
      this.setChatState(null);
      alert("Microphone access is required for live voice call. Please allow microphone in browser.");
    }
  }

  detectSilence() {
    if (!this.analyser) return;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    let silenceStart = null;
    let spokenDetected = false;
    const recordStartTime = Date.now();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const checkAudio = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i];
      const avg = sum / buffer.length;

      // Pulse avatar circle subtly with speech volume
      if (this.avatarCircle && avg > 7) {
        const scale = Math.min(1.25, 1.0 + (avg / 120));
        this.avatarCircle.style.transform = `scale(${scale})`;
      } else if (this.avatarCircle && !this.isPlaying) {
        this.avatarCircle.style.transform = "scale(1)";
      }

      // Sensitive speech threshold (picks up normal and soft voices)
      if (avg > 7) {
        spokenDetected = true;
        silenceStart = null;
      } else if (spokenDetected) {
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > 1800) {
          // Exactly ~1.8 seconds after user finishes sentence: Answer immediately!
          if (this.avatarCircle) this.avatarCircle.style.transform = "scale(1)";
          this.stopRecording();
          return;
        }
      }

      // Safeguard: auto-stop after 8 seconds of continuous recording to answer promptly
      if (spokenDetected && (Date.now() - recordStartTime > 8000)) {
        if (this.avatarCircle) this.avatarCircle.style.transform = "scale(1)";
        this.stopRecording();
        return;
      }

      this.animationFrameId = requestAnimationFrame(checkAudio);
    };

    this.animationFrameId = requestAnimationFrame(checkAudio);
  }

  stopRecording() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
      this.isRecording = false;

      if (this.isModalActive) {
        this.setModalState("thinking", "⏳ Preparing answer...");
      } else {
        this.setChatState("thinking");
      }
    }
  }

  stopPlaybackOnly() {
    if (this.activeAudioSource) {
      try {
        this.activeAudioSource.stop();
        this.activeAudioSource.disconnect();
      } catch (e) {}
      this.activeAudioSource = null;
    }
    if (this.currentAudio) {
      try { this.currentAudio.pause(); } catch (e) {}
      this.currentAudio = null;
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
  }

  stopAll() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.isRecording && this.mediaRecorder) {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    this.isRecording = false;

    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      this.audioStream = null;
    }

    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
      this.analyser = null;
    }

    this.stopPlaybackOnly();
    this.setChatState(null);
    if (this.avatarCircle) this.avatarCircle.style.transform = "scale(1)";
  }

  async processRecordedAudio(mimeType) {
    if (!this.isModalActive && this.audioChunks.length === 0) {
      this.stopAll();
      return;
    }

    if (this.audioChunks.length === 0) {
      // If no speech captured and call is active, resume listening automatically
      if (this.isModalActive) {
        setTimeout(() => {
          if (this.isModalActive && !this.isPlaying && !this.isRecording) {
            this.startRecording(true);
          }
        }, 500);
      }
      return;
    }

    const audioBlob = new Blob(this.audioChunks, { type: mimeType || "audio/webm" });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      if (this.isModalActive) {
        this.setModalState("thinking", "⏳ Preparing answer...");
      } else {
        this.setChatState("thinking", "Transcribing & Thinking...");
      }

      const response = await fetch("/api/voice", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Voice endpoint returned ${response.status}`);
      }

      const data = await response.json();
      const transcript = data.transcript || "";
      const reply = data.reply || "";
      const isHandoff = !!data.handoff;
      const audioBase64 = data.audio_base64 || "";

      // 1. Update Captions in Modal
      if (this.userCaption && this.userText && transcript) {
        this.userText.textContent = `"${transcript}"`;
        this.userCaption.style.display = "block";
      }
      if (this.botCaption && this.botText) {
        this.botText.textContent = reply;
      }

      // 2. Sync to Chat Widget
      if (window.chatWidget) {
        if (transcript) {
          window.chatWidget.appendMessage("user", `🎙️ "${transcript}"`);
        }
        window.chatWidget.appendMessage("bot", reply, isHandoff, audioBase64);
      }

      // 3. Play voice reply aloud! (Web Audio API -> HTML5 Audio -> Web Speech API)
      if (audioBase64) {
        await this.playDeepgramAudio(audioBase64, reply);
      } else if (reply) {
        await this.speakText(reply);
      } else {
        if (this.isModalActive) {
          this.startRecording(true);
        }
      }

    } catch (err) {
      console.error("[Voice Process Error]", err);
      if (this.botText) {
        this.botText.textContent = "I could not hear clearly. Please speak again...";
      }
      if (this.isModalActive) {
        setTimeout(() => {
          if (this.isModalActive && !this.isPlaying && !this.isRecording) {
            this.startRecording(true);
          }
        }, 1200);
      }
    }
  }

  async playDeepgramAudio(base64Data, fallbackText) {
    try {
      this.isPlaying = true;
      if (this.isModalActive) {
        this.setModalState("speaking", "🔊 ZaiqaBox AI Speaking...");
      } else {
        this.setChatState("speaking", "Speaking reply...");
      }

      this.stopPlaybackOnly();

      // Convert Base64 to ArrayBuffer
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      let playedViaWebAudio = false;

      // Method 1: Web Audio API (Bypasses browser autoplay restrictions completely)
      if (!this.audioContext || this.audioContext.state === "closed") {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) this.audioContext = new AudioContextClass();
      }

      if (this.audioContext) {
        try {
          if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
          }
          const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer.slice(0));
          const source = this.audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(this.audioContext.destination);
          this.activeAudioSource = source;

          source.onended = () => {
            this.isPlaying = false;
            this.activeAudioSource = null;
            if (this.isModalActive) {
              this.setModalState("listening", "🟢 Listening... Speak now");
              this.startRecording(true);
            } else {
              this.setChatState(null);
            }
          };

          source.start(0);
          playedViaWebAudio = true;
        } catch (webAudioErr) {
          console.warn("[Web Audio API decode error, falling back to HTML5 audio]", webAudioErr);
        }
      }

      // Method 2: HTML5 Audio with Blob URL
      if (!playedViaWebAudio) {
        const blob = new Blob([bytes], { type: "audio/mp3" });
        const blobUrl = URL.createObjectURL(blob);
        this.currentAudio = new Audio(blobUrl);

        this.currentAudio.onended = () => {
          this.isPlaying = false;
          URL.revokeObjectURL(blobUrl);
          if (this.isModalActive) {
            this.setModalState("listening", "🟢 Listening... Speak now");
            this.startRecording(true);
          } else {
            this.setChatState(null);
          }
        };

        this.currentAudio.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          this.playSpeechSynthesis(fallbackText);
        };

        const playPromise = this.currentAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn("[Audio Autoplay blocked, falling back to Web Speech API]", err);
            this.playSpeechSynthesis(fallbackText);
          });
        }
      }

    } catch (e) {
      console.error("[Play Error]", e);
      this.playSpeechSynthesis(fallbackText);
    }
  }

  async speakText(text) {
    if (!text) return;
    this.stopPlaybackOnly();
    try {
      if (this.isModalActive) {
        this.setModalState("speaking", "🔊 ZaiqaBox AI Speaking...");
      } else {
        this.setChatState("speaking", "Generating voice...");
      }

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.substring(0, 300) })
      });

      if (res.ok && res.status === 200) {
        const blob = await res.blob();
        const arrayBuf = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
        await this.playDeepgramAudio(base64, text);
      } else {
        this.playSpeechSynthesis(text);
      }
    } catch (e) {
      this.playSpeechSynthesis(text);
    }
  }

  playSpeechSynthesis(text) {
    if (!window.speechSynthesis) {
      if (this.isModalActive) this.startRecording(true);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      this.isPlaying = true;
      if (this.isModalActive) {
        this.setModalState("speaking", "🔊 ZaiqaBox AI Speaking...");
      }

      const spokenText = text.length > 250 ? text.substring(0, 250) + "..." : text;
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = "en-US";
      utterance.rate = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Zira"))) || voices.find(v => v.lang.startsWith("en"));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onend = () => {
        this.isPlaying = false;
        if (this.isModalActive) {
          this.setModalState("listening", "🟢 Listening... Speak now");
          this.startRecording(true);
        } else {
          this.setChatState(null);
        }
      };

      utterance.onerror = () => {
        this.isPlaying = false;
        if (this.isModalActive) {
          this.startRecording(true);
        } else {
          this.setChatState(null);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (this.isModalActive) this.startRecording(true);
    }
  }
}

// Global instance initialization
document.addEventListener("DOMContentLoaded", () => {
  window.voiceAssistant = new VoiceAssistant();
});
