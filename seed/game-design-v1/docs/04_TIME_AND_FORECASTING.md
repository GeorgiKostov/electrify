# Time, Demand, and Forecasting

## Internal timestep

15 minutes.

24 hours = 96 simulation steps.

Why:
- enough detail for daily peaks,
- easy deterministic simulation,
- suitable for battery energy accounting,
- readable to players,
- simple for authored puzzles.

## Visual time

The visual world interpolates smoothly between timesteps.

The player does not see the world jump every 15 minutes.

## Timeline

The bottom UI should show:
- current time
- sunrise/sunset
- demand
- renewable generation
- battery state
- weather
- warning markers

Dragging the time cursor previews the future state of the world.

At 19:00:
- houses may be lit,
- workshop may be closed,
- solar may be nearly zero,
- battery may be discharging,
- heavily loaded lines may highlight.

## Scenario durations

Early:
- 24 hours

Later:
- 48 hours
- 3 days
- representative week

Long scenarios should accelerate automatically during uneventful periods.

## Deterministic first

Early gameplay uses authored deterministic forecasts.

Later advanced scenarios can introduce:
- forecast uncertainty,
- reserve margin,
- unexpected cloud/wind events.

Do not introduce uncertainty until players understand the deterministic system.
