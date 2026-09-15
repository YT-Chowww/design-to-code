import type { ReactElement } from "react";
import { Alert, Space, Typography } from "antd";

export type BenchmarkScene = () => ReactElement;

type ScenarioModule = {
  default: BenchmarkScene;
};

type RouteDefinition = {
  label: string;
  modulePath: string;
};

const scenarioModules = import.meta.glob<ScenarioModule>("./scenarios/*.tsx", {
  eager: true,
});

const routes: Record<string, RouteDefinition> = {
  "/data-management": {
    label: "PC 数据管理",
    modulePath: "./scenarios/DataManagement.tsx",
  },
  "/chart-analytics": {
    label: "PC 图表分析",
    modulePath: "./scenarios/ChartAnalytics.tsx",
  },
};

function FailurePanel({ path, message }: { path: string; message: string }) {
  return (
    <main className="benchmark-fallback">
      <Space direction="vertical" size="middle">
        <Typography.Title level={2}>场景暂不可用</Typography.Title>
        <Alert
          type="error"
          showIcon
          message={message}
          description={`路由：${path}`}
        />
      </Space>
    </main>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/u, "") || "/";
  const route = routes[path];
  let benchmarkRoute = "fallback";
  if (path === "/data-management") {
    benchmarkRoute = "data-management";
  } else if (path === "/chart-analytics") {
    benchmarkRoute = "chart-analytics";
  }
  document.documentElement.dataset.benchmarkRoute = benchmarkRoute;

  if (!route) {
    return <FailurePanel path={path} message="未配置该基准场景" />;
  }

  const Scene = scenarioModules[route.modulePath]?.default;
  if (!Scene) {
    return <FailurePanel path={path} message={`${route.label} 尚未生成`} />;
  }

  return <Scene />;
}
