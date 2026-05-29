// =============================================================================
// src/dev-menu.js
// Developer Variant Selector Menu
//
// Shown BEFORE jsPsych.run() is called when CONFIG.dev_menu is true.
// Reads VARIANT_REGISTRY to list available variants.
// When the user clicks Launch, calls the provided callback with the
// selected variant id so main.js can build and run the timeline.
//
// This file is NEVER deployed to Pavlovia.
// It is excluded from the Pavlovia repository via .gitignore.
// =============================================================================

var DevMenu = (function () {

  // ---------------------------------------------------------------------------
  // show(onLaunch)
  //   Renders the menu directly in document.body.
  //   onLaunch(variantId) is called when the user confirms a selection.
  // ---------------------------------------------------------------------------
  function show(onLaunch) {

    // Inject menu CSS
    var style = document.createElement('style');
    style.textContent = [
      'body { margin:0; background:#f5f4f0; font-family:Georgia,serif; }',
      '.dm-wrap { max-width:760px; margin:0 auto; padding:40px 24px 60px; }',
      '.dm-header { border-bottom:1px solid #ccc; margin-bottom:32px; padding-bottom:16px; }',
      '.dm-header h1 { margin:0 0 6px; font-size:1.5rem; font-weight:500; color:#222; }',
      '.dm-header p  { margin:0; font-size:0.88rem; color:#888; }',
      '.dm-grid { display:flex; flex-direction:column; gap:14px; }',
      '.dm-card { background:#fff; border:1px solid #ddd; border-radius:8px; ' +
        'padding:20px 24px; display:flex; align-items:center; gap:20px; ' +
        'cursor:default; transition:border-color 0.15s; }',
      '.dm-card:hover { border-color:#888; }',
      '.dm-card.selected { border-color:#333; border-width:2px; }',
      '.dm-info { flex:1; }',
      '.dm-label { font-size:1rem; font-weight:500; color:#222; margin:0 0 4px; }',
      '.dm-desc  { font-size:0.85rem; color:#666; margin:0 0 6px; line-height:1.5; }',
      '.dm-time  { font-size:0.78rem; color:#aaa; margin:0; font-family:monospace; }',
      '.dm-btn   { padding:10px 22px; background:#333; color:#fff; border:none; ' +
        'border-radius:5px; font-size:0.9rem; cursor:pointer; white-space:nowrap; ' +
        'font-family:Georgia,serif; transition:background 0.15s; }',
      '.dm-btn:hover { background:#000; }',
      '.dm-footer { margin-top:32px; font-size:0.8rem; color:#aaa; ' +
        'border-top:1px solid #e8e8e8; padding-top:16px; }',
    ].join('\n');
    document.head.appendChild(style);

    // Build card HTML for each registered variant
    var cardsHtml = VARIANT_REGISTRY.map(function (v) {
      return (
        '<div class="dm-card" id="dm-card-' + v.id + '">' +
        '<div class="dm-info">' +
        '<p class="dm-label">' + v.label + '</p>' +
        '<p class="dm-desc">'  + v.description + '</p>' +
        '<p class="dm-time">\u2248 ' + v.estimated_minutes + ' min</p>' +
        '</div>' +
        '<button class="dm-btn" data-variant="' + v.id + '">Launch</button>' +
        '</div>'
      );
    }).join('');

    // Render menu
    var wrap = document.createElement('div');
    wrap.className = 'dm-wrap';
    wrap.innerHTML =
      '<div class="dm-header">' +
      '<h1>Internal testing menu</h1>' +
      '<p>Select a variant to launch. This menu is not shown to participants.</p>' +
      '</div>' +
      '<div class="dm-grid">' + cardsHtml + '</div>' +
      '<div class="dm-footer">' +
      'Platform: <strong>' + CONFIG.platform + '</strong> &nbsp;&middot;&nbsp; ' +
      'Build: <strong>' + (CONFIG.experiment ? CONFIG.experiment.version : '—') + '</strong>' +
      '</div>';

    document.body.innerHTML = '';
    document.body.appendChild(wrap);
    document.body.style.backgroundColor = '#f5f4f0';

    // Wire Launch buttons
    document.querySelectorAll('.dm-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var variantId = btn.getAttribute('data-variant');

        // Visual feedback — disable all buttons, update label
        document.querySelectorAll('.dm-btn').forEach(function (b) {
          b.disabled = true;
          b.style.opacity = '0.4';
        });
        btn.textContent = 'Starting\u2026';
        btn.style.opacity = '1';

        // Short pause so the user sees the feedback, then hand off
        setTimeout(function () {
          document.body.innerHTML = '';
          document.body.style.backgroundColor =
            (CONFIG.display && CONFIG.display.background_color)
              ? CONFIG.display.background_color
              : '#808080';
          onLaunch(variantId);
        }, 350);
      });
    });
  }

  return { show: show };

})();
