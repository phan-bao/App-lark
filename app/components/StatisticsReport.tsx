import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../src/config/firebaseConfig';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Task {
  id: string;
  title: string;
  status: string;
  createdAt: any;
  completedAt?: any;
  createdBy: {
    id: string;
    displayName: string;
    email: string;
    photoURL: string;
  };
  assignees: Array<{
    id: string;
    displayName: string;
    email: string;
    photoURL: string;
  }>;
}

interface UserStats {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  completedTasks: number;
  pendingTasks: number;
  totalTasks: number;
  assignedTasks: number;
  completionRate: number;
}

const StatisticsReport = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  useEffect(() => {
    fetchTasks();
  }, [timeRange]);

  const fetchTasks = async () => {
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef);
      const snapshot = await getDocs(q);
      
      const taskList: Task[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        taskList.push({
          id: doc.id,
          ...data
        } as Task);
      });

      setTasks(taskList);
      calculateStatistics(taskList);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu nhiệm vụ:', error);
    }
  };

  const calculateStatistics = (taskList: Task[]) => {
    const userStatsMap = new Map<string, UserStats>();
    
    // Khởi tạo thống kê cho tất cả người dùng từ assignees
    taskList.forEach(task => {
      task.assignees?.forEach(assignee => {
        if (!userStatsMap.has(assignee.id)) {
          userStatsMap.set(assignee.id, {
            userId: assignee.id,
            displayName: assignee.displayName,
            email: assignee.email,
            photoURL: assignee.photoURL,
            completedTasks: 0,
            pendingTasks: 0,
            totalTasks: 0,
            assignedTasks: 0,
            completionRate: 0
          });
        }
      });
    });

    // Tính toán thống kê
    taskList.forEach(task => {
      task.assignees?.forEach(assignee => {
        const stats = userStatsMap.get(assignee.id);
        if (stats) {
          stats.assignedTasks++;
          stats.totalTasks++;
          
          if (task.status === 'completed') {
            stats.completedTasks++;
          } else {
            stats.pendingTasks++;
          }

          stats.completionRate = (stats.completedTasks / stats.totalTasks) * 100;
        }
      });
    });

    const sortedStats = Array.from(userStatsMap.values())
      .sort((a, b) => b.completionRate - a.completionRate);
    setUserStats(sortedStats);
  };

  const getWeeklyData = () => {
    const now = new Date();
    // Lấy ngày đầu tuần (thứ 2)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const dailyStats = {
      completed: Array(7).fill(0),
      pending: Array(7).fill(0)
    };

    tasks.forEach(task => {
      const taskDate = task.completedAt ? task.completedAt.toDate() : task.createdAt.toDate();
      if (taskDate >= startOfWeek) {
        // Tính index từ 0-6 tương ứng T2-CN
        const dayIndex = (taskDate.getDay() + 6) % 7;
        if (dayIndex >= 0 && dayIndex < 7) {
          if (task.status === 'completed') {
            dailyStats.completed[dayIndex]++;
          } else {
            dailyStats.pending[dayIndex]++;
          }
        }
      }
    });

    return dailyStats;
  };

  const getMonthlyData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Lấy ngày đầu tiên của tháng
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Lấy ngày cuối cùng của tháng
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const weeklyStats = {
      completed: Array(5).fill(0), // Tăng lên 5 tuần để đảm bảo đủ cho các tháng dài
      pending: Array(5).fill(0)
    };

    tasks.forEach(task => {
      const taskDate = task.completedAt ? task.completedAt.toDate() : task.createdAt.toDate();
      if (taskDate >= startOfMonth && taskDate <= endOfMonth) {
        // Tính tuần trong tháng (1-5)
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const adjustedDate = taskDate.getDate() + firstDayOfMonth - 1;
        const weekIndex = Math.floor(adjustedDate / 7);
        
        if (weekIndex >= 0 && weekIndex < 5) {
          if (task.status === 'completed') {
            weeklyStats.completed[weekIndex]++;
          } else {
            weeklyStats.pending[weekIndex]++;
          }
        }
      }
    });

    return weeklyStats;
  };

  const chartData = {
    labels: timeRange === 'week' 
      ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
      : ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'],
    datasets: [
      {
        data: timeRange === 'week' ? getWeeklyData().completed : getMonthlyData().completed,
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: timeRange === 'week' ? getWeeklyData().pending : getMonthlyData().pending,
        color: (opacity = 1) => `rgba(255, 149, 0, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForBackgroundLines: {
      strokeDasharray: "", 
      stroke: "#e0e0e0",
      strokeWidth: 1
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: '500'
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Báo cáo thống kê</Text>
        <View style={styles.timeRangeSelector}>
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'week' && styles.activeTimeRange]}
            onPress={() => setTimeRange('week')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'week' && styles.activeTimeRangeText]}>
              Tuần
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'month' && styles.activeTimeRange]}
            onPress={() => setTimeRange('month')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'month' && styles.activeTimeRangeText]}>
              Tháng
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up-outline" size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Hiệu suất làm việc</Text>
        </View>
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 64}
            height={200}
            chartConfig={{
              ...chartConfig,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#007AFF"
              }
            }}
            bezier
            style={styles.chart}
            withDots={true}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={true}
            yAxisLabel=""
            yAxisSuffix=""
            yAxisInterval={1}
            segments={4}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#007AFF' }]} />
              <Text style={styles.legendText}>Đã hoàn thành</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9500' }]} />
              <Text style={styles.legendText}>Chưa hoàn thành</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Thống kê theo nhân viên</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScrollView}>
          {userStats.map((stat, index) => (
            <View key={stat.userId} style={styles.userStatCard}>
              <View style={styles.userHeader}>
                {stat.photoURL ? (
                  <Image 
                    source={{ uri: stat.photoURL }} 
                    style={styles.userAvatar} 
                  />
                ) : (
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>{stat.displayName[0]}</Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{stat.displayName}</Text>
                  <Text style={styles.userEmail}>{stat.email}</Text>
                </View>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stat.assignedTasks}</Text>
                  <Text style={styles.statLabel}>Được giao</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#007AFF' }]}>{stat.completedTasks}</Text>
                  <Text style={styles.statLabel}>Đã hoàn thành</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#FF9500' }]}>{stat.pendingTasks}</Text>
                  <Text style={styles.statLabel}>Đang thực hiện</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: stat.completionRate >= 70 ? '#34C759' : '#FF3B30' }]}>
                    {stat.completionRate.toFixed(0)}%
                  </Text>
                  <Text style={styles.statLabel}>Tỷ lệ hoàn thành</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTimeRange: {
    backgroundColor: '#007AFF',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTimeRangeText: {
    color: '#fff',
  },
  section: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chart: {
    borderRadius: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 16
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },
  statsScrollView: {
    marginTop: 8,
  },
  userStatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  }
});

export default StatisticsReport; 