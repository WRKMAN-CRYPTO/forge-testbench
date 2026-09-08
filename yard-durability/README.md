# Yard Durability

Mobile-first landscaping maintenance app built under the hybrid FORGE-CONTEXT model.

## Core model
- Each task stores `lastDone` and `intervalHours`.
- Current durability is derived from elapsed time; no background timer is required for correctness.
- Completing a task sets `lastDone` to now and immediately recalculates the area.
- Areas use `72% weighted task average + 28% worst-task score`, so one neglected job cannot disappear inside several healthy ones.
- Task importance is adjustable (`Light`, `Normal`, `Important`) and affects the weighted-average portion.

## Interaction choices
- One persistent screen.
- Lowest-durability task is surfaced as the next thing needing attention.
- Direct tap tops off a task.
- Top-off has an Undo window for accidental taps.
- Add/manage controls live in bottom sheets rather than separate pages.
- Durable state is stored locally in the browser.

## FORGE weight interactions
Strongest pressures for this build: user intent preservation, reliability, recoverability, mobile operability, simplicity.

Meaningful secondary pressure: experimentation and visual personality. This produced the "next thing poking up" surface and small top-off burst without turning the app into a game or adding scheduling machinery.

## Edge cases considered
- A low task should influence an area's condition more than a plain average would allow.
- Changing a maintenance interval should recalculate current durability from the existing completion timestamp.
- Empty areas are allowed so the user can build the property incrementally.
- Destructive deletes require confirmation.
- Durability is clamped between 0 and 100, including clock anomalies that place `lastDone` slightly in the future.

## Test target
Primary target is a touch-first mobile browser. Verify top-off, Undo, add task, add area, tune interval, persistence across reload, deletion confirmation, and return-from-background recalculation.
