import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import {
  checkHealthAvailability,
  getHealthProviderDetails,
  readTodayActiveCaloriesFromHealth,
  readTodayStepsFromHealth,
} from './healthBridge';

const HEALTH_METRICS_BACKGROUND_TASK_NAME = 'pillaflow-health-metrics-background-sync';
const HEALTH_METRICS_BACKGROUND_MIN_INTERVAL_SECONDS = 15 * 60;
const HEALTH_METRICS_BACKGROUND_MIN_INTERVAL_MS =
  HEALTH_METRICS_BACKGROUND_MIN_INTERVAL_SECONDS * 1000;

const PLATFORM_HEALTH_SOURCE = 'platform_health';
const PLATFORM_HEALTH_BACKGROUND_SOURCE = 'platform_health_background';

let BackgroundFetch = null;
let TaskManager = null;

try {
  // eslint-disable-next-line global-require
  BackgroundFetch = require('expo-background-fetch');
} catch (error) {
  BackgroundFetch = null;
}

try {
  // eslint-disable-next-line global-require
  TaskManager = require('expo-task-manager');
} catch (error) {
  TaskManager = null;
}

const toLocalDateISO = (value = new Date()) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const asNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isMissingRelationError = (error, relationName = '') =>
  Boolean(
    error &&
      (error.code === '42P01' ||
        (relationName &&
          String(error.message || '').toLowerCase().includes(String(relationName).toLowerCase())))
  );

const isMissingColumnError = (error) =>
  Boolean(
    error &&
      (error.code === '42703' ||
        String(error.message || '').toLowerCase().includes('column') &&
          String(error.message || '').toLowerCase().includes('does not exist'))
  );

const isBackgroundTaskRuntimeAvailable = () =>
  Platform.OS !== 'web' && Boolean(BackgroundFetch && TaskManager);

const normalizeConnectionRow = (row = {}, providerDetails = {}) => ({
  platform: row?.platform || providerDetails.platform || Platform.OS,
  provider: row?.provider || providerDetails.provider || (Platform.OS === 'ios' ? 'apple_health' : 'health_connect'),
  isConnected: Boolean(row?.is_connected ?? row?.isConnected),
  canReadSteps: Boolean(row?.can_read_steps ?? row?.canReadSteps),
  canReadActiveCalories: Boolean(row?.can_read_active_calories ?? row?.canReadActiveCalories),
  canWriteNutrition: Boolean(row?.can_write_nutrition ?? row?.canWriteNutrition),
  syncNutritionToHealth: Boolean(row?.sync_nutrition_to_health ?? row?.syncNutritionToHealth),
  lastSyncedDate: row?.last_synced_date ?? row?.lastSyncedDate ?? null,
  lastSyncedAt: row?.last_synced_at ?? row?.lastSyncedAt ?? null,
});

const shouldSkipRecentSync = (lastSyncedAtValue, force = false) => {
  if (force) return false;
  if (!lastSyncedAtValue) return false;
  const lastSyncedAtMs = new Date(lastSyncedAtValue).getTime();
  if (!Number.isFinite(lastSyncedAtMs)) return false;
  const elapsedMs = Date.now() - lastSyncedAtMs;
  return elapsedMs >= 0 && elapsedMs < HEALTH_METRICS_BACKGROUND_MIN_INTERVAL_MS;
};

const isBackgroundFetchDenied = (status) => {
  if (!BackgroundFetch?.BackgroundFetchStatus) return false;
  return (
    status === BackgroundFetch.BackgroundFetchStatus.Denied ||
    status === BackgroundFetch.BackgroundFetchStatus.Restricted
  );
};

const getErrorText = (error) =>
  `${error?.message || ''} ${error?.cause?.message || ''} ${error?.stack || ''}`.toLowerCase();

const isBackgroundFetchNotConfiguredError = (error) => {
  const message = getErrorText(error);
  return (
    message.includes('background fetch has not been configured') ||
    message.includes('add `fetch` to `uibackgroundmodes`') ||
    message.includes('uibackgroundmodes')
  );
};

