import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Platform, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import { notificationsApi } from '../services/api';

// Screens
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { PhoneEntryScreen } from '../screens/onboarding/PhoneEntryScreen';
import { OTPVerificationScreen } from '../screens/onboarding/OTPVerificationScreen';
import { BasicProfileScreen } from '../screens/onboarding/BasicProfileScreen';
import { IncomeExpensesScreen } from '../screens/onboarding/IncomeExpensesScreen';
import { SavingsSnapshotScreen } from '../screens/onboarding/SavingsSnapshotScreen';
import { RetirementGoalsScreen } from '../screens/onboarding/RetirementGoalsScreen';
import { RiskAppetiteScreen } from '../screens/onboarding/RiskAppetiteScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { FIREScreen } from '../screens/fire/FIREScreen';
import { InvestmentsScreen } from '../screens/investments/InvestmentsScreen';
import { TaxPlannerScreen } from '../screens/tax/TaxPlannerScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditPersonalScreen } from '../screens/profile/EditPersonalScreen';
import { EditFinancialsScreen } from '../screens/profile/EditFinancialsScreen';
import { EditGoalsScreen } from '../screens/profile/EditGoalsScreen';
import { EditInvestmentScreen } from '../screens/investments/EditInvestmentScreen';
import { SubscriptionScreen } from '../screens/profile/SubscriptionScreen';
import { NotificationPreferencesScreen } from '../screens/profile/NotificationPreferencesScreen';
import { MfImportScreen } from '../screens/investments/MfImportScreen';
import { DematSyncScreen } from '../screens/investments/DematSyncScreen';
import { InsuranceScreen } from '../screens/profile/InsuranceScreen';
import { EditTaxProfileScreen } from '../screens/tax/EditTaxProfileScreen';
import { GoalsScreen } from '../screens/goals/GoalsScreen';
import { EditGoalScreen } from '../screens/goals/EditGoalScreen';
import { EmergencyFundScreen } from '../screens/emergency-fund/EmergencyFundScreen';

export type OnboardingStackParams = {
  Welcome: undefined;
  PhoneEntry: undefined;
  OTPVerification: { phoneNumber: string; devOtp?: string };
  BasicProfile: undefined;
  IncomeExpenses: undefined;
  SavingsSnapshot: undefined;
  RetirementGoals: undefined;
  RiskAppetite: undefined;
};

export type MainTabParams = {
  Dashboard: undefined;
  FIRE: undefined;
  Investments: undefined;
  TaxPlanner: undefined;
  Profile: undefined;
};

export type MainStackParams = {
  MainTabs: undefined;
  EditPersonal: undefined;
  EditFinancials: undefined;
  EditGoals: undefined;
  EditInvestment: { investmentId?: string };
  Subscription: undefined;
  NotificationPreferences: undefined;
  MfImport: undefined;
  DematSync: undefined;
  Insurance: undefined;
  EditTaxProfile: undefined;
  Goals: undefined;
  EditGoal: { goalId?: string };
  EmergencyFund: undefined;
};

const OnboardingStack = createNativeStackNavigator<OnboardingStackParams>();
const MainTab = createBottomTabNavigator<MainTabParams>();
const MainStack = createNativeStackNavigator<MainStackParams>();
const RootStack = createNativeStackNavigator();

const BRAND_GREEN = '#1B4332';

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Welcome"
    >
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <OnboardingStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <OnboardingStack.Screen name="BasicProfile" component={BasicProfileScreen} />
      <OnboardingStack.Screen name="IncomeExpenses" component={IncomeExpensesScreen} />
      <OnboardingStack.Screen name="SavingsSnapshot" component={SavingsSnapshotScreen} />
      <OnboardingStack.Screen name="RetirementGoals" component={RetirementGoalsScreen} />
      <OnboardingStack.Screen name="RiskAppetite" component={RiskAppetiteScreen} />
    </OnboardingStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_GREEN,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingBottom: 4 },
      }}
    >
      <MainTab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <MainTab.Screen name="FIRE" component={FIREScreen} options={{ title: 'FIRE Calc' }} />
      <MainTab.Screen name="Investments" component={InvestmentsScreen} />
      <MainTab.Screen name="TaxPlanner" component={TaxPlannerScreen} options={{ title: 'Tax' }} />
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
}

function MainStackNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={MainTabNavigator} />
      <MainStack.Screen name="EditPersonal" component={EditPersonalScreen} />
      <MainStack.Screen name="EditFinancials" component={EditFinancialsScreen} />
      <MainStack.Screen name="EditGoals" component={EditGoalsScreen} />
      <MainStack.Screen name="EditInvestment" component={EditInvestmentScreen} />
      <MainStack.Screen name="Subscription" component={SubscriptionScreen} />
      <MainStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <MainStack.Screen name="MfImport" component={MfImportScreen} />
      <MainStack.Screen name="DematSync" component={DematSyncScreen} />
      <MainStack.Screen name="Insurance" component={InsuranceScreen} />
      <MainStack.Screen name="EditTaxProfile" component={EditTaxProfileScreen} />
      <MainStack.Screen name="Goals" component={GoalsScreen} />
      <MainStack.Screen name="EditGoal" component={EditGoalScreen} />
      <MainStack.Screen name="EmergencyFund" component={EmergencyFundScreen} />
    </MainStack.Navigator>
  );
}

async function registerPushToken() {
  if (Platform.OS === 'web') return; // Web push not supported via Expo

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await notificationsApi.registerToken(tokenData.data, platform);
  } catch {
    // Non-critical — silently ignore if push token registration fails
  }
}

export function AppNavigator() {
  const { isAuthenticated, isOnboardingComplete, isLoading, checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated && isOnboardingComplete) {
      registerPushToken();
    }
  }, [isAuthenticated, isOnboardingComplete]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND_GREEN }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated || !isOnboardingComplete ? (
        <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <RootStack.Screen name="Main" component={MainStackNavigator} />
      )}
    </RootStack.Navigator>
  );
}
