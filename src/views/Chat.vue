<template>
  <div class="chat-container">
    <!-- Sidebar with user list -->
    <div class="sidebar">
      <div class="current-user" :style="{ '--user-color': userStore.currentUser?.color }">
        <div class="user-avatar">{{ userStore.currentUser?.avatar }}</div>
        <div class="user-name">{{ userStore.currentUser?.name }}</div>
        <button class="logout-btn" @click="logout">
          <span class="icon">↩</span>
        </button>
      </div>
      
      <div class="contacts">
        <div 
          v-for="user in userStore.getOtherUsers()" 
          :key="user.id"
          class="contact-item"
          :class="{ active: selectedUserId === user.id }"
          @click="selectContact(user.id)"
          :style="{ '--user-color': user.color }"
        >
          <div class="contact-avatar">{{ user.avatar }}</div>
          <div class="contact-info">
            <div class="contact-name">
              {{ user.name }}
              <span v-if="chatStore.getUnreadCount(user.id) > 0" class="unread-badge">
                {{ chatStore.getUnreadCount(user.id) }}
              </span>
            </div>
            <div class="contact-preview" v-if="chatStore.getLastMessages[user.id]">
              {{ getMessagePreview(chatStore.getLastMessages[user.id]) }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Chat area -->
    <div class="chat-area">
      <template v-if="selectedUserId">
        <div class="chat-header" :style="{ '--user-color': selectedUser?.color }">
          <div class="user-avatar">{{ selectedUser?.avatar }}</div>
          <div class="user-name">{{ selectedUser?.name }}</div>
        </div>
        
        <div class="messages-container" ref="messagesContainer">
          <div 
            v-for="message in conversation" 
            :key="message.id"
            class="message"
            :class="{ 'outgoing': message.senderId === userStore.currentUser?.id }"
          >
            <div class="message-content" :class="message.type">
              <!-- Text message -->
              <template v-if="message.type === 'text' || !message.type">
                {{ message.content }}
              </template>
              
              <!-- Image message -->
              <template v-else-if="message.type === 'image'">
                <img :src="message.content" :alt="message.fileName || 'Image'" class="media-content" />
                <div class="file-name">{{ message.fileName }}</div>
              </template>
              
              <!-- Audio message -->
              <template v-else-if="message.type === 'audio'">
                <audio controls class="media-content">
                  <source :src="message.content" :type="message.fileType">
                  Your browser does not support the audio element.
                </audio>
                <div class="file-name">{{ message.fileName }}</div>
              </template>
              
              <!-- Document message -->
              <template v-else-if="message.type === 'document'">
                <div class="document-preview">
                  <span class="document-icon">📄</span>
                  <div class="document-info">
                    <div class="file-name">{{ message.fileName }}</div>
                    <div class="file-size">{{ formatFileSize(message.fileSize) }}</div>
                  </div>
                </div>
                <a :href="message.content" :download="message.fileName" class="download-btn">Download</a>
              </template>
            </div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
          
          <div v-if="conversation.length === 0" class="empty-chat">
            <p>No messages yet. Start the conversation!</p>
          </div>
        </div>
        
        <div class="message-input">
          <input 
            type="text" 
            v-model="newMessage" 
            placeholder="Type a message..." 
            @keyup.enter="sendTextMessage"
          />
          <div class="media-buttons">
            <button class="media-btn" title="Add Emoji" @click="toggleEmojiPicker">
              <span class="icon">😊</span>
            </button>
            <label class="media-btn" title="Send Image">
              <input type="file" accept="image/*" @change="handleImageUpload" />
              <span class="icon">🖼️</span>
            </label>
            <label class="media-btn" title="Send Audio">
              <input type="file" accept="audio/*" @change="handleAudioUpload" />
              <span class="icon">🎵</span>
            </label>
            <label class="media-btn" title="Send Document">
              <input type="file" @change="handleDocumentUpload" />
              <span class="icon">📎</span>
            </label>
          </div>
          <button @click="sendTextMessage" :disabled="!newMessage.trim()">
            <span class="icon">➤</span>
          </button>
        </div>
        
        <!-- Emoji Picker -->
        <div v-if="showEmojiPicker" class="emoji-picker-container">
          <emoji-picker @emoji-click="onEmojiSelect"></emoji-picker>
        </div>
      </template>
      
      <div v-else class="welcome-screen">
        <div class="welcome-content">
          <h2>Welcome, {{ userStore.currentUser?.name }}!</h2>
          <p>Select a contact to start chatting</p>
          <div v-if="chatStore.totalUnreadCount > 0" class="total-unread">
            <span class="unread-badge large">{{ chatStore.totalUnreadCount }}</span>
            <p>unread messages</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useChatStore } from '../stores/chat';

// Lazy load emoji picker to improve initial load time
const EmojiPicker = defineAsyncComponent(() => 
  import('emoji-picker-element').then(module => {
    return { default: module.Picker }
  })
);

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const chatStore = useChatStore();

const newMessage = ref('');
const messagesContainer = ref(null);
const isUploading = ref(false);
const showEmojiPicker = ref(false);

// If no user is selected, redirect to login
if (!userStore.currentUser) {
  router.push('/');
}