const isBackgroundFetchUnavailableInExpoGoError = (error) => {
  const message = getErrorText(error);
  return (
    message.includes('expo go') &&
    (message.includes('background fetch') || message.includes('registertaskasync'))
  );
};

export const syncHealthMetricsSnapshotForUser = async ({
  userId,
  force = false,
  source = PLATFORM_HEALTH_SOURCE,
  now = new Date(),
} = {}) => {
  if (!userId) {
    return { synced: false, reason: 'not_authenticated' };
  }

  const providerDetails = getHealthProviderDetails();
  const todayISO = toLocalDateISO(now);
  if (!todayISO) {
    return { synced: false, reason: 'invalid_date' };
  }

  const { data: rawConnection, error: connectionError } = await supabase
    .from('health_connections')
    .select(
      'platform, provider, is_connected, can_read_steps, can_read_active_calories, can_write_nutrition, sync_nutrition_to_health, last_synced_date, last_synced_at'
    )
    .eq('user_id', userId)
    .eq('platform', providerDetails.platform)
    .maybeSingle();

  if (connectionError) {
    if (
      isMissingRelationError(connectionError, 'health_connections') ||
      isMissingColumnError(connectionError)
    ) {
      return { synced: false, reason: 'health_connection_storage_unavailable' };
    }
    console.log('Error reading health connection for background sync:', connectionError);
    return { synced: false, reason: 'health_connection_read_failed' };
  }

  const connection = normalizeConnectionRow(rawConnection, providerDetails);
  if (!connection.isConnected) {
    return { synced: false, reason: 'health_not_connected' };
  }

  if (shouldSkipRecentSync(connection.lastSyncedAt, force)) {
    return { synced: false, reason: 'synced_recently', date: todayISO };
  }

  const availability = await checkHealthAvailability();
  if (!availability?.available) {
    return { synced: false, reason: availability?.reason || 'health_not_available' };
  }

  const [stepsResult, activeCaloriesResult] = await Promise.all([
    readTodayStepsFromHealth(now),
    readTodayActiveCaloriesFromHealth(now),
  ]);

  const stepsValue = Math.max(0, Math.round(asNumber(stepsResult?.steps, 0) || 0));
  const activeCaloriesValue = asNumber(activeCaloriesResult?.activeCalories, null);
  const nowISO = new Date().toISOString();

  const { error: metricsError } = await supabase
    .from('health_daily_metrics')
    .upsert(
      {
        user_id: userId,
        metric_date: todayISO,
        steps: stepsValue,
        active_calories: activeCaloriesValue,
        source: source || PLATFORM_HEALTH_SOURCE,
        updated_at: nowISO,
      },
      { onConflict: 'user_id,metric_date' }
    );

  if (metricsError) {
    if (
      isMissingRelationError(metricsError, 'health_daily_metrics') ||
      isMissingColumnError(metricsError)
    ) {
      return { synced: false, reason: 'health_daily_metrics_storage_unavailable' };
    }
    console.log('Error saving background health daily metric:', metricsError);
    return { synced: false, reason: 'health_daily_metrics_save_failed' };
  }

  const { error: connectionUpsertError } = await supabase
    .from('health_connections')
    .upsert(
      {
        user_id: userId,
        platform: connection.platform,
        provider: connection.provider,
        is_connected: true,
        can_read_steps: connection.canReadSteps || Boolean(stepsResult?.supported),
        can_read_active_calories:
          connection.canReadActiveCalories || Boolean(activeCaloriesResult?.supported),
        can_write_nutrition: connection.canWriteNutrition,
        sync_nutrition_to_health: connection.syncNutritionToHealth,
        last_synced_date: todayISO,
        last_synced_at: nowISO,
        updated_at: nowISO,
      },
      { onConflict: 'user_id,platform' }
    );

  if (
    connectionUpsertError &&
    !isMissingRelationError(connectionUpsertError, 'health_connections') &&
    !isMissingColumnError(connectionUpsertError)
  ) {
    console.log('Error saving health connection background sync state:', connectionUpsertError);
  }

  return {
    synced: true,
    date: todayISO,
    steps: stepsValue,
    activeCalories: activeCaloriesValue,
  };
};

