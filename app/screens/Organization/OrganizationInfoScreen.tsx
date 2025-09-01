import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../../../src/config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

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
  }[];
}

const OrganizationInfoScreen = () => {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showDepartments, setShowDepartments] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizationData();
  }, []);

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
          
          if (!orgData.members || orgData.members.length === 0) {
            setLoading(false);
            return;
          }

          // Lấy thông tin chi tiết của các thành viên
          const memberDetails = await Promise.all(
            orgData.members.map(async (memberId: string) => {
              try {
                const memberDoc = await getDoc(doc(db, "users", memberId));
                if (memberDoc.exists()) {
                  const memberData = memberDoc.data();
                  return {
                    id: memberId,
                    fullName: memberData.fullName || 'Chưa có tên',
                    email: memberData.email || 'Chưa có email',
                    role: memberData.role || 'Thành viên',
                    department: memberData.department || null
                  };
                }
                return null;
              } catch (error) {
                console.error(`Lỗi khi lấy thông tin thành viên ${memberId}:`, error);
                return null;
              }
            })
          );

          const validMemberDetails = memberDetails.filter(Boolean);

          setOrganization({
            id: orgDoc.id,
            name: orgData.name || 'Tổ chức của tôi',
            departments: orgData.departments || [],
            members: orgData.members,
            memberDetails: validMemberDetails,
          });
        }
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin tổ chức:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderMembersList = () => {
    if (!organization?.memberDetails || organization.memberDetails.length === 0) {
      return <Text style={styles.noDataText}>Không có thành viên nào</Text>;
    }

    return organization.memberDetails.map((member) => (
      <View key={member.id} style={styles.memberItem}>
        <View style={styles.memberInfo}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>
              {member.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{member.fullName}</Text>
            <Text style={styles.memberEmail}>{member.email}</Text>
            <Text style={styles.memberRole}>
              {member.department ? `Phòng ban: ${member.department}` : 'Chưa có phòng ban'}
            </Text>
          </View>
        </View>
      </View>
    ));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin tổ chức</Text>
      </View>

      <ScrollView style={styles.content}>
        {organization ? (
          <>
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.infoCard}
                onPress={() => setShowMembers(!showMembers)}
              >
                <View style={styles.orgHeader}>
                  <Text style={styles.orgName}>{organization.name}</Text>
                  <Ionicons 
                    name={showMembers ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#666" 
                  />
                </View>
                <Text style={styles.infoText}>
                  Số thành viên: {organization.members?.length || 0}
                </Text>
                <Text style={styles.infoText}>
                  Số phòng ban: {organization.departments?.length || 0}
                </Text>
              </TouchableOpacity>

              {showMembers && (
                <View style={styles.membersList}>
                  <Text style={styles.sectionTitle}>Danh sách thành viên</Text>
                  {renderMembersList()}
                </View>
              )}
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
                                </View>
                              ))}
                            {organization.memberDetails?.filter(member => member.department === dept).length === 0 && (
                              <Text style={styles.noMembersText}>Chưa có thành viên nào</Text>
                            )}
                          </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
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
    color: "#333",
  },
  infoText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  membersList: {
    marginTop: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
  },
  memberRole: {
    fontSize: 12,
    color: '#4285F4',
    marginTop: 2,
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 24,
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
});

export default OrganizationInfoScreen; 