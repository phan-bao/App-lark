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

const PaymentRequestForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    description: '',
    paymentMethod: '',
    accountNumber: '',
    accountName: '',
    bankName: '',
    purpose: '',
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.amount || !formData.description) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
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
        type: 'payment_request',
      };

      await addDoc(collection(db, 'requests'), requestData);
      Alert.alert('Thành công', 'Yêu cầu thanh toán đã được gửi');
      router.back();
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu:', error);
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu cầu thanh toán</Text>
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
          <Text style={styles.label}>Số tiền *</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            placeholder="Nhập số tiền"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Mục đích *</Text>
          <TextInput
            style={styles.input}
            value={formData.purpose}
            onChangeText={(text) => setFormData({ ...formData, purpose: text })}
            placeholder="Nhập mục đích sử dụng"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phương thức thanh toán</Text>
          <TextInput
            style={styles.input}
            value={formData.paymentMethod}
            onChangeText={(text) => setFormData({ ...formData, paymentMethod: text })}
            placeholder="Chuyển khoản/ Tiền mặt/ Khác"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Thông tin tài khoản</Text>
          <TextInput
            style={styles.input}
            value={formData.accountNumber}
            onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
            placeholder="Số tài khoản"
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={formData.accountName}
            onChangeText={(text) => setFormData({ ...formData, accountName: text })}
            placeholder="Tên tài khoản"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={formData.bankName}
            onChangeText={(text) => setFormData({ ...formData, bankName: text })}
            placeholder="Tên ngân hàng"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Mô tả chi tiết *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Mô tả chi tiết yêu cầu"
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

export default PaymentRequestForm; 