// =============================================================================
// src/tasks/ne-task.js
// Core Noise Estimation Task
//
// Implements the NE procedure from Todd et al. (2012).
// All parameters are read from CONFIG (config.js) — do not hardcode values here.
//
// Trial structure (per Todd et al.):
//   [fixation] → STANDARD image (2000ms) → [ISI] →
//   COMPARISON image (2000ms) → RESPONSE PROMPT → [inter-trial message]
//
// Response: participant enters a number estimating the proportion of noise
// on the comparison relative to the standard (modulus = 100).
//
// Data logged per trial (in addition to global calibration properties):
//   trial_type, image_id, valence, category, noise_level, standard_noise,
//   response, response_scaled, rt, standard_file, comparison_file, trial_index
// =============================================================================

const NETask = (function () {

  // Module-level reference to the jsPsych instance.
  // Set once when getNodes(jsPsych) is called.
  let _jsPsych = null;

  // ---------------------------------------------------------------------------
  // Internal: build the filename for a standard image
  // ---------------------------------------------------------------------------
  function _standardFilename(imageId, noisePct) {
    return `${CONFIG.stimuli.path_standards}std_${imageId}_noise${noisePct}.jpg`;
  }

  // ---------------------------------------------------------------------------
  // Internal: build the filename for a comparison image
  // ---------------------------------------------------------------------------
  function _comparisonFilename(imageId, valence, noisePct) {
    return `${CONFIG.stimuli.path_comparisons}cmp_${imageId}_${valence}_noise${noisePct}.jpg`;
  }

  // ---------------------------------------------------------------------------
  // Internal: generate the full trial list from CONFIG.stimuli
  // ---------------------------------------------------------------------------
  function _buildTrialList() {
    const trialList = [];
    const stimList  = CONFIG.stimuli.list;
    const noiseLevels = CONFIG.noise.comparison_levels;
    const standardNoise = CONFIG.noise.standard_level;
    const reps = CONFIG.stimuli.repetitions;
    const singleExposure = CONFIG.stimuli.single_exposure;

    for (const stim of stimList) {
      if (singleExposure) {
        const noise = noiseLevels[Math.floor(Math.random() * noiseLevels.length)];
        for (let r = 0; r < reps; r++) {
          trialList.push({
            image_id:       stim.id,
            valence:        stim.valence,
            category:       stim.category || "",
            noise_level:    noise,
            standard_noise: standardNoise,
            standard_file:  _standardFilename(stim.id, standardNoise),
            comparison_file: _comparisonFilename(stim.id, stim.valence, noise),
          });
        }
      } else {
        for (const noise of noiseLevels) {
          for (let r = 0; r < reps; r++) {
            trialList.push({
              image_id:        stim.id,
              valence:         stim.valence,
              category:        stim.category || "",
              noise_level:     noise,
              standard_noise:  standardNoise,
              standard_file:   _standardFilename(stim.id, standardNoise),
              comparison_file: _comparisonFilename(stim.id, stim.valence, noise),
            });
          }
        }
      }
    }

    // Shuffle (Fisher-Yates)
    for (let i = trialList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trialList[i], trialList[j]] = [trialList[j], trialList[i]];
    }

    // Apply trial cap if set (null = no cap)
    const cap = CONFIG.stimuli.n_trials;
    return (cap !== null && cap !== undefined) ? trialList.slice(0, cap) : trialList;
  }

  // ---------------------------------------------------------------------------
  // Internal: collect all stimulus filenames for preloading
  // ---------------------------------------------------------------------------
  function _getAllImagePaths() {
    const paths = new Set();
    for (const stim of CONFIG.stimuli.list) {
      paths.add(_standardFilename(stim.id, CONFIG.noise.standard_level));
      for (const noise of CONFIG.noise.comparison_levels) {
        paths.add(_comparisonFilename(stim.id, stim.valence, noise));
      }
    }
    return Array.from(paths);
  }

  // ---------------------------------------------------------------------------
  // Internal: build the HTML for displaying one image
  // ---------------------------------------------------------------------------
  function _imageHtml(imagePath, label, showLabel) {
    const w = CONFIG.display.image_width_px;
    const h = CONFIG.display.image_height_px;
    const labelHtml = showLabel
      ? `<p class="ne-image-label">${label}</p>`
      : '';
    return `
      <div class="ne-trial-container">
        ${labelHtml}
        <div class="ne-image-frame">
          <img src="${imagePath}" width="${w}" height="${h}" alt="">
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Internal: TEXT INPUT response trial
  //
  // Uses jsPsychCallFunction (async) for cross-browser reliability.
  // All interaction via button clicks.
  //
  // When comparison_duration is set (not null), the comparison image has
  // already been shown in a separate trial. The response screen shows only
  // the numeric input prompt (no image), matching Todd et al. Figure 1:
  // "an image was presented for 2000ms followed by a prompt requesting a
  // numerical value."
  //
  // When comparison_duration is null, the image is shown alongside the input.
  // ---------------------------------------------------------------------------
  function _textResponseTrial(trialSpec, trialIndex) {
    const cfg        = CONFIG.response.text;
    const compFile   = trialSpec.comparison_file;
    const showImage  = (CONFIG.display.comparison_duration === null);

    return {
      type:  jsPsychCallFunction,
      async: true,
      func: function (done) {
        const display   = _jsPsych.getDisplayElement();
        const startTime = performance.now();
        const w         = CONFIG.display.image_width_px;
        const timeLimit = CONFIG.response.response_time_limit; // ms or null
        const showTimer = CONFIG.response.show_timer;
        var   submitted = false;
        var   timerId   = null;
        var   countdownId = null;
        var   remainingSec = timeLimit ? Math.ceil(timeLimit / 1000) : null;

        // Build image HTML only if comparison was not already shown
        var imageSection = '';
        if (showImage) {
          imageSection =
            '<div class="ne-trial-container" style="margin-bottom:18px;">' +
            '<div class="ne-image-frame">' +
            '<img src="' + compFile + '" width="' + w + '" ' +
            'height="' + CONFIG.display.image_height_px + '" alt="">' +
            '</div></div>';
        }

        // Timer HTML (visible or hidden based on config)
        // Uses #ccc on the #808080 background — subtle but readable
        var timerHtml = '';
        if (timeLimit) {
          var timerStyle = 'font-size:0.82rem; font-family:monospace; ' +
            'margin-top:10px; min-height:1.2em; text-align:center; ';
          if (showTimer) {
            timerStyle += 'color:#ccc;';
          } else {
            timerStyle += 'color:transparent; user-select:none;';
          }
          timerHtml = '<p id="ne-timer" style="' + timerStyle + '"></p>';
        }

        display.innerHTML =
          '<div style="text-align:center; padding:12px 0;">' +

          imageSection +

          // Prompt text
          '<p style="color:#ddd; font-size:0.95rem; margin-bottom:16px;">' +
          INSTRUCTIONS.task_text_prompt
            .replace('{modulus}', String(cfg.modulus)) +
          '</p>' +

          // Input + Submit row
          '<div style="display:flex; justify-content:center; ' +
          'align-items:center; gap:12px;">' +
          '<input id="ne-text-input" type="text" inputmode="numeric" ' +
          'autocomplete="off" ' +
          'placeholder="' + cfg.placeholder + '" ' +
          'style="width:160px; font-size:1.5rem; padding:10px 14px; ' +
          'border:2px solid #666; border-radius:3px; ' +
          'text-align:center; background:#f9f9f9;">' +
          '<button id="ne-submit-btn" class="ne-continue-btn" ' +
          'style="margin:0; padding:10px 28px;">' +
          INSTRUCTIONS.task_continue_button +
          '</button>' +
          '</div>' +

          '<p id="ne-feedback" style="color:#e63946; margin-top:10px; ' +
          'font-size:0.82rem; min-height:1.2em;"></p>' +

          timerHtml +

          '</div>';

        var input    = document.getElementById('ne-text-input');
        var btn      = document.getElementById('ne-submit-btn');
        var feedback = document.getElementById('ne-feedback');
        var timerEl  = document.getElementById('ne-timer');

        if (!input || !btn) {
          window._lastTextResult = { response: null, rt: 0, timed_out: true };
          done();
          return;
        }

        // Focus the input
        setTimeout(function () { input.focus(); }, 50);

        // Block Enter key in the input — responses must use the button only
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); }
        });

        function finishTrial(val, timedOut) {
          if (submitted) return;
          submitted = true;
          if (timerId) clearTimeout(timerId);
          if (countdownId) clearInterval(countdownId);

          btn.disabled              = true;
          btn.textContent           = '...';
          input.style.pointerEvents = 'none';

          var elapsedMs = Math.round(performance.now() - startTime);
          var timeRemainingMs = timeLimit
            ? Math.max(0, timeLimit - elapsedMs)
            : null;

          window._lastTextResult = {
            response:          val,
            rt:                elapsedMs,
            timed_out:         timedOut || false,
            time_remaining_ms: timeRemainingMs,
            time_limit_ms:     timeLimit || null,
          };

          console.log(
            '[NE ' + (trialSpec.is_practice ? 'PRACTICE' : 'MAIN') + '] ' +
            'trial ' + trialIndex +
            ' | id: '     + trialSpec.image_id +
            ' | noise: '  + trialSpec.noise_level +
            ' | response: ' + val +
            ' | rt: ' + elapsedMs + 'ms' +
            (timeRemainingMs !== null ? ' | remaining: ' + timeRemainingMs + 'ms' : '') +
            (timedOut ? ' | TIMED OUT' : '')
          );

          display.innerHTML = '';
          done();
        }

        function submitResponse() {
          if (submitted) return;

          var raw = input.value.trim();
          if (raw === '') {
            if (feedback) feedback.textContent = 'Please enter a number.';
            input.focus();
            return;
          }
          var val = parseFloat(raw);
          if (isNaN(val) || val < 0) {
            if (feedback) feedback.textContent = 'Please enter a valid number.';
            input.value = '';
            input.focus();
            return;
          }

          finishTrial(val, false);
        }

        // Submit button click — NOT { once: true } so it works after
        // validation errors (e.g. empty input on first click)
        btn.addEventListener('click', submitResponse);

        // --- Time limit ---
        if (timeLimit) {
          // Update timer display with initial value
          if (timerEl) {
            timerEl.textContent = remainingSec + 's';
          }

          countdownId = setInterval(function () {
            remainingSec--;
            if (timerEl) {
              timerEl.textContent = remainingSec > 0 ? remainingSec + 's' : '';
            }
            if (remainingSec <= 0) {
              clearInterval(countdownId);
              countdownId = null;
            }
          }, 1000);

          // Auto-submit or record timeout
          timerId = setTimeout(function () {
            if (submitted) return;
            // Try to submit whatever is in the input; if empty, record null
            var raw = input.value.trim();
            var val = (raw !== '' && !isNaN(parseFloat(raw)) && parseFloat(raw) >= 0)
              ? parseFloat(raw)
              : null;
            finishTrial(val, true);
          }, timeLimit);
        }
      },

      data: {
        trial_type:      'ne_task',
        image_id:        trialSpec.image_id,
        valence:         trialSpec.valence,
        category:        trialSpec.category,
        noise_level:     trialSpec.noise_level,
        standard_noise:  trialSpec.standard_noise,
        standard_file:   trialSpec.standard_file,
        comparison_file: trialSpec.comparison_file,
        trial_index:     trialIndex,
        response_mode:   'text',
        is_practice:     trialSpec.is_practice || false,
      },

      on_finish: function (data) {
        var r = window._lastTextResult || { response: null, rt: 0, timed_out: true, time_remaining_ms: null, time_limit_ms: null };
        data.response          = r.response;
        data.rt                = r.rt;
        data.timed_out         = r.timed_out || false;
        data.time_remaining_ms = r.time_remaining_ms;
        data.time_limit_ms     = r.time_limit_ms;
        data.response_scaled   = (r.response !== null)
          ? (r.response - CONFIG.response.text.modulus) / CONFIG.response.text.modulus
          : null;
        window._lastTextResult = null;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Internal: build the full sequence for one NE trial
  //   fixation → standard → [ISI] → comparison → response → [inter-trial msg]
  // ---------------------------------------------------------------------------
  function _buildOneTrial(trialSpec, trialIndex) {
    const sequence = [];

    // 1. Fixation cross (if configured)
    if (CONFIG.display.fixation_duration > 0) {
      sequence.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<div class="ne-fixation">+</div>',
        choices: "NO_KEYS",
        trial_duration: CONFIG.display.fixation_duration,
        data: { trial_type: "fixation", trial_index: trialIndex },
      });
    }

    // 2. Standard image
    sequence.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: (function (f) {
        return function () { return _imageHtml(f, 'STANDARD', false); };
      })(trialSpec.standard_file),
      choices: 'NO_KEYS',
      trial_duration: CONFIG.display.standard_duration,
      data: {
        trial_type:     'standard',
        image_id:       trialSpec.image_id,
        standard_file:  trialSpec.standard_file,
        trial_index:    trialIndex,
      },
    });

    // 3. ISI (if configured)
    if (CONFIG.display.isi_duration > 0) {
      sequence.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<div class="ne-fixation">+</div>',
        choices: "NO_KEYS",
        trial_duration: CONFIG.display.isi_duration,
        data: { trial_type: "isi", trial_index: trialIndex },
      });
    }

    // 4. Comparison image (shown for fixed duration if configured)
    if (CONFIG.display.comparison_duration !== null) {
      sequence.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: (function (f) {
          return function () { return _imageHtml(f, 'COMPARISON', false); };
        })(trialSpec.comparison_file),
        choices: 'NO_KEYS',
        trial_duration: CONFIG.display.comparison_duration,
        data: { trial_type: 'comparison_view', trial_index: trialIndex },
      });
    }

    // 5. Response trial (text input)
    sequence.push(_textResponseTrial(trialSpec, trialIndex));

    // 6. Inter-trial message (if enabled)
    var itm = CONFIG.display.inter_trial_message;
    if (itm && itm.enabled) {
      sequence.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus:
          '<div style="text-align:center;">' +
          '<p class="ne-inter-trial-msg">' +
          INSTRUCTIONS.inter_trial_message +
          '</p></div>',
        choices: 'NO_KEYS',
        trial_duration: itm.duration,
        data: { trial_type: 'inter_trial_message', trial_index: trialIndex },
      });
    }

    return sequence;
  }

  // ---------------------------------------------------------------------------
  // Internal: build practice trial list from CONFIG.practice
  // ---------------------------------------------------------------------------
  function _buildPracticeTrialList() {
    const practiceList = [];
    const stimList     = CONFIG.practice.list;
    const noiseLevels  = CONFIG.practice.noise_levels;
    const standardNoise = CONFIG.noise.standard_level;
    const nTrials      = CONFIG.practice.n_trials;
    const pathStd      = CONFIG.practice.path_standards;
    const pathCmp      = CONFIG.practice.path_comparisons;

    for (const stim of stimList) {
      for (const noise of noiseLevels) {
        practiceList.push({
          image_id:        stim.id,
          valence:         stim.valence,
          category:        stim.category || 'practice',
          noise_level:     noise,
          standard_noise:  standardNoise,
          standard_file:   pathStd + 'std_practice_' + stim.id + '_noise' + standardNoise + '.jpg',
          comparison_file: pathCmp + 'cmp_practice_' + stim.id + '_' + stim.valence + '_noise' + noise + '.jpg',
          is_practice:     true,
        });
      }
    }

    // Shuffle
    for (let i = practiceList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [practiceList[i], practiceList[j]] = [practiceList[j], practiceList[i]];
    }

    return practiceList.slice(0, nTrials);
  }

  // ---------------------------------------------------------------------------
  // Internal: collect practice image paths for preloading
  // ---------------------------------------------------------------------------
  function _getPracticeImagePaths() {
    const paths = new Set();
    const pathStd = CONFIG.practice.path_standards;
    const pathCmp = CONFIG.practice.path_comparisons;
    for (const stim of CONFIG.practice.list) {
      paths.add(pathStd + 'std_practice_' + stim.id + '_noise' + CONFIG.noise.standard_level + '.jpg');
      for (const noise of CONFIG.practice.noise_levels) {
        paths.add(pathCmp + 'cmp_practice_' + stim.id + '_' + stim.valence + '_noise' + noise + '.jpg');
      }
    }
    return Array.from(paths);
  }

  // ---------------------------------------------------------------------------
  // Public: returns the full NE task as a jsPsych timeline
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {
    _jsPsych = jsPsych;

    const trialList = _buildTrialList();
    const allImages = _getAllImagePaths();
    const timeline  = [];

    // Node 1: Preload all images
    const stimuliExist = allImages.length > 0;
    timeline.push({
      type: jsPsychPreload,
      images: allImages,
      show_progress_bar: stimuliExist,
      continue_after_error: true,   // <-- SET TO false FOR REAL DATA COLLECTION
      message: stimuliExist
        ? '<p style="color:#ddd;">Loading images, please wait...</p>'
        : '<p style="color:#ddd;">No stimuli configured yet (development mode).</p>',
      error_message:
        '<div class="ne-warning" style="max-width:600px; margin:0 auto;">' +
        '<h2>Images could not be loaded</h2>' +
        '<p>Some stimulus images were not found. ' +
        'If you are in development mode, this is expected -- ' +
        'add your image files to the stimuli/ folder and update ' +
        'CONFIG.stimuli.list in config.js.</p>' +
        '<p>The experiment will continue without those images.</p>' +
        '</div>',
      data: { trial_type: 'preload' },
    });

    // Node 2: Pre-task instruction screen
    timeline.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: '<div class="calibration-card">' + INSTRUCTIONS.pre_task + '</div>',
      choices: [INSTRUCTIONS.button_continue],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { trial_type: 'instruction', instruction_page: 'pre_task' },
    });

    // Node 3: Task instructions
    timeline.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: '<div class="calibration-card">' + INSTRUCTIONS.task_intro + '</div>',
      choices: [INSTRUCTIONS.button_continue],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { trial_type: 'instruction', instruction_page: 'task_intro' },
    });

    // Node 4: Practice block
    if (CONFIG.practice && CONFIG.practice.enabled) {
      const practiceTrials = _buildPracticeTrialList();
      const practiceImages = _getPracticeImagePaths();

      // Preload practice images
      timeline.push({
        type: jsPsychPreload,
        images: practiceImages,
        show_progress_bar: false,
        continue_after_error: true,
        data: { trial_type: 'preload', preload_type: 'practice' },
      });

      // Practice intro
      timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: '<div class="calibration-card">' + INSTRUCTIONS.practice_intro + '</div>',
        choices: [INSTRUCTIONS.button_continue],
        button_html: '<button class="ne-continue-btn">%choice%</button>',
        data: { trial_type: 'instruction', instruction_page: 'practice_intro' },
      });

      // Practice trials
      practiceTrials.forEach(function (trialSpec, i) {
        var seq = _buildOneTrial(trialSpec, i);
        seq.forEach(function (t) {
          t.data = Object.assign({}, t.data || {}, { is_practice: true });
        });
        seq.forEach(function (t) { timeline.push(t); });
      });

      // Practice end screen
      timeline.push({
        type: jsPsychHtmlButtonResponse,
        stimulus: '<div class="calibration-card">' + INSTRUCTIONS.practice_end + '</div>',
        choices: [INSTRUCTIONS.button_continue],
        button_html: '<button class="ne-continue-btn">%choice%</button>',
        data: { trial_type: 'instruction', instruction_page: 'practice_end' },
      });
    }

    // Node 5: Main task begin screen
    timeline.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: '<div class="calibration-card">' + INSTRUCTIONS.task_begin + '</div>',
      choices: [INSTRUCTIONS.button_continue],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { trial_type: 'instruction', instruction_page: 'task_begin' },
    });

    // Node 6: Trial loop
    trialList.forEach((trialSpec, i) => {
      const trialSequence = _buildOneTrial(trialSpec, i);
      trialSequence.forEach(t => timeline.push(t));
    });

    return timeline;
  }

  // ---------------------------------------------------------------------------
  // Public: emotional salience rating block (post-task)
  // Shows each image without noise, participant rates emotional arousal 1–7.
  // ---------------------------------------------------------------------------
  function getSalienceRatingNodes(jsPsych) {
    if (!CONFIG.salience_rating.enabled) return [];

    const cfg = CONFIG.salience_rating;
    const nodes = [];

    // Instruction — button advance (no keyboard)
    nodes.push({
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        '<h2>Image Ratings</h2>' +
        cfg.instruction +
        '</div>',
      choices: [INSTRUCTIONS.button_continue],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { trial_type: "instruction", instruction_page: "salience_rating" },
    });

    // One slider trial per image (no noise)
    const stimList = [...CONFIG.stimuli.list];
    for (let i = stimList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stimList[i], stimList[j]] = [stimList[j], stimList[i]];
    }

    for (const stim of stimList) {
      const imagePath = _comparisonFilename(stim.id, stim.valence, CONFIG.noise.standard_level);

      nodes.push({
        type: jsPsychHtmlSliderResponse,
        stimulus: `
          <div class="ne-trial-container">
            <div class="ne-image-frame">
              <img src="${imagePath}"
                   width="${CONFIG.display.image_width_px}"
                   height="${CONFIG.display.image_height_px}" alt="">
            </div>
          </div>
        `,
        labels: [cfg.label_min, cfg.label_max],
        min: cfg.scale_min,
        max: cfg.scale_max,
        slider_start: Math.round((cfg.scale_min + cfg.scale_max) / 2),
        step: 1,
        require_moving: true,
        button_label: "Next",
        data: {
          trial_type: "salience_rating",
          image_id:   stim.id,
          valence:    stim.valence,
          category:   stim.category || "",
        },
      });
    }

    return nodes;
  }

  // Public API
  return { getNodes, getSalienceRatingNodes };

})();
