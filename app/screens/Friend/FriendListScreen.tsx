import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc, DocumentData } from 'firebase/firestore';
import { db, auth } from '../../../src/config/firebaseConfig';
import { useRouter } from 'expo-router';

interface Friend {
  uid: string;
  email: string;
  fullName: string;
}

export default function FriendListScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'friends'),
        where('userId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const friendsData = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const friendId = data.friendId;
          const userDocRef = doc(db, 'users', friendId);
          const userDocSnap = await getDoc(userDocRef);
          const userData = userDocSnap.data() as DocumentData;
          
          return {
            uid: friendId,
            email: userData?.email || '',
            fullName: userData?.fullName || ''
          };
        })
      );

      setFriends(friendsData);
    } catch (error) {
      console.error('Lỗi khi tải danh sách bạn bè:', error);
    }
  };

  const handleChat = (friend: Friend) => {
    router.push({
      pathname: "../../screens/Chat/ChatScreenDetail",
      params: {
        userId: friend.uid,
        email: friend.email,
        fullName: friend.fullName
      }
    });
  };

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      <View style={styles.userInfo}>
        <Ionicons name="person-circle-outline" size={40} color="#666" />
        <View style={styles.textContainer}>
          <Text style={styles.nameText}>{item.fullName}</Text>
          <Text style={styles.emailText}>{item.email}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => handleChat(item)}
      >
        <Ionicons name="chatbubble-outline" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Danh sách bạn bè</Text>
      </View>

      <FlatList
        data={friends}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item.uid}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Chưa có bạn bè nào</Text>
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
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emailText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  chatButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
}); 