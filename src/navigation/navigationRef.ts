import {createNavigationContainerRef} from '@react-navigation/native';
import type {AppStackParamList} from './AppNavigator';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

export function navigate<Name extends keyof AppStackParamList>(
  name: Name,
  params?: AppStackParamList[Name],
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error: params type is tied to Name; runtime navigation is safe here
    navigationRef.navigate(name, params);
  }
}
