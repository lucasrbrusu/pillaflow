import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Input, PlatformScrollView, ProfileBadgeSlots } from '../components';
import {
  colors,
  shadows,
  borderRadius,
  spacing,
  typography,
  defaultCurrencies,
} from '../utils/theme';

const getInitials = (name, email) => {
  const source = (name || email || '').trim();
  if (!source) return 'U';
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const EditProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    profile,
    updateProfile,
    themeColors,
    themeName,
    achievementBadgeCatalog,
    userSettings,
  } = useApp();
  const styles = React.useMemo(() => createStyles(themeColors), [themeColors]);
  const isDark = themeName === 'dark';
  const profileTheme = React.useMemo(
    () => ({
      heroGradient: isDark ? ['#1F1B2F', '#0B1020'] : ['#F7E8FF', '#FDF4FF'],
      cardBg: isDark ? '#0F172A' : '#FFFFFF',
      cardBorder: isDark ? '#1F2937' : '#E7E5F0',
      avatarRing: isDark ? ['#8B5CF6', '#F97316'] : ['#C084FC', '#F97316'],
      buttonGradient: isDark ? ['#8B5CF6', '#EC4899'] : ['#A855F7', '#EC4899'],
      buttonText: '#FFFFFF',
      secondaryBg: isDark ? '#111827' : '#F9FAFB',
      secondaryBorder: isDark ? '#1F2937' : '#E5E7EB',
      secondaryText: themeColors.text,
      statDivider: isDark ? '#1F2937' : '#EAE6F3',
      goalTints: {
        calorie: {
          bg: isDark ? 'rgba(249,115,22,0.18)' : '#FFF3E7',
          border: isDark ? 'rgba(249,115,22,0.35)' : '#FFD9B5',
          icon: '#F97316',
        },
        steps: {
          bg: isDark ? 'rgba(16,185,129,0.18)' : '#ECFDF5',
          border: isDark ? 'rgba(16,185,129,0.35)' : '#A7F3D0',
          icon: '#10B981',
        },
        water: {
          bg: isDark ? 'rgba(59,130,246,0.18)' : '#EFF6FF',
          border: isDark ? 'rgba(59,130,246,0.35)' : '#BFDBFE',
          icon: '#3B82F6',
        },
        sleep: {
          bg: isDark ? 'rgba(168,85,247,0.18)' : '#F5F3FF',
          border: isDark ? 'rgba(168,85,247,0.35)' : '#DDD6FE',
          icon: '#8B5CF6',
        },
      },
    }),
    [isDark, themeColors]
  );
  const isPremium = !!profile?.isPremium;

  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [photo, setPhoto] = useState(profile?.photo || null);
  const [calorieGoal, setCalorieGoal] = useState(String(profile?.dailyCalorieGoal ?? 2000));
  const [stepsGoal, setStepsGoal] = useState(String(profile?.dailyStepsGoal ?? ''));
  const [waterGoal, setWaterGoal] = useState(String(profile?.dailyWaterGoal ?? 2));
  const [sleepGoal, setSleepGoal] = useState(String(profile?.dailySleepGoal ?? 8));
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    setName(profile?.name || '');
    setEmail(profile?.email || '');
    setPhoto(profile?.photo || null);
    setCalorieGoal(String(profile?.dailyCalorieGoal ?? 2000));
    setStepsGoal(String(profile?.dailyStepsGoal ?? ''));
    setWaterGoal(String(profile?.dailyWaterGoal ?? 2));
    setSleepGoal(String(profile?.dailySleepGoal ?? 8));
  }, [
    isEditing,
    profile?.dailyCalorieGoal,
    profile?.dailyStepsGoal,
    profile?.dailySleepGoal,
    profile?.dailyWaterGoal,
    profile?.email,
    profile?.name,
    profile?.photo,
  ]);

  const currentCurrency =
    defaultCurrencies.find(
      (currency) => currency.code === userSettings?.defaultCurrencyCode
    ) || defaultCurrencies[0];

  const handleStartEditing = () => {
    setName(profile?.name || '');
    setEmail(profile?.email || '');
    setPhoto(profile?.photo || null);
    setCalorieGoal(String(profile?.dailyCalorieGoal ?? 2000));
    setStepsGoal(String(profile?.dailyStepsGoal ?? ''));
    setWaterGoal(String(profile?.dailyWaterGoal ?? 2));
    setSleepGoal(String(profile?.dailySleepGoal ?? 8));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (saving) return;
    const trimmedStepsGoal = stepsGoal.trim();
    const parsedStepsGoal = trimmedStepsGoal ? Math.round(Number(trimmedStepsGoal)) : null;
    if (
      trimmedStepsGoal &&
      (!Number.isFinite(parsedStepsGoal) || parsedStepsGoal < 0)
    ) {
      Alert.alert('Enter a goal', 'Please enter a valid daily steps goal.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        photo,
        dailyCalorieGoal: parseInt(calorieGoal) || 2000,
        dailyStepsGoal: parsedStepsGoal > 0 ? parsedStepsGoal : null,
        dailyWaterGoal: parseFloat(waterGoal) || 2,
        dailySleepGoal: parseInt(sleepGoal) || 8,
      });
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Unable to save your changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleChoosePhoto = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handlePhotoPress = () => {
    const options = [
      {
        text: 'Choose profile picture',
        onPress: handleChoosePhoto,
      },
    ];

    if (photo) {
      options.push({
        text: 'Remove profile picture',
        style: 'destructive',
        onPress: () => setPhoto(null),
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert('Profile picture', 'Choose an option', options);
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleOpenCurrency = () => {
    navigation.navigate('Currency');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PlatformScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Details</Text>
          <View style={styles.headerActions}>
            {isEditing ? (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                <LinearGradient
                  colors={profileTheme.buttonGradient}
                  style={styles.saveButtonInner}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveText}>Save</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleStartEditing}
                activeOpacity={0.85}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Profile Hero */}
        <LinearGradient
          colors={profileTheme.heroGradient}
          style={[styles.heroCard, { borderColor: profileTheme.cardBorder }]}
        >
          <View style={styles.heroContent}>
            <TouchableOpacity
              onPress={isEditing ? handlePhotoPress : undefined}
              style={styles.avatarTap}
              activeOpacity={isEditing ? 0.8 : 1}
            >
              <LinearGradient colors={profileTheme.avatarRing} style={styles.avatarRing}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {getInitials(name, email)}
                    </Text>
                  </View>
                )}
              </LinearGradient>
              {isEditing && (
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{name || 'User'}</Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0.6)',
                      'rgba(255,255,255,0.12)',
                      'rgba(255,255,255,0)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.premiumBadgeShine}
                    pointerEvents="none"
                  />
                  <View style={styles.premiumBadgeContent}>
                    <Ionicons name="star" size={13} color="#FFFFFF" style={styles.premiumIcon} />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                </View>
              )}
            </View>
            {!!profile.username && <Text style={styles.profileHandle}>@{profile.username}</Text>}
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
          <View style={[styles.statsDivider, { backgroundColor: profileTheme.statDivider }]} />
          <View style={styles.badgesWrap}>
            <ProfileBadgeSlots
              badgeSlots={profile?.badgeSlots}
              badgeCatalog={achievementBadgeCatalog}
              textColor={themeColors?.text || colors.text}
              mutedColor={themeColors?.textSecondary || colors.textSecondary}
              cardColor={isDark ? 'rgba(15,23,42,0.4)' : '#FFFFFF'}
              borderColor={isDark ? '#1F2937' : '#E2E8F0'}
            />
          </View>
        </LinearGradient>

        {/* Personal Information */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: profileTheme.cardBg, borderColor: profileTheme.cardBorder },
          ]}
        >
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {isEditing ? (
            <>
              <Input
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                containerStyle={styles.formInputContainer}
                style={styles.formInput}
                inputStyle={styles.formInputText}
              />
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.formInputContainer}
                style={styles.formInput}
                inputStyle={styles.formInputText}
              />
              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={handleChangePassword}
              >
                <LinearGradient
                  colors={profileTheme.buttonGradient}
                  style={styles.changePasswordInner}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.changePasswordText}>Change Password</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.detailsList}>
              <View style={[styles.detailRow, styles.detailRowDivider]}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{name || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{email || '-'}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Currency */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: profileTheme.cardBg, borderColor: profileTheme.cardBorder },
          ]}
        >
          <Text style={styles.sectionTitle}>Currency</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the default currency used across your finances.
          </Text>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={isEditing ? handleOpenCurrency : undefined}
            activeOpacity={isEditing ? 0.8 : 1}
            disabled={!isEditing}
          >
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="cash-outline" size={18} color={themeColors.text} />
              </View>
              <View>
                <Text style={styles.settingsLabel}>Default currency</Text>
                <Text style={styles.settingsValue}>
                  {currentCurrency.code} · {currentCurrency.name}
                </Text>
              </View>
            </View>
            <View style={styles.settingsRight}>
              <Text style={styles.settingsCode}>{currentCurrency.symbol}</Text>
              {isEditing && (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={themeColors.textLight}
                />
              )}
            </View>
          </TouchableOpacity>
        </Card>

        {/* Health Goals */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: profileTheme.cardBg, borderColor: profileTheme.cardBorder },
          ]}
        >
          <Text style={styles.sectionTitle}>Health Goals</Text>
          {isEditing ? (
            <>
              <Input
                label="Daily Calorie Goal"
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                placeholder="2000"
                keyboardType="numeric"
                icon="nutrition-outline"
                containerStyle={styles.formInputContainer}
                style={[
                  styles.formInput,
                  {
                    backgroundColor: profileTheme.goalTints.calorie.bg,
                    borderColor: profileTheme.goalTints.calorie.border,
                  },
                ]}
                inputStyle={styles.formInputText}
              />
              <Input
                label="Daily Steps Goal"
                value={stepsGoal}
                onChangeText={setStepsGoal}
                placeholder="10000"
                keyboardType="numeric"
                icon="walk-outline"
                containerStyle={styles.formInputContainer}
                style={[
                  styles.formInput,
                  {
                    backgroundColor: profileTheme.goalTints.steps.bg,
                    borderColor: profileTheme.goalTints.steps.border,
                  },
                ]}
                inputStyle={styles.formInputText}
              />
              <Input
                label="Daily Water Goal (L)"
                value={waterGoal}
                onChangeText={setWaterGoal}
                placeholder="2.0"
                keyboardType="decimal-pad"
                icon="water-outline"
                containerStyle={styles.formInputContainer}
                style={[
                  styles.formInput,
                  {
                    backgroundColor: profileTheme.goalTints.water.bg,
                    borderColor: profileTheme.goalTints.water.border,
                  },
                ]}
                inputStyle={styles.formInputText}
              />
              <Input
                label="Daily Sleep Goal (hours)"
                value={sleepGoal}
                onChangeText={setSleepGoal}
                placeholder="8"
                keyboardType="numeric"
                icon="moon-outline"
                containerStyle={styles.formInputContainer}
                style={[
                  styles.formInput,
                  {
                    backgroundColor: profileTheme.goalTints.sleep.bg,
                    borderColor: profileTheme.goalTints.sleep.border,
                  },
                ]}
                inputStyle={styles.formInputText}
              />
            </>
          ) : (
            <View style={styles.detailsList}>
              <View style={[styles.detailRow, styles.detailRowDivider]}>
                <Text style={styles.detailLabel}>Daily Calorie Goal</Text>
                <Text style={styles.detailValue}>{calorieGoal || '-'} kcal</Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowDivider]}>
                <Text style={styles.detailLabel}>Daily Steps Goal</Text>
                <Text style={styles.detailValue}>
                  {stepsGoal ? `${Number(stepsGoal).toLocaleString('en-US')} steps` : '-'}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowDivider]}>
                <Text style={styles.detailLabel}>Daily Water Goal</Text>
                <Text style={styles.detailValue}>{waterGoal || '-'} L</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Daily Sleep Goal</Text>
                <Text style={styles.detailValue}>{sleepGoal || '-'} hours</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Data & Account */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: profileTheme.cardBg, borderColor: profileTheme.cardBorder },
          ]}
        >
          <Text style={styles.sectionTitle}>Data & Account</Text>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('DataAccount')}
          >
            <View style={styles.settingsLeft}>
              <View style={styles.settingsIcon}>
                <Ionicons name="shield-checkmark-outline" size={18} color={themeColors.text} />
              </View>
              <View>
                <Text style={styles.settingsLabel}>Manage data and account</Text>
                <Text style={styles.settingsValue}>
                  Export data, review terms, and account deletion.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeColors.textLight} />
          </TouchableOpacity>
        </Card>
      </PlatformScrollView>
    </View>
  );
};

