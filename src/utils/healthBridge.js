import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

const HEALTH_LINK_MODULE = 'react-native-health-link';
const IOS_HEALTH_KIT_MODULE = 'react-native-health';
const ANDROID_HEALTH_CONNECT_MODULE = 'react-native-health-connect';

const DEFAULT_BRIDGE_TIMEOUT_MS = 12000;
const AVAILABILITY_TIMEOUT_MS = 8000;
const PERMISSION_TIMEOUT_MS = 45000;
const READ_TIMEOUT_MS = 5000;
const WRITE_TIMEOUT_MS = 5000;

const ANDROID_RECORD_STEPS = 'Steps';
const ANDROID_RECORD_ACTIVE_CALORIES = 'ActiveCaloriesBurned';
const ANDROID_RECORD_NUTRITION = 'Nutrition';
const HEALTH_KIT_METHOD_HINTS = ['initHealthKit', 'isAvailable', 'getDailyStepCountSamples', 'saveFood'];

let cachedHealthLinkModule = null;
let didTryLoadHealthLinkModule = false;
let cachedHealthKitModule = null;
let didTryLoadHealthKitModule = false;
let cachedHealthConnectModule = null;
let didTryLoadHealthConnectModule = false;

const hasHealthKitMethods = (moduleRef) =>
  Boolean(
    moduleRef &&
      typeof moduleRef === 'object' &&
      HEALTH_KIT_METHOD_HINTS.some((methodName) => typeof moduleRef?.[methodName] === 'function')
  );

const getHealthKitModuleFromNativeRuntime = () => {
  const candidates = [
    NativeModules?.AppleHealthKit,
    NativeModules?.RCTAppleHealthKit,
    NativeModules?.RNAppleHealthKit,
  ];

  const turboModuleNames = ['AppleHealthKit', 'RCTAppleHealthKit', 'RNAppleHealthKit'];
  if (TurboModuleRegistry && typeof TurboModuleRegistry.get === 'function') {
    for (const moduleName of turboModuleNames) {
      try {
        candidates.push(TurboModuleRegistry.get(moduleName));
      } catch (error) {
        // Ignore missing turbo module registrations.
      }
    }
  }

  return candidates.find((candidate) => hasHealthKitMethods(candidate)) || null;
};

const loadHealthLinkModule = () => {
  if (didTryLoadHealthLinkModule) {
    return cachedHealthLinkModule;
  }

  didTryLoadHealthLinkModule = true;
  try {
    // Dynamic require keeps app bootable if optional native dependency is missing.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    cachedHealthLinkModule = require(HEALTH_LINK_MODULE);
  } catch (err) {
    cachedHealthLinkModule = null;
  }
  return cachedHealthLinkModule;
};

const loadHealthKitModule = () => {
  if (didTryLoadHealthKitModule) {
    if (!hasHealthKitMethods(cachedHealthKitModule)) {
      const runtimeModule = getHealthKitModuleFromNativeRuntime();
      if (runtimeModule) {
        if (cachedHealthKitModule?.Constants && !runtimeModule.Constants) {
          runtimeModule.Constants = cachedHealthKitModule.Constants;
        }
        cachedHealthKitModule = runtimeModule;
      }
    }
    return cachedHealthKitModule;
  }

  const normalizeHealthKitModule = (moduleRef) => {
    if (!moduleRef || typeof moduleRef !== 'object') return moduleRef;

    const candidates = [
      moduleRef,
      moduleRef.default,
      moduleRef.HealthKit,
      moduleRef.AppleHealthKit,
    ];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      if (!hasHealthKitMethods(candidate)) continue;
      if (moduleRef?.Constants && !candidate.Constants) {
        candidate.Constants = moduleRef.Constants;
      }
      return candidate;
    }

    return moduleRef;
  };

  didTryLoadHealthKitModule = true;
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    cachedHealthKitModule = normalizeHealthKitModule(require(IOS_HEALTH_KIT_MODULE));
  } catch (err) {
    cachedHealthKitModule = null;
  }

  if (!hasHealthKitMethods(cachedHealthKitModule)) {
    const runtimeModule = getHealthKitModuleFromNativeRuntime();
    if (runtimeModule) {
      if (cachedHealthKitModule?.Constants && !runtimeModule.Constants) {
        runtimeModule.Constants = cachedHealthKitModule.Constants;
      }
      cachedHealthKitModule = runtimeModule;
    }
  }

  return cachedHealthKitModule;
};

const loadHealthConnectModule = () => {
  if (didTryLoadHealthConnectModule) {
    return cachedHealthConnectModule;
  }

  didTryLoadHealthConnectModule = true;
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    cachedHealthConnectModule = require(ANDROID_HEALTH_CONNECT_MODULE);
  } catch (err) {
    cachedHealthConnectModule = null;
  }
  return cachedHealthConnectModule;
};

const pickEnumValue = (enumObj, candidates = []) => {
  if (!enumObj || typeof enumObj !== 'object') return null;
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(enumObj, candidate)) {
      return enumObj[candidate];
    }
  }
  return null;
};

const asFiniteNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeErrorMessage = (error, fallback = 'unknown_error') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== '{}' ? serialized : fallback;
  } catch (serializationError) {
    return fallback;
  }
};

const toIsoString = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const startOfLocalDay = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const endOfLocalDay = (value = new Date()) => {
  const start = startOfLocalDay(value);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return end;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.samples)) return value.samples;
  return [];
};

const withTimeout = (promiseLike, timeoutMs, timeoutReason) => {
  const resolvedTimeout =
    Math.max(1, asFiniteNumber(timeoutMs, DEFAULT_BRIDGE_TIMEOUT_MS) || DEFAULT_BRIDGE_TIMEOUT_MS);
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutReason || 'health_bridge_timeout'));
    }, resolvedTimeout);

    Promise.resolve(promiseLike)
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

