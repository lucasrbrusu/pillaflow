import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Easing,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../components/Input';
import { useApp } from '../context/AppContext';
import { colors, borderRadius, spacing, typography, shadows } from '../utils/theme';

const badges = [
  {
    id: 'habits',
    icon: 'target',
    iconType: 'feather',
    color: colors.habits,
  },
  {
    id: 'tasks',
    icon: 'edit-3',
    iconType: 'feather',
    color: colors.tasks,
  },
  {
    id: 'health',
    icon: 'heart-outline',
    iconType: 'ionicons',
    color: colors.health,
  },
  {
    id: 'home',
    icon: 'history',
    iconType: 'material',
    color: colors.routine,
  },
  {
    id: 'finance',
    icon: 'trending-up',
    iconType: 'feather',
    color: colors.finance,
  },
];

const onboardingJourneySteps = [
  {
    key: 'onboarding_habits',
    title: 'Want to become a more disciplined you?',
    subtitle:
      'Build momentum with streaks and small wins that compound every day.',
    buttonLabel: 'Yes lets do it',
  },
  {
    key: 'onboarding_tasks',
    title: 'Want to better plan your day?',
    subtitle:
      'Break goals into clear tasks and execute one focused action at a time.',
    buttonLabel: 'Keep going',
  },
  {
    key: 'onboarding_health',
    title: 'Want more energy and focus?',
    subtitle:
      'Track sleep, hydration, and nutrition so your discipline stays strong.',
    buttonLabel: 'I want this',
  },
  {
    key: 'onboarding_routine',
    title: 'Want structure that actually sticks?',
    subtitle:
      'Use routines, lists, and reminders to stay consistent and accountable.',
    buttonLabel: 'Continue',
  },
  {
    key: 'onboarding_finance',
    title: 'Want to take control of your money too?',
    subtitle:
      'Track spending, cash flow, and insights so your progress is complete.',
    buttonLabel: 'Continue',
  },
  {
    key: 'onboarding_ready',
    title: 'Ready to level up every area of your life?',
    subtitle:
      'Hold to commit. Once complete, we will create your account and launch your dashboard.',
    buttonLabel: "I'm ready",
  },
];

const stepContent = [
  {
    key: 'name',
    title: "What's your name?",
    subtitle: 'Let us know what to call you',
  },
  {
    key: 'username',
    title: 'Choose a username',
    subtitle: 'This is how others will find you',
  },
  {
    key: 'email',
    title: "What's your email?",
    subtitle: "We'll use this for login and updates",
  },
  {
    key: 'password',
    title: 'Create a password',
    subtitle: 'Use 6+ chars, 1 uppercase, and 1 symbol',
  },
  {
    key: 'terms',
    title: 'Terms & Privacy',
    subtitle: 'Please review and accept to continue',
  },
  ...onboardingJourneySteps,
];

const habitPreviewRows = [
  { id: 'habit-1', name: 'Study the book', progress: '0 / 5 times', streak: '0 day streak', percent: '0%', color: '#5AB9B1' },
  { id: 'habit-2', name: 'Practise pitches', progress: '30 / 50 times', streak: '0 day streak', percent: '60%', color: '#6B4AE2' },
  { id: 'habit-3', name: 'Night exercises', progress: '1 / 1 times', streak: '2 day streak', percent: '100%', color: '#2F6BDF' },
  { id: 'habit-4', name: 'Morning stretches', progress: '1 / 1 times', streak: '2 day streak', percent: '100%', color: '#E13838' },
];

const taskPreviewRows = [
  { id: 'task-1', title: 'Meeting with associate', priority: 'Low', due: '02/23/2026', priorityColor: '#9CA3AF' },
  { id: 'task-2', title: 'Presentation with team', priority: 'High', due: '02/25/2026', priorityColor: '#EF4444' },
  { id: 'task-3', title: 'Discuss documents to John', priority: 'Medium', due: '03/05/2026', priorityColor: '#F59E0B' },
];

const routinePreviewRows = [
  { id: 'routine-1', title: 'morning routine', meta: '0 tasks · no range set' },
  { id: 'routine-2', title: 'Weekly reset', meta: 'Family · 0 tasks' },
  { id: 'routine-3', title: 'group routine', meta: '12:00 - 13:00 (1h)' },
];

const financePreviewLegend = [
  { id: 'bills', name: 'bills', amount: '850', color: '#16A34A' },
  { id: 'health', name: 'health', amount: '400', color: '#EF4444' },
  { id: 'food', name: 'food', amount: '200', color: '#6366F1' },
  { id: 'shopping', name: 'shopping', amount: '160', color: '#F59E0B' },
  { id: 'entertainment', name: 'entertainment', amount: '50', color: '#EC4899' },
];

const termsHighlights = [
  {
    id: 'privacy',
    title: 'Privacy First',
    description: 'Your data is encrypted and private. We never share your information.',
  },
  {
    id: 'adfree',
    title: 'Ad-Free Experience',
    description: 'No ads, no tracking. Just a clean productivity experience.',
  },
  {
    id: 'cancel',
    title: 'Cancel Anytime',
    description: "You're in control. Cancel your account anytime, no questions asked.",
  },
];

const getPasswordError = (password) => {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters and include at least one uppercase letter and one symbol.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return 'Password must include at least one symbol.';
  }

  return '';
};

