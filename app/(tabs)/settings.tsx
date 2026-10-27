import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTheme } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

const WHATSAPP_NUMBER = '265994581381';
const EMAIL = 'msambakusi@gmail.com';

export default function Settings() {
  const { colors, mode, setTheme } = useTheme();

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      'Hello, this is a message from the FreshDate app regarding product expiry tracking.'
    );
    const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp not found', 'Please install WhatsApp or check the number.');
    });
  };

  const openEmail = () => {
    const subject = encodeURIComponent('FreshDate App – Product Report');
    const body = encodeURIComponent(
      'Hello,\n\nPlease find below the latest information from FreshDate.\n\n(You can paste the report here)\n\nRegards'
    );
    const url = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('No email app', 'Could not open the email client.');
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      <Text style={[styles.section, { color: colors.text }]}>Appearance</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.themeBtn,
            {
              backgroundColor: mode === 'light' ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setTheme('light')}
        >
          <Ionicons name="sunny" size={20} color={mode === 'light' ? '#fff' : colors.text} />
          <Text style={{ color: mode === 'light' ? '#fff' : colors.text, fontWeight: '600' }}>
            Light
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.themeBtn,
            {
              backgroundColor: mode === 'dark' ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setTheme('dark')}
        >
          <Ionicons name="moon" size={20} color={mode === 'dark' ? '#fff' : colors.text} />
          <Text style={{ color: mode === 'dark' ? '#fff' : colors.text, fontWeight: '600' }}>
            Dark
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.section, { color: colors.text, marginTop: 30 }]}>Share / Contact</Text>

      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
        onPress={openWhatsApp}
      >
        <Ionicons name="logo-whatsapp" size={22} color="#fff" />
        <Text style={styles.actionText}>Open WhatsApp (+265 994 581 381)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#2563eb', marginTop: 12 }]}
        onPress={openEmail}
      >
        <Ionicons name="mail" size={22} color="#fff" />
        <Text style={styles.actionText}>Email (msambakusi@gmail.com)</Text>
      </TouchableOpacity>

      <Text style={[styles.note, { color: colors.textSecondary }]}>
        These buttons open WhatsApp or your email app with a pre-filled message. They do not send
        messages automatically.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  section: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  note: { marginTop: 20, fontSize: 13, lineHeight: 20 },
});