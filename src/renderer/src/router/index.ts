import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/workspace",
  },
  {
    path: "/workspace",
    name: "Workspace",
    component: () => import("@/views/WorkspaceView.vue"),
    meta: { title: "Workspace" },
  },
  {
    path: "/format",
    name: "Format",
    component: () => import("@/views/FormatView.vue"),
    meta: { title: "Format Convert" },
  },
  {
    path: "/settings",
    name: "Settings",
    component: () => import("@/views/SettingsView.vue"),
    meta: { title: "Settings" },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
