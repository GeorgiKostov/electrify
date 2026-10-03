import './ui/style.css';
import { copy } from './content/copy/en';
import { loadSave, hasCampaign } from './game/save';
import { createSession } from './game/session';
import { createController } from './game/controller';
import { World } from './render/scene';
import { witnesses } from './content/witnesses';
import { simulate } from './sim/simulate';
import { stageFocus } from './game/levels';
const app = document.getElementById('app')!;
app.innerHTML = `<canvas id="world" aria-label="${copy.title}" role="img" tabindex="0"></canvas><nav id="left-head" class="hud" aria-label="${copy.menu}"></nav><div id="right-head" class="hud"></div><header id="goal" class="hud"></header><div id="coins" class="hud glass"></div><nav id="camera-buttons" class="hud" aria-label="${copy.fitView}"></nav><div id="labels"></div><div id="map-feedback" class="map-feedback glass" hidden></div><div id="line-confirm" class="local-confirm" hidden></div><div id="map-context"><section id="placement" hidden></section><section id="inspector" hidden></section></div><div id="bottom-area"><section id="timeline"></section><div id="tray-wrap"><button id="undo-button" class="icon-btn tray-undo" data-action="undo" aria-label="${copy.undo}"></button><nav id="tray" aria-label="${copy.tool}"></nav></div></div><section id="menu" class="hud glass" hidden></section><div id="coach" class="coach glass" hidden></div><p id="save-status" role="status" hidden></p><dialog id="overlay" aria-labelledby="menu-title"></dialog>`;
const el = (id: string) => document.getElementById(id)!;
const canvas = el('world') as HTMLCanvasElement,
  world = new World(canvas),
  session = createSession(loadSave(), hasCampaign());
const controller = createController(session, {
  app,
  canvas,
  world,
  dialog: el('overlay') as HTMLDialogElement,
  el,
});
const observer = new ResizeObserver(controller.measureLayout);
for (const id of ['bottom-area', 'goal', 'camera-buttons', 'map-context'])
  observer.observe(el(id));
world.onViewChange = () => {
  controller.labels();
  controller.updateLineConfirm();
};
controller.refresh();
requestAnimationFrame(() => {
  const layouts = witnesses();
  for (let stage = 1; stage <= 6; stage++)
    session.covers.set(
      stage,
      world.cover(
        layouts[stage - 1],
        simulate(layouts[stage - 1]),
        stageFocus[stage - 1],
      ),
    );
  for (const image of Array.from(
    el('overlay').querySelectorAll<HTMLImageElement>('[data-cover]'),
  )) {
    image.onload = () => image.classList.add('cover-ready');
    image.src = session.covers.get(Number(image.dataset.cover))!;
    image.hidden = false;
  }
  controller.refreshWorld();
});