const isTimeoutReason = (reason) =>
  typeof reason === 'string' && reason.toLowerCase().includes('timeout');

const invokeHealthKitMethod = async (
  methodName,
  options,
  { timeoutMs = READ_TIMEOUT_MS, timeoutReason = 'healthkit_timeout' } = {}
) => {
  const healthKitModule = loadHealthKitModule();
  const method = healthKitModule?.[methodName];
  if (!healthKitModule || typeof method !== 'function') {
    throw new Error(`healthkit_method_missing:${methodName}`);
  }

  const args = options === undefined ? [] : [options];
  return withTimeout(
    new Promise((resolve, reject) => {
      try {
        method(...args, (error, result) => {
          if (error) {
            reject(new Error(safeErrorMessage(error, `healthkit_${methodName}_failed`)));
            return;
          }
          resolve(result);
        });
      } catch (error) {
        reject(error);
      }
    }),
    timeoutMs,
    timeoutReason
  );
};

const invokeHealthConnectMethod = async (
  methodName,
  args = [],
  { timeoutMs = READ_TIMEOUT_MS, timeoutReason = 'health_connect_timeout' } = {}
) => {
  const healthConnectModule = loadHealthConnectModule();
  const method = healthConnectModule?.[methodName];
  if (!healthConnectModule || typeof method !== 'function') {
    throw new Error(`health_connect_method_missing:${methodName}`);
  }

  return withTimeout(method(...args), timeoutMs, timeoutReason);
};

const getSampleValue = (sample = {}) => {
  const directCandidates = [
    sample?.value,
    sample?.steps,
    sample?.count,
    sample?.quantity,
    sample?.total,
    sample?.calories,
    sample?.energy,
    sample?.activeEnergyBurned,
    sample?.activeCaloriesBurned,
    sample?.kilocalories,
    sample?.kcal,
  ];

  for (const candidate of directCandidates) {
    const parsed = asFiniteNumber(candidate, null);
    if (parsed !== null) return parsed;
  }

  const nestedCandidates = [
    sample?.metadata?.value,
    sample?.metadata?.quantity,
    sample?.quantitySample?.value,
    sample?.measurement?.value,
    sample?.energy?.inKilocalories,
    sample?.energy?.value,
  ];

  for (const candidate of nestedCandidates) {
    const parsed = asFiniteNumber(candidate, null);
    if (parsed !== null) return parsed;
  }

  return null;
};

const getActiveCaloriesSampleValue = (sample = {}) => {
  const direct = asFiniteNumber(sample?.value, null);
  if (direct !== null) return Math.max(0, direct);

  const inKilocalories = asFiniteNumber(sample?.energy?.inKilocalories, null);
  if (inKilocalories !== null) return Math.max(0, inKilocalories);

  const inCalories = asFiniteNumber(sample?.energy?.inCalories, null);
  if (inCalories !== null) return Math.max(0, inCalories / 1000);

  const energyValue = asFiniteNumber(sample?.energy?.value, null);
  if (energyValue !== null) {
    const unit = String(sample?.energy?.unit || '').toLowerCase();
    if (unit.includes('kilocalorie')) return Math.max(0, energyValue);
    if (unit.includes('calorie')) return Math.max(0, energyValue / 1000);
    if (unit.includes('kilojoule')) return Math.max(0, energyValue / 4.184);
    if (unit.includes('joule')) return Math.max(0, energyValue / 4184);
    return Math.max(0, energyValue);
  }

  const fallback = asFiniteNumber(getSampleValue(sample), 0) || 0;
  return Math.max(0, fallback);
};

const getDateRange = (dateValue = new Date()) => ({
  startDate: toIsoString(startOfLocalDay(dateValue)),
  endDate: toIsoString(endOfLocalDay(dateValue)),
});

const getProviderFromPlatform = () =>
  Platform.OS === 'ios' ? 'apple_health' : 'health_connect';

const getProviderLabelFromPlatform = () =>
  Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

const parseAvailabilityResult = (result) => {
  if (typeof result === 'boolean') {
    return {
      available: result,
      reason: result ? null : 'platform_health_not_available',
    };
  }

  if (result && typeof result === 'object') {
    const available = Boolean(result.available ?? result.isAvailable ?? result.success ?? false);
    return {
      available,
      reason: available ? null : result.reason || result.error || 'platform_health_not_available',
    };
  }

  return {
    available: false,
    reason: 'platform_health_not_available',
  };
};

const resolveIosPermissionSchema = () => {
  const healthKitModule = loadHealthKitModule();
  const permissionsEnum = healthKitModule?.Constants?.Permissions || {};

  return {
    steps: pickEnumValue(permissionsEnum, ['Steps', 'StepCount', 'Step']),
    activeCalories: pickEnumValue(permissionsEnum, [
      'ActiveEnergyBurned',
      'ActiveCaloriesBurned',
      'ActiveEnergy',
    ]),
    nutritionEnergy: pickEnumValue(permissionsEnum, [
      'EnergyConsumed',
      'DietaryEnergyConsumed',
      'Calories',
    ]),
    nutritionProtein: pickEnumValue(permissionsEnum, ['Protein', 'DietaryProtein']),
    nutritionCarbs: pickEnumValue(permissionsEnum, ['Carbohydrates', 'DietaryCarbohydrates']),
    nutritionFat: pickEnumValue(permissionsEnum, ['FatTotal', 'DietaryFatTotal']),
  };
};

