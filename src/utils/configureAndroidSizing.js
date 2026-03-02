import { Dimensions, PixelRatio, Platform, StyleSheet, Text, TextInput } from 'react-native';

const BASE_SHORT_SIDE = 411;
const MIN_SCALE = 0.9;
const MAX_SCALE = 1.1;

const SCALABLE_PROPERTIES = new Set([
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'top',
  'right',
  'bottom',
  'left',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingHorizontal',
  'paddingVertical',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'gap',
  'rowGap',
  'columnGap',
  'elevation',
  'shadowRadius',
]);

const scaleNumericValue = (value, factor) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return value;
  return PixelRatio.roundToNearestPixel(value * factor);
};

const scaleStyleValue = (property, value, factor) => {
  if (property === 'shadowOffset' && value && typeof value === 'object') {
    return {
      width: scaleNumericValue(value.width, factor),
      height: scaleNumericValue(value.height, factor),
    };
  }

  if (property === 'transform' && Array.isArray(value)) {
    return value.map((transformEntry) => {
      if (!transformEntry || typeof transformEntry !== 'object') return transformEntry;
      const entries = Object.entries(transformEntry);
      if (!entries.length) return transformEntry;
      const [transformName, transformValue] = entries[0];
      if (transformName === 'translateX' || transformName === 'translateY') {
        return { [transformName]: scaleNumericValue(transformValue, factor) };
      }
      return transformEntry;
    });
  }

  if (!SCALABLE_PROPERTIES.has(property)) return value;
  return scaleNumericValue(value, factor);
};

const scaleStyleObject = (styleObject, factor) => {
  if (!styleObject || typeof styleObject !== 'object') return styleObject;
  const scaled = {};
  for (const [property, value] of Object.entries(styleObject)) {
    scaled[property] = scaleStyleValue(property, value, factor);
  }
  return scaled;
};

const getAndroidScaleFactor = () => {
  const { width, height } = Dimensions.get('window');
  const shortSide = Math.min(width, height);
  const rawScale = shortSide / BASE_SHORT_SIDE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));
};

const setDefaultTextProps = () => {
  if (!Text.defaultProps) Text.defaultProps = {};
  Text.defaultProps.allowFontScaling = false;
  Text.defaultProps.maxFontSizeMultiplier = 1;

  if (!TextInput.defaultProps) TextInput.defaultProps = {};
  TextInput.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.maxFontSizeMultiplier = 1;
  TextInput.defaultProps.disableFullscreenUI = true;
};

const patchStyleSheetCreate = () => {
  const originalCreate = StyleSheet.create.bind(StyleSheet);
  const factor = getAndroidScaleFactor();

  StyleSheet.create = (styles) => {
    if (!styles || typeof styles !== 'object') {
      return originalCreate(styles);
    }

    const scaledStyles = {};
    for (const [styleName, styleObject] of Object.entries(styles)) {
      scaledStyles[styleName] = scaleStyleObject(styleObject, factor);
    }
    return originalCreate(scaledStyles);
  };
};

if (
  Platform.OS === 'android' &&
  !globalThis.__PILLR_ANDROID_SIZING_CONFIGURED__
) {
  globalThis.__PILLR_ANDROID_SIZING_CONFIGURED__ = true;
  setDefaultTextProps();
  patchStyleSheetCreate();
}
