import { useEffect } from 'react';
import { Alert, BackHandler, StatusBar } from 'react-native';
import Orientation from 'react-native-orientation-locker';
import ImmersiveMode from 'react-native-immersive-mode';
import { useNavigation } from '@react-navigation/native';

export const useGameOrientation = (stopAutoPlay: () => void) => {
  const navigation = useNavigation();

  useEffect(() => {
    console.log('Setting up game orientation');
    // Chỉ set các giá trị này một lần khi component mount
    Orientation.lockToLandscape();
    StatusBar.setHidden(true);
    ImmersiveMode.fullLayout(true);
    ImmersiveMode.setBarMode('Bottom');

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Exit Game', 'Are you sure you want to exit the game?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            stopAutoPlay();
            Orientation.unlockAllOrientations();
            StatusBar.setHidden(false);
            ImmersiveMode.fullLayout(false);
            if (navigation.canGoBack()) navigation.goBack();
          },
        },
      ]);
      return true;
    });

    // Đảm bảo cleanup function được thực hiện
    return () => {
      console.log('Cleaning up game orientation');
      backHandler.remove();
      // Không nên uncomment 3 dòng dưới nếu bạn không muốn thay đổi
      // orientation khi chỉ toggle auto play
      // Orientation.unlockAllOrientations();
      // StatusBar.setHidden(false);
      // ImmersiveMode.fullLayout(false);
    };
  }, []); // Chỉ chạy một lần khi component mount, không phụ thuộc vào navigation hoặc stopAutoPlay

  // Nếu bạn cần sử dụng navigation hoặc stopAutoPlay, tạo các event handler riêng
  useEffect(() => {
    // Xử lý logic liên quan đến stopAutoPlay nếu cần
  }, [stopAutoPlay]);
};