export const registerHealthMetricsBackgroundTask = async () => {
  if (!isBackgroundTaskRuntimeAvailable()) {
    return { registered: false, reason: 'background_runtime_unavailable' };
  }

  try {
    const isTaskManagerAvailable =
      typeof TaskManager.isAvailableAsync === 'function'
        ? await TaskManager.isAvailableAsync()
        : true;
    if (!isTaskManagerAvailable) {
      return { registered: false, reason: 'task_manager_unavailable' };
    }

    const status = await BackgroundFetch.getStatusAsync();
    if (isBackgroundFetchDenied(status)) {
      return { registered: false, reason: 'background_fetch_denied' };
    }

    const alreadyRegistered =
      typeof TaskManager.isTaskRegisteredAsync === 'function'
        ? await TaskManager.isTaskRegisteredAsync(HEALTH_METRICS_BACKGROUND_TASK_NAME)
        : false;

    if (!alreadyRegistered) {
      await BackgroundFetch.registerTaskAsync(HEALTH_METRICS_BACKGROUND_TASK_NAME, {
        minimumInterval: HEALTH_METRICS_BACKGROUND_MIN_INTERVAL_SECONDS,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }

    return { registered: true };
  } catch (error) {
    if (isBackgroundFetchNotConfiguredError(error)) {
      return { registered: false, reason: 'background_fetch_not_configured' };
    }
    if (isBackgroundFetchUnavailableInExpoGoError(error)) {
      return { registered: false, reason: 'background_fetch_unavailable_in_expo_go' };
    }
    console.log('Error registering health background sync task:', error);
    return {
      registered: false,
      reason: error?.message || 'background_fetch_register_failed',
    };
  }
};

export const unregisterHealthMetricsBackgroundTask = async () => {
  if (!isBackgroundTaskRuntimeAvailable()) return;

  try {
    const isRegistered =
      typeof TaskManager.isTaskRegisteredAsync === 'function'
        ? await TaskManager.isTaskRegisteredAsync(HEALTH_METRICS_BACKGROUND_TASK_NAME)
        : false;
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(HEALTH_METRICS_BACKGROUND_TASK_NAME);
    }
  } catch (error) {
    console.log('Error unregistering health background sync task:', error);
  }
};

if (isBackgroundTaskRuntimeAvailable() && typeof TaskManager.defineTask === 'function') {
  const alreadyDefined =
    typeof TaskManager.isTaskDefined === 'function'
      ? TaskManager.isTaskDefined(HEALTH_METRICS_BACKGROUND_TASK_NAME)
      : false;

  if (!alreadyDefined) {
    TaskManager.defineTask(HEALTH_METRICS_BACKGROUND_TASK_NAME, async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const syncResult = await syncHealthMetricsSnapshotForUser({
          userId: user.id,
          force: false,
          source: PLATFORM_HEALTH_BACKGROUND_SOURCE,
        });

        if (syncResult?.synced) {
          return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        const noDataReasons = new Set([
          'not_authenticated',
          'health_not_connected',
          'health_not_available',
          'synced_recently',
          'health_connection_storage_unavailable',
          'health_daily_metrics_storage_unavailable',
        ]);

        if (noDataReasons.has(syncResult?.reason)) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        return BackgroundFetch.BackgroundFetchResult.Failed;
      } catch (error) {
        console.log('Error running health background sync task:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }
}

export {
  HEALTH_METRICS_BACKGROUND_TASK_NAME,
  HEALTH_METRICS_BACKGROUND_MIN_INTERVAL_SECONDS,
};