const resolveHealthLinkSchema = () => {
  const moduleRef = loadHealthLinkModule();
  const permissionsEnum = moduleRef?.HealthLinkPermissions || {};
  const dataTypeEnum = moduleRef?.HealthLinkDataType || {};

  const stepsPermission = pickEnumValue(permissionsEnum, [
    'Steps',
    'StepCount',
    'Step',
    'WalkingStepCount',
  ]);
  const activeCaloriesPermission = pickEnumValue(permissionsEnum, [
    'ActiveEnergyBurned',
    'ActiveCaloriesBurned',
    'ActiveEnergy',
  ]);
  const nutritionPermission = pickEnumValue(permissionsEnum, [
    'Nutrition',
    'DietaryEnergyConsumed',
    'DietaryProtein',
    'DietaryCarbohydrates',
    'DietaryFatTotal',
    'Calories',
  ]);

  const stepsDataType = pickEnumValue(dataTypeEnum, [
    'Steps',
    'StepCount',
    'Step',
    'WalkingStepCount',
  ]);
  const activeCaloriesDataType = pickEnumValue(dataTypeEnum, [
    'ActiveEnergyBurned',
    'ActiveCaloriesBurned',
    'ActiveEnergy',
  ]);
  const nutritionDataTypes = {
    calories: pickEnumValue(dataTypeEnum, [
      'Nutrition',
      'DietaryEnergyConsumed',
      'Calories',
      'CalorieIntake',
    ]),
    protein: pickEnumValue(dataTypeEnum, ['DietaryProtein', 'Protein']),
    carbs: pickEnumValue(dataTypeEnum, ['DietaryCarbohydrates', 'Carbohydrates', 'Carbs']),
    fat: pickEnumValue(dataTypeEnum, ['DietaryFatTotal', 'FatTotal', 'Fat']),
  };

  return {
    moduleRef,
    permissions: {
      steps: stepsPermission,
      activeCalories: activeCaloriesPermission,
      nutrition: nutritionPermission,
    },
    dataTypes: {
      steps: stepsDataType,
      activeCalories: activeCaloriesDataType,
      nutrition: nutritionDataTypes,
    },
  };
};

const getHealthConnectAvailabilityReason = (status, statusEnum = {}) => {
  const numericStatus = asFiniteNumber(status, null);
  const normalizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : null;

  const statusUnavailable =
    numericStatus === asFiniteNumber(statusEnum.SDK_UNAVAILABLE, 1) ||
    normalizedStatus === 'SDK_UNAVAILABLE';
  if (statusUnavailable) {
    return 'health_connect_not_installed';
  }

  const statusNeedsUpdate =
    numericStatus ===
      asFiniteNumber(statusEnum.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED, 2) ||
    normalizedStatus === 'SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED';
  if (statusNeedsUpdate) {
    return 'health_connect_provider_update_required';
  }

  return 'health_connect_not_available';
};

const hasAndroidPermissionGranted = (grantedPermissions, accessType, recordType) => {
  const normalizedAccess = String(accessType || '').toLowerCase();
  const normalizedRecord = String(recordType || '').toLowerCase();

  return (grantedPermissions || []).some((entry) => {
    if (!entry) return false;
    if (typeof entry === 'string') {
      const normalized = entry.toLowerCase();
      return normalized.includes(normalizedAccess) && normalized.includes(normalizedRecord);
    }

    const entryAccess = String(entry?.accessType || '').toLowerCase();
    const entryRecord = String(entry?.recordType || '').toLowerCase();
    return entryAccess === normalizedAccess && entryRecord === normalizedRecord;
  });
};

const checkIosHealthAvailabilityDirect = async () => {
  if (Platform.OS !== 'ios') return null;

  const healthKitModule = loadHealthKitModule();
  if (!healthKitModule) {
    return {
      available: false,
      reason: 'ios_healthkit_module_missing',
    };
  }

  if (typeof healthKitModule.isAvailable !== 'function') {
    // Some builds expose initHealthKit but omit isAvailable; let the permission request decide.
    if (typeof healthKitModule.initHealthKit === 'function') {
      return { available: true, reason: null };
    }
    return {
      available: false,
      reason: 'ios_healthkit_is_available_missing',
    };
  }

  try {
    const result = await invokeHealthKitMethod('isAvailable', undefined, {
      timeoutMs: AVAILABILITY_TIMEOUT_MS,
      timeoutReason: 'ios_health_availability_timeout',
    });

    return {
      available: Boolean(result),
      reason: result ? null : 'platform_health_not_available',
    };
  } catch (error) {
    const reason = safeErrorMessage(error, 'platform_health_not_available');
    if (isTimeoutReason(reason)) {
      // Some builds never resolve isAvailable callback; continue and let permission request decide.
      return { available: true, reason: null };
    }
    return {
      available: false,
      reason,
    };
  }
};

const checkAndroidHealthAvailabilityDirect = async () => {
  if (Platform.OS !== 'android') return null;

  const healthConnectModule = loadHealthConnectModule();
  if (!healthConnectModule) {
    return {
      available: false,
      reason: 'health_connect_module_missing',
    };
  }

  if (typeof healthConnectModule.getSdkStatus !== 'function') {
    return {
      available: false,
      reason: 'health_connect_get_sdk_status_missing',
    };
  }

  try {
    const status = await invokeHealthConnectMethod('getSdkStatus', [], {
      timeoutMs: AVAILABILITY_TIMEOUT_MS,
      timeoutReason: 'android_health_availability_timeout',
    });
    const statusEnum = healthConnectModule.SdkAvailabilityStatus || {};
    const availableStatus = asFiniteNumber(statusEnum.SDK_AVAILABLE, 3);
    const isAvailable =
      asFiniteNumber(status, null) === availableStatus ||
      (typeof status === 'string' && status.trim().toUpperCase() === 'SDK_AVAILABLE');

    if (isAvailable) {
      return { available: true, reason: null };
    }

    return {
      available: false,
      reason: getHealthConnectAvailabilityReason(status, statusEnum),
    };
  } catch (error) {
    return {
      available: false,
      reason: safeErrorMessage(error, 'health_connect_not_available'),
    };
  }
};

