import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface MenuItem {
  title: string;
  icon: string;
  route: '../../screens/Friend/FriendRequestScreen' | '../../screens/Friend/FriendListScreen' | '../../screens/Group/CreateGroupScreen';
}

interface AddMenuProps {
  visible: boolean;
  onClose: () => void;
}

const AddMenu: React.FC<AddMenuProps> = ({ visible, onClose }) => {
  const router = useRouter();

  if (!visible) return null;

  const menuItems: MenuItem[] = [
    {
      title: 'Lời mời kết bạn',
      icon: 'person-add-outline',
      route: '../../screens/Friend/FriendRequestScreen',
    },
    {
      title: 'Danh sách bạn bè',
      icon: 'people-outline',
      route: '../../screens/Friend/FriendListScreen',
    },
    {
      title: 'Tạo nhóm',
      icon: 'add-circle-outline',
      route: '../../screens/Group/CreateGroupScreen',
    },
    // Thêm các mục menu khác nếu cần
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Menu</Text>
      </View>

      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.menuItem}
          onPress={() => {
            router.push(item.route);
            onClose();
          }}
        >
          <Ionicons name={item.icon as any} size={24} color="#333" />
          <Text style={styles.menuText}>{item.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 40,
    right: 10,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    width: 200,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    marginLeft: 16,
    fontSize: 14,
  },
});

export default AddMenu;
