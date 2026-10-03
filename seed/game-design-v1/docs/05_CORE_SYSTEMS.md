# Core Systems

## 1. Demand

Buildings use time-varying demand profiles.

Examples:

### Households
- overnight baseline
- morning bump
- lower daytime use
- evening peak

### Café / retail
- morning/daytime activity
- low nighttime use

### Workshop / office
- workday demand

### Light industry
- larger scheduled blocks
- one or two shifts

### Continuous load
- cold storage
- data-center-like building
- hospital-like infrastructure later

### Transport depot
Uses an energy-window objective:
- deliver X MWh before departure.

These are gameplay archetypes, not claims that every real building behaves identically.

## 2. Generation

### Solar
Variable by:
- time of day
- weather
- site quality
- shade
- orientation

### Wind
Later:
- wind speed
- direction
- exposure
- terrain
- turbine wake

### Hydro
Later:
- eligible water sites
- available flow
- head
- reservoir storage

### Dispatchable generation
Later:
- fuel / operating cost
- maximum output
- possible ramp/start constraints

## 3. Storage

Battery has:
- max charge MW
- max discharge MW
- capacity MWh
- state of charge
- efficiency

This creates two separate constraints:
- power limit
- energy limit

## 4. Voltage tiers

MVP:
- LV
- MV

Later:
- HV

A load or line must connect to a compatible voltage tier.

Transformers connect tiers.

## 5. Transformers

A transformer:
- changes voltage tier
- has finite capacity
- does not generate electricity

A level should explicitly demonstrate that adding more generation does not solve an undersized transformer.

## 6. Network capacity

Lines have finite MW capacity.

A generation-rich part of the map can still fail if the power cannot be transported to demand.

## 7. Curtailment

Renewable energy may be available but unusable.

Example:

Available solar: 3.0 MW  
Used: 2.1 MW  
Curtailed: 0.9 MW  
Reason: feeder capacity

This helps teach that generation and transmission are different problems.

## 8. Construction budget

Use abstract construction credits.

Purpose:
- discourage brute-force overbuilding,
- create tradeoffs.

Do not make the MVP an electricity-market simulator.
