import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../src/config/firebaseConfig';
import { useRouter } from 'expo-router';

interface FriendRequest {
  id: string;
  senderId: string;
  senderEmail: string;
  receiverId: string;
  status: string;
  createdAt: string;
}

export default function FriendRequestScreen() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    loadFriendRequests();
  }, []);

  const loadFriendRequests = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('receiverId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FriendRequest));

      setRequests(requestsData);
    } catch (error) {
      console.error('Lỗi khi tải lời mời kết bạn:', error);
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    try {
      // Tạo mối quan hệ bạn bè hai chiều
      await setDoc(doc(db, 'friends', `${currentUser?.uid}_${request.senderId}`), {
        userId: currentUser?.uid,
        friendId: request.senderId,
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'friends', `${request.senderId}_${currentUser?.uid}`), {
        userId: request.senderId,
        friendId: currentUser?.uid,
        createdAt: new Date().toISOString()
      });

      // Cập nhật trạng thái lời mời kết bạn
      await updateDoc(doc(db, 'friendRequests', request.id), {
        status: 'accepted'
      });

      // Cập nhật UI
      setRequests(prev => prev.filter(r => r.id !== request.id));
      Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn');
    } catch (error) {
      console.error('Lỗi khi chấp nhận lời mời:', error);
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời kết bạn');
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    try {
      await updateDoc(doc(db, 'friendRequests', request.id), {
        status: 'rejected'
      });

      setRequests(prev => prev.filter(r => r.id !== request.id));
      Alert.alert('Thành công', 'Đã từ chối lời mời kết bạn');
    } catch (error) {
      console.error('Lỗi khi từ chối lời mời:', error);
      Alert.alert('Lỗi', 'Không thể từ chối lời mời kết bạn');
    }
  };

  const renderRequestItem = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestItem}>
      <View style={styles.userInfo}>
        <Ionicons name="person-circle-outline" size={40} color="#666" />
        <Text style={styles.emailText}>{item.senderEmail}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(item)}
        >
          <Text style={styles.buttonText}>Đồng ý</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectRequest(item)}
        >
          <Text style={styles.buttonText}>Từ chối</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Lời mời kết bạn</Text>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không có lời mời kết bạn nào</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  requestItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emailText: {
    marginLeft: 12,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
}); 