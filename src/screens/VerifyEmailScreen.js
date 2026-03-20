import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Input } from '../components';
import { useApp } from '../context/AppContext';
import { colors, spacing, borderRadius, typography } from '../utils/theme';

const VerifyEmailScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    themeColors,
    profile,
    isEmailVerified,
    emailVerifiedAt,
    sendEmailVerification,
    verifyEmailCode,
    refreshEmailVerificationState,
    t,
  } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const email = String(profile?.email || '').trim().toLowerCase();

  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    try {
      setIsSending(true);
      setError('');
      setMessage('');
      await sendEmailVerification(email);
      setMessage('Verification email sent. Enter the 6-digit code from the email.');
    } catch (sendError) {
      setError(sendError?.message || 'Unable to send verification email.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setIsVerifying(true);
      setError('');
      setMessage('');
      await verifyEmailCode(code);
      setMessage('Your email is now verified.');
    } catch (verifyError) {
      setError(verifyError?.message || 'Unable to verify email.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setError('');
      setMessage('');
      const state = await refreshEmailVerificationState();
      if (state?.emailVerified) {
        setMessage('Your email is verified.');
      } else {
        setMessage('Your email is still unverified.');
      }
    } catch (refreshError) {
      setError(refreshError?.message || 'Unable to refresh verification status.');
    }
  };

  const handleOpenMail = async () => {
    try {
      await Linking.openURL(`mailto:${email}`);
    } catch (_openError) {
      setError('Unable to open your email app on this device.');
    }
  };

  const formattedVerifiedAt = useMemo(() => {
    if (!emailVerifiedAt) return '';
    const date = new Date(emailVerifiedAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  }, [emailVerifiedAt]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={themeColors?.text || colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Verify Email')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Card style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={isEmailVerified ? 'checkmark-circle-outline' : 'mail-open-outline'}
              size={28}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.title}>
            {isEmailVerified ? 'Email verified' : 'Verify your email'}
          </Text>
          <Text style={styles.body}>
            {isEmailVerified
              ? 'This account is marked as verified in the app.'
              : 'Send a verification code to your email, then enter that code here.'}
          </Text>
          <Text style={styles.email}>{email || 'No email address available'}</Text>

          {formattedVerifiedAt ? (
            <Text style={styles.verifiedAt}>Verified at {formattedVerifiedAt}</Text>
          ) : null}

          {!isEmailVerified ? (
            <>
              <Button
                title={message ? 'Resend verification code' : 'Send verification code'}
                onPress={handleSendCode}
                loading={isSending}
                icon="send-outline"
                style={styles.primaryButton}
                fullWidth
              />

              <Input
                label="Verification Code"
                value={code}
                onChangeText={(value) =>
                  setCode(
                    String(value || '')
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                autoCapitalize="none"
                containerStyle={styles.codeInput}
              />

              <Button
                title="Verify code"
                onPress={handleVerifyCode}
                loading={isVerifying}
                icon="checkmark-outline"
                variant="success"
                style={styles.secondaryButton}
                fullWidth
              />
            </>
          ) : (
            <Button
              title="Refresh verification status"
              onPress={handleRefreshStatus}
              icon="refresh-outline"
              variant="outline"
              style={styles.primaryButton}
              fullWidth
            />
          )}

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Open email app"
            onPress={handleOpenMail}
            icon="mail-outline"
            variant="outline"
            style={styles.tertiaryButton}
            fullWidth
          />
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
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColors?.inputBackground || colors.inputBackground,
      borderWidth: 1,
      borderColor: themeColors?.border || colors.border,
    },
    headerTitle: {
      ...typography.h3,
      color: themeColors?.text || colors.text,
    },
    headerSpacer: {
      width: 40,
    },
    card: {
      marginTop: spacing.lg,
      paddingVertical: spacing.xl,
    },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: themeColors?.primary || colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h2,
      color: themeColors?.text || colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    body: {
      ...typography.body,
      color: themeColors?.textSecondary || colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    email: {
      ...typography.body,
      color: themeColors?.text || colors.text,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    verifiedAt: {
      ...typography.bodySmall,
      color: themeColors?.textSecondary || colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    success: {
      ...typography.bodySmall,
      color: themeColors?.success || colors.success,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    error: {
      ...typography.bodySmall,
      color: themeColors?.danger || colors.danger,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    primaryButton: {
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    codeInput: {
      marginTop: spacing.sm,
      marginBottom: 0,
    },
    secondaryButton: {
      marginTop: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    tertiaryButton: {
      marginTop: spacing.lg,
      borderRadius: borderRadius.lg,
    },
  });

export default VerifyEmailScreen;
