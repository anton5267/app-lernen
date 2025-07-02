import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const App = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.name}>Ваше ім'я</Text>
            <Image
                source={{uri: 'https://link_to_your_image.com'}}
                style={styles.image}
            />
            <Text style={styles.interests}>Інтереси:</Text>
            <Text style={styles.interests}>- Програмування</Text>
            <Text style={styles.interests}>- Читання</Text>
            <Text style={styles.interests}>- Мандри</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 50,
        margin: 20,
    },
    interests: {
        fontSize: 18,
        marginBottom: 5,
    },
});

export default App;
