import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/rename'
  },
  {
    path: '/rename',
    name: 'Rename',
    component: () => import('@/views/RenameView.vue'),
    meta: { title: 'Batch Rename', icon: 'EditPen' }
  },
  {
    path: '/format',
    name: 'Format',
    component: () => import('@/views/FormatView.vue'),
    meta: { title: 'Format Convert', icon: 'Switch' }
  },
  {
    path: '/compress',
    name: 'Compress',
    component: () => import('@/views/CompressView.vue'),
    meta: { title: 'Image Compress', icon: 'PictureFilled' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'Settings', icon: 'Setting' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
