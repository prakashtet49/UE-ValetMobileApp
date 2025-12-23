# Responsive Design Guide

## Overview
This guide explains how to make the Vallet Mobile App UI responsive across different Android device sizes (5" to 6.5" screens).

## Responsive Utility Functions

All responsive utilities are located in `src/utils/responsive.ts`:

### Available Functions

1. **`moderateScale(size)`** - Scales dimensions moderately (recommended for most UI elements)
   - Use for: widths, heights, border radius, icon sizes
   - Example: `moderateScale(16)` → scales 16px based on screen width

2. **`verticalScale(size)`** - Scales based on screen height
   - Use for: vertical margins, padding, heights
   - Example: `verticalScale(20)` → scales 20px based on screen height

3. **`getResponsiveFontSize(size)`** - Scales font sizes intelligently
   - Use for: all text fontSize properties
   - Example: `getResponsiveFontSize(14)` → scales 14px font

4. **`getResponsiveSpacing(size)`** - Scales spacing (padding/margin)
   - Use for: padding and margin values
   - Example: `getResponsiveSpacing(16)` → scales 16px spacing

5. **`scale(size)`** - Pure horizontal scaling
   - Use for: specific horizontal-only scaling needs

6. **`wp(percentage)`** - Width percentage
   - Use for: percentage-based widths
   - Example: `wp(80)` → 80% of screen width

7. **`hp(percentage)`** - Height percentage
   - Use for: percentage-based heights
   - Example: `hp(50)` → 50% of screen height

### Device Detection

- `isSmallDevice()` - Returns true for screens < 375px width
- `isMediumDevice()` - Returns true for screens 375-414px width
- `isLargeDevice()` - Returns true for screens >= 414px width

## Usage Guidelines

### ✅ DO:

```typescript
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../utils/responsive';

const styles = StyleSheet.create({
  container: {
    padding: getResponsiveSpacing(20),
    marginTop: verticalScale(16),
  },
  text: {
    fontSize: getResponsiveFontSize(16),
    lineHeight: verticalScale(24),
  },
  button: {
    width: moderateScale(120),
    height: verticalScale(48),
    borderRadius: moderateScale(12),
  },
  icon: {
    width: moderateScale(24),
    height: moderateScale(24),
  },
});
```

### ❌ DON'T:

```typescript
// Don't use hardcoded values
const styles = StyleSheet.create({
  container: {
    padding: 20,           // ❌ Hardcoded
    marginTop: 16,         // ❌ Hardcoded
  },
  text: {
    fontSize: 16,          // ❌ Hardcoded
    lineHeight: 24,        // ❌ Hardcoded
  },
});
```

## Migration Checklist

When updating existing screens to be responsive:

1. ✅ Import responsive utilities at the top
2. ✅ Replace all `fontSize` with `getResponsiveFontSize()`
3. ✅ Replace all `padding`/`margin` with `getResponsiveSpacing()` or `verticalScale()`
4. ✅ Replace all `width`/`height` with `moderateScale()` or `verticalScale()`
5. ✅ Replace all `borderRadius` with `moderateScale()`
6. ✅ Replace all icon sizes with `moderateScale()`
7. ✅ Test on different screen sizes (5", 5.5", 6", 6.5")

## Examples from Updated Screens

### StartParkingScreen
```typescript
// Before
header: {
  paddingHorizontal: 20,
  paddingTop: 50,
  paddingBottom: 12,
}

// After
header: {
  paddingHorizontal: getResponsiveSpacing(20),
  paddingTop: verticalScale(50),
  paddingBottom: verticalScale(12),
}
```

### HomeScreen
```typescript
// Before
statCard: {
  borderRadius: 12,
  padding: 12,
  minHeight: 90,
}

// After
statCard: {
  borderRadius: moderateScale(12),
  padding: getResponsiveSpacing(12),
  minHeight: verticalScale(90),
}
```

## Screens Already Updated

- ✅ `StartParkingScreen.tsx` - Fully responsive
- ✅ `HomeScreen.tsx` - Fully responsive

## Screens Requiring Updates

Apply the same responsive pattern to:
- `ActiveJobsScreen.tsx`
- `PendingPickupsScreen.tsx`
- `ProfileScreen.tsx`
- `PickupDetailScreen.tsx`
- `ParkVehicleScreen.tsx`
- `IncidentReportScreen.tsx`
- `LoginScreen.tsx`
- `OtpVerificationScreen.tsx`
- All other screens with StyleSheet definitions

## Testing

Test your responsive changes on:
1. **Small devices** (5" - 5.5"): 360x640, 375x667
2. **Medium devices** (5.5" - 6"): 414x736, 390x844
3. **Large devices** (6" - 6.5"): 428x926, 430x932

Use Android Studio emulators or React Native Debugger to test different screen sizes.

## Best Practices

1. **Consistency**: Always use responsive utilities, never mix hardcoded and responsive values
2. **Flex layouts**: Prefer `flex: 1` over fixed dimensions when possible
3. **Aspect ratios**: Use `aspectRatio` property for maintaining proportions
4. **Min/Max constraints**: Use `minWidth`, `maxWidth`, `minHeight`, `maxHeight` when needed
5. **Gap property**: Use `gap` with `moderateScale()` for flexbox spacing
6. **Test thoroughly**: Always test on multiple screen sizes before deploying

## Common Patterns

### Card Component
```typescript
card: {
  backgroundColor: COLORS.white,
  borderRadius: moderateScale(12),
  padding: getResponsiveSpacing(16),
  marginBottom: verticalScale(12),
  ...SHADOWS.medium,
}
```

### Button
```typescript
button: {
  height: verticalScale(48),
  paddingHorizontal: getResponsiveSpacing(24),
  borderRadius: moderateScale(24),
}
```

### Input Field
```typescript
input: {
  height: verticalScale(56),
  paddingHorizontal: getResponsiveSpacing(16),
  fontSize: getResponsiveFontSize(16),
  borderRadius: moderateScale(12),
}
```

### Icon
```typescript
icon: {
  width: moderateScale(24),
  height: moderateScale(24),
}
```

## Troubleshooting

**Issue**: Text appears too large on small devices
- **Solution**: Ensure you're using `getResponsiveFontSize()` instead of hardcoded values

**Issue**: Spacing looks cramped on small devices
- **Solution**: Use `getResponsiveSpacing()` for padding/margin values

**Issue**: Buttons/cards appear too small on large devices
- **Solution**: Use `moderateScale()` for dimensions instead of fixed values

**Issue**: Vertical spacing inconsistent
- **Solution**: Use `verticalScale()` for all vertical margins and padding

## Additional Resources

- React Native Dimensions API: https://reactnative.dev/docs/dimensions
- React Native PixelRatio API: https://reactnative.dev/docs/pixelratio
- Flexbox Guide: https://reactnative.dev/docs/flexbox
