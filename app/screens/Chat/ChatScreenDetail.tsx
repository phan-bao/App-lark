import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Clipboard,
  ToastAndroid,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../../../src/config/firebaseConfig';
import ChatMenu from '../../navigation/ChatMenu';
import { Audio } from 'expo-av';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
  status: 'sent' | 'delivered' | 'read';
  isDeleted?: boolean;
  deletedBy?: string;
  replyTo?: {
    messageId: string;
    text: string;
    senderId: string;
  };
  isEdited?: boolean;
  editedAt?: any;
  isPinned?: boolean;
  audioUrl?: string;
  type?: string;
}

interface TimeFormat {
  time: string;
  date: string;
}

interface AudioMessageProps {
  audioUrl: string;
  isSender: boolean;
}

const AudioMessage: React.FC<AudioMessageProps> = ({ audioUrl, isSender }) => { //định nghĩa một funtione componentcomponent
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadSound = async () => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false }
      );
      setSound(newSound);

      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || 0);
      }
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  const playSound = async () => {
    try {
      if (!sound) {
        await loadSound();
      }
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  return (
    <View style={[styles.audioMessage, isSender ? styles.senderMessage : styles.receiverMessage]}>
      <TouchableOpacity onPress={playSound} style={styles.audioPlayButton}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={isSender ? '#fff' : '#000'}
        />
      </TouchableOpacity>
      <View style={styles.audioProgressContainer}>
        <View style={[styles.audioProgress, { width: `${(position / duration) * 100}%` }]} />
      </View>
    </View>
  );
};

export default function ChatScreenDetail() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<{[key: string]: string}>({});
  const [replyingTo, setReplyingTo] = useState<{messageId: string, text: string, isSender: boolean} | null>(null);
  const [replyMessageRefs, setReplyMessageRefs] = useState<{[key: string]: number}>({});
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedMessageToForward, setSelectedMessageToForward] = useState<Message | null>(null);
  const [users, setUsers] = useState<Array<{id: string, fullName: string, avatar?: string}>>([]);
  const [filteredUsers, setFilteredUsers] = useState<Array<{id: string, fullName: string, avatar?: string}>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessage, setEditingMessage] = useState<{id: string, text: string} | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const params = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;

  const { userId, fullName } = params;

  useEffect(() => {
    if (!currentUser || !userId) return;

    const chatRoomId = [currentUser.uid, userId].sort().join('_');

    // Lắng nghe tin nhắn mới
    const q = query(
      collection(db, 'messages'),
      where('chatRoomId', '==', chatRoomId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];

      // Đánh dấu tin nhắn là đã đọc khi người nhận xem
      snapshot.docs.forEach(async (doc) => {
        const messageData = doc.data();
        if (messageData.receiverId === currentUser.uid && messageData.status !== 'read') {
          await updateDoc(doc.ref, { status: 'read' });
        }
      });

      // Sắp xếp tin nhắn theo thời gian
      newMessages.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || new Date(0);
        const timeB = b.createdAt?.toDate?.() || new Date(0);
        return timeA.getTime() - timeB.getTime();
      });
      
      setMessages(newMessages);
      
      // Cuộn xuống tin nhắn mới nhất
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          fullName: doc.data().fullName || '',
          avatar: doc.data().avatar
        }))
        .filter(user => user.id !== currentUser?.uid);
      setUsers(usersList);
    };

    fetchUsers();
  }, []);

  useEffect(() => {// làmột hook để theo dõi sự thay đổi của searchQuery và users
    if (searchQuery.trim()) {// loại bỏ khoảng trống 
      const filtered = users.filter(user => //lọc 
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase())//cHUYỂN TOÀN BỘ THÀNH chữ thường và kiểm tra lại xem có chứ thường trong ds hay khôgkhôg
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  useEffect(() => {
    if (!currentUser || !userId) return;

    const chatRoomId = [currentUser.uid, userId].sort().join('_');
    const q = query(
      collection(db, 'messages'),
      where('isPinned', '==', true),
      where('chatRoomId', '==', chatRoomId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pinnedMsgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setPinnedMessages(pinnedMsgs);
    });

    return () => unsubscribe();
  }, [currentUser, userId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !userId) return;

    const chatRoomId = [currentUser.uid, userId].sort().join('_');

    try {
      const messageData: any = {
        text: newMessage,
        senderId: currentUser.uid,
        receiverId: userId,
        chatRoomId,
        createdAt: serverTimestamp(),
        status: 'sent'
      };

      if (replyingTo) {
        messageData.replyTo = {
          messageId: replyingTo.messageId,
          text: replyingTo.text,
          senderId: replyingTo.isSender ? currentUser.uid : userId
        };
      }

      await addDoc(collection(db, 'messages'), messageData);

      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
    }
  };

  const getInitial = (name: string | string[] | undefined) => {
    if (!name) return '';
    const nameStr = Array.isArray(name) ? name[0] : name;
    return nameStr.charAt(0).toUpperCase();
  };

  const isFirstMessageOfDay = (messages: Message[], currentIndex: number) => {
    if (currentIndex === 0) return true;
    
    const currentMessage = messages[currentIndex];
    const previousMessage = messages[currentIndex - 1];
    
    if (!currentMessage.createdAt || !previousMessage.createdAt) return false;
    
    const currentDate = currentMessage.createdAt.toDate();
    const previousDate = previousMessage.createdAt.toDate();
    
    return (
      currentDate.getDate() !== previousDate.getDate() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  const formatMessageTime = (timestamp: any): TimeFormat | null => {
    if (!timestamp) return null;
    
    const messageDate = timestamp.toDate();
    
    // Format giờ:phút
    const time = messageDate.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });

    // Format ngày/tháng/năm
    const date = messageDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return { time, date };
  };

  const handleReaction = (messageId: string, reaction: string) => {
    setMessageReactions(prev => {
      // Nếu reaction hiện tại giống với reaction mới, xóa reaction
      if (prev[messageId] === reaction) {
        const newReactions = { ...prev };
        delete newReactions[messageId];
        return newReactions;
      }
      // Nếu khác hoặc chưa có reaction, thêm reaction mới
      return {
        ...prev,
        [messageId]: reaction
      };
    });
    setShowReactions(null);
  };

  const handleCopyMessage = (text: string) => {
    Clipboard.setString(text);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Đã sao chép tin nhắn', ToastAndroid.SHORT);
    } else {
      Alert.alert('Thông báo', 'Đã sao chép tin nhắn');
    }
    setShowReactions(null);
  };

  const handleReply = (messageId: string, text: string, isSender: boolean) => {
    setReplyingTo({ messageId, text, isSender });
    setShowReactions(null);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleLayout = (messageId: string, index: number) => {
    setReplyMessageRefs(prev => ({
      ...prev,
      [messageId]: index
    }));
  };

  const scrollToMessage = (messageId: string) => {
    const messageIndex = replyMessageRefs[messageId];
    if (messageIndex !== undefined && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5
      });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setShowDeleteModal(messageId);
    setShowReactions(null);
  };

  const handleDeleteForAll = async (messageId: string) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        isDeleted: true,
        deletedBy: currentUser?.uid,
        text: 'Bạn đã xóa một tin nhắn'
      });
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Lỗi khi xóa tin nhắn:', error);
      Alert.alert('Lỗi', 'Không thể xóa tin nhắn. Vui lòng thử lại sau.');
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    setShowConfirmDeleteModal(messageId);
    setShowDeleteModal(null);
  };

  const confirmDelete = async (messageId: string) => {
    try {
      // Thực hiện xóa tin nhắn
      const messageRef = doc(db, 'messages', messageId);
      await deleteDoc(messageRef);
      
      // Cập nhật lại danh sách tin nhắn
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      
      // Đóng modal xác nhận
      setShowConfirmDeleteModal(null);
    } catch (error) {
      console.error('Lỗi khi xóa tin nhắn:', error);
      Alert.alert('Lỗi', 'Không thể xóa tin nhắn. Vui lòng thử lại sau.');
    }
  };

  const handleForward = (messageId: string, text: string) => {
    const messageToForward = messages.find(msg => msg.id === messageId);
    if (messageToForward) {
      setSelectedMessageToForward(messageToForward);
      setShowForwardModal(true);
      setShowReactions(null);
    }
  };

  const sendForwardMessage = async (targetUserId: string) => {
    if (!selectedMessageToForward || !currentUser) return;

    const chatRoomId = [currentUser.uid, targetUserId].sort().join('_');

    try {
      await addDoc(collection(db, 'messages'), {
        text: selectedMessageToForward.text,
        senderId: currentUser.uid,
        receiverId: targetUserId,
        chatRoomId,
        createdAt: serverTimestamp(),
        status: 'sent',
        isForwarded: true
      });

      setShowForwardModal(false);
      setSelectedMessageToForward(null);
    } catch (error) {
      console.error('Lỗi khi chuyển tiếp tin nhắn:', error);
    }
  };

  const canEditMessage = (message: Message) => {
    if (!message.createdAt || message.senderId !== currentUser?.uid) return false;
    
    const messageTime = message.createdAt.toDate();
    const currentTime = new Date();
    const timeDiff = (currentTime.getTime() - messageTime.getTime()) / (1000 * 60); // Đổi ra phút
    
    return timeDiff <= 5; // Chỉ cho phép sửa trong 5 phút
  };

  const handleEdit = async (messageId: string, text: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message || !canEditMessage(message)) {
      Alert.alert(
        'Không thể chỉnh sửa',
        'Bạn chỉ có thể chỉnh sửa tin nhắn của mình trong vòng 5 phút sau khi gửi'
      );
      return;
    }
    
    setEditingMessage({ id: messageId, text });
    setNewMessage(text);
    setShowReactions(null);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage || !newMessage.trim()) return;

    try {
      const messageRef = doc(db, 'messages', editingMessage.id);
      await updateDoc(messageRef, {
        text: newMessage,
        isEdited: true,
        editedAt: serverTimestamp()
      });
      
      setEditingMessage(null);
      setNewMessage('');
    } catch (error) {
      console.error('Lỗi khi cập nhật tin nhắn:', error);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      if (!currentUser || !userId) return;

      const messageToPin = messages.find(msg => msg.id === messageId);
      if (!messageToPin) return;

      const chatRoomId = [currentUser.uid, userId].sort().join('_');

      // Kiểm tra xem tin nhắn đã được ghim chưa
      const isAlreadyPinned = pinnedMessages.some(msg => msg.id === messageId);
      if (isAlreadyPinned) {
        console.log('Tin nhắn này đã được ghim');
        return;
      }

      // Ghim tin nhắn mới
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, { 
        isPinned: true,
        chatRoomId: chatRoomId
      });

      // Cập nhật state mà không thêm tin nhắn trùng lặp
      setPinnedMessages(prev => {
        // Kiểm tra xem tin nhắn đã tồn tại trong danh sách chưa
        const messageExists = prev.some(msg => msg.id === messageId);
        if (messageExists) {
          return prev;
        }
        return [...prev, messageToPin];
      });
      
      setShowReactions(null);
    } catch (error) {
      console.error('Lỗi khi ghim tin nhắn:', error);
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      // Bỏ ghim tin nhắn trong database
      await updateDoc(doc(db, 'messages', messageId), {
        isPinned: false
      });

      // Cập nhật state
      setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Lỗi khi bỏ ghim tin nhắn:', error);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập microphone để ghi âm');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Lỗi khi bắt đầu ghi âm:', err);
      Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }

      setIsRecording(false);
      setRecording(null);
      setRecordingDuration(0);

      if (uri) {
        await sendAudioMessage(uri);
      }

    } catch (err) {
      console.error('Lỗi khi dừng ghi âm:', err);
      Alert.alert('Lỗi', 'Không thể dừng ghi âm');
    }
  };

  const sendAudioMessage = async (audioUri: string) => {
    if (!currentUser || !userId) return;

    const chatRoomId = [currentUser.uid, userId].sort().join('_');

    try {
      const messageData: any = {
        audioUrl: audioUri,
        senderId: currentUser.uid,
        receiverId: userId,
        chatRoomId,
        createdAt: serverTimestamp(),
        status: 'sent',
        type: 'audio'
      };

      await addDoc(collection(db, 'messages'), messageData);
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn âm thanh:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn âm thanh');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderMessage = ({ item, index }: { item: Message, index: number }) => {
    const isSender = item.senderId === currentUser?.uid;
    const isSelected = selectedMessageId === item.id;
    const isShowOptions = showOptions === item.id;
    const isShowReactions = showReactions === item.id;
    const showDateHeader = isFirstMessageOfDay(messages, index);
    const timeFormat = formatMessageTime(item.createdAt);

    return (
      <>
        {showDateHeader && timeFormat && (
          <View style={styles.dateHeaderContainer}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{timeFormat.time}</Text>
              <Text style={styles.dateHeaderText}>{timeFormat.date}</Text>
            </View>
          </View>
        )}
        {isSelected && timeFormat && !showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{timeFormat.time}</Text>
              <Text style={styles.dateHeaderText}>{timeFormat.date}</Text>
            </View>
          </View>
        )}
        <TouchableOpacity 
          onLayout={() => handleLayout(item.id, index)}
          onPress={() => {
            setSelectedMessageId(isSelected ? null : item.id);
          }}
          onLongPress={() => {
            if (!item.isDeleted) {
              setShowReactions(isShowReactions ? null : item.id);
              setShowOptions(isShowOptions ? null : item.id);
            }
          }}
          style={[
            styles.messageContainer,
            isSender ? styles.senderMessage : styles.receiverMessage
          ]}
        >
          {!isSender && (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitial(fullName)}
              </Text>
            </View>
          )}
          <View>
            {isShowReactions && !item.isDeleted && (
              <ChatMenu
                messageId={item.id}
                text={item.text}
                isSender={isSender}
                message={item}
                onReaction={handleReaction}
                onReply={handleReply}
                onCopyMessage={handleCopyMessage}
                onForward={handleForward}
                onDeleteMessage={handleDeleteMessage}
                onPin={handlePinMessage}
                onEdit={handleEdit}
                onClose={() => setShowReactions(null)}
              />
            )}
            {item.replyTo && (
              <TouchableOpacity 
                style={[
                  styles.replyPreview,
                  isSender ? styles.senderReplyPreview : styles.receiverReplyPreview
                ]}
                onPress={() => scrollToMessage(item.replyTo?.messageId || '')}
              >
                <View style={styles.replyPreviewHeader}>
                  <Ionicons name="arrow-undo" size={16} color={isSender ? '#007AFF' : '#666'} />
                  <Text style={[
                    styles.replyPreviewLabel,
                    { color: isSender ? '#007AFF' : '#666' }
                  ]}>
                    {item.replyTo.senderId === currentUser?.uid ? 'Bạn đã trả lời' : `${fullName}`}
                  </Text>
                </View>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {item.replyTo.text}
                </Text>
              </TouchableOpacity>
            )}
            <View style={[
              styles.messageBubble,
              isSender ? styles.senderBubble : styles.receiverBubble,
              item.isDeleted && styles.deletedMessageBubble
            ]}>
              <View style={styles.messageContent}>
                {item.isPinned && (
                  <View style={styles.pinnedIcon}>
                    <Ionicons name="pin" size={14} color="#666" />
                  </View>
                )}
                <Text style={[
                  styles.messageText,
                  isSender ? styles.senderText : styles.receiverText,
                  item.isDeleted && styles.deletedMessageText
                ]}>
                  {item.text}
                </Text>
              </View>
              {messageReactions[item.id] && !item.isDeleted && (
                <View style={styles.messageReaction}>
                  <Text style={styles.reactionEmoji}>{messageReactions[item.id]}</Text>
                </View>
              )}
            </View>
            {isSender && !item.isDeleted && (
              <View style={styles.messageStatus}>
                {item.status === 'sent' && (
                  <View style={styles.statusIcon}>
                    <Ionicons name="checkmark" size={14} color="#8e8e8e" />
                    <Text style={styles.messageStatusText}>Đã gửi</Text>
                  </View>
                )}
                {item.status === 'read' && (
                  <View style={styles.statusIcon}>
                    <Text style={styles.messageStatusText}>Đã xem</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{fullName}</Text>
        <TouchableOpacity style={styles.callButton}>
          <Ionicons name="call" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Pinned Messages Section */}
      {pinnedMessages.length > 0 && (
        <View style={styles.pinnedSection}>
          <TouchableOpacity 
            style={styles.pinnedHeader}
            onPress={() => setShowPinnedMessages(!showPinnedMessages)}
          >
            <View style={styles.pinnedHeaderLeft}>
              <Ionicons name="pin-outline" size={16} color="#666" />
              <Text style={styles.pinnedHeaderText}>
                Tin nhắn đã ghim ({pinnedMessages.length})
              </Text>
            </View>
            <Ionicons 
              name={showPinnedMessages ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#666" 
            />
          </TouchableOpacity>

          {showPinnedMessages && (
            <View style={styles.pinnedList}>
              {pinnedMessages.map((msg, index) => (
                <View key={`pinned-${msg.id}-${index}`} style={styles.pinnedItem}>
                  <TouchableOpacity 
                    style={styles.pinnedItemContent}
                    onPress={() => {
                      const msgIndex = messages.findIndex(m => m.id === msg.id);
                      if (msgIndex !== -1 && flatListRef.current) {
                        flatListRef.current.scrollToIndex({
                          index: msgIndex,
                          animated: true,
                          viewPosition: 0.5
                        });
                      }
                      setShowPinnedMessages(false);
                    }}
                  >
                    <Text style={styles.pinnedItemText} numberOfLines={1}>
                      {msg.text}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.unpinButton}
                    onPress={() => handleUnpinMessage(msg.id)}
                  >
                    <Ionicons name="close-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5
              });
            }
          }, 100);
        }}
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        {editingMessage && (
          <View style={styles.editContainer}>
            <View style={styles.editContent}>
              <Ionicons name="pencil-outline" size={20} color="#666" />
              <Text style={styles.editLabel}>Đang chỉnh sửa tin nhắn</Text>
            </View>
            <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditButton}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        {replyingTo && (
          <View style={styles.replyContainer}>
            <View style={styles.replyContent}>
              <Text style={styles.replyLabel}>
                {replyingTo.isSender ? 'Đang trả lời chính bạn' : `Đang trả lời ${fullName}`}
              </Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {replyingTo.text}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelReply} style={styles.cancelReplyButton}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          {!isRecording ? (
            <>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="happy-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="at" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="image-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={startRecording}
              >
                <Ionicons name="mic-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="text" size={24} color="#666" />
              </TouchableOpacity>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Tin nhắn"
                  placeholderTextColor="#999"
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                  onPress={editingMessage ? handleUpdateMessage : sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={24}
                    color={newMessage.trim() ? "#fff" : "#999"}
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.recordingContainer}>
              <View style={styles.recordingContent}>
                <Ionicons name="mic" size={24} color="#FF3B30" />
                <Text style={styles.recordingText}>
                  {formatDuration(recordingDuration)}
                </Text>
              </View>
              <View style={styles.recordingActions}>
                <TouchableOpacity
                  onPress={() => {
                    if (recordingTimer.current) {
                      clearInterval(recordingTimer.current);
                    }
                    setIsRecording(false);
                    setRecording(null);
                    setRecordingDuration(0);
                  }}
                  style={styles.cancelRecordingButton}
                >
                  <Ionicons name="close" size={24} color="#FF3B30" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={stopRecording}
                  style={styles.stopRecordingButton}
                >
                  <Ionicons name="send" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      {showConfirmDeleteModal && (
        <>
          <Pressable 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} 
            onPress={() => setShowConfirmDeleteModal(null)}
          />
          <View style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 34 : 20,
            left: 20,
            right: 20,
            backgroundColor: '#2C2C2E',
            borderRadius: 14,
            overflow: 'hidden',
            zIndex: 1000,
          }}>
            <View style={{
              padding: 20,
              alignItems: 'center',
            }}>
              <Text style={{
                color: '#fff',
                fontSize: 17,
                fontWeight: '600',
                marginBottom: 8,
              }}>
                Xác nhận xóa
              </Text>
              <Text style={{
                color: '#fff',
                fontSize: 15,
                textAlign: 'center',
                marginBottom: 20,
                opacity: 0.8,
              }}>
                Bạn có chắc chắn muốn xóa tin nhắn này không?
              </Text>
            </View>
            <TouchableOpacity 
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                backgroundColor: '#2C2C2E',
                borderTopWidth: 0.5,
                borderTopColor: '#3A3A3C',
              }}
              onPress={() => confirmDelete(showConfirmDeleteModal)}
            >
              <Text style={{
                color: '#FF453A',
                fontSize: 17,
                fontWeight: '600',
              }}>Xóa</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                backgroundColor: '#2C2C2E',
                borderTopWidth: 8,
                borderTopColor: '#1C1C1E',
              }}
              onPress={() => setShowConfirmDeleteModal(null)}
            >
              <Text style={{
                color: '#0A84FF',
                fontSize: 17,
                fontWeight: '600',
              }}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <>
          <Pressable 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} 
            onPress={() => setShowDeleteModal(null)}
          />
          <View style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 34 : 20,
            left: 20,
            right: 20,
            backgroundColor: '#2C2C2E',
            borderRadius: 14,
            overflow: 'hidden',
            zIndex: 1000,
          }}>
            {messages.find(msg => msg.id === showDeleteModal)?.senderId === currentUser?.uid ? (
              // Nếu là tin nhắn của người gửi hiện tại
              <>
                <TouchableOpacity 
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                    backgroundColor: '#2C2C2E',
                  }}
                  onPress={() => handleDeleteForAll(showDeleteModal)}
                >
                  <Text style={{
                    color: '#FF453A',
                    fontSize: 17,
                    fontWeight: '600',
                  }}>Xóa đối với mọi người</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                    backgroundColor: '#2C2C2E',
                    borderTopWidth: 0.5,
                    borderTopColor: '#3A3A3C',
                  }}
                  onPress={() => handleDeleteForMe(showDeleteModal)}
                >
                  <Text style={{
                    color: '#FF453A',
                    fontSize: 17,
                    fontWeight: '600',
                  }}>Xóa đối với bạn</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Nếu là tin nhắn của người nhận
              <TouchableOpacity 
                style={{
                  paddingVertical: 16,
                  alignItems: 'center',
                  backgroundColor: '#2C2C2E',
                }}
                onPress={() => handleDeleteForMe(showDeleteModal)}
              >
                <Text style={{
                  color: '#FF453A',
                  fontSize: 17,
                  fontWeight: '600',
                }}>Xóa đối với bạn</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                backgroundColor: '#2C2C2E',
                borderTopWidth: 8,
                borderTopColor: '#1C1C1E',
              }}
              onPress={() => setShowDeleteModal(null)}
            >
              <Text style={{
                color: '#0A84FF',
                fontSize: 17,
                fontWeight: '600',
              }}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Forward Modal */}
      {showForwardModal && (
        <>
          <Pressable 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} 
            onPress={() => setShowForwardModal(false)}
          />
          <View style={styles.forwardModal}>
            <View style={styles.forwardHeader}>
              <Text style={styles.forwardTitle}>Chuyển tiếp đến</Text>
              <TouchableOpacity onPress={() => setShowForwardModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item: user }) => (
                <TouchableOpacity 
                  style={styles.userItem}
                  onPress={() => sendForwardMessage(user.id)}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.fullName ? user.fullName.charAt(0).toUpperCase() : ''}
                    </Text>
                  </View>
                  <Text style={styles.userName}>{user.fullName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </>
      )}
    </SafeAreaView>
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
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    color: '#000',
  },
  callButton: {
    padding: 5,
    marginRight: 10,
  },
  menuButton: {
    padding: 5,
  },
  messagesList: {
    padding: 10,
    paddingBottom: 60,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    width: '100%',
  },
  senderMessage: {
    justifyContent: 'flex-end',
    width: '100%',
  },
  receiverMessage: {
    justifyContent: 'flex-start',
    width: '100%',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 16,
  },
  senderBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
    marginRight: 8,
  },
  receiverBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
    marginLeft: 8,
    marginRight: 'auto',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  senderText: {
    color: '#fff',
  },
  receiverText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
  },
  iconButton: {
    padding: 5,
    marginHorizontal: 2,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 5,
    color: '#000',
    maxHeight: 100,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    padding: 8,
    marginLeft: 5,
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5E5',
    shadowOpacity: 0,
    elevation: 0,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 5,
    backgroundColor: '#f5f5f5',
  },
  messageStatus: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
    marginRight: 4,
  },
  statusIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
  },
  messageStatusText: {
    fontSize: 12,
    color: '#8e8e8e',
    marginLeft: 2,
  },
  timeText: {
    fontSize: 12,
    marginTop: 4,
  },
  senderTimeText: {
    color: '#fff',
    opacity: 0.8,
    textAlign: 'right',
  },
  receiverTimeText: {
    color: '#666',
    textAlign: 'left',
  },
  messageOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  senderOptions: {
    marginLeft: 'auto',
    marginRight: 8,
  },
  receiverOptions: {
    marginLeft: 8,
    marginRight: 'auto',
  },
  optionButton: {
    padding: 6,
    marginHorizontal: 2,
  },
  reactionsMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    zIndex: 1000,
    bottom: '100%',
    marginBottom: 8,
    width: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  senderReactions: {
    right: 0,
  },
  receiverReactions: {
    left: 0,
  },
  reactionsList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  reactionButton: {
    padding: 4,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  optionsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  optionItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 15,
    color: '#000',
  },
  optionSeparator: {
    width: 1,
    height: '80%',
    backgroundColor: '#E5E5E5',
  },
  deleteOption: {
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  deleteOptionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  deleteOptionText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelOption: {
    borderTopWidth: 8,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#fff',
  },
  cancelOptionText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  replyContent: {
    flex: 1,
    marginRight: 10,
  },
  replyLabel: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
    color: '#666',
  },
  cancelReplyButton: {
    padding: 5,
  },
  replyPreview: {
    borderLeftWidth: 2,
    paddingLeft: 8,
    marginBottom: 4,
    borderRadius: 4,
    padding: 4,
    maxWidth: '80%',
  },
  senderReplyPreview: {
    marginLeft: 'auto',
    marginRight: 8,
    borderLeftColor: '#007AFF',
  },
  receiverReplyPreview: {
    marginLeft: 8,
    marginRight: 'auto',
    borderLeftColor: '#666',
  },
  replyPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyPreviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  replyPreviewText: {
    fontSize: 13,
    color: '#666',
    opacity: 0.9,
  },
  messageReaction: {
    position: 'absolute',
    bottom: -8,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  deleteModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalDeleteOption: {
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modalDeleteBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  modalDeleteText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
  modalCancelOption: {
    borderTopWidth: 8,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#fff',
  },
  modalCancelText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  deletedMessageBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  deletedMessageText: {
    color: '#666',
    fontStyle: 'italic',
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateHeaderText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  forwardModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  forwardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  forwardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#3A3A3C',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  userName: {
    fontSize: 16,
    color: '#fff',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-between',
  },
  editContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  cancelEditButton: {
    padding: 5,
  },
  editedText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  pinnedSection: {
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pinnedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedHeaderText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  pinnedList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pinnedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  pinnedItemContent: {
    flex: 1,
    marginRight: 8,
  },
  pinnedItemText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 24,
  },
  unpinButton: {
    padding: 8,
    borderRadius: 16,
  },
  pinnedIcon: {
    position: 'absolute',
    top: -15,
    left: -15,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    maxWidth: '70%',
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  audioProgressContainer: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginHorizontal: 10,
  },
  audioProgress: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  recordingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 10,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelRecordingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stopRecordingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 