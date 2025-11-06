module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILENAME || './database/controle_jurados.db'
    },
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds'
    },
    useNullAsDefault: true
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILENAME || './database/controle_jurados.db'
    },
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds'
    },
    useNullAsDefault: true
  }
};
