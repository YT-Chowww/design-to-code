const scenarios = [
  ['pc-data', 'PC 数据管理', 'references/pc-data.png', 'http://127.0.0.1:4173/data-management'],
  ['pc-chart', 'PC 图表分析', 'references/pc-chart.png', 'http://127.0.0.1:4173/chart-analytics'],
  ['mobile-content', '移动内容展示', 'references/mobile-content.png', 'http://127.0.0.1:4174/content-display'],
  ['mobile-form', '移动表单交互', 'references/mobile-form.png', 'http://127.0.0.1:4174/form-interaction'],
];

const tabs = document.querySelector('#scenario-tabs');
const view = document.querySelector('#scenario-view');

function errorMessage(message) {
  const error = document.createElement('p');
  error.className = 'load-error';
  error.setAttribute('role', 'alert');
  error.textContent = message;
  return error;
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
    viewport.append(errorMessage(`${label} 无法访问，请检查对应预览服务。`));
  }
}

function renderScenario(scenario) {
  const [id, label, referencePath, pageUrl] = scenario;
  view.replaceChildren();
  view.dataset.scenario = id;

  const reference = pane(`${label} · Figma`);
  const image = document.createElement('img');
  image.src = referencePath;
  image.alt = `${label} Figma 原稿`;
  image.addEventListener('error', () => {
    image.remove();
    reference.viewport.append(errorMessage(`${label} 的 Figma 图片不存在或无法读取。`));
  }, { once: true });
  reference.viewport.append(image);

  const implementation = pane(`${label} · 真实页面`);
  const frame = document.createElement('iframe');
  frame.src = pageUrl;
  frame.title = `${label} 真实页面`;
  frame.addEventListener('error', () => {
    frame.remove();
    implementation.viewport.append(errorMessage(`${label} 页面加载失败。`));
  }, { once: true });
  implementation.viewport.append(frame);
  void checkPage(pageUrl, implementation.viewport, frame, label);

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
  button.dataset.scenario = id;
  button.textContent = label;
  button.setAttribute('role', 'tab');
  button.addEventListener('click', () => renderScenario(scenario));
  tabs.append(button);
}

renderScenario(scenarios[0]);
