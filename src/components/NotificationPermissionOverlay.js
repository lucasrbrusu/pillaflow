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

const PROMPT_ITEMS = [
  {
    id: 'habits',
    icon: 'flame-outline',
    iconColor: '#F97316',
    iconBg: '#FFEDD5',
    label: 'Habit reminders',
  },
  {
    id: 'tasks',
    icon: 'calendar-outline',
    iconColor: '#EF4444',
    iconBg: '#FEE2E2',
    label: 'Task deadlines',
  },
  {
    id: 'routines',
    icon: 'repeat-outline',
    iconColor: '#8B5CF6',
    iconBg: '#F3E8FF',
    label: 'Routine reminders',
  },
  {
    id: 'health',
    icon: 'heart-outline',
    iconColor: '#0EA5E9',
    iconBg: '#E0F2FE',
    label: 'Health reminders',
  },
];

const NotificationPermissionOverlay = ({
  visible,
  onClose,
  onEnable,
  onDontAskAgain,
  themeColors = colors,
}) => {
  const [isEnabling, setIsEnabling] = React.useState(false);
  const [isSkippingForever, setIsSkippingForever] = React.useState(false);
  const textColor = themeColors?.text || colors.text;
  const mutedColor = themeColors?.textSecondary || colors.textSecondary;

  React.useEffect(() => {
    if (!visible) {
      setIsEnabling(false);
      setIsSkippingForever(false);
    }
  }, [visible]);

  if (!visible) return null;

  const handleEnable = async () => {
    if (isEnabling || isSkippingForever) return;
    setIsEnabling(true);
    try {
      await onEnable?.();
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDontAskAgain = async () => {
    if (isEnabling || isSkippingForever) return;
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

        <LinearGradient
          colors={['#FFF6F8', '#F8F2FF', '#F5FBFF']}
          style={styles.card}
        >
          <View style={styles.orbLayer} pointerEvents="none">
            <View style={styles.orbTop} />
            <View style={styles.orbBottom} />
          </View>

          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={12}
            disabled={isEnabling || isSkippingForever}
          >
            <Ionicons name="close" size={22} color="#646B84" />
          </Pressable>

          <View style={styles.heroWrap}>
            <LinearGradient colors={['#FF8A3D', '#FF4D6D']} style={styles.heroIcon}>
              <Ionicons name="notifications-outline" size={30} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.sparkleOne}>
              <Ionicons name="sparkles" size={18} color="#FFC44D" />
            </View>
            <View style={styles.sparkleTwo}>
              <Ionicons name="sparkles" size={16} color="#C084FC" />
            </View>
          </View>

          <Text style={[styles.title, { color: textColor }]}>
            Stay on Track with Notifications
          </Text>
          <Text style={[styles.description, { color: mutedColor }]}>
            Get gentle reminders for your routines, water intake, sleep schedule, and
            milestone wins so you stay consistent.
          </Text>

          <View style={styles.listCard}>
            {PROMPT_ITEMS.map((item) => (
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
              pressed && !isEnabling && !isSkippingForever ? styles.primaryButtonPressed : null,
              (isEnabling || isSkippingForever) && styles.buttonDisabled,
            ]}
            onPress={handleEnable}
            disabled={isEnabling || isSkippingForever}
          >
            <LinearGradient
              colors={['#FF7A18', '#FF4D6D', '#F43F5E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {isEnabling ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Enable Notifications</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleDontAskAgain}
            disabled={isEnabling || isSkippingForever}
            style={styles.secondaryAction}
          >
            {isSkippingForever ? (
              <ActivityIndicator color="#7C849E" size="small" />
            ) : (
              <Text style={styles.secondaryActionText}>{"Don't ask me again"}</Text>
            )}
          </Pressable>

          <Text style={[styles.footerNote, { color: mutedColor }]}>
            You can change notification settings anytime in your device settings.
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
    borderColor: 'rgba(255,255,255,0.7)',
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
    backgroundColor: 'rgba(255, 113, 145, 0.18)',
  },
  orbBottom: {
    position: 'absolute',
    bottom: -110,
    left: -84,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(130, 140, 255, 0.12)',
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
    marginBottom: spacing.lg,
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
    borderColor: '#ECE5F5',
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

export default NotificationPermissionOverlay;
