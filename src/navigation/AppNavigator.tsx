import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import {navigationRef} from './navigationRef';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import TemporaryAccessScreen from '../screens/TemporaryAccessScreen';
import OtpVerificationScreen from '../screens/OtpVerificationScreen';
import HomeScreen from '../screens/HomeScreen';
import ActiveJobsScreen from '../screens/ActiveJobsScreen';
import PendingParkingScreen from '../screens/PendingParkingScreen';
import StartParkingScreen from '../screens/StartParkingScreen';
import ParkVehicleScreen from '../screens/ParkVehicleScreen';
import PendingPickupsScreen from '../screens/PendingPickupsScreen';
import PickupDetailScreen from '../screens/PickupDetailScreen';
import NewJobRequestScreen from '../screens/NewJobRequestScreen';
import ScanKeyTagScreen from '../screens/ScanKeyTagScreen';
import EnterReferenceScreen from '../screens/EnterReferenceScreen';
import DriveToPickupScreen from '../screens/DriveToPickupScreen';
import VerifyReferenceScreen from '../screens/VerifyReferenceScreen';
import OverrideHandoverScreen from '../screens/OverrideHandoverScreen';
import HandoverConfirmationScreen from '../screens/HandoverConfirmationScreen';
import IncidentReportScreen from '../screens/IncidentReportScreen';
import PerformanceStatsScreen from '../screens/PerformanceStatsScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  TemporaryAccess: undefined;
  OtpVerification: {phone: string};
};

export type AppStackParamList = {
  Home: {activePickupJob?: any} | undefined;
  ActiveJobs: undefined;
  PendingParking: undefined;
  StartParking: undefined;
  ParkVehicle: {parkingJobId: string; keyTagCode: string};
  PendingPickups: undefined;
  PickupDetail: {pickupJobId: string};
  NewJobRequest: {
    jobId: string;
    vehicleNumber: string;
    tagNumber?: string;
    pickupPoint?: string;
  };
  ScanKeyTag: undefined;
  EnterReference: undefined;
  DriveToPickup: {pickupJobId: string};
  VerifyReference: {pickupJobId: string};
  OverrideHandover: {pickupJobId: string};
  HandoverConfirmation: {pickupJobId: string};
  IncidentReport: {
    contextType: 'PARKING' | 'PICKUP';
    contextId: string;
    vehicleNumber?: string | null;
    keyTagCode?: string | null;
  };
  PerformanceStats: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="Splash" screenOptions={{headerShown: false}}>
      <AuthStack.Screen
        name="Splash"
        component={SplashScreen}
      />
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
      />
      <AuthStack.Screen
        name="TemporaryAccess"
        component={TemporaryAccessScreen}
      />
      <AuthStack.Screen
        name="OtpVerification"
        component={OtpVerificationScreen}
      />
    </AuthStack.Navigator>
  );
}

function AppStackNavigator() {
  return (
    <AppStack.Navigator screenOptions={{headerShown: false}}>
      <AppStack.Screen
        name="Home"
        component={HomeScreen}
      />
      <AppStack.Screen
        name="ActiveJobs"
        component={ActiveJobsScreen}
      />
      <AppStack.Screen
        name="PendingParking"
        component={PendingParkingScreen}
      />
      <AppStack.Screen
        name="StartParking"
        component={StartParkingScreen}
      />
      <AppStack.Screen
        name="ParkVehicle"
        component={ParkVehicleScreen}
      />
      <AppStack.Screen
        name="PendingPickups"
        component={PendingPickupsScreen}
      />
      <AppStack.Screen
        name="PickupDetail"
        component={PickupDetailScreen}
      />
      <AppStack.Screen
        name="NewJobRequest"
        component={NewJobRequestScreen}
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <AppStack.Screen
        name="ScanKeyTag"
        component={ScanKeyTagScreen}
      />
      <AppStack.Screen
        name="EnterReference"
        component={EnterReferenceScreen}
      />
      <AppStack.Screen
        name="DriveToPickup"
        component={DriveToPickupScreen}
      />
      <AppStack.Screen
        name="VerifyReference"
        component={VerifyReferenceScreen}
      />
      <AppStack.Screen
        name="OverrideHandover"
        component={OverrideHandoverScreen}
      />
      <AppStack.Screen
        name="HandoverConfirmation"
        component={HandoverConfirmationScreen}
      />
      <AppStack.Screen
        name="IncidentReport"
        component={IncidentReportScreen}
      />
      <AppStack.Screen
        name="PerformanceStats"
        component={PerformanceStatsScreen}
      />
    </AppStack.Navigator>
  );
}

export default function AppNavigator() {
  const {session} = useAuth();

  return (
    <NavigationContainer ref={navigationRef}>
      {session ? <AppStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}
