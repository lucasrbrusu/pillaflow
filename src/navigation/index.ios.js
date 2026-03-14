import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { NavigationContainer, DefaultTheme, useNavigation, useIsFocused } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, shadows, borderRadius } from '../utils/theme';
import { useApp } from '../context/AppContext';
import AppTutorialOverlay from '../components/AppTutorialOverlay';
import NotificationPermissionOverlay from '../components/NotificationPermissionOverlay';
import StreakIncreaseToast from '../components/StreakIncreaseToast';

// Screens
import HomeScreen from '../screens/HomeScreen';
import HabitsScreen from '../screens/HabitsScreen';
import TasksScreen from '../screens/TasksScreen';
import NotesScreen from '../screens/NotesScreen';
import HealthScreen from '../screens/HealthScreen';
import RoutineScreen from '../screens/RoutineScreen';
import RoutineDetailScreen from '../screens/RoutineDetailScreen';
import FinanceScreen from '../screens/FinanceScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import DataAccountScreen from '../screens/DataAccountScreen';
import DeleteAccountDetailsScreen from '../screens/DeleteAccountDetailsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import CurrencyScreen from '../screens/CurrencyScreen';
import CalendarScreen from '../screens/CalendarScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import SignupFlowScreen from '../screens/SignupFlowScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import TwoFactorAuthScreen from '../screens/TwoFactorAuthScreen';
import MfaChallengeScreen from '../screens/MfaChallengeScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import MembershipScreen from '../screens/MembershipScreen';
import PermissionsScreen from '../screens/PermissionsScreen';
import InvitationsScreen from '../screens/InvitationsScreen';
import FriendsScreen from '../screens/FriendsScreen';
import GroupsScreen from '../screens/GroupsScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import ChatScreen from '../screens/ChatScreen';
import FocusModeScreen from '../screens/FocusModeScreen';
import CountdownTimerScreen from '../screens/CountdownTimerScreen';
import InsightsScreen from '../screens/InsightsScreen';
import BudgetGroupInsightScreen from '../screens/BudgetGroupInsightScreen';
import SpendingInsightsScreen from '../screens/SpendingInsightsScreen';
import FriendProfileScreen from '../screens/FriendProfileScreen';
import PaywallScreen from '../screens/PaywallScreen';
import WeightManagerScreen from '../screens/WeightManagerScreen';
import WeightProgressScreen from '../screens/WeightProgressScreen';
import WeightManagerUpdatePlanScreen from '../screens/WeightManagerUpdatePlanScreen';
import WeightJourneyHistoryScreen from '../screens/WeightJourneyHistoryScreen';
import WeightJourneyHistoryDetailScreen from '../screens/WeightJourneyHistoryDetailScreen';
import StepsScreen from '../screens/StepsScreen';
import WaterLogScreen from '../screens/WaterLogScreen';
import SleepLogScreen from '../screens/SleepLogScreen';
import MoodCalendarScreen from '../screens/MoodCalendarScreen';
import StreakScreen from '../screens/StreakScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const FRIENDS_GESTURE_DISTANCE = Math.round(Dimensions.get('window').width);
const CHAT_BUTTON_SIZE = 60;
const CHAT_BUTTON_LIFT = 14;
const CHAT_BUTTON_SPACER = CHAT_BUTTON_SIZE;
const TAB_FADE_DURATION_MS = 90;
const TAB_FADE_START_OPACITY = 0.96;
const TAB_BAR_CONTAINER_PADDING_HORIZONTAL = 20;
const TAB_BAR_PADDING_HORIZONTAL = 16;
const TAB_ICON_CENTER_OFFSET_FROM_BOTTOM = 34;

const QuickTabFade = ({ children }) => {
  const isFocused = useIsFocused();
  const opacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!isFocused) return undefined;

    opacity.stopAnimation();
    opacity.setValue(TAB_FADE_START_OPACITY);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: TAB_FADE_DURATION_MS,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [isFocused, opacity]);

  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
};

const createFadedTabScreen = (ScreenComponent, displayName) => {
  const FadedTabScreen = (props) => (
    <QuickTabFade>
      <ScreenComponent {...props} />
    </QuickTabFade>
  );
  FadedTabScreen.displayName = displayName;
  return FadedTabScreen;
};

