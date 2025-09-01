import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  DrawerLayoutAndroid,
  FlatList,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { Avatar } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../../src/config/firebaseConfig";
import AddMenu from "../../components/AddMenu";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  limit,
  DocumentData,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

interface UserData {
  fullName: string;
  email: string;
  uid: string;
  photoURL?: string;
}

interface ChatPreview {
  userId: string;
  fullName: string;
  email: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  chatRoomId: string;
  isFriend: boolean;
  photoURL: string;
  isGroup: boolean;
  groupName: string;
}

const HomeScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = auth.currentUser;
  const drawerRef = useRef<DrawerLayoutAndroid>(null);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [friendRequests, setFriendRequests] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [filteredChats, setFilteredChats] = useState<ChatPreview[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);

  const openDrawer = () => {
    drawerRef.current?.openDrawer();
  };

  const navigateToProfile = () => {
    router.push("./ProfileScreen");
    drawerRef.current?.closeDrawer();
  };

   const navigateToSearch = () => {
    router.push("./SearchScreen"); // Điều hướng đến trang tìm kiếm
  };

  const navigateToNotification = () => {
    router.push("../../screens/NotificationScreen"); // Điều hướng đến trang thông báo
  };

  const navigateaddMenu = () => {
    router.push("./SearchScreen"); // Điều hướng đến trang tìm kiếm
  };

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      try {
        // 1. Lấy danh sách chat rooms trước
        const chatRoomsRef = collection(db, 'messages');
        const q = query(
          chatRoomsRef,
          where('senderId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
          try {
            // Tạo Map để lưu trữ tin nhắn mới nhất của mỗi người dùng
            const latestMessages = new Map();

            // Lọc và lấy tin nhắn mới nhất cho mỗi cuộc trò chuyện
            for (const doc of snapshot.docs) {
              const messageData = doc.data();
              const otherUserId = messageData.receiverId;

              if (!messageData.createdAt) continue;

              const messageTimestamp = messageData.createdAt.toDate();
              
              if (!latestMessages.has(otherUserId) || 
                  messageTimestamp > latestMessages.get(otherUserId).createdAt.toDate()) {
                latestMessages.set(otherUserId, {
                  ...messageData,
                  chatRoomId: messageData.chatRoomId
                });
              }
            }

            // Lấy thêm tin nhắn mà user là người nhận
            const receivedMessagesQuery = query(
              chatRoomsRef,
              where('receiverId', '==', user.uid)
            );
            const receivedSnapshot = await getDocs(receivedMessagesQuery);

            receivedSnapshot.docs.forEach(doc => {
              const messageData = doc.data();
              const otherUserId = messageData.senderId;

              if (!messageData.createdAt) return;

              const messageTimestamp = messageData.createdAt.toDate();
              
              if (!latestMessages.has(otherUserId) || 
                  messageTimestamp > latestMessages.get(otherUserId).createdAt.toDate()) {
                latestMessages.set(otherUserId, {
                  ...messageData,
                  chatRoomId: messageData.chatRoomId
                });
              }
            });

            // Lấy thông tin người dùng và tạo danh sách chat
            const chatPromises = Array.from(latestMessages.entries()).map(async ([otherUserId, messageData]) => {
              try {
                // Lấy thông tin người dùng
                const userDocRef = doc(db, 'users', otherUserId);
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists()) {
                  console.warn('Không tìm thấy thông tin người dùng:', otherUserId);
                  return null;
                }
                const userData = userDocSnap.data() as UserData;

                // Đếm số tin nhắn chưa đọc
                const unreadQuery = query(
                  chatRoomsRef,
                  where('chatRoomId', '==', messageData.chatRoomId),
                  where('receiverId', '==', user.uid),
                  where('isRead', '==', false)
                );
                const unreadSnap = await getDocs(unreadQuery);

                return {
                  userId: otherUserId,
                  fullName: userData?.fullName || 'Người dùng',
                  email: userData?.email || '',
                  photoURL: userData?.photoURL || '',
                  lastMessage: messageData.text || '',
                  timestamp: messageData.createdAt.toDate(),
                  unreadCount: unreadSnap.size,
                  chatRoomId: messageData.chatRoomId,
                  isFriend: true
                };
              } catch (error) {
                console.error('Lỗi khi lấy thông tin chat:', error);
                return null;
              }
            });

            const chatsData = (await Promise.all(chatPromises))
              .filter((chat): chat is ChatPreview => chat !== null)
              .filter(chat => chat.timestamp instanceof Date)
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setChats(chatsData);
          } catch (error) {
            console.error('Lỗi khi xử lý dữ liệu tin nhắn:', error);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Lỗi khi tải tin nhắn:', error);
      }
    };

    fetchChats();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Theo dõi lời mời kết bạn
    const friendRequestsRef = collection(db, 'friendRequests');
    const friendRequestsQuery = query(
      friendRequestsRef,
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeFriendRequests = onSnapshot(friendRequestsQuery, (snapshot) => {
      setFriendRequests(snapshot.size);
    });

    return () => {
      unsubscribeFriendRequests();
    };
  }, []);

  // Cập nhật useEffect để chỉ lọc theo search query
  useEffect(() => {
    if (!chats) return;

    let filtered = [...chats];

    // Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(chat => 
        chat.fullName.toLowerCase().includes(searchLower) ||
        chat.email.toLowerCase().includes(searchLower)
      );
    }

    setFilteredChats(filtered);
  }, [searchQuery, chats]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          }
        } catch (error) {
          console.error("Lỗi khi lấy thông tin người dùng:", error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  // Thêm useEffect để xử lý params từ CreateGroupScreen
  useEffect(() => {
    const { groupId, groupName } = params;

    if (groupId && groupName) {
      console.log('Nhận được thông tin nhóm mới:', { groupId, groupName });
      
      const newGroup: ChatPreview = {
        userId: groupId as string,
        fullName: groupName as string,
        email: '',
        lastMessage: '',
        timestamp: new Date(),
        unreadCount: 0,
        chatRoomId: groupId as string,
        isFriend: false,
        photoURL: '',
        isGroup: true,
        groupName: groupName as string
      };

      setChats(prevChats => {
        // Kiểm tra xem nhóm đã tồn tại chưa
        const existingGroupIndex = prevChats.findIndex(chat => 
          chat.chatRoomId === groupId
        );

        if (existingGroupIndex === -1) {
          console.log('Thêm nhóm mới vào danh sách');
          return [newGroup, ...prevChats];
        }

        return prevChats;
      });
    }
  }, [params]);

  // Thêm useEffect để lấy danh sách nhóm từ Firestore
  useEffect(() => {
    if (!user) return;

    const fetchGroups = async () => {
      try {
        console.log('Bắt đầu lấy danh sách nhóm từ Firestore');
        const groupsRef = collection(db, 'groups');
        const q = query(
          groupsRef,
          where('members', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
          console.log('Nhận được dữ liệu nhóm từ Firestore:', snapshot.size);
          const groupsList = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data();
              
              // Lấy tin nhắn cuối cùng của nhóm
              const messagesRef = collection(db, 'messages');
              const lastMessageQuery = query(
                messagesRef,
                where('chatRoomId', '==', doc.id),
                orderBy('createdAt', 'desc'),
                limit(1)
              );
              
              const lastMessageSnap = await getDocs(lastMessageQuery);
              let lastMessage = '';
              let timestamp = data.createdAt;
              
              if (!lastMessageSnap.empty) {
                const messageData = lastMessageSnap.docs[0].data();
                lastMessage = messageData.text || '';
                timestamp = messageData.createdAt;
              }

              // Đếm số tin nhắn chưa đọc
              const unreadQuery = query(
                messagesRef,
                where('chatRoomId', '==', doc.id),
                where('receiverId', '==', user.uid),
                where('isRead', '==', false)
              );
              const unreadSnap = await getDocs(unreadQuery);

              return {
                userId: doc.id,
                fullName: data.name,
                email: '',
                lastMessage,
                timestamp: timestamp?.toDate() || new Date(),
                unreadCount: unreadSnap.size,
                chatRoomId: doc.id,
                isFriend: false,
                photoURL: '',
                isGroup: true,
                groupName: data.name
              };
            })
          );

          console.log('Cập nhật danh sách chat với các nhóm mới');
          // Cập nhật danh sách chat với các nhóm
          setChats(prevChats => {
            // Lọc bỏ các nhóm cũ
            const nonGroupChats = prevChats.filter(chat => !chat.isGroup);
            // Thêm các nhóm mới
            return [...nonGroupChats, ...groupsList];
          });
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Lỗi khi tải nhóm:', error);
      }
    };

    fetchGroups();
  }, [user]);

  const getInitial = () => {
    if (!userData?.fullName) return '?';
    return userData.fullName.charAt(0).toUpperCase();
  };

  const renderDrawer = () => (
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Avatar.Text
          size={60}
          label={getInitial()}
        />
        <TouchableOpacity
          style={styles.profileContainer}
          onPress={navigateToProfile}
        >
          <Text style={styles.drawerUsername}>{userData?.fullName || "Người dùng"}</Text>
          <Ionicons name="chevron-forward" size={20} color="black" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.drawerItem} onPress={navigateToProfile}>
        <Ionicons name="person-circle" size={24} color="black" />
        <Text style={styles.drawerText}>Hồ sơ</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.drawerItem}>
        <Ionicons name="heart" size={24} color="black" />
        <Text style={styles.drawerText}>Ưa thích</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.drawerItem}>
        <Ionicons name="settings" size={24} color="black" />
        <Text style={styles.drawerText}>Cài đặt</Text>
      </TouchableOpacity>
    </View>
  );

  // Hàm format thời gian
  const formatMessageTime = (timestamp: Date) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      // Nếu là hôm nay, hiện giờ:phút
      return format(messageDate, 'HH:mm');
    } else if (diffInDays === 1) {
      // Nếu là hôm qua
      return 'Hôm qua';
    } else if (diffInDays < 7) {
      // Nếu trong tuần này
      return format(messageDate, 'EEEE', { locale: vi });
    } else {
      // Nếu quá 7 ngày
      return format(messageDate, 'dd/MM/yyyy');
    }
  };

  // Thêm hàm xử lý đánh dấu đã đọc
  const handleMarkAsRead = async (chatRoomId: string) => {
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('chatRoomId', '==', chatRoomId),
        where('receiverId', '==', user?.uid),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { isRead: true })
      );
      
      await Promise.all(updatePromises);
      setSelectedChat(null);
    } catch (error) {
      console.error('Lỗi khi đánh dấu đã đọc:', error);
    }
  };

  // Thêm hàm xử lý chặn người dùng
  const handleBlock = async (userId: string) => {
    Alert.alert(
      'Chặn người dùng',
      'Bạn có chắc chắn muốn chặn người dùng này?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Chặn',
          style: 'destructive',
          onPress: async () => {
            try {
              // Thêm logic chặn người dùng ở đây
              setSelectedChat(null);
            } catch (error) {
              console.error('Lỗi khi chặn người dùng:', error);
            }
          }
        }
      ]
    );
  };

  // Thêm hàm xử lý xóa cuộc trò chuyện
  const handleDelete = async (chatRoomId: string) => {
    Alert.alert(
      'Xóa cuộc trò chuyện',
      'Bạn có chắc chắn muốn xóa cuộc trò chuyện này?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const messagesRef = collection(db, 'messages');
              const q = query(
                messagesRef,
                where('chatRoomId', '==', chatRoomId)
              );
              
              const snapshot = await getDocs(q);
              const deletePromises = snapshot.docs.map(doc => 
                deleteDoc(doc.ref)
              );
              
              await Promise.all(deletePromises);
              setSelectedChat(null);
            } catch (error) {
              console.error('Lỗi khi xóa tin nhắn:', error);
            }
          }
        }
      ]
    );
  };

  // Thêm hàm xử lý tắt thông báo
  const handleMute = async (duration: string) => {
    try {
      let muteUntil: Date | null = null;
      const now = new Date();
      
      switch (duration) {
        case '15min':
          muteUntil = new Date(now.getTime() + 15 * 60000);
          break;
        case '1hour':
          muteUntil = new Date(now.getTime() + 60 * 60000);
          break;
        case '8hours':
          muteUntil = new Date(now.getTime() + 8 * 60 * 60000);
          break;
        case '24hours':
          muteUntil = new Date(now.getTime() + 24 * 60 * 60000);
          break;
        case 'forever':
          muteUntil = new Date(now.getTime() + 365 * 24 * 60 * 60000); // 1 year
          break;
      }

      if (muteUntil) {
        // Lưu thời gian tắt thông báo vào database
        // Thêm logic lưu vào database ở đây
      }
      
      setShowMuteOptions(false);
      setSelectedChat(null);
    } catch (error) {
      console.error('Lỗi khi tắt thông báo:', error);
    }
  };

  const renderChatItem = ({ item }: { item: ChatPreview }) => (
    <TouchableOpacity
      style={[
        styles.chatItem,
        item.unreadCount > 0 && styles.unreadChatItem,
        !item.lastMessage && styles.noMessageItem
      ]}
      onPress={() => {
        router.push({
          pathname: './ChatScreenDetail',
          params: {
            userId: item.userId,
            fullName: item.fullName,
            email: item.email,
            chatRoomId: item.chatRoomId || 'new'
          }
        });
      }}
    >
      {item.photoURL ? (
        <Image 
          source={{ uri: item.photoURL }} 
          style={[styles.avatar, item.isFriend && styles.friendAvatar]} 
        />
      ) : (
        <View style={[styles.avatar, item.isFriend && styles.friendAvatar]}>
          <Text style={styles.avatarText}>
            {item.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <View style={styles.chatHeaderTop}>
            <Text style={[styles.nameText, item.unreadCount > 0 && styles.unreadText]}>
              {item.fullName}
            </Text>
            {item.lastMessage && (
              <Text style={styles.timeText}>
                {formatMessageTime(item.timestamp)}
              </Text>
            )}
          </View>
          <View style={styles.messageContainer}>
            <Text 
              style={[
                styles.messageText, 
                item.unreadCount > 0 && styles.unreadText,
                !item.lastMessage && styles.noMessageText
              ]} 
              numberOfLines={1}
            >
              {item.lastMessage || (item.isFriend ? 'Bắt đầu cuộc trò chuyện' : '')}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => setSelectedChat(selectedChat === item.chatRoomId ? null : item.chatRoomId)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#666" />
        </TouchableOpacity>
        {selectedChat === item.chatRoomId && (
          <View style={styles.actionMenuContainer}>
            <View style={styles.actionMenu}>
              <TouchableOpacity 
                style={styles.actionMenuItem}
                onPress={() => handleMarkAsRead(item.chatRoomId)}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#666" />
                <Text style={styles.actionMenuText}>Đánh dấu là đã đọc</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionMenuItem}
                onPress={() => setShowMuteOptions(true)}
              >
                <Ionicons name="notifications-off-outline" size={20} color="#666" />
                <Text style={styles.actionMenuText}>Tắt thông báo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionMenuItem}
              >
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.actionMenuText}>Hạn chế</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionMenuItem, styles.blockMenuItem]}
                onPress={() => handleBlock(item.userId)}
              >
                <Ionicons name="ban-outline" size={20} color="#ff4444" />
                <Text style={[styles.actionMenuText, styles.blockText]}>Chặn</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionMenuItem, styles.deleteMenuItem]}
                onPress={() => handleDelete(item.chatRoomId)}
              >
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
                <Text style={[styles.actionMenuText, styles.deleteText]}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {showMuteOptions && selectedChat === item.chatRoomId && (
          <View style={styles.muteOptionsContainer}>
            <View style={styles.muteOptionsMenu}>
              <Text style={styles.muteOptionsTitle}>Tắt thông báo về đoạn chat này?</Text>
              <TouchableOpacity style={styles.muteOption} onPress={() => handleMute('15min')}>
                <Text style={styles.muteOptionText}>Trong 15 phút</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.muteOption} onPress={() => handleMute('1hour')}>
                <Text style={styles.muteOptionText}>Trong 1 giờ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.muteOption} onPress={() => handleMute('8hours')}>
                <Text style={styles.muteOptionText}>Trong 8 giờ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.muteOption} onPress={() => handleMute('24hours')}>
                <Text style={styles.muteOptionText}>Trong 24 giờ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.muteOption} onPress={() => handleMute('forever')}>
                <Text style={styles.muteOptionText}>Đến khi tôi thay đổi</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.muteOption, styles.cancelOption]} 
                onPress={() => setShowMuteOptions(false)}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={() => {
        setMenuVisible(false);
        setSelectedChat(null);
        setShowMuteOptions(false);
      }}>
        <DrawerLayoutAndroid
          ref={drawerRef}
          drawerWidth={250}
          drawerPosition="left"
          renderNavigationView={renderDrawer}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={openDrawer}>
                <View style={styles.avatarContainer}>
                  {user?.photoURL ? (
                    <Image 
                      source={{ uri: user.photoURL }} 
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>{getInitial()}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.username}>{userData?.fullName || "Người dùng"}</Text>
              <View style={styles.headerIcons}>
                <TouchableOpacity onPress={navigateToNotification} style={styles.notificationContainer}>
                  <Ionicons name="notifications" size={24} color="black" style={styles.icon} />
                  {friendRequests > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{friendRequests}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMenuVisible(!isMenuVisible)}>
                  <Ionicons name="add-circle" size={24} color="black" style={styles.icon} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchWrapper}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm tin nhắn..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#666"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <FlatList
              data={filteredChats}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.chatRoomId || item.userId}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-outline" size={50} color="#666" />
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? 'Không tìm thấy tin nhắn nào'
                      : 'Chưa có tin nhắn nào'}
                  </Text>
                </View>
              }
            />

            {!isInputFocused && !searchQuery && (
               <View style={styles.bottomMenu}>
               <TouchableOpacity style={styles.menuItem} onPress={() => router.replace("../Home/home")}> 
                 <Ionicons name="home" size={24} color="white" />
                 <Text style={styles.menuText}>Trang chủ</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.menuItem} onPress={() => router.push("../../screens/Request/RequestScreen")}> 
                   <Ionicons name="document-text" size={24} color="white" />
                   <Text style={styles.menuText}>Yêu cầu</Text>
                 </TouchableOpacity>
               <TouchableOpacity style={styles.menuItem} onPress={() => router.push("../../screens/Chat/ChatScreen")}> 
                 <Ionicons name="chatbubble" size={24} color="white" />
                 <Text style={styles.menuText}>Tin nhắn</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.menuItem} onPress={() => router.push("../../screens/Task/task")}> 
                 <Ionicons name="list" size={24} color="white" />
                 <Text style={styles.menuText}>Nhiệm vụ</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.menuItem} onPress={() => router.push("../../screens/Admin/SettingsScreen")}> 
                   <Ionicons name="settings" size={24} color="white" />
                   <Text style={styles.menuText}>Cài đặt</Text>
                 </TouchableOpacity>
             </View>
            )}
            {/* Hiển thị menu khi bấm vào icon add-circle */}
            <AddMenu visible={isMenuVisible} onClose={() => setMenuVisible(false)} />
          </View>
        </DrawerLayoutAndroid>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "white",
  },
  username: { color: "black", fontSize: 20, fontWeight: "bold", flex: 1, marginLeft: 10 },
  headerIcons: { flexDirection: "row" },
  icon: { marginLeft: 15 },
  bottomMenu: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    backgroundColor: "#1f1f1f",
  },
  menuItem: { alignItems: "center" },
  menuText: { color: "white", fontSize: 12, marginTop: 5 },

  // Styles cho Drawer
  drawerContainer: { flex: 1, backgroundColor: "white", padding: 20 },
  drawerHeader: {
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 15,
    borderColor: "#ccc",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  drawerUsername: { fontSize: 18, fontWeight: "bold", marginRight: 10 },
  drawerItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  drawerText: { marginLeft: 15, fontSize: 16, color: "black" },

  // Styles cho tin nhắn
  listContainer: {
    padding: 10,
    position: 'relative',
    zIndex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    backgroundColor: '#fff',
    position: 'relative',
    zIndex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  chatInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatHeader: {
    flex: 1,
  },
  chatHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  messageText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  notificationContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#000',
    paddingHorizontal: 10,
  },
  unreadChatItem: {
    backgroundColor: '#e3f2fd',
  },
  unreadText: {
    fontWeight: 'bold',
    color: '#000',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noMessageItem: {
    backgroundColor: '#f5f5f5',
  },
  friendAvatar: {
    backgroundColor: '#4CAF50',
  },
  noMessageText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
    height: '100%',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
  },
  actionMenuContainer: {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: 5,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    width: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 9999,
  },
  actionMenu: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 8,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
  },
  actionMenuText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  blockMenuItem: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 5,
    paddingTop: 10,
  },
  blockText: {
    color: '#ff4444',
  },
  deleteMenuItem: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 5,
    paddingTop: 10,
  },
  deleteText: {
    color: '#ff4444',
  },
  muteOptionsContainer: {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: 5,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    width: 250,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 9999,
  },
  muteOptionsMenu: {
    width: '100%',
  },
  muteOptionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  muteOption: {
    padding: 12,
    borderRadius: 4,
  },
  muteOptionText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
  cancelOption: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 5,
  },
  cancelText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

});

export default HomeScreen;