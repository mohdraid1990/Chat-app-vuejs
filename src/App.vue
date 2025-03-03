<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useUserStore } from './stores/user';
import { useChatStore } from './stores/chat';

const userStore = useUserStore();
const chatStore = useChatStore();

onMounted(() => {
  // Initialize stores and listen for storage events
  userStore.initUsers();
  chatStore.loadMessages();
  
  window.addEventListener('storage', (event) => {
    if (event.key === 'chat-messages') {
      chatStore.loadMessages();
    }
  });
});
</script>