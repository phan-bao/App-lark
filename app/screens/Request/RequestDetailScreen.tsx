import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../src/config/firebaseConfig';

interface RequestDetail {
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
  title?: string;
  amount?: string;
  description?: string;
  paymentMethod?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  purpose?: string;
  leaveType?: string;
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  contactInfo?: string;
  handoverWork?: string;
}

const RequestDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [request, setRequest] = React.useState<RequestDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchRequestDetail();
  }, [id]);

  const fetchRequestDetail = async () => {
    try {
      const requestDoc = await getDoc(doc(db, 'requests', id as string));
      if (requestDoc.exists()) {
        const data = requestDoc.data();
        setRequest({
          id: requestDoc.id,
          type: data.type || '',
          content: data.description || data.content || '',
          date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
          status: data.status || 'pending',
          createdAt: data.createdAt || '',
          userId: data.userId || '',
          userName: data.userName || data.title || 'Unknown',
          department: data.department || '',
          runFormat: data.runFormat,
          title: data.title,
          amount: data.amount,
          description: data.description,
          paymentMethod: data.paymentMethod,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          bankName: data.bankName,
          purpose: data.purpose,
          leaveType: data.leaveType,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
          contactInfo: data.contactInfo,
          handoverWork: data.handoverWork,
        });
      }
    } catch (error) {
      console.error('Lỗi khi tải chi tiết request:', error);
    } finally {
      setLoading(false);
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Đang xử lý';
      case 'completed':
        return 'Đã duyệt';
      default:
        return 'Đã gửi';
    }
  };

  const renderPaymentDetails = () => {
    if (request?.type !== 'payment') return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Số tiền:</Text>
          <Text style={styles.value}>{request.amount}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Phương thức thanh toán:</Text>
          <Text style={styles.value}>{request.paymentMethod}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Số tài khoản:</Text>
          <Text style={styles.value}>{request.accountNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Tên tài khoản:</Text>
          <Text style={styles.value}>{request.accountName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Ngân hàng:</Text>
          <Text style={styles.value}>{request.bankName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Mục đích:</Text>
          <Text style={styles.value}>{request.purpose}</Text>
        </View>
      </View>
    );
  };

  const renderLeaveDetails = () => {
    if (request?.type !== 'leave') return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết nghỉ phép</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Loại nghỉ phép:</Text>
          <Text style={styles.value}>{request.leaveType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Ngày bắt đầu:</Text>
          <Text style={styles.value}>
            {request.startDate ? new Date(request.startDate).toLocaleDateString('vi-VN') : ''}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Ngày kết thúc:</Text>
          <Text style={styles.value}>
            {request.endDate ? new Date(request.endDate).toLocaleDateString('vi-VN') : ''}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Lý do:</Text>
          <Text style={styles.value}>{request.reason}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Thông tin liên hệ:</Text>
          <Text style={styles.value}>{request.contactInfo}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Bàn giao công việc:</Text>
          <Text style={styles.value}>{request.handoverWork}</Text>
        </View>
      </View>
    );
  };

  const renderVideoAdsDetails = () => {
    if (request?.type !== 'video-ads') return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết quảng cáo video</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Nền tảng:</Text>
          <Text style={styles.value}>{request.runFormat}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Nội dung:</Text>
          <Text style={styles.value}>{request.content}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text>Không tìm thấy yêu cầu</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.requestHeader}>
            <View style={styles.requestTypeContainer}>
              <Ionicons 
                name={
                  request.type === 'video-ads' ? 'videocam' :
                  request.type === 'payment' ? 'cash' :
                  request.type === 'leave' ? 'calendar' :
                  'document-text'
                } 
                size={24} 
                color="#4285F4" 
              />
              <Text style={styles.requestType}>{getRequestTypeLabel(request.type)}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              request.status === 'pending' ? styles.pendingBadge :
              request.status === 'completed' ? styles.completedBadge :
              styles.defaultBadge
            ]}>
              <Text style={styles.statusText}>{getStatusLabel(request.status)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Tiêu đề:</Text>
            <Text style={styles.value}>{request.title}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Ngày tạo:</Text>
            <Text style={styles.value}>{request.date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Người gửi:</Text>
            <Text style={styles.value}>{request.userName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Phòng ban:</Text>
            <Text style={styles.value}>{request.department}</Text>
          </View>
        </View>

        {renderPaymentDetails()}
        {renderLeaveDetails()}
        {renderVideoAdsDetails()}
      </ScrollView>
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 120,
    fontSize: 14,
    color: '#666',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
});

export default RequestDetailScreen; 