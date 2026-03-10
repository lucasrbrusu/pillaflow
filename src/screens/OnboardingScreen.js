import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { colors, borderRadius, spacing, typography, shadows } from '../utils/theme';

const pillars = [
  {
    id: 'habits',
    title: 'Micro Habits',
    description: 'Build lasting change through small, consistent actions.',
    icon: 'target',
    iconType: 'feather',
    color: colors.habits,
  },
  {
    id: 'planning',
    title: 'Daily Planning',
    description: 'Organize your schedule with clarity and intention.',
    icon: 'edit-3',
    iconType: 'feather',
    color: colors.tasks,
  },
  {
    id: 'health',
    title: 'Health Tracking',
    description: 'Monitor your wellness journey day by day.',
    icon: 'heart-outline',
    iconType: 'ionicons',
    color: colors.health,
  },
  {
    id: 'home',
    title: 'Home Routines',
    description: 'Maintain your space with effortless organization.',
    icon: 'history',
    iconType: 'material',
    color: colors.routine,
  },
  {
    id: 'finance',
    title: 'Finance',
    description: 'Track expenses, income, and stay on budget.',
    icon: 'trending-up',
    iconType: 'feather',
    color: colors.finance,
  },
];

const legalLinks = [
  {
    id: 'terms',
    label: 'Terms of Service',
    url: 'https://pillaflow.net/terms-of-service.html',
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    url: 'https://pillaflow.net/privacy-policy.html',
  },
  {
    id: 'community',
    label: 'Community Guidelines',
    url: 'https://pillaflow.net/community-guidelines.html',
  },
];

const withAlpha = (hex, alpha) => {
  if (!hex || typeof hex !== 'string') return hex;
  if (hex.startsWith('#') && hex.length === 7) {
    return `${hex}${alpha}`;
  }
  return hex;
};

const OnboardingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { themeColors, themeName } = useApp();
  const styles = React.useMemo(() => createStyles(themeColors), [themeColors]);
  const isDark = themeName === 'dark';

  const [step, setStep] = React.useState(0);
  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const translateX = React.useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const onboardingTheme = React.useMemo(
    () => ({
      backgroundGradient: isDark
        ? ['#0B1020', '#0C1124', '#140F24']
        : ['#F9F0FF', '#FFF6FA', '#F5F8FF'],
      cardBg: isDark ? '#0F172A' : '#FFFFFF',
      cardBorder: isDark ? '#1F2937' : '#EDE9F5',
      badgeBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
      heroOrb: isDark ? ['#8B5CF6', '#EC4899'] : ['#C084FC', '#F97316'],
      buttonGradient: isDark ? ['#8B5CF6', '#EC4899'] : ['#B14DFF', '#F43F8C'],
      indicatorInactive: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(16,24,40,0.12)',
      orbOne: isDark ? 'rgba(139,92,246,0.22)' : 'rgba(236,72,153,0.16)',
      orbTwo: isDark ? 'rgba(56,189,248,0.2)' : 'rgba(59,130,246,0.12)',
    }),
    [isDark]
  );

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 6],
  });
  const floatScale = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const floatRotate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-6deg', '6deg'],
  });

  const animateToStep = React.useCallback(
    (nextStep, direction) => {
      if (nextStep === step) return;
      const distance = direction === 'left' ? -width : width;
      Animated.timing(translateX, {
        toValue: distance,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        const incomingOffset = direction === 'left' ? width : -width;
        translateX.setValue(incomingOffset);
        setStep(nextStep);
        Animated.timing(translateX, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [step, translateX, width]
  );

  const handleNext = () => {
    if (step === 0) {
      animateToStep(1, 'left');
      return;
    }
    navigation.navigate('Auth');
  };

  const handleSwipeBack = React.useCallback(() => {
    if (step === 1) {
      animateToStep(0, 'right');
    }
  }, [animateToStep, step]);

  const handleOpenLink = (url) => {
    Linking.openURL(url);
  };

  const renderIcon = (pillar) => {
    if (pillar.iconType === 'feather') {
      return <Feather name={pillar.icon} size={20} color={pillar.color} />;
    }
    if (pillar.iconType === 'material') {
      return <MaterialCommunityIcons name={pillar.icon} size={20} color={pillar.color} />;
    }
    return <Ionicons name={pillar.icon} size={20} color={pillar.color} />;
  };

  const fadeOpacity = translateX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <LinearGradient
      colors={onboardingTheme.backgroundGradient}
      style={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <View style={styles.backgroundOrbs} pointerEvents="none">
        <View style={[styles.orb, styles.orbOne, { backgroundColor: onboardingTheme.orbOne }]} />
        <View style={[styles.orb, styles.orbTwo, { backgroundColor: onboardingTheme.orbTwo }]} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.fadeContainer,
            { opacity: fadeOpacity, transform: [{ translateX }] },
          ]}
        >
          <View>
            {step === 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleSwipeBack}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.backButtonInner,
                    { backgroundColor: onboardingTheme.buttonGradient[0] },
                  ]}
                >
                  <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}
            <View style={styles.badgeRow}>
              {pillars.map((pillar) => (
                <View
                  key={pillar.id}
                  style={[
                    styles.badge,
                    { backgroundColor: withAlpha(pillar.color, isDark ? '26' : '1A') },
                  ]}
                >
                  {renderIcon(pillar)}
                </View>
              ))}
            </View>

            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <View style={[styles.logoDot, { backgroundColor: colors.habits }]} />
                <View style={[styles.logoDot, { backgroundColor: colors.tasks }]} />
                <View style={[styles.logoDot, { backgroundColor: colors.health }]} />
                <View style={[styles.logoDot, { backgroundColor: colors.routine }]} />
              </View>
              <Text style={styles.logoTitle}>Pillaflow</Text>
            </View>
            <Text style={styles.subtitle}>
              {step === 0
                ? 'Your all-in-one life management companion'
                : 'Everything you need in one place'}
            </Text>

            {step === 0 ? (
              <>
                <View style={styles.heroOrbWrap}>
                  <Animated.View
                    style={[
                      styles.heroOrbContainer,
                      {
                        transform: [
                          { translateY: floatTranslate },
                          { scale: floatScale },
                          { rotate: floatRotate },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient colors={onboardingTheme.heroOrb} style={styles.heroOrb}>
                      <Ionicons name="sparkles" size={38} color="#FFFFFF" />
                    </LinearGradient>
                  </Animated.View>
                </View>
                <Text style={styles.heroTitle}>Welcome to Your Balanced Life</Text>
                <Text style={styles.heroBody}>
                  Transform your daily routine with powerful tools for habits, planning, health, and
                  more.
                </Text>
              </>
            ) : (
              <View style={styles.featureList}>
                {pillars.map((pillar) => (
                  <View
                    key={pillar.id}
                    style={[
                      styles.featureCard,
                      {
                        backgroundColor: onboardingTheme.cardBg,
                        borderColor: onboardingTheme.cardBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.featureIconWrap,
                        {
                          backgroundColor: withAlpha(pillar.color, isDark ? '22' : '14'),
                          borderColor: withAlpha(pillar.color, isDark ? '44' : '2B'),
                        },
                      ]}
                    >
                      {renderIcon(pillar)}
                    </View>
                    <View style={styles.featureText}>
                      <Text style={styles.featureTitle}>{pillar.title}</Text>
                      <Text style={styles.featureDescription}>{pillar.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View>
            <View style={styles.pageIndicator}>
              {[0, 1].map((index) =>
                index === step ? (
                  <View
                    key={`dot-${index}`}
                    style={[
                      styles.indicatorActive,
                      { backgroundColor: onboardingTheme.buttonGradient[0] },
                    ]}
                  />
                ) : (
                  <View
                    key={`dot-${index}`}
                    style={[
                      styles.indicatorDot,
                      { backgroundColor: onboardingTheme.indicatorInactive },
                    ]}
                  />
                )
              )}
            </View>

            <TouchableOpacity style={styles.ctaButton} onPress={handleNext} activeOpacity={0.85}>
              <View
                style={[
                  styles.ctaContent,
                  { backgroundColor: onboardingTheme.buttonGradient[0] },
                ]}
              >
                <Text style={styles.ctaText}>{step === 0 ? 'Next' : 'Get Started'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.ctaIcon} />
              </View>
            </TouchableOpacity>

            <View style={styles.legalLinksContainer}>
              {legalLinks.map((link) => (
                <TouchableOpacity
                  key={link.id}
                  activeOpacity={0.7}
                  onPress={() => handleOpenLink(link.url)}
                  style={styles.legalLink}
                >
                  <Text style={styles.legalLinkText}>{link.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

const createStyles = (themeColorsParam = colors) => {
  const baseText = themeColorsParam?.text || colors.text;
  const mutedText = themeColorsParam?.textSecondary || colors.textSecondary;
  const displayFont = Platform.select({
    ios: 'AvenirNext-DemiBold',
    android: 'sans-serif-condensed',
  });
  const heroFont = Platform.select({
    ios: 'AvenirNext-DemiBold',
    android: 'sans-serif-medium',
  });

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      flexGrow: 1,
    },
    fadeContainer: {
      flex: 1,
      justifyContent: 'space-between',
    },
    backgroundOrbs: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    orb: {
      position: 'absolute',
      borderRadius: 999,
    },
    orbOne: {
      width: 220,
      height: 220,
      top: -80,
      left: -40,
    },
    orbTwo: {
      width: 180,
      height: 180,
      bottom: -40,
      right: -20,
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    badge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: spacing.xs,
      ...shadows.small,
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    logoIcon: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 28,
      height: 28,
      marginRight: spacing.sm,
    },
    logoDot: {
      width: 12,
      height: 12,
      borderRadius: 3,
      margin: 1,
    },
    logoTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: baseText,
      fontFamily: displayFont,
    },
    subtitle: {
      ...typography.bodySmall,
      color: mutedText,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    heroOrbWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      position: 'relative',
    },
    backButton: {
      alignSelf: 'flex-start',
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      marginBottom: spacing.md,
      ...shadows.small,
    },
    backButtonInner: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroOrbContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroOrb: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.large,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: baseText,
      textAlign: 'center',
      marginBottom: spacing.sm,
      fontFamily: heroFont,
    },
    heroBody: {
      ...typography.body,
      color: mutedText,
      textAlign: 'center',
      marginBottom: spacing.xxl,
    },
    featureList: {
      marginTop: spacing.sm,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.small,
    },
    featureIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
      borderWidth: 1,
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      ...typography.h3,
      color: baseText,
    },
    featureDescription: {
      ...typography.bodySmall,
      color: mutedText,
      marginTop: 4,
    },
    pageIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    indicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    indicatorActive: {
      width: 28,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    ctaButton: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    ctaContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    ctaText: {
      ...typography.body,
      color: '#FFFFFF',
      fontWeight: '700',
      fontFamily: displayFont,
    },
    ctaIcon: {
      marginLeft: spacing.sm,
    },
    legalLinksContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    legalLink: {
      marginHorizontal: spacing.xs,
      marginVertical: spacing.xs / 2,
    },
    legalLinkText: {
      ...typography.bodySmall,
      color: mutedText,
      textDecorationLine: 'underline',
    },
  });
};

export default OnboardingScreen;
