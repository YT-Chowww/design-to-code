const scenarios = [
  ['pc-data', 'PC 数据管理', 'references/pc-data.png', 'http://127.0.0.1:4173/data-management', 'pc', 1400],
  ['pc-chart', 'PC 图表分析', 'references/pc-chart.png', 'http://127.0.0.1:4173/chart-analytics', 'pc', 500],
  ['mobile-content', '移动内容展示', 'references/mobile-content.png', 'http://127.0.0.1:4174/content-display', 'mobile', 375],
  ['mobile-form', '移动表单交互', 'references/mobile-form.png', 'http://127.0.0.1:4174/form-interaction', 'mobile', 375],
];

const tabs = document.querySelector('#scenario-tabs');
const view = document.querySelector('#scenario-view');
let activeScenario = scenarios[0];
tabs.setAttribute('role', 'tablist');
view.setAttribute('role', 'tabpanel');

function errorMessage(message) {
  const error = document.createElement('p');
  error.className = 'load-error';
  error.setAttribute('role', 'alert');
  error.textContent = message;
  return error;
}

async function readAvailability() {
  try {
    const response = await fetch('availability.json', { cache: 'no-store' });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

function pane(title) {
  const section = document.createElement('section');
  section.className = 'pane';
  const heading = document.createElement('h2');
  heading.className = 'pane__title';
  heading.textContent = title;
  const viewport = document.createElement('div');
  viewport.className = 'pane__viewport';
  section.append(heading, viewport);
  return { section, viewport };
}

async function checkPage(url, viewport, frame, label) {
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store' });
  } catch {
    frame.remove();
    viewport.dataset.pageState = 'connection-error';
    viewport.append(errorMessage(`${label} 无法访问，请检查对应预览服务。`));
  }
}

function showApplicationError(viewport, label, reason, state = 'unavailable') {
  const nextState = `${state}:${reason}`;
  if (viewport.dataset.pageState === nextState) return;
  viewport.dataset.pageState = nextState;
  viewport.replaceChildren(errorMessage(`${label} 无法预览：${reason}`));
}

function renderApplication(viewport, pageUrl, label, pixelWidth) {
  const frame = document.createElement('iframe');
  frame.src = pageUrl;
  frame.title = `${label} 真实页面`;
  frame.style.width = pixelWidth;
  frame.addEventListener('error', () => {
    showApplicationError(viewport, label, '页面加载失败。', 'connection-error');
  }, { once: true });
  viewport.dataset.pageState = 'iframe';
  viewport.replaceChildren();
  viewport.append(frame);
  void checkPage(pageUrl, viewport, frame, label);
}

async function reconcileApplication(viewport, scenario) {
  const [id, label, , pageUrl, application, width] = scenario;
  const availability = await readAvailability();
  if (view.dataset.scenario !== id) return;
  const evidence = availability?.[application];
  const frame = viewport.querySelector('iframe');
  if (evidence && !evidence.available) {
    showApplicationError(viewport, label, evidence.reason || '对应应用不可用。');
  } else if (!frame && viewport.dataset.pageState !== 'connection-error') {
    const pixelWidth = Number.isInteger(width) && width > 0 ? `${width}px` : '375px';
    renderApplication(viewport, pageUrl, label, pixelWidth);
  }
}

function renderScenario(scenario) {
  const [id, label, referencePath, pageUrl, application, width] = scenario;
  const pixelWidth = Number.isInteger(width) && width > 0 ? `${width}px` : '375px';
  view.replaceChildren();
  activeScenario = scenario;
  view.dataset.scenario = id;
  view.setAttribute('aria-labelledby', `scenario-tab-${id}`);

  const reference = pane(`${label} · Figma`);
  const image = document.createElement('img');
  image.src = referencePath;
  image.alt = `${label} Figma 原稿`;
  image.style.width = pixelWidth;
  image.addEventListener('error', () => {
    image.remove();
    reference.viewport.append(errorMessage(`${label} 的 Figma 图片不存在或无法读取。`));
  }, { once: true });
  reference.viewport.append(image);

  const implementation = pane(`${label} · 真实页面`);
  implementation.viewport.dataset.application = application;
  void reconcileApplication(implementation.viewport, scenario);

  view.append(reference.section, implementation.section);
  for (const button of tabs.querySelectorAll('button')) {
    button.setAttribute('aria-selected', String(button.dataset.scenario === id));
  }
}

for (const scenario of scenarios) {
  const [id, label] = scenario;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scenario-tab';
  button.id = `scenario-tab-${id}`;
  button.dataset.scenario = id;
  button.textContent = label;
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-controls', 'scenario-view');
  button.addEventListener('click', () => renderScenario(scenario));
  tabs.append(button);
}

renderScenario(scenarios[0]);

setInterval(async () => {
  const viewport = view.querySelector('[data-application]');
  if (!viewport) return;
  await reconcileApplication(viewport, activeScenario);
}, 500);
