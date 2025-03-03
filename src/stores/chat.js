import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useUserStore } from './user';

export const useChatStore = defineStore('chat', () => {
  const messages = ref([]);
  const unreadMessages = ref({});
  const userStore = useUserStore();
  
  // Load messages from localStorage
  function loadMessages() {
    const savedMessages = localStorage.getItem('chat-messages');
    if (savedMessages) {
      try {
        messages.value = JSON.parse(savedMessages);
      } catch (error) {
        console.error('Error parsing messages from localStorage:', error);
        messages.value = [];
        // Reset localStorage if corrupted
        localStorage.setItem('chat-messages', JSON.stringify([]));
      }
    }
    
    // Load unread messages
    const savedUnread = localStorage.getItem('unread-messages');
    if (savedUnread) {
      try {
        unreadMessages.value = JSON.parse(savedUnread);
      } catch (error) {
        console.error('Error parsing unread messages from localStorage:', error);
        unreadMessages.value = {};
        // Reset localStorage if corrupted
        localStorage.setItem('unread-messages', JSON.stringify({}));
      }
    }
  }
  
  // Save messages to localStorage
  function saveMessages() {
    try {
      localStorage.setItem('chat-messages', JSON.stringify(messages.value));
      localStorage.setItem('unread-messages', JSON.stringify(unreadMessages.value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      
      // If we hit storage limits, try to clean up old messages
      if (error.name === 'QuotaExceededError') {
        cleanupOldMessages();
        try {
          localStorage.setItem('chat-messages', JSON.stringify(messages.value));
          localStorage.setItem('unread-messages', JSON.stringify(unreadMessages.value));
        } catch (retryError) {
          console.error('Still unable to save after cleanup:', retryError);
        }
      }
    }
  }
  
  // Clean up old messages if localStorage is full
  function cleanupOldMessages() {
    // Sort messages by timestamp (oldest first)
    const sortedMessages = [...messages.value].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Remove oldest 20% of messages
    const removeCount = Math.ceil(sortedMessages.length * 0.2);
    const messagesToKeep = sortedMessages.slice(removeCount);
    
    messages.value = messagesToKeep;
    console.log(`Removed ${removeCount} old messages to free up storage space`);
  }
  
  // Send a new text message
  function sendMessage(content, receiverId) {
    if (!userStore.currentUser || !content.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      senderId: userStore.currentUser.id,
      receiverId: Number(receiverId),
      content,
      type: 'text',
      timestamp: new Date().toISOString()
    };
    
    messages.value.push(newMessage);
    
    // Add to unread messages for receiver
    if (!unreadMessages.value[receiverId]) {
      unreadMessages.value[receiverId] = {};
    }
    
    if (!unreadMessages.value[receiverId][userStore.currentUser.id]) {
      unreadMessages.value[receiverId][userStore.currentUser.id] = 0;
    }
    
    unreadMessages.value[receiverId][userStore.currentUser.id]++;
    
    saveMessages();
    
    // Dispatch a custom event to notify other tabs
    window.dispatchEvent(new CustomEvent('new-message', { 
      detail: { 
        senderId: userStore.currentUser.id,
        receiverId: Number(receiverId)
      }
    }));
    
    return newMessage;
  }
  
  // Send a media message (image, audio, document)
  function sendMediaMessage(file, receiverId, type) {
    if (!userStore.currentUser || !file) return;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const fileData = e.target.result;
        
        const newMessage = {
          id: Date.now(),
          senderId: userStore.currentUser.id,
          receiverId: Number(receiverId),
          content: fileData,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          type: type, // 'image', 'audio', 'document'
          timestamp: new Date().toISOString()
        };
        
        messages.value.push(newMessage);
        
        // Add to unread messages for receiver
        if (!unreadMessages.value[receiverId]) {
          unreadMessages.value[receiverId] = {};
        }
        
        if (!unreadMessages.value[receiverId][userStore.currentUser.id]) {
          unreadMessages.value[receiverId][userStore.currentUser.id] = 0;
        }
        
        unreadMessages.value[receiverId][userStore.currentUser.id]++;
        
        saveMessages();
        
        // Dispatch a custom event to notify other tabs
        window.dispatchEvent(new CustomEvent('new-message', { 
          detail: { 
            senderId: userStore.currentUser.id,
            receiverId: Number(receiverId)
          }
        }));
        
        resolve(newMessage);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  // Mark messages as read
  function markAsRead(senderId) {
    if (!userStore.currentUser) return;
    
    const currentUserId = userStore.currentUser.id;
    
    if (unreadMessages.value[currentUserId] && 
        unreadMessages.value[currentUserId][senderId]) {
      unreadMessages.value[currentUserId][senderId] = 0;
      saveMessages();
    }
  }
  
  // Get unread count for a specific sender
  function getUnreadCount(senderId) {
    if (!userStore.currentUser) return 0;
    
    const currentUserId = userStore.currentUser.id;
    
    if (unreadMessages.value[currentUserId] && 
        unreadMessages.value[currentUserId][senderId]) {
      return unreadMessages.value[currentUserId][senderId];
    }
    
    return 0;
  }
  
  // Get total unread count
  const totalUnreadCount = computed(() => {
    if (!userStore.currentUser) return 0;
    
    const currentUserId = userStore.currentUser.id;
    let total = 0;
    
    if (unreadMessages.value[currentUserId]) {
      Object.values(unreadMessages.value[currentUserId]).forEach(count => {
        total += count;
      });
    }
    
    return total;
  });
  
  // Get messages between current user and another user
  const getConversation = computed(() => {
    return (userId) => {
      if (!userStore.currentUser) return [];
      
      return messages.value.filter(msg => 
        (msg.senderId === userStore.currentUser.id && msg.receiverId === Number(userId)) ||
        (msg.receiverId === userStore.currentUser.id && msg.senderId === Number(userId))
      ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    };
  });
  
  // Get last message for each conversation
  const getLastMessages = computed(() => {
    if (!userStore.currentUser) return {};
    
    const lastMsgs = {};
    const currentUserId = userStore.currentUser.id;
    
    userStore.getOtherUsers().forEach(user => {
      const conversation = messages.value.filter(msg => 
        (msg.senderId === currentUserId && msg.receiverId === user.id) ||
        (msg.receiverId === currentUserId && msg.senderId === user.id)
      ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      if (conversation.length > 0) {
        lastMsgs[user.id] = conversation[0];
      }
    });
    
    return lastMsgs;
  });
  
  return {
    messages,
    unreadMessages,
    loadMessages,
    sendMessage,
    sendMediaMessage,
    markAsRead,
    getUnreadCount,
    totalUnreadCount,
    getConversation,
    getLastMessages
  };
});