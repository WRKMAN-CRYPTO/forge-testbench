# Eye 010: The Chromatic Witness

Observation-only follow-up to Eye 009. Each 32×32 RGB frame contributes 10% of each channel's intensity to independent additive ten-frame accumulators: full RGB, luminance grayscale (Rec. 709 coefficients), red, green and blue. All reset together every ten frames. The archive stores up to 24 batches, with all five views. Export includes archived pixel arrays and partial working memories. No learner, reward, or target extraction.

Scenes: stationary red and green shapes with approximately equal luminance (255 red vs 130 green); stationary shape changing from red to green each ten frames; moving colored dots; colored flashes; mixed. Equal luminance is approximate due to 8-bit channel quantization. A color-channel image is rendered in its channel's hue. The five archived views are synchronized but not independent sensory inputs: all are derived from the same RGB frames. A ten-frame sum loses within-batch temporal ordering.