const getPasswordStrength = (password) => {
  const value = String(password || '');
  if (!value) {
    return {
      level: 0,
      label: 'Start typing',
    };
  }

  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 10) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9\s]/.test(value)) score += 1;

  if (score <= 2) {
    return { level: 1, label: 'Weak' };
  }
  if (score <= 4) {
    return { level: 2, label: 'Fair' };
  }
  if (score === 5) {
    return { level: 3, label: 'Good' };
  }
  return { level: 4, label: 'Strong' };
};

const HOLD_TO_CREATE_DURATION_MS = 3000;
const AVAILABILITY_DEBOUNCE_MS = 450;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const createAvailabilityState = (status = 'idle', message = '', value = '') => ({
  status,
  message,
  value,
});

const SignupFlowScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { signUp, checkAccountAvailability, themeColors, themeName } = useApp();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const isDark = themeName === 'dark';
  const scrollRef = useRef(null);
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const entryAnim = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnimationRef = useRef(null);
  const holdCompletedRef = useRef(false);
  const usernameCheckRequestRef = useRef(0);
  const emailCheckRequestRef = useRef(0);

  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [error, setError] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState(
    createAvailabilityState()
  );
  const [emailAvailability, setEmailAvailability] = useState(
    createAvailabilityState()
  );
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
  });

  const signupTheme = useMemo(
    () => ({
      backgroundGradient: isDark
        ? ['#0B1020', '#0C1124', '#140F24']
        : ['#F9F0FF', '#FFF6FA', '#F5F8FF'],
      cardBg: isDark ? '#0F172A' : '#FFFFFF',
      cardBorder: isDark ? '#1F2937' : '#EDE9F5',
      inputBg: isDark ? '#0B1220' : '#FFFFFF',
      inputBorder: isDark ? '#1F2937' : '#E5E7EB',
      buttonGradient: isDark ? ['#8B5CF6', '#EC4899'] : ['#B14DFF', '#F43F8C'],
      link: isDark ? '#C084FC' : colors.primary,
      muted: themeColors.textSecondary || colors.textSecondary,
      highlightBg: isDark ? '#111827' : '#F9F5FF',
      orbOne: isDark ? 'rgba(139,92,246,0.22)' : 'rgba(236,72,153,0.16)',
      orbTwo: isDark ? 'rgba(56,189,248,0.2)' : 'rgba(59,130,246,0.12)',
    }),
    [isDark, themeColors.textSecondary]
  );

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) {
      setError('');
    }
  };

  useEffect(() => {
    const runEntry = () => {
      entryAnim.setValue(0);
      Animated.timing(entryAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };
    runEntry();
    const unsubscribe = navigation.addListener('focus', runEntry);
    return unsubscribe;
  }, [entryAnim, navigation]);

  const animateToStep = (nextStep, direction) => {
    if (nextStep === stepIndex) return;
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
      setStepIndex(nextStep);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      navigation.goBack();
      return;
    }
    setError('');
    animateToStep(Math.max(stepIndex - 1, 0), 'right');
  };

  const handleOpenLink = (url) => {
    Linking.openURL(url);
  };

  const resetHoldProgress = () => {
    holdAnimationRef.current?.stop();
    holdAnimationRef.current = null;
    holdCompletedRef.current = false;
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
    setIsHolding(false);
  };

  const createAccount = async () => {
    try {
      setIsSubmitting(true);
      await signUp({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
    } catch (submitError) {
      setError(submitError?.message || 'Something went wrong. Please try again.');
      resetHoldProgress();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    const stepError = getStepError();
    if (stepError) {
      setError(stepError);
      return;
    }

    if (stepIndex < stepContent.length - 1) {
      setError('');
      animateToStep(stepIndex + 1, 'left');
      return;
    }
  };

  useEffect(() => {
    resetHoldProgress();
    return () => {
      holdAnimationRef.current?.stop();
      holdAnimationRef.current = null;
    };
  }, [stepIndex]);

  useEffect(() => {
    const trimmedUsername = form.username.trim().toLowerCase();
    if (!trimmedUsername) {
      usernameCheckRequestRef.current += 1;
      setUsernameAvailability(createAvailabilityState('idle', '', ''));
      return undefined;
    }

    setUsernameAvailability(
      createAvailabilityState('checking', 'Checking username availability...', trimmedUsername)
    );

    let cancelled = false;
    const timer = setTimeout(async () => {
      const requestId = usernameCheckRequestRef.current + 1;
      usernameCheckRequestRef.current = requestId;
      try {
        const result = await checkAccountAvailability({ username: trimmedUsername });
        if (cancelled || usernameCheckRequestRef.current !== requestId) return;

        if (result.usernameReason === 'availability_function_missing') {
          setUsernameAvailability(
            createAvailabilityState(
              'error',
              'Unable to verify username right now. We will check again when you create your account.',
              trimmedUsername
            )
          );
          return;
        }

        if (result.usernameAvailable) {
          setUsernameAvailability(
            createAvailabilityState('available', 'Username is available.', trimmedUsername)
          );
          return;
        }

        setUsernameAvailability(
          createAvailabilityState('taken', 'That username is already taken.', trimmedUsername)
        );
      } catch (availabilityError) {
        if (cancelled || usernameCheckRequestRef.current !== requestId) return;
        setUsernameAvailability(
          createAvailabilityState(
            'error',
            availabilityError?.message || 'Unable to verify username right now.',
            trimmedUsername
          )
        );
      }
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkAccountAvailability, form.username]);

  useEffect(() => {
    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      emailCheckRequestRef.current += 1;
      setEmailAvailability(createAvailabilityState('idle', '', ''));
      return undefined;
    }

    setEmailAvailability(
      createAvailabilityState('checking', 'Checking email availability...', normalizedEmail)
    );

    let cancelled = false;
    const timer = setTimeout(async () => {
      const requestId = emailCheckRequestRef.current + 1;
      emailCheckRequestRef.current = requestId;
      try {
        const result = await checkAccountAvailability({ email: normalizedEmail });
        if (cancelled || emailCheckRequestRef.current !== requestId) return;

        if (result.emailReason === 'availability_function_missing') {
          setEmailAvailability(
            createAvailabilityState(
              'error',
              'Unable to verify email right now. We will check again when you create your account.',
              normalizedEmail
            )
          );
          return;
        }

        if (result.emailAvailable) {
          setEmailAvailability(
            createAvailabilityState('available', 'Email is available.', normalizedEmail)
          );
          return;
        }

        setEmailAvailability(
          createAvailabilityState(
            'taken',
            'That email is already in use. Please sign in or use another.',
            normalizedEmail
          )
        );
      } catch (availabilityError) {
        if (cancelled || emailCheckRequestRef.current !== requestId) return;
        setEmailAvailability(
          createAvailabilityState(
            'error',
            availabilityError?.message || 'Unable to verify email right now.',
            normalizedEmail
          )
        );
      }
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkAccountAvailability, form.email]);

  const getStepError = () => {
    const trimmedName = form.fullName.trim();
    const trimmedUsername = form.username.trim();
    const trimmedEmail = form.email.trim();
    const trimmedConfirmEmail = form.confirmEmail.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const normalizedConfirmEmail = trimmedConfirmEmail.toLowerCase();
    const currentStepKey = stepContent[stepIndex]?.key;

    switch (currentStepKey) {
      case 'name':
        return trimmedName ? '' : 'Please enter your full name.';
      case 'username':
        if (usernameAvailability.status === 'checking') {
          return 'Checking username availability...';
        }
        if (usernameAvailability.status === 'taken') {
          return 'That username is already taken.';
        }
        return trimmedUsername ? '' : 'Please choose a username.';
      case 'email':
        if (!trimmedEmail) {
          return 'Please enter your email address.';
        }
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
          return 'Please enter a valid email address.';
        }
        if (!trimmedConfirmEmail) {
          return 'Please re-enter your email address.';
        }
        if (!EMAIL_PATTERN.test(trimmedConfirmEmail)) {
          return 'Please enter a valid confirmation email address.';
        }
        if (normalizedEmail !== normalizedConfirmEmail) {
          return 'Email addresses do not match.';
        }
        if (emailAvailability.status === 'checking') {
          return 'Checking email availability...';
        }
        if (emailAvailability.status === 'taken') {
          return 'That email is already in use.';
        }
        return '';
      case 'password': {
        const passwordError = getPasswordError(form.password);
        if (passwordError) {
          return passwordError;
        }
        if (!form.confirmPassword) {
          return 'Please confirm your password.';
        }
        if (form.password !== form.confirmPassword) {
          return 'Passwords do not match.';
        }
        return '';
      }
      case 'terms':
        return hasAcceptedTerms ? '' : 'Please accept the terms to continue.';
      default:
        return '';
    }
  };

  const isStepComplete = useMemo(() => {
    const currentStepKey = stepContent[stepIndex]?.key;

    switch (currentStepKey) {
      case 'name':
        return Boolean(form.fullName.trim());
      case 'username':
        return (
          Boolean(form.username.trim()) &&
          usernameAvailability.status !== 'checking' &&
          usernameAvailability.status !== 'taken'
        );
      case 'email':
        return (
          Boolean(form.email.trim()) &&
          Boolean(form.confirmEmail.trim()) &&
          EMAIL_PATTERN.test(form.email.trim()) &&
          EMAIL_PATTERN.test(form.confirmEmail.trim()) &&
          form.email.trim().toLowerCase() === form.confirmEmail.trim().toLowerCase() &&
          emailAvailability.status !== 'checking' &&
          emailAvailability.status !== 'taken'
        );
      case 'password':
        return (
          Boolean(form.password) &&
          !getPasswordError(form.password) &&
          form.password === form.confirmPassword
        );
      case 'terms':
        return hasAcceptedTerms;
      default:
        return true;
    }
  }, [emailAvailability.status, form, hasAcceptedTerms, stepIndex, usernameAvailability.status]);
  const passwordStrength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password]
  );
  const passwordStrengthColor = useMemo(() => {
    if (passwordStrength.level <= 1) return themeColors?.danger || colors.danger;
    if (passwordStrength.level === 2) return themeColors?.warning || colors.warning;
    if (passwordStrength.level === 3) return themeColors?.info || colors.info;
    return themeColors?.success || colors.success;
  }, [passwordStrength.level, themeColors]);

  const renderBadgeIcon = (badge) => {
    if (badge.iconType === 'feather') {
      return <Feather name={badge.icon} size={18} color={badge.color} />;
    }
    if (badge.iconType === 'material') {
      return <MaterialCommunityIcons name={badge.icon} size={18} color={badge.color} />;
    }
    return <Ionicons name={badge.icon} size={18} color={badge.color} />;
  };

  const stepMeta = stepContent[stepIndex];
  const isJourneyStep = stepMeta?.key?.startsWith('onboarding_');
  const isHoldToCreateStep = stepMeta?.key === 'onboarding_ready';
  const progress = (stepIndex + 1) / stepContent.length;
  const isLastStep = stepIndex === stepContent.length - 1;
  const ctaLabel = stepMeta?.buttonLabel || (isLastStep ? 'Create Account' : 'Continue');
  const isCtaDisabled = isHoldToCreateStep
    ? isSubmitting
    : (!isStepComplete || isSubmitting);
  const entryOpacity = entryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const entryScale = entryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.06, 1],
  });
  const entryTranslateY = entryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const fadeOpacity = translateX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const holdFillWidth = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const handleHoldStart = () => {
    if (!isHoldToCreateStep || isSubmitting) return;
    setError('');
    holdAnimationRef.current?.stop();
    holdCompletedRef.current = false;
    holdProgress.setValue(0);
    setIsHolding(true);

    holdAnimationRef.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_TO_CREATE_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    holdAnimationRef.current.start(({ finished }) => {
      if (!finished || holdCompletedRef.current) return;
      holdCompletedRef.current = true;
      setIsHolding(false);
      createAccount();
    });
  };

  const handleHoldEnd = () => {
    if (!isHoldToCreateStep || isSubmitting) return;
    if (holdCompletedRef.current) return;

    holdAnimationRef.current?.stop();
    holdAnimationRef.current = null;
    setIsHolding(false);
    Animated.timing(holdProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const renderOnboardingPreview = () => {
    if (stepMeta.key === 'onboarding_habits') {
      return (
        <View style={styles.previewWrap}>
          {habitPreviewRows.map((row) => (
            <View key={row.id} style={[styles.previewHabitCard, { backgroundColor: row.color }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewHabitTitle}>{row.name}</Text>
                <Text style={styles.previewHabitMeta}>{row.progress}</Text>
              </View>
              <View style={styles.previewHabitRight}>
                <Text style={styles.previewHabitMeta}>{row.streak}</Text>
                <Text style={styles.previewHabitPercent}>{row.percent}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (stepMeta.key === 'onboarding_tasks') {
      return (
        <View style={styles.previewWrap}>
          <View style={styles.previewTaskButtonRow}>
            <View style={[styles.previewTaskButton, styles.previewTaskButtonPrimary]}>
              <Text style={styles.previewTaskButtonPrimaryText}>Add Task</Text>
            </View>
            <View style={styles.previewTaskButton}>
              <Text style={styles.previewTaskButtonText}>Create Note</Text>
            </View>
          </View>
          {taskPreviewRows.map((row) => (
            <View key={row.id} style={styles.previewTaskRow}>
              <View style={[styles.previewTaskPriority, { backgroundColor: `${row.priorityColor}22` }]}>
                <Text style={[styles.previewTaskPriorityText, { color: row.priorityColor }]}>{row.priority}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.previewTaskTitle}>{row.title}</Text>
                <Text style={styles.previewTaskDue}>{row.due}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (stepMeta.key === 'onboarding_health') {
      return (
        <View style={styles.previewWrap}>
          <View style={styles.previewHealthRow}>
            <View style={styles.previewHealthStat}>
              <Text style={styles.previewHealthLabel}>Avg Water</Text>
              <Text style={[styles.previewHealthValue, { color: '#3B82F6' }]}>0.49 L</Text>
            </View>
            <View style={styles.previewHealthStat}>
              <Text style={styles.previewHealthLabel}>Avg Sleep</Text>
              <Text style={[styles.previewHealthValue, { color: '#A855F7' }]}>7.5 h</Text>
            </View>
          </View>
          <View style={styles.previewCalorieCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewCalorieTitle}>Calorie Tracker</Text>
              <Text style={styles.previewCalorieMeta}>Goal 2159 cal</Text>
              <Text style={styles.previewCalorieMeta}>Consumed 0 cal</Text>
            </View>
            <View style={styles.previewRing}>
              <Text style={styles.previewRingValue}>2159</Text>
            </View>
          </View>
          <View style={styles.previewTipCard}>
            <Text style={styles.previewTipText}>Tip: Focus on carbs to stay on track today.</Text>
          </View>
        </View>
      );
    }

    if (stepMeta.key === 'onboarding_routine') {
      return (
        <View style={styles.previewWrap}>
          <View style={styles.previewRoutineSummaryRow}>
            <View style={styles.previewRoutineSummary}>
              <Text style={styles.previewRoutineSummaryValue}>3</Text>
              <Text style={styles.previewRoutineSummaryLabel}>Routines</Text>
            </View>
            <View style={styles.previewRoutineSummary}>
              <Text style={styles.previewRoutineSummaryValue}>2</Text>
              <Text style={styles.previewRoutineSummaryLabel}>Open</Text>
            </View>
            <View style={styles.previewRoutineSummary}>
              <Text style={styles.previewRoutineSummaryValue}>2</Text>
              <Text style={styles.previewRoutineSummaryLabel}>Reminders</Text>
            </View>
          </View>
          {routinePreviewRows.map((row) => (
            <View key={row.id} style={styles.previewRoutineRow}>
              <View>
                <Text style={styles.previewRoutineTitle}>{row.title}</Text>
                <Text style={styles.previewRoutineMeta}>{row.meta}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#7C83A3" />
            </View>
          ))}
        </View>
      );
    }

    if (stepMeta.key === 'onboarding_ready') {
      return (
        <View style={styles.previewWrap}>
          <View style={styles.previewReadyCard}>
            <Text style={styles.previewReadyTitle}>Your system is ready</Text>
            <Text style={styles.previewReadyText}>
              Habits + Tasks + Health + Routine + Finance
            </Text>
          </View>
          <View style={styles.previewReadyGrid}>
            <View style={[styles.previewReadyPill, { backgroundColor: '#EDE9FE' }]}>
              <Text style={[styles.previewReadyPillText, { color: '#5B21B6' }]}>Consistency</Text>
            </View>
            <View style={[styles.previewReadyPill, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.previewReadyPillText, { color: '#1D4ED8' }]}>Planning</Text>
            </View>
            <View style={[styles.previewReadyPill, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.previewReadyPillText, { color: '#047857' }]}>Health</Text>
            </View>
            <View style={[styles.previewReadyPill, { backgroundColor: '#FCE7F3' }]}>
              <Text style={[styles.previewReadyPillText, { color: '#BE185D' }]}>Growth</Text>
            </View>
          </View>
          <View style={styles.previewReadyNote}>
            <Ionicons name="time-outline" size={15} color="#6B7280" />
            <Text style={styles.previewReadyNoteText}>Hold the button for 3 seconds to begin.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.previewWrap}>
        <View style={styles.previewFinanceHeader}>
          <Text style={styles.previewFinanceHeaderLabel}>Total Balance</Text>
          <Text style={styles.previewFinanceHeaderValue}>GBP 410</Text>
          <View style={styles.previewFinanceMetaRow}>
            <Text style={styles.previewFinanceMeta}>Income 2100</Text>
            <Text style={styles.previewFinanceMeta}>Expenses 1690</Text>
          </View>
        </View>
        <View style={styles.previewFinanceCard}>
          <View style={styles.previewFinancePie} />
          <View style={styles.previewFinanceLegend}>
            {financePreviewLegend.map((item) => (
              <View key={item.id} style={styles.previewFinanceLegendRow}>
                <View style={[styles.previewFinanceDot, { backgroundColor: item.color }]} />
                <Text style={styles.previewFinanceLegendText}>
                  {`${item.name} ${item.amount}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={signupTheme.backgroundGradient}
      style={[styles.container, { paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.backgroundOrbs} pointerEvents="none">
        <View style={[styles.orb, styles.orbOne, { backgroundColor: signupTheme.orbOne }]} />
        <View style={[styles.orb, styles.orbTwo, { backgroundColor: signupTheme.orbTwo }]} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.scene,
            {
              opacity: entryOpacity,
              transform: [{ translateY: entryTranslateY }, { scale: entryScale }],
            },
          ]}
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={22} color={themeColors.text} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.stepLabel}>
              Step {stepIndex + 1} of {stepContent.length}
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: signupTheme.cardBorder }]}>
            <LinearGradient
              colors={signupTheme.buttonGradient}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>

          <View style={styles.iconRow}>
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badge,
                  { backgroundColor: `${badge.color}1A` },
                ]}
              >
                {renderBadgeIcon(badge)}
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
            {isJourneyStep ? 'Build your onboarding foundation' : 'Create your account'}
          </Text>

          <Animated.View style={{ transform: [{ translateX }], opacity: fadeOpacity }}>
            <View
              style={[
                styles.card,
                { backgroundColor: signupTheme.cardBg, borderColor: signupTheme.cardBorder },
              ]}
            >
              <Text style={styles.cardTitle}>{stepMeta.title}</Text>
              <Text style={styles.cardSubtitle}>{stepMeta.subtitle}</Text>

              {stepMeta.key === 'name' && (
                <Input
                  label="Full name"
                  placeholder="John Doe"
                  icon="person-circle-outline"
                  value={form.fullName}
                  onChangeText={(text) => updateField('fullName', text)}
                  containerStyle={styles.inputGroup}
                  style={[
                    styles.inputField,
                    { backgroundColor: signupTheme.inputBg, borderColor: signupTheme.inputBorder },
                  ]}
                  inputStyle={styles.inputText}
                />
              )}

              {stepMeta.key === 'username' && (
                <>
                  <Input
                    label="Username"
                    placeholder="johndoe"
                    icon="at-outline"
                    autoCapitalize="none"
                    value={form.username}
                    onChangeText={(text) => updateField('username', text)}
                    containerStyle={styles.inputGroup}
                    style={[
                      styles.inputField,
                      { backgroundColor: signupTheme.inputBg, borderColor: signupTheme.inputBorder },
                    ]}
                    inputStyle={styles.inputText}
                  />
                  <Text style={styles.helperText}>Your username must be unique.</Text>
                  {usernameAvailability.status !== 'idle' && (
                    <View style={styles.availabilityRow}>
                      {usernameAvailability.status === 'checking' ? (
                        <ActivityIndicator
                          size="small"
                          color={signupTheme.link}
                          style={styles.availabilitySpinner}
                        />
                      ) : (
                        <Ionicons
                          name={
                            usernameAvailability.status === 'available'
                              ? 'checkmark-circle'
                              : 'alert-circle'
                          }
                          size={15}
                          color={
                            usernameAvailability.status === 'available'
                              ? colors.success
                              : colors.danger
                          }
                          style={styles.availabilityIcon}
                        />
                      )}
                      <Text
                        style={[
                          styles.availabilityText,
                          usernameAvailability.status === 'available'
                            ? styles.availabilityTextSuccess
                            : styles.availabilityTextError,
                        ]}
                      >
                        {usernameAvailability.message}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {stepMeta.key === 'email' && (
                <>
                  <Input
                    label="Email address"
                    placeholder="john@example.com"
                    icon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(text) => updateField('email', text)}
                    containerStyle={styles.inputGroup}
                    style={[
                      styles.inputField,
                      { backgroundColor: signupTheme.inputBg, borderColor: signupTheme.inputBorder },
                    ]}
                    inputStyle={styles.inputText}
                  />
                  {emailAvailability.status !== 'idle' && (
                    <View style={styles.availabilityRow}>
                      {emailAvailability.status === 'checking' ? (
                        <ActivityIndicator
                          size="small"
                          color={signupTheme.link}
                          style={styles.availabilitySpinner}
                        />
                      ) : (
                        <Ionicons
                          name={
                            emailAvailability.status === 'available'
                              ? 'checkmark-circle'
                              : 'alert-circle'
                          }
                          size={15}
                          color={
                            emailAvailability.status === 'available'
                              ? colors.success
                              : colors.danger
                          }
                          style={styles.availabilityIcon}
                        />
                      )}
                      <Text
                        style={[
                          styles.availabilityText,
                          emailAvailability.status === 'available'
                            ? styles.availabilityTextSuccess
                            : styles.availabilityTextError,
                        ]}
                      >
                        {emailAvailability.message}
                      </Text>
                    </View>
                  )}
                  <Input
                    label="Re-enter email address"
                    placeholder="john@example.com"
                    icon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.confirmEmail}
                    onChangeText={(text) => updateField('confirmEmail', text)}
                    containerStyle={styles.inputGroupTight}
                    style={[
                      styles.inputField,
                      { backgroundColor: signupTheme.inputBg, borderColor: signupTheme.inputBorder },
                    ]}
                    inputStyle={styles.inputText}
                  />
                </>
              )}

              {stepMeta.key === 'password' && (
                <>
                  <Input
                    label="Password"
                    placeholder="********"
                    icon="lock-closed-outline"
                    secureTextEntry
                    autoCapitalize="none"
                    value={form.password}
                    onChangeText={(text) => updateField('password', text)}
                    containerStyle={styles.inputGroup}
                    style={[
                      styles.inputField,
                      { backgroundColor: signupTheme.inputBg, borderColor: signupTheme.inputBorder },
                    ]}
                    inputStyle={styles.inputText}
                  />
                  <View style={styles.passwordStrengthWrap}>
                    <View style={styles.passwordStrengthRow}>
                      <Text style={styles.passwordStrengthTitle}>Password strength</Text>
                      <Text
                        style={[
                          styles.passwordStrengthValue,
                          { color: passwordStrengthColor },
                        ]}
                      >
                        {passwordStrength.label}
                      </Text>
                    </View>
                    <View style={styles.passwordStrengthBars}>
                      {[1, 2, 3, 4].map((bar) => (
                        <View
                          key={`strength-${bar}`}
                          style={[
                            styles.passwordStrengthBar,
                            bar <= passwordStrength.level
                              ? { backgroundColor: passwordStrengthColor }
                              : styles.passwordStrengthBarInactive,
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.passwordStrengthHint}>
                      Use 6+ characters, uppercase letters, numbers, and symbols.
                    </Text>
                  </View>
                  <Input
                    label="Confirm password"
                    placeholder="********"
                    icon="lock-closed-outline"
                    secureTextEntry
                    autoCapitalize="none"
                    value={form.confirmPassword}
                    onChangeText={(text) => updateField('confirmPassword', text)}
                    containerStyle={styles.inputGroupTight}
                    style={[
                      styles.inputField,
                      { backgroundColor: signupTheme.inputBg, borderColor: signupTheme.inputBorder },
                    ]}
                    inputStyle={styles.inputText}
                  />
                </>
              )}

              {stepMeta.key === 'terms' && (
                <>
                  <View style={[styles.termsCard, { backgroundColor: signupTheme.highlightBg }]}>
                    {termsHighlights.map((item) => (
                      <View key={item.id} style={styles.termsItem}>
                        <View style={[styles.termsCheck, { borderColor: signupTheme.link }]}>
                          <Ionicons name="checkmark" size={14} color={signupTheme.link} />
                        </View>
                        <View style={styles.termsCopy}>
                          <Text style={styles.termsTitle}>{item.title}</Text>
                          <Text style={styles.termsDescription}>{item.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.termsRow}
                    activeOpacity={0.8}
                    onPress={() => {
                      setHasAcceptedTerms((prev) => !prev);
                      if (error) {
                        setError('');
                      }
                    }}
                  >
                    <Feather
                      name={hasAcceptedTerms ? 'check-square' : 'square'}
                      size={20}
                      color={hasAcceptedTerms ? signupTheme.link : signupTheme.muted}
                      style={styles.checkboxIcon}
                    />
                    <Text style={styles.termsText}>
                      I agree to the{' '}
                      <Text
                        style={[styles.termsLink, { color: signupTheme.link }]}
                        onPress={() => handleOpenLink('https://pillaflow.net/terms-of-service.html')}
                      >
                        Terms of Service
                      </Text>{' '}
                      and{' '}
                      <Text
                        style={[styles.termsLink, { color: signupTheme.link }]}
                        onPress={() => handleOpenLink('https://pillaflow.net/privacy-policy.html')}
                      >
                        Privacy Policy
                      </Text>
                      .
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {isJourneyStep && (
                <View style={styles.onboardingVisualCard}>
                  {renderOnboardingPreview()}
                </View>
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {isHoldToCreateStep ? (
                <>
                  <TouchableOpacity
                    style={[styles.ctaButton, isCtaDisabled && styles.ctaDisabled]}
                    onPressIn={handleHoldStart}
                    onPressOut={handleHoldEnd}
                    disabled={isCtaDisabled}
                    activeOpacity={0.95}
                  >
                    <View
                      style={[
                        styles.ctaContent,
                        { backgroundColor: signupTheme.buttonGradient[0] },
                      ]}
                    >
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.holdFill, { width: holdFillWidth }]}
                      />
                      {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.ctaText}>{ctaLabel}</Text>
                          <Ionicons
                            name={isHolding ? 'lock-closed' : 'hand-left-outline'}
                            size={18}
                            color="#FFFFFF"
                            style={styles.ctaIcon}
                          />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                  {!isSubmitting && (
                    <Text style={styles.holdHintText}>
                      Hold for 3 seconds to create your account
                    </Text>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.ctaButton, isCtaDisabled && styles.ctaDisabled]}
                  onPress={handleContinue}
                  disabled={isCtaDisabled}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.ctaContent,
                      { backgroundColor: signupTheme.buttonGradient[0] },
                    ]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.ctaText}>{ctaLabel}</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color="#FFFFFF"
                          style={styles.ctaIcon}
                        />
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
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

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.xl,
    },
    scene: {
      flexGrow: 1,
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
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backText: {
      ...typography.bodySmall,
      marginLeft: spacing.xs,
      color: mutedText,
    },
    stepLabel: {
      ...typography.bodySmall,
      color: mutedText,
      fontWeight: '600',
    },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },
    progressFill: {
      height: 6,
      borderRadius: 999,
    },
    iconRow: {
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
      fontSize: 30,
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
    card: {
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      padding: spacing.lg,
      ...shadows.medium,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: baseText,
      marginBottom: spacing.xs,
    },
    cardSubtitle: {
      ...typography.bodySmall,
      color: mutedText,
      marginBottom: spacing.lg,
    },
    inputGroup: {
      marginBottom: spacing.md,
    },
    inputGroupTight: {
      marginBottom: spacing.sm,
    },
    inputField: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
    },
    inputText: {
      color: baseText,
    },
    helperText: {
      ...typography.caption,
      color: mutedText,
      marginBottom: spacing.md,
    },
    availabilityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
      minHeight: 18,
    },
    availabilitySpinner: {
      marginRight: spacing.xs,
    },
    availabilityIcon: {
      marginRight: spacing.xs,
    },
    availabilityText: {
      ...typography.caption,
      flexShrink: 1,
    },
    availabilityTextSuccess: {
      color: colors.success,
    },
    availabilityTextError: {
      color: colors.danger,
    },
    passwordStrengthWrap: {
      marginTop: -spacing.xs,
      marginBottom: spacing.md,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: '#E6E8F0',
      backgroundColor: '#FBFCFF',
    },
    passwordStrengthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    passwordStrengthTitle: {
      ...typography.caption,
      color: mutedText,
      fontWeight: '600',
    },
    passwordStrengthValue: {
      ...typography.caption,
      fontWeight: '700',
    },
    passwordStrengthBars: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    passwordStrengthBar: {
      flex: 1,
      height: 6,
      borderRadius: borderRadius.full,
    },
    passwordStrengthBarInactive: {
      backgroundColor: '#E5E7EB',
    },
    passwordStrengthHint: {
      ...typography.caption,
      color: mutedText,
    },
    termsCard: {
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    termsItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    termsCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
      marginTop: 2,
    },
    termsCopy: {
      flex: 1,
    },
    termsTitle: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: baseText,
      marginBottom: 2,
    },
    termsDescription: {
      ...typography.caption,
      color: mutedText,
    },
    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    checkboxIcon: {
      marginTop: 2,
      marginRight: spacing.sm,
    },
    termsText: {
      ...typography.bodySmall,
      color: mutedText,
      flex: 1,
      lineHeight: 18,
    },
    termsLink: {
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    onboardingVisualCard: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: '#E8E3F2',
      backgroundColor: '#FFFFFF',
      padding: spacing.md,
      marginBottom: spacing.md,
      minHeight: 300,
    },
    previewWrap: {
      flex: 1,
    },
    previewHabitCard: {
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 10,
      marginBottom: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
    },
    previewHabitTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    previewHabitMeta: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 11,
      marginTop: 2,
      fontWeight: '600',
    },
    previewHabitRight: {
      alignItems: 'flex-end',
      marginLeft: spacing.sm,
    },
    previewHabitPercent: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
      marginTop: 1,
    },
    previewTaskButtonRow: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    previewTaskButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E4DEEF',
      paddingVertical: 9,
      alignItems: 'center',
      marginRight: spacing.xs,
      backgroundColor: '#FFFFFF',
    },
    previewTaskButtonPrimary: {
      backgroundColor: '#C34CEC',
      borderColor: '#C34CEC',
    },
    previewTaskButtonText: {
      color: '#2A3247',
      fontSize: 12,
      fontWeight: '700',
    },
    previewTaskButtonPrimaryText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    previewTaskRow: {
      borderRadius: 14,
      backgroundColor: '#F7F3FF',
      borderWidth: 1,
      borderColor: '#EAE1F7',
      paddingHorizontal: 9,
      paddingVertical: 9,
      marginBottom: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
    },
    previewTaskPriority: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      marginRight: spacing.sm,
    },
    previewTaskPriorityText: {
      fontSize: 10,
      fontWeight: '700',
    },
    previewTaskTitle: {
      color: '#20273A',
      fontSize: 12,
      fontWeight: '700',
    },
    previewTaskDue: {
      marginTop: 2,
      color: '#778097',
      fontSize: 10,
      fontWeight: '600',
    },
    previewHealthRow: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    previewHealthStat: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E7E3F2',
      backgroundColor: '#FDFDFF',
      paddingHorizontal: 9,
      paddingVertical: 8,
      marginRight: spacing.xs,
    },
    previewHealthLabel: {
      color: '#798199',
      fontSize: 10,
      fontWeight: '600',
    },
    previewHealthValue: {
      marginTop: 2,
      fontSize: 16,
      fontWeight: '800',
    },
    previewCalorieCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#BEE8D0',
      backgroundColor: '#F7FFFA',
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    previewCalorieTitle: {
      color: '#199B5E',
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 3,
    },
    previewCalorieMeta: {
      color: '#4D8E6C',
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 2,
    },
    previewRing: {
      width: 82,
      height: 82,
      borderRadius: 41,
      borderWidth: 3,
      borderColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewRingValue: {
      color: '#0D9B64',
      fontSize: 16,
      fontWeight: '800',
    },
    previewTipCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#DDE4EF',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    previewTipText: {
      color: '#6C7490',
      fontSize: 11,
      fontWeight: '600',
    },
    previewRoutineSummaryRow: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    previewRoutineSummary: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E6E0F2',
      paddingVertical: 8,
      alignItems: 'center',
      marginRight: spacing.xs,
      backgroundColor: '#FBF8FF',
    },
    previewRoutineSummaryValue: {
      color: '#2A3147',
      fontSize: 16,
      fontWeight: '800',
    },
    previewRoutineSummaryLabel: {
      color: '#768099',
      fontSize: 10,
      fontWeight: '700',
      marginTop: 2,
    },
    previewRoutineRow: {
      borderRadius: 12,
      backgroundColor: '#F5F2FB',
      borderWidth: 1,
      borderColor: '#E4DEF1',
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    previewRoutineTitle: {
      color: '#5460E5',
      fontSize: 12,
      fontWeight: '700',
    },
    previewRoutineMeta: {
      color: '#79819B',
      fontSize: 10,
      fontWeight: '600',
      marginTop: 2,
    },
    previewFinanceHeader: {
      borderRadius: 14,
      backgroundColor: '#32A5F6',
      paddingHorizontal: 10,
      paddingVertical: 10,
      marginBottom: spacing.sm,
    },
    previewFinanceHeaderLabel: {
      color: 'rgba(255,255,255,0.92)',
      fontSize: 10,
      fontWeight: '700',
    },
    previewFinanceHeaderValue: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '800',
      marginTop: 2,
    },
    previewFinanceMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    previewFinanceMeta: {
      color: 'rgba(255,255,255,0.92)',
      fontSize: 10,
      fontWeight: '700',
    },
    previewFinanceCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#DFE7F3',
      backgroundColor: '#FFFFFF',
      padding: 10,
      flexDirection: 'row',
      flex: 1,
    },
    previewFinancePie: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#EAF5FF',
      borderWidth: 6,
      borderColor: '#22C55E',
      marginRight: spacing.sm,
      alignSelf: 'center',
    },
    previewFinanceLegend: {
      flex: 1,
      justifyContent: 'center',
    },
    previewFinanceLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    previewFinanceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    previewFinanceLegendText: {
      color: '#30374D',
      fontSize: 10,
      fontWeight: '700',
    },
    previewReadyCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E6E0F2',
      backgroundColor: '#FBF8FF',
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: spacing.sm,
    },
    previewReadyTitle: {
      color: '#1F2937',
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 4,
    },
    previewReadyText: {
      color: '#6B7280',
      fontSize: 12,
      fontWeight: '600',
    },
    previewReadyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: spacing.sm,
    },
    previewReadyPill: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: borderRadius.full,
      marginRight: spacing.xs,
      marginBottom: spacing.xs,
    },
    previewReadyPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    previewReadyNote: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#DDE4EF',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    previewReadyNoteText: {
      marginLeft: spacing.xs,
      color: '#6C7490',
      fontSize: 11,
      fontWeight: '600',
    },
    errorText: {
      color: themeColorsParam?.danger || colors.danger,
      marginBottom: spacing.sm,
    },
    ctaButton: {
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      marginTop: spacing.sm,
    },
    ctaDisabled: {
      opacity: 0.6,
    },
    ctaContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      position: 'relative',
      overflow: 'hidden',
    },
    holdFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.28)',
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
    holdHintText: {
      ...typography.caption,
      textAlign: 'center',
      color: mutedText,
      marginTop: spacing.sm,
      fontWeight: '600',
    },
  });
};

export default SignupFlowScreen;

