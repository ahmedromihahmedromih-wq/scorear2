/**
 * ScoreAR Interactive Living Cartoon Character Engine (v1.0.0)
 * Provides animated, emotionally responsive cartoon companions with eye-blinks,
 * breathing cycles, tap interactions, contextual educational speech bubbles,
 * and game state reactions (idle, thinking, celebration, encouragement).
 */

(function(window) {
  'use strict';

  const CHARACTER_VOICE_LINES = {
    tap: [
      'أنا فصيح، رفيقك في رحلة المعرفة! جاهز للمغامرة؟ 🚀',
      'كل سؤال بيفتح باب جديد للفهم... يلا نكتشف سوا! 💡',
      'ركز في السؤال، الإجابة دايمًا قريبة من الشاطرين! 🌟',
      'حصة اليوم مليانة إثارة، أثبت شطارتك يا بطل! 🎯',
      'ولا تشيل هم، مع سكور آر التعلم متعة مش ضغط! 🌿'
    ],
    think: [
      'ممم... فكّر فيها على مهلك 💭',
      'راجع مفاتيح السؤال كويس 🔍',
      'التركيز نص الإجابة! ✨'
    ],
    celebrate: [
      'الله عليك يا فنان! إجابة عبقرية في الجون! 🎯🎉',
      'عاش يا بطل! خمسة وخميسة على الفهم العالي! ⭐⭐⭐',
      'تسلم يا ذكي! نقطة تانية أضافت لخبرتك! 🌟',
      'إبداع لا يتوقف! مستواك بيرتفع بسرعة! 🚀'
    ],
    encourage: [
      'عادي جداً! كل محاولة بتعلمك فكرة جديدة 💪',
      'ولا يهمك! الفهم الحقيقي بيجي من تصحيح الغلط 🧠',
      'فرصة تانية وسؤال جديد... أنت قدها! 🌿'
    ]
  };

  class InteractiveCharacter {
    constructor(containerId, options = {}) {
      this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
      this.options = Object.assign({
        type: 'faseeh', // 'faseeh', 'smarty', 'nour'
        size: 160,
        showSpeechBubble: true,
        interactive: true
      }, options);
      this.currentState = 'idle';
      this.speechTimer = null;
      if (this.container) {
        this.render();
      }
    }

    render() {
      if (!this.container) return;
      this.container.innerHTML = `
        <div class="living-character-wrapper state-${this.currentState}" data-character-type="${this.options.type}">
          <!-- Speech Bubble Container -->
          <div class="character-speech-bubble" id="charSpeech_${this.options.type}" style="display: none;">
            <span class="speech-text"></span>
            <div class="speech-arrow"></div>
          </div>

          <!-- Character Interactive Avatar Body -->
          <div class="character-avatar-rig" title="انقر للتفاعل مع صديقك التعليمي">
            ${this.getCharacterSvg()}
          </div>
        </div>
      `;

      if (this.options.interactive) {
        const rig = this.container.querySelector('.character-avatar-rig');
        if (rig) {
          rig.addEventListener('click', () => this.handleTap());
        }
      }
    }

    getCharacterSvg() {
      // High-end multi-part SVG character with separated eye blink & breathing animations
      if (this.options.type === 'smarty') {
        return `
          <svg class="character-svg smarty-svg" viewBox="0 0 120 140" width="${this.options.size}" height="${this.options.size * 1.16}">
            <defs>
              <linearGradient id="smartyBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4ECDC4"/>
                <stop offset="100%" stop-color="#183f36"/>
              </linearGradient>
              <linearGradient id="smartyScreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#173e36"/>
                <stop offset="100%" stop-color="#0a1d17"/>
              </linearGradient>
              <filter id="charGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>
            <!-- Shadow -->
            <ellipse class="char-ground-shadow" cx="60" cy="132" rx="36" ry="6" fill="rgba(0,0,0,0.18)"/>
            <!-- Body Group -->
            <g class="char-body-group">
              <!-- Legs & Hover jets -->
              <path class="char-leg-l" d="M42 105v16" stroke="#173e36" stroke-width="12" stroke-linecap="round"/>
              <path class="char-leg-r" d="M78 105v16" stroke="#173e36" stroke-width="12" stroke-linecap="round"/>
              <ellipse cx="42" cy="122" rx="7" ry="3" fill="#FFD93D"/>
              <ellipse cx="78" cy="122" rx="7" ry="3" fill="#FFD93D"/>

              <!-- Torso Box -->
              <rect x="25" y="65" width="70" height="46" rx="20" fill="url(#smartyBodyGrad)" stroke="#183f36" stroke-width="3"/>
              <!-- Screen Emblem -->
              <circle cx="60" cy="88" r="14" fill="#FFD93D" opacity="0.9"/>
              <path d="M54 88L58 92L67 83" stroke="#183f36" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

              <!-- Arms -->
              <path class="char-arm-l" d="M25 76C12 85 8 98 16 108" stroke="url(#smartyBodyGrad)" stroke-width="10" stroke-linecap="round"/>
              <path class="char-arm-r" d="M95 76C108 85 112 98 104 108" stroke="url(#smartyBodyGrad)" stroke-width="10" stroke-linecap="round"/>

              <!-- Head -->
              <g class="char-head-group">
                <!-- Antenna -->
                <line x1="60" y1="20" x2="60" y2="8" stroke="#183f36" stroke-width="4"/>
                <circle class="char-antenna-bulb" cx="60" cy="7" r="7" fill="#FF6B6B" filter="url(#charGlow)"/>
                <!-- Head Frame -->
                <rect x="18" y="18" width="84" height="54" rx="24" fill="#fff9eb" stroke="#183f36" stroke-width="3.5"/>
                <!-- Face Screen -->
                <rect x="26" y="25" width="68" height="40" rx="16" fill="url(#smartyScreenGrad)"/>
                <!-- Eyes -->
                <g class="char-eyes-blink">
                  <circle cx="45" cy="42" r="7" fill="#4ECDC4" filter="url(#charGlow)"/>
                  <circle cx="47" cy="40" r="2.5" fill="#ffffff"/>
                  <circle cx="75" cy="42" r="7" fill="#4ECDC4" filter="url(#charGlow)"/>
                  <circle cx="77" cy="40" r="2.5" fill="#ffffff"/>
                </g>
                <!-- Mouth -->
                <path class="char-mouth" d="M52 54Q60 60 68 54" fill="none" stroke="#4ECDC4" stroke-width="3" stroke-linecap="round"/>
              </g>
            </g>
          </svg>
        `;
      }

      // Default: 'faseeh' (The Arab Scholar / Inventor Hero)
      return `
        <svg class="character-svg faseeh-svg" viewBox="0 0 120 145" width="${this.options.size}" height="${this.options.size * 1.2}">
          <defs>
            <linearGradient id="faseehRobeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#183f36"/>
              <stop offset="100%" stop-color="#2c6857"/>
            </linearGradient>
            <linearGradient id="faseehSkinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fddfb8"/>
              <stop offset="100%" stop-color="#ebb989"/>
            </linearGradient>
          </defs>
          <!-- Ground Shadow -->
          <ellipse class="char-ground-shadow" cx="60" cy="138" rx="36" ry="5" fill="rgba(0,0,0,0.18)"/>
          
          <!-- Body Group (Breathing & Swaying) -->
          <g class="char-body-group">
            <!-- Robe & Vest -->
            <path class="char-robe" d="M38 75L26 132C26 135 94 135 94 132L82 75Z" fill="url(#faseehRobeGrad)" stroke="#183f36" stroke-width="2.5"/>
            <!-- Golden Vest Accent -->
            <path d="M50 78L60 108L70 78" stroke="#FFD93D" stroke-width="3" fill="none" stroke-linecap="round"/>
            <circle cx="60" cy="115" r="3" fill="#FFD93D"/>
            <circle cx="60" cy="125" r="3" fill="#FFD93D"/>

            <!-- Left Arm -->
            <path class="char-arm-l" d="M38 82C24 94 20 108 26 116" stroke="url(#faseehRobeGrad)" stroke-width="11" stroke-linecap="round"/>
            <circle cx="26" cy="118" r="6" fill="url(#faseehSkinGrad)"/>

            <!-- Right Arm (Gesturing & Interactive) -->
            <path class="char-arm-r" d="M82 82C96 94 100 108 94 116" stroke="url(#faseehRobeGrad)" stroke-width="11" stroke-linecap="round"/>
            <circle cx="94" cy="118" r="6" fill="url(#faseehSkinGrad)"/>

            <!-- Head & Face (Tiltable & Lively) -->
            <g class="char-head-group">
              <!-- Ears -->
              <ellipse cx="26" cy="46" rx="5" ry="7" fill="url(#faseehSkinGrad)"/>
              <ellipse cx="94" cy="46" rx="5" ry="7" fill="url(#faseehSkinGrad)"/>
              
              <!-- Face Shape -->
              <path d="M30 40C30 20 90 20 90 40C90 62 76 72 60 72C44 72 30 62 30 40Z" fill="url(#faseehSkinGrad)" stroke="#183f36" stroke-width="2"/>
              
              <!-- Hair & Modern Keffiyeh/Band -->
              <path d="M28 32C35 15 85 15 92 32C86 24 75 22 60 22C45 22 34 24 28 32Z" fill="#183f36"/>
              <path d="M26 36C40 28 80 28 94 36" stroke="#FFD93D" stroke-width="4.5" stroke-linecap="round"/>

              <!-- Eyes & Eyeballs (Blinking Cycle) -->
              <g class="char-eyes-blink">
                <!-- Eyebrows -->
                <path d="M38 34Q45 30 52 33" stroke="#183f36" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                <path d="M68 33Q75 30 82 34" stroke="#183f36" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                <!-- Eye Whiteness -->
                <ellipse cx="46" cy="43" rx="7" ry="8" fill="#ffffff" stroke="#183f36" stroke-width="1.5"/>
                <ellipse cx="74" cy="43" rx="7" ry="8" fill="#ffffff" stroke="#183f36" stroke-width="1.5"/>
                <!-- Iris & Pupils -->
                <circle cx="47" cy="43" r="4.5" fill="#2c6857"/>
                <circle cx="75" cy="43" r="4.5" fill="#2c6857"/>
                <!-- Highlights -->
                <circle cx="45.5" cy="41.5" r="1.5" fill="#ffffff"/>
                <circle cx="73.5" cy="41.5" r="1.5" fill="#ffffff"/>
              </g>

              <!-- Nose -->
              <path d="M58 48Q60 52 63 51" fill="none" stroke="#d49b6b" stroke-width="2" stroke-linecap="round"/>

              <!-- Mouth (Dynamic Smiling / Morphing) -->
              <path class="char-mouth" d="M50 58Q60 67 70 58" fill="#d15a5a" stroke="#183f36" stroke-width="2" stroke-linecap="round"/>
              <path class="char-teeth" d="M53 58Q60 62 67 58" fill="#ffffff"/>

              <!-- Cheeks Blush -->
              <ellipse cx="37" cy="51" rx="5" ry="3" fill="#ff7675" opacity="0.45"/>
              <ellipse cx="83" cy="51" rx="5" ry="3" fill="#ff7675" opacity="0.45"/>
            </g>
          </g>
        </svg>
      `;
    }

    setState(state, customSpeech = null) {
      this.currentState = state;
      const rig = this.container.querySelector('.living-character-wrapper');
      if (rig) {
        rig.className = `living-character-wrapper state-${state}`;
      }

      if (customSpeech) {
        this.say(customSpeech);
      } else if (CHARACTER_VOICE_LINES[state]) {
        const lines = CHARACTER_VOICE_LINES[state];
        const randomLine = lines[Math.floor(Math.random() * lines.length)];
        this.say(randomLine, state === 'celebrate' ? 4500 : 3500);
      }

      // Return to idle after temporary bursts
      if (['celebrate', 'encourage', 'think'].includes(state)) {
        setTimeout(() => {
          if (this.currentState === state) {
            this.setState('idle');
          }
        }, 4000);
      }
    }

    say(text, duration = 3500) {
      if (!this.options.showSpeechBubble || !this.container) return;
      const bubble = this.container.querySelector('.character-speech-bubble');
      const textSpan = bubble ? bubble.querySelector('.speech-text') : null;
      if (!bubble || !textSpan) return;

      textSpan.textContent = text;
      bubble.style.display = 'block';
      bubble.classList.remove('bubble-pop');
      void bubble.offsetWidth; // Force reflow
      bubble.classList.add('bubble-pop');

      if (this.speechTimer) clearTimeout(this.speechTimer);
      this.speechTimer = setTimeout(() => {
        bubble.classList.add('bubble-hide');
        setTimeout(() => {
          bubble.style.display = 'none';
          bubble.classList.remove('bubble-hide');
        }, 300);
      }, duration);
    }

    handleTap() {
      // Trigger tap interaction
      const rig = this.container.querySelector('.character-avatar-rig');
      if (rig) {
        rig.classList.remove('char-tapped');
        void rig.offsetWidth;
        rig.classList.add('char-tapped');
      }

      // Play sound if Howler or audioCtx available
      if (typeof playSound === 'function') {
        playSound('pop');
      }

      const lines = CHARACTER_VOICE_LINES.tap;
      const line = lines[Math.floor(Math.random() * lines.length)];
      this.say(line);
    }
  }

  window.ScoreARCharacter = InteractiveCharacter;

})(window);
