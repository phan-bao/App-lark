import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../../../src/config/firebaseConfig";
import { LinearGradient } from 'expo-linear-gradient';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
} from "firebase/firestore";

interface Organization {
  id: string;
  name: string;
  members: string[];
  departments: string[];
  memberDetails?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    department?: string | null;
    photoURL?: string;
  }[];
}

const SuiteAdminScreen = () => {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showDepartments, setShowDepartments] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  useEffect(() => {
    console.log('Organization state đã thay đổi:', organization);
  }, [organization]);

  const fetchOrganizationData = async () => {
    try {
      if (!auth.currentUser) return;

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const orgId = userData.organizationId;

      if (orgId) {
        const orgDoc = await getDoc(doc(db, "organizations", orgId));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          console.log('Dữ liệu tổ chức:', orgData);
          console.log('Danh sách members:', orgData.members);
          
          if (!orgData.members || orgData.members.length === 0) {
            console.log('Không có thành viên nào trong tổ chức');
            return;
          }

          // Lấy thông tin chi tiết của các thành viên
          const memberDetails = await Promise.all(
            orgData.members.map(async (memberId: string) => {
              try {
                console.log('Đang lấy thông tin thành viên:', memberId);
                const memberDoc = await getDoc(doc(db, "users", memberId));
                if (memberDoc.exists()) {
                  const memberData = memberDoc.data();
                  console.log('Thông tin thành viên:', memberData);
                  return {
                    id: memberId,
                    fullName: memberData.fullName || 'Chưa có tên',
                    email: memberData.email || 'Chưa có email',
                    role: memberData.role || 'Thành viên',
                    department: memberData.department || null,
                    photoURL: memberData.photoURL || undefined
                  };
                }
                console.log(`Không tìm thấy thông tin thành viên với ID: ${memberId}`);
                return null;
              } catch (error) {
                console.error(`Lỗi khi lấy thông tin thành viên ${memberId}:`, error);
                return null;
              }
            })
          );

          // Lọc bỏ các thành viên null và cập nhật state
          const validMemberDetails = memberDetails.filter(Boolean);
          console.log('Số thành viên trong members:', orgData.members.length);
          console.log('Số thành viên trong memberDetails:', validMemberDetails.length);
          console.log('Chi tiết thành viên hợp lệ:', validMemberDetails);

          const updatedOrg = {
            id: orgDoc.id,
            name: orgData.name || 'Tổ chức của tôi',
            departments: orgData.departments || [],
            members: orgData.members,
            memberDetails: validMemberDetails,
            companyName: orgData.companyName,
            companySize: orgData.companySize,
            country: orgData.country,
            industry: orgData.industry,
            createdAt: orgData.createdAt
          };

          console.log('Organization sẽ được cập nhật:', updatedOrg);
          setOrganization(updatedOrg as Organization);
        }
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin tổ chức:", error);
      Alert.alert("Lỗi", "Không thể lấy thông tin tổ chức");
    } finally {
      setLoading(false);
    }
  };

  const addNewMember = async () => {
    if (!newMemberEmail.trim() || !organization) {
      Alert.alert("Lỗi", "Vui lòng nhập email thành viên");
      return;
    }

    try {
      setLoading(true);

      // Kiểm tra xem email đã tồn tại trong hệ thống chưa
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", newMemberEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Lỗi", "Email này chưa đăng ký tài khoản trong hệ thống");
        return;
      }

      // Kiểm tra xem người dùng đã là thành viên của tổ chức chưa
      const userDoc = querySnapshot.docs[0];
      if (userDoc.data().organizationId) {
        Alert.alert("Lỗi", "Người dùng này đã là thành viên của một tổ chức khác");
        return;
      }

      // Tạo thông báo mời tham gia tổ chức
      const notificationRef = collection(db, "organizationInvites");
      const inviteDoc = await addDoc(notificationRef, {
        organizationId: organization.id,
        organizationName: organization.name,
        receiverId: userDoc.id,
        senderId: auth.currentUser?.uid,
        status: "pending",
        createdAt: new Date(),
        type: "organization_invite"
      });

      // Thêm thông báo vào collection notifications
      const notificationsRef = collection(db, "notifications");
      await addDoc(notificationsRef, {
        type: "organization_invite",
        organizationId: organization.id,
        organizationName: organization.name,
        senderId: auth.currentUser?.uid,
        senderName: auth.currentUser?.displayName || "Admin",
        senderEmail: auth.currentUser?.email || "",
        receiverId: userDoc.id,
        createdAt: new Date(),
        isRead: false,
        inviteId: inviteDoc.id
      });

      Alert.alert("Thành công", "Đã gửi lời mời tham gia tổ chức");
      setNewMemberEmail("");
      
      // Cập nhật lại dữ liệu
      await fetchOrganizationData();
    } catch (error) {
      console.error("Lỗi khi gửi lời mời:", error);
      Alert.alert("Lỗi", "Không thể gửi lời mời");
    } finally {
      setLoading(false);
    }
  };

  const addNewDepartment = async () => {
    if (!newDepartment.trim() || !organization) {
      Alert.alert("Lỗi", "Vui lòng nhập tên phòng ban");
      return;
    }

    try {
      setLoading(true);

      const updatedDepartments = [...organization.departments, newDepartment.trim()];
      await updateDoc(doc(db, "organizations", organization.id), {
        departments: updatedDepartments,
      });

      Alert.alert("Thành công", "Đã thêm phòng ban mới");
      setNewDepartment("");
      fetchOrganizationData(); // Refresh data
    } catch (error) {
      console.error("Lỗi khi thêm phòng ban:", error);
      Alert.alert("Lỗi", "Không thể thêm phòng ban");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!organization) return;

    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn xóa thành viên này khỏi tổ chức?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // Cập nhật thông tin người dùng
              await updateDoc(doc(db, "users", memberId), {
                organizationId: null
              });

              // Cập nhật danh sách thành viên của tổ chức
              const updatedMembers = organization.members.filter(id => id !== memberId);
              await updateDoc(doc(db, "organizations", organization.id), {
                members: updatedMembers
              });

              // Cập nhật lại state
              setOrganization(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  members: updatedMembers,
                  memberDetails: prev.memberDetails?.filter(member => member.id !== memberId)
                };
              });

              Alert.alert("Thành công", "Đã xóa thành viên khỏi tổ chức");
            } catch (error) {
              console.error("Lỗi khi xóa thành viên:", error);
              Alert.alert("Lỗi", "Không thể xóa thành viên");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAddToDepartment = async (memberId: string, department: string) => {
    if (!organization) return;

    try {
      setLoading(true);
      
      // Chỉ cập nhật thông tin thành viên trong users collection
      await updateDoc(doc(db, "users", memberId), {
        department: department
      });

      // Cập nhật lại state
      setOrganization(prev => {
        if (!prev) return null;
        return {
          ...prev,
          memberDetails: prev.memberDetails?.map(member => 
            member.id === memberId 
              ? { ...member, department: department }
              : member
          )
        };
      });

      Alert.alert("Thành công", "Đã thêm thành viên vào phòng ban");
      setShowDepartmentModal(false);
      setSelectedMember(null);
      
      // Cập nhật lại dữ liệu
      await fetchOrganizationData();
    } catch (error) {
      console.error("Lỗi khi thêm vào phòng ban:", error);
      Alert.alert("Lỗi", "Không thể thêm thành viên vào phòng ban");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (department: string) => {
    if (!organization) return;

    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn xóa phòng ban này? Tất cả thành viên trong phòng ban sẽ bị xóa khỏi phòng ban.",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              // Xóa phòng ban khỏi danh sách
              const updatedDepartments = organization.departments.filter(dept => dept !== department);
              await updateDoc(doc(db, "organizations", organization.id), {
                departments: updatedDepartments
              });

              // Cập nhật thông tin department của các thành viên trong phòng ban
              const membersInDepartment = organization.memberDetails?.filter(
                member => member.department === department
              ) || [];

              await Promise.all(
                membersInDepartment.map(member =>
                  updateDoc(doc(db, "users", member.id), {
                    department: null
                  })
                )
              );

              // Cập nhật lại state
              setOrganization(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  departments: updatedDepartments,
                  memberDetails: prev.memberDetails?.map(member =>
                    member.department === department
                      ? { ...member, department: null }
                      : member
                  )
                };
              });

              Alert.alert("Thành công", "Đã xóa phòng ban");
              setSelectedDepartment(null);
            } catch (error) {
              console.error("Lỗi khi xóa phòng ban:", error);
              Alert.alert("Lỗi", "Không thể xóa phòng ban");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRemoveFromDepartment = async (memberId: string, department: string) => {
    if (!organization) return;

    try {
      setLoading(true);
      
      // Cập nhật thông tin thành viên trong users collection
      await updateDoc(doc(db, "users", memberId), {
        department: null
      });

      // Cập nhật lại state
      setOrganization(prev => {
        if (!prev) return null;
        return {
          ...prev,
          memberDetails: prev.memberDetails?.map(member => 
            member.id === memberId 
              ? { ...member, department: null }
              : member
          )
        };
      });

      Alert.alert("Thành công", "Đã xóa thành viên khỏi phòng ban");
    } catch (error) {
      console.error("Lỗi khi xóa thành viên khỏi phòng ban:", error);
      Alert.alert("Lỗi", "Không thể xóa thành viên khỏi phòng ban");
    } finally {
      setLoading(false);
    }
  };

  const renderMembersList = () => {
    if (!organization?.memberDetails || organization.memberDetails.length === 0) {
      return <Text style={styles.noDataText}>Không có thành viên nào</Text>;
    }

    // Sắp xếp lại danh sách để admin luôn ở đầu
    const sortedMembers = [...organization.memberDetails].sort((a, b) => {
      if (a.id === auth.currentUser?.uid) return -1;
      if (b.id === auth.currentUser?.uid) return 1;
      return 0;
    });

    return sortedMembers.map((member) => {
      // Lấy thông tin người dùng hiện tại
      const currentUser = auth.currentUser;
      const memberPhotoURL = member.id === currentUser?.uid ? currentUser?.photoURL : member.photoURL;

      return (
        <View key={member.id} style={styles.memberItem}>
          <View style={styles.memberInfo}>
            <View style={styles.memberAvatar}>
              {memberPhotoURL ? (
                <Image 
                  source={{ uri: memberPhotoURL }} 
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.memberAvatarText}>
                  {member.fullName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>
                {member.fullName}
                {member.id === currentUser?.uid && (
                  <Text style={styles.adminBadge}> (Admin)</Text>
                )}
              </Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
              <Text style={styles.memberRole}>
                {member.department ? `Phòng ban: ${member.department}` : 'Chưa có phòng ban'}
              </Text>
            </View>
          </View>
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedMember(member.id);
                setShowDepartmentModal(true);
              }}
            >
              <Ionicons name="business-outline" size={20} color="#4285F4" />
            </TouchableOpacity>
            {member.id !== currentUser?.uid && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleRemoveMember(member.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#E6F3FF', '#F0F7FF', '#E6F3FF']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suite Admin</Text>
      </View>

      <ScrollView style={styles.content}>
        {organization ? (
          <>
            <View style={styles.section}>
              <LinearGradient
                colors={['#FFFFFF', '#F8F9FA']}
                style={styles.infoCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <TouchableOpacity 
                  style={styles.orgHeader}
                  onPress={() => setShowMembers(!showMembers)}
                >
                  <Text style={styles.orgName}>{organization.name || 'Tổ chức của tôi'}</Text>
                  <Ionicons 
                    name={showMembers ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#2C3E50" 
                  />
                </TouchableOpacity>
                <Text style={styles.infoText}>
                  Số thành viên: {organization.members?.length || 0}
                </Text>
                <Text style={styles.infoText}>
                  Số phòng ban: {organization.departments?.length || 0}
                </Text>
              </LinearGradient>

              {showMembers && (
                <View style={styles.membersList}>
                  <Text style={styles.sectionTitle}>Danh sách thành viên</Text>
                  {renderMembersList()}
                </View>
              )}

              {showDepartmentModal && (
                <View style={styles.modalContainer}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Chọn phòng ban</Text>
                    <ScrollView style={styles.departmentList}>
                      {organization.departments.map((dept, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.departmentItem}
                          onPress={() => handleAddToDepartment(selectedMember!, dept)}
                        >
                          <Ionicons name="business-outline" size={24} color="#666" />
                          <Text style={styles.departmentItemText}>{dept}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowDepartmentModal(false);
                        setSelectedMember(null);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thêm thành viên mới</Text>
              <LinearGradient
                colors={['#FFFFFF', '#F8F9FA']}
                style={styles.inputContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email thành viên"
                  value={newMemberEmail}
                  onChangeText={setNewMemberEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#95A5A6"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addNewMember}
                  disabled={loading}
                >
                  <Text style={styles.addButtonText}>Thêm</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thêm phòng ban</Text>
              <LinearGradient
                colors={['#FFFFFF', '#F8F9FA']}
                style={styles.inputContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên phòng ban"
                  value={newDepartment}
                  onChangeText={setNewDepartment}
                  placeholderTextColor="#95A5A6"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addNewDepartment}
                  disabled={loading}
                >
                  <Text style={styles.addButtonText}>Thêm</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.infoCard}
                onPress={() => setShowDepartments(!showDepartments)}
              >
                <View style={styles.orgHeader}>
                  <Text style={styles.sectionTitle}>Danh sách phòng ban</Text>
                  <Ionicons 
                    name={showDepartments ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#666" 
                  />
                </View>
                <Text style={styles.infoText}>
                  Số phòng ban: {organization.departments?.length || 0}
                </Text>
              </TouchableOpacity>

              {showDepartments && (
                <View style={styles.departmentsList}>
                  {organization.departments.map((dept, index) => (
                    <View key={index} style={styles.departmentCard}>
                      <TouchableOpacity 
                        style={styles.departmentHeader}
                        onPress={() => setSelectedDepartment(selectedDepartment === dept ? null : dept)}
                      >
                        <View style={styles.departmentInfo}>
                          <Ionicons name="business-outline" size={24} color="#666" />
                          <Text style={styles.departmentName}>{dept}</Text>
                        </View>
                        <Ionicons 
                          name={selectedDepartment === dept ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color="#666" 
                        />
                      </TouchableOpacity>

                      {selectedDepartment === dept && (
                        <View style={styles.departmentContent}>
                          <View style={styles.departmentMembers}>
                            <Text style={styles.departmentMembersTitle}>Thành viên trong phòng ban:</Text>
                            {organization.memberDetails
                              ?.filter(member => member.department === dept)
                              .map(member => (
                                <View key={member.id} style={styles.departmentMember}>
                                  <Text style={styles.memberName}>{member.fullName}</Text>
                                  <TouchableOpacity
                                    style={styles.removeFromDepartmentButton}
                                    onPress={() => handleRemoveFromDepartment(member.id, dept)}
                                  >
                                    <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            {organization.memberDetails?.filter(member => member.department === dept).length === 0 && (
                              <Text style={styles.noMembersText}>Chưa có thành viên nào</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={styles.deleteDepartmentButton}
                            onPress={() => handleDeleteDepartment(dept)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            <Text style={styles.deleteDepartmentText}>Xóa phòng ban</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          <Text style={styles.noDataText}>Không tìm thấy thông tin tổ chức</Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  orgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orgName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
  },
  infoText: {
    fontSize: 16,
    color: "#34495E",
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    marginRight: 8,
    color: '#2C3E50',
  },
  addButton: {
    backgroundColor: "#3498DB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  memberEmail: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  memberRole: {
    fontSize: 12,
    color: '#3498DB',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  departmentList: {
    maxHeight: 300,
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  departmentItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  departmentsList: {
    marginTop: 16,
  },
  departmentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  departmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  departmentContent: {
    padding: 12,
  },
  departmentMembers: {
    marginBottom: 12,
  },
  departmentMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  departmentMember: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 6,
    marginBottom: 8,
  },
  noMembersText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  deleteDepartmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteDepartmentText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  removeFromDepartmentButton: {
    padding: 4,
  },
  noDataText: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: "center",
    marginTop: 24,
  },
  adminBadge: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default SuiteAdminScreen; 