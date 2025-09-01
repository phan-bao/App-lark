import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface BottomMenuProps {
  activeScreen: 'home' | 'chat' | 'task';
}

const BottomMenu = ({ activeScreen }: BottomMenuProps) => {
  const router = useRouter();

  return (
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
  );
};

const styles = StyleSheet.create({
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
  activeText: {
    color: '#007AFF'
  }
});

export default BottomMenu; 