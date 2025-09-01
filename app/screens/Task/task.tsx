import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Alert, PanResponder, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomMenu from '../../components/BottomMenu';
import AddTaskModal from '../../components/AddTaskModal';
import { auth, db } from '../../../src/config/firebaseConfig';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, or } from 'firebase/firestore';
import StatisticsReport from '../../components/StatisticsReport';

interface UserData {
  fullName: string;
  email: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: any;
  createdBy: {
    id: string;
    displayName: string;
    email: string;
    photoURL: string | null;
  };
  assignees: {
    id: string;
    displayName: string;
    email: string;
    photoURL: string | null;
  }[];
  subtasks: {
    id: string;
    title: string;
    completed: boolean;
    startDate: string | null;
    endDate: string | null;
    assignees: {
      id: string;
      displayName: string;
      email: string;
      photoURL: string | null;
    }[];
  }[];
  attachments: {
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

const TaskScreen = () => {
  const router = useRouter();
  const user = auth.currentUser;
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeMenu, setActiveMenu] = useState('created');
  const [isAddTaskModalVisible, setIsAddTaskModalVisible] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [deletedTaskId, setDeletedTaskId] = useState<string | null>(null);
  const fadeAnim = new Animated.Value(1);
  const deleteFadeAnim = new Animated.Value(1);

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

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        console.log('Current user ID:', user.uid);
        
        const tasksRef = collection(db, 'tasks');
        // Tạo query để lấy tất cả nhiệm vụ
        const q = query(
          tasksRef,
          or(
            where('status', '==', 'active'),
            where('status', '==', 'completed')
          )
        );

        const unsubscribe = onSnapshot(q, 
          (snapshot) => {
            console.log('Query snapshot:', snapshot.size);
            
            if (snapshot.empty) {
              console.log('Không tìm thấy nhiệm vụ nào');
              setTasks([]);
              setIsLoading(false);
              return;
            }

            const taskList: Task[] = [];
            snapshot.forEach((doc) => {
              console.log('Document data:', doc.data());
              const data = doc.data();
              if (data) {
                const taskData = {
                  id: doc.id,
                  title: data.title || '',
                  description: data.description || '',
                  startDate: data.startDate || null,
                  endDate: data.endDate || null,
                  status: data.status || 'active',
                  createdAt: data.createdAt,
                  createdBy: data.createdBy || {},
                  assignees: data.assignees || [],
                  subtasks: data.subtasks || [],
                  attachments: data.attachments || []
                } as Task;
                taskList.push(taskData);
              }
            });

            // Sắp xếp tasks theo thời gian tạo mới nhất
            taskList.sort((a, b) => {
              const dateA = a.createdAt?.toDate?.() || new Date(0);
              const dateB = b.createdAt?.toDate?.() || new Date(0);
              return dateB.getTime() - dateA.getTime();
            });

            console.log('Processed task list:', taskList);
            setTasks(taskList);
            setIsLoading(false);
          },
          (error) => {
            console.error('Error in snapshot listener:', error);
            setIsLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Error in fetchTasks:', error);
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  // Thêm useEffect để debug tasks state
  useEffect(() => {
    console.log('Current tasks:', tasks);
  }, [tasks]);

  const getInitial = useCallback(() => {
    if (!userData?.fullName) return '?';
    return userData.fullName.charAt(0).toUpperCase();
  }, [userData]);

  const handleMenuSelect = useCallback((menuId: string) => {
    setActiveMenu(menuId);
  }, []);

  const handleAddTask = useCallback((taskData: any) => {
    // Không cần xử lý thêm ở đây vì đã có onSnapshot
    console.log('New task:', taskData);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return `${date.getDate()} tháng ${date.getMonth() + 1} ${days[date.getDay()]}`;
  };

  const handleCompleteTask = async (taskId: string, currentStatus: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: currentStatus === 'completed' ? 'active' : 'completed',
        updatedAt: new Date()
      });

      if (currentStatus !== 'completed') {
        setCompletedTaskId(taskId);
        // Hiển thị thông báo
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCompletedTaskId(null);
        });
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái nhiệm vụ:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
      
      setDeletedTaskId(taskId);
      Animated.sequence([
        Animated.timing(deleteFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(deleteFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDeletedTaskId(null);
      });
    } catch (error) {
      console.error('Lỗi khi xóa nhiệm vụ:', error);
      Alert.alert('Lỗi', 'Không thể xóa nhiệm vụ. Vui lòng thử lại.');
    }
  };

  const showDeleteConfirmation = (taskId: string) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa nhiệm vụ này?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => handleDeleteTask(taskId),
        },
      ]
    );
  };

  const renderTaskItem = (task: Task) => {
    const isOverdue = task.endDate && new Date(task.endDate) < new Date() && task.status === 'active';
    
    return (
      <TouchableOpacity 
        key={task.id} 
        style={[
          styles.taskItem,
          isOverdue && styles.overdueTask
        ]}
        onPress={() => router.push({
          pathname: '/screens/Task/task-detail',
          params: {
            id: task.id,
            title: task.title,
            description: task.description,
            startDate: task.startDate,
            endDate: task.endDate,
            status: task.status,
            assignees: JSON.stringify(task.assignees),
            subtasks: JSON.stringify(task.subtasks),
            attachments: JSON.stringify(task.attachments)
          }
        })}
        onLongPress={() => {
          Alert.alert(
            'Quản lý nhiệm vụ',
            'Bạn muốn thực hiện thao tác gì?',
            [
              {
                text: 'Hủy',
                style: 'cancel'
              },
              {
                text: 'Xóa nhiệm vụ',
                style: 'destructive',
                onPress: () => {
                  Alert.alert(
                    'Xác nhận xóa',
                    'Bạn có chắc chắn muốn xóa nhiệm vụ này?',
                    [
                      {
                        text: 'Hủy',
                        style: 'cancel'
                      },
                      {
                        text: 'Xóa',
                        style: 'destructive',
                        onPress: () => handleDeleteTask(task.id)
                      }
                    ]
                  );
                }
              }
            ]
          );
        }}
        delayLongPress={500}
      >
        <View style={styles.taskHeader}>
          <TouchableOpacity 
            style={styles.checkbox}
            onPress={(e) => {
              e.stopPropagation(); // Ngăn chặn sự kiện lan truyền lên parent
              handleCompleteTask(task.id, task.status);
            }}
          >
            <View style={[
              styles.checkboxInner,
              task.status === 'completed' && styles.checkboxChecked
            ]}>
              {task.status === 'completed' && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          
          <View style={styles.taskContent}>
            <View style={styles.taskTitleRow}>
              <Text style={[
                styles.taskTitle,
                task.status === 'completed' && styles.taskTitleCompleted,
                isOverdue && styles.overdueText
              ]}>{task.title}</Text>
              {task.subtasks.length > 0 && (
                <Text style={[
                  styles.subtaskCount,
                  isOverdue && styles.overdueText
                ]}>
                  {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                </Text>
              )}
            </View>
            
            {task.description && (
              <Text style={[
                styles.taskDescription,
                task.status === 'completed' && styles.taskDescriptionCompleted,
                isOverdue && styles.overdueText
              ]} numberOfLines={2}>
                {task.description}
              </Text>
            )}

            {(task.startDate || task.endDate) && (
              <View style={styles.taskDate}>
                <Ionicons 
                  name="time-outline" 
                  size={16} 
                  color={isOverdue ? '#FF3B30' : '#666'} 
                />
                <Text style={[
                  styles.dateText,
                  isOverdue && styles.overdueText
                ]}>
                  {task.startDate && task.endDate 
                    ? `${formatDate(task.startDate)} - ${formatDate(task.endDate)}`
                    : task.startDate 
                      ? `Bắt đầu: ${formatDate(task.startDate)}`
                      : `Kết thúc: ${formatDate(task.endDate)}`
                  }
                </Text>
              </View>
            )}

            <View style={styles.taskFooter}>
              {task.assignees.length > 0 && (
                <View style={styles.assignees}>
                  {task.assignees.slice(0, 3).map((assignee, index) => (
                    <View 
                      key={assignee.id} 
                      style={[
                        styles.assigneeAvatar,
                        index > 0 && { marginLeft: -10 },
                        isOverdue && styles.assigneeAvatarOverdue
                      ]}
                    >
                      <Text style={styles.assigneeInitial}>
                        {assignee.displayName?.[0] || assignee.email[0]}
                      </Text>
                    </View>
                  ))}
                  {task.assignees.length > 3 && (
                    <View style={[
                      styles.assigneeAvatar, 
                      { marginLeft: -10 },
                      isOverdue && styles.assigneeAvatarOverdue
                    ]}>
                      <Text style={styles.assigneeInitial}>+{task.assignees.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}

              {task.attachments.length > 0 && (
                <View style={styles.attachmentInfo}>
                  <Ionicons 
                    name="attach-outline" 
                    size={16} 
                    color={isOverdue ? '#FF3B30' : '#666'} 
                  />
                  <Text style={[
                    styles.attachmentCount,
                    isOverdue && styles.overdueText
                  ]}>{task.attachments.length}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Thêm hàm lọc tasks theo trạng thái
  const getFilteredTasks = useCallback(() => {
    switch (activeMenu) {
      case 'created':
        return tasks.filter(task => task.status === 'active');
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      case 'overdue':
        const now = new Date();
        return tasks.filter(task => {
          if (!task.endDate) return false;
          const endDate = new Date(task.endDate);
          return endDate < now && task.status === 'active';
        });
      case 'report':
        return tasks;
      default:
        return tasks;
    }
  }, [tasks, activeMenu]);

  const renderContent = useCallback(() => (
    <View style={styles.contentContainer}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : activeMenu === 'report' ? (
        <StatisticsReport />
      ) : tasks.length > 0 ? (
        getFilteredTasks().map(renderTaskItem)
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="documents-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>
            {activeMenu === 'created' && "Chưa có nhiệm vụ nào được tạo"}
            {activeMenu === 'completed' && "Chưa có nhiệm vụ nào hoàn thành"}
            {activeMenu === 'overdue' && "Không có nhiệm vụ nào quá hạn"}
          </Text>
        </View>
      )}
    </View>
  ), [isLoading, tasks, activeMenu, getFilteredTasks]);

  const renderHeader = useCallback(() => (
    <View>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
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
          <Text style={styles.headerTitle}>Nhiệm vụ</Text>
        </View>
        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="settings-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll}>
          <TouchableOpacity 
            style={[styles.menuItem, activeMenu === 'created' && styles.activeMenuItem]}
            onPress={() => handleMenuSelect('created')}
          >
            <Text style={[styles.menuText, activeMenu === 'created' && styles.activeMenuText]}>Nhiệm vụ đã tạo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, activeMenu === 'completed' && styles.activeMenuItem]}
            onPress={() => handleMenuSelect('completed')}
          >
            <Text style={[styles.menuText, activeMenu === 'completed' && styles.activeMenuText]}>Đã hoàn thành</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, activeMenu === 'overdue' && styles.activeMenuItem]}
            onPress={() => handleMenuSelect('overdue')}
          >
            <Text style={[styles.menuText, activeMenu === 'overdue' && styles.activeMenuText]}>Quá hạn</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, activeMenu === 'report' && styles.activeMenuItem]}
            onPress={() => handleMenuSelect('report')}
          >
            <Text style={[styles.menuText, activeMenu === 'report' && styles.activeMenuText]}>Báo cáo</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  ), [getInitial, handleMenuSelect, activeMenu]);

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.content}>
        {renderContent()}
      </ScrollView>

      {completedTaskId && (
        <Animated.View 
          style={[
            styles.completionMessage,
            {
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0]
                })
              }]
            }
          ]}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.completionText}>Nhiệm vụ đã hoàn thành</Text>
        </Animated.View>
      )}

      {deletedTaskId && (
        <Animated.View 
          style={[
            styles.completionMessage,
            {
              opacity: deleteFadeAnim,
              transform: [{
                translateY: deleteFadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0]
                })
              }]
            }
          ]}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={styles.completionText}>Nhiệm vụ đã được xóa</Text>
        </Animated.View>
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setIsAddTaskModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <AddTaskModal
        visible={isAddTaskModalVisible}
        onClose={() => setIsAddTaskModalVisible(false)}
        onSubmit={handleAddTask}
      />

      <BottomMenu activeScreen="task" />
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 16,
  },
  activeMenuItem: {
    backgroundColor: '#007AFF',
  },
  menuText: {
    fontSize: 14,
    color: '#666',
  },
  activeMenuText: {
    color: '#fff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loader: {
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    marginRight: 12,
    marginTop: 2,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  subtaskCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  taskDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  assignees: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  assigneeInitial: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentCount: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  completionMessage: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  completionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  overdueTask: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  overdueText: {
    color: '#FF3B30',
  },
  checkboxOverdue: {
    borderColor: '#FF3B30',
  },
  assigneeAvatarOverdue: {
    backgroundColor: '#FF3B30',
  },
  taskContainer: {
    position: 'relative',
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 12,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 13,
    width: 90,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  deleteButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default TaskScreen;