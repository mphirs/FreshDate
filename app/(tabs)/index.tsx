import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import {
  getProducts,
  deleteProduct,
  Product,
  getProductStatus,
  formatDateTime,
} from '../../lib/products';
import { cancelNotification } from '../../lib/notifications';

export default function Dashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await getProducts();
    data.sort((a, b) => new Date(a.expiryAt).getTime() - new Date(b.expiryAt).getTime());
    setProducts(data);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = (product: Product) => {
    Alert.alert('Delete Product', `Delete "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelNotification(product.notificationId);
          await deleteProduct(product.id);
          load();
        },
      },
    ]);
  };

  const stats = {
    total: products.length,
    expiring: products.filter((p) => getProductStatus(p.expiryAt) === 'expiring').length,
    expired: products.filter((p) => getProductStatus(p.expiryAt) === 'expired').length,
  };

  const statusColor = (status: string) => {
    if (status === 'expired') return colors.danger;
    if (status === 'expiring') return colors.warning;
    return colors.success;
  };

  const statusBg = (status: string) => {
    if (status === 'expired') return colors.expired;
    if (status === 'expiring') return colors.expiring;
    return colors.ok;
  };

  const renderItem = ({ item }: { item: Product }) => {
    const status = getProductStatus(item.expiryAt);
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusBg(status) }]}>
            <Text style={[styles.badgeText, { color: statusColor(status) }]}>
              {status === 'expired' ? 'Expired' : status === 'expiring' ? 'Expiring Soon' : 'OK'}
            </Text>
          </View>
        </View>

        <Text style={{ color: colors.textSecondary }}>Category: {item.category}</Text>
        <Text style={{ color: colors.textSecondary }}>Quantity: {item.quantity}</Text>
        {item.barcode ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Code: {item.barcode}</Text>
        ) : null}
        <Text style={{ color: colors.text, fontWeight: '600', marginTop: 4 }}>
          Expiry: {formatDateTime(item.expiryAt)}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/add-product', params: { id: item.id } })}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.btnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.danger }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary }]}>
        <Text style={styles.bannerTitle}>FreshDate</Text>
        <Text style={styles.bannerSubtitle}>Keep your goods fresh. Waste less.</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>All Items</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.expiring}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Expiring Soon</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.danger }]}>{stats.expired}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Expired</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/add-product')}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.mainBtnText}>Add Item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: '#0ea5e9' }]}
          onPress={() => router.push('/scan')}
        >
          <Ionicons name="qr-code" size={22} color="#fff" />
          <Text style={styles.mainBtnText}>Scan QR / Code</Text>
        </TouchableOpacity>
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40, color: colors.textSecondary }}>
            No products yet.{'\n'}Tap “Add Item” or “Scan QR / Code”.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  bannerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  bannerSubtitle: { fontSize: 14, color: '#dcfce7', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
  },
  statNumber: { fontSize: 22, fontWeight: '800' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  mainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  mainBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productName: { fontSize: 17, fontWeight: '700', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});