const HabitsTabScreen = createFadedTabScreen(HabitsScreen, 'HabitsTabScreen');
const TasksTabScreen = createFadedTabScreen(TasksScreen, 'TasksTabScreen');
const HealthTabScreen = createFadedTabScreen(HealthScreen, 'HealthTabScreen');
const RoutineTabScreen = createFadedTabScreen(RoutineScreen, 'RoutineTabScreen');
const FinanceTabScreen = createFadedTabScreen(FinanceScreen, 'FinanceTabScreen');

const TabBarIcon = ({ name, type, focused, color, size }) => {
  if (type === 'ionicons') {
    return <Ionicons name={name} size={size} color={color} />;
  } else if (type === 'feather') {
    return <Feather name={name} size={size} color={color} />;
  } else if (type === 'material') {
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  }
  return <Ionicons name={name} size={size} color={color} />;
};

const CustomTabBar = ({ state, descriptors, navigation, styles, onTabBarLayout }) => {
  const insets = useSafeAreaInsets();
  const gapIndex = Math.floor((state.routes.length - 1) / 2);

  return (
    <View
      style={[
        styles.tabBarContainer,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
      ]}
    >
      <View style={styles.tabBar} onLayout={onTabBarLayout}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName;
          let iconType = 'ionicons';
          let iconColor = isFocused ? colors.primary : colors.navInactive;

          switch (route.name) {
            case 'Home':
              iconName = isFocused ? 'home' : 'home-outline';
              break;
            case 'Habits':
              iconName = 'target';
              iconType = 'feather';
              iconColor = isFocused ? colors.habits : colors.navInactive;
              break;
            case 'Tasks':
              iconName = 'edit-3';
              iconType = 'feather';
              iconColor = isFocused ? colors.tasks : colors.navInactive;
              break;
            case 'Health':
              iconName = isFocused ? 'heart' : 'heart-outline';
              iconColor = isFocused ? colors.health : colors.navInactive;
              break;
            case 'Routine':
              iconName = 'history';
              iconType = 'material';
              iconColor = isFocused ? colors.routine : colors.navInactive;
              break;
            case 'Finance':
              iconName = 'trending-up';
              iconType = 'feather';
              iconColor = isFocused ? colors.finance : colors.navInactive;
              break;
            default:
              iconName = 'circle';
          }

          return (
            <React.Fragment key={route.key}>
              <TouchableOpacity
                onPress={onPress}
                style={[
                  styles.tabItem,
                  isFocused && styles.tabItemFocused,
                ]}
                activeOpacity={0.9}
              >
                <View
                  style={[
                    styles.tabIconContainer,
                    isFocused && { backgroundColor: `${iconColor}15` },
                  ]}
                >
                  <TabBarIcon
                    name={iconName}
                    type={iconType}
                    focused={isFocused}
                    color={iconColor}
                    size={24}
                  />
                </View>
              </TouchableOpacity>
              {index === gapIndex && (
                <View style={styles.chatSpacer} pointerEvents="none" />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const TabNavigator = ({ styles, onTabBarLayout }) => {
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <CustomTabBar {...props} styles={styles} onTabBarLayout={onTabBarLayout} />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Habits" component={HabitsTabScreen} />
      <Tab.Screen name="Tasks" component={TasksTabScreen} />
      <Tab.Screen name="Health" component={HealthTabScreen} />
      <Tab.Screen name="Routine" component={RoutineTabScreen} />
      <Tab.Screen name="Finance" component={FinanceTabScreen} />
    </Tab.Navigator>
  );
};

const MainWithChatButton = ({
  styles,
  isPremium,
  showTutorial,
  onDismissTutorial,
  currentStreakIncreaseNotice,
  onDismissCurrentStreakNotice,
  showNotificationPrompt,
  onCloseNotificationPrompt,
  onEnableNotificationPrompt,
  onDontAskAgainNotificationPrompt,
  tabBarLayout,
  onTabBarLayout,
  themeColors,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBottomPadding = (insets.bottom || 0) + 12;

  const handleChatPress = () => {
    if (isPremium) {
      navigation.navigate('Chat');
      return;
    }
    navigation.navigate('Paywall', { source: 'chat' });
  };

  return (
    <View style={{ flex: 1 }}>
      <TabNavigator styles={styles} onTabBarLayout={onTabBarLayout} />
      <StreakIncreaseToast
        notice={currentStreakIncreaseNotice}
        onHide={onDismissCurrentStreakNotice}
      />
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleChatPress}
        style={[styles.chatButton, { bottom: tabBottomPadding }]}
      >
        <Ionicons name="sparkles" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <AppTutorialOverlay
        visible={showTutorial}
        onDismiss={onDismissTutorial}
        bottomPadding={tabBottomPadding}
        chatButtonBottom={tabBottomPadding}
        chatButtonSize={CHAT_BUTTON_SIZE}
        chatButtonLift={CHAT_BUTTON_LIFT}
        layoutConfig={{
          containerPaddingHorizontal: TAB_BAR_CONTAINER_PADDING_HORIZONTAL,
          tabBarPaddingHorizontal: TAB_BAR_PADDING_HORIZONTAL,
          chatSpacerWidth: CHAT_BUTTON_SPACER,
          tabCount: 6,
          chatGapAfterIndex: 2,
          tabBarLayout,
          iconCenterOffsetFromBottom: TAB_ICON_CENTER_OFFSET_FROM_BOTTOM,
        }}
        themeColors={themeColors}
      />
      <NotificationPermissionOverlay
        visible={showNotificationPrompt}
        onClose={onCloseNotificationPrompt}
        onEnable={onEnableNotificationPrompt}
        onDontAskAgain={onDontAskAgainNotificationPrompt}
        themeColors={themeColors}
      />
    </View>
  );
};

const Navigation = () => {
  const {
    isLoading,
    authUser,
    isMfaLoading,
    isMfaChallengeRequired,
    hasOnboarded,
    themeColors,
    profile,
    profileLoaded,
    isPremiumUser,
    isPremium,
    completeAppTutorial,
    currentStreakIncreaseNotice,
    dismissCurrentStreakIncreaseNotice,
    userSettings,
    userSettingsLoaded,
    hasNotificationPermission,
    hasNotificationPermissionChecked,
    requestNotificationPermission,
    dismissNotificationPermissionPrompt,
  } = useApp();
  const [showAppTutorial, setShowAppTutorial] = React.useState(false);
  const [hideNotificationPromptForSession, setHideNotificationPromptForSession] =
    React.useState(false);
  const [tabBarLayout, setTabBarLayout] = React.useState(null);
  const styles = React.useMemo(() => createStyles(), [themeColors]);
  const isPremiumActive = Boolean(
    isPremiumUser ||
      isPremium ||
      profile?.isPremium ||
      profile?.plan === 'premium' ||
      profile?.plan === 'pro' ||
      profile?.plan === 'paid'
  );
  const hasCompletedAppTutorial = !!profile?.hasCompletedAppTutorial;

  React.useEffect(() => {
    if (!authUser?.id || !profileLoaded) {
      setShowAppTutorial(false);
      return;
    }
    setShowAppTutorial(!hasCompletedAppTutorial);
  }, [authUser?.id, profileLoaded, hasCompletedAppTutorial]);

  React.useEffect(() => {
    setHideNotificationPromptForSession(false);
  }, [authUser?.id]);

  const handleDismissTutorial = React.useCallback(() => {
    setShowAppTutorial(false);
    completeAppTutorial();
  }, [completeAppTutorial]);

  const handleCloseNotificationPrompt = React.useCallback(() => {
    setHideNotificationPromptForSession(true);
  }, []);

  const handleEnableNotificationPrompt = React.useCallback(async () => {
    const granted = await requestNotificationPermission({
      enableNotificationsSetting: true,
    });
    if (granted) {
      setHideNotificationPromptForSession(false);
    }
  }, [requestNotificationPermission]);

  const handleDontAskAgainNotificationPrompt = React.useCallback(async () => {
    setHideNotificationPromptForSession(true);
    await dismissNotificationPermissionPrompt();
  }, [dismissNotificationPermissionPrompt]);

  const shouldShowNotificationPrompt = Boolean(
    authUser?.id &&
      profileLoaded &&
      userSettingsLoaded &&
      hasNotificationPermissionChecked &&
      !hasNotificationPermission &&
      !userSettings?.notificationPromptDismissedAt &&
      !hideNotificationPromptForSession &&
      !showAppTutorial
  );

  const navTheme = React.useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: themeColors.background,
      },
    }),
    [themeColors]
  );

  if (isLoading || (authUser && isMfaLoading)) {
    return (
      <NavigationContainer theme={navTheme}>
        <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {authUser ? (
        isMfaChallengeRequired ? (
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: themeColors.background },
            }}
          >
            <Stack.Screen name="MfaChallenge" component={MfaChallengeScreen} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: themeColors.background },
            }}
          >
            <Stack.Screen name="Main">
              {() => (
                <MainWithChatButton
                  styles={styles}
                  isPremium={isPremiumActive}
                  showTutorial={showAppTutorial}
                  onDismissTutorial={handleDismissTutorial}
                  currentStreakIncreaseNotice={currentStreakIncreaseNotice}
                  onDismissCurrentStreakNotice={dismissCurrentStreakIncreaseNotice}
                  showNotificationPrompt={shouldShowNotificationPrompt}
                  onCloseNotificationPrompt={handleCloseNotificationPrompt}
                  onEnableNotificationPrompt={handleEnableNotificationPrompt}
                  onDontAskAgainNotificationPrompt={
                    handleDontAskAgainNotificationPrompt
                  }
                  tabBarLayout={tabBarLayout}
                  onTabBarLayout={(event) => setTabBarLayout(event?.nativeEvent?.layout || null)}
                  themeColors={themeColors}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
            <Stack.Screen name="Paywall" component={PaywallScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="DataAccount" component={DataAccountScreen} />
            <Stack.Screen name="DeleteAccountDetails" component={DeleteAccountDetailsScreen} />
            <Stack.Screen name="Currency" component={CurrencyScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="Finance" component={FinanceScreen} />
            <Stack.Screen
              name="SpendingInsights"
              component={SpendingInsightsScreen}
            />
            <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
            <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
            <Stack.Screen name="Membership" component={MembershipScreen} />
            <Stack.Screen name="Permissions" component={PermissionsScreen} />
            <Stack.Screen name="Invitations" component={InvitationsScreen} />
            <Stack.Screen
              name="BudgetGroupInsight"
              component={BudgetGroupInsightScreen}
            />
            <Stack.Screen name="Notes" component={NotesScreen} />
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} />
            <Stack.Screen name="Appearance" component={AppearanceScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
            <Stack.Screen
              name="Friends"
              component={FriendsScreen}
              options={{
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                gestureResponseDistance: FRIENDS_GESTURE_DISTANCE,
              }}
            />
            <Stack.Screen name="FriendProfile" component={FriendProfileScreen} />
            <Stack.Screen name="Groups" component={GroupsScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
            <Stack.Screen name="Insights" component={InsightsScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="FocusMode" component={FocusModeScreen} />
            <Stack.Screen name="CountdownTimer" component={CountdownTimerScreen} />
            <Stack.Screen name="WeightManager" component={WeightManagerScreen} />
            <Stack.Screen name="WeightProgress" component={WeightProgressScreen} />
            <Stack.Screen name="WeightManagerUpdatePlan" component={WeightManagerUpdatePlanScreen} />
            <Stack.Screen name="WeightJourneyHistory" component={WeightJourneyHistoryScreen} />
            <Stack.Screen
              name="WeightJourneyHistoryDetail"
              component={WeightJourneyHistoryDetailScreen}
            />
            <Stack.Screen name="Steps" component={StepsScreen} />
            <Stack.Screen name="WaterLog" component={WaterLogScreen} />
            <Stack.Screen name="SleepLog" component={SleepLogScreen} />
            <Stack.Screen name="MoodCalendar" component={MoodCalendarScreen} />
            <Stack.Screen name="Streak" component={StreakScreen} />
          </Stack.Navigator>
        )
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: themeColors.background },
          }}
        >
          {!hasOnboarded && (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )}
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen
            name="SignupFlow"
            component={SignupFlowScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const createStyles = () =>
  StyleSheet.create({
    tabBarContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: TAB_BAR_CONTAINER_PADDING_HORIZONTAL,
      paddingTop: 12,
      backgroundColor: 'transparent',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.navBackground,
      borderRadius: borderRadius.xxl,
      paddingVertical: 10,
      paddingHorizontal: TAB_BAR_PADDING_HORIZONTAL,
      ...shadows.medium,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.04)',
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    tabItemFocused: {},
    tabIconContainer: {
      width: 48,
      height: 40,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chatSpacer: {
      width: CHAT_BUTTON_SPACER,
      height: '100%',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    chatButton: {
      position: 'absolute',
      left: '50%',
      width: CHAT_BUTTON_SIZE,
      height: CHAT_BUTTON_SIZE,
      borderRadius: CHAT_BUTTON_SIZE / 2,
      backgroundColor: '#4da6ff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: colors.navBackground,
      ...shadows.medium,
      zIndex: 2,
      transform: [
        { translateX: -CHAT_BUTTON_SIZE / 2 },
        { translateY: -CHAT_BUTTON_LIFT },
      ],
    },
  });

export default Navigation;
