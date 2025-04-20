import { Image, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { R } from "../../../assets";
import { navigate } from "../../../navigation/navigate";

export const GameOverOverlay = ({ score, targetScore, onRestart }: {
  score: number;
  targetScore: number;
  onRestart: () => void;
}) => (
  <View style={styles.overlay}>
    <TouchableOpacity onPress={() => navigate('GameOver')} style={{ width: 36, height: 36, borderRadius: 100, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', position: "absolute", right: 105, top: 90, zIndex: 1000 }}><Image source={R.images.close} style={{ width: 24, height: 24 }} /></TouchableOpacity>
    <View style={styles.messageBox}>
      <Text style={styles.messageTitle}>Game Over!</Text>
      <Text style={styles.messageText}>
        You collected ${score} of ${targetScore} required.
      </Text>
      <TouchableWithoutFeedback onPress={() => onRestart()}>
        <View style={styles.messageButton}>
          <Text style={styles.messageButtonText}>Try Again</Text>
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