// Get the selected user ID from the route
const selectedUserId = computed(() => {
  return route.params.userId !== '0' ? Number(route.params.userId) : null;
});

// Get the selected user object
const selectedUser = computed(() => {
  return selectedUserId.value ? userStore.getUserById(selectedUserId.value) : null;
});

// Get conversation with selected user
const conversation = computed(() => {
  return selectedUserId.value ? chatStore.getConversation(selectedUserId.value) : [];
});

// Select a contact to chat with
function selectContact(userId) {
  router.push(`/chat/${userId}`);
}

// Toggle emoji picker
function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value;
}

// Handle emoji selection
function onEmojiSelect(event) {
  newMessage.value += event.detail.unicode;
  showEmojiPicker.value = false;
}

// Send a text message
function sendTextMessage() {
  if (newMessage.value.trim() && selectedUserId.value) {
    chatStore.sendMessage(newMessage.value, selectedUserId.value);
    newMessage.value = '';
    
    // Scroll to bottom after message is sent
    nextTick(() => {
      scrollToBottom();
    });
  }
}

// Handle image upload
async function handleImageUpload(event) {
  if (!event.target.files.length || isUploading.value) return;
  
  const file = event.target.files[0];
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file');
    return;
  }
  
  try {
    isUploading.value = true;
    await chatStore.sendMediaMessage(file, selectedUserId.value, 'image');
    event.target.value = ''; // Reset file input
    
    // Scroll to bottom after message is sent
    nextTick(() => {
      scrollToBottom();
    });
  } catch (error) {
    console.error('Failed to upload image:', error);
    alert('Failed to upload image. Please try again.');
  } finally {
    isUploading.value = false;
  }
}

// Handle audio upload
async function handleAudioUpload(event) {
  if (!event.target.files.length || isUploading.value) return;
  
  const file = event.target.files[0];
  if (!file.type.startsWith('audio/')) {
    alert('Please select a valid audio file');
    return;
  }
  
  try {
    isUploading.value = true;
    await chatStore.sendMediaMessage(file, selectedUserId.value, 'audio');
    event.target.value = ''; // Reset file input
    
    // Scroll to bottom after message is sent
    nextTick(() => {
      scrollToBottom();
    });
  } catch (error) {
    console.error('Failed to upload audio:', error);
    alert('Failed to upload audio. Please try again.');
  } finally {
    isUploading.value = false;
  }
}

// Handle document upload
async function handleDocumentUpload(event) {
  if (!event.target.files.length || isUploading.value) return;
  
  const file = event.target.files[0];
  // Check file size (limit to 5MB for localStorage)
  if (file.size > 5 * 1024 * 1024) {
    alert('File size exceeds 5MB limit. Please select a smaller file.');
    return;
  }
  
  try {
    isUploading.value = true;
    await chatStore.sendMediaMessage(file, selectedUserId.value, 'document');
    event.target.value = ''; // Reset file input
    
    // Scroll to bottom after message is sent
    nextTick(() => {
      scrollToBottom();
    });
  } catch (error) {
    console.error('Failed to upload document:', error);
    alert('Failed to upload document. Please try again.');
  } finally {
    isUploading.value = false;
  }
}

// Format timestamp to readable time
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

// Get preview of message for contact list
function getMessagePreview(message) {
  const isOutgoing = message.senderId === userStore.currentUser?.id;
  const prefix = isOutgoing ? 'You: ' : '';
  
  let content = '';
  
  if (message.type === 'text' || !message.type) {
    content = message.content.length > 20 
      ? message.content.substring(0, 20) + '...' 
      : message.content;
  } else if (message.type === 'image') {
    content = '🖼️ Image';
  } else if (message.type === 'audio') {
    content = '🎵 Audio';
  } else if (message.type === 'document') {
    content = '📎 Document';
  }
  
  return prefix + content;
}

// Logout function
function logout() {
  localStorage.removeItem('current-user');
  router.push('/');
}

// Scroll to bottom of messages
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

// Handle new message event from other tabs
function handleNewMessage(event) {
  chatStore.loadMessages();
}

// Close emoji picker when clicking outside
function handleClickOutside(event) {
  const emojiPicker = document.querySelector('.emoji-picker-container');
  if (showEmojiPicker.value && emojiPicker && !emojiPicker.contains(event.target) && 
      !event.target.closest('.media-btn')) {
    showEmojiPicker.value = false;
  }
}

// Mark messages as read when conversation is opened
watch(selectedUserId, (newId) => {
  if (newId) {
    chatStore.markAsRead(newId);
  }
});

// Watch for changes in conversation and scroll to bottom
watch(conversation, () => {
  nextTick(() => {
    scrollToBottom();
  });
});

// Scroll to bottom when component is mounted
onMounted(() => {
  scrollToBottom();
  
  // Mark messages as read when conversation is opened
  if (selectedUserId.value) {
    chatStore.markAsRead(selectedUserId.value);
  }
  
  // Listen for new message events from other tabs
  window.addEventListener('new-message', handleNewMessage);
  window.addEventListener('storage', handleNewMessage);
  
  // Listen for clicks to close emoji picker
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('new-message', handleNewMessage);
  window.removeEventListener('storage', handleNewMessage);
  document.removeEventListener('click', handleClickOutside);
});
</script>