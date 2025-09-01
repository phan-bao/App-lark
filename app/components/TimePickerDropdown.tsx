import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface TimePickerDropdownProps {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (time: { hours: string; minutes: string }) => void;
  selectedTime?: { hours: string; minutes: string };
}

const TimePickerDropdown = ({ visible, onClose, onSelectTime, selectedTime }: TimePickerDropdownProps) => {
  const [hours, setHours] = useState<string | undefined>(selectedTime?.hours);
  const [minutes, setMinutes] = useState<string | undefined>(selectedTime?.minutes);
  const hoursScrollRef = useRef<ScrollView>(null);
  const minutesScrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>, isHours: boolean) => {
    const y = event.nativeEvent.contentOffset.y;
    const itemHeight = 40;
    const totalItems = isHours ? 24 : 60;
    const index = Math.round(y / itemHeight) % totalItems;
    
    const value = index.toString().padStart(2, '0');
    if (isHours) {
      setHours(value);
      if (minutes) {
        onSelectTime({ hours: value, minutes });
      }
    } else {
      setMinutes(value);
      if (hours) {
        onSelectTime({ hours, minutes: value });
      }
    }
  };

  const generateTimeOptions = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const value = (start + i).toString().padStart(2, '0');
      return (
        <View
          key={value}
          style={[
            styles.timeOption,
            (start === 0 && end === 59 ? minutes : hours) === value && styles.selectedTimeOption
          ]}
        >
          <Text style={[
            styles.timeText,
            (start === 0 && end === 59 ? minutes : hours) === value && styles.selectedTimeText
          ]}>
            {value}
          </Text>
        </View>
      );
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.timePickerContainer}>
        <View style={styles.columnContainer}>
          <View style={styles.highlightBox} />
          <ScrollView 
            ref={hoursScrollRef}
            style={styles.column}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => handleScroll(e, true)}
            onMomentumScrollEnd={(e) => handleScroll(e, true)}
            snapToInterval={40}
            decelerationRate="fast"
            scrollEventThrottle={16}
          >
            <View style={styles.paddingTop} />
            {generateTimeOptions(0, 23)}
            <View style={styles.paddingBottom} />
          </ScrollView>
        </View>
        <View style={styles.columnContainer}>
          <View style={styles.highlightBox} />
          <ScrollView 
            ref={minutesScrollRef}
            style={styles.column}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => handleScroll(e, false)}
            onMomentumScrollEnd={(e) => handleScroll(e, false)}
            snapToInterval={40}
            decelerationRate="fast"
            scrollEventThrottle={16}
          >
            <View style={styles.paddingTop} />
            {generateTimeOptions(0, 59)}
            <View style={styles.paddingBottom} />
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    height: 120,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    height: 120,
  },
  columnContainer: {
    position: 'relative',
    height: 120,
    width: 60,
    overflow: 'hidden',
  },
  column: {
    height: '100%',
  },
  highlightBox: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#f5f5f5',
    transform: [{ translateY: -20 }],
    zIndex: -1,
  },
  timeOption: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTimeOption: {
    backgroundColor: 'transparent',
  },
  timeText: {
    fontSize: 16,
    color: '#999',
  },
  selectedTimeText: {
    fontSize: 20,
    color: '#000',
    fontWeight: '600',
  },
  paddingTop: {
    height: 40,
  },
  paddingBottom: {
    height: 40,
  },
});

export default TimePickerDropdown; 