import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, Image } from 'react-native';

const App = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const movies = [
        { title: 'Inception', rating: '9/10', image: 'https://www.w3schools.com/w3images/lights.jpg' },
        { title: 'The Dark Knight', rating: '9.5/10', image: 'https://www.w3schools.com/w3images/forest.jpg' },
        { title: 'Interstellar', rating: '8.5/10', image: 'https://www.w3schools.com/w3images/mountains.jpg' },
    ];

    return (
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#52ba9b' }]}>
            {/*  аватарка STALKER 2 */}
            <View style={styles.avatarContainer}>
                <Image
                    source={{ uri: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/691b3701-34e9-41c9-a975-' +
                            'f7bff6840763/djp7qsq-1ffc53ac-63da-4cb7-932b-959beff579c8.jpg/v1/fit/w_828,h_1164,q_70,strp/stalker_2_by_' +
                            'veterlena_djp7qsq-414w-2x.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzN' +
                            'zNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodC' +
                            'I6Ijw9MTgwMCIsInBhdGgiOiJcL2ZcLzY5MWIzNzAxLTM0ZTktNDFjOS1hOTc1LWY3YmZmNjg0MDc2M1wvZGpwN3FzcS0xZmZjNTNhYy02M2RhLTRjYjc' +
                            'tOTMyYi05NTliZWZmNTc5YzguanBnIiwid2lkdGgiOiI8PTEyODAifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.9yoWp' +
                            '9jtCg9drFh6gZK9j-TFn00xP6QOoL3phPf-9DM' }} //  реальний URL або локальне зображення
                    style={styles.avatar}
                />
            </View>

            {/* Завдання 1:) Форма входу */}
            <View style={[styles.header, { backgroundColor: isDarkMode ? '#222' : '#6ea134' }]}>
                <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#fff' }]}>Welcome</Text>
                <Text style={[styles.subtitle, { color: isDarkMode ? '#ccc' : '#fff' }]}>Please sign in to continue.</Text>
            </View>

            <TextInput
                style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#ffffff' }]}
                placeholder="Username"
                placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
            />
            <TextInput
                style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#fff' }]}
                placeholder="Password"
                placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
                secureTextEntry
            />

            <Button title="Sign In" onPress={() => {}} color={isDarkMode ? '#6200ea' : '#b10a35'} />

            <View style={styles.switchContainer}>
                <Text style={{ color: isDarkMode ? '#fff' : '#333' }}>Dark Mode</Text>
                <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
            </View>

            {/* Завдання 2:) Список улюблених фільмів */}
            <Text style={[styles.interestsTitle, { color: isDarkMode ? '#fff' : '#444' }]}>Мої улюблені фільми:</Text>
            {movies.map((movie, index) => (
                <View key={index} style={styles.movieCard}>
                    <Image source={{ uri: movie.image }} style={styles.image} />
                    <Text style={styles.movieTitle}>{movie.title}</Text>
                    <Text style={styles.movieRating}>Rating: {movie.rating}</Text>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#fff',
    },
    header: {
        width: '100%',
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
        borderRadius: 15,
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 20,
    },
    input: {
        height: 45,
        width: '100%',
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 10,
        paddingLeft: 10,
        marginBottom: 15,
        color: '#333',
        fontSize: 16,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
    },
    interestsTitle: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 15,
    },
    movieCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 15,
        marginBottom: 15,
        resizeMode: 'cover',
    },
    movieTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    movieRating: {
        fontSize: 18,
        color: '#777',
    },
});

export default App;
