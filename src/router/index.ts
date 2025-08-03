import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '@/components/LoginPage.vue'
import WebRTCViewer from '@/components/WebRTCViewer.vue'
import { isAuthenticated } from '../../composables/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'Login',
      component: LoginPage
    },
    {
      path: '/viewer',
      name: 'WebRTCViewer',
      component: WebRTCViewer,
      beforeEnter: async (to, from, next) => {
        const isAuthed = await isAuthenticated()
        if (!isAuthed) {
          return next('/login')
        }
        return next()
      }
    }
  ]
})

export default router
