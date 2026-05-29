// =============================================================================
// src/tasks/stimulus-evaluation.js
// Pre-experimental Stimulus Evaluation Task
// =============================================================================

var StimulusEvaluation = (function () {

  // Style constants
  var QUESTION_BG = '#fafafa';
  var RADIO_ROW_BG = '#eee';
  var INPUT_BG = '#e8e8e8';

  // Helper: build a row of 1-7 radio buttons (number labels only, centered)
  function _buildScaleRadios(name) {
    var html = '';
    html += '<div style="display:flex; justify-content:center; gap:16px; padding:10px; background:' + RADIO_ROW_BG + '; border-radius:4px;">';
    for (var v = 1; v <= 7; v++) {
      html += '<label style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;">';
      html += '<input type="radio" name="' + name + '" value="' + v + '">';
      html += '<span style="font-size:0.9em;">' + v + '</span>';
      html += '</label>';
    }
    html += '</div>';
    return html;
  }

  function getNodes(jsPsych) {
    if (!CONFIG.stimulus_evaluation || !CONFIG.stimulus_evaluation.enabled) return [];

    var nodes = [];
    var cfg = CONFIG.stimulus_evaluation;
    var imgW = CONFIG.display.image_width_px;
    var imgH = CONFIG.display.image_height_px;

    // --- Instruction screen ---
    nodes.push({
      type: jsPsychHtmlButtonResponse,
      stimulus:
        '<div class="calibration-card">' +
        INSTRUCTIONS.stimulus_eval_intro +
        '</div>',
      choices: [INSTRUCTIONS.button_continue],
      button_html: '<button class="ne-continue-btn">%choice%</button>',
      data: { trial_type: 'instruction', instruction_page: 'stimulus_evaluation' },
    });

    // --- Build shuffled stimulus list ---
    var stimList = CONFIG.stimuli.list.slice();
    for (var i = stimList.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = stimList[i];
      stimList[i] = stimList[j];
      stimList[j] = tmp;
    }

    // Cap to n_trials if set
    if (cfg.n_trials !== null && cfg.n_trials !== undefined && cfg.n_trials < stimList.length) {
      stimList = stimList.slice(0, cfg.n_trials);
    }

    // --- One trial per image ---
    for (var s = 0; s < stimList.length; s++) {
      (function (stim, trialNum) {

        var imagePath = cfg.image_path + cfg.image_prefix + stim.id + '_' + stim.valence + cfg.image_suffix;

        var html = '';
        html += '<div class="stim-eval-container" style="max-width:' + (imgW + 40) + 'px; margin:0 auto; font-family:Georgia,serif;">';

        // Image
        html += '<div style="text-align:center; margin-bottom:16px;">';
        html += '<img src="' + imagePath + '" width="' + imgW + '" height="' + imgH + '" style="object-fit:contain; display:block; margin:0 auto;" alt="">';
        html += '</div>';

        // (a) Single vs multiple objects
        html += '<div class="stim-eval-question" style="margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:6px; background:' + QUESTION_BG + ';">';
        html += '<p style="margin-top:0;"><strong>' + INSTRUCTIONS.stimulus_eval_objects_label + '</strong></p>';
        html += '<div style="display:flex; justify-content:center; gap:24px; padding:10px; background:' + RADIO_ROW_BG + '; border-radius:4px;">';
        html += '<label style="cursor:pointer; display:flex; align-items:center; gap:6px;">';
        html += '<input type="radio" name="eval_objects_' + trialNum + '" value="single"> ';
        html += '<span>' + INSTRUCTIONS.stimulus_eval_objects_single + '</span></label>';
        html += '<label style="cursor:pointer; display:flex; align-items:center; gap:6px;">';
        html += '<input type="radio" name="eval_objects_' + trialNum + '" value="multiple"> ';
        html += '<span>' + INSTRUCTIONS.stimulus_eval_objects_multiple + '</span></label>';
        html += '</div></div>';

        // (b) Figure-ground discrimination (1-7 radio buttons)
        html += '<div class="stim-eval-question" style="margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:6px; background:' + QUESTION_BG + ';">';
        html += '<p style="margin-top:0;"><strong>' + INSTRUCTIONS.stimulus_eval_figground_label + '</strong></p>';
        html += _buildScaleRadios('eval_figground_' + trialNum);
        html += '</div>';

        // (c) Scene complexity (1-7 radio buttons)
        html += '<div class="stim-eval-question" style="margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:6px; background:' + QUESTION_BG + ';">';
        html += '<p style="margin-top:0;"><strong>' + INSTRUCTIONS.stimulus_eval_complexity_label + '</strong></p>';
        html += _buildScaleRadios('eval_complexity_' + trialNum);
        html += '</div>';

        // (d) Number of human figures (text input, no placeholder, styled background)
        html += '<div class="stim-eval-question" style="margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:6px; background:' + QUESTION_BG + ';">';
        html += '<p style="margin-top:0;"><strong>' + INSTRUCTIONS.stimulus_eval_humans_label + '</strong></p>';
        html += '<div style="text-align:center;">';
        html += '<input type="text" id="eval_humans_' + trialNum + '" inputmode="numeric" pattern="[0-9]*" autocomplete="off" ';
        html += 'style="width:80px; padding:8px; font-size:1.1em; text-align:center; border:1px solid #aaa; border-radius:4px; background:' + INPUT_BG + ';">';
        html += '</div></div>';

        // Submit button (disabled until all answered)
        html += '<div style="text-align:center; margin:16px 0 24px;">';
        html += '<button type="button" id="eval_submit_' + trialNum + '" class="ne-continue-btn" disabled style="opacity:0.5; cursor:not-allowed;">' + INSTRUCTIONS.stimulus_eval_submit + '</button>';
        html += '</div>';

        html += '</div>';

        nodes.push({
          type: jsPsychHtmlKeyboardResponse,
          stimulus: html,
          choices: 'NO_KEYS',
          data: {
            trial_type: 'stimulus_evaluation',
            image_id: stim.id,
            valence: stim.valence,
            category: stim.category || '',
            image_file: imagePath,
          },
          on_load: function () {
            var tn = trialNum;

            // Enforce numeric-only input
            var humansInput = document.getElementById('eval_humans_' + tn);
            humansInput.addEventListener('input', function () {
              this.value = this.value.replace(/[^0-9]/g, '');
              checkComplete();
            });

            // Listen on radio buttons
            var allRadios = document.querySelectorAll(
              'input[name="eval_objects_' + tn + '"], ' +
              'input[name="eval_figground_' + tn + '"], ' +
              'input[name="eval_complexity_' + tn + '"]'
            );
            for (var r = 0; r < allRadios.length; r++) {
              allRadios[r].addEventListener('change', checkComplete);
            }

            function checkComplete() {
              var objSel = document.querySelector('input[name="eval_objects_' + tn + '"]:checked');
              var fgSel  = document.querySelector('input[name="eval_figground_' + tn + '"]:checked');
              var cxSel  = document.querySelector('input[name="eval_complexity_' + tn + '"]:checked');
              var humVal = humansInput.value;
              var humValid = humVal !== '' && /^[0-9]+$/.test(humVal);

              var complete = objSel && fgSel && cxSel && humValid;
              var btn = document.getElementById('eval_submit_' + tn);
              btn.disabled = !complete;
              btn.style.opacity = complete ? '1' : '0.5';
              btn.style.cursor = complete ? 'pointer' : 'not-allowed';
            }

            // Submit
            document.getElementById('eval_submit_' + tn).addEventListener('click', function () {
              var objSel = document.querySelector('input[name="eval_objects_' + tn + '"]:checked');
              var fgSel  = document.querySelector('input[name="eval_figground_' + tn + '"]:checked');
              var cxSel  = document.querySelector('input[name="eval_complexity_' + tn + '"]:checked');

              jsPsych.finishTrial({
                trial_type: 'stimulus_evaluation',
                image_id: stim.id,
                valence: stim.valence,
                category: stim.category || '',
                image_file: imagePath,
                objects: objSel.value,
                figure_ground: parseInt(fgSel.value),
                scene_complexity: parseInt(cxSel.value),
                human_figures: parseInt(humansInput.value),
              });
            });
          }
        });

      })(stimList[s], s);
    }

    return nodes;
  }

  return { getNodes: getNodes };

})();
