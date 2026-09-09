/* MoveOn Emoji Sound Engine
   Uses Web Audio API only: no external audio files, no autoplay.
   A sound is played only after the user clicks/taps an emoji-bearing element.
*/
(() => {
  "use strict";

  let audioContext = null;

  const emojiRanges = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

  const groups = {
    heart: /[❤️💜💗💖💓💞💕💘💝🫶]/u,
    calm: /[🧘🌿🍃🌙😌🕊️]/u,
    sad: /[😔🥺😢😭💔]/u,
    angry: /[😡😠🤬💢]/u,
    happy: /[😊🙂😄😁😂🤣🎉✨🌟]/u,
    growth: /[🌱🌻🌅🚀💪🎯🏆⭐]/u,
    sleep: /[😴🌙💤]/u,
    thinking: /[💭🧠]/u,
    phone: /[📵📱]/u,
    writing: /[📝📚]/u,
    exercise: /[🚶🏃]/u
  };

  function getContext() {
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioContext = new Ctx();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function tone(ctx, frequency, start, duration, type="sine", volume=0.035, endFrequency=null) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function playSound(emoji) {
    const ctx = getContext();
    if (!ctx) return;

    const now = ctx.currentTime + 0.005;

    if (groups.heart.test(emoji)) {
      tone(ctx, 523.25, now, 0.20, "sine", 0.035);
      tone(ctx, 659.25, now + 0.09, 0.26, "sine", 0.028);
      return;
    }
    if (groups.calm.test(emoji)) {
      tone(ctx, 261.63, now, 0.42, "sine", 0.025, 196);
      return;
    }
    if (groups.sad.test(emoji)) {
      tone(ctx, 392.00, now, 0.30, "sine", 0.028, 293.66);
      return;
    }
    if (groups.angry.test(emoji)) {
      tone(ctx, 130.81, now, 0.16, "triangle", 0.035, 90);
      tone(ctx, 164.81, now + 0.08, 0.13, "triangle", 0.025, 110);
      return;
    }
    if (groups.happy.test(emoji)) {
      tone(ctx, 523.25, now, 0.13, "sine", 0.032);
      tone(ctx, 659.25, now + 0.08, 0.13, "sine", 0.032);
      tone(ctx, 783.99, now + 0.16, 0.20, "sine", 0.028);
      return;
    }
    if (groups.growth.test(emoji)) {
      tone(ctx, 392.00, now, 0.13, "sine", 0.028);
      tone(ctx, 523.25, now + 0.08, 0.13, "sine", 0.028);
      tone(ctx, 659.25, now + 0.16, 0.22, "sine", 0.028);
      return;
    }
    if (groups.sleep.test(emoji)) {
      tone(ctx, 220.00, now, 0.50, "sine", 0.022, 164.81);
      return;
    }
    if (groups.thinking.test(emoji)) {
      tone(ctx, 349.23, now, 0.12, "sine", 0.025);
      tone(ctx, 440.00, now + 0.10, 0.16, "sine", 0.025);
      return;
    }
    if (groups.phone.test(emoji)) {
      tone(ctx, 880.00, now, 0.10, "square", 0.018);
      tone(ctx, 660.00, now + 0.11, 0.12, "square", 0.016);
      return;
    }
    if (groups.writing.test(emoji)) {
      tone(ctx, 330.00, now, 0.11, "triangle", 0.025);
      tone(ctx, 440.00, now + 0.10, 0.13, "triangle", 0.020);
      return;
    }
    if (groups.exercise.test(emoji)) {
      tone(ctx, 261.63, now, 0.10, "triangle", 0.03);
      tone(ctx, 329.63, now + 0.09, 0.13, "triangle", 0.025);
      return;
    }

    tone(ctx, 600, now, 0.11, "sine", 0.025);
  }

  function findEmojiTarget(start) {
    let el = start instanceof Element ? start : start?.parentElement;
    for (let i = 0; el && i < 5; i++, el = el.parentElement) {
      const text = (el.textContent || "").trim();
      if (!text) continue;

      const hasEmoji = emojiRanges.test(text) || el.hasAttribute("data-emoji");
      if (!hasEmoji) continue;

      const cls = String(el.className || "");
      const iconLike =
        el.hasAttribute("data-emoji") ||
        /icon|emoji|avatar|logo/i.test(cls) ||
        el.tagName === "BUTTON";

      if (iconLike || text.length <= 12) return el;
    }
    return null;
  }

  document.addEventListener("click", (event) => {
    const target = findEmojiTarget(event.target);
    if (!target) return;

    const emoji =
      target.getAttribute("data-emoji") ||
      (target.textContent || "").match(emojiRanges)?.[0];

    if (emoji) playSound(emoji);
  }, true);

  window.MoveOnSound = { play: playSound };
})();
