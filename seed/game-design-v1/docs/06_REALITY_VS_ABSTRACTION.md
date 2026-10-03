# Reality vs Game Abstraction

This section defines the educational boundaries of the simulation.

The game should simplify reality while preserving correct cause-and-effect relationships.

## Supply and demand

### Reality
Electric grids must maintain close real-time balance between generation and demand. Frequency and stability are managed on timescales much faster than 15 minutes.

### Game
Balance is evaluated every 15 minutes.

### Omitted
- frequency dynamics
- inertia
- primary response
- transient stability
- detailed reserve activation

### Lesson preserved
Electricity must be available when needed.

---

## Power vs energy

### Reality
Power is a rate: MW.

Energy is power over time: MWh.

2 MW for 3 hours = 6 MWh.

### Game
Loads/generators use MW per timestep.
Storage tracks both MW and MWh.

### Lesson preserved
A battery can have enough stored energy but still be unable to supply a large peak.

---

## Voltage and transmission

### Reality
Higher voltage allows the same power to be transported with lower current.

Simplified:

P ≈ V × I

Resistive losses scale approximately with:

P_loss = I²R

### Game
Use explicit voltage tiers and direct MW line capacities.

### Omitted
- detailed AC equations
- three-phase effects
- exact line impedance
- thermal conductor modeling
- detailed voltage drop

### Lesson preserved
Large power transfers need appropriate network infrastructure.

---

## Transformers

### Reality
Transformers change AC voltage. Real substations also include switchgear, breakers, protection, controls, and more.

### Game
Transformer:
- converts one voltage tier to another
- has a capacity limit
- may have a simple efficiency value

### Omitted
- MVA vs MW distinction
- reactive power
- tap changer behavior
- detailed transformer thermal model

### Lesson preserved
Transformers are essential interfaces and can be bottlenecks.

---

## Radial network abstraction

### Reality
Meshed AC power systems do not route electricity like trucks. Power distributes across parallel paths according to network electrical properties and phase relationships.

### Game
MVP uses radial energized networks.

### Omitted
- loop flow
- AC load flow
- phase angles

### Lesson preserved
Connectivity and branch capacity remain understandable and spatial.

### Later
If loops become part of gameplay, consider DC power-flow approximation or a fuller AC solver.

---

## Solar and heavy industry

### Reality
Solar can supply heavy industrial electrical demand through appropriate inverter and grid infrastructure.

A factory may need MV/HV connection because its demand is large, not because solar produces a fundamentally incompatible type of electricity.

### Game
Generation type determines availability and operational characteristics.
Network infrastructure determines deliverability.

### Lesson preserved
The challenge is capacity, timing, and connection — not "solar is too weak."

---

## Solar PV

### Reality
Output depends on:
- irradiance
- location
- season
- time of day
- weather
- tilt/orientation
- shading
- temperature
- inverter/system limits

### Game
Simplified:

PV output = ratedMW × regionalProfile × weather × siteFactor

### Omitted
- detailed string design
- MPPT
- module mismatch
- inverter topology
- degradation

### Lesson preserved
Solar is variable and site-dependent.

---

## Wind

### Reality
Wind output depends strongly on wind speed and turbine design. Terrain, height, turbulence, obstacles, and turbine wakes matter.

### Game
Simplified:

output = ratedMW × simplifiedPowerCurve × exposure × wakeFactor

### Omitted
- CFD
- atmospheric boundary-layer simulation
- detailed turbulence

### Lesson preserved
Wind siting and spacing matter.

---

## Hydro

### Reality
Hydro depends on water flow and hydraulic head. Reservoir hydro can shift generation through time. Pumped hydro is storage.

### Game
Use authored viable sites.

Possible types:
- run-of-river
- reservoir
- pumped storage

### Omitted
- detailed hydrology
- flood control
- sediment
- irrigation competition

### Lesson preserved
Hydro is geography-dependent and some hydro is dispatchable.

---

## Batteries

### Reality
Batteries have:
- MW power rating
- MWh energy rating
- SOC
- efficiency
- degradation
- thermal limits
- chemistry-specific properties

### Game
Track:
- power
- energy
- SOC
- simple efficiency
- network location

### Omitted
- degradation
- chemistry
- detailed thermal management
- fast ancillary services

### Lesson preserved
Storage shifts energy through time and can relieve some network peaks.

---

## Demand profiles

### Reality
Demand depends on:
- occupancy
- appliances
- heating/cooling
- weather
- operating schedules
- industrial process
- EV charging
- random behavior

### Game
Each archetype has an authored deterministic load curve.

### Omitted
- appliance-level simulation
- household randomness

### Lesson preserved
Different consumers create different time patterns.

---

## Industry

### Reality
Industry can include:
- motors
- furnaces
- refrigeration
- pumps
- compressors
- electrolysis
- process heat

Not all industrial energy demand is electrical.

### Game
Model electrical demand unless a later system explicitly adds heat.

### Lesson preserved
Industry can have high, continuous, scheduled, or flexible electrical loads and may need higher-voltage infrastructure.

---

## Losses

### Reality
Lines and transformers lose energy.

### Game
Tutorial:
- no losses

Later:
- simple approximate losses

### Lesson preserved
Higher loading and longer networks can have costs without overwhelming the player.

---

## Reliability

### Reality
Real grids account for outages, maintenance, redundancy, switching, and contingency planning.

### Game
MVP ignores random failures.

Later:
- planned outage
- broken line
- maintenance
- alternate feeder

### Lesson preserved
Redundancy becomes meaningful once normal operation is understood.

---

## Frequency, reactive power, voltage regulation

### Reality
These are essential parts of AC power systems.

### Game
Not simulated in MVP.

Voltage tiers are compatibility/capacity abstractions, not full voltage physics.

---

## Environmental impacts

### Reality
Different generation systems differ in:
- greenhouse gases
- air pollution
- land use
- water use
- habitat
- materials
- waste
- visual/noise effects

### Game
Use a few explicit dimensions instead of one "green score".

Possible:
- operational emissions
- protected land
- water constraint
- fuel use

Do not claim this is a full lifecycle assessment.

---

## External grid

### Reality
A local village is normally connected to a much larger interconnected system.

### Game
The external network is represented as an upstream source with a finite import capacity.

This is a modeling boundary, not an infinite-energy claim.