const checkHealthAvailabilityViaHealthLink = async () => {
  const moduleRef = loadHealthLinkModule();
  if (!moduleRef) {
    return {
      available: false,
      reason: 'health_link_module_missing',
    };
  }

  if (typeof moduleRef.isAvailable !== 'function') {
    return {
      available: false,
      reason: 'health_link_is_available_missing',
    };
  }

  try {
    const availabilityResult = await withTimeout(
      moduleRef.isAvailable(),
      AVAILABILITY_TIMEOUT_MS,
      'health_availability_timeout'
    );
    return parseAvailabilityResult(availabilityResult);
  } catch (error) {
    return {
      available: false,
      reason: safeErrorMessage(error, 'platform_health_not_available'),
    };
  }
};

const requestHealthPermissionsViaHealthLink = async ({ includeNutritionWrite = true } = {}) => {
  const {
    moduleRef,
    permissions: permissionSchema,
    dataTypes: dataTypeSchema,
  } = resolveHealthLinkSchema();

  if (!moduleRef) {
    return {
      granted: false,
      reason: 'health_link_module_missing',
      capabilities: {
        canReadSteps: false,
        canReadActiveCalories: false,
        canWriteNutrition: false,
      },
    };
  }

  if (typeof moduleRef.initializeHealth !== 'function') {
    return {
      granted: false,
      reason: 'health_link_initialize_missing',
      capabilities: {
        canReadSteps: false,
        canReadActiveCalories: false,
        canWriteNutrition: false,
      },
    };
  }

  const readPermissions = [];
  if (permissionSchema.steps) readPermissions.push(permissionSchema.steps);
  if (permissionSchema.activeCalories) readPermissions.push(permissionSchema.activeCalories);

  const writePermissions = [];
  if (includeNutritionWrite && permissionSchema.nutrition) {
    writePermissions.push(permissionSchema.nutrition);
  }

  const requestedPermissionCount = readPermissions.length + writePermissions.length;
  if (!requestedPermissionCount) {
    return {
      granted: false,
      reason: 'health_permissions_not_supported',
      capabilities: {
        canReadSteps: Boolean(dataTypeSchema.steps),
        canReadActiveCalories: Boolean(dataTypeSchema.activeCalories),
        canWriteNutrition: false,
      },
      metadata: {
        readPermissionsRequested: 0,
        writePermissionsRequested: 0,
      },
    };
  }

  try {
    const initResult = await withTimeout(
      moduleRef.initializeHealth({
        read: readPermissions,
        write: writePermissions,
      }),
      PERMISSION_TIMEOUT_MS,
      'health_permission_timeout'
    );

    const granted =
      typeof initResult === 'boolean'
        ? initResult
        : Boolean(initResult?.granted ?? initResult?.success ?? true);

    return {
      granted,
      reason: granted ? null : 'permission_denied',
      capabilities: {
        canReadSteps: Boolean(dataTypeSchema.steps),
        canReadActiveCalories: Boolean(dataTypeSchema.activeCalories),
        canWriteNutrition: Boolean(
          includeNutritionWrite &&
            (dataTypeSchema.nutrition.calories ||
              dataTypeSchema.nutrition.protein ||
              dataTypeSchema.nutrition.carbs ||
              dataTypeSchema.nutrition.fat)
        ),
      },
      metadata: {
        readPermissionsRequested: readPermissions.length,
        writePermissionsRequested: writePermissions.length,
      },
    };
  } catch (error) {
    return {
      granted: false,
      reason: safeErrorMessage(error, 'permission_request_failed'),
      capabilities: {
        canReadSteps: Boolean(dataTypeSchema.steps),
        canReadActiveCalories: Boolean(dataTypeSchema.activeCalories),
        canWriteNutrition: false,
      },
    };
  }
};

const requestIosHealthPermissionsDirect = async ({ includeNutritionWrite = true } = {}) => {
  if (Platform.OS !== 'ios') return null;

  const healthKitModule = loadHealthKitModule();
  if (!healthKitModule || typeof healthKitModule.initHealthKit !== 'function') {
    return null;
  }

  const availability = await checkIosHealthAvailabilityDirect();
  if (!availability?.available) {
    return {
      granted: false,
      reason: availability?.reason || 'platform_health_not_available',
      capabilities: {
        canReadSteps: false,
        canReadActiveCalories: false,
        canWriteNutrition: false,
      },
    };
  }

  const iosPermissions = resolveIosPermissionSchema();
  const readPermissions = [iosPermissions.steps, iosPermissions.activeCalories].filter(Boolean);
  const nutritionWritePermissions = [
    iosPermissions.nutritionEnergy,
    iosPermissions.nutritionProtein,
    iosPermissions.nutritionCarbs,
    iosPermissions.nutritionFat,
  ].filter(Boolean);
  const writePermissions = includeNutritionWrite
    ? Array.from(new Set(nutritionWritePermissions))
    : [];

  const canReadSteps = Boolean(iosPermissions.steps);
  const canReadActiveCalories = Boolean(iosPermissions.activeCalories);
  const canWriteNutritionSupported = Boolean(
    includeNutritionWrite && writePermissions.length > 0 && typeof healthKitModule.saveFood === 'function'
  );

  if (!canReadSteps || !readPermissions.length) {
    return {
      granted: false,
      reason: 'health_steps_permission_not_supported',
      capabilities: {
        canReadSteps,
        canReadActiveCalories,
        canWriteNutrition: canWriteNutritionSupported,
      },
      metadata: {
        readPermissionsRequested: readPermissions.length,
        writePermissionsRequested: writePermissions.length,
      },
    };
  }

  try {
    await invokeHealthKitMethod(
      'initHealthKit',
      {
        permissions: {
          read: readPermissions,
          write: writePermissions,
        },
      },
      {
        timeoutMs: PERMISSION_TIMEOUT_MS,
        timeoutReason: 'health_permission_timeout',
      }
    );

    return {
      granted: true,
      reason: null,
      capabilities: {
        canReadSteps,
        canReadActiveCalories,
        canWriteNutrition: canWriteNutritionSupported,
      },
      metadata: {
        readPermissionsRequested: readPermissions.length,
        writePermissionsRequested: writePermissions.length,
      },
    };
  } catch (error) {
    if (includeNutritionWrite && writePermissions.length) {
      try {
        await invokeHealthKitMethod(
          'initHealthKit',
          {
            permissions: {
              read: readPermissions,
              write: [],
            },
          },
          {
            timeoutMs: PERMISSION_TIMEOUT_MS,
            timeoutReason: 'health_permission_timeout',
          }
        );

        return {
          granted: true,
          reason: 'nutrition_permission_not_granted',
          capabilities: {
            canReadSteps,
            canReadActiveCalories,
            canWriteNutrition: false,
          },
          metadata: {
            readPermissionsRequested: readPermissions.length,
            writePermissionsRequested: writePermissions.length,
          },
        };
      } catch (fallbackError) {
        return {
          granted: false,
          reason: safeErrorMessage(fallbackError, safeErrorMessage(error, 'permission_request_failed')),
          capabilities: {
            canReadSteps,
            canReadActiveCalories,
            canWriteNutrition: false,
          },
          metadata: {
            readPermissionsRequested: readPermissions.length,
            writePermissionsRequested: writePermissions.length,
          },
        };
      }
    }

    return {
      granted: false,
      reason: safeErrorMessage(error, 'permission_request_failed'),
      capabilities: {
        canReadSteps,
        canReadActiveCalories,
        canWriteNutrition: false,
      },
      metadata: {
        readPermissionsRequested: readPermissions.length,
        writePermissionsRequested: writePermissions.length,
      },
    };
  }
};

