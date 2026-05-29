// =============================================================================
// src/variants/variant-registry.js
//
// Central manifest of all available task variants.
// Each entry references its variant module (loaded via a <script> tag).
//
// To add a new variant:
//   1. Create src/variants/my-variant.js exporting a module object.
//   2. Add a <script> tag for it in index.html and dev.html.
//   3. Add an entry here.
// =============================================================================

const VARIANT_REGISTRY = [

  {
    id:                 'calibration_only',
    label:              'Calibration battery only',
    description:        'Runs the full calibration battery and ends. ' +
                         'Use this to test timing, instructions, and screen checks.',
    estimated_minutes:  10,
    module:             CalibrationOnlyVariant,
  },

  {
    id:                 'original_ne',
    label:              'Original NE task',
    description:        'Replication of Todd et al. (2012) Experiment 1. ' +
                        'Colour IAPS images at three noise levels (35/45/55%). ' +
                        'Each image shown three times per noise level.',
    estimated_minutes:  45,
    module:             OriginalNEVariant,   // defined in original-ne.js
  },

  // Future variants — uncomment and add module reference when ready:
  //
  // {
  //   id:                 'sparse_noise',
  //   label:              'Sparse noise',
  //   description:        'Lower noise levels (10/15/20%), one repetition per image.',
  //   estimated_minutes:  25,
  //   module:             SparseNoiseVariant,
  // },
  //
  // {
  //   id:                 'grayscale',
  //   label:              'Grayscale replication',
  //   description:        'Sparse noise procedure with greyscale images.',
  //   estimated_minutes:  25,
  //   module:             GrayscaleVariant,
  // },
  //
  // {
  //   id:                 'single_exposure',
  //   label:              'Single exposure',
  //   description:        'Each image assigned one random noise level. No repetitions.',
  //   estimated_minutes:  15,
  //   module:             SingleExposureVariant,
  // },
  //
  // {
  //   id:                 'salience_control',
  //   label:              'Emotional salience control',
  //   description:        'Noise levels 10% and 20% only; salience rating replaces NE.',
  //   estimated_minutes:  20,
  //   module:             SalienceControlVariant,
  // },
  //
  // {
  //   id:                 'part2_dr',
  //   label:              'Part 2 — DR study',
  //   description:        'Single exposure NE + post-task perceptual ratings + CDS questionnaire.',
  //   estimated_minutes:  60,
  //   module:             Part2DRVariant,
  // },

];
