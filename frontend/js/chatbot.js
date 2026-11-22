/**
 * ZaiqaBox Karachi - AI Chatbot Widget (Groq LLM + RAG + Guardrails)
 * Handles text chat, quick replies, handoff escalations, and chat state.
 */

class ChatbotWidget {
  constructor() {
    this.history = [];
    this.isOpen = false;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.launcherBtn = document.getElementById("chatLauncherBtn");
    this.widgetWindow = document.getElementById("chatWidgetWindow");
    this.closeBtn = document.getElementById("chatCloseBtn");
    this.messagesContainer = document.getElementById("chatMessages");
    this.input = document.getElementById("chatInput");
    this.sendBtn = document.getElementById("chatSendBtn");
    this.typingIndicator = document.getElementById("typingIndicator");
    this.chips = document.querySelectorAll(".chip-btn");
    this.openVoiceBtn = document.getElementById("openVoiceInChatBtn");
  }

  bindEvents() {
    if (this.launcherBtn) {
      this.launcherBtn.addEventListener("click", () => this.toggleChat());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.toggleChat(false));
    }

    if (this.sendBtn && this.input) {
      this.sendBtn.addEventListener("click", () => this.sendMessage());
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    if (this.chips) {
      this.chips.forEach(chip => {
        chip.addEventListener("click", () => {
          const query = chip.getAttribute("data-query") || chip.textContent.trim();
          this.sendMessage(query);
        });
      });
    }

    if (this.openVoiceBtn) {
      this.openVoiceBtn.addEventListener("click", () => {
        this.toggleChat(true);
        // Prompt user to try voice
        setTimeout(() => {
          const micBtn = document.getElementById("chatMicBtn");
          if (micBtn) {
            micBtn.focus();
            micBtn.classList.add("recording");
            setTimeout(() => micBtn.classList.remove("recording"), 1200);
          }
        }, 400);
      });
    }
  }

  toggleChat(forceState) {
    this.isOpen = typeof forceState === "boolean" ? forceState : !this.isOpen;
    if (this.isOpen) {
      this.widgetWindow.classList.add("open");
      if (this.input) this.input.focus();
      trackEvent("chat_opened", { timestamp: new Date().toISOString() });
    } else {
      this.widgetWindow.classList.remove("open");
    }
  }

  appendMessage(role, text, isHandoff = false, audioBase64 = "") {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${role} ${isHandoff ? 'handoff-box' : ''}`;

    if (isHandoff) {
      const waHandoffMsg = `Hi ZaiqaBox! I have a dietary question and would like to consult your human nutritionist: "${text.substring(0, 80)}..."`;
      const waUrl = createWhatsAppUrl(waHandoffMsg);

      msgDiv.innerHTML = `
        <div class="msg-text-content">${text}</div>
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem;">
          <button class="chat-speak-btn" title="Listen (Voice Playback)">🔊 Suniye</button>
        </div>
        <a href="${waUrl}" class="handoff-cta-btn" target="_blank" rel="noopener">
          <span>💬</span> Chat with Human Nutritionist on WhatsApp
        </a>
      `;
    } else if (role === "bot") {
      msgDiv.innerHTML = `
        <span class="msg-text-content">${text}</span>
        <button class="chat-speak-btn" title="Listen (Voice Playback)">🔊</button>
      `;
    } else {
      msgDiv.textContent = text;
    }

    // Attach speak button listener
    const speakBtn = msgDiv.querySelector(".chat-speak-btn");
    if (speakBtn) {
      speakBtn.addEventListener("click", () => {
        if (audioBase64 && window.voiceAssistant) {
          window.voiceAssistant.playDeepgramAudio(audioBase64);
        } else if (window.voiceAssistant) {
          window.voiceAssistant.speakText(text);
        }
      });
    }

    this.messagesContainer.appendChild(msgDiv);
    this.scrollToBottom();

    // Auto-play speech if audio is present and user requested or in voice mode
    if (role === "bot" && audioBase64 && (this.autoVoiceEnabled || window.voiceAssistant?.isVoiceTurn)) {
      if (window.voiceAssistant) {
        window.voiceAssistant.playDeepgramAudio(audioBase64);
      }
    }

    // Store in history
    this.history.push({ role, content: text });
    if (this.history.length > 12) {
      this.history = this.history.slice(-12);
    }
  }

  showTyping(show = true) {
    if (this.typingIndicator) {
      this.typingIndicator.classList.toggle("active", show);
      if (show) this.scrollToBottom();
    }
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  async sendMessage(customText) {
    const text = (customText || (this.input ? this.input.value : "")).trim();
    if (!text) return;

    if (this.input && !customText) {
      this.input.value = "";
    }

    // Append User Message
    this.appendMessage("user", text);
    this.showTyping(true);

    trackEvent("chat_message_sent", { text_length: text.length });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: this.history.slice(-6)
        })
      });

      this.showTyping(false);

      if (response.ok) {
        const data = await response.json();
        const reply = data.reply || "I am here to help with your lunch orders. Please let me know your question.";
        const isHandoff = !!data.handoff;

        const audioB64 = data.audio_base64 || "";
        this.appendMessage("bot", reply, isHandoff, audioB64);

        if (isHandoff) {
          trackEvent("chat_handoff_triggered", { query: text });
        }
      } else {
        this.appendMessage("bot", "We couldn't reach our assistant right now. You can chat with our team directly on WhatsApp!", true);
      }
    } catch (err) {
      console.error("[Chatbot Error]", err);
      this.showTyping(false);
      this.appendMessage("bot", "Network connection error. Please connect with our team on WhatsApp for immediate support.", true);
    }
  }
}

// Global instance
let chatWidgetInstance;
document.addEventListener("DOMContentLoaded", () => {
  chatWidgetInstance = new ChatbotWidget();
  window.chatWidget = chatWidgetInstance;
});
