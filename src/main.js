import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/styles/main.scss'

// Routes
import Login from './views/Login.vue'
import Chat from './views/Chat.vue'

const routes = [
  { path: '/', component: Login },
  { path: '/chat/:userId', component: Chat, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Configure localStorage error handling
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  try {
    originalSetItem.call(this, key, value);
  } catch (e) {
    console.error('localStorage error:', e);
    
    // If quota exceeded, try to clear some space
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, attempting to free space');
      
      // Try to remove old items
      const keysToPreserve = ['current-user'];
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!keysToPreserve.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove oldest items first (we'll just remove half of them)
      const removeCount = Math.ceil(keysToRemove.length / 2);
      for (let i = 0; i < removeCount; i++) {
        localStorage.removeItem(keysToRemove[i]);
      }
      
      // Try again
      try {
        originalSetItem.call(this, key, value);
      } catch (retryError) {
        console.error('Still unable to save to localStorage after cleanup:', retryError);
      }
    }
  }
};

const pinia = createPinia()
const app = createApp(App)

app.use(router)
app.use(pinia)
app.mount('#app')