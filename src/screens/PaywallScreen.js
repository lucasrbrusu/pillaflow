import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';

import { borderRadius, spacing, typography, shadows } from '../utils/theme';
import { useApp } from '../context/AppContext';
import {
  configureRevenueCat,
  loadOfferingPackages,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  getPremiumEntitlementStatus,
} from '../../RevenueCat';

const featureList = [
  {
    title: 'AI agent',
    icon: 'sparkles-outline',
    iconBg: '#EFE9FF',
    iconColor: '#6D5EEA',
    subtitle: 'Get personalized planning help and smart summaries.',
  },
  {
    title: 'Weekly & Monthly Insights',
    icon: 'bulb-outline',
    iconBg: '#EAF7FF',
    iconColor: '#38BDF8',
    subtitle: 'See highlights and trends across your pillars.',
  },
  {
    title: 'Groups & collaboration',
    icon: 'people-outline',
    iconBg: '#E7F0FF',
    iconColor: '#4F80FF',
    subtitle: 'Build routines with friends and keep each other on track.',
  },
  {
    title: 'Advanced analytics',
    icon: 'analytics-outline',
    iconBg: '#E6FBF2',
    iconColor: '#22C55E',
    subtitle: 'Track patterns across health, focus, and habits.',
  },
  {
    title: 'Weight Manager',
    icon: 'barbell-outline',
    iconBg: '#ECFDF3',
    iconColor: '#10B981',
    subtitle: 'Personalized calorie + macro targets for body goals.',
  },
  {
    title: 'Finance insights & budgets',
    icon: 'wallet-outline',
    iconBg: '#ECFDF3',
    iconColor: '#10B981',
    subtitle: 'Track spending, recurring payments, and budgets.',
  },
  {
    title: 'Streak protection',
    icon: 'time-outline',
    iconBg: '#FFF7E8',
    iconColor: '#F97316',
    subtitle: "Extra cushion so a missed day won't reset your streak.",
  },
  {
    title: 'Premium badge',
    icon: 'ribbon-outline',
    iconBg: '#FFE7EF',
    iconColor: '#FB7185',
    subtitle: 'Stand out with a premium badge on your profile.',
  },
  {
    title: 'Priority support',
    icon: 'shield-checkmark-outline',
    iconBg: '#F2EAFF',
    iconColor: '#8B5CF6',
    subtitle: 'Get faster answers from the Pillaflow team.',
  },
];

const PaywallScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { isPremium, refreshRevenueCatPremium, authUser, themeName, themeColors } = useApp();
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [monthlyPackage, setMonthlyPackage] = useState(null);
  const [annualPackage, setAnnualPackage] = useState(null);
  const [purchasingId, setPurchasingId] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [entitled, setEntitled] = useState(!!isPremium);
  const [entitlementLabel, setEntitlementLabel] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const isDark = themeName === 'dark';
  const accentColor = isDark ? '#c4b5fd' : '#9b5cff';
  const backIconColor = isDark ? '#e5e7eb' : '#3f3f46';
  const styles = useMemo(
    () => createStyles({ isDark, themeColors, accentColor }),
    [isDark, themeColors, accentColor]
  );
  const source = route.params?.source || '';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setLoadingError('');
      try {
        await configureRevenueCat();
        const { offering, monthly, annual } = await loadOfferingPackages();
        if (!mounted) return;
        setMonthlyPackage(monthly || null);
        setAnnualPackage(annual || null);
        if (Platform.OS === 'ios' && (!offering || !monthly || !annual)) {
          setLoadingError(
            'RevenueCat iOS premium must use the default offering with pillaflow_monthly and pillaflow_yearly.'
          );
        }
      } catch (err) {
        if (!mounted) return;
        setLoadingError(err?.message || 'Unable to load plans right now.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const syncEntitlement = async () => {
      try {
        const { isActive, entitlement } =
          (await refreshRevenueCatPremium()) || (await getPremiumEntitlementStatus(authUser?.id));
        if (!active) return;
        setEntitled(!!isActive || !!isPremium);
        setEntitlementLabel(entitlement?.productIdentifier || '');
      } catch {
        // ignore; keep existing state
      }
    };
    syncEntitlement();
    return () => {
      active = false;
    };
  }, [isPremium, refreshRevenueCatPremium]);

  const formatPrice = (pkg) => {
    const product = pkg?.product;
    if (!product) {
      return 'Price via RevenueCat';
    }
    if (product.priceString) {
      return product.priceString;
    }
    if (product.price && product.currencyCode) {
      const formatted = Number(product.price).toFixed(2);
      return `${product.currencyCode} ${formatted}`;
    }
    return 'Price via RevenueCat';
  };

  const handlePurchase = async (pkg) => {
    if (!pkg) {
      setLoadingError('This plan is not available yet. Check your RevenueCat offering.');
      return;
    }
    if (entitled) return;
    setPurchasingId(pkg.identifier);
    setLoadingError('');
    try {
      await purchaseRevenueCatPackage(pkg);
      const status =
        (await refreshRevenueCatPremium()) || (await getPremiumEntitlementStatus(authUser?.id));
      setEntitled(!!status?.isActive || !!isPremium);
      navigation.goBack();
    } catch (err) {
      if (!err?.userCancelled) {
        setLoadingError(err?.message || 'Purchase did not complete.');
      }
    } finally {
      setPurchasingId('');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setLoadingError('');
    try {
      await restoreRevenueCatPurchases();
      const status =
        (await refreshRevenueCatPremium()) || (await getPremiumEntitlementStatus(authUser?.id));
      setEntitled(!!status?.isActive || !!isPremium);
      navigation.goBack();
    } catch (err) {
      setLoadingError(err?.message || 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  };

  const handlePlanPress = (planKey, pkg) => {
    if (purchasingId || entitled) return;
    setSelectedPlan(planKey);
    handlePurchase(pkg);
  };

  const getPlanFooterLabel = (planKey, pkg) => {
    if (purchasingId === pkg?.identifier) return 'Processing...';
    if (selectedPlan === planKey) {
      return entitled ? 'Current plan' : 'Selected';
    }
    if (entitled) return 'Premium active';
    return 'Tap to select';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={backIconColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Image
            source={require('../../assets/adaptive-icon.png')}
            style={styles.heroIcon}
            resizeMode="contain"
          />
          <View style={styles.titleRow}>
            <View style={styles.titleSide}>
              <Text style={styles.titleText}>Pillaflow</Text>
            </View>
            <View style={[styles.titleSide, styles.titleSideRight]}>
              <Svg width={110} height={28} style={styles.titleGradient}>
              <Defs>
                <SvgLinearGradient id="premiumGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#F9E7A3" />
                  <Stop offset="50%" stopColor="#E6B85C" />
                  <Stop offset="100%" stopColor="#C9922E" />
                </SvgLinearGradient>
              </Defs>
              <SvgText
                x="0"
                y="22"
                fill="url(#premiumGold)"
                fontSize="22"
                fontWeight="700"
              >
                Premium
              </SvgText>
              </Svg>
            </View>
          </View>
          <Text style={styles.subtitle}>Unlock all premium features</Text>
          {source ? <Text style={styles.sourceNote}>Opened from: {source}</Text> : null}
          {entitled && (
            <View style={styles.entitlementPill}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text style={styles.entitlementText}>
                Active: {entitlementLabel || 'Pillaflow Premium'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.featuresTimeline}>
          <View style={styles.timelineLine} />
          {featureList.map((item) => (
            <View key={item.title} style={styles.featureTimelineRow}>
              <View style={[styles.featureDot, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={18} color={item.iconColor} />
              </View>
              <View style={styles.featureTimelineText}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.planStack}>
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={accentColor} />
              <Text style={styles.loadingText}>Fetching plans...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => handlePlanPress('monthly', monthlyPackage)}
                disabled={!!purchasingId || entitled}
              >
                <LinearGradient
                  colors={['#b974ff', '#a65bff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.planCard}
                >
                  <View style={styles.planHeader}>
                    <Text style={[styles.planLabel, styles.planLabelLight]}>Monthly</Text>
                    <View style={[styles.planBadge, styles.planBadgeLight]}>
                      <Text style={[styles.planBadgeText, styles.planBadgeTextLight]}>Flexible</Text>
                    </View>
                  </View>
                  <Text style={[styles.planPrice, styles.planTextLight]}>
                    {formatPrice(monthlyPackage)}
                  </Text>
                  <Text style={[styles.planDetail, styles.planTextLight]}>Cancel anytime</Text>
                  <View style={styles.planDividerLight} />
                  <View style={styles.planFooter}>
                    {purchasingId === monthlyPackage?.identifier ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : selectedPlan === 'monthly' ? (
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    ) : null}
                    <Text style={[styles.planFooterText, styles.planFooterTextLight]}>
          {getPlanFooterLabel('monthly', monthlyPackage)}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => handlePlanPress('yearly', annualPackage)}
                disabled={!!purchasingId || entitled}
              >
                <View
                  style={[
                    styles.planOutlineCard,
                    selectedPlan === 'yearly' && styles.planOutlineCardSelected,
                  ]}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planLabel}>Yearly</Text>
                    <View style={[styles.planBadge, styles.bestValueBadge]}>
                      <Text style={[styles.planBadgeText, styles.bestValueBadgeText]}>Best value</Text>
                    </View>
                  </View>
                  <Text style={styles.planPrice}>{formatPrice(annualPackage)}</Text>
                  <Text style={styles.planDetail}>Save with annual plan</Text>
                  <View style={styles.planDivider} />
                  <View style={styles.planFooter}>
                    {purchasingId === annualPackage?.identifier ? (
                      <ActivityIndicator size="small" color={accentColor} />
                    ) : selectedPlan === 'yearly' ? (
                      <Ionicons name="checkmark" size={16} color={accentColor} />
                    ) : null}
                    <Text style={styles.planFooterText}>
                      {getPlanFooterLabel('yearly', annualPackage)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {!!loadingError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadingError}</Text>
          </View>
        )}

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring || !!purchasingId}
            activeOpacity={0.7}
          >
            {restoring ? <ActivityIndicator size="small" color={accentColor} /> : null}
            <Text style={styles.restoreText}>
              {restoring ? 'Restoring...' : 'Restore purchases'}
            </Text>
          </TouchableOpacity>
          {entitled ? (
            <Text style={styles.smallNote}>You already have Premium on this account.</Text>
          ) : (
            <Text style={styles.smallNote}>
              Purchases are managed securely via RevenueCat. Once connected, your live prices and trials appear here.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = ({ isDark, themeColors, accentColor }) => {
  const background = isDark ? themeColors?.background || '#0f1115' : '#ffffff';
  const surface = isDark ? themeColors?.card || '#161b26' : '#ffffff';
  const text = themeColors?.text || (isDark ? '#f3f4f6' : '#111827');
  const textSecondary = themeColors?.textSecondary || (isDark ? '#9ca3af' : '#6b7280');
  const textMuted = themeColors?.textLight || (isDark ? '#94a3b8' : '#94a3b8');
  const softBorder = isDark ? '#2b3342' : '#eee7de';
  const line = isDark ? '#2c3446' : '#f1ede7';
  const backButtonBg = isDark ? '#151a24' : '#ffffff';
  const badgeBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const entitlementBg = isDark ? 'rgba(34,197,94,0.18)' : '#e7f8ef';
  const entitlementBorder = isDark ? 'rgba(34,197,94,0.35)' : '#bbf7d0';
  const entitlementText = isDark ? '#86efac' : '#15803d';
  const errorBg = isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2';
  const errorBorder = isDark ? 'rgba(239,68,68,0.35)' : '#fecaca';
  const errorText = isDark ? '#fca5a5' : '#991b1b';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: softBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: backButtonBg,
      ...shadows.small,
    },
    hero: {
      alignItems: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    heroIcon: {
      width: 56,
      height: 56,
      backgroundColor: 'transparent',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      marginTop: spacing.md,
      transform: [{ translateX: -6 }],
    },
    titleSide: {
      flex: 1,
      alignItems: 'flex-end',
    },
    titleSideRight: {
      alignItems: 'flex-start',
    },
    titleText: {
      fontSize: 22,
      fontWeight: '700',
      color: text,
      letterSpacing: 0.2,
    },
    titleGradient: {
      marginLeft: 6,
    },
    subtitle: {
      ...typography.bodySmall,
      color: textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    sourceNote: {
      ...typography.caption,
      color: textMuted,
      marginTop: spacing.xs,
    },
    entitlementPill: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: entitlementBg,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: entitlementBorder,
    },
    entitlementText: {
      ...typography.caption,
      color: entitlementText,
      fontWeight: '600',
    },
    featuresTimeline: {
      marginTop: spacing.md,
      marginBottom: spacing.xl,
      paddingLeft: spacing.xl,
      gap: spacing.xl,
      position: 'relative',
    },
    timelineLine: {
      position: 'absolute',
      left: 37,
      top: 6,
      bottom: 6,
      width: 2,
      backgroundColor: line,
    },
    featureTimelineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    featureDot: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.small,
    },
    featureTimelineText: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: text,
    },
    featureSubtitle: {
      fontSize: 14,
      color: textSecondary,
      marginTop: 4,
    },
    planStack: {
      marginTop: spacing.xl,
      gap: spacing.md,
    },
    planCard: {
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      ...shadows.medium,
    },
    planOutlineCard: {
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: softBorder,
      ...shadows.small,
    },
    planOutlineCardSelected: {
      borderColor: accentColor,
      shadowColor: accentColor,
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    planLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: text,
    },
    planLabelLight: {
      color: '#ffffff',
    },
    planBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      backgroundColor: badgeBg,
    },
    planBadgeLight: {
      backgroundColor: 'rgba(255,255,255,0.28)',
    },
    planBadgeText: {
      ...typography.caption,
      color: text,
      fontWeight: '600',
    },
    planBadgeTextLight: {
      color: '#ffffff',
    },
    bestValueBadge: {
      backgroundColor: '#ffe7c2',
    },
    bestValueBadgeText: {
      color: '#b45309',
    },
    planPrice: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: spacing.sm,
      color: text,
    },
    planDetail: {
      fontSize: 13,
      color: textSecondary,
      marginTop: spacing.xs,
    },
    planTextLight: {
      color: '#f8fafc',
    },
    planDividerLight: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.35)',
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    planDivider: {
      height: 1,
      backgroundColor: line,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    planFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    planFooterText: {
      ...typography.caption,
      color: textSecondary,
      fontWeight: '600',
    },
    planFooterTextLight: {
      color: '#ffffff',
    },
    loadingCard: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.xl,
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: softBorder,
      ...shadows.small,
    },
    loadingText: {
      ...typography.bodySmall,
      color: textSecondary,
      marginTop: spacing.sm,
    },
    errorBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: errorBg,
      borderWidth: 1,
      borderColor: errorBorder,
    },
    errorText: {
      ...typography.bodySmall,
      color: errorText,
    },
    footerActions: {
      marginTop: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    restoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    restoreText: {
      fontSize: 14,
      fontWeight: '600',
      color: accentColor,
    },
    smallNote: {
      ...typography.caption,
      color: textSecondary,
      textAlign: 'center',
    },
  });
};

export default PaywallScreen;
