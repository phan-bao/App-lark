import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db } from '../../../src/config/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

const LeaveRequestForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    leaveType: '',
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
    contactInfo: '',
    handoverWork: '',
  });
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title || !formData.leaveType || !formData.reason) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (formData.startDate > formData.endDate) {
      Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để gửi yêu cầu');
        return;
      }

      const requestData = {
        ...formData,
        userId: user.uid,
        status: 'pending',
        createdAt: new Date(),
        type: 'leave_request',
      };

      await addDoc(collection(db, 'requests'), requestData);
      Alert.alert('Thành công', 'Yêu cầu nghỉ phép đã được gửi');
      router.back();
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu:', error);
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDate(false);
    if (selectedDate) {
      setFormData({ ...formData, startDate: selectedDate });
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDate(false);
    if (selectedDate) {
      setFormData({ ...formData, endDate: selectedDate });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu cầu nghỉ phép</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tiêu đề *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="Nhập tiêu đề yêu cầu"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Loại nghỉ phép *</Text>
          <TextInput
            style={styles.input}
            value={formData.leaveType}
            onChangeText={(text) => setFormData({ ...formData, leaveType: text })}
            placeholder="Nghỉ ốm/ Nghỉ phép/ Nghỉ việc riêng"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ngày bắt đầu *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDate(true)}
          >
            <Text style={styles.dateButtonText}>
              {formData.startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showStartDate && (
            <DateTimePicker
              value={formData.startDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
            />
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ngày kết thúc *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDate(true)}
          >
            <Text style={styles.dateButtonText}>
              {formData.endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showEndDate && (
            <DateTimePicker
              value={formData.endDate}
              mode="date"
              display="default"
              onChange={onEndDateChange}
            />
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Lý do nghỉ phép *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.reason}
            onChangeText={(text) => setFormData({ ...formData, reason: text })}
            placeholder="Nhập lý do nghỉ phép"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Thông tin liên hệ khi nghỉ</Text>
          <TextInput
            style={styles.input}
            value={formData.contactInfo}
            onChangeText={(text) => setFormData({ ...formData, contactInfo: text })}
            placeholder="Số điện thoại/ Email liên hệ"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bàn giao công việc</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.handoverWork}
            onChangeText={(text) => setFormData({ ...formData, handoverWork: text })}
            placeholder="Mô tả công việc cần bàn giao"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
        </TouchableOpacity>
      </ScrollView>
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
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#4285F4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LeaveRequestForm; 