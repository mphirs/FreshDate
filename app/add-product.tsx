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
import {
  scheduleProductReminder,
  cancelNotification,
} from '../lib/notifications';

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
  const [reminderUnit, setReminderUnit] =
    useState<ReminderUnit>('days');

  const [existing, setExisting] = useState<Product | null>(null);

  // Load an existing product or information received from the scanner.
  useEffect(() => {
    const loadProduct = async () => {
      if (params.id) {
        try {
          const allProducts = await getProducts();

          const found = allProducts.find(
            (product) => product.id === params.id
          );

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
        } catch (error) {
          console.error('Could not load product:', error);

          Alert.alert(
            'Error',
            'Could not load the existing product.'
          );
        }

        return;
      }

      // Populate fields when coming from the scanner.
      if (params.scannedName) {
        setName(params.scannedName);
      }

      if (params.scannedCategory) {
        setCategory(params.scannedCategory);
      }

      if (params.scannedQuantity) {
        setQuantity(params.scannedQuantity);
      }

      if (params.scannedBarcode) {
        setBarcode(params.scannedBarcode);
      }

      if (params.scannedExpiry) {
        const scannedDate = new Date(params.scannedExpiry);

        if (!isNaN(scannedDate.getTime())) {
          setExpiryDate(scannedDate);
        }
      }
    };

    loadProduct();
  }, [
    params.id,
    params.scannedName,
    params.scannedCategory,
    params.scannedQuantity,
    params.scannedExpiry,
    params.scannedBarcode,
  ]);

  // Handle expiry date selection.
  const handleDateValueChange = (
    _event: unknown,
    selectedDate?: Date
  ) => {
    if (selectedDate) {
      const updatedDate = new Date(selectedDate);

      // Preserve the previously selected expiry time.
      updatedDate.setHours(
        expiryDate.getHours(),
        expiryDate.getMinutes(),
        0,
        0
      );

      setExpiryDate(updatedDate);
    }

    // Android closes the picker after selection.
    // On iOS, keep it visible until dismissed.
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
  };

  // Handle expiry time selection.
  const handleTimeValueChange = (
    _event: unknown,
    selectedTime?: Date
  ) => {
    if (selectedTime) {
      const updatedDate = new Date(expiryDate);

      // Change the time without changing the expiry date.
      updatedDate.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0,
        0
      );

      setExpiryDate(updatedDate);
    }

    if (Platform.OS !== 'ios') {
      setShowTimePicker(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Missing name',
        'Please enter a product name.'
      );
      return;
    }

    if (isNaN(expiryDate.getTime())) {
      Alert.alert(
        'Invalid expiry date',
        'Please select a valid expiry date and time.'
      );
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
        // Save product details first.
        await updateProduct(existing.id, payload);

        // Refresh its reminder separately.
        // A notification problem should not prevent saving the product.
        try {
          if (existing.notificationId) {
            await cancelNotification(
              existing.notificationId
            );
          }

          const notificationId =
            await scheduleProductReminder({
              ...existing,
              ...payload,
            });

          if (notificationId) {
            await updateProduct(existing.id, {
              notificationId,
            });
          }
        } catch (notificationError) {
          console.warn(
            'Product updated, but its reminder could not be refreshed:',
            notificationError
          );
        }
      } else {
        // Save a new product first.
        const newProduct = await addProduct(payload);

        // Schedule the local expiry reminder separately.
        try {
          const notificationId =
            await scheduleProductReminder(newProduct);

          if (notificationId) {
            await updateProduct(newProduct.id, {
              notificationId,
            });
          }
        } catch (notificationError) {
          console.warn(
            'Product saved, but its reminder could not be scheduled:',
            notificationError
          );
        }
      }

      // Return to the previous screen after saving.
      router.back();
    } catch (error) {
      console.error('Could not save product:', error);

      Alert.alert(
        'Save failed',
        'Could not save the product. Please check the information and try again.'
      );
    }
  };

  const reminderOptions = [1, 2, 3, 4, 5, 6, 7];

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Scan shortcut */}
        {!isEditing && (
          <TouchableOpacity
            style={[
              styles.scanShortcut,
              { backgroundColor: '#0ea5e9' },
            ]}
            onPress={() => router.push('/scan')}
          >
            <Ionicons
              name="qr-code"
              size={20}
              color="#fff"
            />

            <Text style={styles.scanShortcutText}>
              Scan QR / Barcode instead
            </Text>
          </TouchableOpacity>
        )}

        {/* Product name */}
        <Text style={[styles.label, { color: colors.text }]}>
          Product Name *
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Fresh Milk"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="next"
        />

        {/* Quantity */}
        <Text style={[styles.label, { color: colors.text }]}>
          Quantity
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="e.g. 3 bottles"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="next"
        />

        {/* Category */}
        <Text style={[styles.label, { color: colors.text }]}>
          Category
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. Dairy"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="next"
        />

        {/* Barcode */}
        {barcode ? (
          <View>
            <Text
              style={[
                styles.label,
                { color: colors.text },
              ]}
            >
              Scanned Code
            </Text>

            <Text
              style={[
                styles.barcodeText,
                { color: colors.textSecondary },
              ]}
            >
              {barcode}
            </Text>
          </View>
        ) : null}

        {/* Expiry date */}
        <Text style={[styles.label, { color: colors.text }]}>
          Expiry Date
        </Text>

        <TouchableOpacity
          style={[
            styles.pickerBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            setShowTimePicker(false);
            setShowDatePicker(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Select expiry date"
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={colors.primary}
          />

          <Text
            style={[
              styles.pickerText,
              { color: colors.text },
            ]}
          >
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
            onValueChange={handleDateValueChange}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}

        {/* Expiry time */}
        <Text style={[styles.label, { color: colors.text }]}>
          Expiry Time
        </Text>

        <TouchableOpacity
          style={[
            styles.pickerBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            setShowDatePicker(false);
            setShowTimePicker(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Select expiry time"
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={colors.primary}
          />

          <Text
            style={[
              styles.pickerText,
              { color: colors.text },
            ]}
          >
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
            onValueChange={handleTimeValueChange}
            onDismiss={() => setShowTimePicker(false)}
          />
        )}

        {/* Reminder type */}
        <Text style={[styles.label, { color: colors.text }]}>
          Reminder Type
        </Text>

        <View style={styles.row}>
          {(['days', 'hours'] as ReminderUnit[]).map(
            (unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      reminderUnit === unit
                        ? colors.primary
                        : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setReminderUnit(unit)}
                accessibilityRole="button"
                accessibilityState={{
                  selected: reminderUnit === unit,
                }}
              >
                <Text
                  style={{
                    color:
                      reminderUnit === unit
                        ? '#fff'
                        : colors.text,
                    fontWeight: '600',
                  }}
                >
                  {unit === 'days'
                    ? 'Days before'
                    : 'Hours before'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Reminder value */}
        <Text style={[styles.label, { color: colors.text }]}>
          Remind me
        </Text>

        <View style={styles.row}>
          {reminderOptions.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chipSmall,
                {
                  backgroundColor:
                    reminderValue === value
                      ? colors.primary
                      : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setReminderValue(value)}
              accessibilityRole="button"
              accessibilityState={{
                selected: reminderValue === value,
              }}
              accessibilityLabel={`Remind me ${value} ${
                reminderUnit === 'days' ? 'days' : 'hours'
              } before expiry`}
            >
              <Text
                style={{
                  color:
                    reminderValue === value
                      ? '#fff'
                      : colors.text,
                  fontWeight: '700',
                }}
              >
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary },
          ]}
          onPress={handleSave}
          accessibilityRole="button"
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
  container: {
    padding: 20,
    paddingBottom: 60,
  },

  scanShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  scanShortcutText: {
    color: '#fff',
    fontWeight: '700',
  },

  label: {
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 14,
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },

  barcodeText: {
    fontSize: 13,
    marginBottom: 4,
  },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  pickerText: {
    fontSize: 16,
  },

  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

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

  saveBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});