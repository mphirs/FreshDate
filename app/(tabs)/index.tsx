```tsx
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

// FreshDate brand colours
const BRAND = {
  forest: '#143D2B',
  green: '#239568',
  mint: '#E5F5EB',
  cream: '#F6F8F3',
  teal: '#237E79',
  tealLight: '#E1F3F1',
  amber: '#D97706',
  amberLight: '#FFF2D9',
  red: '#D94F50',
  redLight: '#FCE8E8',
  blue: '#3478C5',
  blueLight: '#E8F1FC',
};

export default function Dashboard() {
  const { colors } = useTheme();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getProducts();

      data.sort(
        (a, b) =>
          new Date(a.expiryAt).getTime() -
          new Date(b.expiryAt).getTime()
      );

      setProducts(data);
    } catch (error) {
      console.error('Could not load products:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelNotification(product.notificationId);
              await deleteProduct(product.id);
              await load();
            } catch (error) {
              console.error('Could not delete product:', error);
              Alert.alert(
                'Unable to delete',
                'The product could not be deleted. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const stats = {
    total: products.length,
    expiring: products.filter(
      (p) => getProductStatus(p.expiryAt) === 'expiring'
    ).length,
    expired: products.filter(
      (p) => getProductStatus(p.expiryAt) === 'expired'
    ).length,
  };

  const freshCount = stats.total - stats.expiring - stats.expired;

  const getStatusAppearance = (status: string) => {
    if (status === 'expired') {
      return {
        label: 'Expired',
        background: BRAND.redLight,
        foreground: BRAND.red,
        icon: 'alert-circle-outline' as const,
      };
    }

    if (status === 'expiring') {
      return {
        label: 'Expiring soon',
        background: BRAND.amberLight,
        foreground: BRAND.amber,
        icon: 'time-outline' as const,
      };
    }

    return {
      label: 'Fresh',
      background: BRAND.mint,
      foreground: BRAND.green,
      icon: 'checkmark-circle-outline' as const,
    };
  };

  const renderItem = ({ item }: { item: Product }) => {
    const status = getProductStatus(item.expiryAt);
    const appearance = getStatusAppearance(status);

    return (
      <View
        style={[
          styles.productCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.productTop}>
          <View
            style={[
              styles.productIcon,
              { backgroundColor: appearance.background },
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={23}
              color={appearance.foreground}
            />
          </View>

          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            <View style={styles.categoryLine}>
              <Ionicons
                name="pricetag-outline"
                size={13}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {item.category || 'General'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: appearance.background },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: appearance.foreground },
              ]}
            >
              {appearance.label}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.productDivider,
            { backgroundColor: colors.border },
          ]}
        />

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons
              name="layers-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.detailText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Qty: {item.quantity}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={appearance.foreground}
            />
            <Text
              style={[styles.detailText, { color: colors.text }]}
              numberOfLines={2}
            >
              {formatDateTime(item.expiryAt)}
            </Text>
          </View>
        </View>

        {item.barcode ? (
          <View style={styles.barcodeLine}>
            <Ionicons
              name="barcode-outline"
              size={15}
              color={colors.textSecondary}
            />
            <Text
              style={[
                styles.barcodeText,
                { color: colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {item.barcode}
            </Text>
          </View>
        ) : null}

        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.editButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
            onPress={() =>
              router.push({
                pathname: '/add-product',
                params: { id: item.id },
              })
            }
          >
            <Ionicons name="create-outline" size={17} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              { borderColor: colors.border },
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={17} color={BRAND.red} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const DashboardHeader = () => (
    <View>
      {/* Welcome banner */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.brandLockup}>
            <View style={styles.logoBox}>
              <Ionicons name="leaf" size={25} color={BRAND.forest} />
            </View>

            <View>
              <Text style={styles.brandName}>FreshDate</Text>
              <Text style={styles.brandTagline}>SMART FRESHNESS TRACKING</Text>
            </View>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color="#D7F5E1"
            />
            <Text style={styles.heroBadgeText}>Stay organised</Text>
          </View>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeEyebrow}>YOUR FRESHNESS OVERVIEW</Text>
          <Text style={styles.heroTitle}>Less waste.{'\n'}More freshness.</Text>
          <Text style={styles.heroSubtitle}>
            Keep track of your products and know what needs attention.
          </Text>
        </View>

        <View style={styles.heroBottom}>
          <View style={styles.todayLabel}>
            <Ionicons
              name="calendar-clear-outline"
              size={16}
              color="#D7F5E1"
            />
            <Text style={styles.todayText}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>

          <Ionicons
            name="leaf-outline"
            size={46}
            color="rgba(255,255,255,0.16)"
          />
        </View>
      </View>

      {/* Summary */}
      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your inventory
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              { color: colors.textSecondary },
            ]}
          >
            A quick look at your products
          </Text>
        </View>

        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>OVERVIEW</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.statIcon,
              { backgroundColor: BRAND.blueLight },
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={19}
              color={BRAND.blue}
            />
          </View>
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {stats.total}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total items
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.statIcon,
              { backgroundColor: BRAND.amberLight },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={19}
              color={BRAND.amber}
            />
          </View>
          <Text style={[styles.statNumber, { color: BRAND.amber }]}>
            {stats.expiring}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Expiring soon
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.statIcon,
              { backgroundColor: BRAND.redLight },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={BRAND.red}
            />
          </View>
          <Text style={[styles.statNumber, { color: BRAND.red }]}>
            {stats.expired}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Expired
          </Text>
        </View>
      </View>

      {/* Freshness insight */}
      <View
        style={[
          styles.insightCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.insightIcon}>
          <Ionicons name="checkmark-circle" size={23} color={BRAND.green} />
        </View>

        <View style={styles.insightContent}>
          <Text style={[styles.insightTitle, { color: colors.text }]}>
            {freshCount} {freshCount === 1 ? 'item is' : 'items