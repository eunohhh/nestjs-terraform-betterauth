import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { SittingClient } from '@/lib/sitting-api';

import { styles } from './add-care-modal.styles';

type Theme = {
  text: string;
  icon: string;
  tint: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  clients: SittingClient[];
  selectedClient: SittingClient | null;
  onSelect: (client: SittingClient) => void;
  theme: Theme;
  isDark: boolean;
};

export function ClientPickerModal({
  visible,
  onClose,
  clients,
  selectedClient,
  onSelect,
  theme,
  isDark,
}: Props) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  const sortedClients = [...clients].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <View
          style={[
            styles.pickerContent,
            { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>고객 선택</Text>
              <Pressable onPress={onClose}>
                <Text style={[styles.closeButton, { color: theme.tint }]}>완료</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.bookingList}>
              {sortedClients.map((client) => (
                <Pressable
                  key={client.id}
                  style={[
                    styles.bookingItem,
                    {
                      backgroundColor:
                        selectedClient?.id === client.id
                          ? theme.tint + '20'
                          : 'transparent',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    },
                  ]}
                  onPress={() => {
                    onSelect(client);
                    onClose();
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bookingName, { color: theme.text }]}>
                      {client.clientName}
                    </Text>
                    <Text style={[styles.bookingCat, { color: theme.icon }]}>
                      {client.catName}
                    </Text>
                  </View>
                  <Text style={{ color: theme.icon, fontSize: 12 }}>
                    {formatDate(client.createdAt)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
