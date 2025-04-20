  import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";
  import { Text } from "react-native-gesture-handler";

  export  const LevelCompleteGame = ({  onNext }: {
  
      onNext: () => void;
    }) => (
      <View style={styles.overlay}>
        <View style={styles.messageBox}>
          <Text style={styles.messageTitle}>
            Complete
            </Text>
          <Text style={styles.messageText}>
           That awesome
          </Text>
          <TouchableWithoutFeedback onPress={onNext}>
            <View style={styles.messageButton}>
              <Text style={styles.messageButtonText}>Go Home</Text>
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