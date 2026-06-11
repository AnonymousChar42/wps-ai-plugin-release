import { createRouter, createWebHashHistory } from 'vue-router'
//import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history:  createWebHashHistory(''),
  routes: [
    {
      path: '/',
      name: '默认页',
      component: () => import('../components/Root.vue')
    },
    {
      path: '/dialog',
      name: '对话框',
      component: () => import('../components/Dialog.vue')
    },
    {
      path: '/taskpane',
      name: '任务窗格',
      component: () => import('../components/TaskPane.vue')
    },
    {
      path: '/aipane',
      name: 'AI助手',
      component: () => import('../components/AiPane.vue')
    },
    {
      path: '/agentpane',
      name: 'AI生成PPT',
      component: () => import('../components/AgentPane.vue')
    }
  ]
})

export default router
