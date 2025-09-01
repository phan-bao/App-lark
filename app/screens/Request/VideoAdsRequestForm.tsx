import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../src/config/firebaseConfig';

const VideoAdsRequestForm = () => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [runFormat, setRunFormat] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const handleAttachmentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        // Kiểm tra giới hạn kích thước file (50MB)
        const isValidSize = result.assets.every(file => file.size && file.size <= 50 * 1024 * 1024);
        
        if (!isValidSize) {
          Alert.alert('Lỗi', 'Kích thước file không được vượt quá 50MB');
          return;
        }

        // Kiểm tra giới hạn số lượng file (9 file)
        if (attachments.length + result.assets.length > 9) {
          Alert.alert('Lỗi', 'Không thể tải lên quá 9 tập tin');
          return;
        }

        setAttachments([...attachments, ...result.assets]);
      }
    } catch (error) {
      console.error('Lỗi khi tải file:', error);
      Alert.alert('Lỗi', 'Không thể tải file lên');
    }
  };

  const uploadFileToStorage = async (file: any) => {
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const fileRef = ref(storage, `video-ads/${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (error) {
      console.error('Lỗi khi upload file:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!content || !date || !runFormat) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload tất cả các file đính kèm
      const uploadPromises = attachments.map(file => uploadFileToStorage(file));
      const fileUrls = await Promise.all(uploadPromises);

      // Tạo document mới trong collection 'requests'
      const docRef = await addDoc(collection(db, 'requests'), {
        type: 'video-ads',
        content,
        date: date.toISOString(),
        runFormat,
        attachments: fileUrls,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: {
          name: 'User Name', // Thay bằng tên user thật
          // avatar: userAvatarUrl // Nếu có
        }
      });

      Alert.alert('Thành công', 'Yêu cầu của bạn đã được gửi');
      router.back();
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu:', error);
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runFormatOptions = [
    'Facebook',
    'YouTube',
    'TikTok',
    'Instagram',
    'Other'
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Ads - Request</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>Nội dung chỉnh sửa của bạn sẽ tự động được lưu.</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Content <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder="Enter content"
            multiline
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.selectButton} onPress={showDatePickerModal}>
            <Text style={styles.selectButtonText}>
              {date.toLocaleDateString()}
            </Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Run Format <Text style={styles.required}>*</Text></Text>
          <View style={styles.runFormatContainer}>
            {runFormatOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.runFormatOption,
                  runFormat === option && styles.runFormatOptionSelected
                ]}
                onPress={() => setRunFormat(option)}
              >
                <Text style={[
                  styles.runFormatOptionText,
                  runFormat === option && styles.runFormatOptionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Attachment <Text style={styles.required}>*</Text></Text>
          <Text style={styles.attachmentInfo}>
            Tối đa 9 tập tin đính kèm (tối đa 50 MB mỗi tập tin)
          </Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleAttachmentUpload}>
            <Ionicons name="cloud-upload-outline" size={24} color="#4285F4" />
            <Text style={styles.uploadButtonText}>Tải lên tập tin đính kèm</Text>
          </TouchableOpacity>
          {attachments.length > 0 && (
            <View style={styles.attachmentList}>
              {attachments.map((file, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Ionicons name="document" size={20} color="#666" />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const newAttachments = [...attachments];
                      newAttachments.splice(index, 1);
                      setAttachments(newAttachments);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Quy trình phê duyệt</Text>
          <Text style={styles.approvalText}>
            Vui lòng cung cấp tất cả thông tin cần thiết để xem toàn bộ quy trình phê duyệt.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi'}
          </Text>
        </TouchableOpacity>
      </View>

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
  subtitle: {
    padding: 16,
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    flex: 1,
  },
  formGroup: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  required: {
    color: 'red',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#666',
  },
  runFormatContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  runFormatOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  runFormatOptionSelected: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  runFormatOptionText: {
    color: '#666',
  },
  runFormatOptionTextSelected: {
    color: '#fff',
  },
  attachmentInfo: {
    color: '#666',
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4285F4',
    borderRadius: 8,
    padding: 12,
  },
  uploadButtonText: {
    color: '#4285F4',
    marginLeft: 8,
  },
  attachmentList: {
    marginTop: 16,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  attachmentName: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  approvalText: {
    color: '#666',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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

export default VideoAdsRequestForm; 