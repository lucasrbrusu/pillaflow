import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// RevenueCat's browser fallback (used in Expo Go without a dev client) expects
// a browser-like `location` object. React Native doesn't provide one, so we
// stub the minimal shape to avoid `location.search` errors during init.
if (typeof globalThis.location === 'undefined') {
  globalThis.location = { search: '' };
} else if (typeof globalThis.location.search === 'undefined') {
  globalThis.location.search = '';
}

// Production RevenueCat API keys (iOS and Android)
const iosApiKey = 'appl_VnKzbJTYiUgHyeQtpuoHZgyrAjj';
const androidApiKey = 'goog_pwyWISJSXbUBoSRppNHtySWkYwU';

const ENTITLEMENT_ID = 'premium';
const DEFAULT_OFFERING_ID = 'default';
const IOS_DEFAULT_PREMIUM_PRODUCT_IDS = {
  monthly: 'pillaflow_monthly',
  annual: 'pillaflow_yearly',
};

const globalKey = '__PILLAFLOW_REVENUECAT__';
const globalState = (() => {
  if (!globalThis[globalKey]) {
    globalThis[globalKey] = { configured: false, configurePromise: null, appUserId: null };
  }
  return globalThis[globalKey];
})();

let configured = globalState.configured || false;
let configurePromise = globalState.configurePromise || null;
let currentAppUserId = globalState.appUserId || null;

export const configureRevenueCat = async () => {
  if (configured) return true;
  if (configurePromise) return configurePromise;

  const apiKey = Platform.OS === 'ios' ? iosApiKey : androidApiKey;
  if (!apiKey) return false;

  configurePromise = globalState.configurePromise = (async () => {
    try {
      Purchases.setLogLevel(LOG_LEVEL.WARN);
      await Purchases.configure({ apiKey });
      configured = true;
      globalState.configured = true;
      return true;
    } catch (error) {
      console.warn('RevenueCat configure failed', error);
      return false;
    } finally {
      configurePromise = null;
      globalState.configurePromise = null;
    }
  })();

  return configurePromise;
};

const normalizeAppUserId = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const getPackageProductIdentifier = (pkg) => {
  const value = pkg?.product?.identifier;
  return typeof value === 'string' ? value.trim() : '';
};

const findPackageByProductIdentifier = (offering, productIdentifier) => {
  const normalizedIdentifier =
    typeof productIdentifier === 'string' ? productIdentifier.trim() : '';
  if (!offering || !normalizedIdentifier) return null;
  return (
    (offering.availablePackages || []).find(
      (pkg) => getPackageProductIdentifier(pkg) === normalizedIdentifier
    ) || null
  );
};

export const setRevenueCatUserId = async (userId) => {
  const ok = await configureRevenueCat();
  if (!ok) return false;

  const nextUserId = normalizeAppUserId(userId);
  if (!nextUserId) {
    if (currentAppUserId) {
      try {
        await Purchases.logOut();
      } catch (error) {
        console.warn('RevenueCat logOut failed', error);
      }
      currentAppUserId = null;
      globalState.appUserId = null;
    }
    return true;
  }

  if (currentAppUserId && currentAppUserId !== nextUserId) {
    try {
      await Purchases.logOut();
    } catch (error) {
      console.warn('RevenueCat logOut failed', error);
    }
  }

  if (currentAppUserId === nextUserId) return true;

  try {
    await Purchases.logIn(nextUserId);
    currentAppUserId = nextUserId;
    globalState.appUserId = nextUserId;
    return true;
  } catch (error) {
    console.warn('RevenueCat logIn failed', error);
    return false;
  }
};

const matchPackage = (currentOffering, type) => {
  if (!currentOffering) return null;

  if (Platform.OS === 'ios') {
    const requiredProductIdentifier = IOS_DEFAULT_PREMIUM_PRODUCT_IDS[type] || '';
    return findPackageByProductIdentifier(currentOffering, requiredProductIdentifier);
  }

  if (type === 'monthly') {
    return (
      currentOffering.monthly ||
      (currentOffering.availablePackages || []).find(
        (p) =>
          (p?.packageType || '').toString().toLowerCase() === 'monthly' ||
          (p?.identifier || '').toLowerCase().includes('month')
      ) ||
      null
    );
  }

  if (type === 'annual') {
    return (
      currentOffering.annual ||
      (currentOffering.availablePackages || []).find(
        (p) =>
          (p?.packageType || '').toString().toLowerCase() === 'annual' ||
          (p?.identifier || '').toLowerCase().includes('year')
      ) ||
      null
    );
  }

  return null;
};

const pickDefaultOffering = (offerings) => {
  if (!offerings) return null;
  if (offerings.all && offerings.all[DEFAULT_OFFERING_ID]) {
    return offerings.all[DEFAULT_OFFERING_ID];
  }
  if (Platform.OS === 'ios') return null;
  if (offerings.current) return offerings.current;
  const allList = offerings.all ? Object.values(offerings.all) : [];
  return allList.find(Boolean) || null;
};

export const loadOfferingPackages = async () => {
  const ok = await configureRevenueCat();
  if (!ok) {
    return { offering: null, monthly: null, annual: null };
  }
  const offerings = await Purchases.getOfferings();
  const selected = pickDefaultOffering(offerings);
  return {
    offering: selected,
    monthly: matchPackage(selected, 'monthly'),
    annual: matchPackage(selected, 'annual'),
  };
};

export const purchaseRevenueCatPackage = async (pkg) => {
  const ok = await configureRevenueCat();
  if (!ok) throw new Error('RevenueCat not configured');
  return Purchases.purchasePackage(pkg);
};

export const restoreRevenueCatPurchases = async () => {
  const ok = await configureRevenueCat();
  if (!ok) throw new Error('RevenueCat not configured');
  return Purchases.restorePurchases();
};

export const getPremiumEntitlementStatus = async (appUserId) => {
  const ok =
    appUserId === undefined ? await configureRevenueCat() : await setRevenueCatUserId(appUserId);
  if (!ok) return { entitlement: null, isActive: false, info: null, expiration: null };
  const info = await Purchases.getCustomerInfo();
  const activeEntitlements = info?.entitlements?.active || {};

  const direct = activeEntitlements[ENTITLEMENT_ID];
  const fallback = Object.values(activeEntitlements || {}).find((ent) => {
    const id = (ent?.identifier || '').toLowerCase();
    return id === ENTITLEMENT_ID.toLowerCase();
  });

  const entitlement = direct || fallback || null;
  const expiration =
    entitlement?.expirationDate ||
    entitlement?.expiresDate ||
    entitlement?.expirationDateMillis ||
    entitlement?.expirationDateMs ||
    entitlement?.expiresDateMillis ||
    entitlement?.expiresDateMs ||
    entitlement?.expiration_date ||
    entitlement?.expires_date ||
    null;
  return {
    entitlement,
    isActive: !!entitlement,
    info,
    expiration,
  };
};

export default {
  configureRevenueCat,
  loadOfferingPackages,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  getPremiumEntitlementStatus,
  setRevenueCatUserId,
};
