import React, { useState, useEffect } from "react";
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../src/config/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserResult {
  email: string;
  uid: string;
  fullName: string;
  isFriend?: boolean;
  hasSentRequest?: boolean;
}

interface FriendRequest {
  status: string;
  senderId: string;
  receiverId: string;
}

const SearchScreen = () => {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const router = useRouter();
  const currentUser = auth.currentUser;

  // Theo dõi số lượng lời mời kết bạn
  useEffect(() => {
    if (!currentUser) return;

    const friendRequestsRef = collection(db, 'friendRequests');
    const q = query(
      friendRequestsRef,
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFriendRequestCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Lấy lịch sử tìm kiếm khi màn hình được mở
  useEffect(() => {
    loadSearchHistory();
  }, []);

  // Lưu lịch sử tìm kiếm vào AsyncStorage
  const saveSearchHistory = async (text: string) => {
    try {
      const newHistory = [text, ...searchHistory.filter(item => item !== text)].slice(0, 10);
      await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
      setSearchHistory(newHistory);
    } catch (error) {
      console.error('Lỗi khi lưu lịch sử:', error);
    }
  };

  // Lấy lịch sử tìm kiếm từ AsyncStorage
  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Lỗi khi đọc lịch sử:', error);
    }
  };

  // Xóa toàn bộ lịch sử tìm kiếm
  const clearSearchHistory = async () => {
    try {
      await AsyncStorage.removeItem('searchHistory');
      setSearchHistory([]);
    } catch (error) {
      console.error('Lỗi khi xóa lịch sử:', error);
    }
  };

  // Xử lý khi người dùng chọn một item từ lịch sử
  const handleHistoryItemPress = (text: string) => {
    setSearchText(text);
  };

  const handleSendFriendRequest = async (targetUser: UserResult) => {
    if (!currentUser) return;
    
    try {
      // Tạo yêu cầu kết bạn trong Firestore
      const friendRequestRef = doc(db, "friendRequests", `${currentUser.uid}_${targetUser.uid}`);
      await setDoc(friendRequestRef, {
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        receiverId: targetUser.uid,
        receiverEmail: targetUser.email,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Cập nhật UI
      setResults(prevResults => 
        prevResults.map(user => 
          user.uid === targetUser.uid 
            ? { ...user, hasSentRequest: true }
            : user
        )
      );

      Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
    } catch (error) {
      console.error("Lỗi khi gửi lời mời kết bạn:", error);
      Alert.alert("Lỗi", "Không thể gửi lời mời kết bạn");
    }
  };

  const handleCancelFriendRequest = async (targetUser: UserResult) => {
    if (!currentUser) return;
    
    try {
      // Xóa yêu cầu kết bạn trong Firestore
      const friendRequestRef = doc(db, "friendRequests", `${currentUser.uid}_${targetUser.uid}`);
      await deleteDoc(friendRequestRef);

      // Cập nhật UI
      setResults(prevResults => 
        prevResults.map(user => 
          user.uid === targetUser.uid 
            ? { ...user, hasSentRequest: false }
            : user
        )
      );

      Alert.alert("Thành công", "Đã hủy lời mời kết bạn");
    } catch (error) {
      console.error("Lỗi khi hủy lời mời kết bạn:", error);
      Alert.alert("Lỗi", "Không thể hủy lời mời kết bạn");
    }
  };

  // Hàm tìm kiếm người dùng trong Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      if (searchText.trim() === "") {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("email", ">=", searchText),
          where("email", "<=", searchText + "\uf8ff")
        );

        const querySnapshot = await getDocs(q);
        const users = await Promise.all(
          querySnapshot.docs
            .filter(docSnapshot => docSnapshot.id !== currentUser?.uid)
            .map(async (docSnapshot) => {
              const userData = docSnapshot.data() as UserResult;
              
              // Kiểm tra trạng thái bạn bè
              const friendRef = doc(db, "friends", `${currentUser?.uid}_${docSnapshot.id}`);
              const friendDoc = await getDoc(friendRef);
              
              // Kiểm tra yêu cầu kết bạn
              const requestRef = doc(db, "friendRequests", `${currentUser?.uid}_${docSnapshot.id}`);
              const requestDoc = await getDoc(requestRef);
              const requestData = requestDoc.data() as FriendRequest | undefined;

              return {
                ...userData,
                uid: docSnapshot.id,
                isFriend: friendDoc.exists(),
                hasSentRequest: requestDoc.exists() && requestData?.status === 'pending'
              };
            })
        );

        setResults(users);
        if (users.length > 0) {
          saveSearchHistory(searchText);
        }
      } catch (error) {
        console.error("Lỗi tìm kiếm:", error);
      }
      setLoading(false);
    };

    fetchUsers();
  }, [searchText]);

  const renderResultItem = ({ item }: { item: UserResult }) => (
    <View style={styles.resultItem}>
      <View style={styles.userInfo}>
        <Ionicons name="person-outline" size={20} color="#888" style={styles.resultIcon} />
        <Text style={styles.resultText}>{item.email}</Text>
      </View>
      <View style={styles.actionButtons}>
        {!item.isFriend && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.hasSentRequest && styles.actionButtonCancel
            ]}
            onPress={() => item.hasSentRequest 
              ? handleCancelFriendRequest(item)
              : handleSendFriendRequest(item)
            }
          >
            <Text style={styles.actionButtonText}>
              {item.hasSentRequest ? 'Hủy lời mời' : 'Kết bạn'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push({
            pathname: "/screens/Chat/ChatScreen",
            params: { 
              userId: item.uid,
              email: item.email,
              fullName: item.fullName
            }
          })}
        >
          <Text style={styles.actionButtonText}>Nhắn tin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitButton}>
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Nhập email hoặc số điện thoại"
          onChangeText={(text) => setSearchText(text)}
          value={searchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.contentContainer}>
        {/* Hiển thị lịch sử tìm kiếm khi không có searchText */}
        {!searchText && searchHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Lịch sử tìm kiếm</Text>
              <TouchableOpacity onPress={clearSearchHistory}>
                <Ionicons name="trash-outline" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={searchHistory}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.historyItem}
                  onPress={() => handleHistoryItemPress(item)}
                >
                  <Ionicons name="time-outline" size={20} color="#888" style={styles.historyIcon} />
                  <Text style={styles.historyText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Loading spinner */}
        {loading && <ActivityIndicator size="small" color="#000" style={{ marginTop: 10 }} />}

        {/* Danh sách kết quả */}
        {searchText.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>Kết quả tìm kiếm</Text>
            <FlatList
              data={results}
              keyExtractor={(item) => item.uid}
              renderItem={renderResultItem}
              ListEmptyComponent={
                !loading ? (
                  <Text style={styles.noResult}>Không tìm thấy kết quả</Text>
                ) : null
              }
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#7F7FD5',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
  },
  exitButton: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    marginHorizontal: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2.22,
  },
  searchIcon: {
    marginRight: 10,
    color: '#5C6BC0'
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    paddingVertical: 8
  },
  clearButton: {
    padding: 8,
    backgroundColor: 'rgba(92, 107, 192, 0.1)',
    borderRadius: 12
  },
  resultItem: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2.22,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  resultIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(92, 107, 192, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  resultText: { 
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600'
  },
  noResult: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#95A5A6",
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 30
  },
  historyContainer: {
    marginTop: 20,
    paddingHorizontal: 15
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92, 107, 192, 0.1)',
    marginBottom: 10
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  historyIcon: {
    marginRight: 12,
    color: '#5C6BC0'
  },
  historyText: {
    fontSize: 15,
    color: '#2C3E50',
  },
  contentContainer: {
    flex: 1,
    marginTop: 10,
  },
  resultsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 15,
    marginLeft: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#5C6BC0',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionButtonCancel: {
    backgroundColor: '#FF5722',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SearchScreen;
