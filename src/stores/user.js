import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const users = ref([
    { id: 1, name: 'Alice', avatar: '👩‍💼', color: '#4e54c8' },
    { id: 2, name: 'Bob', avatar: '👨‍💻', color: '#00b894' },
    { id: 3, name: 'Charlie', avatar: '🧑‍🎨', color: '#e17055' },
    { id: 4, name: 'Diana', avatar: '👩‍🔬', color: '#6c5ce7' },
    { id: 5, name: 'Evan', avatar: '👨‍🚀', color: '#fdcb6e' }
  ]);
  
  const currentUser = ref(null);
  
  function setCurrentUser(user) {
    currentUser.value = user;
    localStorage.setItem('current-user', JSON.stringify(user));
  }
  
  function initUsers() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('current-user');
    if (savedUser) {
      currentUser.value = JSON.parse(savedUser);
    }
  }
  
  function getOtherUsers() {
    if (!currentUser.value) return users.value;
    return users.value.filter(user => user.id !== currentUser.value.id);
  }
  
  function getUserById(id) {
    return users.value.find(user => user.id === Number(id));
  }
  
  return {
    users,
    currentUser,
    setCurrentUser,
    initUsers,
    getOtherUsers,
    getUserById
  };
});