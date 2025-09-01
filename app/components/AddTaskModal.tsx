import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, SafeAreaView, Platform, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { auth, db, storage } from '../../src/config/firebaseConfig';
import { collection, query, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SelectUserModal, { User } from './SelectUserModal';
import DatePickerModal from './DatePickerModal';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (taskData: any) => void;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignees: User[];
  startDate?: Date;
  endDate?: Date;
}

interface Attachment {
  name: string;
  size: number;
  uri: string;
  mimeType: string;
}

// Thêm hàm tạo màu ngẫu nhiên
const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

// Component SelectedAvatars
const SelectedAvatars = React.memo(({ users }: { users: User[] }) => {
  const maxDisplay = 3;
  const remainingCount = Math.max(0, users.length - maxDisplay);

  return (
    <View style={styles.avatarsContainer}>
      {users.slice(0, maxDisplay).map((user, index) => {
        const backgroundColor = user.photoURL 
          ? undefined 
          : generateColorFromString(user.displayName || user.email || 'U');
        
        return (
          <View 
            key={user.id} 
            style={[
              styles.selectedAvatar,
              index > 0 && { marginLeft: -20 },
              backgroundColor && { backgroundColor }
            ]}
          >
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
        );
      })}
      {remainingCount > 0 && (
        <View style={[styles.selectedAvatar, styles.remainingCount]}>
          <Text style={styles.avatarText}>+{remainingCount}</Text>
        </View>
      )}
    </View>
  );
});

