import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const RequestTypeScreen = () => {
  const router = useRouter();

  const requestTypes = [
    {
      id: 1,
      title: 'Payment Request',
      icon: 'cash-outline',
      route: '../Request/PaymentRequestForm',
    },
    {
      id: 2,
      title: 'Leave Request',
      icon: 'calendar-outline',
      route: '../Request/LeaveRequestForm',
    },
    {
      id: 3,
      title: 'Video Ads Request',
      icon: 'videocam-outline',
      route: '../Request/VideoAdsRequestForm',
    },
    
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn loại yêu cầu</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {requestTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={styles.requestTypeItem}
            onPress={() => router.push(type.route as any)}
          >
            <Ionicons name={type.icon as any} size={24} color="#4285F4" />
            <Text style={styles.requestTypeText}>{type.title}</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Menu */}
      <View style={styles.bottomMenu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.replace("../Home/home")}>
          <Ionicons name="home" size={24} color="white" />
          <Text style={styles.menuText}>Trang chủ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("../RequestScreen")}>
          <Ionicons name="document-text" size={24} color="white" />
          <Text style={styles.menuText}>Phê duyệt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("../Chat/ChatScreen")}>
          <Ionicons name="chatbubble" size={24} color="white" />
          <Text style={styles.menuText}>Tin nhắn</Text>
        </TouchableOpacity>
      </View>
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
  requestTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  requestTypeText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
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
});

export default RequestTypeScreen; 