import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

  const handleSyncPermissions = async () => {
    await requestNotificationPermission({ enableNotificationsSetting: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PlatformScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
            <Ionicons
              name={hasNotificationPermission ? 'notifications' : 'notifications-off'}
              size={22}
              color={hasNotificationPermission ? colors.success : colors.danger}
            />
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>
                {hasNotificationPermission ? t('Enabled') : t('Permission Needed')}
              </Text>
              <Text style={styles.statusSubtitle}>
                {hasNotificationPermission
                  ? t('System permissions are active. You can fine tune categories below.')
                  : t('Allow notifications in iOS settings to deliver reminders and alerts.')}
              </Text>
            </View>
          </View>
          <Button
            title={hasNotificationPermission ? t('Refresh Permissions') : t('Open iOS Prompt')}
            onPress={handleSyncPermissions}
            style={styles.actionButton}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Delivery')}</Text>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{t('Allow Notifications')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('Enable app notifications across all categories')}
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
          <Text style={styles.sectionTitle}>{t('Categories')}</Text>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{t('Habit reminders')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('Daily check-ins and streak notifications')}
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
                {t('Alerts for due tasks and scheduled times')}
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
          <Text style={styles.sectionTitle}>{t('Delivery Style')}</Text>
          <Text style={styles.rowSubtitle}>
            {t('On iOS, reminders respect Focus and Notification Summary. Adjust in Settings → Notifications for the best experience.')}
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
    actionButton: {
      marginTop: spacing.md,
    },
  });

export default NotificationSettingsScreen;
