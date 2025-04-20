import { Text, TouchableWithoutFeedback, View ,StyleSheet} from "react-native";

  // Start screen overlay
export  const StartScreenOverlay = ({ onStart }: { onStart: () => void }) => (
    <View style={styles.overlay}>
      <View style={styles.messageBox}>
        <Text style={styles.messageTitle}>Gold Miner</Text>
        <Text style={styles.messageText}>
          Tap to throw your hook and collect valuable items!
        </Text>
        <TouchableWithoutFeedback onPress={()=>onStart()}>
          <View style={styles.messageButton}>
            <Text style={styles.messageButtonText}>Start Game</Text>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
  const styles = StyleSheet.create({
   
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    messageBox: {
      backgroundColor: '#16213E',
      padding: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#F0A500',
      width: '70%',
      alignItems: 'center',
    },
    messageTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#F0A500',
      marginBottom: 10,
    },
    messageText: {
      fontSize: 16,
      color: 'white',
      textAlign: 'center',
      marginBottom: 20,
    },
    messageButton: {
      backgroundColor: '#F0A500',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 5,
    },
    messageButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1A1A2E',
    },
  });