import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../redux/store';
import { saveHighScore } from '../../redux/slices/historySlice';


interface HighScoreModalProps {
  visible: boolean;
  score: number;
  onClose: () => void;
}

const HighScoreModal: React.FC<HighScoreModalProps> = ({ visible, score, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [username, setUsername] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    // Dispatch action to save the high score
    await dispatch(saveHighScore({
      score,
      username: username.trim(),
      description: description.trim() || 'Played gold mining game'
    }));
    
    // Reset form and close modal
    setUsername('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>New High Score!</Text>
          <Text style={styles.scoreText}>{score}</Text>
          
          <Text style={styles.inputLabel}>Your Name:</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your name"
            maxLength={20}
          />
          
          <Text style={styles.inputLabel}>Description (optional):</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="How did you achieve this score?"
            multiline
            maxLength={50}
          />
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]} 
              onPress={handleSubmit}
            >
              <Text style={styles.buttonText}>Save Score</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#FF6347' // Tomato color
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#FFD700' // Gold color
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    fontSize: 16
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top'
  },
  errorText: {
    color: 'red',
    marginBottom: 10
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  button: {
    flex: 0.48,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#ccc'
  },
  saveButton: {
    backgroundColor: '#4CAF50'
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default HighScoreModal;