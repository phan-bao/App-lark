import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TimePickerDropdown from './TimePickerDropdown';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dates: { 
    startDate?: Date; 
    endDate?: Date;
    startTime?: { hours: string; minutes: string };
    endTime?: { hours: string; minutes: string };
  }) => void;
  selectedDates?: {
    startDate?: Date;
    endDate?: Date;
    startTime?: { hours: string; minutes: string };
    endTime?: { hours: string; minutes: string };
  };
}

const DatePickerModal = ({ visible, onClose, onSelectDate, selectedDates }: DatePickerModalProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(selectedDates?.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(selectedDates?.endDate);
  const [startTime, setStartTime] = useState<{ hours: string; minutes: string } | undefined>(selectedDates?.startTime);
  const [endTime, setEndTime] = useState<{ hours: string; minutes: string } | undefined>(selectedDates?.endTime);
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setStartDate(selectedDates?.startDate);
      setEndDate(selectedDates?.endDate);
      setStartTime(selectedDates?.startTime);
      setEndTime(selectedDates?.endTime);
    }
  }, [visible, selectedDates]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    // Thêm ngày từ tháng trước
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        month: month - 1,
        year: year,
        isCurrentMonth: false
      });
    }
    
    // Thêm ngày của tháng hiện tại
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true
      });
    }
    
    // Thêm ngày của tháng sau
    const remainingDays = 42 - days.length; // 6 hàng x 7 cột
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        month: month + 1,
        year: year,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const formatMonthYear = () => {
    return `${currentDate.getFullYear()}.${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleDateSelect = (day: number, month: number, year: number) => {
    const newDate = new Date(year, month, day);
    if (activeTab === 'start') {
      setStartDate(newDate);
      if (endDate && newDate > endDate) {
        setEndDate(undefined);
      }
    } else {
      if (startDate && newDate < startDate) {
        setStartDate(newDate);
        setEndDate(startDate);
      } else {
        setEndDate(newDate);
      }
    }
  };

  const handleSave = () => {
    onSelectDate({ 
      startDate, 
      endDate,
      startTime,
      endTime
    });
    onClose();
  };

  const clearDate = () => {
    if (activeTab === 'start') {
      setStartDate(undefined);
      setEndDate(undefined);
    } else {
      setEndDate(undefined);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const isSelectedDate = (day: number, month: number, year: number) => {
    const date = new Date(year, month, day);
    if (activeTab === 'start' && startDate) {
      return date.getTime() === startDate.getTime();
    }
    if (activeTab === 'end' && endDate) {
      return date.getTime() === endDate.getTime();
    }
    return false;
  };

  const isInRange = (day: number, month: number, year: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(year, month, day);
    return date > startDate && date < endDate;
  };

  const formatTabDate = (date?: Date, time?: { hours: string; minutes: string }) => {
    if (!date) {
      return activeTab === 'start' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc';
    }
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dayName = days[date.getDay()];
    const dateStr = `${date.getDate()} tháng ${date.getMonth() + 1}`;
    const timeStr = time ? ` ${time.hours}:${time.minutes}` : '';
    return `${dayName}, ${dateStr}${timeStr}`;
  };

  const formatTime = (time?: { hours: string; minutes: string }) => {
    if (!time) return '';
    return ` ${time.hours}:${time.minutes}`;
  };

  const handleTimeSelect = (time: { hours: string; minutes: string }) => {
    if (activeTab === 'start') {
      setStartTime(time);
      onSelectDate({
        startDate,
        endDate,
        startTime: time,
        endTime: endTime
      });
    } else {
      setEndTime(time);
      onSelectDate({
        startDate,
        endDate,
        startTime: startTime,
        endTime: time
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Lưu</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'start' && styles.activeTab]}
            onPress={() => setActiveTab('start')}
          >
            <Text style={[styles.tabText, activeTab === 'start' && styles.activeTabText]}>
              {startDate ? formatTabDate(startDate, startTime) : 'Chọn ngày bắt đầu'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'end' && styles.activeTab]}
            onPress={() => setActiveTab('end')}
          >
            <Text style={[styles.tabText, activeTab === 'end' && styles.activeTabText]}>
              {endDate ? formatTabDate(endDate, endTime) : 'Chọn ngày kết thúc'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <Text style={styles.monthYearText}>{formatMonthYear()}</Text>
          <View style={styles.navigationButtons}>
            <TouchableOpacity onPress={() => navigateMonth('prev')}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigateMonth('next')}>
              <Ionicons name="chevron-forward" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdayHeader}>
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, index) => (
            <Text 
              key={day} 
              style={[
                styles.weekdayText,
                index === 0 && styles.sundayText,
                index === 6 && styles.saturdayText
              ]}
            >
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {getMonthData().map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                !item.isCurrentMonth && styles.otherMonthDay,
                isSelectedDate(item.day, item.month, item.year) && styles.selectedDay,
                isInRange(item.day, item.month, item.year) && styles.rangeDay
              ]}
              onPress={() => handleDateSelect(item.day, item.month, item.year)}
            >
              <Text style={[
                styles.dayText,
                !item.isCurrentMonth && styles.otherMonthDayText,
                isSelectedDate(item.day, item.month, item.year) && styles.selectedDayText,
                isInRange(item.day, item.month, item.year) && styles.rangeDayText
              ]}>
                {item.day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time Setting Option */}
        <View style={styles.timeSettingContainer}>
          <TimePickerDropdown
            visible={true}
            onClose={() => {}}
            onSelectTime={handleTimeSelect}
            selectedTime={activeTab === 'start' ? startTime : endTime}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F5F7FA',
    gap: 10,
  },
  tab: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  activeTab: {
    backgroundColor: '#007AFF',
    elevation: 2,
    shadowOpacity: 0.2,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  monthYearText: {
    fontSize: 20,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  sundayText: {
    color: '#666',
  },
  saturdayText: {
    color: '#007AFF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthDayText: {
    color: '#999',
  },
  selectedDay: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayText: {
    color: '#fff',
  },
  timeSettingContainer: {
    position: 'relative',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  rangeDay: {
    backgroundColor: '#E3F2FF',
  },
  rangeDayText: {
    color: '#007AFF',
  },
});

export default DatePickerModal; 