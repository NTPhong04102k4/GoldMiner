import React, { forwardRef, useEffect, useState } from "react";
import {
  NavigationContainer,
  NavigationContainerRef,
  NavigationState,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GameStart from "../screen/game";
import GameSecond from "../screen/game2";
import GameThird from "../screen/game3";
import Rules from "../screen/rules";
import History from "../screen/History";
import Store from "../screen/store";
import Dashboard from "../screen/dashBoard";
import { navigationRef, onNavigationReady } from "./navigate";
import Achievement from "../screen/achievement";

// 🛠️ Định nghĩa danh sách màn hình hợp lệ
type RootParamList = {
  Dashboard: undefined;
  GameStart: undefined;
  GameSecond: undefined;
  GameThird: undefined;
  Rules: undefined;
  History: undefined;
  Store: undefined;
  Achievement:undefined
};

const Stack = createNativeStackNavigator<RootParamList>();

const AppNavigator = forwardRef<NavigationContainerRef<RootParamList>, {}>(
  () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootParamList | null>(null);

  useEffect(() => {
    const getLastScreen = async () => {
      try {
        const lastScreen = await AsyncStorage.getItem("lastScreen");
        // Kiểm tra xem `lastScreen` có hợp lệ không
        if (lastScreen && Object.keys(Stack.Screen).includes(lastScreen)) {
          setInitialRoute(lastScreen as keyof RootParamList);
        } else {
          setInitialRoute("Dashboard"); // Mặc định về Dashboard nếu không hợp lệ
        }
      } catch (error) {
        console.error("Lỗi khi đọc màn hình:", error);
        setInitialRoute("Dashboard");
      }
    };
    getLastScreen();
  }, []);



  // ⏳ Đợi cho đến khi `initialRoute` được tải
  if (initialRoute === null) return null;

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onNavigationReady}
      onStateChange={async (state: NavigationState | undefined) => {
        if (!state) return;
        const currentScreen = state.routes[state.index].name as keyof RootParamList;
        await AsyncStorage.setItem("lastScreen", currentScreen);
      }}
    >
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="GameStart" component={GameStart} />
        <Stack.Screen name="GameSecond" component={GameSecond} />
        <Stack.Screen name="GameThird" component={GameThird} />
        <Stack.Screen name="Rules" component={Rules} />
        <Stack.Screen name="History" component={History} />
        <Stack.Screen name="Store" component={Store} />
        <Stack.Screen name="Achievement" component={Achievement}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
});

export default AppNavigator;
