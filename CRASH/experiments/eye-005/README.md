# Eye 005: Temporal Witness

Two online logistic learners see identical trials but receive different sensory inputs. The sequence learner gets eight ordered two-point brightness observations, while the snapshot learner gets only the final two-point brightness observation. Both receive one correctness bit during training. No onset labels, ages, or correct answers are provided to predict(). Ground truth stays in the laboratory.

Two points appear at distinct steps (one at frame 2–4 and one at frame 5–7), and persist. Each is given an independently randomized brightness. Challenge mode makes the older point systematically dimmer than the newer one. Mixed mode randomizes brightness normally. Frames are 32×32 RGB, and the learners sample only two fixed pixel coordinates; the positions are supplied by the experiment rather than discovered autonomously.

Evaluate 1,000 before training. Train 10,000 on Mixed, then evaluate in Mixed and Challenge without additional training. Export results for comparison. Unlike Eye 004, this lab provides the full ordered series, making onset evidence observable. It does **not** establish that Crash independently learned to build temporal memory, object tracking, or abstract time.
