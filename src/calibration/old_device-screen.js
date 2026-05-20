// =============================================================================
// src/calibration/device-screen.js
// Module 1 of the calibration battery: Device & Screen Screening
//
// What it does:
//   - Queries JavaScript for device/screen properties
//   - Logs them to jsPsych data (so they appear in every exported row)
//   - Checks for mobile/touch-only devices and warns or excludes
//   - Uses feature detection rather than user-agent sniffing where possible
//
// Output added to jsPsych.data.addProperties():
//   screen_width_px, screen_height_px, window_width_px, window_height_px,
//   device_pixel_ratio, is_fullscreen, touch_points, user_agent,
//   browser_language, platform (deprecated but informative)
// =============================================================================

const DeviceScreenCalibration = (function () {

  // ---------------------------------------------------------------------------
  // Internal: collect all device/screen metrics
  // Returns a plain object — safe to pass to jsPsych.data.addProperties()
  // ---------------------------------------------------------------------------
  function _collectMetrics() {
    return {
      screen_width_px:    window.screen.width,
      screen_height_px:   window.screen.height,
      window_width_px:    window.innerWidth,
      window_height_px:   window.innerHeight,
      device_pixel_ratio: window.devicePixelRatio || 1,
      is_fullscreen:      !!document.fullscreenElement,
      touch_points:       navigator.maxTouchPoints || 0,
      user_agent:         navigator.userAgent,
      browser_language:   navigator.language,
      // navigator.platform is deprecated but still informative for logging
      platform:           navigator.platform || "unknown",
      color_depth_bits:   window.screen.colorDepth,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal: decide whether to warn or exclude based on metrics
  // Returns { pass: bool, reason: string|null }
  // ---------------------------------------------------------------------------
  function _checkEligibility(metrics) {
    // Exclude touch-only devices (tablets/phones with no mouse)
    // maxTouchPoints > 0 alone is not enough (many laptops have touch screens);
    // we also check that there is a pointing device.
    const touchOnly = metrics.touch_points > 0 && !window.matchMedia("(pointer: fine)").matches;
    if (touchOnly) {
      return {
        pass: false,
        reason: "Your device appears to be a tablet or smartphone. " +
                "This study requires a desktop or laptop computer with a mouse or trackpad."
      };
    }

    // Warn (but don't exclude) if window is not fullscreen —
    // fullscreen is enforced by the fullscreen plugin before this runs,
    // so this is a fallback check.
    if (!metrics.is_fullscreen) {
      console.warn("[DeviceScreen] Window is not in fullscreen mode.");
    }

    // Warn if color depth is unexpectedly low
    if (metrics.color_depth_bits < 24) {
      console.warn("[DeviceScreen] Color depth is below 24-bit:", metrics.color_depth_bits);
    }

    return { pass: true, reason: null };
  }

  // ---------------------------------------------------------------------------
  // Public: returns a jsPsych timeline node array
  // Designed to be spread into the main timeline: [...DeviceScreenCalibration.getNodes()]
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {

    // Node 1: collect metrics via call-function, store globally, check eligibility
    const collectNode = {
      type: jsPsychCallFunction,
      func: function () {
        const metrics = _collectMetrics();

        // Store on the jsPsych data object so ALL future trials include them
        jsPsych.data.addProperties(metrics);

        // Also stash on window for other modules to read if needed
        window._deviceMetrics = metrics;

        // Log to console during development
        console.log("[DeviceScreen] Metrics collected:", metrics);

        // Incremental save
        console.log('[Platform] Calibration step complete: calibration_device_screen');

        // Check eligibility
        const check = _checkEligibility(metrics);
        window._deviceScreenPass = check.pass;
        window._deviceScreenFailReason = check.reason;
      },
    };

    // Node 2: show exclusion screen if device failed the check
    const exclusionNode = {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        // Only shown if the device failed — but jsPsych doesn't support
        // truly conditional nodes without a conditional_function wrapper,
        // so we check the flag here and return a blank if not needed.
        if (window._deviceScreenPass) {
          return '<div style="display:none"></div>';
        }
        return '<div class="ne-warning">' +
               INSTRUCTIONS.device_excluded + '</div>';
      },
      choices: function () {
        // If device passed, skip this node immediately (no key needed)
        return window._deviceScreenPass ? "ALL_KEYS" : [];
        // [] means no key will advance — participant is stuck (soft exclusion)
      },
      trial_duration: function () {
        return window._deviceScreenPass ? 0 : null;
      },
      data: { calibration_step: "device_screen" },
    };

    return [collectNode, exclusionNode];
  }

  // Public API
  return { getNodes };

})();
