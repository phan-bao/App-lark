import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../../../src/config/firebaseConfig";
import { updateProfile, updatePassword } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const IMGBB_API_KEY = "5728f7e34ace1af862b7cd01e6a13d8e"; // Thay thế bằng API key của bạn

const ProfileScreen = () => {
  const router = useRouter();
  const user = auth.currentUser;
  const [name, setName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [gender, setGender] = useState("Nam");
  const [image, setImage] = useState(user?.photoURL || "https://via.placeholder.com/100");
  const [imageUrl, setImageUrl] = useState("");

  // Lấy thông tin người dùng từ Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setName(userData.fullName || "");
          }
        } catch (error) {
          console.error("Lỗi khi lấy thông tin người dùng:", error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  // Lấy ảnh từ URL và upload lên ImgBB
  const getImageFromUrl = async () => {
    if (!imageUrl.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập URL ảnh");
      return;
    }

    try {
      // Kiểm tra kết nối mạng
      const netInfo = await fetch('https://www.google.com');
      if (!netInfo.ok) {
        throw new Error('Không có kết nối mạng. Vui lòng kiểm tra lại kết nối.');
      }

      // Kiểm tra URL hợp lệ
      new URL(imageUrl);
      
      // Kiểm tra định dạng URL (chỉ chấp nhận các định dạng ảnh phổ biến)
      const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasValidExtension = validImageExtensions.some(ext => 
        imageUrl.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        Alert.alert("Lỗi", "URL phải là một ảnh hợp lệ (jpg, jpeg, png, gif, webp)");
        return;
      }

      // Tải ảnh từ URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Không thể tải ảnh từ URL');
      }
      
      // Kiểm tra content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('URL không phải là một ảnh hợp lệ');
      }

      const blob = await response.blob();
      
      // Kiểm tra kích thước ảnh (giới hạn 5MB)
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Kích thước ảnh quá lớn (tối đa 5MB)');
      }

      // Chuyển blob thành base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result as string;
          // Loại bỏ phần "data:image/jpeg;base64," từ chuỗi base64
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise as string;

      // Upload lên ImgBB sử dụng base64
      const uploadResponse = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `image=${encodeURIComponent(base64Data)}`
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Không thể upload ảnh lên ImgBB: ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      
      if (!uploadData.success) {
        throw new Error(uploadData.error?.message || 'Upload thất bại');
      }

      // Lấy URL ảnh từ ImgBB
      const imgbbUrl = uploadData.data.url;
      
      // Cập nhật ảnh đại diện
      setImage(imgbbUrl);
      await updateProfile(user!, { photoURL: imgbbUrl });
      
      Alert.alert("Thành công", "Đã cập nhật ảnh đại diện từ URL!");
      setImageUrl(""); // Xóa URL sau khi thành công
    } catch (error: any) {
      console.error("Lỗi khi lấy ảnh từ URL:", error);
      let errorMessage = "Không thể lấy ảnh từ URL. Vui lòng kiểm tra URL và thử lại.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Lỗi", errorMessage);
    }
  };

  // Lưu thông tin người dùng
  const saveProfile = async () => {
    try {
      // Cập nhật trong Authentication
      await updateProfile(user!, { displayName: name });
      if (password) {
        await updatePassword(user!, password);
      }

      // Cập nhật trong Firestore
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          fullName: name
        });
      }

      Alert.alert("Thành công", "Thông tin cá nhân đã được cập nhật!");
    } catch (error) {
      console.error("Lỗi lưu thông tin:", error);
      Alert.alert("Lỗi", "Không thể cập nhật thông tin cá nhân");
    }
  };

  return (
    <View style={styles.container}>
      {/* Thanh tiêu đề với nút thoát */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Thông tin cá nhân</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Ảnh đại diện và các nút chọn ảnh */}
      <View style={styles.avatarSection}>
        <Image source={{ uri: image }} style={styles.avatar} />
        
        {/* Phần nhập URL ảnh */}
        <View style={styles.urlInputContainer}>
          <TextInput
            style={styles.urlInput}
            placeholder="Nhập URL ảnh"
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity style={styles.urlButton} onPress={getImageFromUrl}>
            <Ionicons name="globe-outline" size={24} color="white" />
            <Text style={styles.avatarButtonText}>Lấy từ URL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nhập thông tin */}
      <Text style={styles.label}>Tên:</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Email:</Text>
      <TextInput style={styles.input} value={email} editable={false} />

      <Text style={styles.label}>Số điện thoại:</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Text style={styles.label}>Mật khẩu mới:</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Nhập mật khẩu mới" />

      <Text style={styles.label}>Giới tính:</Text>
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[styles.genderButton, gender === "Nam" && styles.selectedGender]}
          onPress={() => setGender("Nam")}
        >
          <Text style={styles.genderText}>Nam</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === "Nữ" && styles.selectedGender]}
          onPress={() => setGender("Nữ")}
        >
          <Text style={styles.genderText}>Nữ</Text>
        </TouchableOpacity>
      </View>

      {/* Nút lưu */}
      <TouchableOpacity style={styles.button} onPress={saveProfile}>
        <Text style={styles.buttonText}>Lưu thông tin</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", flex: 1 },
  avatarSection: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
  avatarButtons: { flexDirection: "row", justifyContent: "center", gap: 10 },
  avatarButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#007AFF", 
    padding: 10, 
    borderRadius: 8,
    gap: 5
  },
  avatarButtonText: { color: "white", fontWeight: "bold" },
  label: { alignSelf: "flex-start", fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  input: { width: "100%", height: 40, borderWidth: 1, borderColor: "#ccc", borderRadius: 5, paddingHorizontal: 10, marginBottom: 15 },
  button: { backgroundColor: "#007AFF", padding: 10, borderRadius: 5, alignItems: "center", width: "100%", marginTop: 10 },
  buttonText: { color: "white", fontWeight: "bold" },
  genderContainer: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginBottom: 20 },
  genderButton: { padding: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 5, width: "40%", alignItems: "center" },
  selectedGender: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  genderText: { color: "black" },
  urlInputContainer: {
    width: '100%',
    marginTop: 10,
  },
  urlInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 5,
  },
});

export default ProfileScreen;
