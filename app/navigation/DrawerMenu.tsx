// DrawerMenu.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth } from "../../src/config/firebaseConfig";

interface DrawerMenuProps {
  closeDrawer: () => void;
}

const DrawerMenu: React.FC<DrawerMenuProps> = ({ closeDrawer }) => {
  const router = useRouter();
  const user = auth.currentUser;

  const getInitial = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    Alert.alert(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất không?",
      [
        {
          text: "Không",
          style: "cancel",
        },
        {
          text: "Có",
          onPress: async () => {
            try {
              await auth.signOut();
              router.replace("./LoginScreen");
            } catch (error) {
              Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleNavigation = (screen: string) => {
    closeDrawer();
    try {
      router.push(screen as any); // Tạm thời sử dụng type assertion
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chuyển đến màn hình này.");
    }
  };

  return (
    <View style={styles.drawerContainer}>
      {/* Phần hiển thị avatar và tên người dùng */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitial()}</Text>
        </View>
        <Text style={styles.userName}>{user?.email || "Người dùng"}</Text>
      </View>

      {/* Các tùy chọn menu */}
      <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigation("./ProfileScreen")}> 
        <Ionicons name="person-circle" size={24} color="black" />
        <Text style={styles.drawerText}>Hồ sơ</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.drawerItem} onPress={closeDrawer}> 
        <Ionicons name="heart" size={24} color="black" />
        <Text style={styles.drawerText}>Ưa thích</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.drawerItem} onPress={closeDrawer}> 
        <Ionicons name="settings" size={24} color="black" />
        <Text style={styles.drawerText}>Cài đặt</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.drawerItem, styles.logoutButton]} onPress={handleLogout}> 
        <Ionicons name="log-out" size={24} color="red" />
        <Text style={[styles.drawerText, styles.logoutText]}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    width: 220,
    backgroundColor: "#fff",
    paddingVertical: 20,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
    textAlign: "center",
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  drawerText: {
    marginLeft: 15,
    fontSize: 16,
    color: "black",
  },
  logoutButton: {
    marginTop: 20,
  },
  logoutText: {
    color: "red",
  },
});

export default DrawerMenu;
