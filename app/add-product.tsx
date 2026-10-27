import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import {
  addProduct,
  getProducts,
  updateProduct,
  Product,
  ReminderUnit,
} from '../lib/products';
import { scheduleProductReminder, cancelNotification } from '../lib/notifications';

export default function AddProduct() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    scannedName?: string;
    scannedCategory?: string;
    scannedQuantity?: string;
    scannedExpiry?: string;
    scannedBarcode?: string;
  }>();

  const isEditing = !!params.id;

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderValue, setReminderValue] = useState(1);
  const [reminderUnit, setReminderUnit] = useState<ReminderUnit>('days');
  const [existing, setExisting] = useState<Product | null>(null);

  // Load existing product or scanned data
  useEffect(() => {
    if (params.id) {
      (async () => {
        const all = await getProducts();
        const found = all.find((p) => p.id === params.id);
        if (found) {
          setExisting(found);
          setName(found.name);
          setQuantity(found.quantity);
          setCategory(found.category);
          setBarcode(found.barcode || '');
          setExpiryDate(new Date(found.expiryAt));
          setReminderValue(found.reminderValue);
          setReminderUnit(found.reminderUnit);
        }
      })();
    } else {
      // Coming from scanner
      if (params.scannedName) setName(params.scannedName);
      if (params.scannedCategory) setCategory(params.scannedCategory);
      if (params.scannedQuantity) setQuantity(params.scannedQuantity);
      if (params.scannedBarcode) setBarcode(params.scannedBarcode);
      if (params.scannedExpiry) {
        const d = new Date(params.scannedExpiry);
        if (!isNaN(d.getTime())) setExpiryDate(d);
      }
    }
  }, [params]);

  const onDateChange = (_: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setExpiryDate(selected);
  };

  const onTimeChange = (_: any, selected?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selected) {
      const newDate = new Date(expiryDate);
      newDate.setHours(selected.getHours());
      newDate.setMinutes(selected.getMinutes());
      setExpiryDate(newDate);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a product name.');
      return;
    }

    const payload = {
      name: name.trim(),
      quantity: quantity.trim() || '1',
      category: category.trim() || 'General',
      expiryAt: expiryDate.toISOString(),
      reminderValue,
      reminderUnit,
      barcode: barcode.trim() || undefined,
    };

    try {
      if (isEditing && existing) {
        await cancelNotification(existing.notificationId);
        const notificationId = await scheduleProductReminder({ ...existing, ...payload });
        await updateProduct(existing.id, { ...payload, notificationId });
      } else {
        const newProduct = await addProduct(payload);
        const notificationId = await scheduleProductReminder(newProduct);
        if (notificationId) {
          await updateProduct(newProduct.id, { notificationId });
        }
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save the product.');
    }
  };

  const reminderOptions = [1, 2, 3, 4, 5, 6, 7];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Scan shortcut */}
        {!isEditing && (
          <TouchableOpacity
            style={[styles.scanShortcut, { backgroundColor: '#0ea5e9' }]}
            onPress={() => router.push('/scan')}
          >
            <Ionicons name="qr-code" size={20} color="#fff" />
            <Text style={styles.scanShortcutText}>Scan QR / Barcode instead</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Product Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Fresh Milk"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.label, { color: colors.text }]}>Quantity</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="e.g. 3 bottles"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.label, { color: colors.text }]}>Category</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. Dairy"
          placeholderTextColor={colors.textSecondary}
        />

        {barcode ? (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Scanned Code</Text>
            <Text style={[styles.barcodeText, { color: colors.textSecondary }]}>{barcode}</Text>
          </>
        ) : null}

        {/* Date */}
        <Text style={[styles.label, { color: colors.text }]}>Expiry Date</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: colors.text }}>
            {expiryDate.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={expiryDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time */}
        <Text style={[styles.label, { color: colors.text }]}>Expiry Time</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={{ color: colors.text }}>
            {expiryDate.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={expiryDate}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        {/* Reminder Type */}
        <Text style={[styles.label, { color: colors.text }]}>Reminder Type</Text>
        <View style={styles.row}>
          {(['days', 'hours'] as ReminderUnit[]).map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[
                styles.chip,
                {
                  backgroundColor: reminderUnit === unit ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setReminderUnit(unit)}
            >
              <Text style={{ color: reminderUnit === unit ? '#fff' : colors.text, fontWeight: '600' }}>
                {unit === 'days' ? 'Days before' : 'Hours before'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reminder Value */}
        <Text style={[styles.label, { color: colors.text }]}>Remind me</Text>
        <View style={styles.row}>
          {reminderOptions.map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.chipSmall,
                {
                  backgroundColor: reminderValue === val ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setReminderValue(val)}
            >
              <Text style={{ color: reminderValue === val ? '#fff' : colors.text, fontWeight: '700' }}>
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>
            {isEditing ? 'Save Changes' : 'Save Product'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  scanShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  scanShortcutText: { color: '#fff', fontWeight: '700' },
  label: { fontWeight: '700', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  barcodeText: { fontSize: 13, marginBottom: 4 },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});