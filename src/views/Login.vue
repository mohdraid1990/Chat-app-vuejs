<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Chat Simulator</h1>
      <p>Select a user to start chatting</p>
      
      <div class="user-list">
        <div 
          v-for="user in userStore.users" 
          :key="user.id" 
          class="user-item"
          @click="selectUser(user)"
          :style="{ '--user-color': user.color }"
        >
          <div class="user-avatar">
            {{ user.avatar }}
            <span v-if="getTotalUnreadForUser(user.id) > 0" class="user-badge">
              {{ getTotalUnreadForUser(user.id) }}
            </span>
          </div>
          <div class="user-name">{{ user.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useChatStore } from '../stores/chat';

const router = useRouter();
const userStore = useUserStore();
const chatStore = useChatStore();

// Load messages to get unread counts
chatStore.loadMessages();

// Get total unread messages for a specific user
function getTotalUnreadForUser(userId) {
  if (!chatStore.unreadMessages[userId]) return 0;
  
  let total = 0;
  Object.values(chatStore.unreadMessages[userId]).forEach(count => {
    total += count;
  });
  
  return total;
}

function selectUser(user) {
  userStore.setCurrentUser(user);
  router.push('/chat/0');
}
</script>