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
    this.currentFetchController = null;

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
    this.callAborted = false;
    if (this.modal) {
      this.modal.classList.add("open");
    }
    this.setModalState("connecting", "Connecting Call... (Microphone activating)");
    trackEvent("voice_call_started");

    // Pre-unlock AudioContext & HTML5 audio on user interaction to guarantee audible playback
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && !this.audioContext) {
        this.audioContext = new AudioContextClass();
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
    } catch (e) {}

    const audioPlayer = document.getElementById("voiceAudioPlayer");
    if (audioPlayer) {
      try {
        audioPlayer.volume = 1.0;
        audioPlayer.muted = false;
        audioPlayer.play().then(() => {
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
        }).catch(() => {});
      } catch (e) {}
    }

    if (window.speechSynthesis) {
      try { window.speechSynthesis.resume(); } catch (e) {}
    }

    // Immediately start listening hands-free!
    await this.startRecording(true);
  }

  closeModal() {
    this.isModalActive = false;
    this.callAborted = true;
    if (this.currentFetchController) {
      try { this.currentFetchController.abort(); } catch (e) {}
      this.currentFetchController = null;
    }
    this.stopPlaybackOnly();
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

      // Voice Activity Detection (Auto silence detector)
      try {
        if (!this.audioContext || this.audioContext.state === "closed") {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) this.audioContext = new AudioContextClass();
        }
        if (this.audioContext) {
          if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
          }
          const source = this.audioContext.createMediaStreamSource(this.audioStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 512;
          source.connect(this.analyser);
        }
      } catch (vadErr) {
        console.warn("[VAD Init Warning]", vadErr);
      }

      // Start silence detector and speech listener
      this.detectSilence();

      // Real-time browser speech recognition for instant transcript
      this.liveTranscript = "";
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          if (this.speechRec) {
            try { this.speechRec.abort(); } catch (e) {}
          }
          this.speechRec = new SpeechRecognition();
          this.speechRec.continuous = false;
          this.speechRec.interimResults = true;
          this.speechRec.lang = "en-US";

          this.speechRec.onresult = (evt) => {
            let tr = "";
            for (let i = evt.resultIndex; i < evt.results.length; ++i) {
              tr += evt.results[i][0].transcript;
            }
            if (tr) {
              this.liveTranscript = tr;
              if (this.userText) this.userText.textContent = `"${tr}"`;
              if (this.userCaption) this.userCaption.style.display = "block";
            }
          };

          this.speechRec.onend = () => {
            if (this.isRecording && this.liveTranscript) {
              setTimeout(() => {
                if (this.isRecording) this.stopRecording();
              }, 400);
            }
          };

          this.speechRec.start();
        } catch (srErr) {}
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
    let silenceStart = null;
    let spokenDetected = false;
    const recordStartTime = Date.now();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Safeguard timeout: auto-stop after 4.5 seconds to guarantee prompt answers
    this.silenceTimer = setTimeout(() => {
      if (this.isRecording) {
        if (this.avatarCircle) this.avatarCircle.style.transform = "scale(1)";
        this.stopRecording();
      }
    }, 4500);

    if (!this.analyser) return;

    const buffer = new Uint8Array(this.analyser.frequencyBinCount);

    const checkAudio = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i];
      const avg = sum / buffer.length;

      // Pulse avatar circle subtly with speech volume
      if (this.avatarCircle && avg > 2) {
        const scale = Math.min(1.25, 1.0 + (avg / 90));
        this.avatarCircle.style.transform = `scale(${scale})`;
      } else if (this.avatarCircle && !this.isPlaying) {
        this.avatarCircle.style.transform = "scale(1)";
      }

      // High sensitivity threshold: avg > 2 detects soft speech, whispering, and distant laptop microphones
      if (avg > 2) {
        spokenDetected = true;
        silenceStart = null;
        if (this.statusText && this.statusText.textContent !== "🗣️ Hearing you speak...") {
          this.statusText.textContent = "🗣️ Hearing you speak...";
        }
      } else if (spokenDetected) {
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > 700) {
          // Exactly ~700ms after user pauses: Answer immediately!
          if (this.avatarCircle) this.avatarCircle.style.transform = "scale(1)";
          this.stopRecording();
          return;
        }
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
    if (this.currentFetchController) {
      try { this.currentFetchController.abort(); } catch (e) {}
      this.currentFetchController = null;
    }

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

    if (this.audioContext && this.audioContext.state !== "closed") {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
      this.analyser = null;
    }

    this.stopPlaybackOnly();
    this.setChatState(null);
    if (this.avatarCircle) this.avatarCircle.style.transform = "scale(1)";
  }

  async processRecordedAudio(mimeType) {
    if (!this.isModalActive) {
      this.stopAll();
      return;
    }

    if (this.audioChunks.length === 0) {
      // If no speech captured and call is active, resume listening automatically
      if (this.isModalActive && !this.isPlaying && !this.isRecording) {
        setTimeout(() => {
          if (this.isModalActive && !this.isPlaying && !this.isRecording) {
            this.startRecording(true);
          }
        }, 400);
      }
      return;
    }

    const audioBlob = new Blob(this.audioChunks, { type: mimeType || "audio/webm" });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    if (this.liveTranscript) {
      formData.append("transcript_hint", this.liveTranscript);
    }

    if (this.currentFetchController) {
      try { this.currentFetchController.abort(); } catch (e) {}
    }
    this.currentFetchController = new AbortController();

    try {
      if (!this.isModalActive) return; // User hung up before fetch
      this.setModalState("thinking", "⚡ Preparing answer...");

      const response = await fetch("/api/voice", {
        method: "POST",
        body: formData,
        signal: this.currentFetchController.signal
      });

      if (!this.isModalActive) return; // User hung up during network request!

      if (!response.ok) {
        throw new Error(`Voice endpoint returned ${response.status}`);
      }

      const data = await response.json();
      if (!this.isModalActive) return; // User hung up!

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

      // 3. Play voice reply aloud ONLY IF call is still open!
      if (!this.isModalActive) return;

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
      if (err.name === "AbortError") {
        console.log("[Voice] Call ended by user, request aborted cleanly.");
        return;
      }
      console.error("[Voice Process Error]", err);
      if (!this.isModalActive) return;
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
    } finally {
      this.currentFetchController = null;
    }
  }

  async playDeepgramAudio(base64Data, fallbackText = "", isModalCall = null) {
    const isFromModal = (isModalCall !== null) ? isModalCall : this.isModalActive;
    if (isFromModal && this.callAborted) return; // User hung up modal call, do not play

    try {
      this.isPlaying = true;
      if (this.isModalActive) {
        this.setModalState("speaking", "🔊 ZaiqaBox AI Speaking...");
      } else {
        this.setChatState("speaking", "Speaking reply...");
      }

      this.stopPlaybackOnly();

      // Convert Base64 to Uint8Array & Blob URL
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "audio/mp3" });
      const blobUrl = URL.createObjectURL(blob);

      // Primary: Play through dedicated DOM <audio id="voiceAudioPlayer"> element
      let player = document.getElementById("voiceAudioPlayer");
      if (!player) {
        player = new Audio();
      }
      this.currentAudio = player;
      try { player.pause(); } catch (e) {}
      player.src = blobUrl;
      try { player.load(); } catch (e) {}
      player.volume = 1.0;
      player.muted = false;

      player.onended = () => {
        this.isPlaying = false;
        URL.revokeObjectURL(blobUrl);
        if (this.isModalActive && !this.callAborted) {
          this.setModalState("listening", "🟢 Listening... Speak now");
          this.startRecording(true);
        } else {
          this.setChatState(null);
        }
      };

      player.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        this.playSpeechSynthesis(fallbackText, isFromModal);
      };

      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise.catch(async (playErr) => {
          console.warn("[HTML5 Audio Play Error, trying Web Audio API]", playErr);
          // Method 2: Web Audio API
          try {
            if (!this.audioContext || this.audioContext.state === "closed") {
              const AudioCtx = window.AudioContext || window.webkitAudioContext;
              if (AudioCtx) this.audioContext = new AudioCtx();
            }
            if (this.audioContext) {
              if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
              }
              const audioBuf = await this.audioContext.decodeAudioData(bytes.buffer.slice(0));
              const source = this.audioContext.createBufferSource();
              source.buffer = audioBuf;
              source.connect(this.audioContext.destination);
              this.activeAudioSource = source;

              source.onended = () => {
                this.isPlaying = false;
                this.activeAudioSource = null;
                if (this.isModalActive && !this.callAborted) {
                  this.setModalState("listening", "🟢 Listening... Speak now");
                  this.startRecording(true);
                } else {
                  this.setChatState(null);
                }
              };

              source.start(0);
              return;
            }
          } catch (wErr) {
            console.warn("[Web Audio API Fallback Error]", wErr);
          }

          // Method 3: Speech Synthesis Fallback
          this.playSpeechSynthesis(fallbackText, isFromModal);
        });
      }

    } catch (e) {
      console.error("[Play Audio Error]", e);
      this.playSpeechSynthesis(fallbackText, isFromModal);
    }
  }

  async speakText(text, isModalCall = null) {
    const isFromModal = (isModalCall !== null) ? isModalCall : this.isModalActive;
    if (!text || (isFromModal && this.callAborted)) return;
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
        await this.playDeepgramAudio(base64, text, isFromModal);
      } else {
        this.playSpeechSynthesis(text, isFromModal);
      }
    } catch (e) {
      this.playSpeechSynthesis(text, isFromModal);
    }
  }

  playSpeechSynthesis(text, isModalCall = null) {
    const isFromModal = (isModalCall !== null) ? isModalCall : this.isModalActive;
    if (!text || (isFromModal && this.callAborted)) return;
    if (!window.speechSynthesis) {
      if (this.isModalActive && !this.callAborted) this.startRecording(true);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
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
        if (this.isModalActive && !this.callAborted) {
          this.setModalState("listening", "🟢 Listening... Speak now");
          this.startRecording(true);
        } else {
          this.setChatState(null);
        }
      };

      utterance.onerror = () => {
        this.isPlaying = false;
        if (this.isModalActive && !this.callAborted) {
          this.startRecording(true);
        } else {
          this.setChatState(null);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (this.isModalActive && !this.callAborted) this.startRecording(true);
    }
  }
}

// Global instance initialization
document.addEventListener("DOMContentLoaded", () => {
  window.voiceAssistant = new VoiceAssistant();
});
