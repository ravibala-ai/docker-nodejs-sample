const waitPort = require('wait-port');
const fs = require('fs');
const { Client } = require('pg');

const {
    POSTGRES_HOST: HOST,
    POSTGRES_HOST_FILE: HOST_FILE,
    POSTGRES_USER: USER,
    POSTGRES_USER_FILE: USER_FILE,
    POSTGRES_PASSWORD: PASSWORD,
    POSTGRES_PASSWORD_FILE: PASSWORD_FILE,
    POSTGRES_DB: DB,
    POSTGRES_DB_FILE: DB_FILE,
} = process.env;

let client;

async function init() {
    try {
        const host = HOST_FILE ? fs.readFileSync(HOST_FILE, 'utf8').trim() : HOST;
        const user = USER_FILE ? fs.readFileSync(USER_FILE, 'utf8').trim() : USER;
        const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE, 'utf8').trim() : PASSWORD;
        const database = DB_FILE ? fs.readFileSync(DB_FILE, 'utf8').trim() : DB;

        if (!host || !user || !password || !database) {
            throw new Error('Missing required database configuration (host, user, password, or database).');
        }

        await waitPort({
            host,
            port: 5432,
            timeout: 10000,
            waitForDns: true,
        });

        client = new Client({
            host,
            user,
            password,
            database,
        });

        await client.connect();
        console.log(`Connected to postgres db at host ${host}`);

        // Create the table if it does not exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS todo_items (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255),
                completed BOOLEAN
            )
        `);
        console.log('Connected to db and ensured table todo_items exists');
    } catch (err) {
        console.error('Error during database initialization:', err);
        throw err; // Re-throw the error to handle it in the calling code
    }
}

// Get all items from the table
async function getItems() {
    try {
        const res = await client.query('SELECT * FROM todo_items');
        return res.rows.map(row => ({
            id: row.id,
            name: row.name,
            completed: row.completed,
        }));
    } catch (err) {
        console.error('Unable to get items:', err);
        throw err;
    }
}

// End the connection
async function teardown() {
    try {
        await client.end();
        console.log('Client connection ended');
    } catch (err) {
        console.error('Unable to end client connection:', err);
    }
}

// Get one item by id from the table
async function getItem(id) {
    try {
        const res = await client.query('SELECT * FROM todo_items WHERE id = $1', [id]);
        return res.rows.length > 0 ? res.rows[0] : null;
    } catch (err) {
        console.error('Unable to get item:', err);
        throw err;
    }
}

// Store one item in the table
async function storeItem(item) {
    try {
        await client.query(
            'INSERT INTO todo_items(id, name, completed) VALUES($1, $2, $3)',
            [item.id, item.name, item.completed]
        );
        console.log('Stored item:', item);
    } catch (err) {
        console.error('Unable to store item:', err);
        throw err;
    }
}

// Update one item by id in the table
async function updateItem(id, item) {
    try {
        await client.query(
            'UPDATE todo_items SET name = $1, completed = $2 WHERE id = $3',
            [item.name, item.completed, id]
        );
        console.log('Updated item:', item);
    } catch (err) {
        console.error('Unable to update item:', err);
        throw err;
    }
}

// Remove one item by id from the table
async function removeItem(id) {
    try {
        await client.query('DELETE FROM todo_items WHERE id = $1', [id]);
        console.log('Removed item:', id);
    } catch (err) {
        console.error('Unable to remove item:', err);
        throw err;
    }
}

module.exports = {
    init,
    teardown,
    getItems,
    getItem,
    storeItem,
    updateItem,
    removeItem,
};
