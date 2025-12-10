# BackButton Component Guide

## Overview
Since we removed the default navigation headers, you need to manually add the `BackButton` component to screens that need back navigation.

## Usage

### 1. Import the component
```tsx
import BackButton from '../components/BackButton';
```

### 2. Add it to your screen (usually at the top)
```tsx
<View style={styles.container}>
  <BackButton />
  {/* rest of your screen content */}
</View>
```

## Customization Options

### Basic (default white text)
```tsx
<BackButton />
```

### Custom color
```tsx
<BackButton color="#e5e7eb" />
```

### Custom label
```tsx
<BackButton label="← Go Back" />
```

### Custom background
```tsx
<BackButton 
  backgroundColor="rgba(0,0,0,0.1)" 
  color="#ffffff" 
/>
```

### Custom action (instead of navigation.goBack())
```tsx
<BackButton 
  onPress={() => {
    // Your custom logic
    navigation.navigate('Home');
  }}
/>
```

## Screens That Need BackButton

Add `<BackButton />` to these screens (already added to StartParkingScreen as example):

### Parking Flow
- ✅ **StartParkingScreen** - Already added
- **ParkVehicleScreen**
- **ScanKeyTagScreen**
- **EnterReferenceScreen**

### Pickup Flow
- **PendingPickupsScreen**
- **PickupDetailScreen**
- **DriveToPickupScreen**
- **VerifyReferenceScreen**
- **OverrideHandoverScreen**
- **HandoverConfirmationScreen**

### Other Screens
- **ActiveJobsScreen**
- **PendingParkingScreen**
- **IncidentReportScreen**
- **PerformanceStatsScreen**

### Screens That DON'T Need BackButton
- **HomeScreen** - This is the main screen
- **NewJobRequestScreen** - Modal with its own close button
- **LoginScreen** - Entry point
- **SplashScreen** - Auto-navigates

## Example Implementation

```tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import BackButton from '../components/BackButton';

export default function MyScreen() {
  return (
    <View style={styles.container}>
      <BackButton color="#e5e7eb" />
      
      <Text style={styles.title}>My Screen Title</Text>
      {/* rest of content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
  },
});
```

## Tips

1. **Placement**: Add `<BackButton />` as the first child in your main container
2. **Color**: Match the button color to your screen's theme
3. **Spacing**: The button has built-in padding, but you may want to add margin to the next element
4. **Dark screens**: Use light colors like `#e5e7eb` or `#ffffff`
5. **Light screens**: Use dark colors like `#1f2937` or `#000000`
