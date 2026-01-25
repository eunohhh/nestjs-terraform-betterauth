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
              {clients.map((client) => (
                <Pressable
                  key={client.id}
                  style={[
                    styles.bookingItem,
                    {
                      backgroundColor:
                        selectedClient?.id === client.id
                          ? theme.tint + '20'
                          : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    onSelect(client);
                    onClose();
                  }}
                >
                  <Text style={[styles.bookingName, { color: theme.text }]}>{client.clientName}
                  </Text>
                  <Text style={[styles.bookingCat, { color: theme.icon }]}>{client.catName}
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