const requestAndroidHealthPermissionsDirect = async ({ includeNutritionWrite = true } = {}) => {
  if (Platform.OS !== 'android') return null;

  const healthConnectModule = loadHealthConnectModule();
  if (
    !healthConnectModule ||
    typeof healthConnectModule.initialize !== 'function' ||
    typeof healthConnectModule.requestPermission !== 'function'
  ) {
    return null;
  }

  const availability = await checkAndroidHealthAvailabilityDirect();
  if (!availability?.available) {
    return {
      granted: false,
      reason: availability?.reason || 'health_connect_not_available',
      capabilities: {
        canReadSteps: false,
        canReadActiveCalories: false,
        canWriteNutrition: false,
      },
    };
  }

  const requestedPermissions = [
    { accessType: 'read', recordType: ANDROID_RECORD_STEPS },
    { accessType: 'read', recordType: ANDROID_RECORD_ACTIVE_CALORIES },
  ];

  if (includeNutritionWrite) {
    requestedPermissions.push({ accessType: 'write', recordType: ANDROID_RECORD_NUTRITION });
  }

  try {
    await invokeHealthConnectMethod('initialize', [], {
      timeoutMs: PERMISSION_TIMEOUT_MS,
      timeoutReason: 'health_permission_initialize_timeout',
    });

    const grantedPermissions = await invokeHealthConnectMethod(
      'requestPermission',
      [requestedPermissions],
      {
        timeoutMs: PERMISSION_TIMEOUT_MS,
        timeoutReason: 'health_permission_timeout',
      }
    );

    const canReadSteps = hasAndroidPermissionGranted(
      grantedPermissions,
      'read',
      ANDROID_RECORD_STEPS
    );
    const canReadActiveCalories = hasAndroidPermissionGranted(
      grantedPermissions,
      'read',
      ANDROID_RECORD_ACTIVE_CALORIES
    );
    const canWriteNutrition = includeNutritionWrite
      ? hasAndroidPermissionGranted(grantedPermissions, 'write', ANDROID_RECORD_NUTRITION)
      : false;

    return {
      granted: canReadSteps,
      reason: canReadSteps ? null : 'permission_denied',
      capabilities: {
        canReadSteps,
        canReadActiveCalories,
        canWriteNutrition,
      },
      metadata: {
        readPermissionsRequested: 2,
        writePermissionsRequested: includeNutritionWrite ? 1 : 0,
        grantedPermissionsCount: Array.isArray(grantedPermissions)
          ? grantedPermissions.length
          : 0,
      },
    };
  } catch (error) {
    if (includeNutritionWrite) {
      try {
        const readOnlyPermissions = [
          { accessType: 'read', recordType: ANDROID_RECORD_STEPS },
          { accessType: 'read', recordType: ANDROID_RECORD_ACTIVE_CALORIES },
        ];

        await invokeHealthConnectMethod('initialize', [], {
          timeoutMs: PERMISSION_TIMEOUT_MS,
          timeoutReason: 'health_permission_initialize_timeout',
        });

        const grantedReadOnlyPermissions = await invokeHealthConnectMethod(
          'requestPermission',
          [readOnlyPermissions],
          {
            timeoutMs: PERMISSION_TIMEOUT_MS,
            timeoutReason: 'health_permission_timeout',
          }
        );

        const canReadSteps = hasAndroidPermissionGranted(
          grantedReadOnlyPermissions,
          'read',
          ANDROID_RECORD_STEPS
        );
        const canReadActiveCalories = hasAndroidPermissionGranted(
          grantedReadOnlyPermissions,
          'read',
          ANDROID_RECORD_ACTIVE_CALORIES
        );

        return {
          granted: canReadSteps,
          reason: canReadSteps ? 'nutrition_permission_not_granted' : safeErrorMessage(error, 'permission_request_failed'),
          capabilities: {
            canReadSteps,
            canReadActiveCalories,
            canWriteNutrition: false,
          },
          metadata: {
            readPermissionsRequested: 2,
            writePermissionsRequested: 1,
            grantedPermissionsCount: Array.isArray(grantedReadOnlyPermissions)
              ? grantedReadOnlyPermissions.length
              : 0,
          },
        };
      } catch (fallbackError) {
        return {
          granted: false,
          reason: safeErrorMessage(fallbackError, safeErrorMessage(error, 'permission_request_failed')),
          capabilities: {
            canReadSteps: false,
            canReadActiveCalories: false,
            canWriteNutrition: false,
          },
        };
      }
    }

    return {
      granted: false,
      reason: safeErrorMessage(error, 'permission_request_failed'),
      capabilities: {
        canReadSteps: false,
        canReadActiveCalories: false,
        canWriteNutrition: false,
      },
    };
  }
};

