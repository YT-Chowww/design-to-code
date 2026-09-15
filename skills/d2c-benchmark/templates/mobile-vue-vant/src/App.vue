<script setup lang="ts">
import { defineAsyncComponent, defineComponent, h, type Component } from "vue";

type ScenarioModule = {
  default: Component;
};

type RouteDefinition = {
  label: string;
  modulePath: string;
};

const scenarioModules = import.meta.glob<ScenarioModule>("./scenarios/*.vue");

const routes: Record<string, RouteDefinition> = {
  "/content-display": {
    label: "移动内容展示",
    modulePath: "./scenarios/ContentDisplay.vue",
  },
  "/form-interaction": {
    label: "移动表单交互",
    modulePath: "./scenarios/FormInteraction.vue",
  },
};

const path = window.location.pathname.replace(/\/+$/u, "") || "/";
const route = routes[path];
const sceneLoader = route ? scenarioModules[route.modulePath] : undefined;
const AsyncFailurePanel = defineComponent({
  name: "AsyncFailurePanel",
  setup() {
    return () =>
      h("section", { class: "benchmark-failure", role: "alert" }, [
        h("h1", "场景加载失败"),
        h("p", "生成的场景模块无法加载，请查看构建输出。"),
      ]);
  },
});
const Scene = sceneLoader
  ? defineAsyncComponent({
      loader: async () => (await sceneLoader()).default,
      errorComponent: AsyncFailurePanel,
      delay: 0,
    })
  : null;
</script>

<template>
  <main class="benchmark-device">
    <component :is="Scene" v-if="Scene" />
    <section v-else class="benchmark-failure" role="alert">
      <h1>场景暂不可用</h1>
      <p v-if="route">{{ route.label }} 尚未生成。</p>
      <p v-else>未配置该基准场景。</p>
      <p class="benchmark-failure__path">路由：{{ path }}</p>
    </section>
  </main>
</template>
