import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db } from '../../src/config/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  setDoc,
  getDoc,
} from 'firebase/firestore';

interface Notification {
  id: string;
  type: 'task' | 'subtask' | 'friend_request' | 'organization_invite';
  taskId?: string;
  subtaskId?: string;
  title?: string;
  parentTaskTitle?: string;
  description?: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  timestamp: Date;
  organizationId?: string;
  organizationName?: string;
  isRead: boolean;
  inviteId?: string;
}

const NotificationScreen = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      console.log('Không có người dùng đăng nhập');
      return;
    }

    console.log('Bắt đầu lắng nghe thông báo cho user:', user.uid);

    // Lắng nghe thông báo task và subtask
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('receiverId', '==', user.uid),
      where('type', 'in', ['task', 'subtask', 'organization_invite'])
    );

    const unsubscribe = onSnapshot(notificationsQuery, 
      (snapshot) => {
        console.log('Nhận được snapshot thông báo:', snapshot.docs.length);
        
        const newNotifications = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Thông báo chi tiết:', {
            id: doc.id,
            ...data,
            timestamp: data.createdAt?.toDate() || new Date()
          });
          return {
            id: doc.id,
            ...data,
            timestamp: data.createdAt?.toDate() || new Date()
          };
        }) as Notification[];

        console.log('Số thông báo mới:', newNotifications.length);

        setNotifications(prevNotifications => {
          // Lọc bỏ các thông báo cũ của cùng một task/subtask
          const filteredPrev = prevNotifications.filter(n => 
            !newNotifications.some(newN => 
              (n.type === 'task' && newN.type === 'task' && n.taskId === newN.taskId) ||
              (n.type === 'subtask' && newN.type === 'subtask' && n.subtaskId === newN.subtaskId)
            )
          );
          
          // Kết hợp và sắp xếp theo thời gian
          const allNotifications = [...filteredPrev, ...newNotifications]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          
          console.log('Tổng số thông báo sau khi cập nhật:', allNotifications.length);
          return allNotifications;
        });
      },
      (error) => {
        console.error('Lỗi khi lắng nghe thông báo:', error);
      }
    );

    return () => {
      console.log('Dừng lắng nghe thông báo');
      unsubscribe();
    };
  }, [user]);

  const handleAcceptRequest = async (notification: Notification) => {
    try {
      if (notification.type === 'friend_request') {
        // Xử lý chấp nhận lời mời kết bạn
        await updateDoc(doc(db, 'friendRequests', notification.id), {
          status: 'accepted'
        });

        const friendsRef = collection(db, 'friends');
        await Promise.all([
          setDoc(doc(friendsRef), {
            userId: user?.uid,
            friendId: notification.senderId,
            timestamp: new Date()
          }),
          setDoc(doc(friendsRef), {
            userId: notification.senderId,
            friendId: user?.uid,
            timestamp: new Date()
          })
        ]);
      } else if (notification.type === 'organization_invite' && notification.inviteId) {
        // Xử lý chấp nhận lời mời tham gia tổ chức
        await updateDoc(doc(db, 'organizationInvites', notification.inviteId), {
          status: 'accepted'
        });

        // Cập nhật thông tin người dùng
        await updateDoc(doc(db, 'users', user?.uid || ''), {
          organizationId: notification.organizationId
        });

        // Cập nhật danh sách thành viên của tổ chức
        const orgDoc = await getDoc(doc(db, 'organizations', notification.organizationId || ''));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          const updatedMembers = [...(orgData.members || []), user?.uid];
          await updateDoc(doc(db, 'organizations', notification.organizationId || ''), {
            members: updatedMembers
          });

          // Xóa thông báo sau khi xử lý thành công
          await deleteDoc(doc(db, 'notifications', notification.id));
        }
      }

      // Cập nhật lại danh sách thông báo
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== notification.id)
      );

      Alert.alert('Thành công', 'Đã xử lý yêu cầu thành công');
    } catch (error) {
      console.error('Lỗi khi chấp nhận:', error);
      Alert.alert('Lỗi', 'Không thể xử lý yêu cầu');
    }
  };

  const handleRejectRequest = async (notification: Notification) => {
    try {
      if (notification.type === 'friend_request') {
        await deleteDoc(doc(db, 'friendRequests', notification.id));
      } else if (notification.type === 'organization_invite') {
        await updateDoc(doc(db, 'organizationInvites', notification.id), {
          status: 'rejected'
        });
      }

      // Cập nhật lại danh sách thông báo
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== notification.id)
      );

      Alert.alert('Thành công', 'Đã từ chối yêu cầu');
    } catch (error) {
      console.error('Lỗi khi từ chối:', error);
      Alert.alert('Lỗi', 'Không thể từ chối yêu cầu');
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (notification.type === 'task' && notification.taskId) {
      // Chuyển đến trang task chi tiết
      router.push(`/screens/Task/task?id=${notification.taskId}`);
      
      // Đánh dấu thông báo đã đọc
      if (!notification.isRead) {
        updateDoc(doc(db, 'notifications', notification.id), {
          isRead: true
        });
      }
    } else if (notification.type === 'subtask' && notification.taskId && notification.subtaskId) {
      // Chuyển đến trang task chi tiết với subtask được chọn
      router.push(`/screens/Task/task?id=${notification.taskId}&subtaskId=${notification.subtaskId}`);
      
      // Đánh dấu thông báo đã đọc
      if (!notification.isRead) {
        updateDoc(doc(db, 'notifications', notification.id), {
          isRead: true
        });
      }
    } else if (notification.type === 'friend_request') {
      // Xử lý thông báo kết bạn
      handleAcceptRequest(notification);
    } else if (notification.type === 'organization_invite') {
      // Xử lý thông báo mời tham gia tổ chức
      handleAcceptRequest(notification);
    }
  };

  const handleDeleteAll = async () => {
    try {
      // Xóa tất cả thông báo của người dùng hiện tại
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('receiverId', '==', user?.uid)
      );
      
      const snapshot = await getDocs(notificationsQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      setNotifications([]);
      Alert.alert('Thành công', 'Đã xóa tất cả thông báo');
    } catch (error) {
      console.error('Lỗi khi xóa thông báo:', error);
      Alert.alert('Lỗi', 'Không thể xóa thông báo');
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[
        styles.requestItem,
        !item.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.senderName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.nameContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{item.senderName}</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(item.timestamp)}</Text>
          </View>
          <Text style={styles.email}>{item.senderEmail}</Text>
          {item.type === 'task' && (
            <>
              <Text style={styles.taskTitle}>{item.title}</Text>
              <Text style={styles.taskDescription} numberOfLines={2}>
                {item.description}
              </Text>
            </>
          )}
          {item.type === 'subtask' && (
            <>
              <Text style={styles.taskTitle}>Tác vụ con: {item.title}</Text>
              <Text style={styles.taskDescription} numberOfLines={2}>
                Trong nhiệm vụ: {item.parentTaskTitle}
              </Text>
            </>
          )}
          {item.type === 'organization_invite' && (
            <Text style={styles.organizationText}>
              Mời bạn tham gia tổ chức: {item.organizationName}
            </Text>
          )}
        </View>
      </View>
      {item.type !== 'task' && item.type !== 'subtask' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptRequest(item)}
          >
            <Text style={styles.actionButtonText}>Chấp nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectRequest(item)}
          >
            <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Từ chối</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity onPress={handleDeleteAll}>
          <Ionicons name="trash-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không có thông báo mới</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  listContainer: {
    padding: 16,
  },
  requestItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  organizationText: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  rejectButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  rejectButtonText: {
    color: '#FF3B30',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  timeAgo: {
    fontSize: 12,
    color: '#666',
  },
});

export default NotificationScreen; 