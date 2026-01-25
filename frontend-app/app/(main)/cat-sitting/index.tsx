import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar, type DateData, LocaleConfig } from 'react-native-calendars';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useSitting } from '@/providers/sitting-provider';
import type { SittingCare } from '@/lib/sitting-api';

// 한국어 로케일 설정
LocaleConfig.locales['ko'] = {
  monthNames: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
  ],
  monthNamesShort: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
  ],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

const MAX_VISIBLE_CARES = 3;

export default function CatSittingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { cares, isLoading, fetchCaresForMonth, toggleComplete, selectedMonth, setSelectedMonth } =
    useSitting();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchCaresForMonth();
  }, [fetchCaresForMonth]);

  // 날짜별로 care 그룹핑
  const caresByDate = React.useMemo(() => {
    const grouped: Record<string, SittingCare[]> = {};
    for (const care of cares) {
      const date = new Date(care.careTime);
      // KST 기준으로 날짜 추출
      const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
      const dateKey = kstDate.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(care);
    }
    // 각 날짜별로 시간순 정렬
    for (const key of Object.keys(grouped)) {
      grouped[key].sort(
        (a, b) => new Date(a.careTime).getTime() - new Date(b.careTime).getTime(),
      );
    }
    return grouped;
  }, [cares]);

  // 마킹 데이터 생성
  const markedDates = React.useMemo(() => {
    const marks: Record<string, { dots: { key: string; color: string }[] }> = {};
    for (const [date, carelist] of Object.entries(caresByDate)) {
      const dots = carelist.slice(0, 4).map((care, idx) => ({
        key: `${care.id}-${idx}`,
        color: care.completedAt ? '#9CA3AF' : '#38BDF8', // gray-400 / sky-400
      }));
      marks[date] = { dots };
    }
    return marks;
  }, [caresByDate]);

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      const dayCares = caresByDate[day.dateString] || [];
      if (dayCares.length === 0) return;

      if (dayCares.length > MAX_VISIBLE_CARES) {
        setSelectedDate(day.dateString);
        setModalVisible(true);
      } else {
        // 3개 이하면 첫번째 care로 바로 이동
        setSelectedDate(day.dateString);
        setModalVisible(true);
      }
    },
    [caresByDate],
  );

  const handleMonthChange = useCallback(
    (month: { year: number; month: number }) => {
      const newDate = new Date(month.year, month.month - 1, 1);
      setSelectedMonth(newDate);
      fetchCaresForMonth(newDate);
    },
    [setSelectedMonth, fetchCaresForMonth],
  );

  const handleCarePress = useCallback(
    (careId: string) => {
      setModalVisible(false);
      router.push(`/cat-sitting/care/${careId}` as any);
    },
    [router],
  );

  const handleToggleComplete = useCallback(
    async (careId: string) => {
      await toggleComplete(careId);
    },
    [toggleComplete],
  );

  const formatCareTime = (careTime: string) => {
    const date = new Date(careTime);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    });
  };

  const selectedDateCares = selectedDate ? caresByDate[selectedDate] || [] : [];

  // 커스텀 Day 컴포넌트
  const renderDay = useCallback(
    ({ date, state }: { date?: DateData; state?: string }) => {
      if (!date) return null;
      const dayCares = caresByDate[date.dateString] || [];
      const isToday = date.dateString === new Date().toISOString().split('T')[0];
      const isDisabled = state === 'disabled';

      return (
        <Pressable
          onPress={() => handleDayPress({ dateString: date.dateString })}
          style={[
            styles.dayContainer,
            isToday && { backgroundColor: theme.tint + '20' },
          ]}
        >
          <Text
            style={[
              styles.dayText,
              { color: isDisabled ? theme.icon : theme.text },
              isToday && { color: theme.tint, fontWeight: '600' },
            ]}
          >
            {date.day}
          </Text>
          <View style={styles.caresPreview}>
            {dayCares.slice(0, MAX_VISIBLE_CARES).map((care) => (
              <View
                key={care.id}
                style={[
                  styles.careDot,
                  { backgroundColor: care.completedAt ? '#9CA3AF' : '#38BDF8' },
                ]}
              />
            ))}
            {dayCares.length > MAX_VISIBLE_CARES && (
              <Text style={[styles.moreText, { color: theme.icon }]}>
                +{dayCares.length - MAX_VISIBLE_CARES}
              </Text>
            )}
          </View>
        </Pressable>
      );
    },
    [caresByDate, handleDayPress, theme],
  );

  if (isLoading && cares.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Calendar
        current={selectedMonth.toISOString().split('T')[0]}
        onMonthChange={handleMonthChange}
        markingType="multi-dot"
        markedDates={markedDates}
        dayComponent={renderDay}
        theme={{
          backgroundColor: theme.background,
          calendarBackground: theme.background,
          textSectionTitleColor: theme.text,
          monthTextColor: theme.text,
          arrowColor: theme.tint,
          todayTextColor: theme.tint,
          dayTextColor: theme.text,
          textDisabledColor: theme.icon,
        }}
        style={styles.calendar}
      />

      {/* 일별 상세 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedDate}
                </Text>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Text style={[styles.closeButton, { color: theme.tint }]}>닫기</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.careList}>
                {selectedDateCares.map((care) => (
                  <Pressable
                    key={care.id}
                    style={[
                      styles.careItem,
                      {
                        backgroundColor: care.completedAt
                          ? isDark
                            ? '#374151'
                            : '#F3F4F6'
                          : isDark
                            ? '#0C4A6E'
                            : '#E0F2FE',
                      },
                    ]}
                    onPress={() => handleCarePress(care.id)}
                  >
                    <View style={styles.careInfo}>
                      <Text
                        style={[
                          styles.careTime,
                          { color: care.completedAt ? theme.icon : theme.text },
                        ]}
                      >
                        {formatCareTime(care.careTime)}
                      </Text>
                      <Text
                        style={[
                          styles.careCatName,
                          { color: care.completedAt ? theme.icon : theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {care.booking?.catName || care.booking?.client?.catName}
                      </Text>
                      {care.note && (
                        <Text
                          style={[styles.careNote, { color: theme.icon }]}
                          numberOfLines={1}
                        >
                          {care.note}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      style={[
                        styles.completeButton,
                        {
                          backgroundColor: care.completedAt ? theme.tint : 'transparent',
                          borderColor: theme.tint,
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(care.id);
                      }}
                    >
                      <Text
                        style={{
                          color: care.completedAt ? '#FFFFFF' : theme.tint,
                          fontSize: 12,
                        }}
                      >
                        {care.completedAt ? '완료' : '미완료'}
                      </Text>
                    </Pressable>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendar: {
    paddingBottom: 10,
  },
  dayContainer: {
    width: 44,
    height: 60,
    alignItems: 'center',
    paddingTop: 4,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
  },
  caresPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 2,
    gap: 2,
  },
  careDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreText: {
    fontSize: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  careList: {
    maxHeight: 400,
  },
  careItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  careInfo: {
    flex: 1,
  },
  careTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  careCatName: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  careNote: {
    fontSize: 12,
    marginTop: 2,
  },
  completeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
});
