# Placement and Interaction

## Board

The game uses a square logical grid underneath an isometric 3D world.

The grid is mostly hidden until the player selects a tool.

## Buildings

Most demand buildings are authored into the level:
- homes
- café
- workshop
- factory
- station
- depot

The player does not build the town itself.

The player builds the **electrical infrastructure around the town**.

## Placeable infrastructure

MVP:
- LV lines
- MV lines
- transformer
- small substation
- solar
- battery

Later:
- wind
- hydro
- high-voltage transmission
- larger substations
- dispatchable generators
- nuclear
- CHP

## Asset placement

Select a tool, move it over the map, inspect a ghost preview, then confirm.

The preview should show the information relevant to that tool.

### Solar preview
- peak MW
- expected MWh/day
- exposure
- shade
- connection distance
- expected curtailment

### Transformer preview
- voltage conversion
- capacity
- connected buildings
- predicted peak loading

### Battery preview
- expected charge window
- expected discharge window
- effect on peak
- whether it is upstream or downstream of a bottleneck

## Line placement

Do not place every cable segment manually.

Instead:

1. select line tool,
2. click/drag from one compatible electrical port,
3. drag to another,
4. preview a snapped route,
5. adjust route around obstacles,
6. confirm.

The game can prefer roads and predefined corridors where appropriate.

## Context overlays

Selecting a tool reveals only the relevant layer.

### Solar
- exposure
- shade
- buildability

### Wind
- wind exposure
- prevailing direction
- wake effects

### Line
- compatible ports
- voltage tier
- route constraints
- predicted loading

### Battery
- local demand peaks
- network branches
- bottlenecks

Avoid showing all overlays simultaneously.
