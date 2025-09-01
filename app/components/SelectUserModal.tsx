import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface SelectUserModalProps {
  visible: boolean;
  onClose: () => void;
  selectedUsers: User[];
  onSelectUser: (user: User) => void;
  users: User[];
  title?: string;
}

const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

const SelectUserModal = React.memo(({
  visible,
  onClose,
  selectedUsers,
  onSelectUser,
  users,
  title = 'Chọn người thực hiện'
}: SelectUserModalProps) => {
  const [searchText, setSearchText] = useState('');
  
  const filteredUsers = users.filter(user => {
    const search = searchText.toLowerCase();
    return user.displayName?.toLowerCase().includes(search) || 
           user.email?.toLowerCase().includes(search);
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>Đóng</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <ScrollView style={styles.userList}>
            {filteredUsers.map(user => {
              const isSelected = selectedUsers.some(u => u.id === user.id);
              const backgroundColor = user.photoURL 
                ? undefined 
                : generateColorFromString(user.displayName || user.email || 'U');
              
              return (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userItem,
                    isSelected && styles.selectedUser
                  ]}
                  onPress={() => onSelectUser(user)}
                >
                  <View style={[
                    styles.avatar,
                    backgroundColor && { backgroundColor }
                  ]}>
                    {user.photoURL ? (
                      <Image 
                        source={{ uri: user.photoURL }} 
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {user.displayName?.[0] || user.email?.[0] || 'U'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {user.displayName || user.email}
                    </Text>
                    {user.displayName && user.email && (
                      <Text style={styles.userEmail}>{user.email}</Text>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 16,
    color: '#666',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  userList: {
    maxHeight: '70%',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedUser: {
    backgroundColor: '#f0f8ff',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E066FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default SelectUserModal; 