import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, db } from '../../../src/config/firebaseConfig';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import SelectUserModal from '../../components/SelectUserModal';
import TimePickerDropdown from '../../components/TimePickerDropdown';
import DateTimePickerModal from '../../components/DatePickerModal';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hôm nay';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Ngày mai';
  } else {
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const formatDateTime = (dateString: string) => {
  return `${formatDate(dateString)} ${formatTime(dateString)}`;
};

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

const AddSubtaskModal = ({ 
  visible, 
  onClose, 
  onAdd,
  allUsers,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (subtask: {
    title: string;
    assignees: User[];
    startDate?: string;
    endDate?: string;
  }) => void;
  allUsers: User[];
}) => {
  const [title, setTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [isSelectUserModalVisible, setIsSelectUserModalVisible] = useState(false);

  const handleModalSelectUser = (user: User) => {
    const isUserSelected = selectedUsers.some(selectedUser => selectedUser.id === user.id);
    if (isUserSelected) {
      setSelectedUsers(selectedUsers.filter(selectedUser => selectedUser.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
    setIsSelectUserModalVisible(false);
  };

  const handleDateSelect = (dates: {
    startDate?: Date;
    endDate?: Date;
    startTime?: { hours: string; minutes: string };
    endTime?: { hours: string; minutes: string };
  }) => {
    if (dates.startDate) {
      let startDateTime = new Date(dates.startDate);
      if (dates.startTime) {
        startDateTime.setHours(parseInt(dates.startTime.hours));
        startDateTime.setMinutes(parseInt(dates.startTime.minutes));
      }
      setStartDate(startDateTime.toISOString());
    }
    if (dates.endDate) {
      let endDateTime = new Date(dates.endDate);
      if (dates.endTime) {
        endDateTime.setHours(parseInt(dates.endTime.hours));
        endDateTime.setMinutes(parseInt(dates.endTime.minutes));
      }
      setEndDate(endDateTime.toISOString());
    }
  };

  const handleAdd = () => {
    if (title.trim()) {
      onAdd({
        title: title.trim(),
        assignees: selectedUsers,
        startDate,
        endDate,
      });
      setTitle('');
      setSelectedUsers([]);
      setStartDate(undefined);
      setEndDate(undefined);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thêm tác vụ con</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.subtaskInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Nhập tiêu đề tác vụ con"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity 
              style={styles.modalSection}
              onPress={() => setIsSelectUserModalVisible(true)}
            >
              <View style={styles.sectionRow}>
                <Ionicons name="person-outline" size={24} color="#666" />
                <Text style={styles.sectionText}>
                  {selectedUsers.length > 0 
                    ? `${selectedUsers.length} người được chọn`
                    : 'Chọn người thực hiện'}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalSection}
              onPress={() => {
                setDatePickerMode('start');
                setIsDatePickerVisible(true);
              }}
            >
              <View style={styles.sectionRow}>
                <Ionicons name="calendar-outline" size={24} color="#666" />
                <View style={styles.dateContent}>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => {
                      setDatePickerMode('start');
                      setIsDatePickerVisible(true);
                    }}
                  >
                    <Text style={styles.dateLabel}>Bắt đầu:</Text>
                    <Text style={styles.dateText}>
                      {startDate ? formatDateTime(startDate) : 'Chọn ngày bắt đầu'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => {
                      setDatePickerMode('end');
                      setIsDatePickerVisible(true);
                    }}
                  >
                    <Text style={styles.dateLabel}>Kết thúc:</Text>
                    <Text style={styles.dateText}>
                      {endDate ? formatDateTime(endDate) : 'Chọn ngày kết thúc'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[
              styles.addButton,
              !title.trim() && styles.addButtonDisabled
            ]}
            onPress={handleAdd}
            disabled={!title.trim()}
          >
            <Text style={[
              styles.addButtonText,
              !title.trim() && styles.addButtonTextDisabled
            ]}>
              Thêm
            </Text>
          </TouchableOpacity>
        </View>

        <SelectUserModal
          visible={isSelectUserModalVisible}
          onClose={() => setIsSelectUserModalVisible(false)}
          onSelectUser={handleModalSelectUser}
          users={allUsers}
          selectedUsers={selectedUsers}
        />

        <DateTimePickerModal
          visible={isDatePickerVisible}
          onClose={() => setIsDatePickerVisible(false)}
          onSelectDate={handleDateSelect}
        />
      </View>
    </Modal>
  );
};

const TaskDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [title, setTitle] = useState(params.title as string || '');
  const [description, setDescription] = useState(params.description as string || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSelectUserModalVisible, setIsSelectUserModalVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [startDate, setStartDate] = useState<string | undefined>(params.startDate as string);
  const [endDate, setEndDate] = useState<string | undefined>(params.endDate as string);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [subtasks, setSubtasks] = useState<Array<{
    id: string;
    title: string;
    completed: boolean;
    assignees?: User[];
    startDate?: string;
    endDate?: string;
  }>>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [isSubtaskDatePickerVisible, setIsSubtaskDatePickerVisible] = useState(false);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);
  const [subtaskDatePickerMode, setSubtaskDatePickerMode] = useState<'start' | 'end'>('start');
  const currentUser = auth.currentUser;
  const [isAddSubtaskModalVisible, setIsAddSubtaskModalVisible] = useState(false);
  const [isSubtaskUserModalVisible, setIsSubtaskUserModalVisible] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchUsers();
    checkOwnership();
  }, [params.assignees]);

  const checkOwnership = () => {
    if (params.assignees) {
      try {
        const parsedAssignees = JSON.parse(params.assignees as string);
        const currentUserId = currentUser?.uid;
        const isTaskOwner = parsedAssignees.some((user: User) => user.id === currentUserId);
        setIsOwner(isTaskOwner);
      } catch (error) {
        console.error('Lỗi khi kiểm tra quyền sở hữu:', error);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        displayName: doc.data().displayName || doc.data().email
      })) as User[];
      setAllUsers(usersData);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng:', error);
    }
  };

  useEffect(() => {
    if (params.assignees) {
      try {
        const parsedAssignees = JSON.parse(params.assignees as string);
        setSelectedUsers(parsedAssignees);
      } catch (error) {
        console.error('Lỗi khi parse assignees:', error);
      }
    }
  }, [params.assignees]);

  useEffect(() => {
    if (params.subtasks) {
      try {
        const parsedSubtasks = JSON.parse(params.subtasks as string);
        setSubtasks(parsedSubtasks);
      } catch (error) {
        console.error('Lỗi khi parse subtasks:', error);
      }
    }
  }, [params.subtasks]);

  const handleBack = () => {
    router.back();
  };

  const handleAddSubtask = (newSubtaskData: {
    title: string;
    assignees: User[];
    startDate?: string;
    endDate?: string;
  }) => {
    const newSubtask = {
      id: Date.now().toString(),
      title: newSubtaskData.title,
      completed: false,
      assignees: newSubtaskData.assignees,
      startDate: newSubtaskData.startDate,
      endDate: newSubtaskData.endDate,
    };

    const updatedSubtasks = [...subtasks, newSubtask];
    setSubtasks(updatedSubtasks);

    if (params.id) {
      const taskRef = doc(db, 'tasks', params.id as string);
      updateDoc(taskRef, {
        subtasks: updatedSubtasks,
        updatedAt: new Date()
      }).catch(error => {
        console.error('Lỗi khi thêm tác vụ con:', error);
      });
    }
  };

  const checkSubtaskAssignee = (taskId: string) => {
    const task = subtasks.find(task => task.id === taskId);
    if (!task) return false;
    
    const currentUserId = currentUser?.uid;
    return task.assignees?.some(assignee => assignee.id === currentUserId) || false;
  };

  const handleToggleSubtask = async (taskId: string) => {
    const canToggle = isOwner || checkSubtaskAssignee(taskId);
    if (!canToggle) return;

    const updatedSubtasks = subtasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    
    setSubtasks(updatedSubtasks);

    if (params.id) {
      try {
        const taskRef = doc(db, 'tasks', params.id as string);
        await updateDoc(taskRef, {
          subtasks: updatedSubtasks,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái tác vụ con:', error);
      }
    }
  };

  const handleUpdateTask = async () => {
    try {
      if (params.id) {
        const taskRef = doc(db, 'tasks', params.id as string);
        await updateDoc(taskRef, {
          title,
          description,
          assignees: selectedUsers,
          startDate,
          endDate,
          updatedAt: new Date()
        });
      }
      router.back();
    } catch (error) {
      console.error('Lỗi khi cập nhật nhiệm vụ:', error);
    }
  };

  const handleDateSelect = (dates: {
    startDate?: Date;
    endDate?: Date;
    startTime?: { hours: string; minutes: string };
    endTime?: { hours: string; minutes: string };
  }) => {
    if (dates.startDate) {
      let startDateTime = new Date(dates.startDate);
      if (dates.startTime) {
        startDateTime.setHours(parseInt(dates.startTime.hours));
        startDateTime.setMinutes(parseInt(dates.startTime.minutes));
      }
      setStartDate(startDateTime.toISOString());
    }
    if (dates.endDate) {
      let endDateTime = new Date(dates.endDate);
      if (dates.endTime) {
        endDateTime.setHours(parseInt(dates.endTime.hours));
        endDateTime.setMinutes(parseInt(dates.endTime.minutes));
      }
      setEndDate(endDateTime.toISOString());
    }
  };

  const handleCloseDatePicker = async () => {
    setIsDatePickerVisible(false);
    if (params.id && (startDate || endDate)) {
      try {
        const taskRef = doc(db, 'tasks', params.id as string);
        await updateDoc(taskRef, {
          startDate,
          endDate,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Lỗi khi cập nhật thời gian:', error);
      }
    }
  };

  const openDatePicker = (mode: 'start' | 'end') => {
    setDatePickerMode(mode);
    setIsDatePickerVisible(true);
  };

  const handleSubtaskDateSelect = (dates: {
    startDate?: Date;
    endDate?: Date;
    startTime?: { hours: string; minutes: string };
    endTime?: { hours: string; minutes: string };
  }) => {
    if (!selectedSubtaskId) return;

    setSubtasks(subtasks.map(task => {
      if (task.id === selectedSubtaskId) {
        let updatedTask = { ...task };
        
        if (dates.startDate) {
          let startDateTime = new Date(dates.startDate);
          if (dates.startTime) {
            startDateTime.setHours(parseInt(dates.startTime.hours));
            startDateTime.setMinutes(parseInt(dates.startTime.minutes));
          }
          updatedTask.startDate = startDateTime.toISOString();
        }
        
        if (dates.endDate) {
          let endDateTime = new Date(dates.endDate);
          if (dates.endTime) {
            endDateTime.setHours(parseInt(dates.endTime.hours));
            endDateTime.setMinutes(parseInt(dates.endTime.minutes));
          }
          updatedTask.endDate = endDateTime.toISOString();
        }
        
        return updatedTask;
      }
      return task;
    }));
  };

  const handleCloseSubtaskDatePicker = async () => {
    setIsSubtaskDatePickerVisible(false);
    if (selectedSubtaskId) {
      const updatedSubtask = subtasks.find(task => task.id === selectedSubtaskId);
      if (updatedSubtask) {
        try {
          const taskRef = doc(db, 'tasks', params.id as string);
          await updateDoc(taskRef, {
            subtasks: subtasks,
            updatedAt: new Date()
          });
        } catch (error) {
          console.error('Lỗi khi cập nhật thời gian tác vụ con:', error);
        }
      }
    }
  };

  const openSubtaskDatePicker = (taskId: string, mode: 'start' | 'end') => {
    setSelectedSubtaskId(taskId);
    setSubtaskDatePickerMode(mode);
    setIsSubtaskDatePickerVisible(true);
  };

  const handleMainTaskSelectUser = async (user: User) => {
    const isUserSelected = selectedUsers.some(selectedUser => selectedUser.id === user.id);
    
    const updatedUsers = isUserSelected 
      ? selectedUsers.filter(selectedUser => selectedUser.id !== user.id)
      : [...selectedUsers, user];
    
    setSelectedUsers(updatedUsers);
    setIsSelectUserModalVisible(false);

    // Tự động lưu khi thay đổi người thực hiện và đang ở chế độ chỉnh sửa
    if (params.id && isEditing) {
      try {
        const taskRef = doc(db, 'tasks', params.id as string);
        await updateDoc(taskRef, {
          assignees: updatedUsers,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Lỗi khi cập nhật người thực hiện:', error);
      }
    }
  };

  const handleSubtaskSelectUser = async (user: User) => {
    if (!selectedSubtaskId) return;

    const updatedSubtasks = subtasks.map(task => {
      if (task.id === selectedSubtaskId) {
        const currentAssignees = task.assignees || [];
        const isUserSelected = currentAssignees.some(assignee => assignee.id === user.id);
        
        let updatedAssignees;
        if (isUserSelected) {
          updatedAssignees = currentAssignees.filter(assignee => assignee.id !== user.id);
        } else {
          updatedAssignees = [...currentAssignees, user];
        }

        return {
          ...task,
          assignees: updatedAssignees
        };
      }
      return task;
    });

    setSubtasks(updatedSubtasks);
    
    // Tự động lưu thay đổi vào Firestore
    if (params.id) {
      try {
        const taskRef = doc(db, 'tasks', params.id as string);
        await updateDoc(taskRef, {
          subtasks: updatedSubtasks,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Lỗi khi cập nhật người thực hiện tác vụ con:', error);
      }
    }
  };

  const openSubtaskUserModal = (taskId: string) => {
    if (!isEditing) return;
    setSelectedSubtaskId(taskId);
    setIsSubtaskUserModalVisible(true);
  };

  const handleDeleteSubtask = async (taskId: string) => {
    const updatedSubtasks = subtasks.filter(task => task.id !== taskId);
    setSubtasks(updatedSubtasks);

    if (params.id) {
      try {
        const taskRef = doc(db, 'tasks', params.id as string);
        await updateDoc(taskRef, {
          subtasks: updatedSubtasks,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Lỗi khi xóa tác vụ con:', error);
      }
    }
  };

  const handleUpdateSubtaskTitle = async (taskId: string, newTitle: string) => {
    const updatedSubtasks = subtasks.map(task => 
      task.id === taskId ? { ...task, title: newTitle } : task
    );
    setSubtasks(updatedSubtasks);

    if (params.id) {
      try {
        const taskRef = doc(db, 'tasks', params.id as string);
        await updateDoc(taskRef, {
          subtasks: updatedSubtasks,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Lỗi khi cập nhật tiêu đề tác vụ con:', error);
      }
    }
  };

  const renderAssignees = () => {
    if (!selectedUsers || selectedUsers.length === 0) {
      return (
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {currentUser?.email?.[0].toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userEmail}>{currentUser?.email || 'User'}</Text>
        </View>
      );
    }

    if (selectedUsers.length === 1) {
      const assignee = selectedUsers[0];
      return (
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(assignee.displayName || assignee.email)[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userEmail}>
            {assignee.displayName || assignee.email}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.userInfo}>
        <View style={styles.avatarsContainer}>
          {selectedUsers.slice(0, 3).map((assignee, index) => (
            <View 
              key={assignee.id} 
              style={[
                styles.avatarContainer,
                { marginLeft: index > 0 ? -12 : 0 }
              ]}
            >
              <Text style={styles.avatarText}>
                {(assignee.displayName || assignee.email)[0].toUpperCase()}
              </Text>
            </View>
          ))}
          {selectedUsers.length > 3 && (
            <View style={[styles.avatarContainer, { marginLeft: -12 }]}>
              <Text style={styles.avatarText}>+{selectedUsers.length - 3}</Text>
            </View>
          )}
        </View>
        <Text style={styles.assigneeCount}>
          {selectedUsers.length} người đã sở hữu nhiệm vụ
        </Text>
      </View>
    );
  };

  const renderSubtasks = () => {
    if (subtasks.length === 0) {
      return (
        <View style={styles.emptySubtasks}>
          <Text style={styles.emptyText}>Không có tác vụ con</Text>
        </View>
      );
    }

    return subtasks.map((task) => {
      const canToggle = isOwner || checkSubtaskAssignee(task.id);
      return (
        <View key={task.id} style={styles.subtaskItem}>
          <View style={styles.subtaskContent}>
            <View style={styles.subtaskLeft}>
              <TouchableOpacity 
                style={[
                  styles.checkbox, 
                  task.completed && styles.checkboxChecked,
                  !canToggle && styles.checkboxDisabled
                ]}
                onPress={() => handleToggleSubtask(task.id)}
                disabled={!canToggle}
              >
                {task.completed && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
              {isEditing && isOwner ? (
                <TextInput
                  style={[
                    styles.subtaskTitleInput,
                    task.completed && styles.subtaskTitleCompleted
                  ]}
                  value={task.title}
                  onChangeText={(text) => handleUpdateSubtaskTitle(task.id, text)}
                  placeholder="Nhập tiêu đề tác vụ con"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={[
                  styles.subtaskTitle, 
                  task.completed && styles.subtaskTitleCompleted
                ]}>
                  {task.title}
                </Text>
              )}
            </View>

            <View style={styles.subtaskRight}>
              {isEditing && (
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSubtask(task.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => openSubtaskDatePicker(task.id, 'start')}
                disabled={!isEditing}
              >
                <Ionicons name="calendar-outline" size={16} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.subtaskAssignees}
                onPress={() => openSubtaskUserModal(task.id)}
                disabled={!isEditing}
              >
                {task.assignees && task.assignees.length > 0 ? (
                  <>
                    {task.assignees.slice(0, 3).map((assignee, index) => (
                      <View 
                        key={assignee.id} 
                        style={[
                          styles.smallAvatarContainer, 
                          { 
                            backgroundColor: '#007AFF',
                            marginLeft: index > 0 ? -8 : 0,
                            zIndex: task.assignees ? task.assignees.length - index : 0
                          }
                        ]}
                      >
                        <Text style={styles.smallAvatarText}>
                          {(assignee.displayName || assignee.email)[0].toUpperCase()}
                        </Text>
                      </View>
                    ))}
                    {task.assignees.length > 3 && (
                      <View style={[styles.smallAvatarContainer, { 
                        backgroundColor: '#666',
                        marginLeft: -8,
                        zIndex: 0
                      }]}>
                        <Text style={styles.smallAvatarText}>
                          +{task.assignees.length - 3}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.defaultUserIcon}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.subtaskDateContainer}>
            <TouchableOpacity 
              style={styles.subtaskDateButton}
              onPress={() => openSubtaskDatePicker(task.id, 'start')}
              disabled={!isEditing}
            >
              <Text style={styles.subtaskDateLabel}>Bắt đầu:</Text>
              <Text style={styles.subtaskDateText}>
                {task.startDate ? formatDateTime(task.startDate) : 'Chọn ngày bắt đầu'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.subtaskDateButton}
              onPress={() => openSubtaskDatePicker(task.id, 'end')}
              disabled={!isEditing}
            >
              <Text style={styles.subtaskDateLabel}>Kết thúc:</Text>
              <Text style={styles.subtaskDateText}>
                {task.endDate ? formatDateTime(task.endDate) : 'Chọn ngày kết thúc'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.saveButton}>{isEditing ? 'Lưu' : 'Sửa'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Thêm nhiệm vụ"
            placeholderTextColor="#999"
            editable={isEditing && isOwner}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Thêm mô tả"
            placeholderTextColor="#999"
            multiline
            editable={isEditing && isOwner}
          />
        </View>

        <TouchableOpacity 
          style={styles.assigneeSection}
          disabled={!isEditing || !isOwner}
          onPress={() => isEditing && isOwner && setIsSelectUserModalVisible(true)}
        >
          <View style={styles.sectionRow}>
            <Ionicons name="person-outline" size={24} color="#666" />
            {renderAssignees()}
            {isEditing && isOwner && <Ionicons name="chevron-forward" size={24} color="#666" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dateSection}
          disabled={!isEditing || !isOwner}
          onPress={() => isEditing && isOwner && openDatePicker('start')}
        >
          <View style={styles.sectionRow}>
            <Ionicons name="calendar-outline" size={24} color="#666" />
            <View style={styles.dateContent}>
              <TouchableOpacity 
                style={styles.dateButton}
                disabled={!isEditing || !isOwner}
                onPress={() => isEditing && isOwner && openDatePicker('start')}
              >
                <Text style={styles.dateLabel}>Bắt đầu:</Text>
                <Text style={styles.dateText}>
                  {startDate ? formatDateTime(startDate) : 'Chọn ngày bắt đầu'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dateButton}
                disabled={!isEditing || !isOwner}
                onPress={() => isEditing && isOwner && openDatePicker('end')}
              >
                <Text style={styles.dateLabel}>Kết thúc:</Text>
                <Text style={styles.dateText}>
                  {endDate ? formatDateTime(endDate) : 'Chọn ngày kết thúc'}
                </Text>
              </TouchableOpacity>
            </View>
            {isEditing && isOwner && <Ionicons name="chevron-forward" size={24} color="#666" />}
          </View>
        </TouchableOpacity>

        <View style={styles.subtaskSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-branch-outline" size={24} color="#666" />
            <Text style={styles.sectionHeaderText}>Tác vụ con</Text>
          </View>
          {renderSubtasks()}
          
          {isEditing && isOwner && (
            <TouchableOpacity 
              style={styles.addSubtaskButton}
              onPress={() => setIsAddSubtaskModalVisible(true)}
            >
              <Ionicons name="add" size={24} color="#007AFF" />
              <Text style={styles.addSubtaskText}>Thêm tác vụ con</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.attachmentButton}>
          <Ionicons name="attach" size={24} color="#666" />
          <Text style={styles.attachmentButtonText}>Thêm tập tin đính kèm</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddSubtaskModal
        visible={isAddSubtaskModalVisible}
        onClose={() => setIsAddSubtaskModalVisible(false)}
        onAdd={handleAddSubtask}
        allUsers={allUsers}
      />

      <SelectUserModal
        visible={isSelectUserModalVisible}
        onClose={() => setIsSelectUserModalVisible(false)}
        onSelectUser={handleMainTaskSelectUser}
        users={allUsers}
        selectedUsers={selectedUsers}
      />

      <SelectUserModal
        visible={isSubtaskUserModalVisible}
        onClose={() => setIsSubtaskUserModalVisible(false)}
        onSelectUser={handleSubtaskSelectUser}
        users={allUsers}
        selectedUsers={selectedSubtaskId ? 
          (subtasks.find(task => task.id === selectedSubtaskId)?.assignees || []) as User[] : 
          []
        }
      />

      <DateTimePickerModal
        visible={isDatePickerVisible}
        onClose={handleCloseDatePicker}
        onSelectDate={handleDateSelect}
      />
      <DateTimePickerModal
        visible={isSubtaskDatePickerVisible}
        onClose={handleCloseSubtaskDatePicker}
        onSelectDate={handleSubtaskDateSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  inputContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '600',
  },
  descriptionInput: {
    fontSize: 16,
    minHeight: 40,
  },
  assigneeSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  subtaskSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  emptySubtasks: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  subtaskItem: {
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  subtaskContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subtaskRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  subtaskTitle: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  subtaskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  dateButton: {
    padding: 4,
  },
  smallAvatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  smallAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  subtaskDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subtaskDateButton: {
    flex: 1,
    padding: 4,
  },
  subtaskDateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  subtaskDateText: {
    fontSize: 12,
    color: '#333',
  },
  addSubtaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  addSubtaskText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  attachmentButtonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 16,
    color: '#333',
  },
  assigneeCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  defaultUserIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  subtaskAssignees: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContent: {
    flex: 1,
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    marginBottom: 16,
  },
  subtaskInput: {
    fontSize: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  modalSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: '#666',
  },
  deleteButton: {
    padding: 4,
    marginRight: 8,
  },
  subtaskTitleInput: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    padding: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
});

export default TaskDetailScreen;