const AddTaskModal = ({ visible, onClose, onSubmit }: AddTaskModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>();
  const [showSubtaskDatePicker, setShowSubtaskDatePicker] = useState(false);
  const [selectedSubtaskForDate, setSelectedSubtaskForDate] = useState<string | null>(null);
  const [subtaskDates, setSubtaskDates] = useState<{
    [key: string]: {
      startDate?: Date;
      endDate?: Date;
    };
  }>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = auth.currentUser;

  // Reset form khi modal được mở
  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setSubtasks([]);
      setSelectedDates(undefined);
      // Reset selectedUsers về người tạo
      if (currentUser) {
        const currentUserData = {
          id: currentUser.uid,
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || undefined
        };
        setSelectedUsers([currentUserData]);
      }
    }
  }, [visible, currentUser]);

  const loadUsers = async () => {
    if (users.length === 0) {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(query(usersRef));
        const loadedUsers: User[] = [];
        snapshot.forEach(doc => {
          loadedUsers.push({ id: doc.id, ...doc.data() } as User);
        });
        setUsers(loadedUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const getAssigneeText = () => {
    if (selectedUsers.length === 0) return '';
    if (selectedUsers.length === 1) {
      return selectedUsers[0].displayName || selectedUsers[0].email;
    }
    return `${selectedUsers.length} người thực hiện`;
  };

  const addNewSubtask = () => {
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      title: '',
      completed: false,
      assignees: []
    };
    setSubtasks([...subtasks, newSubtask]);
  };

  const updateSubtaskTitle = (id: string, newTitle: string) => {
    setSubtasks(subtasks.map(task => 
      task.id === id ? { ...task, title: newTitle } : task
    ));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(task => task.id !== id));
  };

  const handleSubtaskUserSelect = (user: User) => {
    if (!selectedSubtaskId) return;
    
    setSubtasks(subtasks.map(task => {
      if (task.id === selectedSubtaskId) {
        const isSelected = task.assignees.some(u => u.id === user.id);
        const newAssignees = isSelected
          ? task.assignees.filter(u => u.id !== user.id)
          : [...task.assignees, user];
        return { ...task, assignees: newAssignees };
      }
      return task;
    }));
  };

  const openSubtaskUserModal = (subtaskId: string) => {
    setSelectedSubtaskId(subtaskId);
    loadUsers();
    setShowUserModal(true);
  };

  const handleUserModalClose = () => {
    setShowUserModal(false);
    setSelectedSubtaskId(null);
  };

  const formatDate = (date: Date) => {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return `${date.getDate()} tháng ${date.getMonth() + 1} ${days[date.getDay()]}`;
  };

  const getDateText = () => {
    if (!selectedDates) return "Thêm deadline";
    if (selectedDates.startDate && selectedDates.endDate) {
      return `${formatDate(selectedDates.startDate)} - ${formatDate(selectedDates.endDate)}`;
    }
    if (selectedDates.startDate) {
      return `Bắt đầu: ${formatDate(selectedDates.startDate)}`;
    }
    if (selectedDates.endDate) {
      return `Kết thúc: ${formatDate(selectedDates.endDate)}`;
    }
    return "Thêm deadline";
  };

  const handleSubtaskDateSelect = (dates: { startDate?: Date; endDate?: Date }) => {
    if (!selectedSubtaskForDate) return;
    
    // Cập nhật dates trong state riêng
    setSubtaskDates(prev => ({
      ...prev,
      [selectedSubtaskForDate]: dates
    }));
    
    // Cập nhật subtasks
    setSubtasks(subtasks.map(task => {
      if (task.id === selectedSubtaskForDate) {
        return { 
          ...task, 
          startDate: dates.startDate,
          endDate: dates.endDate
        };
      }
      return task;
    }));
  };

  const openSubtaskDatePicker = (subtaskId: string) => {
    setSelectedSubtaskForDate(subtaskId);
    setShowSubtaskDatePicker(true);
  };

  const getSubtaskDateText = (subtask: Subtask) => {
    if (!subtask.startDate && !subtask.endDate) return "";
    if (subtask.startDate && subtask.endDate) {
      return `${formatDate(subtask.startDate)} - ${formatDate(subtask.endDate)}`;
    }
    if (subtask.startDate) {
      return `Bắt đầu: ${formatDate(subtask.startDate)}`;
    }
    if (subtask.endDate) {
      return `Kết thúc: ${formatDate(subtask.endDate)}`;
    }
    return "";
  };

  const handleAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return;
      }

      const newAttachments = result.assets.map(asset => ({
        name: asset.name,
        size: asset.size || 0,
        uri: asset.uri,
        mimeType: asset.mimeType || 'application/octet-stream'
      }));

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Lỗi khi chọn tập tin:', error);
    }
  };

  const removeAttachment = (uri: string) => {
    setAttachments(prev => prev.filter(att => att.uri !== uri));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'image-outline';
    if (mimeType.startsWith('video/')) return 'videocam-outline';
    if (mimeType.startsWith('audio/')) return 'musical-notes-outline';
    if (mimeType.includes('pdf')) return 'document-text-outline';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document-outline';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'grid-outline';
    return 'document-attach-outline';
  };

  const uploadAttachment = async (file: Attachment) => {
    try {
      // Tạo reference đến storage với tên file ngẫu nhiên
      const fileRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
      
      // Convert uri thành blob
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Upload file
      await uploadBytes(fileRef, blob);
      
      // Lấy download URL
      const downloadURL = await getDownloadURL(fileRef);
      
      return {
        name: file.name,
        size: file.size,
        type: file.mimeType,
        url: downloadURL
      };
    } catch (error) {
      console.error('Lỗi khi upload file:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || isLoading) return;
    
    setIsLoading(true);
    try {
      // Upload tất cả các file đính kèm
      const uploadedFiles = await Promise.all(
        attachments.map(file => uploadAttachment(file))
      );

      // Tạo dữ liệu task
      const taskData = {
        title: title.trim(),
        description: description.trim() || '',
        assignees: selectedUsers.map(user => ({
          id: user.id || '',
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || ''
        })),
        subtasks: subtasks
          .filter(task => task.title.trim() !== '')
          .map(task => ({
            id: task.id,
            title: task.title.trim(),
            completed: task.completed || false,
            assignees: task.assignees.map(user => ({
              id: user.id || '',
              displayName: user.displayName || '',
              email: user.email || '',
              photoURL: user.photoURL || ''
            })),
            startDate: task.startDate ? task.startDate.toISOString() : null,
            endDate: task.endDate ? task.endDate.toISOString() : null
          })),
        startDate: selectedDates?.startDate ? selectedDates.startDate.toISOString() : null,
        endDate: selectedDates?.endDate ? selectedDates.endDate.toISOString() : null,
        attachments: uploadedFiles,
        createdBy: {
          id: auth.currentUser?.uid || '',
          displayName: auth.currentUser?.displayName || '',
          email: auth.currentUser?.email || '',
          photoURL: auth.currentUser?.photoURL || ''
        },
        createdAt: serverTimestamp(),
        status: 'active',
        updatedAt: serverTimestamp()
      };

      console.log('Bắt đầu tạo task...');
      console.log('Dữ liệu task:', taskData);

      // Lưu task vào Firestore
      const docRef = await addDoc(collection(db, 'tasks'), taskData);
      console.log('Task đã được tạo với ID:', docRef.id);
      
      // Gửi thông báo cho người được giao task chính
      const notificationsRef = collection(db, 'notifications');
      const currentUser = auth.currentUser;
      
      console.log('Người dùng hiện tại:', currentUser);
      console.log('Danh sách người thực hiện:', selectedUsers);
      
      // Gửi thông báo cho người thực hiện task chính
      for (const assignee of selectedUsers) {
        if (assignee.id !== currentUser?.uid) {
          console.log('Gửi thông báo cho người thực hiện:', assignee);
          
          const notificationData = {
            type: 'task',
            taskId: docRef.id,
            title: taskData.title,
            description: taskData.description,
            senderId: currentUser?.uid,
            senderName: currentUser?.displayName || 'Người dùng',
            senderEmail: currentUser?.email || '',
            receiverId: assignee.id,
            createdAt: serverTimestamp(),
            isRead: false
          };
          
          console.log('Dữ liệu thông báo:', notificationData);
          
          try {
            const notificationRef = await addDoc(notificationsRef, notificationData);
            console.log('Thông báo đã được gửi với ID:', notificationRef.id);
          } catch (error) {
            console.error('Lỗi khi gửi thông báo:', error);
          }
        }
      }

      // Gửi thông báo cho người thực hiện tác vụ con
      for (const subtask of subtasks) {
        if (subtask.title.trim() !== '') {
          for (const assignee of subtask.assignees) {
            if (assignee.id !== currentUser?.uid) {
              console.log('Gửi thông báo cho người thực hiện subtask:', assignee);
              
              const notificationData = {
                type: 'subtask',
                taskId: docRef.id,
                subtaskId: subtask.id,
                title: subtask.title,
                parentTaskTitle: taskData.title,
                senderId: currentUser?.uid,
                senderName: currentUser?.displayName || 'Người dùng',
                senderEmail: currentUser?.email || '',
                receiverId: assignee.id,
                createdAt: serverTimestamp(),
                isRead: false
              };
              
              console.log('Dữ liệu thông báo subtask:', notificationData);
              
              try {
                const notificationRef = await addDoc(notificationsRef, notificationData);
                console.log('Thông báo subtask đã được gửi với ID:', notificationRef.id);
              } catch (error) {
                console.error('Lỗi khi gửi thông báo subtask:', error);
              }
            }
          }
        }
      }

      // Gọi callback onSubmit
      onSubmit({ id: docRef.id, ...taskData });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedUsers([]);
      setSubtasks([]);
      setSelectedDates(undefined);
      setAttachments([]);
      
      // Đóng modal
      onClose();
      
      // Thông báo thành công
      Alert.alert('Thành công', 'Đã tạo nhiệm vụ mới');
      
    } catch (error) {
      console.error('Lỗi khi tạo nhiệm vụ:', error);
      Alert.alert('Lỗi', 'Không thể tạo nhiệm vụ. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Hủy</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={styles.titleContainer}>
            <TextInput
              style={styles.titleInput}
              placeholder="Thêm nhiệm vụ"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />
          </View>

          {/* Description Input */}
          <View style={styles.descriptionContainer}>
            <Ionicons name="menu" size={24} color="#999" style={styles.menuIcon} />
            <TextInput
              style={styles.descriptionInput}
              placeholder="Thêm mô tả"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholderTextColor="#999"
            />
          </View>

          {/* Assignee Section */}
          <TouchableOpacity 
            style={styles.assigneeSection}
            onPress={() => {
              loadUsers();
              setShowUserModal(true);
            }}
          >
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={20} color="#666" />
            </View>
            {selectedUsers.length > 0 && (
              <SelectedAvatars users={selectedUsers} />
            )}
            <Text style={styles.assigneeText}>
              {selectedUsers.length > 0 ? getAssigneeText() : "Thêm người sở hữu nhiệm vụ"}
            </Text>
            <View style={styles.dropdownButton}>
              <Text style={styles.dropdownText}>Chọn người</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          {/* Date Selection */}
          <TouchableOpacity 
            style={styles.dateSection}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dateButton}>
              <Ionicons 
                name={selectedDates ? "calendar" : "calendar-outline"} 
                size={20} 
                color={selectedDates ? "#007AFF" : "#666"} 
              />
              <Text style={[
                styles.dateButtonText,
                selectedDates && styles.selectedDateText
              ]}>
                {getDateText()}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Additional Options */}
          <View style={styles.optionsSection}>
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => setShowSubtasks(!showSubtasks)}
            >
              <Ionicons name="git-branch-outline" size={24} color="#666" />
              <Text style={styles.optionText}>Thêm tác vụ con</Text>
            </TouchableOpacity>

            {showSubtasks && (
              <View style={styles.subtaskContainer}>
                {subtasks.map((subtask, index) => (
                  <View key={subtask.id}>
                    <View style={styles.subtaskInputRow}>
                      <View style={styles.radioButton} />
                      <TextInput
                        style={styles.subtaskInput}
                        placeholder="Nhập tiêu đề tác vụ con"
                        value={subtask.title}
                        onChangeText={(text) => updateSubtaskTitle(subtask.id, text)}
                        placeholderTextColor="#999"
                      />
                      <View style={styles.subtaskActions}>
                        <TouchableOpacity onPress={() => openSubtaskDatePicker(subtask.id)}>
                          <Ionicons 
                            name={subtask.startDate || subtask.endDate ? "calendar" : "calendar-outline"} 
                            size={20} 
                            color={(subtask.startDate || subtask.endDate) ? "#007AFF" : "#666"} 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openSubtaskUserModal(subtask.id)}>
                          <View style={styles.subtaskUserIcon}>
                            {subtask.assignees.length > 0 ? (
                              <SelectedAvatars users={subtask.assignees} />
                            ) : (
                              <Ionicons name="person-outline" size={20} color="#666" />
                            )}
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeSubtask(subtask.id)}>
                          <Ionicons name="close-outline" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {(subtask.startDate || subtask.endDate) && (
                      <View style={styles.subtaskDateContainer}>
                        <Ionicons name="time-outline" size={14} color="#007AFF" />
                        <Text style={styles.subtaskDateText}>
                          {getSubtaskDateText(subtask)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addMoreSubtask} onPress={addNewSubtask}>
                  <Text style={styles.addMoreSubtaskText}>+ Thêm tác vụ con</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={handleAttachment}
            >
              <Ionicons name="attach-outline" size={24} color="#666" />
              <Text style={styles.optionText}>Thêm tập tin đính kèm</Text>
            </TouchableOpacity>

            {attachments.length > 0 && (
              <View style={styles.attachmentsContainer}>
                {attachments.map((file, index) => (
                  <View key={file.uri} style={styles.attachmentItem}>
                    <View style={styles.attachmentInfo}>
                      <Ionicons name={getFileIcon(file.mimeType)} size={24} color="#666" />
                      <View style={styles.attachmentDetails}>
                        <Text style={styles.attachmentName} numberOfLines={1}>
                          {file.name}
                        </Text>
                        <Text style={styles.attachmentSize}>
                          {formatFileSize(file.size)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => removeAttachment(file.uri)}
                      style={styles.removeAttachment}
                    >
                      <Ionicons name="close-circle-outline" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Add padding bottom for scroll content */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Create Button - Fixed at bottom */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.createButton,
              title.trim() ? styles.createButtonActive : null,
              isLoading && styles.createButtonLoading
            ]}
            onPress={handleSubmit}
            disabled={!title.trim() || isLoading}
          >
            <Text style={[
              styles.createButtonText,
              title.trim() ? styles.createButtonTextActive : null
            ]}>
              {isLoading ? 'Đang tạo...' : 'Tạo'}
            </Text>
          </TouchableOpacity>
        </View>

        <SelectUserModal
          visible={showUserModal}
          onClose={handleUserModalClose}
          selectedUsers={selectedSubtaskId ? subtasks.find(t => t.id === selectedSubtaskId)?.assignees || [] : selectedUsers}
          onSelectUser={selectedSubtaskId ? handleSubtaskUserSelect : handleSelectUser}
          users={users}
        />

        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSelectDate={setSelectedDates}
          selectedDates={selectedDates}
        />

        <DatePickerModal
          visible={showSubtaskDatePicker}
          onClose={() => {
            setShowSubtaskDatePicker(false);
            setSelectedSubtaskForDate(null);
          }}
          onSelectDate={handleSubtaskDateSelect}
          selectedDates={
            selectedSubtaskForDate 
              ? subtaskDates[selectedSubtaskForDate] || {
                  startDate: subtasks.find(t => t.id === selectedSubtaskForDate)?.startDate,
                  endDate: subtasks.find(t => t.id === selectedSubtaskForDate)?.endDate
                }
              : undefined
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    fontSize: 16,
    color: '#666',
  },
  titleContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 0,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingTop: 0,
  },
  assigneeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8f8f8',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  assigneeText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 15,
    color: '#666',
    marginRight: 4,
  },
  dateSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateButtonText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#666',
  },
  optionsSection: {
    paddingHorizontal: 14,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#666',
  },
  scrollContent: {
    flex: 1,
  },
  bottomPadding: {
    height: 80, // Adjust this value based on your footer height
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  createButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonActive: {
    backgroundColor: '#007AFF',
  },
  createButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonTextActive: {
    color: '#fff',
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
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E066FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  remainingCount: {
    backgroundColor: '#f0f0f0',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  subtaskContainer: {
    paddingLeft: 34,
    paddingRight: 14,
    paddingBottom: 10,
  },
  subtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 10,
  },
  subtaskInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 8,
  },
  subtaskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginLeft: 10,
  },
  addMoreSubtask: {
    marginLeft: 28,
    marginTop: 5,
  },
  addMoreSubtaskText: {
    color: '#666',
    fontSize: 15,
  },
  subtaskUserIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedDateText: {
    color: '#007AFF',
  },
  subtaskDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 28,
    marginTop: 4,
    marginBottom: 8,
    paddingLeft: 4,
  },
  subtaskDateText: {
    fontSize: 13,
    color: '#007AFF',
    marginLeft: 4,
  },
  attachmentsContainer: {
    paddingLeft: 34,
    paddingRight: 14,
    paddingBottom: 10,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  attachmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  attachmentDetails: {
    flex: 1,
    marginLeft: 10,
  },
  attachmentName: {
    fontSize: 14,
    color: '#333',
  },
  attachmentSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  removeAttachment: {
    padding: 4,
  },
  createButtonLoading: {
    opacity: 0.7,
  },
});

export default AddTaskModal; 