const readSamplesViaHealthLink = async (dataType, dateValue = new Date()) => {
  const { moduleRef } = resolveHealthLinkSchema();
  if (!moduleRef || typeof moduleRef.read !== 'function' || !dataType) {
    return [];
  }

  const { startDate, endDate } = getDateRange(dateValue);
  const optionCandidates = [
    { startDate, endDate },
    { startTime: startDate, endTime: endDate },
    { from: startDate, to: endDate },
  ];

  for (const options of optionCandidates) {
    try {
      const result = await withTimeout(
        moduleRef.read(dataType, options),
        READ_TIMEOUT_MS,
        'health_read_timeout'
      );
      const rows = toArray(result);
      if (rows.length || result !== undefined) {
        return rows;
      }
    } catch (error) {
      if (isTimeoutReason(safeErrorMessage(error, ''))) {
        break;
      }
    }
  }

  return [];
};

const writeSampleViaHealthLink = async (dataType, payload = {}) => {
  const { moduleRef } = resolveHealthLinkSchema();
  if (!moduleRef || typeof moduleRef.write !== 'function' || !dataType) {
    return false;
  }

  const nowISO = toIsoString();
  const payloadCandidates = [
    payload,
    {
      ...payload,
      startDate: payload.startDate || payload.date || nowISO,
      endDate: payload.endDate || payload.date || nowISO,
    },
    {
      ...payload,
      date: payload.date || payload.startDate || nowISO,
    },
  ];

  for (const candidate of payloadCandidates) {
    try {
      const result = await withTimeout(
        moduleRef.write(dataType, candidate),
        WRITE_TIMEOUT_MS,
        'health_write_timeout'
      );
      if (result === false) continue;
      return true;
    } catch (error) {
      if (isTimeoutReason(safeErrorMessage(error, ''))) {
        return false;
      }
    }
  }

  return false;
};

const readTodayStepsFromIosDirect = async (dateValue = new Date()) => {
  if (Platform.OS !== 'ios') return null;

  const healthKitModule = loadHealthKitModule();
  if (!healthKitModule || typeof healthKitModule.getDailyStepCountSamples !== 'function') {
    return null;
  }

  try {
    const { startDate, endDate } = getDateRange(dateValue);
    const rows = toArray(
      await invokeHealthKitMethod(
        'getDailyStepCountSamples',
        { startDate, endDate },
        {
          timeoutMs: READ_TIMEOUT_MS,
          timeoutReason: 'health_read_timeout',
        }
      )
    );

    const steps = rows.reduce((sum, row) => {
      const value = asFiniteNumber(getSampleValue(row), 0) || 0;
      return sum + Math.max(0, value);
    }, 0);

    return {
      steps: Math.round(steps),
      supported: true,
      sampleCount: rows.length,
    };
  } catch (error) {
    return {
      steps: null,
      supported: false,
      reason: safeErrorMessage(error, 'health_read_failed'),
    };
  }
};

const readTodayStepsFromAndroidDirect = async (dateValue = new Date()) => {
  if (Platform.OS !== 'android') return null;

  const healthConnectModule = loadHealthConnectModule();
  if (!healthConnectModule || typeof healthConnectModule.readRecords !== 'function') {
    return null;
  }

  try {
    const { startDate, endDate } = getDateRange(dateValue);
    const result = await invokeHealthConnectMethod(
      'readRecords',
      [ANDROID_RECORD_STEPS, {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate,
          endTime: endDate,
        },
      }],
      {
        timeoutMs: READ_TIMEOUT_MS,
        timeoutReason: 'health_read_timeout',
      }
    );

    const rows = toArray(result?.records || result);
    const steps = rows.reduce((sum, row) => {
      const value = asFiniteNumber(row?.count, asFiniteNumber(getSampleValue(row), 0) || 0) || 0;
      return sum + Math.max(0, value);
    }, 0);

    return {
      steps: Math.round(steps),
      supported: true,
      sampleCount: rows.length,
    };
  } catch (error) {
    return {
      steps: null,
      supported: false,
      reason: safeErrorMessage(error, 'health_read_failed'),
    };
  }
};

const readTodayActiveCaloriesFromIosDirect = async (dateValue = new Date()) => {
  if (Platform.OS !== 'ios') return null;

  const healthKitModule = loadHealthKitModule();
  if (!healthKitModule || typeof healthKitModule.getActiveEnergyBurned !== 'function') {
    return null;
  }

  try {
    const { startDate, endDate } = getDateRange(dateValue);
    const rows = toArray(
      await invokeHealthKitMethod(
        'getActiveEnergyBurned',
        { startDate, endDate },
        {
          timeoutMs: READ_TIMEOUT_MS,
          timeoutReason: 'health_read_timeout',
        }
      )
    );

    const activeCalories = rows.reduce((sum, row) => sum + getActiveCaloriesSampleValue(row), 0);

    return {
      activeCalories: Math.round(activeCalories * 10) / 10,
      supported: true,
      sampleCount: rows.length,
    };
  } catch (error) {
    return {
      activeCalories: null,
      supported: false,
      reason: safeErrorMessage(error, 'health_read_failed'),
    };
  }
};

