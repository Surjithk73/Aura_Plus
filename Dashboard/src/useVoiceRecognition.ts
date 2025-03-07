recognition.onerror = (event) => {
    if (event.error === 'network') {
        console.error('Network error occurred during speech recognition. Please check your connection.');
        // Optionally, you can add more handling logic here
    } else {
        console.error(`Speech recognition error: ${event.error}`);
    }
}; 