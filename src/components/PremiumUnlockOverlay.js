import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing, typography } from '../utils/theme';

const PREMIUM_ITEMS = [
  {
    id: 'agent',
    icon: 'sparkles-outline',
    iconColor: '#7c3aed',
    iconBg: '#f3e8ff',
    label: 'AI agent and smarter planning tools',
  },
  {
    id: 'insights',
    icon: 'analytics-outline',
    iconColor: '#2563eb',
    iconBg: '#dbeafe',
    label: 'Advanced insights and analytics',
  },
  {
    id: 'groups',
    icon: 'people-outline',
    iconColor: '#0f766e',
    iconBg: '#ccfbf1',
    label: 'Groups, collaboration, and shared routines',
  },
  {
    id: 'extras',
    icon: 'shield-checkmark-outline',
    iconColor: '#db2777',
    iconBg: '#fce7f3',
    label: 'Priority extras, streak protection, and more',
  },
];

const PremiumUnlockOverlay = ({
  visible,
  onClose,
  onUnlock,
  onDontAskAgain,
  themeColors = colors,
}) => {
  const [isOpening, setIsOpening] = React.useState(false);
  const [isSkippingForever, setIsSkippingForever] = React.useState(false);
  const textColor = themeColors?.text || colors.text;
  const mutedColor = themeColors?.textSecondary || colors.textSecondary;

  React.useEffect(() => {
    if (!visible) {
      setIsOpening(false);
      setIsSkippingForever(false);
    }
  }, [visible]);

  if (!visible) return null;

  const handleUnlock = async () => {
    if (isOpening || isSkippingForever) return;
    setIsOpening(true);
    try {
      await onUnlock?.();
    } finally {
      setIsOpening(false);
    }
  };

  const handleDontAskAgain = async () => {
    if (isOpening || isSkippingForever) return;
    setIsSkippingForever(true);
    try {
      await onDontAskAgain?.();
    } finally {
      setIsSkippingForever(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <LinearGradient colors={['#F7F6FF', '#FFF8F0', '#F4FBFF']} style={styles.card}>
          <View style={styles.orbLayer} pointerEvents="none">
            <View style={styles.orbTop} />
            <View style={styles.orbBottom} />
          </View>

          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={12}
            disabled={isOpening || isSkippingForever}
          >
            <Ionicons name="close" size={22} color="#646B84" />
          </Pressable>

          <View style={styles.heroWrap}>
            <LinearGradient colors={['#6366F1', '#EC4899']} style={styles.heroIcon}>
              <Ionicons name="diamond-outline" size={30} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.sparkleOne}>
              <Ionicons name="sparkles" size={18} color="#F59E0B" />
            </View>
            <View style={styles.sparkleTwo}>
              <Ionicons name="flash-outline" size={16} color="#6366F1" />
            </View>
          </View>

          <Text style={styles.eyebrow}>Premium features</Text>
          <Text style={[styles.title, { color: textColor }]}>Unlock Pillaflow Premium</Text>
          <Text style={[styles.description, { color: mutedColor }]}>
            Upgrade to unlock the full premium experience across planning, insights,
            collaboration, and advanced tools.
          </Text>

          <View style={styles.listCard}>
            {PREMIUM_ITEMS.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <View style={[styles.listIconWrap, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={16} color={item.iconColor} />
                </View>
                <Text style={styles.listLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !isOpening && !isSkippingForever ? styles.primaryButtonPressed : null,
              (isOpening || isSkippingForever) && styles.buttonDisabled,
            ]}
            onPress={handleUnlock}
            disabled={isOpening || isSkippingForever}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {isOpening ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="lock-open-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Unlock Premium</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleDontAskAgain}
            disabled={isOpening || isSkippingForever}
            style={styles.secondaryAction}
          >
            {isSkippingForever ? (
              <ActivityIndicator color="#7C849E" size="small" />
            ) : (
              <Text style={styles.secondaryActionText}>{"Don't ask me again"}</Text>
            )}
          </Pressable>

          <Text style={[styles.footerNote, { color: mutedColor }]}>
            You can open premium plans anytime from your profile or any locked feature.
          </Text>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 23, 38, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 30,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    ...shadows.large,
  },
  orbLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  orbTop: {
    position: 'absolute',
    top: -72,
    right: -58,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
  },
  orbBottom: {
    position: 'absolute',
    bottom: -110,
    left: -84,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroWrap: {
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  sparkleOne: {
    position: 'absolute',
    top: -4,
    right: -10,
  },
  sparkleTwo: {
    position: 'absolute',
    left: -10,
    bottom: 10,
  },
  eyebrow: {
    ...typography.caption,
    textAlign: 'center',
    color: '#4338CA',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: spacing.sm,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Bold',
      android: 'sans-serif-black',
      default: undefined,
    }),
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  listCard: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: '#E9E5FF',
    marginBottom: spacing.xl,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  listIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  listLabel: {
    ...typography.body,
    color: '#44506A',
    fontWeight: '600',
    flex: 1,
  },
  primaryButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.medium,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonGradient: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    minHeight: 40,
  },
  secondaryActionText: {
    ...typography.bodySmall,
    color: '#6B7280',
    fontWeight: '700',
  },
  footerNote: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
});

export default PremiumUnlockOverlay;
