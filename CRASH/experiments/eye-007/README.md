# Eye 007: Break the Clock

Preserves Eye 006. Each trial presents eight 32×32 RGB frames with two points at random positions in opposite halves. They appear at distinct randomized times and persist. Modes: Eye 006's fixed early/late schedule; arbitrary onsets with variable gap; both late; adjacent events. Independent brightness or deliberately dimmer first point.

Import the Eye 006 JSON to freeze its seven raw-change feature weights as a transfer baseline. A new learner receives seven *binary signed change-presence* features, computed by a supplied frame-difference detector from the complete frames. This normalizes away brightness magnitude and may make ordering learnable without fixed early/late windows. Both learners make stochastic logistic choices; only the new learner receives online feedback during training. Neither sees event times, locations, or ground truth as prediction features.

Suggested procedure: import Eye 006; evaluate fixed schedule and random schedule before training; train 10,000 in random schedule; evaluate random, late, and adjacent schedules without training between evaluations. Export each result. The detector, temporal buffer, binary normalization and left/right grouping are fixed equipment, not learned. Successful transfer would support use of ordered changes, not independently learned object tracking or time.
