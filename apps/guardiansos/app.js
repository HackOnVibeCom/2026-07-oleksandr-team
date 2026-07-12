/**
 * GuardianSOS — demo personal-safety app.
 *
 * A UI mock only: it never sends real alerts, SMS, calls, or contacts anyone.
 * Like FitTrack, it owns no GrowthKit logic — it just integrates the same SDK.
 * Because this app has no "achievement" moment, it asks the SDK to render the
 * AI-assigned strategy directly on load (GrowthKit.activate).
 */
(() => {
  "use strict";

  // Render the AI-assigned growth mechanics into the slot (referral + waitlist).
  const slot = document.getElementById("growthkit-slot");
  window.GrowthKit?.activate(slot);

  // SOS button — a mock. Shows what WOULD happen; sends nothing.
  const sosBtn = document.getElementById("sos-btn");
  const status = document.getElementById("sos-status");

  sosBtn.addEventListener("click", () => {
    sosBtn.disabled = true;
    sosBtn.textContent = "🚨 Sending…";
    setTimeout(() => {
      status.hidden = false;
      status.innerHTML =
        "✅ <b>Demo:</b> an SOS would now reach your 3 trusted contacts and " +
        "emergency services.<br>Nothing was actually sent — this is a prototype.";
      sosBtn.disabled = false;
      sosBtn.textContent = "🚨 Send SOS";
    }, 900);
  });
})();
