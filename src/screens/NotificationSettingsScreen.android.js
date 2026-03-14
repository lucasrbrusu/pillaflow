import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import { Card, Button, PlatformScrollView } from '../components';
import { colors, spacing, typography } from '../utils/theme';

const NotificationSettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    userSettings,
    updateUserSettings,
    hasNotificationPermission,
    requestNotificationPermission,
    themeColors,
    t,
  } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const handleToggle = async (key, value) => {
    await updateUserSettings({ [key]: value });
  };

  const openSystemSettings = () => {
    Linking.openSettings();
  };

  const handleSyncPermissions = async () => {
    await requestNotificationPermission({ enableNotificationsSetting: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PlatformScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Notifications')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons
              name={hasNotificationPermission ? 'bell-ring' : 'bell-off'}
              size={22}
              color={hasNotificationPermission ? colors.success : colors.danger}
            />
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>
                {hasNotificationPermission ? t('Allowed by Android') : t('Permission Needed')}
              </Text>
              <Text style={styles.statusSubtitle}>
                {hasNotificationPermission
                  ? t('Channels are active. Adjust categories or open system settings.')
                  : t('Allow notifications to keep reminders and routines on schedule.')}
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Button
              title={t('Refresh Permission')}
              onPress={handleSyncPermissions}
              style={styles.actionButton}
            />
            <Button
              title={t('Open System Settings')}
              variant="outline"
              onPress={openSystemSettings}
              style={styles.actionButton}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Delivery')}</Text>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{t('Allow Notifications')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('Master toggle for all app notification channels')}
              </Text>
            </View>
            <Switch
              value={userSettings.notificationsEnabled}
              onValueChange={(val) => handleToggle('notificationsEnabled', val)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Channels')}</Text>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{t('Habit reminders')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('Morning nudges and weekly check-ins')}
              </Text>
            </View>
            <Switch
              value={userSettings.habitRemindersEnabled}
              onValueChange={(val) => handleToggle('habitRemindersEnabled', val)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{t('Task deadlines')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('Upcoming tasks, due dates, and heads-up alerts')}
              </Text>
            </View>
            <Switch
              value={userSettings.taskRemindersEnabled}
              onValueChange={(val) => handleToggle('taskRemindersEnabled', val)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{t('Routine reminders')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('Reminders when routines are scheduled to start')}
              </Text>
            </View>
            <Switch
              value={userSettings.routineRemindersEnabled}
              onValueChange={(val) => handleToggle('routineRemindersEnabled', val)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{t('Health reminders')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('Hydration, sleep, and movement nudges')}
              </Text>
            </View>
            <Switch
              value={userSettings.healthRemindersEnabled}
              onValueChange={(val) => handleToggle('healthRemindersEnabled', val)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Heads Up')}</Text>
          <Text style={styles.rowSubtitle}>
            {t('Notification appearance follows your Android settings. Use the buttons above to manage importance, vibration, and lock screen behavior.')}
          </Text>
        </Card>
      </PlatformScrollView>
    </View>
  );
};

const createStyles = (themeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors?.background || colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.lg,
    },
    backButton: {
      padding: spacing.xs,
    },
    headerTitle: {
      ...typography.h3,
    },
    headerSpacer: {
      width: 32,
    },
    card: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h3,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    rowCopy: {
      flex: 1,
      marginRight: spacing.md,
    },
    rowTitle: {
      ...typography.body,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    rowSubtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusCopy: {
      flex: 1,
      marginLeft: spacing.md,
    },
    statusTitle: {
      ...typography.body,
      fontWeight: '700',
    },
    statusSubtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    actionRow: {
      flexDirection: 'row',
      marginTop: spacing.md,
    },
    actionButton: {
      flex: 1,
      marginRight: spacing.sm,
    },
  });

export default NotificationSettingsScreen;
