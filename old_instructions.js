// =============================================================================
// instructions.js  --  ALL participant-facing text lives here
//
// LANGUAGE SUPPORT:
//   Text is organised by language code ("en", "ja").
//   The active language is set via CONFIG.experiment.language in config.js.
//   At the bottom of this file, INSTRUCTIONS is set to the active language.
//
// TO ADD A NEW LANGUAGE:
//   1. Copy the entire _STRINGS.en block and rename the copy (e.g. _STRINGS.ja)
//   2. Translate all text between backticks (` ... `)
//   3. Keep all HTML tags exactly as they are
//   4. Add the new language code to the switch statement at the bottom
// =============================================================================

var _STRINGS = {};

// =============================================================================
// ENGLISH
// =============================================================================
_STRINGS.en = {

  // ---------------------------------------------------------------------------
  // GENERAL
  // ---------------------------------------------------------------------------

  welcome: `
    <h2>Welcome</h2>
    <p>Thank you for taking part in this study.</p>
    <p>Please read the following instructions carefully before we begin.</p>
  `,

  calibration_intro: `
    <h2>Display Setup</h2>
    <p>Before we begin, we need to check that your display is set up correctly.
       This will only take a few minutes.</p>
    <p>Please make sure you are sitting comfortably in front of your screen,
       that the room is not overly bright, and that you are not using a tablet
       or phone.</p>
  `,

  // ---------------------------------------------------------------------------
  // CALIBRATION STEPS
  // ---------------------------------------------------------------------------

  calibration_resize_intro: `
    <p>We need to measure your screen size. You will do this <strong>twice</strong>
       to improve accuracy.</p>
    <p>Please find a <strong>credit card, debit card, or bank card</strong>.
       Any standard card will work. If you do not have one,
       a driving licence is also fine.</p>
    <p>On the next screens you will see a rectangle. Drag the
       <strong>right edge</strong> to adjust its <strong>width</strong>,
       and the <strong>bottom edge</strong> to adjust its
       <strong>height</strong>, until the rectangle matches the
       size of your card exactly.</p>
    <p>Hold the card next to your screen and compare visually --
       your card does not need to touch the monitor.</p>
  `,

  calibration_resize_button: `I have my card ready`,

  calibration_resize_prompt: `
    Drag the handles to match your card size, then click the button below.
  `,

  calibration_resize_confirm: `This matches my card`,

  calibration_blindspot_intro: `
    <p>Next, we will estimate <strong>how far you are sitting from the
       screen</strong>.</p>
    <p>Please follow these steps carefully:</p>
    <ol>
      <li>Cover or close your <strong>left eye</strong>.</li>
      <li>With your right eye, <strong>look at the white square</strong>
          on the left side of the screen -- do not let your eye wander.</li>
      <li>A <strong>red dot</strong> will move across the screen.</li>
      <li>Click the button as soon as the dot
          <strong>disappears</strong>.</li>
      <li>If the dot <strong>does not disappear</strong> before reaching
          the edge of the screen, simply <strong>do not press</strong>
          the button. The trial will advance automatically.</li>
      <li>This will repeat several times.</li>
    </ol>
    <p>It is important to keep your eye fixed on the white square
       the whole time.</p>
  `,

  calibration_blindspot_button: `I am ready -- start`,

  calibration_blindspot_trial_label: `
    Click the button when the dot disappears
  `,

  calibration_blindspot_response_button: `Dot disappeared`,

  calibration_blindspot_next_button: `Start trial`,

  calibration_blindspot_too_far: `
    <h2>You may be sitting too far from the screen</h2>
    <p>We estimated your viewing distance at approximately
       <strong>{distance} cm</strong>.</p>
    <p>For the best results, please sit approximately
       <strong>50-70 cm</strong> from your screen (roughly arm's length).</p>
    <p>Please adjust your position and then click Continue.</p>
  `,

  calibration_gamma_intro: `
    <p>Next, we will measure a property of your screen that affects how
       brightness is displayed. You will complete this matching task
       <strong>three times</strong>, each with a slightly different pattern.</p>
    <p>On each match you will see <strong>two grey squares</strong> placed
       side by side, sharing a common border:</p>
    <ul>
      <li>The <strong>left square</strong> has a fixed pattern of
          alternating black and white dots.</li>
      <li>The <strong>right square</strong> is a plain grey colour
          that you can adjust.</li>
    </ul>
    <p>Use the <strong>arrow buttons</strong> to adjust the right square
       until both squares look <strong>the same shade of grey</strong>.</p>
    <p>Try squinting slightly or stepping back from the screen — this
       can help the pattern on the left appear more like a uniform grey.</p>
    <p>Click <strong>Confirm match</strong> when you are satisfied.
       The next match will then begin automatically.</p>
  `,

  calibration_gamma_button: `Begin brightness check`,

  calibration_gamma_confirm_button: `Confirm match`,

  calibration_gamma_prompt: `
    Use the arrow buttons to adjust the RIGHT square until
    both squares look the same shade of grey. Click Confirm when done.
  `,

  calibration_gamma_warning: `
    <h2>Display Note</h2>
    <p>Your display settings may differ from a standard calibrated monitor.
       This is common and will not prevent you from participating.</p>
    <p>If you are using an external monitor, please make sure its brightness
       and contrast settings are at default values.</p>
  `,

  calibration_contrast_intro: `
    <p>Almost done! We will now show you <strong>three checks</strong>, one at
       a time. Each check shows a grey square with a
       <strong>faint number</strong> hidden inside it.</p>
    <p>The number is slightly lighter than the background — look carefully.
       You have <strong>two attempts</strong> per check. If you cannot
       identify the number on either attempt, the next check will begin
       automatically.</p>
    <p>Type the number you see and click <strong>Submit</strong>.</p>
  `,

  calibration_ambient_question: `
    <p>How would you describe the lighting in the room you are in right now?</p>
    <ul style="text-align:left; display:inline-block; margin-top:8px;">
      <li><strong>A.</strong> My screen is the brightest thing in the room
          (lights off or very dim)</li>
      <li style="margin-top:8px;"><strong>B.</strong> Normal indoor lighting
          &mdash; ceiling lights or daylight from a window, but no direct
          sunlight on my screen</li>
      <li style="margin-top:8px;"><strong>C.</strong> Direct sunlight or very
          bright artificial light is hitting my screen</li>
    </ul>
  `,

  calibration_ambient_options: [`A`, `B`, `C`],

  // ---------------------------------------------------------------------------
  // NE TASK
  // ---------------------------------------------------------------------------

  pre_task: `
    <h2>The Task</h2>
    <p>You have completed the display setup. The main experiment will begin
       shortly.</p>
    <p>On each trial you will see two images, one after the other:</p>
    <ol>
      <li>The first image is the <strong>Standard</strong>. It always has
          the same level of visual noise (graininess). This standard is
          given an arbitrary value of <strong>100</strong>.</li>
      <li>The second image is the <strong>Comparison</strong>. Your task is
          to estimate the amount of noise on the comparison
          <em>relative to the standard</em>.</li>
    </ol>
    <p>After the comparison image disappears, enter a <strong>number</strong>
       representing your noise estimate:</p>
    <ul>
      <li>If the comparison looks <strong>less noisy</strong> than the
          standard, enter a number <strong>below 100</strong></li>
      <li>If it looks <strong>about the same</strong>, enter
          <strong>100</strong></li>
      <li>If it looks <strong>more noisy</strong>, enter a number
          <strong>above 100</strong></li>
    </ul>
    <p><strong>Important:</strong> Focus on the <em>graininess</em> of the
       images -- the visual noise that looks like static. Try to ignore what
       the image actually shows. You will have a limited time to enter
       your response, so try to respond promptly.</p>
  `,

  practice_intro: `
    <h2>Practice Trials</h2>
    <p>Before the main experiment, you will complete a short practice to
       familiarise yourself with the task.</p>
    <p>These practice trials do <strong>not</strong> count toward the
       main experiment.</p>
    <p>Remember: the standard = <strong>100</strong>. Enter a number
       for how noisy the comparison is relative to the standard.</p>
  `,

  practice_end: `
    <h2>Practice Complete</h2>
    <p>The practice is now finished. The <strong>main experiment</strong>
       will begin on the next screen.</p>
    <p>Remember: focus on the <strong>graininess</strong> of each image,
       not its content.</p>
    <p>There will be a short break in the middle of the experiment.</p>
  `,

  task_intro: `
    <h2>Task Instructions</h2>
    <p>On each trial, you will see <strong>two images</strong> presented
       one after the other.</p>
    <p>The first image is the <strong>Standard</strong>. It is always shown
       at the same level of visual noise (graininess). The standard is
       given an arbitrary value of <strong>100</strong>.</p>
    <p>The second image is the <strong>Comparison</strong>. Your job is to
       estimate the amount of noise on the comparison image
       <em>relative to the standard</em>.</p>
    <p>After the comparison image disappears, enter a number:</p>
    <ul>
      <li>Below 100 if the comparison looks <strong>less noisy</strong></li>
      <li>100 if it looks <strong>about the same</strong></li>
      <li>Above 100 if it looks <strong>more noisy</strong></li>
    </ul>
    <p>Focus on the <strong>noisiness (graininess)</strong> of the images,
       not their content. You will have a limited time to respond,
       so try to answer promptly.</p>
  `,

  task_begin: `
    <h2>Main Task</h2>
    <p>The practice is now complete. The main task will now begin.</p>
    <p>Remember: the standard = <strong>100</strong>. Enter a number
       for how noisy the comparison is relative to the standard.</p>
  `,

  task_text_prompt: `
    The standard = <strong>{modulus}</strong>.
    Enter a number for how noisy this image was relative to the standard,
    then click Submit. You have a limited time to respond.
  `,

  task_continue_button: `Submit`,

  inter_trial_message: `Next trial`,

  salience_intro: `
    <h2>Image Ratings</h2>
    <p>You will now see each image again,
       <strong>without any noise</strong>.</p>
    <p>For each image, please rate how <strong>emotionally arousing</strong>
       it is on a scale from 1 (not at all) to 7 (extremely).</p>
  `,

  salience_label_min: `Not at all emotionally arousing`,
  salience_label_max: `Extremely emotionally arousing`,

  // ---------------------------------------------------------------------------
  // STIMULUS EVALUATION (pre-experimental)
  // ---------------------------------------------------------------------------

  stimulus_eval_intro: `
    <h2>Image Evaluation</h2>
    <p>You will now see a series of images. For each image, please answer
       the following four questions:</p>
    <ol>
      <li>Does the image contain a <strong>single object</strong> or
          <strong>multiple objects</strong>?</li>
      <li>How <strong>difficult</strong> is it to distinguish the main
          object(s) from the background? (1 = very easy, 7 = very difficult)</li>
      <li>How <strong>complex</strong> is the scene? (1 = very simple,
          7 = very complex)</li>
      <li>How many <strong>human figures</strong> are visible in the image?</li>
    </ol>
    <p>Take your time with each image. There is no time limit.</p>
  `,

  stimulus_eval_objects_label: `Does this image contain a single object or multiple objects?`,
  stimulus_eval_objects_single: `Single object`,
  stimulus_eval_objects_multiple: `Multiple objects`,

  stimulus_eval_figground_label: `How difficult is it to distinguish the main object(s) from the background? Rate from 1 (very easy) to 7 (very difficult).`,
  stimulus_eval_figground_min: `1 — Very easy`,
  stimulus_eval_figground_max: `7 — Very difficult`,

  stimulus_eval_complexity_label: `How complex is the scene? Rate from 1 (very simple) to 7 (very complex).`,
  stimulus_eval_complexity_min: `1 — Very simple`,
  stimulus_eval_complexity_max: `7 — Very complex`,

  stimulus_eval_humans_label: `How many human figures are visible in the image?`,

  stimulus_eval_submit: `Next image`,

  // ---------------------------------------------------------------------------
  // QUESTIONNAIRES
  // ---------------------------------------------------------------------------

  // CDS (Cambridge Depersonalization Scale)
  cds_title: `Cambridge Depersonalisation Scale`,
  cds_instructions: `
    <p>This questionnaire describes experiences that people may have in
       their daily life. We are interested in:</p>
    <p><strong>(a)</strong> their <strong>frequency</strong> — how often you
       have had these experiences over the last six months, and</p>
    <p><strong>(b)</strong> their approximate <strong>duration</strong>.</p>
    <p>For each question, first select how frequently you have had
       this experience. Then indicate how long it tends to last.</p>
    <p>If you are not sure, give your best guess.</p>
  `,
  cds_frequency_labels: ['Never', 'Rarely', 'Often', 'Very often', 'All the time'],
  cds_duration_labels: ['Few seconds', 'Few minutes', 'Few hours', 'About a day', 'More than a day', 'More than a week'],
  cds_duration_na: 'N/A',
  cds_submit: 'Submit answers',
  cds_items: [
    'Out of the blue, I feel strange, as if I were not real or as if I were cut off from the world.',
    'What I see looks "flat" or "lifeless", as if I were looking at a picture.',
    'Parts of my body feel as if they didn\'t belong to me.',
  ],

  // ---------------------------------------------------------------------------
  // END
  // ---------------------------------------------------------------------------

  end: `
    <h2>Thank You</h2>
    <p>You have completed the task.</p>
    <p>Your responses are being saved.
       Please wait a moment before closing this window.</p>
  `,

  // ---------------------------------------------------------------------------
  // SHARED BUTTON LABELS
  // ---------------------------------------------------------------------------

  button_continue:  `Continue`,
  button_confirm:   `Confirm`,

  // ---------------------------------------------------------------------------
  // BROWSER / DEVICE WARNINGS
  // ---------------------------------------------------------------------------

  browser_warning: `
    <h2>Browser Recommendation</h2>
    <p>This study works best in <strong>Google Chrome</strong> or
       <strong>Microsoft Edge</strong>.</p>
    <p>You are currently using a different browser. You may continue,
       but some features may not work as intended.</p>
    <p>For the best experience, please copy the link and open it in
       Chrome or Edge.</p>
  `,

  device_excluded: `
    <h2>Incompatible Device</h2>
    <p>This study requires a <strong>desktop or laptop computer</strong>
       with a mouse or trackpad.</p>
    <p>It cannot be completed on a tablet or smartphone.</p>
    <p>Thank you for your interest.</p>
  `,

  // {width} is replaced at runtime with the measured window.innerWidth value.
  warn_zoom: `
    <h2>Browser Zoom May Be Too Large</h2>
    <p>We have detected that your browser window is currently
       <strong>{width} px</strong> wide, which is narrower than the
       minimum we need (<strong>780 px</strong>). Part of the task
       may not display correctly.</p>
    <p>This is usually caused by the browser zoom level being set too high.
       To reduce it:</p>
    <ul>
      <li>Press <strong>Ctrl</strong> and <strong>&minus;</strong> (minus)
          on your keyboard — repeat until the page looks smaller.</li>
      <li>On a Mac, use <strong>Cmd &minus;</strong> instead.</li>
      <li>Or open the browser menu, find <strong>Zoom</strong>,
          and set it to <strong>100%</strong>.</li>
    </ul>
    <p>Click <strong>Continue</strong> when you are ready to proceed.</p>
  `,

  // {depth} is replaced at runtime with the measured window.screen.colorDepth value.
  warn_color_depth: `
    <h2>Display Colour Mode</h2>
    <p>Your display appears to be running in a reduced colour mode
       (<strong>{depth}-bit</strong>). This study uses subtle differences
       in brightness and colour that require a <strong>24-bit</strong>
       (True Colour) display to be shown correctly.</p>
    <p>If possible, please check your display settings and set the colour
       depth to <strong>24-bit</strong> or <strong>True Colour</strong>
       before continuing.</p>
    <p>If you are connecting via remote desktop software, please try to
       complete the study on a local computer instead.</p>
    <p>You may still continue if you cannot change this setting.
       Your data will be flagged for review.</p>
  `,

};

// =============================================================================
// JAPANESE (placeholder — translate from English block above)
// =============================================================================
_STRINGS.ja = {

  welcome: `
    <h2>ようこそ</h2>
    <p>本研究にご参加いただきありがとうございます。</p>
    <p>始める前に、以下の説明をよくお読みください。</p>
  `,

  // TODO: translate all remaining keys from _STRINGS.en
  // For now, fall back to English for untranslated keys (see bottom of file)

};

// =============================================================================
// SELECT ACTIVE LANGUAGE
// Falls back to English for any missing keys in the selected language.
// =============================================================================
var INSTRUCTIONS = (function () {
  var lang = (typeof CONFIG !== 'undefined' && CONFIG.experiment && CONFIG.experiment.language)
    ? CONFIG.experiment.language
    : 'en';

  var base = _STRINGS.en;
  var selected = _STRINGS[lang] || base;

  if (selected === base) return base;

  // Merge: use selected language, fall back to English for missing keys
  var merged = {};
  for (var key in base) {
    if (base.hasOwnProperty(key)) {
      merged[key] = (selected.hasOwnProperty(key) && selected[key] !== undefined)
        ? selected[key]
        : base[key];
    }
  }
  return merged;
})();
