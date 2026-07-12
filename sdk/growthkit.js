/**
 * GrowthKit SDK
 * =============
 * A drop-in growth engine. Integrated on a host page with a single tag:
 *
 *   <script src=".../growthkit.js"
 *           data-app-name="FitTrack"
 *           data-app-niche="fitness & sport"
 *           data-install-url="install.html"
 *           data-api-key="demo-fittrack"></script>
 *
 * Provides a library of reusable growth MECHANICS (share, watermark, referral,
 * waitlist). On load the SDK fetches this app's strategy from the backend (what
 * the AI director decided) and renders the assigned mechanics. Nothing here is
 * hardcoded to a particular app — everything comes from data-* attributes, the
 * backend strategy, or params.
 *
 * @version 0.6.0
 */
(function (window, document) {
  "use strict";

  /**
   * @typedef {Object} GrowthKitConfig
   * @property {string} appName    Display name of the host app.
   * @property {string} appNiche   Free-text category (used by the AI director).
   * @property {string} installUrl Destination of share links (the "install" page).
   * @property {string} apiKey     Identifies the app to the backend.
   */

  /**
   * @typedef {Object} AchievementStat
   * @property {string} text Pre-formatted chip label, e.g. "🏃 5.2 km".
   */

  /**
   * @typedef {Object} Achievement
   * @property {string} [title]            Headline shown on the card.
   * @property {AchievementStat[]} [stats] Stat chips rendered as pills.
   */

  // ===========================================================================
  // Constants
  // ===========================================================================
  const SLOT_ID = "growthkit-slot";
  const STYLE_ID = "gk-styles";

  const FONT = '-apple-system, "Segoe UI", Roboto, sans-serif';
  const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", sans-serif';

  /** Achievement-card geometry and palette. */
  const CARD = Object.freeze({
    width: 400,
    height: 500,
    scale: 2, // export at 2x for crisp (retina) output
    radius: 28,
    gradient: ["#6d5efc", "#4a37d6", "#3a23b8"],
  });

  const DEFAULTS = Object.freeze({
    title: "Achievement unlocked!",
  });

  // A/B bucket for this session's shares. The dashboard compares variants and
  // the winner can be weighted more heavily later (self-optimization).
  const VARIANT = Math.random() < 0.5 ? "A" : "B";

  // ===========================================================================
  // Config — read once from the integrating <script> element
  // ===========================================================================
  /**
   * @param {HTMLScriptElement | null} scriptEl
   * @returns {GrowthKitConfig}
   */
  function readConfig(scriptEl) {
    const data = scriptEl?.dataset ?? {};
    return {
      appName: data.appName || "App",
      appNiche: data.appNiche || "",
      installUrl: data.installUrl || "#",
      apiKey: data.apiKey || "",
    };
  }

  /**
   * Build the trackable share/referral URL pointing at the install page. The
   * install page records the click (attribution) before showing the store.
   * @param {GrowthKitConfig} config
   * @returns {string}
   */
  function buildShareUrl(config) {
    const url = new URL(config.installUrl, location.href);
    url.searchParams.set("app", config.apiKey);
    url.searchParams.set("name", config.appName);
    url.searchParams.set("ref", Math.random().toString(36).slice(2, 10));
    url.searchParams.set("variant", VARIANT);
    return url.toString();
  }

  // ===========================================================================
  // DOM helpers
  // ===========================================================================
  /** Create an element with an optional class name. */
  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  /** Create a <button type="button"> with a label and click handler. */
  function button(className, label, onClick) {
    const node = el("button", className);
    node.type = "button";
    node.textContent = label;
    node.addEventListener("click", onClick);
    return node;
  }

  /** Copy text to the clipboard, with a legacy fallback. */
  function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const ta = el("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      ta.remove();
    }
    return Promise.resolve();
  }

  /** Flash a temporary label on a button, then restore it. */
  function flash(btn, temp, restore) {
    btn.textContent = temp;
    setTimeout(() => (btn.textContent = restore), 1500);
  }

  // ===========================================================================
  // Styles — self-contained and namespaced (gk-*) so they never touch the host
  // ===========================================================================
  const Styles = (() => {
    const CSS = `
      .gk-share-btn {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 8px; width: 100%; margin-top: 16px; padding: 14px 18px;
        border: none; border-radius: 14px; background: #2b2d33; color: #fff;
        font: 700 15px ${FONT}; cursor: pointer;
        transition: transform .08s ease, opacity .2s ease;
      }
      .gk-share-btn:hover { opacity: .92; }
      .gk-share-btn:active { transform: scale(.97); }
      .gk-share-btn:disabled { opacity: .6; cursor: progress; }

      .gk-overlay {
        position: fixed; inset: 0; z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; background: rgba(15, 16, 20, .66); font-family: ${FONT};
      }
      .gk-modal {
        width: 100%; max-width: 360px; padding: 18px; text-align: center;
        background: #fff; border-radius: 22px;
        box-shadow: 0 24px 70px rgba(0, 0, 0, .35);
      }
      .gk-modal__image { display: block; width: 100%; border-radius: 14px; }
      .gk-modal__actions { display: flex; gap: 10px; margin-top: 14px; }
      .gk-btn {
        flex: 1; padding: 13px; border: none; border-radius: 12px;
        font: 700 14px ${FONT}; cursor: pointer;
      }
      .gk-btn--primary { background: #6d5efc; color: #fff; }
      .gk-btn--ghost { background: #eceef3; color: #2b2d33; }
      .gk-modal__link {
        display: inline-block; margin-top: 12px; font-size: 12px;
        color: #6d5efc; text-decoration: none; cursor: pointer; word-break: break-all;
      }
      .gk-modal__link:hover { text-decoration: underline; }

      /* Shared block styling for referral / waitlist mechanics */
      .gk-block {
        margin-top: 16px; padding: 18px; border-radius: 16px;
        background: #f4f3ff; border: 1px solid #e5e1ff;
        font-family: ${FONT}; text-align: center;
      }
      .gk-block__title { font-size: 16px; font-weight: 800; color: #2b2d33; }
      .gk-block__sub {
        font-size: 13px; color: #6b6f7a; margin-top: 4px; line-height: 1.4;
      }
      .gk-block__row { display: flex; gap: 8px; margin-top: 12px; }
      .gk-input {
        flex: 1; min-width: 0; padding: 11px 12px; border: 1px solid #d7d9e0;
        border-radius: 10px; font: 14px ${FONT}; color: #2b2d33; background: #fff;
      }

      /* Watermark badge (passive branding) */
      .gk-watermark {
        position: fixed; right: 14px; bottom: 14px; z-index: 9998;
        background: rgba(43, 45, 51, .9); color: #fff; font: 700 12px ${FONT};
        padding: 8px 12px; border-radius: 999px; pointer-events: none;
      }
    `;

    /** Inject the stylesheet exactly once. */
    function ensure() {
      if (document.getElementById(STYLE_ID)) return;
      const el = document.createElement("style");
      el.id = STYLE_ID;
      el.textContent = CSS;
      document.head.appendChild(el);
    }

    return { ensure };
  })();

  // ===========================================================================
  // CardRenderer — draws the achievement card directly on a <canvas>.
  // ===========================================================================
  const CardRenderer = (() => {
    /** Trace a rounded-rectangle path. */
    function roundedRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    /** Draw a centered row of pill-shaped stat chips. */
    function drawPills(ctx, labels, centerX, top) {
      if (!labels.length) return;
      const padX = 14;
      const gap = 8;
      const height = 34;

      ctx.font = `700 15px ${FONT}`;
      const widths = labels.map((t) => ctx.measureText(t).width + padX * 2);
      const totalWidth =
        widths.reduce((sum, w) => sum + w, 0) + gap * (labels.length - 1);

      let x = centerX - totalWidth / 2;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      labels.forEach((label, i) => {
        const w = widths[i];
        ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
        roundedRect(ctx, x, top, w, height, height / 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x + w / 2, top + height / 2 + 1);
        x += w + gap;
      });
    }

    /**
     * Render the card and return it as a PNG data URL.
     * @param {GrowthKitConfig} config
     * @param {Achievement} achievement
     * @returns {string} PNG data URL
     */
    function toDataUrl(config, achievement) {
      const { width: W, height: H, scale } = CARD;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = H * scale;

      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      const centerX = W / 2;

      ctx.save();
      roundedRect(ctx, 0, 0, W, H, CARD.radius);
      ctx.clip();

      const gradient = ctx.createLinearGradient(0, 0, W, H);
      gradient.addColorStop(0, CARD.gradient[0]);
      gradient.addColorStop(0.6, CARD.gradient[1]);
      gradient.addColorStop(1, CARD.gradient[2]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = `700 15px ${FONT}`;
      ctx.fillText(config.appName, 30, 42);

      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = `72px ${EMOJI_FONT}`;
      ctx.fillText("🏆", centerX, 192);

      ctx.font = `800 25px ${FONT}`;
      ctx.fillText(achievement.title || DEFAULTS.title, centerX, 262);

      const labels = (achievement.stats || []).map((s) => s.text);
      drawPills(ctx, labels, centerX, 300);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, H - 62);
      ctx.lineTo(W - 30, H - 62);
      ctx.stroke();

      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.font = `13px ${FONT}`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText("Made with", 30, H - 34);

      ctx.textAlign = "right";
      ctx.font = `800 16px ${FONT}`;
      ctx.fillStyle = "#fff";
      ctx.fillText(`✨ ${config.appName}`, W - 30, H - 34);

      ctx.restore();
      return canvas.toDataURL("image/png");
    }

    return { toDataUrl };
  })();

  // ===========================================================================
  // Modal — previews the generated card and offers download / share
  // ===========================================================================
  const Modal = (() => {
    let active = null;

    function open(imageDataUrl, config) {
      close();

      const shareUrl = buildShareUrl(config);

      const image = el("img", "gk-modal__image");
      image.src = imageDataUrl;
      image.alt = "Achievement card";

      const actions = el("div", "gk-modal__actions");
      actions.append(
        button("gk-btn gk-btn--primary", "⬇ Download", () =>
          downloadImage(imageDataUrl, `${config.appName}-achievement.png`)
        ),
        button("gk-btn gk-btn--ghost", "Close", close)
      );

      const link = el("a", "gk-modal__link");
      link.href = shareUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "🔗 Open install page";

      const modal = el("div", "gk-modal");
      modal.append(image, actions, link);

      const overlay = el("div", "gk-overlay");
      overlay.append(modal);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close();
      });

      document.addEventListener("keydown", onKeydown);
      document.body.appendChild(overlay);
      active = overlay;
    }

    function close() {
      if (!active) return;
      active.remove();
      active = null;
      document.removeEventListener("keydown", onKeydown);
    }

    function onKeydown(event) {
      if (event.key === "Escape") close();
    }

    function downloadImage(dataUrl, filename) {
      const link = el("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
    }

    return { open };
  })();

  // ===========================================================================
  // Mechanics — the reusable growth blocks. Each exposes:
  //   mount(host, config, params) -> renders itself into `host`.
  // ===========================================================================

  /** Reusable "invite" panel: a copyable trackable link. */
  function renderInvitePanel(host, config, { title, sub }) {
    const link = buildShareUrl(config);

    const input = el("input", "gk-input");
    input.readOnly = true;
    input.value = link;

    const copyBtn = button("gk-btn gk-btn--primary", "Copy", async () => {
      await copyToClipboard(link);
      flash(copyBtn, "Copied ✓", "Copy");
    });

    const row = el("div", "gk-block__row");
    row.append(input, copyBtn);

    const block = el("div", "gk-block");
    const titleEl = el("div", "gk-block__title");
    titleEl.textContent = title;
    const subEl = el("div", "gk-block__sub");
    subEl.textContent = sub;
    block.append(titleEl, subEl, row);

    host.replaceChildren(block);
  }

  const Mechanics = {
    share: {
      mount(host, config, achievement) {
        host.replaceChildren();
        host.appendChild(
          button("gk-share-btn", "📲 Share achievement", () => {
            try {
              const image = CardRenderer.toDataUrl(config, achievement);
              Modal.open(image, config);
            } catch (error) {
              console.error("[GrowthKit] Failed to render achievement card:", error);
            }
          })
        );
      },
    },

    watermark: {
      mount(_host, config, params) {
        if (document.querySelector(".gk-watermark")) return;
        const badge = el("div", "gk-watermark");
        badge.textContent = params?.text || `✨ Made with ${config.appName}`;
        document.body.appendChild(badge);
      },
    },

    referral: {
      mount(host, config, params) {
        const reward = params?.reward || "a reward";
        renderInvitePanel(host, config, {
          title: "Invite a friend",
          sub: `You both get ${reward}.`,
        });
      },
    },

    waitlist: {
      mount(host, config, params) {
        const position = params?.position ?? Math.floor(100 + Math.random() * 900);

        const input = el("input", "gk-input");
        input.type = "email";
        input.placeholder = "your@email.com";

        const joinBtn = button("gk-btn gk-btn--primary", "Join", () => {
          if (!input.value.includes("@")) {
            input.focus();
            return;
          }
          renderInvitePanel(host, config, {
            title: `You're #${position} in line 🎉`,
            sub: "Invite friends to skip ahead:",
          });
        });

        const row = el("div", "gk-block__row");
        row.append(input, joinBtn);

        const block = el("div", "gk-block");
        const titleEl = el("div", "gk-block__title");
        titleEl.textContent = params?.title || "Join the waitlist";
        const subEl = el("div", "gk-block__sub");
        subEl.textContent =
          params?.sub || "Be first to get access. Invite friends to move up.";
        block.append(titleEl, subEl, row);

        host.replaceChildren(block);
      },
    },
  };

  // ===========================================================================
  // Strategy — what the AI director decided for this app (fetched from backend)
  // ===========================================================================
  /**
   * Fetch this app's strategy from the GrowthKit backend (Supabase).
   * Returns null if the backend isn't configured or the request fails — the SDK
   * then falls back to a sensible default so the host app never breaks.
   * @param {string} apiKey
   * @returns {Promise<{mechanics: Array}|null>}
   */
  async function fetchStrategy(apiKey) {
    const backend = window.GROWTHKIT_CONFIG;
    if (!backend?.supabaseUrl || backend.supabaseUrl.includes("YOUR-PROJECT")) {
      return null;
    }
    try {
      const url =
        `${backend.supabaseUrl}/rest/v1/strategies` +
        `?app_key=eq.${encodeURIComponent(apiKey)}&select=strategy`;
      const response = await fetch(url, {
        headers: {
          apikey: backend.supabaseAnonKey,
          Authorization: `Bearer ${backend.supabaseAnonKey}`,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      return rows[0]?.strategy ?? null;
    } catch (error) {
      console.warn("[GrowthKit] Could not load strategy:", error.message);
      return null;
    }
  }

  /**
   * Render every mechanic in the strategy into `host`. Each non-watermark
   * mechanic gets its own sub-container; watermark self-injects onto the page.
   * @param {HTMLElement} host
   * @param {{mechanics: Array}} strategy
   * @param {Achievement} achievement Extra context for the share card.
   */
  function renderStrategy(host, strategy, achievement) {
    host.replaceChildren();
    for (const mechanic of strategy.mechanics) {
      if (mechanic.type === "watermark") {
        Mechanics.watermark.mount(null, config, mechanic.params);
        continue;
      }
      const slot = el("div");
      host.appendChild(slot);
      if (mechanic.type === "share") {
        Mechanics.share.mount(slot, config, {
          title: mechanic.params?.title || achievement.title,
          stats: achievement.stats,
        });
      } else {
        Mechanics[mechanic.type]?.mount(slot, config, mechanic.params);
      }
    }
  }

  // ===========================================================================
  // Public API
  // ===========================================================================
  const config = readConfig(document.currentScript);

  // Ask the backend which mechanics to show as soon as the SDK loads (cached).
  const strategyPromise = fetchStrategy(config.apiKey);

  /** Fire-and-forget analytics event to the backend (never blocks the UI). */
  function logEvent(type) {
    const backend = window.GROWTHKIT_CONFIG;
    if (!backend?.supabaseUrl || backend.supabaseUrl.includes("YOUR-PROJECT")) {
      return;
    }
    fetch(`${backend.supabaseUrl}/rest/v1/clicks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: backend.supabaseAnonKey,
        Authorization: `Bearer ${backend.supabaseAnonKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ app_key: config.apiKey, type, variant: VARIANT }),
    }).catch(() => {});
  }

  window.GrowthKit = {
    config,
    availableMechanics: Object.keys(Mechanics),

    async onAchievement(achievement) {
      const slot = document.getElementById(SLOT_ID);
      if (!slot) {
        console.warn(`[GrowthKit] Missing #${SLOT_ID} element; cannot mount UI.`);
        return;
      }
      Styles.ensure();
      const strategy = await strategyPromise;
      if (strategy?.mechanics?.length) {
        renderStrategy(slot, strategy, achievement ?? {});
      } else {
        Mechanics.share.mount(slot, config, achievement ?? {});
      }
      logEvent("share");
    },

    async activate(host) {
      Styles.ensure();
      const strategy = await strategyPromise;
      if (strategy?.mechanics?.length) {
        renderStrategy(host, strategy, {});
        logEvent("share");
      }
      return strategy;
    },

    render(type, host, params) {
      const mechanic = Mechanics[type];
      if (!mechanic) {
        console.warn(`[GrowthKit] Unknown mechanic: "${type}"`);
        return;
      }
      Styles.ensure();
      mechanic.mount(host, config, params ?? {});
    },
  };

  console.info(
    "[GrowthKit] SDK loaded for app:",
    config.appName,
    "| mechanics:",
    window.GrowthKit.availableMechanics.join(", ")
  );
})(window, document);
