import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Share,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../../lib/theme';
import {
  getProducts,
  Product,
  getProductStatus,
  formatDateTime,
} from '../../lib/products';

type Filter = 'week' | 'month' | 'previous';

export default function Reports() {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<Filter>('week');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await getProducts();
        setProducts(data);
      })();
    }, [])
  );

  const filtered = products.filter((p) => {
    const now = new Date();
    const expiry = new Date(p.expiryAt);

    if (filter === 'week') {
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      return expiry >= now && expiry <= nextWeek;
    }
    if (filter === 'month') {
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);
      return expiry >= now && expiry <= nextMonth;
    }
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return expiry >= startPrev && expiry <= endPrev;
  });

  const generateHTML = () => {
    const title =
      filter === 'week'
        ? 'Products expiring in the next 7 days'
        : filter === 'month'
        ? 'Products expiring in the next month'
        : 'Products that expired last month';

    const rows = filtered
      .map(
        (p) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.quantity}</td>
        <td>${formatDateTime(p.expiryAt)}</td>
        <td>${getProductStatus(p.expiryAt)}</td>
      </tr>`
      )
      .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #16a34a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #16a34a; color: white; }
          </style>
        </head>
        <body>
          <h1>FreshDate Report</h1>
          <p>${title}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
            ${rows || '<tr><td colspan="5">No products found</td></tr>'}
          </table>
        </body>
      </html>`;
  };

  const createPDF = async () => {
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share FreshDate PDF',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not create PDF');
    }
  };

  const createWordCompatible = async () => {
    try {
      const html = generateHTML();
      const fileUri = FileSystem.cacheDirectory + 'FreshDate_Report.doc';
      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/msword',
        dialogTitle: 'Share Word-compatible report',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not create document');
    }
  };

  const shareSummary = async () => {
    const summary = filtered
      .map((p) => `• ${p.name} – ${formatDateTime(p.expiryAt)} (${getProductStatus(p.expiryAt)})`)
      .join('\n');

    await Share.share({
      message: `FreshDate Report\n\n${summary || 'No products in this period.'}`,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Reports</Text>

      <View style={styles.filterRow}>
        {([
          { key: 'week', label: 'Next Week' },
          { key: 'month', label: 'Next Month' },
          { key: 'previous', label: 'Previous Month' },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterBtn,
              {
                backgroundColor: filter === f.key ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={{ color: filter === f.key ? '#fff' : colors.text, fontWeight: '600' }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
            <Text style={{ color: colors.textSecondary }}>
              {formatDateTime(item.expiryAt)} • {getProductStatus(item.expiryAt)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 30, color: colors.textSecondary }}>
            No products match this filter.
          </Text>
        }
        style={{ flex: 1, marginTop: 12 }}
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={createPDF}
        >
          <Text style={styles.actionText}>Create / Share PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primaryDark }]}
          onPress={createWordCompatible}
        >
          <Text style={styles.actionText}>Word-compatible Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
          onPress={shareSummary}
        >
          <Text style={styles.actionText}>Share Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  card: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  actions: { gap: 10, marginTop: 12, marginBottom: 20 },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '700' },
});