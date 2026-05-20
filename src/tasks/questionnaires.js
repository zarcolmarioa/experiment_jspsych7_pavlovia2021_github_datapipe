// =============================================================================
// src/tasks/questionnaires.js
// Post-task Questionnaires
//
// Each questionnaire is built by a dedicated function and gated by its own
// enabled flag in CONFIG.questionnaires.names.
// =============================================================================

var Questionnaires = (function () {

  // ---------------------------------------------------------------------------
  // Helper: check if a specific questionnaire is enabled
  // ---------------------------------------------------------------------------
  function _isEnabled(id) {
    var names = CONFIG.questionnaires.names || [];
    for (var i = 0; i < names.length; i++) {
      if (names[i].id === id && names[i].enabled) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // CDS: Cambridge Depersonalization Scale
  //
  // - All items on a single scrollable page
  // - Frequency: radio buttons (Never / Rarely / Often / Very often / All the time)
  // - Duration: hidden until frequency is clicked; disabled when frequency = Never
  // - Full click history logged with timestamps
  // ---------------------------------------------------------------------------
  function _buildCDS(jsPsych) {

    var items = INSTRUCTIONS.cds_items;
    var freqLabels = INSTRUCTIONS.cds_frequency_labels;
    var durLabels  = INSTRUCTIONS.cds_duration_labels;

    // Build the HTML for all items
    var html = '';
    html += '<div class="cds-container" style="max-width:800px; margin:0 auto; text-align:left; font-family:Georgia,serif;">';
    html += '<h2 style="text-align:center;">' + INSTRUCTIONS.cds_title + '</h2>';
    html += '<div style="margin-bottom:24px;">' + INSTRUCTIONS.cds_instructions + '</div>';

    for (var i = 0; i < items.length; i++) {
      var n = i + 1;
      html += '<div class="cds-item" style="margin-bottom:32px; padding:16px; border:1px solid #ddd; border-radius:6px; background:#fafafa;">';
      html += '<p style="margin-top:0;"><strong>' + n + '.</strong> ' + items[i] + '</p>';

      // Frequency row
      html += '<div class="cds-freq-row" style="margin-bottom:8px;">';
      html += '<div style="font-size:0.85em; color:#555; margin-bottom:6px;"><strong>Frequency:</strong></div>';
      html += '<div style="display:flex; flex-wrap:wrap; gap:12px;">';
      for (var f = 0; f < freqLabels.length; f++) {
        var fid = 'cds_' + n + '_freq_' + f;
        html += '<label style="cursor:pointer; display:flex; align-items:center; gap:4px;">';
        html += '<input type="radio" name="cds_' + n + '_freq" id="' + fid + '" value="' + f + '" data-item="' + n + '" data-scale="frequency">';
        html += '<span>' + freqLabels[f] + '</span>';
        html += '</label>';
      }
      html += '</div></div>';

      // Duration row (initially hidden)
      html += '<div class="cds-dur-row" id="cds_' + n + '_dur_row" style="display:none; margin-top:8px;">';
      html += '<div style="font-size:0.85em; color:#555; margin-bottom:6px;"><strong>Duration (on average it lasts):</strong></div>';
      html += '<div style="display:flex; flex-wrap:wrap; gap:12px;">';
      for (var d = 0; d < durLabels.length; d++) {
        var did = 'cds_' + n + '_dur_' + (d + 1);
        html += '<label style="cursor:pointer; display:flex; align-items:center; gap:4px;">';
        html += '<input type="radio" name="cds_' + n + '_dur" id="' + did + '" value="' + (d + 1) + '" data-item="' + n + '" data-scale="duration">';
        html += '<span>' + durLabels[d] + '</span>';
        html += '</label>';
      }
      html += '</div></div>';

      html += '</div>'; // close cds-item
    }

    // Submit button (initially disabled)
    html += '<div style="text-align:center; margin:24px 0;">';
    html += '<button type="button" id="cds-submit-btn" class="ne-continue-btn" disabled style="opacity:0.5; cursor:not-allowed;">' + INSTRUCTIONS.cds_submit + '</button>';
    html += '</div>';

    html += '</div>'; // close cds-container

    return {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: html,
      choices: 'NO_KEYS',
      data: { trial_type: 'cds' },
      on_load: function () {
        var startTime = performance.now();
        var clickHistory = [];
        var totalItems = items.length;

        // Track all radio clicks
        var allRadios = document.querySelectorAll('.cds-container input[type="radio"]');
        for (var r = 0; r < allRadios.length; r++) {
          allRadios[r].addEventListener('change', function (e) {
            var radio = e.target;
            var itemNum = radio.getAttribute('data-item');
            var scale = radio.getAttribute('data-scale');
            var value = radio.value;

            // Log click
            clickHistory.push({
              time_ms: Math.round(performance.now() - startTime),
              item: 'cds_' + itemNum,
              scale: scale,
              value: parseInt(value)
            });

            // If frequency was clicked, show/update duration row
            if (scale === 'frequency') {
              var durRow = document.getElementById('cds_' + itemNum + '_dur_row');
              var durRadios = durRow.querySelectorAll('input[type="radio"]');
              durRow.style.display = 'block';

              if (parseInt(value) === 0) {
                // Never: disable duration, clear selection, show N/A state
                for (var dr = 0; dr < durRadios.length; dr++) {
                  durRadios[dr].disabled = true;
                  durRadios[dr].checked = false;
                  durRadios[dr].parentElement.style.opacity = '0.4';
                }
              } else {
                // Enable duration
                for (var dr2 = 0; dr2 < durRadios.length; dr2++) {
                  durRadios[dr2].disabled = false;
                  durRadios[dr2].parentElement.style.opacity = '1';
                }
              }
            }

            // Check if submit should be enabled
            _checkCDSComplete(totalItems);
          });
        }

        function _checkCDSComplete(total) {
          var complete = true;
          for (var ci = 1; ci <= total; ci++) {
            var freqChecked = document.querySelector('input[name="cds_' + ci + '_freq"]:checked');
            if (!freqChecked) { complete = false; break; }
            // If frequency > 0 (not Never), duration must be selected
            if (parseInt(freqChecked.value) > 0) {
              var durChecked = document.querySelector('input[name="cds_' + ci + '_dur"]:checked');
              if (!durChecked) { complete = false; break; }
            }
          }
          var btn = document.getElementById('cds-submit-btn');
          btn.disabled = !complete;
          btn.style.opacity = complete ? '1' : '0.5';
          btn.style.cursor = complete ? 'pointer' : 'not-allowed';
        }

        // Submit handler
        document.getElementById('cds-submit-btn').addEventListener('click', function () {
          // Collect final answers
          var finalAnswers = {};
          for (var fi = 1; fi <= totalItems; fi++) {
            var freqSel = document.querySelector('input[name="cds_' + fi + '_freq"]:checked');
            var durSel  = document.querySelector('input[name="cds_' + fi + '_dur"]:checked');
            finalAnswers['cds_' + fi + '_frequency'] = freqSel ? parseInt(freqSel.value) : null;
            if (freqSel && parseInt(freqSel.value) === 0) {
              finalAnswers['cds_' + fi + '_duration'] = 0; // N/A for "Never"
            } else {
              finalAnswers['cds_' + fi + '_duration'] = durSel ? parseInt(durSel.value) : null;
            }
          }

          // Store data and finish trial
          var trialData = jsPsych.data.getLastTrialData().values()[0];
          // We cannot modify after the fact, so use jsPsych.data.get() approach
          // Instead, store via the display element's dataset for retrieval
          jsPsych.finishTrial({
            trial_type: 'cds',
            cds_final_answers: JSON.stringify(finalAnswers),
            cds_click_history: JSON.stringify(clickHistory),
            cds_total_clicks: clickHistory.length,
            cds_time_to_submit_ms: Math.round(performance.now() - startTime)
          });
        });
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Public: getNodes
  // ---------------------------------------------------------------------------
  function getNodes(jsPsych) {
    var nodes = [];

    if (_isEnabled('cds')) {
      nodes.push(_buildCDS(jsPsych));
    }

    // Add more questionnaires here:
    // if (_isEnabled('phq9')) { nodes.push(_buildPHQ9(jsPsych)); }

    return nodes;
  }

  return { getNodes: getNodes };

})();
