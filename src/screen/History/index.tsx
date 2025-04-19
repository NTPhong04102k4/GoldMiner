import React, { useEffect } from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import { AppDispatch, RootState } from "../../redux/store";
import { fetchHistory } from "../../redux/slices/historySlice";
import { HistoryItem } from "../../type/history";


const History: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { historyItems, loading, error } = useSelector((state: RootState) => state.history);
    
    useEffect(() => {
        // Load history when component mounts
        dispatch(fetchHistory());
    }, [dispatch]);
    
    // Render each history item
    const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
        <View style={styles.historyItem}>
            <View style={styles.scoreSection}>
                <Text style={styles.scoreText}>{item.score}</Text>
                <Text style={styles.recordText}>
                    {item.isNewRecord ? "New Record!" : ""}
                </Text>
            </View>
            
            <View style={styles.userInfoSection}>
                <Text style={styles.usernameText}>{item.username}</Text>
                <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
            
            <View style={styles.timeSection}>
                <Text style={styles.dateText}>
                    {moment(item.playedAt).format('DD/MM/YYYY')}
                </Text>
                <Text style={styles.timeText}>
                    {moment(item.playedAt).format('HH:mm')}
                </Text>
            </View>
        </View>
    );
    
    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>High Scores History</Text>
            
            {loading ? (
                <View style={styles.centerContent}>
                    <Text>Loading history...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerContent}>
                    <Text style={styles.errorText}>Error: {error}</Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => dispatch(fetchHistory())}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : historyItems.length === 0 ? (
                <View style={styles.centerContent}>
                    <Text>No history records yet. Break your first record!</Text>
                </View>
            ) : (
                <FlatList
                    data={historyItems}
                    renderItem={renderHistoryItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
        padding: 16
    },
    headerText: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
        textAlign: "center"
    },
    list: {
        paddingBottom: 20
    },
    historyItem: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    scoreSection: {
        flex: 2,
        justifyContent: "center",
        alignItems: "center"
    },
    scoreText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FFD700" // Gold color
    },
    recordText: {
        fontSize: 12,
        color: "#FF6347", // Tomato color
        fontWeight: "bold"
    },
    userInfoSection: {
        flex: 4,
        justifyContent: "center",
        paddingHorizontal: 8
    },
    usernameText: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 4
    },
    descriptionText: {
        fontSize: 14,
        color: "#666666"
    },
    timeSection: {
        flex: 3,
        justifyContent: "center",
        alignItems: "flex-end"
    },
    dateText: {
        fontSize: 14,
        color: "#666666"
    },
    timeText: {
        fontSize: 14,
        color: "#666666"
    },
    centerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    errorText: {
        color: "red",
        marginBottom: 12
    },
    retryButton: {
        backgroundColor: "#4CAF50",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4
    },
    retryButtonText: {
        color: "white",
        fontWeight: "bold"
    }
});

export default History;