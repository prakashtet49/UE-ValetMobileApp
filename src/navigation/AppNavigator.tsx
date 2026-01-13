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
import ProfileScreen from '../screens/ProfileScreen';
import GenerateBillsScreen from '../screens/GenerateBillsScreen';
import InProgressJobsScreen from '../screens/InProgressJobsScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  TemporaryAccess: undefined;
  OtpVerification: {phone: string; password?: string; isPasswordLogin?: boolean};
};

export type AppStackParamList = {
  Home: {activePickupJob?: any; checkoutSuccess?: boolean; bookingId?: string} | undefined;
  ActiveJobs: undefined;
  InProgressJobs: undefined;
  PendingParking: undefined;
  StartParking: {keyTagCode?: string; customerPhone?: string; source?: string} | undefined;
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
  GenerateBills: undefined;
  Profile: undefined;
};


const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator 
      initialRouteName="Splash" 
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 300,
      }}>
      <AuthStack.Screen
        name="Splash"
        component={SplashScreen}
        options={{
          animation: 'none',
        }}
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
    <AppStack.Navigator 
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}>
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
          presentation: 'transparentModal',
          animation: 'fade',
          animationDuration: 200,
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
      <AppStack.Screen
        name="GenerateBills"
        component={GenerateBillsScreen}
      />
      <AppStack.Screen
        name="InProgressJobs"
        component={InProgressJobsScreen}
      />
      <AppStack.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </AppStack.Navigator>
  );
}


export default function AppNavigator() {
  const {session, initializing} = useAuth();

  // Show splash screen while checking for stored session
  if (initializing) {
    return (
      <NavigationContainer ref={navigationRef}>
        <AuthStack.Navigator screenOptions={{headerShown: false}}>
          <AuthStack.Screen name="Splash" component={SplashScreen} />
        </AuthStack.Navigator>
      </NavigationContainer>
    );
  }

  // Determine which stack to show based on session
  const getUserStack = () => {
    if (!session) {
      return <AuthStackNavigator />;
    }
    
    return <AppStackNavigator />;
  };

  return (
    <NavigationContainer ref={navigationRef}>
      {getUserStack()}
    </NavigationContainer>
  );
}
