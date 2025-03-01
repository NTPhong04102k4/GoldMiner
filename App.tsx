
import React, { useEffect } from 'react';
import {
  StatusBar,
} from 'react-native';
import ImmersiveMode from 'react-native-immersive-mode';
import Orientation from 'react-native-orientation-locker';
import AppNavigator from './src/navigation/RootNavigation';

function App(): React.JSX.Element {
  useEffect(() => {
    Orientation.lockToLandscape(); // ✅ Chỉ gọi một lần khi component mount
    StatusBar.setHidden(true); // Ẩn thanh trạng thái
    ImmersiveMode.fullLayout(true); // Ẩn navigation bar
    ImmersiveMode.setBarMode('Bottom'); // Kích hoạt immersive mode hoàn toàn
    return () => {
      Orientation.unlockAllOrientations(); // 🔄 Trả về mặc định khi unmount
      StatusBar.setHidden(false);
      ImmersiveMode.fullLayout(false); // Hiện lại khi rời game

    };
  }, []);
  return (
   <AppNavigator />
  // <View></View>
  );
}


export default App;
