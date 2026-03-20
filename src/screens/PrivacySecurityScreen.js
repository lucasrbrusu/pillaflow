import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { Card, Button } from '../components';
import { colors, spacing, borderRadius, typography } from '../utils/theme';

const legalLinks = [
  {
    id: 'terms',
    label: 'Terms of Service',
    url: 'https://pillaflow.com/terms-of-service.html',
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    url: 'https://pillaflow.com/privacy-policy.html',
  },
  {
    id: 'community',
    label: 'Community Guidelines',
    url: 'https://pillaflow.com/community-guidelines.html',
  },
  {
    id: 'subscription-terms',
    label: 'Subscription Terms',
    url: 'https://pillaflow.com/premium-subscription-terms.html',
  },
];

const PrivacySecurityScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    themeColors,
    t,
    mfaFactors,
    isMfaLoading,
    profile,
    isEmailVerified,
  } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const verifiedMfaCount = mfaFactors?.verified?.length || 0;

  const handleOpenLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Privacy & Security')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Email Verification')}</Text>
          <Text style={styles.sectionSubtitle}>
            {isEmailVerified
              ? t('Your email address is verified.')
              : t('Verify your email address to fully secure your account.')}
          </Text>
          <Text style={styles.emailValue}>{profile?.email || t('No email address available')}</Text>
          <Button
            title={isEmailVerified ? t('View Verification Status') : t('Verify Email')}
            icon="mail-outline"
            variant="outline"
            onPress={() => navigation.navigate('VerifyEmail')}
            style={styles.linkButton}
            fullWidth
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Security')}</Text>
          <Text style={styles.sectionSubtitle}>
            {isMfaLoading
              ? t('Checking your 2FA status...')
              : verifiedMfaCount > 0
                ? t('Two-factor authentication is enabled.')
                : t('Protect your account with two-factor authentication.')}
          </Text>
          <Button
            title={t('Two-Factor Authentication')}
            icon="shield-checkmark-outline"
            variant="outline"
            onPress={() => navigation.navigate('TwoFactorAuth')}
            style={styles.linkButton}
            fullWidth
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Legal')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('Review our policies and guidelines.')}
          </Text>
          {legalLinks.map((link, index) => (
            <Button
              key={link.id}
              title={link.label}
              icon="open-outline"
              variant="outline"
              onPress={() => handleOpenLink(link.url)}
              style={[
                styles.linkButton,
                index === legalLinks.length - 1 && styles.linkButtonLast,
              ]}
              fullWidth
            />
          ))}
        </Card>
      </ScrollView>
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
      paddingBottom: spacing.xxl,
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
      marginTop: spacing.md,
    },
    sectionTitle: {
      ...typography.h3,
      marginBottom: spacing.xs,
    },
    sectionSubtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    emailValue: {
      ...typography.body,
      color: themeColors?.text || colors.text,
      marginBottom: spacing.md,
    },
    linkButton: {
      marginBottom: spacing.sm,
    },
    linkButtonLast: {
      marginBottom: 0,
    },
  });

export default PrivacySecurityScreen;
