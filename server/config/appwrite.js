const { Client, Databases } = require('node-appwrite');

// Initialize Appwrite client
const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('67c93bc50017b7a0d6d8')
    .setKey('standard_8a42244970f45727b5db2b0761395675feb5deb29d84f2ea2eb09b5465f54e8e4cb8b6afb22b74fac4b0b715d6f2705be8edac343b1de3512fcadca5bfdc925641617b98bb47269979bef2322c71c52f4861f817eaedcfa89df22bb9e7646f5fb08cf6dced9a0d52f84a214012e2aeb62f032cad324e4c571161e9a72e8c40a3');

const databases = new Databases(client);

// Database and collection IDs
const CONVERSATIONS_DATABASE_ID = '67c97c60000970a3da53';
const CONVERSATIONS_COLLECTION_ID = '67c9809a0014f35fb698';

module.exports = {
    client,
    databases,
    CONVERSATIONS_DATABASE_ID,
    CONVERSATIONS_COLLECTION_ID
}; 