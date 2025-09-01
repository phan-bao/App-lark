// HomeScreen.tsx
import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Image, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../../../src/config/firebaseConfig";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import AddMenu from "../../components/AddMenu";
import { LinearGradient } from 'expo-linear-gradient';

interface UserData {
  fullName: string;
  email: string;
}

const HomeScreen = () => {
  const router = useRouter();
  const user = auth.currentUser;
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
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

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          }
        } catch (error) {
          console.error("Lỗi khi lấy thông tin người dùng:", error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Lắng nghe số thông báo chưa đọc
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('receiverId', '==', user.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const getInitial = () => {
    if (!userData?.fullName) return '?';
    return userData.fullName.charAt(0).toUpperCase();
  };

  return (
    <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity>
            <View style={styles.avatarContainer}>
              {user?.photoURL ? (
                <Image 
                  source={{ uri: user.photoURL }} 
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{getInitial()}</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>{userData?.fullName || "Người dùng"}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => router.push("../../screens/SearchScreen")}> 
              <Ionicons name="search" size={24} color="black" style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push("../../screens/NotificationScreen")} 
              style={styles.notificationContainer}
            >
              <Ionicons name="notifications" size={24} color="black" style={styles.icon} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(!isMenuVisible)}>
              <Ionicons name="add-circle" size={24} color="black" style={styles.icon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nội dung chính */}
        <View style={styles.content}>
          <Animated.View 
            style={[
              styles.welcomeCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['#7F7FD5', '#86A8E7', '#91EAE4']}
              style={styles.welcomeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.welcome}>Chào mừng bạn đến với Lark</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View 
            style={[
              styles.featureSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['#E0EAFC', '#CFDEF3']}
              style={styles.featureCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.featureContent}>
                <Ionicons name="briefcase-outline" size={40} color="#5C6BC0" />
                <Text style={[styles.featureTitle, { color: '#3949AB' }]}>Ứng dụng Quản lý Công việc</Text>
                <Text style={[styles.featureText, { color: '#5C6BC0' }]}>
                  Lark là ứng dụng quản lý công việc thông minh, giúp bạn theo dõi và tổ chức các nhiệm vụ một cách hiệu quả.
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View 
            style={[
              styles.teamSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['#E0EAFC', '#CFDEF3']}
              style={styles.teamCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.teamTitle, { color: '#3949AB' }]}>Đội ngũ phát triển</Text>
              <View style={styles.teamList}>
                <View style={[styles.teamMember, { backgroundColor: 'rgba(92, 107, 192, 0.1)' }]}>
                  <Ionicons name="person-circle-outline" size={24} color="#5C6BC0" />
                  <Text style={[styles.memberName, { color: '#3949AB' }]}>Đoàn Minh Khải</Text>
                </View>
                <View style={[styles.teamMember, { backgroundColor: 'rgba(92, 107, 192, 0.1)' }]}>
                  <Ionicons name="person-circle-outline" size={24} color="#5C6BC0" />
                  <Text style={[styles.memberName, { color: '#3949AB' }]}>Phan Văn Bảo</Text>
                </View>
                <View style={[styles.teamMember, { backgroundColor: 'rgba(92, 107, 192, 0.1)' }]}>
                  <Ionicons name="person-circle-outline" size={24} color="#5C6BC0" />
                  <Text style={[styles.memberName, { color: '#3949AB' }]}>Nguyễn Khôi Long</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Menu dưới */}
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
        <AddMenu visible={isMenuVisible} onClose={() => setMenuVisible(false)} />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f6fa" 
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "white",
  },
  username: {
    color: "black",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 10,
  },
  headerIcons: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end"
  },
  icon: { 
    marginLeft: 15,
    padding: 5
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f6fa',
  },
  welcomeCard: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  welcomeGradient: {
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  featureSection: {
    marginBottom: 20,
  },
  featureCard: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  featureContent: {
    padding: 25,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  },
  teamSection: {
    marginBottom: 20,
  },
  teamCard: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    padding: 25,
  },
  teamTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  teamList: {
    gap: 15,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  memberName: {
    marginLeft: 15,
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  },
  bottomMenu: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    backgroundColor: "#1f1f1f",
  },
  menuItem: { 
    alignItems: "center" 
  },
  menuText: { 
    color: "white", 
    fontSize: 12, 
    marginTop: 5 
  },
  notificationContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