const createStyles = (themeColorsParam = colors) => {
  const baseText = themeColorsParam?.text || colors.text;
  const mutedText = themeColorsParam?.textSecondary || colors.textSecondary;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColorsParam?.background || colors.background,
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
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColorsParam?.inputBackground || colors.inputBackground,
      borderWidth: 1,
      borderColor: themeColorsParam?.border || colors.border,
    },
    headerTitle: {
      ...typography.h3,
      color: baseText,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    saveButton: {
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    editButton: {
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: themeColorsParam?.border || colors.border,
      backgroundColor: themeColorsParam?.card || colors.card,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButtonText: {
      ...typography.bodySmall,
      color: baseText,
      fontWeight: '700',
    },
    saveButtonInner: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: {
      ...typography.body,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    heroCard: {
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      ...shadows.medium,
    },
    heroContent: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    avatarTap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    avatarRing: {
      width: 110,
      height: 110,
      borderRadius: 55,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    avatarPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: themeColorsParam?.card || colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      ...typography.h2,
      color: baseText,
    },
    cameraIcon: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: themeColorsParam?.primary || colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: themeColorsParam?.card || colors.card,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    profileName: {
      ...typography.h3,
      color: baseText,
    },
    profileHandle: {
      ...typography.bodySmall,
      color: mutedText,
    },
    profileEmail: {
      ...typography.bodySmall,
      color: mutedText,
      marginTop: 2,
    },
    statsDivider: {
      height: 1,
      width: '100%',
      backgroundColor: themeColorsParam?.divider || colors.divider,
    },
    badgesWrap: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    sectionCard: {
      marginBottom: spacing.lg,
      borderRadius: borderRadius.xl,
    },
    sectionTitle: {
      ...typography.h3,
      marginBottom: spacing.md,
      color: baseText,
    },
    sectionSubtitle: {
      ...typography.bodySmall,
      color: mutedText,
      marginBottom: spacing.md,
    },
    detailsList: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: themeColorsParam?.border || colors.border,
      backgroundColor: themeColorsParam?.inputBackground || colors.inputBackground,
      paddingHorizontal: spacing.md,
    },
    detailRow: {
      paddingVertical: spacing.md,
    },
    detailRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: themeColorsParam?.divider || colors.divider,
    },
    detailLabel: {
      ...typography.caption,
      color: mutedText,
      marginBottom: 2,
    },
    detailValue: {
      ...typography.body,
      color: baseText,
      fontWeight: '600',
    },
    formInputContainer: {
      marginBottom: spacing.md,
    },
    formInput: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      backgroundColor: themeColorsParam?.inputBackground || colors.inputBackground,
      borderColor: themeColorsParam?.border || colors.border,
    },
    formInputText: {
      color: baseText,
    },
    changePasswordButton: {
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      marginTop: spacing.sm,
      alignSelf: 'stretch',
    },
    changePasswordInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    changePasswordText: {
      ...typography.bodySmall,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: themeColorsParam?.border || colors.border,
      backgroundColor: themeColorsParam?.inputBackground || colors.inputBackground,
    },
    settingsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    settingsIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColorsParam?.card || colors.card,
      borderWidth: 1,
      borderColor: themeColorsParam?.border || colors.border,
    },
    settingsLabel: {
      ...typography.body,
      color: baseText,
      fontWeight: '600',
    },
    settingsValue: {
      ...typography.caption,
      color: mutedText,
      marginTop: 2,
    },
    settingsRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    settingsCode: {
      ...typography.body,
      color: baseText,
      fontWeight: '700',
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F59E0B',
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      position: 'relative',
      overflow: 'hidden',
      ...shadows.small,
    },
    premiumBadgeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 1,
    },
    premiumBadgeShine: {
      position: 'absolute',
      top: -6,
      left: -18,
      width: '70%',
      height: '140%',
      transform: [{ rotate: '-12deg' }],
      opacity: 0.75,
    },
    premiumIcon: {
      marginRight: spacing.xs,
    },
    premiumText: {
      ...typography.caption,
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
};

export default EditProfileScreen;
