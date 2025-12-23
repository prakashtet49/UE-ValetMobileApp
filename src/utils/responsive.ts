import {Dimensions, PixelRatio} from 'react-native';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const wp = (percentage: number): number => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

export const hp = (percentage: number): number => {
  const value = (percentage * SCREEN_HEIGHT) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

export const scale = (size: number): number => {
  const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scaleFactor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const verticalScale = (size: number): number => {
  const scaleFactor = SCREEN_HEIGHT / BASE_HEIGHT;
  const newSize = size * scaleFactor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const moderateScale = (size: number, factor: number = 0.5): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

export const moderateVerticalScale = (size: number, factor: number = 0.5): number => {
  return Math.round(size + (verticalScale(size) - size) * factor);
};

export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

export const isMediumDevice = (): boolean => {
  return SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
};

export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH >= 414;
};

export const getResponsiveFontSize = (size: number): number => {
  if (isSmallDevice()) {
    return moderateScale(size, 0.3);
  } else if (isMediumDevice()) {
    return moderateScale(size, 0.4);
  }
  return moderateScale(size, 0.5);
};

export const getResponsiveSpacing = (size: number): number => {
  return moderateScale(size, 0.4);
};

export const screenDimensions = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};
