import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../src/config/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface FormData {
  // Thông tin cá nhân
  fullName: string;
  contact: string;
  position: string;
  
  // Thông tin công ty
  companyName: string;
  companySize: string;
  industry: string;
  country: string;

  // Mật khẩu
  password: string;
  confirmPassword: string;

  // ID tổ chức
  orgId?: string;
}

const CreateOrganization = () => {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Form tổ chức, 2: Đặt mật khẩu
  const [formData, setFormData] = useState<FormData>({
    // Thông tin cá nhân
    fullName: '',
    contact: '',
    position: '',
    
    // Thông tin công ty
    companyName: '',
    companySize: '',
    industry: '',
    country: '',

    // Mật khẩu
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const companySizeOptions = [
    { label: '1-20 nhân viên', value: '1-20' },
    { label: '21-50 nhân viên', value: '21-50' },
    { label: '51-100 nhân viên', value: '51-100' },
    { label: '101-200 nhân viên', value: '101-200' },
    { label: '201-500 nhân viên', value: '201-500' },
    { label: '500+ nhân viên', value: '500+' },
  ];

  const industryOptions = [
    { label: 'Công nghệ thông tin', value: 'IT' },
    { label: 'Tài chính - Ngân hàng', value: 'Finance' },
    { label: 'Giáo dục', value: 'Education' },
    { label: 'Y tế', value: 'Healthcare' },
    { label: 'Bán lẻ', value: 'Retail' },
    { label: 'Sản xuất', value: 'Manufacturing' },
    { label: 'Bất động sản', value: 'RealEstate' },
    { label: 'Du lịch', value: 'Tourism' },
    { label: 'Khác', value: 'Other' },
  ];

  const countryOptions = [
    { label: 'Việt Nam', value: 'VN' },
    { label: 'Singapore', value: 'SG' },
    { label: 'Malaysia', value: 'MY' },
    { label: 'Thailand', value: 'TH' },
    { label: 'Indonesia', value: 'ID' },
    { label: 'Philippines', value: 'PH' },
    { label: 'Khác', value: 'Other' },
  ];

  const handleSubmitOrganization = async () => {
    // Kiểm tra thông tin form
    if (!formData.fullName || !formData.contact || !formData.position || 
        !formData.companyName || !formData.companySize || !formData.industry || !formData.country) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contact)) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hợp lệ');
      return;
    }

    try {
      // Tạo ID ngẫu nhiên cho tổ chức
      const orgId = Math.random().toString(36).substring(2, 15);
      
      // Lưu thông tin tổ chức vào Firestore
      await setDoc(doc(db, 'organizations', orgId), {
        companyName: formData.companyName,
        companySize: formData.companySize,
        industry: formData.industry,
        country: formData.country,
        createdAt: new Date().toISOString(),
        id: orgId,
        name: formData.companyName,
        members: [],
        departments: [],
      });

      // Lưu ID tổ chức để sử dụng sau khi tạo user
      setFormData(prev => ({...prev, orgId}));

      // Chuyển sang bước đặt mật khẩu
      setStep(2);
    } catch (error: any) {
      console.error('Lỗi:', error);
      Alert.alert('Lỗi', error.message);
    }
  };

  const handleSetPassword = async () => {
    if (!formData.password || !formData.confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mật khẩu');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu không khớp');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      // Tạo tài khoản với email và password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.contact,
        formData.password
      );

      // Lưu thông tin user vào Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: formData.contact,
        fullName: formData.fullName,
        position: formData.position,
        organizationId: formData.orgId, // Liên kết với tổ chức
        role: 'Admin',
        uid: userCredential.user.uid,
        createdAt: new Date().toISOString(),
      });

      // Cập nhật thông tin members trong tổ chức
      await updateDoc(doc(db, 'organizations', formData.orgId!), {
        members: [userCredential.user.uid]
      });

      Alert.alert('Thành công', 'Tạo tài khoản thành công!', [
        {
          text: 'OK',
          onPress: () => router.replace('/screens/Home/home')
        }
      ]);
    } catch (error: any) {
      console.error('Lỗi:', error);
      Alert.alert('Lỗi', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderOrganizationForm = () => (
    <>
      {/* Thông tin cá nhân */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Thông tin cá nhân</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Họ và tên</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) => setFormData({...formData, fullName: text})}
              placeholder="Nhập họ và tên"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email hoặc Số điện thoại</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.contact}
              onChangeText={(text) => setFormData({...formData, contact: text})}
              placeholder="Nhập email hoặc số điện thoại"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Chức vụ</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="briefcase-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.position}
              onChangeText={(text) => setFormData({...formData, position: text})}
              placeholder="Nhập chức vụ của bạn"
            />
          </View>
        </View>
      </View>

      {/* Thông tin công ty */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Thông tin công ty</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tên công ty</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="business-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.companyName}
              onChangeText={(text) => setFormData({...formData, companyName: text})}
              placeholder="Nhập tên công ty"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phạm vi</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.companySize}
              onValueChange={(value: string) => setFormData({...formData, companySize: value})}
              style={styles.picker}
            >
              <Picker.Item label="Chọn quy mô công ty" value="" />
              {companySizeOptions.map((option) => (
                <Picker.Item 
                  key={option.value} 
                  label={option.label} 
                  value={option.value} 
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Lĩnh vực</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.industry}
              onValueChange={(value: string) => setFormData({...formData, industry: value})}
              style={styles.picker}
            >
              <Picker.Item label="Chọn lĩnh vực" value="" />
              {industryOptions.map((option) => (
                <Picker.Item 
                  key={option.value} 
                  label={option.label} 
                  value={option.value} 
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Quốc gia</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.country}
              onValueChange={(value: string) => setFormData({...formData, country: value})}
              style={styles.picker}
            >
              <Picker.Item label="Chọn quốc gia" value="" />
              {countryOptions.map((option) => (
                <Picker.Item 
                  key={option.value} 
                  label={option.label} 
                  value={option.value} 
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity 
          style={[styles.submitButton, styles.primaryButton]}
          onPress={handleSubmitOrganization}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
        >
          <Text style={styles.submitButtonText}>Tiếp tục</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );

  const renderPasswordForm = () => (
    <View style={styles.passwordContainer}>
      <Text style={styles.title}>Đặt mật khẩu</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={(text) => setFormData({...formData, password: text})}
            placeholder="Nhập mật khẩu"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons 
              name={showPassword ? "eye-outline" : "eye-off-outline"} 
              size={20} 
              color="#666"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
            placeholder="Nhập lại mật khẩu"
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons 
              name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
              size={20} 
              color="#666"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity 
          style={[styles.submitButton, styles.primaryButton]}
          onPress={handleSetPassword}
          disabled={loading}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Tiếp tục</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2C3E50', '#3498DB', '#1ABC9C']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView style={styles.scrollView}>
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                if (step === 2) {
                  setStep(1);
                } else {
                  router.back();
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#2C3E50" />
            </TouchableOpacity>

            {step === 1 ? renderOrganizationForm() : renderPasswordForm()}
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    width: width * 0.9,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#2C3E50',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1ABC9C',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#2C3E50',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#2C3E50',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#2C3E50',
  },
  eyeIcon: {
    padding: 10,
  },
  submitButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#1ABC9C',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordContainer: {
    flex: 1,
    paddingTop: 20,
  },
});

export default CreateOrganization; 