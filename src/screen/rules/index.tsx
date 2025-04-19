import React, { useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, StatusBar } from "react-native";
import { R } from "../../assets";
import Orientation from "react-native-orientation-locker";
import ImmersiveMode from "react-native-immersive-mode";
import { useNavigation } from "@react-navigation/native";


const Rules = () => {
    const navigate=useNavigation();

  useEffect(() => {
    // Switch to portrait when entering this screen
    Orientation.lockToPortrait();
    StatusBar.setHidden(false);
    
    // Cleanup when leaving the screen
    return () => {
      // Return to landscape when leaving
      Orientation.lockToLandscape();
      StatusBar.setHidden(true);
      ImmersiveMode.setBarMode('Bottom');
    };
  }, []);

  const handleStartGame = () => {
    // Navigate back to game screen if needed
    navigate.goBack();

  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HƯỚNG DẪN GAME ĐÀO VÀNG</Text>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Text style={styles.bannerIconText}>⛏️</Text>
          </View>
          <Text style={styles.bannerText}>Khám phá và đào vàng!</Text>
        </View>
        
        {/* Game Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giới thiệu</Text>
          <Text style={styles.paragraph}>
            Chào mừng bạn đến với trò chơi Đào Vàng! Trong game này, bạn sẽ vào vai một thợ mỏ dũng cảm, 
            tìm kiếm kho báu dưới lòng đất. Hãy sử dụng các công cụ thông minh và chiến lược phù hợp để 
            đào được càng nhiều vàng càng tốt trước khi hết thời gian.
          </Text>
        </View>
        
        {/* Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Điều khiển</Text>
          <View style={styles.controlItem}>
            <View style={styles.controlIcon}>
              <Text style={styles.controlIconText}>👆</Text>
            </View>
            <Text style={styles.controlText}>Chạm vào màn hình để ném dây móc xuống</Text>
          </View>
          <View style={styles.controlItem}>
            <View style={[styles.controlIcon, {backgroundColor: 'transparent'}]}>
              <Image source={R.images.thung} style={styles.smallIcon} />
            </View>
            <Text style={styles.controlText}>Nhấn giữ để kéo dây móc lên nhanh hơn</Text>
          </View>
        </View>
        
        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Các vật phẩm</Text>
          
          <View style={styles.itemContainer}>
            <View style={styles.item}>
              <View style={[styles.itemIcon, styles.goldIcon]}>
                <Text style={styles.itemIconText}>💰</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>Vàng nhỏ</Text>
                <Text style={styles.itemValue}>Giá trị: 50</Text>
              </View>
            </View>
            
            <View style={styles.item}>
              <View style={[styles.itemIcon, styles.goldIcon]}>
                <Image source={R.images.vang_4} style={styles.smallIcon} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>Vàng lớn</Text>
                <Text style={styles.itemValue}>Giá trị: 100</Text>
              </View>
            </View>
            
            <View style={styles.item}>
              <View style={[styles.itemIcon, styles.diamondIcon]}>
                <Text style={styles.itemIconText}>💎</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>Kim cương</Text>
                <Text style={styles.itemValue}>Giá trị: 500</Text>
              </View>
            </View>
            <View style={styles.item}>
              <View style={[styles.itemIcon, styles.bombIcon]}>
                <Image source={R.images.tnt1} style={styles.mediumIcon} resizeMode={'contain'} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>Bom</Text>
                <Text style={styles.itemValue}>Phá đá</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mẹo chơi game</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>1</Text>
            <Text style={styles.tipText}>Nhắm đến những vật phẩm có giá trị cao trước</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>2</Text>
            <Text style={styles.tipText}>Cân nhắc trọng lượng khi kéo vật phẩm lên</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>3</Text>
            <Text style={styles.tipText}>Nâng cấp thiết bị để tăng hiệu quả đào vàng</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>4</Text>
            <Text style={styles.tipText}>Cẩn thận với bom và các vật phẩm nguy hiểm</Text>
          </View>
        </View>
      </ScrollView>
      
      <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
        <Text style={styles.startButtonText}>BẮT ĐẦU CHƠI</Text>
      </TouchableOpacity>
    </View>
  );
};

// Use responsive styles that work well in portrait mode
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A2E",
  },
  header: {
    paddingVertical: 16,
    backgroundColor: "#F0A500",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  banner: {
    backgroundColor: "#E94560",
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#F0A500",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  bannerIconText: {
    fontSize: 24,
  },
  bannerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  section: {
    backgroundColor: "#16213E",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F0A500",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0A500",
    paddingBottom: 8,
  },
  paragraph: {
    color: "white",
    fontSize: 16,
  },
  controlItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  controlIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  controlIconText: {
    fontSize: 20,
  },
  controlText: {
    color: "white",
    flex: 1,
    fontSize: 14,
  },
  itemContainer: {
    marginTop: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#0F3460",
    borderRadius: 8,
    padding: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  goldIcon: {
    backgroundColor: "#F0A500",
  },
  diamondIcon: {
    backgroundColor: "#3EDBF0",
  },
  bombIcon: {
    // No background for bomb
  },
  itemIconText: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  itemValue: {
    color: "#C8C6C6",
    fontSize: 14,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tipNumber: {
    width: 30,
    height: 30,
    backgroundColor: "#F0A500",
    borderRadius: 15,
    textAlign: "center",
    textAlignVertical: "center",
    marginRight: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
    fontSize: 14,
  },
  tipText: {
    color: "white",
    flex: 1,
    fontSize: 14,
  },
  startButton: {
    backgroundColor: "#F0A500",
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    margin: 16,
    borderRadius: 10,
    width: '60%',
    alignSelf: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  smallIcon: {
    width: 24,
    height: 24,
  },
  mediumIcon: {
    width: 36,
    height: 36,
  },
});

export default Rules;