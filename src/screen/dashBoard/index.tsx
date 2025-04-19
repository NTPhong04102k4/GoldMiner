import React from 'react';
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  View,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {navigate} from '../../navigation/navigate';
import { R } from '../../assets';
const Dashboard = () => {
  return (
    <View style={styles.container}>
      <ImageBackground
        resizeMode={'stretch'}
        source={R.images.bg_start}
        style={[styles.container, {}]}
      />
      <TouchableOpacity
        style={styles.overlay}
        onPress={() => {
          navigate('GoldMiner');
          console.log('click');
        }
      }
      />
      <Pressable
        style={styles.helpRules}
        onPress={() => navigate('Rules')}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute', // 🔥 Đặt View đè lên ảnh
    top: '40%',
    left: '60%',
    transform: [{translateX: -50}, {translateY: -50}], // Căn giữa
    padding: 20,
    width: Dimensions.get('screen').width * 0.35,
    height: Dimensions.get('screen').height * 0.25,
    borderRadius: 10,
  },
  helpRules: {
    position: 'absolute',
    transform: [{translateX: -50}, {translateY: -50}], // Căn giữa
    width: Dimensions.get('screen').width * 0.2,
    height: Dimensions.get('screen').height * 0.15,
    top: '70%',
    left: '68%',
  },
});
export default Dashboard;
