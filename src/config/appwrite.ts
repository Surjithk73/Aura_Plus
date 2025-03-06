import { Client, Databases, Account } from 'appwrite';

const client = new Client();

// Your Appwrite endpoint and project ID
client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('67c93bc50017b7a0d6d8'); // Replace this with your actual project ID from Appwrite

export const databases = new Databases(client);
export const account = new Account(client);

// Database and collection IDs - replace these with your actual IDs from Appwrite
export const CONVERSATIONS_DATABASE_ID = '67c97c60000970a3da53';
export const CONVERSATIONS_COLLECTION_ID = '67c9809a0014f35fb698';

export { client }; 