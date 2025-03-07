// Utility function to generate unique IDs
function unique() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
    unique
}; 