const readTodayActiveCaloriesFromAndroidDirect = async (dateValue = new Date()) => {
  if (Platform.OS !== 'android') return null;

  const healthConnectModule = loadHealthConnectModule();
  if (!healthConnectModule || typeof healthConnectModule.readRecords !== 'function') {
    return null;
  }

  try {
    const { startDate, endDate } = getDateRange(dateValue);
    const result = await invokeHealthConnectMethod(
      'readRecords',
      [ANDROID_RECORD_ACTIVE_CALORIES, {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate,
          endTime: endDate,
        },
      }],
      {
        timeoutMs: READ_TIMEOUT_MS,
        timeoutReason: 'health_read_timeout',
      }
    );

    const rows = toArray(result?.records || result);
    const activeCalories = rows.reduce((sum, row) => sum + getActiveCaloriesSampleValue(row), 0);

    return {
      activeCalories: Math.round(activeCalories * 10) / 10,
      supported: true,
      sampleCount: rows.length,
    };
  } catch (error) {
    return {
      activeCalories: null,
      supported: false,
      reason: safeErrorMessage(error, 'health_read_failed'),
    };
  }
};

const writeDailyNutritionToIosDirect = async ({
  dateISO,
  calories,
  protein,
  carbs,
  fat,
} = {}) => {
  if (Platform.OS !== 'ios') return null;

  const healthKitModule = loadHealthKitModule();
  if (!healthKitModule || typeof healthKitModule.saveFood !== 'function') {
    return null;
  }

  const targetDate = dateISO ? new Date(`${dateISO}T12:00:00`) : new Date();
  const { startDate } = getDateRange(targetDate);

  const normalized = {
    calories: Math.max(0, asFiniteNumber(calories, 0) || 0),
    protein: Math.max(0, asFiniteNumber(protein, 0) || 0),
    carbs: Math.max(0, asFiniteNumber(carbs, 0) || 0),
    fat: Math.max(0, asFiniteNumber(fat, 0) || 0),
  };

  const foodPayload = {
    foodName: 'Pillaflow nutrition totals',
    mealType: 'Snacks',
    date: startDate,
  };

  const writtenFields = [];
  const skippedFields = [];

  if (normalized.calories > 0) {
    foodPayload.energy = normalized.calories;
    writtenFields.push('calories');
  } else {
    skippedFields.push('calories');
  }

  if (normalized.protein > 0) {
    foodPayload.protein = normalized.protein;
    writtenFields.push('protein');
  } else {
    skippedFields.push('protein');
  }

  if (normalized.carbs > 0) {
    foodPayload.carbohydrates = normalized.carbs;
    writtenFields.push('carbs');
  } else {
    skippedFields.push('carbs');
  }

  if (normalized.fat > 0) {
    foodPayload.fatTotal = normalized.fat;
    writtenFields.push('fat');
  } else {
    skippedFields.push('fat');
  }

  if (!writtenFields.length) {
    return {
      written: false,
      writtenFields,
      skippedFields,
      reason: 'nutrition_totals_zero',
    };
  }

  try {
    await invokeHealthKitMethod('saveFood', foodPayload, {
      timeoutMs: WRITE_TIMEOUT_MS,
      timeoutReason: 'health_write_timeout',
    });

    return {
      written: true,
      writtenFields,
      skippedFields,
    };
  } catch (error) {
    return {
      written: false,
      writtenFields: [],
      skippedFields: ['calories', 'protein', 'carbs', 'fat'],
      reason: safeErrorMessage(error, 'health_write_failed'),
    };
  }
};

const writeDailyNutritionToAndroidDirect = async ({
  dateISO,
  calories,
  protein,
  carbs,
  fat,
} = {}) => {
  if (Platform.OS !== 'android') return null;

  const healthConnectModule = loadHealthConnectModule();
  if (!healthConnectModule || typeof healthConnectModule.insertRecords !== 'function') {
    return null;
  }

  const targetDate = dateISO ? new Date(`${dateISO}T12:00:00`) : new Date();
  const { startDate, endDate } = getDateRange(targetDate);

  const normalized = {
    calories: Math.max(0, asFiniteNumber(calories, 0) || 0),
    protein: Math.max(0, asFiniteNumber(protein, 0) || 0),
    carbs: Math.max(0, asFiniteNumber(carbs, 0) || 0),
    fat: Math.max(0, asFiniteNumber(fat, 0) || 0),
  };

  const writtenFields = [];
  const skippedFields = [];
  const mealType = healthConnectModule?.MealType?.SNACK ?? 4;

  const nutritionRecord = {
    recordType: ANDROID_RECORD_NUTRITION,
    startTime: startDate,
    endTime: endDate,
    mealType,
    name: 'Pillaflow nutrition totals',
  };

  if (normalized.calories > 0) {
    nutritionRecord.energy = { value: normalized.calories, unit: 'kilocalories' };
    writtenFields.push('calories');
  } else {
    skippedFields.push('calories');
  }

  if (normalized.protein > 0) {
    nutritionRecord.protein = { value: normalized.protein, unit: 'grams' };
    writtenFields.push('protein');
  } else {
    skippedFields.push('protein');
  }

  if (normalized.carbs > 0) {
    nutritionRecord.totalCarbohydrate = { value: normalized.carbs, unit: 'grams' };
    writtenFields.push('carbs');
  } else {
    skippedFields.push('carbs');
  }

  if (normalized.fat > 0) {
    nutritionRecord.totalFat = { value: normalized.fat, unit: 'grams' };
    writtenFields.push('fat');
  } else {
    skippedFields.push('fat');
  }

  if (!writtenFields.length) {
    return {
      written: false,
      writtenFields,
      skippedFields,
      reason: 'nutrition_totals_zero',
    };
  }

  try {
    await invokeHealthConnectMethod('insertRecords', [[nutritionRecord]], {
      timeoutMs: WRITE_TIMEOUT_MS,
      timeoutReason: 'health_write_timeout',
    });

    return {
      written: true,
      writtenFields,
      skippedFields,
    };
  } catch (error) {
    return {
      written: false,
      writtenFields: [],
      skippedFields: ['calories', 'protein', 'carbs', 'fat'],
      reason: safeErrorMessage(error, 'health_write_failed'),
    };
  }
};

