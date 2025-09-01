import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { collection, query, getDocs, where, orderBy, doc, getDoc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../src/config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Request {
  id: string;
  type: string;
  content: string;
  date: string;
  status: string;
  createdAt: any;
  userId: string;
  userName: string;
  department: string;
  runFormat?: string;
}

const RequestScreen = () => {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState('pending');
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [isAccountingMember, setIsAccountingMember] = useState(false);

  useEffect(() => {
    fetchUserDepartment();
    checkUserDepartment();
    fetchRequests(selectedTab);
  }, [selectedTab]);

  const fetchUserDepartment = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser?.uid || ""));
      if (userDoc.exists()) {
        setUserDepartment(userDoc.data().department);
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin phòng ban:", error);
    }
  };

  const checkUserDepartment = async () => {
    try {
      if (!auth.currentUser) return;

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setIsAccountingMember(userData.department === "Kế toán");
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra phòng ban:", error);
    }
  };

  const fetchRequests = async (status: string) => {
    setLoading(true);
    try {
      let q;
      const requestsRef = collection(db, 'requests');
      
      switch (status) {
        case 'pending':
          if (isAccountingMember) {
            // Lấy tất cả các request đang chờ duyệt
            q = query(
              requestsRef,
              where('status', '==', 'pending'),
              orderBy('createdAt', 'desc')
            );
          } else {
            setRequests([]);
            return;
          }
          break;
        case 'completed':
          q = query(
            requestsRef,
            where('status', '==', 'completed'),
            orderBy('createdAt', 'desc')
          );
          break;
        case 'sent':
          if (auth.currentUser) {
            q = query(
              requestsRef,
              where('userId', '==', auth.currentUser.uid),
              orderBy('createdAt', 'desc')
            );
          } else {
            setRequests([]);
            return;
          }
          break;
        default:
          q = query(requestsRef, orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      const requestsData: Request[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Request data:', data); // Debug log

        requestsData.push({
          id: doc.id,
          type: data.type || '',
          content: data.description || data.content || '',
          date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
          status: data.status || 'pending',
          createdAt: data.createdAt || '',
          userId: data.userId || '',
          userName: data.userName || data.title || 'Unknown',
          department: data.department || '',
          runFormat: data.runFormat
        });
      });

      console.log('Số lượng requests:', requestsData.length); // Debug log
      console.log('Trạng thái tab hiện tại:', status); // Debug log
      console.log('Người dùng có phải kế toán không:', isAccountingMember); // Debug log
      
      setRequests(requestsData);
    } catch (error: any) {
      console.error('Lỗi khi tải requests:', error);
      Alert.alert(
        'Lỗi', 
        'Không thể tải danh sách yêu cầu. ' + 
        (error.message || 'Vui lòng thử lại sau.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'requests', requestId);
      const userDoc = await getDoc(doc(db, "users", auth.currentUser?.uid || ""));
      const userData = userDoc.data();

      await updateDoc(requestRef, {
        status: 'completed',
        approvalHistory: arrayUnion({
          userId: auth.currentUser?.uid,
          userName: userData?.fullName || 'Unknown',
          department: userData?.department || 'Unknown',
          status: 'approved',
          timestamp: new Date()
        })
      });

      Alert.alert('Thành công', 'Đã phê duyệt yêu cầu');
      fetchRequests(selectedTab);
    } catch (error) {
      console.error('Lỗi khi phê duyệt:', error);
      Alert.alert('Lỗi', 'Không thể phê duyệt yêu cầu');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      Alert.alert(
        'Xác nhận',
        'Bạn có chắc chắn muốn hủy bỏ yêu cầu này?',
        [
          {
            text: 'Hủy',
            style: 'cancel'
          },
          {
            text: 'Xác nhận',
            onPress: async () => {
              const requestRef = doc(db, 'requests', requestId);
              await deleteDoc(requestRef);
              Alert.alert('Thành công', 'Đã hủy bỏ yêu cầu');
              fetchRequests(selectedTab);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Lỗi khi hủy bỏ:', error);
      Alert.alert('Lỗi', 'Không thể hủy bỏ yêu cầu');
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'video-ads':
        return 'videocam';
      case 'payment':
        return 'cash';
      case 'leave':
        return 'calendar';
      default:
        return 'document-text';
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'video-ads':
        return 'Video Ads';
      case 'payment':
        return 'Thanh toán';
      case 'leave':
        return 'Nghỉ phép';
      default:
        return 'Yêu cầu khác';
    }
  };

  const renderRequestItem = ({ item }: { item: Request }) => (
    <TouchableOpacity 
      style={styles.requestItem}
      onPress={() => router.push({
        pathname: "../Request/RequestDetailScreen",
        params: { id: item.id }
      })}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestTypeContainer}>
          <Ionicons name={getRequestTypeIcon(item.type)} size={24} color="#4285F4" />
          <Text style={styles.requestType}>{getRequestTypeLabel(item.type)}</Text>
        </View>
        <View style={[styles.statusBadge, 
          item.status === 'pending' ? styles.pendingBadge : 
          item.status === 'completed' ? styles.completedBadge :
          styles.defaultBadge
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'pending' ? 'Đang xử lý' :
             item.status === 'completed' ? 'Đã duyệt' :
             'Đã gửi'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.requestContent} numberOfLines={2}>
        {item.content}
      </Text>
      
      <View style={styles.requestFooter}>
        <Text style={styles.requestDate}>
          <Ionicons name="time-outline" size={16} color="#666" /> {item.date}
        </Text>
        {selectedTab === 'pending' && isAccountingMember && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApproveRequest(item.id)}
            >
              <Text style={styles.actionButtonText}>Phê duyệt</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteRequest(item.id)}
            >
              <Text style={styles.actionButtonText}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const filteredRequests = requests.filter(request =>
    request.content.toLowerCase().includes(searchText.toLowerCase()) ||
    getRequestTypeLabel(request.type).toLowerCase().includes(searchText.toLowerCase())
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {isAccountingMember && (
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'pending' && styles.activeTab]}
          onPress={() => setSelectedTab('pending')}
        >
          <Text style={[styles.tabText, selectedTab === 'pending' && styles.activeTabText]}>
            Việc cần làm
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'completed' && styles.activeTab]}
        onPress={() => setSelectedTab('completed')}
      >
        <Text style={[styles.tabText, selectedTab === 'completed' && styles.activeTabText]}>
          Đã duyệt
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'sent' && styles.activeTab]}
        onPress={() => setSelectedTab('sent')}
      >
        <Text style={[styles.tabText, selectedTab === 'sent' && styles.activeTabText]}>
          Đã gửi
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phê duyệt</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push("../Request/RequestTypeScreen")}>
            <Ionicons name="add" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm yêu cầu..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {renderTabs()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      ) : filteredRequests.length > 0 ? (
        <FlatList
          data={filteredRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.content}>
          <Text style={styles.noDataText}>
            {selectedTab === 'pending'
              ? 'Không có yêu cầu nào cần xử lý'
              : selectedTab === 'completed'
              ? 'Chưa có yêu cầu nào được duyệt'
              : 'Bạn chưa tạo yêu cầu nào'}
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push("../Request/RequestTypeScreen")}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

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
    </SafeAreaView>
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
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4285F4',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#4285F4',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  requestItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestType: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pendingBadge: {
    backgroundColor: '#E3EAFD',
  },
  completedBadge: {
    backgroundColor: '#E6F4EA',
  },
  defaultBadge: {
    backgroundColor: '#F1F3F4',
  },
  statusText: {
    fontSize: 14,
    color: '#4285F4',
  },
  requestContent: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestDate: {
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#1f1f1f',
  },
  menuItem: {
    alignItems: 'center',
  },
  menuText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  approveButton: {
    backgroundColor: '#4285F4',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
  },
});

export default RequestScreen; 