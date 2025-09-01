import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../../../src/config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

interface UserData {
  role?: string;
  organizationId?: string;
}

const SettingsScreen = () => {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          setIsAdmin(data.role === "Admin");
        }
      }
    };

    checkUserRole();
  }, []);

  const navigateToSuiteAdmin = () => {
    if (!isAdmin) {
      Alert.alert("Không có quyền truy cập", "Chỉ Admin mới có thể truy cập Suite Admin");
      return;
    }
    router.push("../Admin/SuiteAdminScreen");
  };

  const navigateToOrganizationInfo = () => {
    router.push("../Organization/OrganizationInfoScreen");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)");
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
      Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("../Profile/ProfileScreen")}>
            <Ionicons name="person-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Thông tin cá nhân</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          {userData?.organizationId && (
            <TouchableOpacity style={styles.menuItem} onPress={navigateToOrganizationInfo}>
              <Ionicons name="business-outline" size={24} color="#333" />
              <Text style={styles.menuText}>Thông tin tổ chức</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quản trị</Text>
            <TouchableOpacity style={styles.menuItem} onPress={navigateToSuiteAdmin}>
              <Ionicons name="settings-outline" size={24} color="#333" />
              <Text style={styles.menuText}>Suite Admin</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ứng dụng</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Thông báo</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="moon-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Giao diện</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bảo mật</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            <Text style={[styles.menuText, styles.logoutText]}>Đăng xuất</Text>
            
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginLeft: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 16,
  },
  logoutText: {
    color: '#FF3B30',
  },
});

export default SettingsScreen; 