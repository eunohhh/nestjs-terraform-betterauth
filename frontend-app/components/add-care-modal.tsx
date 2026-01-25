import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';
import { useSitting } from '@/providers/sitting-provider';
import { getBookings, type SittingBooking } from '@/lib/sitting-api';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialDate?: Date;
};

export function AddCareModal({ visible, onClose, initialDate }: Props) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { accessToken } = useAuth();
  const { createCare, fetchCaresForMonth } = useSitting();

  const [bookings, setBookings] = useState<SittingBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<SittingBooking | null>(null);
  const [careDate, setCareDate] = useState(initialDate ?? new Date());
  const [note, setNote] = useState('');
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showBookingPicker, setShowBookingPicker] = useState(false);

  // Booking 목록 가져오기
  useEffect(() => {
    if (visible && accessToken) {
      loadBookings();
    }
  }, [visible, accessToken]);

  // 초기 날짜 설정
  useEffect(() => {
    if (initialDate) {
      setCareDate(initialDate);
    }
  }, [initialDate]);

  const loadBookings = async () => {
    if (!accessToken) return;
    try {
      setIsLoadingBookings(true);
      const data = await getBookings(accessToken, { status: 'CONFIRMED' });
      setBookings(data);
      if (data.length > 0 && !selectedBooking) {
        setSelectedBooking(data[0]);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || '알 수 없는 오류';
      Alert.alert('오류', `예약 목록을 불러올 수 없습니다.\n${message}`);
      console.error('loadBookings error:', error?.response?.data || error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!selectedBooking) {
      Alert.alert('알림', '예약을 선택해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      // KST 형식으로 변환: "2026-01-25T14:30:00"
      const kstDate = new Date(careDate.getTime() + 9 * 60 * 60 * 1000);
      const careTimeKst = kstDate.toISOString().slice(0, 19);

      await createCare({
        bookingId: selectedBooking.id,
        careTimeKst,
        note: note.trim() || undefined,
      });

      await fetchCaresForMonth();
      handleClose();
      Alert.alert('완료', '케어가 추가되었습니다.');
    } catch (error) {
      Alert.alert('오류', '케어 추가에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedBooking, careDate, note, createCare, fetchCaresForMonth]);

  const handleClose = useCallback(() => {
    setSelectedBooking(null);
    setCareDate(new Date());
    setNote('');
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowBookingPicker(false);
    onClose();
  }, [onClose]);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      const newDate = new Date(careDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setCareDate(newDate);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      const newDate = new Date(careDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setCareDate(newDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <View
            style={[
              styles.content,
              { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
            ]}
          >
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Keyboard.dismiss();
              }}
            >
              {/* 헤더 */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>케어 추가</Text>
              <Pressable onPress={handleClose}>
                <Text style={[styles.closeButton, { color: theme.tint }]}>취소</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.form}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              {/* 예약 선택 */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.icon }]}>예약 선택</Text>
                {isLoadingBookings ? (
                  <ActivityIndicator size="small" color={theme.tint} />
                ) : bookings.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.icon }]}>
                    진행중인 예약이 없습니다
                  </Text>
                ) : (
                  <Pressable
                    style={[
                      styles.selectButton,
                      {
                        backgroundColor: isDark ? '#374151' : '#F3F4F6',
                        borderColor: isDark ? '#4B5563' : '#E5E7EB',
                      },
                    ]}
                    onPress={() => setShowBookingPicker(true)}
                  >
                    <Text style={[styles.selectButtonText, { color: theme.text }]}>
                      {selectedBooking
                        ? `${selectedBooking.client?.clientName} - ${selectedBooking.catName}`
                        : '예약을 선택하세요'}
                    </Text>
                    <Text style={{ color: theme.icon }}>▼</Text>
                  </Pressable>
                )}
              </View>

              {/* 날짜 선택 */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.icon }]}>날짜</Text>
                <Pressable
                  style={[
                    styles.selectButton,
                    {
                      backgroundColor: isDark ? '#374151' : '#F3F4F6',
                      borderColor: isDark ? '#4B5563' : '#E5E7EB',
                    },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.selectButtonText, { color: theme.text }]}>
                    {formatDate(careDate)}
                  </Text>
                </Pressable>
              </View>

              {/* 시간 선택 */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.icon }]}>시간</Text>
                <Pressable
                  style={[
                    styles.selectButton,
                    {
                      backgroundColor: isDark ? '#374151' : '#F3F4F6',
                      borderColor: isDark ? '#4B5563' : '#E5E7EB',
                    },
                  ]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={[styles.selectButtonText, { color: theme.text }]}>
                    {formatTime(careDate)}
                  </Text>
                </Pressable>
              </View>

              {/* 메모 */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.icon }]}>메모 (선택)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? '#374151' : '#F3F4F6',
                      borderColor: isDark ? '#4B5563' : '#E5E7EB',
                      color: theme.text,
                    },
                  ]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="메모를 입력하세요"
                  placeholderTextColor={theme.icon}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            {/* 저장 버튼 */}
            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: theme.tint },
                isSaving && { opacity: 0.6 },
              ]}
              onPress={handleSave}
              disabled={isSaving || !selectedBooking}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>저장</Text>
              )}
            </Pressable>
          </Pressable>
        </View>
      </Pressable>

      {/* 예약 선택 피커 */}
      <Modal
        visible={showBookingPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowBookingPicker(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setShowBookingPicker(false)}
        >
          <View
            style={[
              styles.pickerContent,
              { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>예약 선택</Text>
                <Pressable onPress={() => setShowBookingPicker(false)}>
                  <Text style={[styles.closeButton, { color: theme.tint }]}>완료</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.bookingList}>
                {bookings.map((booking) => (
                  <Pressable
                    key={booking.id}
                    style={[
                      styles.bookingItem,
                      {
                        backgroundColor:
                          selectedBooking?.id === booking.id
                            ? theme.tint + '20'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setSelectedBooking(booking);
                      setShowBookingPicker(false);
                    }}
                  >
                    <Text style={[styles.bookingName, { color: theme.text }]}>
                      {booking.client?.clientName}
                    </Text>
                    <Text style={[styles.bookingCat, { color: theme.icon }]}>
                      {booking.catName} · {booking.addressSnapshot}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* 날짜 피커 */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowDatePicker(false)}
          >
            <View
              style={[
                styles.datePickerContent,
                { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
              ]}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.header}>
                  <Text style={[styles.title, { color: theme.text }]}>날짜 선택</Text>
                  <Pressable onPress={() => setShowDatePicker(false)}>
                    <Text style={[styles.closeButton, { color: theme.tint }]}>완료</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={careDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  locale="ko-KR"
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* 시간 피커 */}
      {showTimePicker && (
        <Modal
          visible={showTimePicker}
          animationType="fade"
          transparent
          onRequestClose={() => setShowTimePicker(false)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowTimePicker(false)}
          >
            <View
              style={[
                styles.datePickerContent,
                { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
              ]}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.header}>
                  <Text style={[styles.title, { color: theme.text }]}>시간 선택</Text>
                  <Pressable onPress={() => setShowTimePicker(false)}>
                    <Text style={[styles.closeButton, { color: theme.tint }]}>완료</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={careDate}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  locale="ko-KR"
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  form: {
    maxHeight: 400,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: 16,
  },
  textInput: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContent: {
    borderRadius: 20,
    padding: 16,
    width: '90%',
    maxHeight: '60%',
  },
  datePickerContent: {
    borderRadius: 20,
    padding: 16,
    width: '90%',
  },
  bookingList: {
    maxHeight: 300,
  },
  bookingItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: '500',
  },
  bookingCat: {
    fontSize: 14,
    marginTop: 2,
  },
});
