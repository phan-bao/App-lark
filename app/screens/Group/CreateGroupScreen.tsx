import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../src/config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Friend {
  id: string;
  displayName: string;
  photoURL: string;
  selected?: boolean;
  email: string;
}

export default function CreateGroupScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      if (!currentUser) return;

      const q = query(
        collection(db, 'friends'),
        where('userId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const friendsList = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const friendId = data.friendId;
          const userDocRef = doc(db, 'users', friendId);
          const userDocSnap = await getDoc(userDocRef);
          const userData = userDocSnap.data();
          
          return {
            id: friendId,
            displayName: userData?.fullName || 'Người dùng',
            photoURL: userData?.photoURL || '',
            email: userData?.email || '',
          };
        })
      );

      setFriends(friendsList);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách bạn bè:', error);
    }
  };

  const toggleFriendSelection = (friend: Friend) => {
    const isSelected = selectedFriends.some((f) => f.id === friend.id);
    if (isSelected) {
      setSelectedFriends(selectedFriends.filter((f) => f.id !== friend.id));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  const createGroup = async () => {
    try {
      if (!currentUser || !groupName || selectedFriends.length === 0) return;

      const groupsRef = collection(db, 'groups');
      const newGroup = {
        name: groupName,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        members: [currentUser.uid, ...selectedFriends.map((f) => f.id)],
      };

      const groupDoc = await addDoc(groupsRef, newGroup);
      setModalVisible(false);
      
      // Chuyển hướng đến ChatScreen với thông tin nhóm
      router.push({
        pathname: '/screens/Chat/ChatScreen',
        params: {
          groupId: groupDoc.id,
          groupName: groupName,
          isGroup: 'true'
        }
      });
    } catch (error) {
      console.error('Lỗi khi tạo nhóm:', error);
      Alert.alert('Lỗi', 'Không thể tạo nhóm. Vui lòng thử lại.');
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAvatar = (friend: Friend, size: number) => {
    if (friend.photoURL) {
      return (
        <Image
          source={{ uri: friend.photoURL }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        />
      );
    } else {
      const initial = friend.displayName.charAt(0).toUpperCase();
      return (
        <View style={[styles.initialAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.initialText}>{initial}</Text>
        </View>
      );
    }
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const isSelected = selectedFriends.some((f) => f.id === item.id);

    return (
      <Pressable
        style={[styles.friendItem, isSelected && styles.selectedFriendItem]}
        onPress={() => toggleFriendSelection(item)}
      >
        {renderAvatar(item, 48)}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.displayName}</Text>
          <Text style={styles.friendEmail}>{item.email}</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={18} color="#fff" />
          )}
        </View>
      </Pressable>
    );
  };

  const handleCancel = () => {
    setModalVisible(false);
    router.push('/screens/Chat/ChatScreen');
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Pressable 
              onPress={handleCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </Pressable>
            <Text style={styles.title}>Nhóm mới</Text>
            <Pressable 
              onPress={createGroup}
              disabled={!groupName || selectedFriends.length === 0}
              style={[styles.createButton, (!groupName || selectedFriends.length === 0) && styles.disabledButton]}
            >
              <Text style={styles.createButtonText}>
                Tạo ({selectedFriends.length})
              </Text>
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.groupNameInput}
              placeholder="Tên nhóm (không bắt buộc)"
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm bạn bè..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <Pressable 
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </Pressable>
            )}
          </View>

          {selectedFriends.length > 0 && (
            <View style={styles.selectedFriendsContainer}>
              <Text style={styles.selectedFriendsTitle}>Đã chọn ({selectedFriends.length})</Text>
              <FlatList
                horizontal
                data={selectedFriends}
                renderItem={({ item }) => (
                  <View style={styles.selectedFriendItem}>
                    {renderAvatar(item, 40)}
                    <Text style={styles.selectedFriendName} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                  </View>
                )}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          <FlatList
            data={filteredFriends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            style={styles.friendsList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không tìm thấy bạn bè</Text>
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  cancelButton: {
    minWidth: 60,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ff3b30',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
  createButton: {
    minWidth: 60,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#147efb',
  },
  createButtonText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  inputContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupNameInput: {
    fontSize: 16,
    color: '#000000',
    padding: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  friendEmail: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#147efb',
    borderColor: '#147efb',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666666',
  },
  selectedFriendsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedFriendItem: {
    backgroundColor: '#f0f8ff',
  },
  selectedFriendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  selectedFriendName: {
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
  },
  initialAvatar: {
    backgroundColor: '#147efb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectedFriendsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginLeft: 16,
  },
}); 