export const getHealthProviderDetails = () => ({
  platform: Platform.OS,
  provider: getProviderFromPlatform(),
  label: getProviderLabelFromPlatform(),
  connectLabel: Platform.OS === 'ios' ? 'Connect Apple Health' : 'Connect Health Connect',
});

export const isHealthBridgeInstalled = () => {
  if (Platform.OS === 'ios') {
    return Boolean(loadHealthKitModule() || loadHealthLinkModule());
  }
  if (Platform.OS === 'android') {
    return Boolean(loadHealthConnectModule() || loadHealthLinkModule());
  }
  return Boolean(loadHealthLinkModule());
};

export const checkHealthAvailability = async () => {
  const directAvailability =
    Platform.OS === 'ios'
      ? await checkIosHealthAvailabilityDirect()
      : Platform.OS === 'android'
        ? await checkAndroidHealthAvailabilityDirect()
        : null;

  if (directAvailability?.available) {
    return directAvailability;
  }

  const fallbackAvailability = await checkHealthAvailabilityViaHealthLink();
  if (fallbackAvailability?.available) {
    return fallbackAvailability;
  }

  if (directAvailability?.reason) {
    return directAvailability;
  }

  return fallbackAvailability;
};

export const requestHealthPermissions = async ({ includeNutritionWrite = true } = {}) => {
  const directResult =
    Platform.OS === 'ios'
      ? await requestIosHealthPermissionsDirect({ includeNutritionWrite })
      : Platform.OS === 'android'
        ? await requestAndroidHealthPermissionsDirect({ includeNutritionWrite })
        : null;

  if (directResult) {
    return directResult;
  }

  return requestHealthPermissionsViaHealthLink({ includeNutritionWrite });
};

export const readTodayStepsFromHealth = async (dateValue = new Date()) => {
  const directResult =
    Platform.OS === 'ios'
      ? await readTodayStepsFromIosDirect(dateValue)
      : Platform.OS === 'android'
        ? await readTodayStepsFromAndroidDirect(dateValue)
        : null;

  if (directResult) {
    return directResult;
  }

  const { dataTypes } = resolveHealthLinkSchema();
  if (!dataTypes.steps) {
    return { steps: null, supported: false };
  }

  const rows = await readSamplesViaHealthLink(dataTypes.steps, dateValue);
  if (!rows.length) {
    return { steps: 0, supported: true };
  }

  const steps = rows.reduce((sum, row) => {
    const value = asFiniteNumber(getSampleValue(row), 0) || 0;
    return sum + Math.max(0, value);
  }, 0);

  return {
    steps: Math.round(steps),
    supported: true,
    sampleCount: rows.length,
  };
};

export const readTodayActiveCaloriesFromHealth = async (dateValue = new Date()) => {
  const directResult =
    Platform.OS === 'ios'
      ? await readTodayActiveCaloriesFromIosDirect(dateValue)
      : Platform.OS === 'android'
        ? await readTodayActiveCaloriesFromAndroidDirect(dateValue)
        : null;

  if (directResult) {
    return directResult;
  }

  const { dataTypes } = resolveHealthLinkSchema();
  if (!dataTypes.activeCalories) {
    return { activeCalories: null, supported: false };
  }

  const rows = await readSamplesViaHealthLink(dataTypes.activeCalories, dateValue);
  if (!rows.length) {
    return { activeCalories: 0, supported: true };
  }

  const activeCalories = rows.reduce((sum, row) => {
    const value = getActiveCaloriesSampleValue(row);
    return sum + Math.max(0, value);
  }, 0);

  return {
    activeCalories: Math.round(activeCalories * 10) / 10,
    supported: true,
    sampleCount: rows.length,
  };
};

export const writeDailyNutritionToHealth = async ({
  dateISO,
  calories,
  protein,
  carbs,
  fat,
} = {}) => {
  const directResult =
    Platform.OS === 'ios'
      ? await writeDailyNutritionToIosDirect({ dateISO, calories, protein, carbs, fat })
      : Platform.OS === 'android'
        ? await writeDailyNutritionToAndroidDirect({ dateISO, calories, protein, carbs, fat })
        : null;

  if (directResult) {
    return directResult;
  }

  const { dataTypes } = resolveHealthLinkSchema();
  const targetDate = dateISO ? new Date(`${dateISO}T12:00:00`) : new Date();
  const { startDate, endDate } = getDateRange(targetDate);

  const payloadByField = {
    calories: {
      dataType: dataTypes.nutrition.calories,
      value: Math.max(0, asFiniteNumber(calories, 0) || 0),
      unit: 'kcal',
    },
    protein: {
      dataType: dataTypes.nutrition.protein,
      value: Math.max(0, asFiniteNumber(protein, 0) || 0),
      unit: 'g',
    },
    carbs: {
      dataType: dataTypes.nutrition.carbs,
      value: Math.max(0, asFiniteNumber(carbs, 0) || 0),
      unit: 'g',
    },
    fat: {
      dataType: dataTypes.nutrition.fat,
      value: Math.max(0, asFiniteNumber(fat, 0) || 0),
      unit: 'g',
    },
  };

  const writtenFields = [];
  const skippedFields = [];

  for (const [field, config] of Object.entries(payloadByField)) {
    if (!config.dataType || config.value <= 0) {
      skippedFields.push(field);
      continue;
    }

    const success = await writeSampleViaHealthLink(config.dataType, {
      value: config.value,
      unit: config.unit,
      startDate,
      endDate,
      date: startDate,
    });

    if (success) {
      writtenFields.push(field);
    } else {
      skippedFields.push(field);
    }
  }

  return {
    written: writtenFields.length > 0,
    writtenFields,
    skippedFields,
  };
};
